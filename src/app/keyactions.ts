/**
 * Everything done to keys, each behind its own dialog: making a key pair,
 * importing, exporting, backing up, certifying, and the changes to one's own
 * key — expiry, user IDs, passphrase, revocation — and deleting.
 */

import type * as openpgp from 'openpgp';
import { t, tn } from '../core/i18n';
import type { Entry, ImportResult } from '../core/keyring';
import { formatFingerprint, label } from '../core/keys';
import {
  addUserId,
  ALGORITHMS,
  certify,
  changePassphrase,
  classify,
  exportKeys,
  generate,
  revocationCertificate,
  revoke,
  revokeUserId,
  setExpiration,
  type AlgorithmId,
  type Input,
} from '../core/pgp';
import { choosePassphrase, forget, unlockEntry } from './agent';
import { errorText, formatDate, keyIdLabel, named } from './format';
import { copyText, readClipboard, safeName, saveFile } from './save';
import { YEAR_CHOICES } from './settings';
import { keyringChanged, saveState, state } from './state';
import { keepStorage } from './store';
import { checkbox, confirmAsk, dialog, field, h, inform, secretInput, select, textInput, toast } from './ui';

/** Set by the key list: shows the key in the details pane. */
export const selection = { show: (_fingerprint: string): void => undefined };

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;

const fileBase = (entry: Entry): string => `${safeName(entry.info.name || entry.info.email || 'key')}_0x${entry.info.keyId}`;

function fingerprintBlock(entry: Entry): HTMLElement {
  return h(
    'div',
    { class: 'key-card' },
    h('strong', { text: label(entry.info) }),
    h('span', { class: 'mono', text: `${entry.info.algorithm} · ${keyIdLabel(entry.info.keyId)}` }),
    h('span', { class: 'mono key-card-fpr', text: formatFingerprint(entry.info.fingerprint) }),
  );
}

function fail(error: unknown): void {
  const text = errorText(error);
  if (text) toast(text, 'error');
}

/* ------------------------------------------------------------------ *
 * A new key pair
 * ------------------------------------------------------------------ */

function yearsLabel(years: number): string {
  return years === 0 ? t('generate', 'Never expires') : tn('generate', '{count} year', '{count} years', years);
}

export async function newKeyPair(): Promise<void> {
  const name = textInput('', { placeholder: t('generate', 'Your name') });
  const email = textInput('', { placeholder: t('generate', 'name@example.org'), type: 'email' });
  const first = secretInput();
  const second = secretInput();
  const groups = { ecc: t('generate', 'Elliptic curves'), rsa: 'RSA', v6: t('generate', 'OpenPGP v6 (RFC 9580)') };
  const algorithm = select(
    ALGORITHMS.map((a) => ({ value: a.id, label: a.label, group: groups[a.family] })),
    state.settings.algorithm,
  );
  const validity = select(
    YEAR_CHOICES.map((years) => ({ value: String(years), label: yearsLabel(years) })),
    String(state.settings.validYears),
  );
  const v6Note = h('p', { class: 'dialog-hint dialog-warning', text: t('generate', 'GnuPG and Kleopatra cannot read OpenPGP v6 keys yet: choose it only if your correspondents use software that can.') });
  const rsaNote = h('p', { class: 'dialog-hint', text: t('generate', 'RSA keys take a few seconds to make, and RSA 4096 longer.') });
  const notes = (): void => {
    const chosen = ALGORITHMS.find((a) => a.id === algorithm.value);
    v6Note.hidden = !chosen?.v6;
    rsaNote.hidden = chosen?.family !== 'rsa';
  };
  algorithm.addEventListener('change', notes);
  notes();
  const advanced = h(
    'details',
    { class: 'dialog-details' },
    h('summary', { text: t('generate', 'Algorithm and validity') }),
    field(t('generate', 'Algorithm'), algorithm),
    v6Note,
    rsaNote,
    field(t('generate', 'Valid for'), validity),
  );
  let made: Entry | null = null;
  const ok = await dialog({
    title: t('generate', 'New key pair'),
    wide: true,
    body: [
      t('generate', 'Your key pair lets others encrypt messages only you can read, and lets you sign what you send. Your name and address are shown to everyone who gets your public key.'),
      h('div', { class: 'dialog-grid' }, field(t('generate', 'Name'), name), field(t('generate', 'Email'), email)),
      h('div', { class: 'dialog-grid' }, field(t('generate', 'Passphrase'), first.node), field(t('generate', 'Repeat the passphrase'), second.node)),
      h('p', { class: 'dialog-hint', text: t('generate', 'The passphrase protects your secret key. It cannot be recovered: if you forget it, the key is lost.') }),
      advanced,
      h('p', { class: 'dialog-busy-note', text: t('generate', 'Making the key…') }),
    ],
    confirm: t('generate', 'Create'),
    submit: async () => {
      const nameValue = name.value.trim();
      const emailValue = email.value.trim();
      if (!nameValue && !emailValue) return t('generate', 'Enter a name or an email address');
      if (emailValue && !EMAIL.test(emailValue)) return t('generate', 'This email address does not look right');
      if (!first.input.value) return t('generate', 'Enter a passphrase');
      if (first.input.value !== second.input.value) return t('passphrase', 'The two passphrases differ');
      const years = Number(validity.value);
      const expires = years ? new Date(Date.now() + years * 365.25 * 86400e3) : null;
      try {
        const { key, revocation } = await generate({ name: nameValue, email: emailValue, algorithm: algorithm.value as AlgorithmId, expires, passphrase: first.input.value });
        made = await state.keyring.put(key, { revocation });
      } catch (error) {
        return errorText(error) ?? '';
      }
      state.settings.algorithm = algorithm.value as AlgorithmId;
      state.settings.validYears = years;
      saveState();
      return null;
    },
  });
  first.input.value = '';
  second.input.value = '';
  if (!ok || !made) return;
  const entry: Entry = made;
  keepStorage();
  keyringChanged();
  selection.show(entry.record.fingerprint);
  const backup = await dialog({
    title: t('generate', 'Your key pair is ready'),
    body: [
      fingerprintBlock(entry),
      t('generate', 'Back up your secret key now: it lives only in this browser, and clearing the browser\'s data would delete it. A revocation certificate was made too — save it with the backup, to withdraw the key should you lose it.'),
    ],
    confirm: t('generate', 'Back up…'),
    cancel: t('generate', 'Later'),
  });
  if (backup) await backupSecret(entry);
}

/* ------------------------------------------------------------------ *
 * Import
 * ------------------------------------------------------------------ */

function statusWord(status: ImportResult['keys'][number]['status']): string {
  switch (status) {
    case 'new':
      return t('import', 'new');
    case 'updated':
      return t('import', 'updated');
    case 'secret':
      return t('import', 'secret key added');
    case 'unchanged':
      return t('import', 'unchanged');
  }
}

/** Imports keys from `input`, asking first if it is a revocation certificate; shows what came of it. */
export async function importData(input: Input, source = ''): Promise<ImportResult | null> {
  const kind = await classify(input);
  let revocations = false;
  if (kind === 'revocation') {
    revocations = await confirmAsk(
      t('import', 'Import a revocation certificate?'),
      t('import', '{file} is a revocation certificate. Importing it revokes the key it belongs to for good: nobody will be able to use that key again.', { file: source || t('import', 'This text') }),
      t('import', 'Revoke the key'),
    );
    if (!revocations) return null;
  }
  let result: ImportResult;
  try {
    result = await state.keyring.import(input, { revocations });
  } catch (error) {
    fail(error);
    return null;
  }
  if (result.keys.some((k) => k.status === 'secret' || (k.status === 'new' && state.keyring.get(k.fingerprint)?.info.secret))) keepStorage();
  keyringChanged();
  const first = result.keys.find((k) => k.status !== 'unchanged') ?? result.keys[0];
  if (first) selection.show(first.fingerprint);
  return result;
}

export async function reportImport(results: ImportResult[]): Promise<void> {
  const keys = results.flatMap((r) => r.keys);
  const revoked = results.flatMap((r) => r.revoked);
  const problems = results.flatMap((r) => r.problems);
  const unprotected = results.flatMap((r) => r.unprotected).map((fp) => state.keyring.get(fp)).filter((e): e is Entry => !!e);
  if (!keys.length && !revoked.length && !problems.length) return;
  // One key, nothing wrong: a toast says enough.
  if (keys.length === 1 && !revoked.length && !problems.length && !unprotected.length) {
    const entry = state.keyring.get(keys[0]!.fingerprint);
    toast(t('import', '{key}: {status}', { key: entry ? named(entry.info) : keys[0]!.fingerprint, status: statusWord(keys[0]!.status) }));
    return;
  }
  const list = h('ul', { class: 'import-list' });
  for (const { fingerprint, status } of keys) {
    const entry = state.keyring.get(fingerprint);
    list.append(h('li', {}, h('span', { text: entry ? label(entry.info) : fingerprint }), h('span', { class: `import-status import-status--${status}`, text: statusWord(status) })));
  }
  for (const fingerprint of revoked) {
    const entry = state.keyring.get(fingerprint);
    list.append(h('li', {}, h('span', { text: entry ? label(entry.info) : fingerprint }), h('span', { class: 'import-status import-status--revoked', text: t('import', 'revoked') })));
  }
  const errors = problems.length ? h('ul', { class: 'import-problems' }, ...problems.map((p) => h('li', { text: p }))) : null;
  await inform(
    keys.length || revoked.length ? tn('import', '{count} key imported', '{count} keys imported', keys.length + revoked.length) : t('import', 'Nothing imported'),
    list,
    unprotected.length
      ? h('p', {
          class: 'dialog-text dialog-warning',
          text: t('import', 'No passphrase protects these secret keys: {keys}. Set one with "Change passphrase" in each key\'s menu.', { keys: unprotected.map((e) => named(e.info)).join(', ') }),
        })
      : null,
    errors ? h('p', { class: 'dialog-text', text: t('import', 'Some of it could not be read:') }) : null,
    errors,
  );
}

export async function importFiles(files: File[]): Promise<void> {
  const results: ImportResult[] = [];
  for (const file of files) {
    const result = await importData(new Uint8Array(await file.arrayBuffer()), file.name);
    if (result) results.push(result);
  }
  await reportImport(results);
}

export async function importFromClipboard(): Promise<void> {
  let text: string;
  try {
    text = await readClipboard();
  } catch (error) {
    fail(error);
    return;
  }
  if (!text.trim()) {
    toast(t('import', 'The clipboard is empty'), 'error');
    return;
  }
  const result = await importData(text);
  if (result) await reportImport([result]);
}

export async function importPasted(): Promise<void> {
  const area = h('textarea', { class: 'dialog-input dialog-textarea mono', rows: '10', spellcheck: 'false', placeholder: '-----BEGIN PGP PUBLIC KEY BLOCK-----' });
  let result: ImportResult | null = null;
  const ok = await dialog({
    title: t('import', 'Paste keys'),
    wide: true,
    body: [t('import', 'Paste one or more public or secret keys, as text.'), area],
    confirm: t('import', 'Import'),
    submit: async () => {
      if (!area.value.trim()) return t('import', 'Paste a key first');
      result = await importData(area.value);
      return null;
    },
  });
  if (ok && result) await reportImport([result]);
}

/* ------------------------------------------------------------------ *
 * Export and backup
 * ------------------------------------------------------------------ */

export async function exportPublic(entries: Entry[]): Promise<void> {
  if (!entries.length) return;
  const armor = checkbox(t('export', 'As text (ASCII armor, .asc)'), true, t('export', 'Otherwise binary, .gpg, as gpg --export writes it.'));
  const copy = h('button', { type: 'button', class: 'button button--small', text: t('export', 'Copy to clipboard') });
  copy.addEventListener('click', () => {
    const text = exportKeys(entries.map((e) => e.key), { armor: true, secret: false }) as string;
    copyText(text).then(
      () => toast(tn('export', 'Public key copied', '{count} public keys copied', entries.length)),
      fail,
    );
  });
  const list = h('ul', { class: 'import-list' }, ...entries.map((e) => h('li', {}, h('span', { text: label(e.info) }), h('span', { class: 'mono', text: keyIdLabel(e.info.keyId) }))));
  await dialog({
    title: tn('export', 'Export public key', 'Export {count} public keys', entries.length),
    body: [t('export', 'A public key is safe to share: send it to the people who will write to you, or publish it.'), list, armor.node, h('div', { class: 'dialog-inline' }, copy)],
    confirm: t('export', 'Save file'),
    submit: async () => {
      const data = exportKeys(entries.map((e) => e.key), { armor: armor.input.checked, secret: false });
      const ext = armor.input.checked ? 'asc' : 'gpg';
      const only = entries[0];
      await saveFile(data, entries.length === 1 && only ? `${fileBase(only)}_public.${ext}` : `public-keys-${entries.length}.${ext}`);
      return null;
    },
  });
}

/** Saves the secret key, still under its passphrase — after asking for it, so the backup is known to open. */
export async function backupSecret(entry: Entry): Promise<void> {
  if (!entry.key.isPrivate()) return;
  const unprotected = entry.info.unprotected;
  const ok = await dialog({
    title: t('export', 'Back up secret key'),
    body: [
      fingerprintBlock(entry),
      t('export', 'The backup holds your secret key, protected by its passphrase. Keep it somewhere safe and private — on a USB stick in a drawer, or in your password manager. Anyone with the file and the passphrase can read your messages and sign as you.'),
      unprotected ? h('p', { class: 'dialog-text dialog-warning', text: t('export', 'This key has no passphrase: the backup is not protected at all. Set a passphrase first.') }) : null,
    ],
    confirm: t('export', 'Save backup'),
  });
  if (!ok) return;
  try {
    if (!unprotected && !(await unlockEntry(entry, 'export'))) return;
    await saveFile(exportKeys([entry.key], { armor: true, secret: true }), `${fileBase(entry)}_SECRET.asc`);
  } catch (error) {
    fail(error);
  }
}

export async function saveRevocation(entry: Entry): Promise<void> {
  const ok = await dialog({
    title: t('revoke', 'Revocation certificate'),
    body: [
      fingerprintBlock(entry),
      t('revoke', 'A revocation certificate withdraws your key without its secret part. Keep it apart from the key: if the key is lost or stolen, import the certificate and publish the revoked key, and others will stop using it.'),
    ],
    confirm: t('export', 'Save file'),
  });
  if (!ok) return;
  try {
    let certificate = entry.record.revocation;
    if (!certificate) {
      const unlocked = await unlockEntry(entry, 'change');
      if (!unlocked) return;
      certificate = await revocationCertificate(unlocked, { flag: 0, text: '' });
    }
    await saveFile(certificate, `${fileBase(entry)}_revocation.asc`);
  } catch (error) {
    fail(error);
  }
}

/* ------------------------------------------------------------------ *
 * Certifying someone's key
 * ------------------------------------------------------------------ */

/** The user's keys that can certify `entry`. */
export const certifiers = (entry: Entry): Entry[] => state.keyring.list().filter((e) => e.info.canCertify && e !== entry);

export async function certifyKey(entry: Entry, only?: string): Promise<void> {
  const signers = certifiers(entry);
  if (!signers.length) {
    await inform(t('certify', 'Certify'), t('certify', 'To certify a key you need a key pair of your own. Create one first.'));
    return;
  }
  const users = entry.info.userIds.filter((u) => u.status === 'valid');
  const boxes = users.map((u) => ({ userId: u.userId, ...checkbox(u.userId, !only || only === u.userId) }));
  const preferred = signers.find((s) => s.record.fingerprint === state.settings.defaultKey) ?? signers[0]!;
  const signer = select(signers.map((s) => ({ value: s.record.fingerprint, label: label(s.info) })), preferred.record.fingerprint);
  await dialog({
    title: t('certify', 'Certify key'),
    wide: true,
    body: [
      t('certify', 'Certifying says: "I checked that this key belongs to this person." Check the fingerprint with its owner first — in person, or on a call where you know their voice.'),
      fingerprintBlock(entry),
      h('p', { class: 'dialog-text', text: t('certify', 'User IDs to certify:') }),
      ...boxes.map((b) => b.node),
      signers.length > 1 ? field(t('certify', 'Certify with'), signer) : null,
    ],
    confirm: t('certify', 'Certify'),
    submit: async () => {
      const chosen = boxes.filter((b) => b.input.checked).map((b) => b.userId);
      if (!chosen.length) return t('certify', 'Choose at least one user ID');
      const by = state.keyring.get(signer.value);
      if (!by) return null;
      try {
        const unlocked = await unlockEntry(by, 'certify');
        if (!unlocked) return t('certify', 'The key was not unlocked');
        await state.keyring.put(await certify(entry.key, unlocked, chosen));
      } catch (error) {
        return errorText(error) ?? '';
      }
      keyringChanged();
      toast(t('certify', 'Key certified'));
      return null;
    },
  });
}

/* ------------------------------------------------------------------ *
 * Changing one's own key
 * ------------------------------------------------------------------ */

/** Runs `change` on the entry's key unlocked, and stores what comes out. */
async function change(entry: Entry, run: (unlocked: openpgp.PrivateKey) => Promise<openpgp.Key>): Promise<string | null> {
  try {
    const unlocked = await unlockEntry(entry, 'change');
    if (!unlocked) return t('certify', 'The key was not unlocked');
    await state.keyring.put(await run(unlocked));
    keyringChanged();
    return null;
  } catch (error) {
    return errorText(error) ?? '';
  }
}

const isoDay = (ms: number): string => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export async function changeExpiry(entry: Entry): Promise<void> {
  const current = entry.info.expires;
  const never = h('input', { type: 'radio', name: 'expiry', value: 'never' });
  const until = h('input', { type: 'radio', name: 'expiry', value: 'date' });
  const date = h('input', { type: 'date', class: 'dialog-input dialog-date', min: isoDay(Date.now() + 86400e3) });
  date.value = isoDay(current && current > Date.now() ? current : Date.now() + 2 * 365.25 * 86400e3);
  (current === null ? never : until).checked = true;
  date.addEventListener('input', () => (until.checked = true));
  await dialog({
    title: t('key', 'Change expiry'),
    body: [
      t('key', 'An expiry date is a safety net: a key you lose stops being used by itself. You can always move the date later, before or after it passes.'),
      h('label', { class: 'dialog-label dialog-label--check' }, never, h('span', { text: t('key', 'Never expires') })),
      h('label', { class: 'dialog-label dialog-label--check' }, until, h('span', { text: t('key', 'Expires on') }), date),
      h('p', { class: 'dialog-hint', text: t('key', 'The subkeys get the same date. Share the public key again afterwards, so others see the new date.') }),
    ],
    confirm: t('dialog', 'OK'),
    submit: async () => {
      let expires: Date | null = null;
      if (until.checked) {
        if (!date.value) return t('key', 'Choose a date');
        expires = new Date(`${date.value}T23:59:59`);
        if (expires.getTime() <= Date.now()) return t('key', 'The date must be in the future');
      }
      const problem = await change(entry, (unlocked) => setExpiration(entry.key as openpgp.PrivateKey, unlocked, expires));
      if (!problem) toast(expires ? t('key', 'The key now expires on {date}', { date: formatDate(expires.getTime()) }) : t('key', 'The key now never expires'));
      return problem;
    },
  });
}

export async function addUserIdFlow(entry: Entry): Promise<void> {
  const name = textInput('', { placeholder: t('generate', 'Your name') });
  const email = textInput('', { placeholder: t('generate', 'name@example.org'), type: 'email' });
  await dialog({
    title: t('key', 'Add user ID'),
    body: [t('key', 'Another name or address for the same key — a work address, say.'), field(t('generate', 'Name'), name), field(t('generate', 'Email'), email)],
    confirm: t('key', 'Add'),
    submit: async () => {
      if (!name.value.trim() && !email.value.trim()) return t('generate', 'Enter a name or an email address');
      if (email.value.trim() && !EMAIL.test(email.value.trim())) return t('generate', 'This email address does not look right');
      return change(entry, (unlocked) => addUserId(entry.key as openpgp.PrivateKey, unlocked, { name: name.value, email: email.value }));
    },
  });
}

export async function revokeUserIdFlow(entry: Entry, userId: string): Promise<void> {
  await dialog({
    title: t('key', 'Revoke user ID'),
    body: [t('key', '"{userId}" will be marked as no longer valid. The key itself stays usable with its other user IDs.', { userId })],
    confirm: t('key', 'Revoke user ID'),
    danger: true,
    submit: () => change(entry, (unlocked) => revokeUserId(entry.key as openpgp.PrivateKey, unlocked, userId, { flag: 32, text: '' })),
  });
}

export async function changePassphraseFlow(entry: Entry): Promise<void> {
  try {
    const unlocked = await unlockEntry(entry, 'change', { fresh: true });
    if (!unlocked) return;
    const passphrase = await choosePassphrase(t('passphrase', 'Change passphrase'), t('passphrase', 'Choose a new passphrase for your secret key.'), { allowEmpty: true });
    if (passphrase === null) return;
    if (!passphrase) {
      const sure = await confirmAsk(t('passphrase', 'No passphrase?'), t('passphrase', 'Without a passphrase the secret key is stored unprotected in this browser: anyone with access to this computer can use it.'), t('passphrase', 'Remove the passphrase'));
      if (!sure) return;
    }
    await state.keyring.put(await changePassphrase(unlocked, passphrase));
    forget(entry.record.fingerprint);
    keyringChanged();
    toast(passphrase ? t('passphrase', 'Passphrase changed') : t('passphrase', 'Passphrase removed'));
  } catch (error) {
    fail(error);
  }
}

const REASONS = (): { value: string; label: string }[] => [
  { value: '0', label: t('revoke', 'No reason given') },
  { value: '1', label: t('revoke', 'The key is replaced by a new one') },
  { value: '2', label: t('revoke', 'The key may have been stolen') },
  { value: '3', label: t('revoke', 'The key is no longer used') },
];

export async function revokeKeyFlow(entry: Entry): Promise<void> {
  const reason = select(REASONS(), '0');
  const text = h('textarea', { class: 'dialog-input dialog-textarea', rows: '2', placeholder: t('revoke', 'A few words for those who use the key (optional)') });
  const sure = checkbox(t('revoke', 'I understand that a revoked key cannot be used again'));
  const ok = await dialog({
    title: t('revoke', 'Revoke key'),
    body: [
      fingerprintBlock(entry),
      t('revoke', 'Revoking withdraws the key for good. Others will no longer encrypt to it, and signatures it makes from now on will not count. Messages already encrypted to it can still be decrypted.'),
      field(t('revoke', 'Reason'), reason),
      field(t('revoke', 'Description'), text),
      sure.node,
    ],
    confirm: t('revoke', 'Revoke key'),
    danger: true,
    submit: async () => {
      if (!sure.input.checked) return t('revoke', 'Confirm that you understand');
      return change(entry, (unlocked) => revoke(entry.key as openpgp.PrivateKey, unlocked, { flag: Number(reason.value), text: text.value.trim() }));
    },
  });
  if (!ok) return;
  const fresh = state.keyring.get(entry.record.fingerprint);
  if (fresh && (await confirmAsk(t('revoke', 'Key revoked'), t('revoke', 'Share the revoked public key with those who have the key, so that they know.'), t('export', 'Export…'), false))) {
    await exportPublic([fresh]);
  }
}

/* ------------------------------------------------------------------ *
 * Deleting
 * ------------------------------------------------------------------ */

export async function deleteKeys(entries: Entry[]): Promise<boolean> {
  if (!entries.length) return false;
  const secret = entries.filter((e) => e.info.secret);
  const sure = secret.length ? checkbox(t('delete', 'I have a backup of the secret key, or no longer need it')) : null;
  const ok = await dialog({
    title: tn('delete', 'Delete key', 'Delete {count} keys', entries.length),
    body: [
      h('ul', { class: 'import-list' }, ...entries.map((e) => h('li', {}, h('span', { text: label(e.info) }), h('span', { class: 'mono', text: keyIdLabel(e.info.keyId) })))),
      secret.length
        ? h('p', { class: 'dialog-text dialog-warning', text: t('delete', 'This deletes your secret key too. Without a backup, messages encrypted to it can never be read again.') })
        : t('delete', 'The public key can be imported again at any time.'),
      sure?.node ?? null,
    ],
    confirm: t('delete', 'Delete'),
    danger: true,
    submit: async () => {
      if (sure && !sure.input.checked) return t('revoke', 'Confirm that you understand');
      for (const entry of entries) {
        forget(entry.record.fingerprint);
        await state.keyring.remove(entry.record.fingerprint);
      }
      return null;
    },
  });
  if (ok) {
    keyringChanged();
    toast(tn('delete', 'Key deleted', '{count} keys deleted', entries.length));
  }
  return ok;
}

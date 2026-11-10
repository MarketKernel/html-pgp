/**
 * Files, as Kleopatra's "Sign/Encrypt" and "Decrypt/Verify": files are added
 * or dropped, each is looked at to tell what it is, and the operations run on
 * all that fit. A detached signature finds the file it signs by its name —
 * report.pdf.sig goes with report.pdf — or asks for it.
 *
 * A file is read whole into memory: fine for documents and photos, not for
 * gigabytes.
 */

import { t, tn } from '../core/i18n';
import { classify, encrypt, open, sign, type Input, type Kind } from '../core/pgp';
import { choosePassphrase, openContext, unlockEntry } from './agent';
import { errorText, keyIdLabel, named } from './format';
import { importData, reportImport } from './keyactions';
import { outcomeLines, renderLines, worst, type Line } from './outcome';
import { RecipientPicker, signerChoices } from './recipients';
import { saveFile } from './save';
import { ownEncryptionKey, saveState, state } from './state';
import { checkbox, dialog, h, icon, ICONS, select, toast } from './ui';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

interface Output {
  name: string;
  data: Input;
}

interface Item {
  id: number;
  name: string;
  size: number;
  bytes: Uint8Array;
  kind: Kind;
  busy: boolean;
  lines: Line[];
  outputs: Output[];
  /** For a detached signature: the item it signs, when found or chosen. */
  signed: Item | null;
}

let items: Item[] = [];
let nextId = 1;

const PGP_EXT = /\.(gpg|pgp|asc|sig)$/i;

function kindLabel(kind: Kind): string {
  switch (kind) {
    case 'encrypted':
      return t('files', 'Encrypted');
    case 'signed':
      return t('files', 'Signed');
    case 'cleartext':
      return t('files', 'Signed text');
    case 'signature':
      return t('files', 'Detached signature');
    case 'keys':
      return t('files', 'Keys');
    case 'revocation':
      return t('files', 'Revocation certificate');
    case 'unknown':
      return t('files', 'File');
  }
}

function kindIcon(kind: Kind): string {
  switch (kind) {
    case 'encrypted':
      return ICONS.lock;
    case 'signed':
    case 'cleartext':
    case 'signature':
      return ICONS.signature;
    case 'keys':
    case 'revocation':
      return ICONS.key;
    case 'unknown':
      return ICONS.file;
  }
}

function size(bytes: number): string {
  if (bytes < 1024) return tn('files', '{count} byte', '{count} bytes', bytes);
  if (bytes < 1024 * 1024) return t('files', '{size} KB', { size: (bytes / 1024).toFixed(1) });
  return t('files', '{size} MB', { size: (bytes / 1024 / 1024).toFixed(1) });
}

/** report.pdf.gpg → report.pdf; with no such ending, the name the sender's program wrote, or .out. */
function outputName(item: Item, embedded: string): string {
  if (PGP_EXT.test(item.name)) return item.name.replace(PGP_EXT, '');
  return embedded || `${item.name}.out`;
}

/** The file a detached signature signs: its name without .sig or .asc. */
function pairOf(item: Item): Item | null {
  const base = item.name.replace(/\.(sig|asc)$/i, '');
  return items.find((other) => other !== item && other.kind === 'unknown' && other.name === base) ?? null;
}

const isPgp = (item: Item): boolean => item.kind !== 'unknown';

function render(): void {
  const list = $('files-list');
  list.replaceChildren(...items.map(row));
  const plain = items.filter((i) => !isPgp(i));
  const pgp = items.filter((i) => ['encrypted', 'signed', 'cleartext', 'signature'].includes(i.kind));
  const keys = items.filter((i) => i.kind === 'keys' || i.kind === 'revocation');
  $('files-empty').hidden = items.length > 0;
  $('files-bar').hidden = items.length === 0;
  ($('files-protect') as HTMLButtonElement).disabled = !plain.length;
  ($('files-open') as HTMLButtonElement).disabled = !pgp.length || opening;
  ($('files-import') as HTMLButtonElement).hidden = !keys.length;
  ($('files-save-all') as HTMLButtonElement).hidden = items.flatMap((i) => i.outputs).length < 2;
}

function row(item: Item): HTMLElement {
  const remove = h('button', { type: 'button', class: 'icon-button icon-button--small', title: t('files', 'Remove from the list'), 'aria-label': t('files', 'Remove from the list') }, icon(ICONS.close));
  remove.addEventListener('click', () => {
    items = items.filter((i) => i !== item);
    for (const other of items) if (other.signed === item) other.signed = null;
    render();
  });
  const actions = h('div', { class: 'file-actions' });
  if (item.kind === 'signature' && !item.signed && !item.lines.length) {
    const choose = h('button', { type: 'button', class: 'button button--small', text: t('files', 'Choose the signed file…') });
    choose.addEventListener('click', () => chooseSigned(item));
    actions.append(choose);
  }
  for (const output of item.outputs) {
    const save = h('button', { type: 'button', class: 'button button--small button--primary' }, icon(ICONS.save), h('span', { text: t('files', 'Save {name}', { name: output.name }) }));
    save.addEventListener('click', () => void saveFile(output.data, output.name));
    actions.append(save);
  }
  const node = h(
    'li',
    { class: `file${item.busy ? ' file--busy' : ''}`, 'data-name': item.name },
    h(
      'div',
      { class: 'file-head' },
      h('span', { class: `file-icon file-icon--${item.kind}` }, icon(kindIcon(item.kind))),
      h(
        'div',
        { class: 'file-names' },
        h('span', { class: 'file-name', text: item.name }),
        h('span', { class: 'file-meta', text: `${kindLabel(item.kind)} · ${size(item.size)}${item.signed ? ` · ${t('files', 'signs {name}', { name: item.signed.name })}` : ''}` }),
      ),
      remove,
    ),
    item.lines.length ? renderLines(item.lines) : null,
    actions.childElementCount ? actions : null,
  );
  return node;
}

/** Files are in the list that a reload would lose. */
export const filesListed = (): boolean => items.length > 0;

export async function addFiles(files: File[]): Promise<void> {
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    items.push({ id: nextId++, name: file.name, size: file.size, bytes, kind: await classify(bytes), busy: false, lines: [], outputs: [], signed: null });
  }
  for (const item of items) if (item.kind === 'signature' && !item.signed) item.signed = pairOf(item);
  render();
}

function chooseSigned(item: Item): void {
  const picker = h('input', { type: 'file' });
  picker.addEventListener('change', async () => {
    const file = picker.files?.[0];
    if (!file) return;
    const signed: Item = { id: nextId++, name: file.name, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()), kind: 'unknown', busy: false, lines: [], outputs: [], signed: null };
    items.splice(items.indexOf(item), 0, signed);
    item.signed = signed;
    render();
    await openItem(item);
    render();
  });
  picker.click();
}

const keyName = (keyId: string): string | null => {
  const entry = state.keyring.findByKeyId(keyId)[0];
  return entry ? `${named(entry.info)} (${keyIdLabel(keyId)})` : null;
};

async function openItem(item: Item): Promise<void> {
  item.busy = true;
  render();
  try {
    if (item.kind === 'signature' && !item.signed) {
      item.lines = [{ tone: 'warn', text: t('errors', 'This is a detached signature: the file it signs is needed to check it') }];
      return;
    }
    const opened = await open(item.bytes, openContext(), item.signed?.bytes);
    item.lines = outcomeLines(opened);
    if (opened.kind === 'signature') {
      item.lines.unshift({ tone: 'neutral', text: t('files', 'Checked against {name}', { name: item.signed?.name ?? '' }) });
    } else {
      const name = item.kind === 'cleartext' ? item.name.replace(/\.(asc|txt)$/i, '') + '.txt' : outputName(item, opened.filename);
      item.outputs = [{ name, data: opened.data }];
    }
  } catch (error) {
    const text = errorText(error, keyName);
    item.lines = text ? [{ tone: 'bad', text }] : [];
  } finally {
    item.busy = false;
  }
}

let opening = false;

async function openAll(): Promise<void> {
  // A second click while files are being opened would ask every passphrase twice.
  if (opening) return;
  opening = true;
  ($('files-open') as HTMLButtonElement).disabled = true;
  try {
    await openEach();
  } finally {
    opening = false;
    render();
  }
}

async function openEach(): Promise<void> {
  for (const item of items) {
    if (!['encrypted', 'signed', 'cleartext', 'signature'].includes(item.kind)) continue;
    await openItem(item);
    render();
  }
  summarize();
}

function summarize(): void {
  const done = items.filter((i) => i.lines.length);
  if (!done.length) return;
  const tone = worst(done.flatMap((i) => i.lines.map((l) => l.tone)));
  if (tone === 'bad') toast(t('files', 'Some files could not be processed: see below'), 'error');
}

async function importAll(): Promise<void> {
  const results = [];
  for (const item of items.filter((i) => i.kind === 'keys' || i.kind === 'revocation')) {
    const result = await importData(item.bytes, item.name);
    if (result) results.push(result);
    items = items.filter((i) => i !== item);
  }
  render();
  await reportImport(results);
}

/** Kleopatra's Sign/Encrypt Files dialog: whom for, as whom, and in which form. */
async function protectAll(): Promise<void> {
  const targets = items.filter((i) => !isPgp(i));
  if (!targets.length) return;
  const choices = signerChoices();
  const signAs = checkbox(t('files', 'Sign as'), choices.length > 1);
  const signer = select(choices.filter((c) => c.value), choices[0]?.value ?? '');
  signAs.input.disabled = choices.length < 2;
  signer.disabled = !signAs.input.checked;
  signAs.input.addEventListener('change', () => (signer.disabled = !signAs.input.checked));
  const self = ownEncryptionKey();
  const forMe = checkbox(self ? t('files', 'Encrypt for me ({key})', { key: named(self.info) }) : t('files', 'Encrypt for me'), !!self && state.settings.encryptToSelf);
  forMe.input.disabled = !self;
  const forOthers = checkbox(t('files', 'Encrypt for others'), true);
  const picker = new RecipientPicker(() => (forOthers.input.checked = true));
  const withPassword = checkbox(t('files', 'Encrypt with a password'), false, t('files', 'Anyone who knows the password can decrypt the files.'));
  const armor = checkbox(t('files', 'Text output (ASCII armor, .asc)'), state.settings.armorFiles, t('files', 'For mail and messengers; otherwise binary .gpg and .sig, smaller.'));

  let outputsMade = 0;
  await dialog({
    title: tn('files', 'Sign / encrypt {count} file', 'Sign / encrypt {count} files', targets.length),
    wide: true,
    body: [
      h('div', { class: 'protect-row' }, signAs.node, signer),
      forMe.node,
      forOthers.node,
      picker.node,
      withPassword.node,
      armor.node,
      h('p', { class: 'dialog-hint', text: t('files', 'Signing without encrypting makes a detached signature (.sig) beside each file.') }),
    ],
    confirm: t('files', 'Sign / encrypt'),
    submit: async () => {
      if (picker.pending()) return t('notepad', '"{text}" is not a recipient yet: pick a key from the list', { text: picker.pending() });
      const recipients = forOthers.input.checked ? picker.entries() : [];
      if (forMe.input.checked && self && !recipients.includes(self)) recipients.push(self);
      const signing = signAs.input.checked && signer.value ? state.keyring.get(signer.value) : undefined;
      if (!recipients.length && !withPassword.input.checked && !signing) return t('files', 'Choose to sign, to encrypt, or both');
      let passwords: string[] = [];
      if (withPassword.input.checked) {
        const password = await choosePassphrase(t('notepad', 'Encrypt with a password'), t('notepad', 'Anyone who knows this password can decrypt the message. Tell it to the recipient another way than the message itself.'));
        if (password === null) return t('files', 'No password was chosen');
        passwords = [password];
      }
      const unlocked = signing ? await unlockEntry(signing, 'sign') : null;
      if (signing && !unlocked) return t('certify', 'The key was not unlocked');
      state.settings.armorFiles = armor.input.checked;
      state.settings.encryptToSelf = forMe.input.checked;
      saveState();
      const encrypting = recipients.length > 0 || passwords.length > 0;
      for (const item of targets) {
        item.busy = true;
        render();
        try {
          if (encrypting) {
            const data = await encrypt({ data: item.bytes, filename: item.name, recipients: recipients.map((e) => e.key.toPublic()), passwords, signers: unlocked ? [unlocked] : [], armor: armor.input.checked });
            item.outputs = [{ name: `${item.name}.${armor.input.checked ? 'asc' : 'gpg'}`, data }];
            const names = recipients.map((e) => named(e.info));
            if (passwords.length) names.push(t('notepad', 'a password'));
            item.lines = [{ tone: 'ok', text: t('notepad', 'Encrypted for: {names}', { names: names.join(', ') }) }];
          } else {
            const data = await sign({ data: item.bytes, signers: [unlocked!], mode: 'detached', armor: armor.input.checked });
            item.outputs = [{ name: `${item.name}.${armor.input.checked ? 'asc' : 'sig'}`, data }];
            item.lines = [];
          }
          if (signing) item.lines.push({ tone: 'ok', text: t('notepad', 'Signed as {key}', { key: named(signing.info) }) });
          outputsMade += 1;
        } catch (error) {
          item.lines = [{ tone: 'bad', text: errorText(error) ?? '' }];
        } finally {
          item.busy = false;
        }
      }
      render();
      return null;
    },
  });
  if (outputsMade) toast(tn('files', '{count} file ready: save it below', '{count} files ready: save them below', outputsMade));
}

async function saveAll(): Promise<void> {
  for (const output of items.flatMap((i) => i.outputs)) await saveFile(output.data, output.name);
}

export function bindFiles(): void {
  const picker = $('files-picker') as HTMLInputElement;
  for (const id of ['files-add', 'files-choose']) $(id).addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    const files = [...(picker.files ?? [])];
    picker.value = '';
    if (files.length) void addFiles(files);
  });
  $('files-clear').addEventListener('click', () => {
    items = [];
    render();
  });
  $('files-protect').addEventListener('click', () => void protectAll());
  $('files-open').addEventListener('click', () => void openAll());
  $('files-import').addEventListener('click', () => void importAll());
  $('files-save-all').addEventListener('click', () => void saveAll());
  render();
}

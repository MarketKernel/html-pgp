/**
 * The notepad, as Kleopatra's: text typed or pasted in, encrypted for the
 * chosen recipients, signed, or decrypted and verified, in place. The text
 * before the last operation is kept, to go back to it.
 */

import { t } from '../core/i18n';
import { label } from '../core/keys';
import { classify, encrypt, open, sign } from '../core/pgp';
import { choosePassphrase, openContext, unlockEntry } from './agent';
import { errorText, keyIdLabel, named } from './format';
import { importData, reportImport } from './keyactions';
import { outcomeLines, renderLines, type Line } from './outcome';
import { RecipientPicker, signerChoices } from './recipients';
import { copyText, readClipboard, saveFile } from './save';
import { onKeyringChange, ownEncryptionKey, saveState, state } from './state';
import { h, select, toast } from './ui';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let picker: RecipientPicker;
let signer: HTMLSelectElement;
/** The key the user picked to sign with; null — the default one, whichever it is now. */
let pickedSigner: string | null = null;
/** The text before the last operation. */
let previous: string | null = null;
let busy = false;

const area = (): HTMLTextAreaElement => $('np-text');

function showResult(lines: Line[], extra: HTMLElement[] = []): void {
  const box = $('np-result');
  const result = renderLines(lines);
  if (previous !== null) {
    const undo = h('button', { type: 'button', class: 'link-button', text: t('notepad', 'Show the original text') });
    undo.addEventListener('click', () => {
      if (previous === null) return;
      area().value = previous;
      previous = null;
      box.hidden = true;
      area().focus();
    });
    extra.push(undo);
  }
  if (extra.length) result.append(h('div', { class: 'result-actions' }, ...extra));
  box.replaceChildren(result);
  box.hidden = false;
}

function hideResult(): void {
  $('np-result').hidden = true;
}

function replaceText(text: string): void {
  previous = area().value;
  area().value = text;
  area().scrollTop = 0;
}

async function run(work: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  document.body.classList.add('busy');
  for (const id of ['np-encrypt', 'np-sign', 'np-decrypt']) ($(id) as HTMLButtonElement).disabled = true;
  try {
    await work();
  } catch (error) {
    const text = errorText(error, (keyId) => {
      const entry = state.keyring.findByKeyId(keyId)[0];
      return entry ? `${named(entry.info)} (${keyIdLabel(keyId)})` : null;
    });
    if (text) showResult([{ tone: 'bad', text }]);
  } finally {
    busy = false;
    document.body.classList.remove('busy');
    for (const id of ['np-encrypt', 'np-sign', 'np-decrypt']) ($(id) as HTMLButtonElement).disabled = false;
  }
}

async function signingKey() {
  const fingerprint = signer.value;
  if (!fingerprint) return null;
  const entry = state.keyring.get(fingerprint);
  if (!entry) return null;
  const unlocked = await unlockEntry(entry, 'sign');
  return unlocked ? { entry, unlocked } : undefined;
}

async function encryptText(): Promise<void> {
  const text = area().value;
  if (!text) {
    toast(t('notepad', 'Type or paste the text first'), 'error');
    return;
  }
  if (picker.pending()) {
    toast(t('notepad', '"{text}" is not a recipient yet: pick a key from the list', { text: picker.pending() }), 'error');
    return;
  }
  const recipients = picker.entries();
  const self = ($('np-self') as HTMLInputElement).checked ? ownEncryptionKey(signer.value) : null;
  if (self && !recipients.includes(self)) recipients.push(self);
  let passwords: string[] = [];
  if (($('np-password') as HTMLInputElement).checked) {
    const password = await choosePassphrase(t('notepad', 'Encrypt with a password'), t('notepad', 'Anyone who knows this password can decrypt the message. Tell it to the recipient another way than the message itself.'));
    if (password === null) return;
    passwords = [password];
  }
  if (!recipients.length && !passwords.length) {
    toast(t('notepad', 'Add a recipient, or encrypt with a password'), 'error');
    return;
  }
  const by = await signingKey();
  if (by === undefined) return;
  const output = await encrypt({ data: text, recipients: recipients.map((e) => e.key.toPublic()), passwords, signers: by ? [by.unlocked] : [], armor: true });
  replaceText(output as string);
  const lines: Line[] = [];
  const names = recipients.map((e) => named(e.info));
  if (passwords.length) names.push(t('notepad', 'a password'));
  lines.push({ tone: 'ok', text: t('notepad', 'Encrypted for: {names}', { names: names.join(', ') }) });
  if (by) lines.push({ tone: 'ok', text: t('notepad', 'Signed as {key}', { key: named(by.entry.info) }) });
  else lines.push({ tone: 'neutral', text: t('notepad', 'Not signed') });
  const uncertified = recipients.filter((e) => e.trust === 'unknown');
  if (uncertified.length) {
    lines.push({ tone: 'warn', text: t('notepad', 'Not certified: {names}', { names: uncertified.map((e) => named(e.info)).join(', ') }), detail: t('notepad', 'Make sure these keys really belong to their owners.') });
  }
  showResult(lines, [copyButton()]);
}

async function signText(): Promise<void> {
  const text = area().value;
  if (!text) {
    toast(t('notepad', 'Type or paste the text first'), 'error');
    return;
  }
  if (!signer.value) {
    toast(t('notepad', 'Choose a key to sign with'), 'error');
    return;
  }
  const by = await signingKey();
  if (!by) return;
  replaceText((await sign({ data: text, signers: [by.unlocked], mode: 'clear', armor: true })) as string);
  showResult([{ tone: 'ok', text: t('notepad', 'Signed as {key}', { key: named(by.entry.info) }), detail: t('notepad', 'The text stays readable; the signature below it shows it comes from you, unchanged.') }], [copyButton()]);
}

async function decryptText(): Promise<void> {
  const text = area().value;
  if (!text.trim()) {
    toast(t('notepad', 'Paste an encrypted or signed message first'), 'error');
    return;
  }
  const kind = await classify(text);
  if (kind === 'keys' || kind === 'revocation') {
    const button = h('button', { type: 'button', class: 'button button--small button--primary', text: t('notepad', 'Import') });
    button.addEventListener('click', () => {
      void importData(text).then((result) => {
        if (result) {
          hideResult();
          return reportImport([result]);
        }
      });
    });
    showResult([{ tone: 'neutral', text: kind === 'keys' ? t('notepad', 'This is a key, not a message.') : t('notepad', 'This is a revocation certificate.') }], [button]);
    return;
  }
  if (kind === 'signature') {
    showResult([{ tone: 'warn', text: t('notepad', 'This is a detached signature: it is checked against the file it signs. Open both in Files.') }]);
    return;
  }
  const opened = await open(text, openContext());
  const lines = outcomeLines(opened);
  if (opened.text === null) {
    const save = h('button', { type: 'button', class: 'button button--small', text: t('notepad', 'Save as a file') });
    save.addEventListener('click', () => void saveFile(opened.data, opened.filename || 'decrypted.bin'));
    lines.unshift({ tone: 'neutral', text: t('notepad', 'The content is a file, not text: {name}', { name: opened.filename || '—' }) });
    showResult(lines, [save]);
    return;
  }
  replaceText(opened.text);
  showResult(lines);
}

function copyButton(): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'button button--small', text: t('notepad', 'Copy') });
  button.addEventListener('click', () => void copyText(area().value).then(() => toast(t('notepad', 'Copied'))));
  return button;
}

/** Text that is OpenPGP armor is opened by ⌘Enter; anything else is encrypted. */
const looksArmored = (text: string): boolean => /-----BEGIN PGP /.test(text);

export function primaryNotepadAction(): void {
  void run(looksArmored(area().value) ? decryptText : encryptText);
}

/** Decrypts and verifies what is in the notepad, as the button does. */
export function decryptNotepad(): void {
  void run(decryptText);
}

/** Text is in the notepad that a reload would lose. */
export const notepadHasText = (): boolean => area().value.trim().length > 0;

/** Puts text into the notepad from outside: an opened .asc file, a selection sent by the extension. */
export function loadNotepad(text: string): void {
  previous = null;
  area().value = text;
  hideResult();
}

function refreshSigners(): void {
  const choices = signerChoices();
  signer.replaceChildren(...choices.map((c) => h('option', { value: c.value, text: c.label })));
  signer.value = pickedSigner !== null && choices.some((c) => c.value === pickedSigner) ? pickedSigner : (choices[0]?.value ?? '');
  const self = ownEncryptionKey(signer.value);
  const selfBox = $('np-self') as HTMLInputElement;
  selfBox.disabled = !self;
  $('np-self-name').textContent = self ? label(self.info) : t('notepad', 'you have no key pair yet');
  $('np-encrypt').querySelector('span')!.textContent = signer.value ? t('notepad', 'Sign and encrypt') : t('notepad', 'Encrypt');
}

export function bindNotepad(): void {
  picker = new RecipientPicker();
  $('np-recipients').replaceWith(picker.node);
  signer = select(signerChoices(), '');
  signer.id = 'np-signer';
  signer.className = 'side-select';
  $('np-signer-slot').replaceWith(signer);
  signer.addEventListener('change', () => {
    pickedSigner = signer.value;
    refreshSigners();
  });
  const selfBox = $('np-self') as HTMLInputElement;
  selfBox.checked = state.settings.encryptToSelf;
  selfBox.addEventListener('change', () => {
    state.settings.encryptToSelf = selfBox.checked;
    saveState();
  });
  refreshSigners();

  $('np-encrypt').addEventListener('click', () => void run(encryptText));
  $('np-sign').addEventListener('click', () => void run(signText));
  $('np-decrypt').addEventListener('click', () => void run(decryptText));
  area().addEventListener('input', () => {
    previous = null;
    hideResult();
  });
  area().addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      primaryNotepadAction();
    }
  });
  $('np-paste').addEventListener('click', () => {
    readClipboard().then(
      (text) => {
        loadNotepad(text);
        area().focus();
      },
      (error: unknown) => toast(errorText(error) ?? '', 'error'),
    );
  });
  $('np-copy').addEventListener('click', () => {
    if (area().value) void copyText(area().value).then(() => toast(t('notepad', 'Copied')));
  });
  $('np-save').addEventListener('click', () => {
    const text = area().value;
    if (!text) return;
    void saveFile(text, looksArmored(text) ? 'message.asc' : 'message.txt');
  });
  $('np-clear').addEventListener('click', () => {
    previous = null;
    area().value = '';
    hideResult();
    area().focus();
  });
  onKeyringChange(() => {
    picker.refresh();
    refreshSigners();
  });
}

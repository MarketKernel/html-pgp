/**
 * Drives the built page in headless Chrome, as a user would: making a key
 * pair, importing GnuPG's keys, certifying, the notepad and the files view
 * both ways, changing and backing up a key, deleting, reloading; then the
 * same page on a phone's screen, in the dark theme and right to left; then
 * the PWA of build/pages/: offline from its service worker, updated by its
 * button, and handed files as the system would.
 *
 * What the page hands out — exported keys, encrypted files — is caught as it
 * downloads and checked here with the same src/core code, and GnuPG's own
 * fixtures go in: what Kleopatra would hand over.
 *
 * Needs `npm run build` first and a local Chrome (or CHROME=/path/to/chrome).
 * `--shots DIR` also saves screenshots of the main screens into DIR.
 */
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
import { CHROME, sleep, startChrome } from '../tools/chrome.mjs';
import { checker, load, root } from '../tools/load.mjs';

if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the browser tests.');
  process.exit(0);
}

const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
const FIXTURES = join(root, 'tests/fixtures/gnupg');
const fixture = (name) => join(FIXTURES, name);
const MY_PASSPHRASE = 'пароль для теста';

const { check, done } = checker();
const P = await load('core/pgp', 'core/keys', 'openpgp');
const html = await readFile(join(root, 'build', 'html-pgp.html'));

const PAGES = join(root, 'build', 'pages');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let pagesDown = false;
// Set, the server hands out a service worker of this version: a new deploy, as the page sees it.
let nextVersion = null;
// /pages/… is build/pages/, any other path the single file.
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (!path.startsWith('/pages/')) {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  if (pagesDown) return req.socket.destroy();
  const name = path.endsWith('/') ? 'index.html' : basename(path);
  try {
    let body = await readFile(join(PAGES, name));
    if (name === 'sw.js' && nextVersion) body = body.toString().replace(/const VERSION = '[^']*'/, `const VERSION = '${nextVersion}'`);
    res.setHeader('content-type', TYPES[extname(name)] ?? 'application/octet-stream');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const URL_ = `http://127.0.0.1:${server.address().port}/`;

const chrome = await startChrome();
const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
const session = await chrome.attach(targetId, 'page');
const send = (method, params = {}) => chrome.send(method, params, session);
const evaluate = (expression, gesture = false) => chrome.evaluate(session, expression, gesture);
const until = (expression, timeout = 10000) => chrome.until(session, expression, timeout);
const click = (selector) => chrome.click(session, selector);
const q = (selector) => JSON.stringify(selector);
// Names in sentences are isolated with U+2068 … U+2069 (format.ts, named()); the checks read them without.
const plain = (value) => (typeof value === 'string' ? value.replace(/[\u2068\u2069]/g, '') : value);
const text = async (selector) => plain(await evaluate(`document.querySelector(${q(selector)})?.textContent ?? null`));
const texts = async (selector) => (await evaluate(`[...document.querySelectorAll(${q(selector)})].map((n) => n.textContent.trim())`)).map(plain);
const visible = (selector) => evaluate(`(() => { const n = document.querySelector(${q(selector)}); return !!n && n.getClientRects().length > 0; })()`);
const TOP = `[...document.querySelectorAll('.overlay')].at(-1)`;
const dialogTitle = () => evaluate(`${TOP}?.querySelector('h2')?.textContent ?? null`);
const dialogError = () => evaluate(`${TOP}?.querySelector('.dialog-error')?.textContent ?? null`);
const dialogs = () => evaluate(`document.querySelectorAll('.overlay').length`);

async function type(value) {
  await send('Input.insertText', { text: value });
  await sleep(30);
}

async function fill(selector, value) {
  await evaluate(`(() => { const n = ${selector.startsWith('[') || selector.startsWith('(') ? selector : `document.querySelector(${q(selector)})`}; n.focus(); n.select?.(); })()`);
  await type(value);
}

/** Fills the nth text field of the dialog on top. */
const dialogField = (index) => `${TOP}.querySelectorAll('input.dialog-input, textarea.dialog-input')[${index}]`;

async function press(key, modifiers = 0) {
  const codes = { Enter: [13, 'Enter', '\r'], Escape: [27, 'Escape'], ArrowDown: [40, 'ArrowDown'], ArrowUp: [38, 'ArrowUp'], Delete: [46, 'Delete'] };
  const [code, name, typed] = codes[key];
  await send('Input.dispatchKeyEvent', { type: typed && !modifiers ? 'keyDown' : 'rawKeyDown', key, code: name, windowsVirtualKeyCode: code, modifiers, text: typed && !modifiers ? typed : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: name, windowsVirtualKeyCode: code, modifiers });
  await sleep(50);
}

/** Clicks a button of the dialog on top by its text. */
async function dialogButton(label) {
  const ok = await evaluate(`(() => { const b = [...${TOP}.querySelectorAll('button')].find((n) => n.textContent.trim() === ${q(label)}); if (!b) return false; b.click(); return true; })()`);
  if (!ok) throw new Error(`No button "${label}" in the dialog "${await dialogTitle()}"`);
  await sleep(80);
}

/** Clicks the first element matching `selector` whose text includes `label`. */
async function clickText(selector, label) {
  const ok = await evaluate(`(() => { const n = [...document.querySelectorAll(${q(selector)})].find((n) => n.textContent.includes(${q(label)})); if (!n) return false; n.click(); return true; })()`);
  if (!ok) throw new Error(`No ${selector} with "${label}"`);
  await sleep(80);
}

async function setFiles(selector, paths) {
  const { root: doc } = await send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: doc.nodeId, selector });
  await send('DOM.setFileInputFiles', { nodeId, files: paths });
  await sleep(150);
}

async function shot(name) {
  if (!SHOTS) return;
  await sleep(150);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
}

/** Answers the passphrase prompt on top with `passphrase`. */
async function unlockWith(passphrase) {
  check(`passphrase asked: ${passphrase}`, await until(`${TOP}?.querySelector('h2')?.textContent === 'Enter passphrase'`), true);
  await fill(dialogField(0), passphrase);
  await dialogButton('Unlock');
}

/** The downloads the page made since the last call: name and bytes. */
async function downloads() {
  const list = await evaluate(`(async () => {
    const out = [];
    for (const { name, blob } of window.__downloads.splice(0)) out.push({ name, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) });
    return out;
  })()`);
  return list.map(({ name, bytes }) => ({ name, bytes: new Uint8Array(bytes) }));
}

const rows = () => texts('#key-rows .key-name');
const toastText = async () => (await until(`document.querySelector('.toast--shown')`, 5000)) && text('.toast');

try {
  await send('Page.enable');
  await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      if (!localStorage.getItem('html-pgp')) localStorage.setItem('html-pgp', JSON.stringify({ language: 'en', theme: 'light' }));
      window.__plain = (s) => (s ?? '').replace(/[\u2068\u2069]/g, '');
      window.__downloads = [];
      const createObjectURL = URL.createObjectURL;
      URL.createObjectURL = (blob) => { const url = createObjectURL(blob); window.__blobs = window.__blobs || new Map(); window.__blobs.set(url, blob); return url; };
      HTMLAnchorElement.prototype.click = function () { if (this.download) window.__downloads.push({ name: this.download, blob: window.__blobs.get(this.href) }); };
    `,
  });
  await send('Page.navigate', { url: URL_ });
  check('page starts', await until(`document.body.classList.contains('ready')`), true);

  // ------------------------------------------------------------ an empty keyring
  check('empty keyring shown', await visible('#keys-empty'), true);
  check('no details pane while empty', await visible('.details-pane'), false);
  check('version shown', /^\d+\.\d+\.\d+/.test(await text('#version')), true);
  await shot('1-empty');

  // ------------------------------------------------------------ a new key pair
  await click('#empty-new');
  check('new key dialog', await dialogTitle(), 'New key pair');
  await dialogButton('Create');
  check('name or email required', await dialogError(), 'Enter a name or an email address');
  await fill(dialogField(0), 'Alice Test');
  await fill(dialogField(1), 'not an address');
  await dialogButton('Create');
  check('email checked', await dialogError(), 'This email address does not look right');
  await fill(dialogField(1), 'alice@test.example');
  await fill(dialogField(2), MY_PASSPHRASE);
  await fill(dialogField(3), 'something else');
  await dialogButton('Create');
  check('passphrases must match', await dialogError(), 'The two passphrases differ');
  await fill(dialogField(3), MY_PASSPHRASE);
  await evaluate(`${TOP}.querySelector('details').open = true`);
  check('algorithms offered, grouped', await evaluate(`[...${TOP}.querySelectorAll('select')[0].options].map((o) => o.value)`), P.ALGORITHMS.map((a) => a.id));
  check('validity offered', await evaluate(`[...${TOP}.querySelectorAll('select')[1].options].map((o) => o.textContent)`), ['1 year', '2 years', '3 years', '5 years', 'Never expires']);
  await shot('2-new-key');
  await dialogButton('Create');
  check('key made', await until(`${TOP}?.querySelector('h2')?.textContent === 'Your key pair is ready'`, 20000), true);
  await dialogButton('Later');
  check('one key listed', await rows(), ['Alice Test']);
  check('details of the new key', await text('.details-title h2'), 'Alice Test');
  check('own key chip', await texts('.details .chips .chip'), ['Your key']);
  check('expires in three years', (await text('.facts dd:nth-of-type(2)')) !== 'never', true);
  check('algorithm', await text('.facts dd:nth-of-type(3)'), 'ed25519');
  const aliceFpr = await evaluate(`document.querySelector('.details').dataset.fpr`);

  // ------------------------------------------------------------ importing GnuPG's keys
  await setFiles('#key-picker', [fixture('bob-public.asc'), fixture('alice-public.asc')]);
  check('import report', await until(`${TOP}?.querySelector('h2')?.textContent === '2 keys imported'`), true);
  check('import statuses', await evaluate(`[...${TOP}.querySelectorAll('.import-status')].map((n) => n.textContent)`), ['new', 'new']);
  await dialogButton('Close');
  check('three keys, sorted', await rows(), ['Alice Example', 'Alice Test', 'Bob Example']);
  check('validity column', await texts('#key-rows .key-cell--status'), ['Not certified', 'Your key', 'Not certified']);
  await evaluate(`(() => { const s = document.getElementById('filter'); s.value = 'mine'; s.dispatchEvent(new Event('change')); })()`);
  check('filter: my key pairs', await rows(), ['Alice Test']);
  await evaluate(`(() => { const s = document.getElementById('filter'); s.value = 'all'; s.dispatchEvent(new Event('change')); })()`);
  await fill('#search', 'bob');
  check('search by name', await rows(), ['Bob Example']);
  await fill('#search', '9FAD5A48');
  check('search by key id', await rows(), ['Bob Example']);
  await fill('#search', '');
  check('search cleared', (await rows()).length, 3);

  // A GnuPG revocation certificate is imported only when confirmed.
  await setFiles('#key-picker', [fixture('bob-revocation.rev')]);
  check('revocation asks first', await until(`${TOP}?.querySelector('h2')?.textContent === 'Import a revocation certificate?'`), true);
  await dialogButton('Cancel');
  check('bob not revoked', await evaluate(`[...document.querySelectorAll('#key-rows .key-row')].find((r) => r.textContent.includes('Bob')).querySelector('.chip').textContent`), 'Not certified');

  // ------------------------------------------------------------ certifying Bob
  await clickText('#key-rows .key-row', 'Bob Example');
  check('bob shown', await text('.details-title h2'), 'Bob Example');
  check('bob fingerprint grouped, in halves', await texts('.fpr-half'), ['4AB5 07A0 DC3A 1DB6 D59D', 'E24F 9FAD 5A48 0326 49A2']);
  check('bob user id certified by someone unknown', await text('.uid-certs'), null);
  await shot('3-details');
  await clickText('.details-actions button', 'Certify');
  check('certify dialog', await dialogTitle(), 'Certify key');
  await dialogButton('Certify');
  await unlockWith('wrong one');
  check('wrong passphrase', await until(`${TOP}?.querySelector('.dialog-error')?.textContent === 'Wrong passphrase'`), true);
  await fill(dialogField(0), MY_PASSPHRASE);
  await dialogButton('Unlock');
  check('certified', await toastText(), 'Key certified');
  check('bob now certified', await until(`document.querySelector('.details .chip')?.textContent === 'Certified'`), true);
  check('certified by me', await text('.uid-certs'), 'Certified by you: Alice Test <alice@test.example>');
  check('passphrase remembered: forget button shown', await visible('#forget'), true);

  // ------------------------------------------------------------ the notepad: encrypt and sign, then decrypt
  await click('.nav-item[data-view="notepad"]');
  check('notepad shown', await visible('#np-text'), true);
  check('signer is my key', await evaluate(`document.getElementById('np-signer').selectedOptions[0].textContent`), 'Alice Test <alice@test.example>');
  const MESSAGE = 'Привет, Bob!\nThe meeting is at 10.';
  await fill('#np-text', MESSAGE);
  await evaluate(`document.querySelector('.recipient-input').focus()`);
  await type('bob');
  check('recipient suggested', await until(`document.querySelector('.recipient-option')?.textContent.includes('Bob Example')`), true);
  await press('Enter');
  check('recipient chosen', await texts('.recipient-name'), ['Bob Example']);
  await shot('4-notepad');
  await click('#np-encrypt');
  check('encrypted', await until(`document.getElementById('np-text').value.startsWith('-----BEGIN PGP MESSAGE-----')`), true);
  check('encrypt result', await texts('#np-result .result-text'), ['Encrypted for: Bob Example <bob@example.org>, Alice Test <alice@test.example>', 'Signed as Alice Test <alice@test.example>']);
  const armored = await evaluate(`document.getElementById('np-text').value`);
  // Bob reads it with his own key, outside the page.
  const bobSecret = await P.openpgp.readPrivateKey({ armoredKey: await readFile(fixture('bob-secret.asc'), 'utf8') });
  const bobOpen = await P.unlock(bobSecret, 'bob passphrase');
  const outside = await P.open(armored, { verificationKeys: [], secretKeys: [bobSecret], unlock: async () => bobOpen, password: async () => null });
  check('bob decrypts it outside the page', outside.text, MESSAGE);

  await click('#np-decrypt');
  check('decrypted back', await until(`document.getElementById('np-text').value === ${q(MESSAGE)}`), true);
  check('decrypt result', await texts('#np-result .result-text'), ['Decrypted with your key Alice Test <alice@test.example>', 'Good signature from Alice Test <alice@test.example>']);
  await shot('5-notepad-decrypted');
  await clickText('#np-result button', 'Show the original text');
  check('original back', await evaluate(`document.getElementById('np-text').value === ${q(armored)}`), true);

  // GnuPG's message to its Alice, signed by Bob: once the secret key is here.
  await click('.nav-item[data-view="keys"]');
  await setFiles('#key-picker', [fixture('alice-secret.asc')]);
  check('secret key joins its public key', await toastText(), 'Alice Example <alice@example.org>: secret key added');
  await click('.nav-item[data-view="notepad"]');
  await evaluate(`document.getElementById('np-text').value = ''`);
  await fill('#np-text', await readFile(fixture('to-alice-signed-by-bob.asc'), 'utf8'));
  await click('#np-decrypt');
  await unlockWith('alice passphrase');
  check('gnupg message decrypted', await until(`document.getElementById('np-text').value.startsWith('Привет, Alice!')`), true);
  check('gnupg message: signature from certified bob', await texts('#np-result .result-text'), ['Decrypted with your key Alice Example <alice@example.org>', 'Good signature from Bob Example <bob@example.org>']);
  check('gnupg message: certified note', (await texts('#np-result .result-detail')).some((d) => d.includes('You certified this key.')), true);

  await evaluate(`document.getElementById('np-text').value = ''`);
  await fill('#np-text', await readFile(fixture('clearsigned-by-bob.asc'), 'utf8'));
  await click('#np-decrypt');
  check('clear signed text verified', await until(`__plain(document.querySelector('#np-result .result-text')?.textContent) === 'Good signature from Bob Example <bob@example.org>'`), true);

  await evaluate(`document.getElementById('np-text').value = ''`);
  await fill('#np-text', await readFile(fixture('symmetric.asc'), 'utf8'));
  await click('#np-decrypt');
  check('password asked', await until(`${TOP}?.querySelector('h2')?.textContent === 'Password'`), true);
  await fill(dialogField(0), 'correct horse battery staple');
  await dialogButton('Decrypt');
  check('symmetric message decrypted', await until(`document.getElementById('np-text').value.startsWith('Привет, Alice!')`), true);

  await evaluate(`document.getElementById('np-text').value = ''`);
  await fill('#np-text', await readFile(fixture('bob-public.asc'), 'utf8'));
  await click('#np-decrypt');
  check('a key in the notepad is offered for import', await until(`document.querySelector('#np-result .result-text')?.textContent === 'This is a key, not a message.'`), true);

  // ------------------------------------------------------------ files
  await click('.nav-item[data-view="files"]');
  await shot('6-files-empty');
  await setFiles('#files-picker', [fixture('message.txt'), fixture('message.txt.sig'), fixture('to-bob.gpg')]);
  check('files listed', await texts('.file-name'), ['message.txt', 'message.txt.sig', 'to-bob.gpg']);
  check('files recognised', await texts('.file-meta'), [
    'File · 43 bytes',
    'Detached signature · 147 bytes · signs message.txt',
    'Encrypted · 525 bytes',
  ]);
  await click('#files-open');
  check('detached signature checked', await until(`[...document.querySelectorAll('.file')][1]?.querySelector('.result-line--ok') !== null`), true);
  check('signature line', await evaluate(`__plain([...document.querySelectorAll('.file')][1].querySelector('.result').textContent).includes('Good signature from Alice Example')`), true);
  check('no secret key for bob', await evaluate(`__plain([...document.querySelectorAll('.file')][2].querySelector('.result-text').textContent)`), 'It is encrypted for keys whose secret part you do not have: Bob Example <bob@example.org> (0x269F257FF55F5F79)');
  await shot('7-files-checked');

  await click('#files-clear');
  await setFiles('#files-picker', [fixture('message.txt')]);
  await click('#files-protect');
  check('protect dialog', await dialogTitle(), 'Sign / encrypt 1 file');
  await evaluate(`${TOP}.querySelector('.recipient-input').focus()`);
  await type('bob');
  await until(`document.querySelector('.recipient-option')`);
  await press('Enter');
  await dialogButton('Sign / encrypt');
  check('file encrypted', await until(`document.querySelector('.file .file-actions .button--primary')?.textContent === 'Save message.txt.gpg'`), true);
  await click('.file .file-actions .button--primary');
  const [encryptedFile] = await downloads();
  check('download named', encryptedFile?.name, 'message.txt.gpg');
  const fromFile = await P.open(encryptedFile.bytes, { verificationKeys: [], secretKeys: [bobSecret], unlock: async () => bobOpen, password: async () => null });
  check('bob decrypts the file outside the page', [fromFile.text, fromFile.filename], [await readFile(fixture('message.txt'), 'utf8'), 'message.txt']);

  // A file encrypted to me, decrypted in the page: the encrypted bytes go back in as a file.
  const scratch = await mkdtemp(join(tmpdir(), 'html-pgp-app-'));
  await writeFile(join(scratch, 'message.txt.gpg'), encryptedFile.bytes);
  await click('#files-clear');
  await setFiles('#files-picker', [join(scratch, 'message.txt.gpg')]);
  await click('#files-open');
  check('own file decrypted', await until(`document.querySelector('.file .file-actions .button--primary')?.textContent === 'Save message.txt'`), true);
  check('own file: signed by me', await evaluate(`__plain(document.querySelector('.file .result').textContent).includes('Good signature from Alice Test')`), true);
  await click('.file .file-actions .button--primary');
  const [decryptedFile] = await downloads();
  check('own file: the original bytes back', new TextDecoder().decode(decryptedFile.bytes), await readFile(fixture('message.txt'), 'utf8'));
  await rm(scratch, { recursive: true, force: true });

  // ------------------------------------------------------------ the notepad: signing only, a password only
  await click('.nav-item[data-view="notepad"]');
  await evaluate(`document.getElementById('np-text').value = ''`);
  await fill('#np-text', 'Signed, not sealed.');
  await click('#np-sign');
  check('clear signed in the notepad', await until(`document.getElementById('np-text').value.startsWith('-----BEGIN PGP SIGNED MESSAGE-----')`), true);
  await click('#np-decrypt');
  check('and verified', await until(`__plain(document.querySelector('#np-result .result-text')?.textContent) === 'Good signature from Alice Test <alice@test.example>'`), true);
  check('the text back', await evaluate(`document.getElementById('np-text').value`), 'Signed, not sealed.');

  await evaluate(`document.querySelector('.recipient .chip-remove')?.click()`);
  await evaluate(`(() => { const box = document.getElementById('np-self'); if (box.checked) box.click(); const pw = document.getElementById('np-password'); if (!pw.checked) pw.click(); const s = document.getElementById('np-signer'); s.value = ''; s.dispatchEvent(new Event('change')); return true; })()`);
  check('encrypt only, unsigned', await text('#np-encrypt span'), 'Encrypt');
  await click('#np-encrypt');
  check('password chosen', await until(`${TOP}?.querySelector('h2')?.textContent === 'Encrypt with a password'`), true);
  await fill(dialogField(0), 'shared secret');
  await fill(dialogField(1), 'shared secret');
  await dialogButton('OK');
  check('encrypted with a password', await until(`document.getElementById('np-text').value.startsWith('-----BEGIN PGP MESSAGE-----')`), true);
  check('password result', await texts('#np-result .result-text'), ['Encrypted for: a password', 'Not signed']);
  await click('#np-decrypt');
  check('password asked back', await until(`${TOP}?.querySelector('h2')?.textContent === 'Password'`), true);
  await fill(dialogField(0), 'not it');
  await dialogButton('Decrypt');
  check('wrong password said', await until(`${TOP}?.querySelector('.dialog-error')?.textContent === 'Wrong password'`), true);
  await fill(dialogField(0), 'shared secret');
  await dialogButton('Decrypt');
  check('decrypted with the password', await until(`document.getElementById('np-text').value === 'Signed, not sealed.'`), true);
  await evaluate(`(() => { document.getElementById('np-password').click(); document.getElementById('np-self').click(); return true; })()`);

  // ------------------------------------------------------------ changing my key
  await click('.nav-item[data-view="keys"]');
  await clickText('#key-rows .key-row', 'Alice Test');
  await clickText('.details-actions button', 'Export');
  check('export dialog', await dialogTitle(), 'Export public key');
  await dialogButton('Save file');
  const [exported] = await downloads();
  check('exported file name', /^Alice_Test_0x[0-9A-F]{16}_public\.asc$/.test(exported?.name ?? ''), true);
  const exportedKey = await P.openpgp.readKey({ armoredKey: new TextDecoder().decode(exported.bytes) });
  check('exported key is public and mine', [exportedKey.isPrivate(), exportedKey.getFingerprint().toUpperCase()], [false, aliceFpr]);

  const openMore = async () => {
    await evaluate(`document.querySelector('.details-actions .icon-button').click()`);
    await until(`document.querySelector('.context-menu')`);
  };
  await openMore();
  await shot('8-key-menu');
  await clickText('.context-item', 'Change expiry');
  await evaluate(`(() => { const d = ${TOP}.querySelector('input[type=date]'); d.value = '2031-06-01'; d.dispatchEvent(new Event('input')); })()`);
  await dialogButton('OK');
  check('expiry changed', await until(`document.querySelector('.facts dd:nth-of-type(2)')?.textContent === 'Jun 1, 2031'`), true);
  await openMore();
  await clickText('.context-item', 'Add user ID');
  await fill(dialogField(0), 'Alice Work');
  await fill(dialogField(1), 'alice@work.example');
  await dialogButton('Add');
  check('user id added', await until(`document.querySelectorAll('.uid').length === 2`), true);
  check('user ids', await texts('.uid-text > span:first-child'), ['Alice Test <alice@test.example>', 'Alice Work <alice@work.example>']);
  await openMore();
  await clickText('.context-item', 'Back up secret key');
  await dialogButton('Save backup');
  const [backup] = await downloads();
  check('backup name', /_SECRET\.asc$/.test(backup?.name ?? ''), true);
  const backupKey = await P.openpgp.readPrivateKey({ armoredKey: new TextDecoder().decode(backup.bytes) });
  check('backup is the secret key, still protected', [backupKey.isPrivate(), P.isUnlocked(backupKey)], [true, false]);
  check('backup opens with the passphrase', P.isUnlocked(await P.unlock(backupKey, MY_PASSPHRASE)), true);
  check('backup has the new user id and expiry', [(await P.describe(backupKey)).userIds.length, new Date((await P.describe(backupKey)).expires).getFullYear()], [2, 2031]);

  // A new passphrase: the old one is asked first, even while it is remembered.
  await openMore();
  await clickText('.context-item', 'Change passphrase');
  await unlockWith(MY_PASSPHRASE);
  check('new passphrase asked', await until(`${TOP}?.querySelector('h2')?.textContent === 'Change passphrase'`), true);
  await fill(dialogField(0), 'новая фраза');
  await fill(dialogField(1), 'новая фраза');
  await dialogButton('OK');
  check('passphrase changed', await toastText(), 'Passphrase changed');
  await openMore();
  await clickText('.context-item', 'Revocation certificate');
  await dialogButton('Save file');
  const [revocationFile] = await downloads();
  check('revocation certificate saved, the one made with the key', /_revocation\.asc$/.test(revocationFile?.name ?? ''), true);
  const revocationText = new TextDecoder().decode(revocationFile.bytes);
  const revokedCopy = await P.applyRevocation(exportedKey, (await P.parseKeys(revocationText, { revocations: true })).revocations[0]);
  check('the certificate revokes the key', (await P.describe(revokedCopy)).status, 'revoked');
  await openMore();
  await clickText('.context-item', 'Back up secret key');
  await dialogButton('Save backup');
  await unlockWith('новая фраза');
  const [rekeyed] = await downloads();
  const rekeyedKey = await P.openpgp.readPrivateKey({ armoredKey: new TextDecoder().decode(rekeyed.bytes) });
  check('the backup opens with the new passphrase', P.isUnlocked(await P.unlock(rekeyedKey, 'новая фраза')), true);

  // A key of RSA, made and revoked.
  await click('#new-key');
  await fill(dialogField(0), 'Carol RSA');
  await fill(dialogField(1), 'carol@test.example');
  await fill(dialogField(2), 'carol');
  await fill(dialogField(3), 'carol');
  await evaluate(`(() => { const t = ${TOP}; t.querySelector('details').open = true; const s = t.querySelectorAll('select'); s[0].value = 'rsa2048'; s[0].dispatchEvent(new Event('change')); s[1].value = '0'; return true; })()`);
  await dialogButton('Create');
  check('rsa key made', await until(`${TOP}?.querySelector('h2')?.textContent === 'Your key pair is ready'`, 30000), true);
  await dialogButton('Later');
  check('rsa key shown', [await text('.details-title h2'), await text('.facts dd:nth-of-type(2)'), await text('.facts dd:nth-of-type(3)')], ['Carol RSA', 'never', 'rsa2048']);
  await openMore();
  await clickText('.context-item', 'Revoke key');
  await dialogButton('Revoke key');
  check('revoking needs the box ticked', await dialogError(), 'Confirm that you understand');
  await evaluate(`${TOP}.querySelector('input[type=checkbox]').click()`);
  await dialogButton('Revoke key');
  await unlockWith('carol');
  check('revoked, sharing offered', await until(`${TOP}?.querySelector('h2')?.textContent === 'Key revoked'`), true);
  await dialogButton('Cancel');
  check('revoked key marked', await until(`document.querySelector('.details .chip')?.textContent === 'Revoked'`), true);
  check('revoked key in the filter', await evaluate(`(() => { const s = document.getElementById('filter'); s.value = 'unusable'; s.dispatchEvent(new Event('change')); return [...document.querySelectorAll('#key-rows .key-name')].map((n) => n.textContent); })()`), ['Carol RSA']);
  await evaluate(`(() => { const s = document.getElementById('filter'); s.value = 'all'; s.dispatchEvent(new Event('change')); return true; })()`);
  await clickText('#key-rows .key-row', 'Carol RSA');
  await openMore();
  await clickText('.context-item', 'Delete');
  check('deleting a secret key needs the box', await dialogTitle(), 'Delete key');
  await dialogButton('Delete');
  check('delete refused without the box', await dialogError(), 'Confirm that you understand');
  await evaluate(`${TOP}.querySelector('input[type=checkbox]').click()`);
  await dialogButton('Delete');
  check('carol deleted', await until(`![...document.querySelectorAll('#key-rows .key-name')].some((n) => n.textContent === 'Carol RSA')`), true);

  // ------------------------------------------------------------ deleting, reloading, forgetting
  await clickText('#key-rows .key-row', 'Bob Example');
  await evaluate(`document.getElementById('key-rows').focus()`);
  await press('Delete');
  check('delete asks', await dialogTitle(), 'Delete key');
  await dialogButton('Delete');
  check('bob deleted', await until(`document.querySelectorAll('#key-rows .key-row').length === 2`), true);

  await evaluate(`window.__beforeReload = true`);
  await send('Page.reload');
  check('reloaded', await until(`!window.__beforeReload && document.body.classList.contains('ready')`), true);
  check('keys kept in IndexedDB', await rows(), ['Alice Example', 'Alice Test']);
  check('passphrases forgotten on reload', await visible('#forget'), false);

  // ------------------------------------------------------------ settings
  await click('.nav-item[data-view="settings"]');
  check('settings shown', await texts('.settings-group'), ['Appearance', 'Security', 'Defaults', 'Keyring', 'About']);
  await shot('9-settings');

  // ------------------------------------------------------------ dark, right to left
  await evaluate(`document.documentElement.dataset.theme = 'dark'`);
  await click('.nav-item[data-view="keys"]');
  await clickText('#key-rows .key-row', 'Alice Test');
  await shot('10-dark');
  await evaluate(`document.documentElement.dataset.theme = 'light'; document.documentElement.dir = 'rtl'`);
  await shot('11-rtl');
  await evaluate(`document.documentElement.dir = 'ltr'`);

  // ------------------------------------------------------------ a phone
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await sleep(300);
  check('phone: bottom tabs', await evaluate(`getComputedStyle(document.querySelector('.sidebar')).flexDirection`), 'row');
  // The key selected on the wide window is still shown: on a phone, on its own screen.
  check('phone: the selected key on its own screen', [await visible('.list-pane'), await visible('.details-pane')], [false, true]);
  await click('.details-back');
  check('phone: back to the list', [await visible('.list-pane'), await visible('.details-pane')], [true, false]);
  await shot('12-phone-list');
  await clickText('#key-rows .key-row', 'Alice Example');
  check('phone: details on their own screen', await until(`document.body.classList.contains('show-details')`), true);
  check('phone: back button', await visible('.details-back'), true);
  await shot('13-phone-details');
  await click('.details-back');
  check('phone: back to the list', await until(`!document.body.classList.contains('show-details')`), true);
  await click('.nav-item[data-view="notepad"]');
  await shot('14-phone-notepad');

  // ------------------------------------------------------------ the PWA
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${URL_}pages/` });
  check('pwa: starts', await until(`document.body.classList.contains('ready')`), true);
  check('pwa: service worker in control', await until(`navigator.serviceWorker.controller !== null`), true);
  check('pwa: the same keys, the same origin', (await rows()).length, 2);
  check('pwa: manifest parsed', (await send('Page.getAppManifest')).errors, []);
  check('pwa: installable', (await send('Page.getInstallabilityErrors')).installabilityErrors, []);
  const reload = async () => {
    await evaluate(`window.__beforeReload = true`);
    await send('Page.reload');
    return until(`!window.__beforeReload && document.body.classList.contains('ready')`, 15000);
  };
  pagesDown = true;
  check('pwa: offline', await reload(), true);
  check('pwa: offline, keys there', (await rows()).length, 2);

  // Updates: a new deploy installs beside the running version and waits for Update.
  const updateLine = `(document.querySelector('[data-setting="update"]')?.textContent ?? '')`;
  const workerVersion = () =>
    evaluate(`new Promise((resolve) => { const c = new MessageChannel(); c.port1.onmessage = (e) => resolve(e.data); navigator.serviceWorker.controller.postMessage('version', [c.port2]); })`);
  const running = await text('#version');
  check('pwa: the worker knows its version', await workerVersion(), running);
  await click('.nav-item[data-view="settings"]');
  check('pwa: settings offer a check', await text('[data-setting="update"] button'), 'Check for updates');
  await click('[data-setting="update"] button');
  check('pwa: no server, no check', await until(`${updateLine}.includes('No connection: could not check for updates.')`), true);
  pagesDown = false;
  await click('[data-setting="update"] button');
  check('pwa: nothing new', await until(`${updateLine}.includes('This is the latest version.')`), true);
  nextVersion = '9.9.9';
  await click('[data-setting="update"] button');
  check('pwa: a new version ready', await until(`${updateLine}.includes('Version 9.9.9 is ready.')`, 15000), true);
  check('pwa: and beside the version', await text('#update-note'), 'Version 9.9.9 is ready.');
  check('pwa: a dot on the settings', await evaluate(`document.querySelector('.nav-item[data-view="settings"]').classList.contains('nav-item--badge')`), true);
  check('pwa: the old worker still serves', await workerVersion(), running);
  await shot('15-pwa-update');
  await evaluate(`window.__beforeReload = true`);
  await click('[data-setting="update"] button');
  check('pwa: update reloads the page', await until(`!window.__beforeReload && document.body.classList.contains('ready')`, 15000), true);
  check('pwa: the new worker serves', await workerVersion(), '9.9.9');
  check('pwa: the old cache gone', (await evaluate(`caches.keys()`)).length, 1);
  pagesDown = true;
  check('pwa: offline after the update', await reload(), true);
  pagesDown = false;
  // The page served is the same, only the worker changed: what the app ran before is set back to see the note.
  await evaluate(`localStorage.setItem('html-pgp-version', '0.0.1')`);
  await reload();
  check('pwa: "updated" said once', await until(`document.querySelector('.toast--shown')?.textContent === ${q(`Updated to version ${running}.`)}`), true);
  check('pwa: and remembered', await evaluate(`localStorage.getItem('html-pgp-version')`), running);
  nextVersion = null;

  // Files opened with the installed app. Headless Chrome neither installs apps nor handles files,
  // so a stand-in launchQueue takes the page's consumer and hands it real handles from the
  // origin-private file system, as Chrome hands them from the disk.
  const manifest = JSON.parse((await send('Page.getAppManifest')).data);
  check('pwa: the manifest takes OpenPGP files, into the open window', [Object.values(manifest.file_handlers[0].accept).flat().sort(), manifest.launch_handler], [
    ['.asc', '.gpg', '.key', '.pgp', '.sig'],
    { client_mode: 'focus-existing' },
  ]);
  const { identifier: launchScript } = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(window, 'launchQueue', { value: { setConsumer: (consumer) => { window.__launch = consumer; } } });`,
  });
  await reload();
  check('pwa: the page takes launched files', await until(`typeof window.__launch === 'function'`), true);
  const signature = (await readFile(fixture('message.txt.sig'))).toString('base64');
  await evaluate(`(async () => {
    const handle = await (await navigator.storage.getDirectory()).getFileHandle('message.txt.sig', { create: true });
    const stream = await handle.createWritable();
    await stream.write(Uint8Array.from(atob(${q(signature)}), (c) => c.charCodeAt(0)));
    await stream.close();
    window.__launch({ files: [handle] });
  })()`);
  check('pwa: a launched file opens in the files view', await until(`document.body.dataset.view === 'files' && document.querySelector('.file-name')?.textContent === 'message.txt.sig'`), true);
  check('pwa: and is recognised', await text('.file-meta'), 'Detached signature · 147 bytes');
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: launchScript });

  check('no errors in the page', chrome.errors, []);
} finally {
  await chrome.close();
  server.close();
}

done('app');

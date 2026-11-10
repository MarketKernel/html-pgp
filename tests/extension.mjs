/**
 * Drives the Chrome extension of build/extension/ in headless Chrome: the side
 * panel imports GnuPG's keys into its own keyring; text selected on a web page
 * — in the page, in a text field — goes from the context menu into the panel's
 * notepad and is verified or decrypted there; on a page the extension may not
 * script, the menu's own selectionText, its lines lost, is mended and still
 * decrypts; "Encrypt" hands the text over as it is.
 *
 * Chrome loads the extension through the DevTools protocol over a pipe
 * (Extensions.loadUnpacked, with --enable-unsafe-extension-debugging): the
 * --load-extension flag is gone from Chrome since version 137. A context menu
 * cannot be clicked from DevTools, so the test fires the worker's onClicked
 * itself. With no click Chrome grants no activeTab, so the copy of the
 * extension under test may reach the test's own site as a host permission,
 * and opening the side panel without a click fails, so the worker's call is
 * recorded instead and the panel is opened by the extension's own page.
 *
 * Needs `npm run build` first and a local Chrome (or CHROME=/path/to/chrome).
 * `--shots DIR` also saves screenshots of the side panel into DIR.
 */
import { existsSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROME, sleep, startChrome } from '../tools/chrome.mjs';
import { checker, root } from '../tools/load.mjs';

const BUILT = join(root, 'build', 'extension');
const FIXTURES = join(root, 'tests/fixtures/gnupg');
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;

if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the extension tests.');
  process.exit(0);
}
if (!existsSync(join(BUILT, 'manifest.json'))) {
  console.error('No build/extension/ — run `npm run build` first.');
  process.exit(1);
}

const { check, done } = checker();
const q = (value) => JSON.stringify(value);
const encrypted = await readFile(join(FIXTURES, 'to-alice-signed-by-bob.asc'), 'utf8');
const clearsigned = await readFile(join(FIXTURES, 'clearsigned-by-bob.asc'), 'utf8');
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The site: a signed text in the page, an encrypted one in a text field.
const server = createServer((req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><title>Mail</title><pre id="signed">${escape(clearsigned)}</pre><textarea id="field" rows="20" cols="70">${escape(encrypted)}</textarea><p id="plain">Meet me at noon</p>`);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const SITE = `http://127.0.0.1:${server.address().port}/`;

// The copy under test may script the test's site, as a click on its menu would let it; and it
// has a page of its own, to open the side panel with a "click".
const work = await mkdtemp(join(tmpdir(), 'html-pgp-extension-'));
const extensionDir = join(work, 'extension');
await cp(BUILT, extensionDir, { recursive: true });
const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['http://127.0.0.1/*'];
await writeFile(join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(join(extensionDir, 'test.html'), '<!doctype html><title>test</title>');

const chrome = await startChrome();
const { send, attach, evaluate, until, waitForTarget } = chrome;

async function shot(session, name) {
  if (!SHOTS) return;
  await sleep(150);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, session);
  await writeFile(join(SHOTS, `${name}.png`), Buffer.from(data, 'base64'));
}

try {
  const loaded = await send('Extensions.loadUnpacked', { path: extensionDir }).catch((error) => {
    if (!/-32601|not found/i.test(error.message)) throw error;
    console.log(`This Chrome cannot load an extension from DevTools (${error.message}). Skipping the extension tests.`);
    return null;
  });
  if (!loaded) process.exit(0);
  const origin = `chrome-extension://${loaded.id}`;
  const workerTarget = await waitForTarget((t) => t.type === 'service_worker' && t.url === `${origin}/background.js`);
  const worker = await attach(workerTarget.targetId, 'worker');
  await until(worker, `typeof chrome === 'object' && !!chrome.i18n && !!chrome.contextMenus`);
  check('manifest: name from _locales', await evaluate(worker, `chrome.i18n.getMessage('appName')`), 'HTML PGP');
  check('manifest: toolbar title from _locales', await evaluate(worker, `chrome.action.getTitle({})`), 'Open HTML PGP');
  check('context menu made', await until(worker, `chrome.contextMenus.update('decrypt', {}).then(() => true, () => false)`), true);

  // Window A: the site, and later the side panel. Window B: the extension's own page.
  const siteTarget = (await chrome.targets()).find((t) => t.type === 'page');
  const site = await attach(siteTarget.targetId, 'site');
  await send('Page.enable', {}, site);
  await send('Page.navigate', { url: SITE }, site);
  await until(site, `document.readyState === 'complete' && !!document.getElementById('field')`);
  const tabId = await evaluate(worker, `chrome.tabs.query({}).then((tabs) => tabs.find((t) => t.url?.startsWith(${q(SITE)})).id)`);
  const windowA = await evaluate(worker, `chrome.tabs.get(${tabId}).then((t) => t.windowId)`);
  const { targetId: helperTarget } = await send('Target.createTarget', { url: `${origin}/test.html`, newWindow: true });
  const helper = await attach(helperTarget, 'helper');
  await until(helper, `document.readyState === 'complete'`);
  await evaluate(helper, `localStorage.setItem('html-pgp', JSON.stringify({ language: 'en', theme: 'light' })); true`);

  // The worker's calls to open the panel, which with no click behind them Chrome refuses.
  await evaluate(worker, `(() => { self.__panelOpened = []; chrome.sidePanel.open = (options) => { self.__panelOpened.push(options); return Promise.resolve(); }; return true; })()`);
  await evaluate(helper, `chrome.sidePanel.open({ windowId: ${windowA} }).then(() => true)`, true);
  const panelTarget = await waitForTarget((t) => t.type === 'page' && t.url === `${origin}/panel.html`);
  const panel = await attach(panelTarget.targetId, 'panel');
  await until(panel, `document.body.classList.contains('ready')`);
  await send('Page.enable', {}, panel);
  await send('DOM.enable', {}, panel);
  check('panel: an empty keyring of its own', await until(panel, `!document.getElementById('keys-empty').hidden`), true);
  check('panel: the narrow layout, tabs at the bottom', await evaluate(panel, `getComputedStyle(document.querySelector('.sidebar')).flexDirection`), 'row');
  check('panel: no inline script, its own file', await evaluate(panel, `[...document.scripts].map((s) => s.getAttribute('src'))`), ['panel.js']);

  // GnuPG's keys into the panel's keyring.
  const { root: doc } = await send('DOM.getDocument', { depth: 0 }, panel);
  const { nodeId } = await send('DOM.querySelector', { nodeId: doc.nodeId, selector: '#key-picker' }, panel);
  await send('DOM.setFileInputFiles', { nodeId, files: [join(FIXTURES, 'bob-public.asc'), join(FIXTURES, 'alice-secret.asc')] }, panel);
  check('panel: keys imported', await until(panel, `[...document.querySelectorAll('.overlay h2')].some((h) => h.textContent === '2 keys imported')`), true);
  await evaluate(panel, `[...document.querySelectorAll('.overlay button')].find((b) => b.textContent === 'Close').click(); true`);
  await shot(panel, 'x1-panel-keys');

  const menu = (id, selectionText, target = tabId) =>
    evaluate(worker, `chrome.tabs.get(${target}).then((tab) => { chrome.contextMenus.onClicked.dispatch({ menuItemId: ${q(id)}, selectionText: ${q(selectionText)}, frameId: 0, pageUrl: tab.url, editable: false }, tab); return true; })`);
  const notepad = () => evaluate(panel, `document.getElementById('np-text').value`);
  const result = () => evaluate(panel, `[...document.querySelectorAll('#np-result .result-text')].map((n) => n.textContent.replace(/[\\u2068\\u2069]/g, ''))`);

  // A signed text selected in the page: verified in the panel.
  await evaluate(site, `(() => { const range = document.createRange(); range.selectNodeContents(document.getElementById('signed')); getSelection().removeAllRanges(); getSelection().addRange(range); return true; })()`);
  await menu('decrypt', clearsigned.replace(/\s+/g, ' '));
  check('menu opens the panel of the tab\'s window', await evaluate(worker, `JSON.stringify(self.__panelOpened)`), JSON.stringify([{ windowId: windowA }]));
  check('panel: the selection in the notepad', await until(panel, `document.body.dataset.view === 'notepad' && document.querySelector('#np-result:not([hidden])') !== null`), true);
  check('panel: the signed text verified, its lines kept', await result(), ['Good signature from Bob Example <bob@example.org>']);
  check('panel: the text shown', (await notepad()).startsWith('Привет, Alice!'), true);
  await shot(panel, 'x2-panel-verified');

  // An encrypted message selected in a text field: decrypted after the passphrase.
  await evaluate(site, `(() => { getSelection().removeAllRanges(); const f = document.getElementById('field'); f.focus(); f.select(); return true; })()`);
  await menu('decrypt', encrypted.replace(/\s+/g, ' '));
  check('panel: passphrase asked', await until(panel, `[...document.querySelectorAll('.overlay h2')].some((h) => h.textContent === 'Enter passphrase')`), true);
  await evaluate(panel, `(() => { const i = [...document.querySelectorAll('.overlay')].at(-1).querySelector('input.dialog-input'); i.focus(); return true; })()`);
  await send('Input.insertText', { text: 'alice passphrase' }, panel);
  await evaluate(panel, `[...[...document.querySelectorAll('.overlay')].at(-1).querySelectorAll('button')].find((b) => b.textContent === 'Unlock').click(); true`);
  check('panel: the message from the field decrypted', await until(panel, `document.getElementById('np-text').value.startsWith('Привет, Alice!') && document.querySelectorAll('#np-result .result-text').length === 2`), true);
  check('panel: decrypted and verified', await result(), ['Decrypted with your key Alice Example <alice@example.org>', 'Good signature from Bob Example <bob@example.org>']);

  // A page the extension may not script: only the menu's selectionText, its lines lost — mended.
  // localhost is the same server under a name the copy under test may not reach.
  const tabsBefore = await evaluate(worker, `chrome.tabs.query({}).then((tabs) => tabs.map((t) => t.id))`);
  const { targetId: otherTarget } = await send('Target.createTarget', { url: SITE.replace('127.0.0.1', 'localhost') });
  await sleep(500);
  const otherTab = await evaluate(worker, `chrome.tabs.query({}).then((tabs) => tabs.find((t) => !${q(tabsBefore)}.includes(t.id)).id)`);
  // Into the panel's window: the text goes to the panel of the window the click was in.
  await evaluate(worker, `chrome.tabs.move(${otherTab}, { windowId: ${windowA}, index: -1 }).then(() => true)`);
  await sleep(300);
  check('fallback: the page may not be scripted', await evaluate(worker, `chrome.scripting.executeScript({ target: { tabId: ${otherTab} }, func: () => 1 }).then(() => 'scripted', () => 'refused')`), 'refused');
  await evaluate(panel, `document.getElementById('np-text').value = ''; true`);
  await menu('decrypt', encrypted.replace(/\s+/g, ' '), otherTab);
  check('panel: a one-line selection mended and decrypted', await until(panel, `document.getElementById('np-text').value.startsWith('Привет, Alice!')`), true);
  await send('Target.closeTarget', { targetId: otherTarget });

  // "Encrypt": the text handed over as it is, for the user to choose recipients.
  await evaluate(site, `(() => { document.activeElement.blur(); const range = document.createRange(); range.selectNodeContents(document.getElementById('plain')); getSelection().removeAllRanges(); getSelection().addRange(range); return true; })()`);
  await menu('encrypt', 'Meet me at noon');
  check('panel: text to encrypt', await until(panel, `document.getElementById('np-text').value === 'Meet me at noon'`), true);
  check('panel: nothing done to it yet', await evaluate(panel, `document.getElementById('np-result').hidden`), true);
  await shot(panel, 'x3-panel-encrypt');

  // The panel's language goes to the worker, for the context menu.
  check('panel: language told to the worker', await until(worker, `chrome.storage.local.get('language').then((v) => v.language === 'en')`), true);
  check('no errors', chrome.errors, []);
} finally {
  await chrome.close();
  server.close();
  await rm(work, { recursive: true, force: true });
}

done('extension');

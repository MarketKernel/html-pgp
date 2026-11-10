/**
 * The page: settings and language first, then the keyring from IndexedDB, then
 * the four views — keys, notepad, files, settings — and what ties them
 * together: the navigation, shortcuts, files dropped on the window, and other
 * windows of the app changing the keyring.
 */

import { setLanguage, t, translatePage } from '../core/i18n';
import { Keyring } from '../core/keyring';
import { cachedCount, forgetAll, onCacheChange } from './agent';
import { addFiles, bindFiles, filesListed } from './files';
import { importFiles, newKeyPair } from './keyactions';
import { bindKeyList, focusSearch, importMenu, renderList } from './keylist';
import { bindNotepad, decryptNotepad, loadNotepad, notepadHasText } from './notepad';
import { platform } from './platform';
import { bindScreens, hideDetails, isTouch } from './screens';
import { applyTheme, resolveLanguage, type View } from './settings';
import { bindSettings, redraw, renderSettings, updating } from './settingsview';
import { keyringChanged, saveState, state } from './state';
import { onStoreChanged, openStore } from './store';
import { confirmAsk, toast } from './ui';
import { classify } from '../core/pgp';
import { applyUpdate, justUpdated, startUpdates, updateState } from './update';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const VIEWS: View[] = ['keys', 'notepad', 'files', 'settings'];

export function setView(view: View): void {
  state.settings.view = view;
  saveState();
  for (const name of VIEWS) {
    $(`view-${name}`).hidden = name !== view;
    document.querySelector(`.nav-item[data-view="${name}"]`)?.setAttribute('aria-current', name === view ? 'page' : 'false');
  }
  document.body.dataset['view'] = view;
  if (view !== 'keys') hideDetails();
  // Drawn afresh each time: what it shows of updates changes while it is not looked at.
  if (view === 'settings') renderSettings();
}

function bindNav(): void {
  for (const button of document.querySelectorAll<HTMLElement>('.nav-item[data-view]')) {
    button.addEventListener('click', () => setView(button.dataset['view'] as View));
  }
  const forget = $('forget');
  const update = (): void => {
    const count = cachedCount();
    forget.hidden = count === 0;
    forget.title = t('nav', 'Lock the unlocked secret keys again');
  };
  forget.addEventListener('click', () => {
    forgetAll();
    toast(t('nav', 'Passphrases forgotten'));
  });
  onCacheChange(update);
  update();
}

const mod = (event: KeyboardEvent): boolean => (navigator.platform.startsWith('Mac') ? event.metaKey : event.ctrlKey);

function bindShortcuts(): void {
  document.addEventListener('keydown', (event) => {
    if (document.querySelector('.overlay, .context-menu')) return;
    if (!mod(event) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'f' && state.settings.view === 'keys') {
      event.preventDefault();
      focusSearch();
    } else if (key === 'n' && event.shiftKey) {
      event.preventDefault();
      setView('keys');
      void newKeyPair();
    } else if (key === 'i' && event.shiftKey) {
      event.preventDefault();
      setView('keys');
      importMenu($('import'));
    }
  });
  if (isTouch()) document.body.classList.add('touch');
}

/**
 * Files dropped anywhere: keys go into the keyring straight away; anything
 * else to the files view — or, if it is a single armored message, into the
 * notepad when that is open.
 */
function bindDrop(): void {
  let depth = 0;
  const hasFiles = (event: DragEvent): boolean => [...(event.dataTransfer?.types ?? [])].includes('Files');
  document.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    depth += 1;
    document.body.classList.add('dropping');
  });
  document.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) document.body.classList.remove('dropping');
  });
  document.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth = 0;
    document.body.classList.remove('dropping');
    const files = [...(event.dataTransfer?.files ?? [])];
    if (!files.length || document.querySelector('.overlay')) return;
    void (async () => {
      if (state.settings.view === 'notepad' && files.length === 1 && files[0]!.size < 1 << 20) {
        const text = await files[0]!.text();
        const kind = await classify(text);
        if (kind !== 'unknown' && kind !== 'keys') {
          loadNotepad(text);
          return;
        }
      }
      const kinds = await Promise.all(files.map(async (file) => classify(new Uint8Array(await file.arrayBuffer()))));
      if (state.settings.view === 'keys' && kinds.every((kind) => kind === 'keys' || kind === 'revocation')) {
        await importFiles(files);
        return;
      }
      setView('files');
      await addFiles(files);
    })();
  });
}

/** The installed app: a new version waits for the user, shown in the settings and beside the version. */
function bindUpdates(): void {
  const note = $('update-note');
  const show = (): void => {
    const now = updateState();
    const ready = now.kind === 'ready';
    note.hidden = !ready;
    if (ready) note.textContent = now.version ? t('settings', 'Version {version} is ready.', { version: now.version }) : t('settings', 'A new version is ready.');
    document.querySelector('.nav-item[data-view="settings"]')?.classList.toggle('nav-item--badge', ready);
    if (state.settings.view === 'settings') renderSettings();
  };
  updating.apply = () => {
    void (async () => {
      // Keys and settings are stored already; only the notepad's text and the files list would go.
      if ((notepadHasText() || filesListed()) && !(await confirmAsk(t('settings', 'Update now?'), t('settings', 'The page reloads: the text in the notepad and the list of files are cleared.'), t('settings', 'Update'), false))) return;
      applyUpdate();
    })();
  };
  note.addEventListener('click', () => updating.apply());
  startUpdates(show);
  if (justUpdated()) toast(t('settings', 'Updated to version {version}.', { version: __APP_VERSION__ }));
}

/**
 * Files opened with the installed app from the Finder or Explorer. Set up
 * last, once the views are there: the files go to the files view.
 */
function bindLaunchedFiles(): void {
  const queue = (window as unknown as { launchQueue?: { setConsumer(consumer: (params: { files: FileSystemFileHandle[] }) => void): void } }).launchQueue;
  queue?.setConsumer((params) => {
    if (!params.files.length) return;
    void Promise.all(params.files.map((handle) => handle.getFile())).then((files) => {
      setView('files');
      return addFiles(files);
    });
  });
}

async function start(): Promise<void> {
  setLanguage(resolveLanguage(state.settings.language));
  applyTheme(state.settings.theme);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(state.settings.theme));
  translatePage();
  $('version').textContent = __APP_VERSION__;

  const { store, persistent } = await openStore();
  state.persistent = persistent;
  const { keyring, problems } = await Keyring.open(store);
  state.keyring = keyring;

  bindScreens(() => document.body.classList.contains('details-open'));
  bindNav();
  bindKeyList();
  bindNotepad();
  bindFiles();
  bindSettings();
  bindShortcuts();
  bindDrop();
  redraw.all = () => {
    keyringChanged();
    renderList();
    renderSettings();
  };
  setView(state.settings.view);
  bindUpdates();
  bindLaunchedFiles();
  platform.start({
    openText(text, action) {
      setView('notepad');
      loadNotepad(text);
      if (action === 'decrypt') decryptNotepad();
    },
  });
  platform.languageChanged(resolveLanguage(state.settings.language));

  onStoreChanged(() => {
    void state.keyring.reload().then(keyringChanged);
  });
  if (!persistent) toast(t('errors', 'This browser does not let the page keep data: the keys are lost when the page closes.'), 'error');
  if (problems.length) toast(t('errors', 'Some stored keys could not be read'), 'error');
  document.body.classList.add('ready');
}

void start();

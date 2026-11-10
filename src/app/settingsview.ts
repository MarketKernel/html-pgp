/** The settings view: language and theme, how passphrases are kept, defaults, and the keyring as a whole. */

import { LANGUAGES, setLanguage, t, translatePage, type Language } from '../core/i18n';
import { label } from '../core/keys';
import { exportKeys } from '../core/pgp';
import { forgetAll } from './agent';
import { checkbox, confirmAsk, dialog, h, select, toast } from './ui';
import { deleteKeys } from './keyactions';
import { saveFile } from './save';
import { applyTheme, CACHE_CHOICES, resolveLanguage, type Theme } from './settings';
import { platform } from './platform';
import { onKeyringChange, saveState, state } from './state';
import { canUpdate, checkForUpdate, updateState } from './update';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** Set by main.ts: everything drawn from code is drawn again in the new language; an update is let in. */
export const redraw = { all: (): void => undefined };
export const updating = { apply: (): void => undefined };

/** What the installed app knows of a newer version, and the button that goes with it. */
function updateRow(): HTMLElement | null {
  if (!canUpdate()) return null;
  const now = updateState();
  let note = '';
  let action = t('settings', 'Check for updates');
  switch (now.kind) {
    case 'checking':
      note = t('settings', 'Checking…');
      break;
    case 'latest':
      note = t('settings', 'This is the latest version.');
      break;
    case 'offline':
      note = t('settings', 'No connection: could not check for updates.');
      break;
    case 'ready':
      note = now.version ? t('settings', 'Version {version} is ready.', { version: now.version }) : t('settings', 'A new version is ready.');
      action = t('settings', 'Update');
      break;
    default:
      break;
  }
  const go = button(action, () => (now.kind === 'ready' ? updating.apply() : void checkForUpdate()));
  go.disabled = now.kind === 'checking';
  if (now.kind === 'ready') go.classList.add('button--primary');
  return h('div', { class: 'settings-row', 'data-setting': 'update' }, h('div', { class: 'settings-text' }, h('div', { class: 'settings-title', text: t('settings', 'Updates') }), note ? h('div', { class: 'settings-hint', text: note }) : null), go);
}

function row(title: string, control: HTMLElement, hint?: string): HTMLElement {
  return h(
    'div',
    { class: 'settings-row' },
    h('div', { class: 'settings-text' }, h('div', { class: 'settings-title', text: title }), hint ? h('div', { class: 'settings-hint', text: hint }) : null),
    control,
  );
}

function cacheLabel(minutes: number): string {
  if (minutes === 0) return t('settings', 'Ask every time');
  if (minutes < 60) return t('settings', '{count} min', { count: minutes });
  return t('settings', '{count} h', { count: minutes / 60 });
}

function button(text: string, action: () => void, danger = false): HTMLButtonElement {
  const node = h('button', { type: 'button', class: `button button--small${danger ? ' button--danger-ghost' : ''}`, text });
  node.addEventListener('click', action);
  return node;
}

export function renderSettings(): void {
  const settings = state.settings;
  const language = select<string>(
    [{ value: 'auto', label: t('settings', 'As the system') }, ...Object.entries(LANGUAGES).map(([code, name]) => ({ value: code, label: name }))],
    settings.language,
  );
  language.addEventListener('change', () => {
    settings.language = language.value as Language | 'auto';
    saveState();
    setLanguage(resolveLanguage(settings.language));
    platform.languageChanged(resolveLanguage(settings.language));
    translatePage();
    redraw.all();
  });

  const theme = select<Theme>(
    [
      { value: 'system', label: t('settings', 'As the system') },
      { value: 'light', label: t('settings', 'Light') },
      { value: 'dark', label: t('settings', 'Dark') },
    ],
    settings.theme,
  );
  theme.addEventListener('change', () => {
    settings.theme = theme.value as Theme;
    saveState();
    applyTheme(settings.theme);
  });

  const cache = select<string>(CACHE_CHOICES.map((m) => ({ value: String(m), label: cacheLabel(m) })), String(settings.cacheMinutes));
  cache.addEventListener('change', () => {
    settings.cacheMinutes = Number(cache.value);
    saveState();
    // A shorter time applies to what is unlocked now too.
    forgetAll();
  });

  const own = state.keyring.list().filter((entry) => entry.info.secret);
  const defaultKey = select<string>(
    own.length ? own.map((entry) => ({ value: entry.record.fingerprint, label: label(entry.info) })) : [{ value: '', label: t('settings', 'No key pair yet') }],
    own.some((e) => e.record.fingerprint === settings.defaultKey) ? settings.defaultKey : (own[0]?.record.fingerprint ?? ''),
  );
  defaultKey.disabled = own.length < 2;
  defaultKey.addEventListener('change', () => {
    settings.defaultKey = defaultKey.value;
    saveState();
    redraw.all();
  });

  const self = checkbox(t('settings', 'Encrypt to my own key too'), settings.encryptToSelf);
  self.input.addEventListener('change', () => {
    settings.encryptToSelf = self.input.checked;
    saveState();
    redraw.all();
  });
  const armor = checkbox(t('settings', 'Write files as text (ASCII armor)'), settings.armorFiles);
  armor.input.addEventListener('change', () => {
    settings.armorFiles = armor.input.checked;
    saveState();
  });

  const all = state.keyring.list();
  const secret = all.filter((e) => e.info.secret);
  const keyring = h(
    'div',
    { class: 'settings-buttons' },
    button(t('settings', 'Export all public keys'), () => {
      if (!all.length) return;
      void saveFile(exportKeys(all.map((e) => e.key), { armor: true, secret: false }), `public-keys-${all.length}.asc`);
    }),
    button(t('settings', 'Back up all key pairs'), () => void backupAll()),
    button(t('settings', 'Delete all keys…'), () => void deleteKeys(all), true),
  );
  for (const node of keyring.querySelectorAll('button')) node.disabled = !all.length;
  if (!secret.length) (keyring.children[1] as HTMLButtonElement).disabled = true;

  $('settings-body').replaceChildren(
    h('h2', { class: 'settings-group', text: t('settings', 'Appearance') }),
    row(t('settings', 'Language'), language),
    row(t('settings', 'Theme'), theme),
    h('h2', { class: 'settings-group', text: t('settings', 'Security') }),
    row(t('settings', 'Remember passphrases for'), cache, t('settings', 'An unlocked key stays unlocked in this page for this long. "Forget passphrases" in the menu locks them all at once.')),
    h('h2', { class: 'settings-group', text: t('settings', 'Defaults') }),
    row(t('settings', 'My default key'), defaultKey, t('settings', 'Used to sign, and to encrypt to yourself.')),
    h('div', { class: 'settings-row settings-row--check' }, self.node),
    h('div', { class: 'settings-row settings-row--check' }, armor.node),
    h('h2', { class: 'settings-group', text: t('settings', 'Keyring') }),
    h(
      'p',
      { class: 'settings-hint' },
      state.persistent
        ? t('settings', 'The keys are kept in this browser, for this page only. Back them up: clearing the browser\'s data deletes them.')
        : t('settings', 'This browser does not let the page keep data: the keys are lost when the page closes.'),
    ),
    keyring,
    h('h2', { class: 'settings-group', text: t('settings', 'About') }),
    h(
      'div',
      { class: 'settings-about' },
      h('p', { text: t('settings', 'Nothing leaves this page: it has no network access at all, and everything — encryption, keys, files — stays on this device.') }),
      h('p', { class: 'mono', text: `HTML PGP ${__APP_VERSION__} · OpenPGP.js (LGPL-3.0)` }),
    ),
  );
  const update = updateRow();
  if (update) $('settings-body').append(update);
}

async function backupAll(): Promise<void> {
  const secret = state.keyring.list().filter((e) => e.info.secret);
  const ok = await dialog({
    title: t('settings', 'Back up all key pairs'),
    body: [t('settings', 'The file holds every secret key, each protected by its own passphrase. Keep it somewhere safe and private.')],
    confirm: t('export', 'Save file'),
  });
  if (!ok) return;
  const unprotected = secret.filter((e) => e.info.unprotected);
  if (unprotected.length && !(await confirmAsk(t('settings', 'Unprotected keys'), t('settings', 'Some keys have no passphrase and will be readable by anyone who gets the file: {keys}', { keys: unprotected.map((e) => label(e.info)).join(', ') }), t('export', 'Save file')))) return;
  await saveFile(exportKeys(secret.map((e) => e.key), { armor: true, secret: true }), `secret-keys-backup-${new Date().toISOString().slice(0, 10)}.asc`);
  toast(t('settings', 'Backup saved'));
}

export function bindSettings(): void {
  onKeyringChange(renderSettings);
  renderSettings();
}

/** Language, theme and working preferences, remembered in localStorage between sessions. */

import { detectLanguage, isLanguage, type Language } from '../core/i18n';
import { DEFAULT_ALGORITHM, isAlgorithm, type AlgorithmId } from '../core/pgp';

export type Theme = 'system' | 'light' | 'dark';
export type View = 'keys' | 'notepad' | 'files' | 'settings';
export type KeyFilter = 'all' | 'mine' | 'certified' | 'uncertified' | 'unusable';

export interface Settings {
  /** 'auto' follows the browser's languages. */
  language: Language | 'auto';
  theme: Theme;
  view: View;
  filter: KeyFilter;
  /** Minutes an unlocked secret key stays unlocked; 0 — the passphrase is asked every time. */
  cacheMinutes: number;
  /** Files are written as ASCII armor (.asc) rather than binary (.gpg, .sig). */
  armorFiles: boolean;
  /** Messages are also encrypted to the user's own key, so they can read what they sent. */
  encryptToSelf: boolean;
  /** The user's key to sign with and encrypt to; empty — the first one. */
  defaultKey: string;
  /** What a new key is made of, as last chosen. */
  algorithm: AlgorithmId;
  /** Years a new key is valid for; 0 — no expiry. */
  validYears: number;
}

const KEY = 'html-pgp';

export const CACHE_CHOICES = [0, 1, 5, 10, 30, 60, 240];
export const YEAR_CHOICES = [1, 2, 3, 5, 0];
const VIEWS: View[] = ['keys', 'notepad', 'files', 'settings'];
const FILTERS: KeyFilter[] = ['all', 'mine', 'certified', 'uncertified', 'unusable'];

const DEFAULTS: Settings = {
  language: 'auto',
  theme: 'system',
  view: 'keys',
  filter: 'all',
  cacheMinutes: 10,
  armorFiles: false,
  encryptToSelf: true,
  defaultKey: '',
  algorithm: DEFAULT_ALGORITHM,
  // GnuPG and Kleopatra give a new key three years.
  validYears: 3,
};

/** Every field checked: an unknown or broken value is the default again. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const stored = JSON.parse(raw) as Partial<Record<keyof Settings, unknown>>;
    return {
      language: isLanguage(stored.language) ? stored.language : 'auto',
      theme: stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : 'system',
      view: VIEWS.includes(stored.view as View) ? (stored.view as View) : DEFAULTS.view,
      filter: FILTERS.includes(stored.filter as KeyFilter) ? (stored.filter as KeyFilter) : DEFAULTS.filter,
      cacheMinutes: CACHE_CHOICES.includes(Number(stored.cacheMinutes)) ? Number(stored.cacheMinutes) : DEFAULTS.cacheMinutes,
      armorFiles: typeof stored.armorFiles === 'boolean' ? stored.armorFiles : DEFAULTS.armorFiles,
      encryptToSelf: typeof stored.encryptToSelf === 'boolean' ? stored.encryptToSelf : DEFAULTS.encryptToSelf,
      defaultKey: typeof stored.defaultKey === 'string' && /^[0-9A-F]{40,64}$/.test(stored.defaultKey) ? stored.defaultKey : '',
      algorithm: isAlgorithm(stored.algorithm) ? stored.algorithm : DEFAULTS.algorithm,
      validYears: YEAR_CHOICES.includes(Number(stored.validYears)) ? Number(stored.validYears) : DEFAULTS.validYears,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode or a full quota — the app works either way */
  }
}

/** The language the interface is shown in. */
export function resolveLanguage(choice: Settings['language']): Language {
  return choice === 'auto' ? detectLanguage() : choice;
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
}

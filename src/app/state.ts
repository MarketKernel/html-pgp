/**
 * What the page holds while it runs: the keyring, the settings, and the
 * listeners that redraw what depends on the keyring when it changes — here or
 * in another window.
 */

import type { Keyring } from '../core/keyring';
import { loadSettings, saveSettings, type Settings } from './settings';

export const state = {
  keyring: null as unknown as Keyring,
  settings: loadSettings() as Settings,
  /** False when IndexedDB is not available: the keys last as long as the page. */
  persistent: true,
};

const listeners = new Set<() => void>();

/** `listener` runs after every change of the keyring. */
export function onKeyringChange(listener: () => void): void {
  listeners.add(listener);
}

export function keyringChanged(): void {
  for (const listener of listeners) listener();
}

export function saveState(): void {
  saveSettings(state.settings);
}

/** The user's own keys that can sign, the default one first. */
export function ownSigningKeys() {
  const own = state.keyring.list().filter((entry) => entry.info.canSign);
  const preferred = state.settings.defaultKey;
  return own.sort((a, b) => Number(b.record.fingerprint === preferred) - Number(a.record.fingerprint === preferred));
}

/** The user's key to encrypt to as well: the default one, or the first of theirs that can. */
export function ownEncryptionKey(prefer?: string) {
  const own = state.keyring.list().filter((entry) => entry.info.secret && entry.info.canEncrypt);
  return own.find((entry) => entry.record.fingerprint === prefer) ?? own.find((entry) => entry.record.fingerprint === state.settings.defaultKey) ?? own[0] ?? null;
}

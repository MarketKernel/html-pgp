/**
 * Passphrases, as gpg-agent keeps them: a secret key unlocked once stays
 * unlocked, in this page's memory only, for the minutes the settings say,
 * then is dropped. The passphrase itself is not kept at all — only the
 * decrypted key, which openpgp.js needs to sign and decrypt. "Forget
 * passphrases" drops every one at once.
 */

import type * as openpgp from 'openpgp';
import { t } from '../core/i18n';
import type { Entry } from '../core/keyring';
import { formatFingerprint, label } from '../core/keys';
import { isUnlocked, PgpError, unlock, type OpenContext } from '../core/pgp';
import { keyIdLabel } from './format';
import { onKeyringChange, state } from './state';
import { dialog, field, h, secretInput } from './ui';

interface Cached {
  key: openpgp.PrivateKey;
  timer: number;
  /** The stored key the cached one was unlocked from: a change to it is followed below. */
  armored: string;
}

const cache = new Map<string, Cached>();
const listeners = new Set<() => void>();

const changed = (): void => {
  for (const listener of listeners) listener();
};

export const onCacheChange = (listener: () => void): void => void listeners.add(listener);

export const cachedCount = (): number => cache.size;

export function forget(fingerprint: string): void {
  const cached = cache.get(fingerprint);
  if (!cached) return;
  window.clearTimeout(cached.timer);
  cache.delete(fingerprint);
  changed();
}

export function forgetAll(): void {
  for (const cached of cache.values()) window.clearTimeout(cached.timer);
  cache.clear();
  changed();
}

function remember(fingerprint: string, key: openpgp.PrivateKey, armored: string): void {
  const minutes = state.settings.cacheMinutes;
  if (minutes <= 0) return;
  forget(fingerprint);
  cache.set(fingerprint, { key, armored, timer: window.setTimeout(() => forget(fingerprint), minutes * 60_000) });
  changed();
}

/** The secret parts really here, by fingerprint: what an unlocked copy must have to stand for the stored key. */
const secretsOf = (key: openpgp.Key): string =>
  key
    .getKeys()
    .filter((part) => 'isDummy' in part.keyPacket && !(part.keyPacket as openpgp.SecretKeyPacket).isDummy())
    .map((part) => part.getFingerprint())
    .sort()
    .join();

/**
 * A stored key changed — a new expiry, a user ID, a revocation, an import:
 * the unlocked copy takes the new signatures in, as the stored one did, so it
 * is not asked for again. A copy whose secret parts no longer match is dropped.
 */
async function follow(): Promise<void> {
  for (const [fingerprint, cached] of [...cache]) {
    const entry = state.keyring.get(fingerprint);
    if (!entry?.key.isPrivate()) {
      forget(fingerprint);
      continue;
    }
    if (entry.record.armored === cached.armored) continue;
    try {
      if (secretsOf(entry.key) !== secretsOf(cached.key)) throw new Error('other secret parts');
      cached.key = await cached.key.update(entry.key.toPublic(), new Date());
      cached.armored = entry.record.armored;
    } catch {
      forget(fingerprint);
    }
  }
}

let following: Promise<void> = Promise.resolve();
onKeyringChange(() => {
  following = following.then(follow);
});

/** Why the passphrase is asked for, shown in the prompt. */
export type Purpose = 'decrypt' | 'sign' | 'certify' | 'change' | 'export';

function purposeText(purpose: Purpose): string {
  switch (purpose) {
    case 'decrypt':
      return t('passphrase', 'to decrypt the message');
    case 'sign':
      return t('passphrase', 'to sign');
    case 'certify':
      return t('passphrase', 'to certify the key');
    case 'change':
      return t('passphrase', 'to change the key');
    case 'export':
      return t('passphrase', 'to export the key');
  }
}

/**
 * The entry's secret key, unlocked: from the cache, as it is when it has no
 * passphrase, or after asking for it. Null when the user closes the prompt.
 * `fresh` asks even when it is cached — before the passphrase itself changes.
 */
export async function unlockEntry(entry: Entry, purpose: Purpose, { fresh = false } = {}): Promise<openpgp.PrivateKey | null> {
  const key = entry.key;
  if (!key.isPrivate()) return null;
  if (isUnlocked(key)) return key;
  const fingerprint = entry.record.fingerprint;
  await following;
  if (!fresh) {
    const cached = cache.get(fingerprint);
    if (cached && cached.armored === entry.record.armored) return cached.key;
  }
  const { input, node } = secretInput();
  let unlocked: openpgp.PrivateKey | null = null;
  const signing = entry.info.keys[0];
  const ok = await dialog({
    title: t('passphrase', 'Enter passphrase'),
    body: [
      h('p', { class: 'dialog-text', text: t('passphrase', 'The passphrase of your secret key is needed {purpose}:', { purpose: purposeText(purpose) }) }),
      h(
        'div',
        { class: 'key-card' },
        h('strong', { text: label(entry.info) }),
        h('span', { class: 'mono', text: `${signing?.algorithm ?? ''} · ${keyIdLabel(entry.info.keyId)}` }),
        h('span', { class: 'mono key-card-fpr', text: formatFingerprint(entry.info.fingerprint) }),
      ),
      field(t('passphrase', 'Passphrase'), node),
      state.settings.cacheMinutes > 0
        ? h('p', { class: 'dialog-hint', text: t('passphrase', 'It will be remembered for {minutes} min in this page only.', { minutes: state.settings.cacheMinutes }) })
        : null,
    ],
    confirm: t('passphrase', 'Unlock'),
    focus: input,
    submit: async () => {
      try {
        unlocked = await unlock(key, input.value);
        return null;
      } catch (error) {
        // Cleared, not selected: a selection could reach the system's primary selection on Linux.
        input.value = '';
        input.dispatchEvent(new Event('input'));
        if (error instanceof PgpError && error.code === 'bad-passphrase') return t('errors', 'Wrong passphrase');
        return error instanceof Error ? error.message : String(error);
      }
    },
  });
  input.value = '';
  if (!ok || !unlocked) return null;
  remember(fingerprint, unlocked, entry.record.armored);
  return unlocked;
}

/** A new passphrase, typed twice. Null when the dialog is closed; an empty string only when `allowEmpty`. */
export async function choosePassphrase(title: string, message: string, { allowEmpty = false } = {}): Promise<string | null> {
  const first = secretInput();
  const second = secretInput();
  let chosen: string | null = null;
  const ok = await dialog({
    title,
    body: [message, field(t('passphrase', 'New passphrase'), first.node), field(t('passphrase', 'Repeat it'), second.node)],
    confirm: t('dialog', 'OK'),
    submit: () => {
      if (!first.input.value && !allowEmpty) return t('passphrase', 'Enter a passphrase');
      if (first.input.value !== second.input.value) return t('passphrase', 'The two passphrases differ');
      chosen = first.input.value;
      return null;
    },
  });
  first.input.value = '';
  second.input.value = '';
  return ok ? chosen : null;
}

/** The password of a message encrypted with one. */
async function askPassword(again: boolean): Promise<string | null> {
  const { input, node } = secretInput();
  let value: string | null = null;
  const ok = await dialog({
    title: t('passphrase', 'Password'),
    body: [
      again ? h('p', { class: 'dialog-error', text: t('errors', 'Wrong password') }) : null,
      t('passphrase', 'The message is encrypted with a password. Enter it to decrypt the message.'),
      field(t('passphrase', 'Password'), node),
    ],
    confirm: t('passphrase', 'Decrypt'),
    focus: input,
    submit: () => {
      value = input.value;
      return value ? null : t('passphrase', 'Enter the password');
    },
  });
  input.value = '';
  return ok ? value : null;
}

/** What decrypting and verifying needs from the keyring and the user. */
export function openContext(): OpenContext {
  return {
    verificationKeys: state.keyring.publicKeys(),
    secretKeys: state.keyring.secretKeys(),
    unlock: async (key) => {
      const entry = state.keyring.get(key.getFingerprint());
      return entry ? unlockEntry(entry, 'decrypt') : null;
    },
    password: askPassword,
  };
}

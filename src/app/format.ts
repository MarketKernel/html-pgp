/** How keys, dates and errors are put into words, in the interface's language. */

import { dateFormat, t } from '../core/i18n';
import type { Entry } from '../core/keyring';
import { label, type KeyInfo, type Status, type Usage } from '../core/keys';
import { PgpError } from '../core/pgp';

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

export function formatDate(ms: number | null): string {
  if (ms === null) return t('key', 'never');
  return dateFormat({ year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return dateFormat({ year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

export function statusLabel(status: Status): string {
  switch (status) {
    case 'valid':
      return t('status', 'Valid');
    case 'expired':
      return t('status', 'Expired');
    case 'revoked':
      return t('status', 'Revoked');
    case 'invalid':
      return t('status', 'Invalid');
  }
}

/** One word for the list: what the key's own state and the user's trust in it come to. */
export function validity(entry: Entry): { label: string; tone: Tone; hint: string } {
  const { status } = entry.info;
  if (status !== 'valid') return { label: statusLabel(status), tone: 'bad', hint: t('status', 'This key cannot be used') };
  if (entry.trust === 'ultimate') return { label: t('status', 'Your key'), tone: 'ok', hint: t('status', 'You have the secret key') };
  if (entry.trust === 'full') return { label: t('status', 'Certified'), tone: 'ok', hint: t('status', 'You certified that this key belongs to its owner') };
  return { label: t('status', 'Not certified'), tone: 'warn', hint: t('status', 'Nobody you trust has confirmed whose key this is') };
}

export function usageLabel(usage: Usage[]): string {
  const names: Record<Usage, string> = {
    certify: t('usage', 'certify'),
    sign: t('usage', 'sign'),
    encrypt: t('usage', 'encrypt'),
    authenticate: t('usage', 'authenticate'),
  };
  return usage.map((u) => names[u]).join(', ') || '—';
}

export function keyIdLabel(keyId: string): string {
  return `0x${keyId}`;
}

/** What went wrong, for a toast or a result line; null when the user cancelled and there is nothing to say. */
export function errorText(error: unknown, keyName: (keyId: string) => string | null = () => null): string | null {
  if (!(error instanceof PgpError)) return error instanceof Error ? error.message : String(error);
  switch (error.code) {
    case 'cancelled':
      return null;
    case 'no-secret-key': {
      const names = error.keyIds.map((id) => keyName(id) ?? keyIdLabel(id));
      return names.length
        ? t('errors', 'It is encrypted for keys whose secret part you do not have: {keys}', { keys: names.join(', ') })
        : t('errors', 'It is encrypted for a key whose secret part you do not have');
    }
    case 'bad-passphrase':
      return t('errors', 'Wrong passphrase');
    case 'need-data':
      return t('errors', 'This is a detached signature: the file it signs is needed to check it');
    case 'not-pgp':
      return t('errors', 'This is not OpenPGP data');
    case 'corrupt':
      return t('errors', 'The data is damaged or not supported: {detail}', { detail: error.message });
    case 'failed':
      return error.message;
  }
}

/**
 * A key's name and address put into a sentence: isolated (U+2068 … U+2069), so
 * in Arabic or Urdu the brackets of "<alice@example.org>" stay where they are.
 */
export function named(info: Pick<KeyInfo, 'name' | 'email' | 'keyId'>): string {
  return `\u2068${label(info)}\u2069`;
}

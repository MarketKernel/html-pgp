/**
 * What decrypting and verifying found, in words: who it was encrypted for,
 * whose signatures are on it and whether they hold — the notepad and the
 * files view show the same lines.
 */

import { t } from '../core/i18n';
import type { Opened, SignatureCheck } from '../core/pgp';
import type { Status } from '../core/keys';
import { formatDateTime, keyIdLabel, named, type Tone } from './format';
import { state } from './state';
import { h, icon, ICONS } from './ui';

export interface Line {
  tone: Tone;
  text: string;
  detail?: string;
}

const TONE_ORDER: Tone[] = ['neutral', 'ok', 'warn', 'bad'];
export const worst = (tones: Tone[]): Tone => tones.reduce<Tone>((a, b) => (TONE_ORDER.indexOf(b) > TONE_ORDER.indexOf(a) ? b : a), 'neutral');

/** What became of the signing key since: a sentence each, as words for a status do not bend the same in every language. */
function nowUnusable(status: Status): string {
  switch (status) {
    case 'expired':
      return t('result', 'The key has expired since.');
    case 'revoked':
      return t('result', 'The key has been revoked since.');
    default:
      return t('result', 'The key is no longer valid.');
  }
}

function signatureLine(check: SignatureCheck): Line {
  const entry = check.fingerprint ? state.keyring.get(check.fingerprint) : undefined;
  const when = check.created ? formatDateTime(check.created) : '';
  if (check.status === 'missing' || !entry) {
    return {
      tone: 'warn',
      text: t('result', 'Signed by an unknown key {key}', { key: keyIdLabel(check.keyId) }),
      detail: t('result', 'Import its public key to check the signature.'),
    };
  }
  const signer = named(entry.info);
  if (check.status === 'bad') {
    return {
      tone: 'bad',
      text: t('result', 'Bad signature from {signer}', { signer }),
      detail: t('result', 'The data was changed after it was signed, or the signature is damaged.'),
    };
  }
  const notes: string[] = [];
  if (when) notes.push(t('result', 'Signed {date}', { date: when }));
  let tone: Tone = 'ok';
  if (entry.info.status !== 'valid') {
    notes.push(nowUnusable(entry.info.status));
    tone = 'warn';
  }
  if (entry.trust === 'ultimate') notes.push(t('result', 'Your own key.'));
  else if (entry.trust === 'full') notes.push(t('result', 'You certified this key.'));
  else {
    notes.push(t('result', 'The key is not certified: compare its fingerprint with its owner to be sure it is theirs.'));
    tone = 'warn';
  }
  return { tone, text: t('result', 'Good signature from {signer}', { signer }), detail: notes.join(' · ') };
}

export function outcomeLines(opened: Opened): Line[] {
  const lines: Line[] = [];
  if (opened.decryptedWith === 'password') lines.push({ tone: 'ok', text: t('result', 'Decrypted with a password') });
  else if (opened.decryptedWith) {
    const entry = state.keyring.get(opened.decryptedWith);
    lines.push({ tone: 'ok', text: t('result', 'Decrypted with your key {key}', { key: entry ? named(entry.info) : opened.decryptedWith }) });
  }
  for (const check of opened.signatures) lines.push(signatureLine(check));
  if (!opened.signatures.length) {
    lines.push({
      tone: opened.kind === 'encrypted' ? 'neutral' : 'warn',
      text: t('result', 'Not signed'),
      detail: opened.kind === 'encrypted' ? t('result', 'Anyone with your public key could have written it.') : undefined,
    });
  }
  return lines;
}

const TONE_ICONS: Record<Tone, string> = { ok: ICONS.check, warn: ICONS.warning, bad: ICONS.cross, neutral: ICONS.info };

export function renderLines(lines: Line[]): HTMLElement {
  const box = h('div', { class: `result result--${worst(lines.map((line) => line.tone))}`, role: 'status' });
  for (const line of lines) {
    box.append(
      h(
        'div',
        { class: `result-line result-line--${line.tone}` },
        icon(TONE_ICONS[line.tone]),
        h('div', {}, h('div', { class: 'result-text', text: line.text }), line.detail ? h('div', { class: 'result-detail', text: line.detail }) : null),
      ),
    );
  }
  return box;
}

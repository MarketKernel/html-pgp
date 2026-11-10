/**
 * One key in full: its user IDs and who certified them, its fingerprint, its
 * subkeys, and every action that applies to it.
 */

import { t, tn } from '../core/i18n';
import type { Entry } from '../core/keyring';
import { formatFingerprint, type UserIdInfo } from '../core/keys';
import { exportKeys } from '../core/pgp';
import {
  addUserIdFlow,
  backupSecret,
  certifiers,
  certifyKey,
  changeExpiry,
  changePassphraseFlow,
  deleteKeys,
  exportPublic,
  revokeKeyFlow,
  revokeUserIdFlow,
  saveRevocation,
} from './keyactions';
import { formatDate, keyIdLabel, named, statusLabel, usageLabel, validity } from './format';
import { copyText } from './save';
import { back } from './screens';
import { state } from './state';
import { avatar, h, icon, ICONS, menuAt, toast, type MenuItem } from './ui';

function iconButton(paths: string, title: string, action: (button: HTMLButtonElement) => void): HTMLButtonElement {
  const button = h('button', { type: 'button', class: 'icon-button icon-button--small', title, 'aria-label': title }, icon(paths));
  button.addEventListener('click', () => action(button));
  return button;
}

function actionButton(paths: string, text: string, action: (button: HTMLButtonElement) => void, primary = false): HTMLButtonElement {
  const button = h('button', { type: 'button', class: `button button--small${primary ? ' button--primary' : ''}` }, icon(paths), h('span', { text }));
  button.addEventListener('click', () => action(button));
  return button;
}

/** Who vouched for a user ID: the user's own keys by name, any other by count. */
function certificationsOf(entry: Entry, user: UserIdInfo): HTMLElement | null {
  const mine = entry.certified.get(user.userId) ?? [];
  const names = mine.map((fp) => state.keyring.get(fp)).filter((e): e is Entry => !!e).map((e) => named(e.info));
  const ownIds = new Set(mine.map((fp) => state.keyring.get(fp)?.info.keyId));
  const others = user.certifications.filter((c) => !ownIds.has(c.keyId));
  const otherKnown = others.filter((c) => state.keyring.findByKeyId(c.keyId).length > 0);
  const parts: string[] = [];
  if (names.length) parts.push(t('details', 'Certified by you: {keys}', { keys: names.join(', ') }));
  if (otherKnown.length) {
    parts.push(
      t('details', 'Also signed by: {keys}', {
        keys: otherKnown.map((c) => named(state.keyring.findByKeyId(c.keyId)[0]!.info)).join(', '),
      }),
    );
  }
  const unknown = others.length - otherKnown.length;
  if (unknown > 0) parts.push(tn('details', 'Signed by {count} key not in your keyring', 'Signed by {count} keys not in your keyring', unknown));
  return parts.length ? h('div', { class: 'uid-certs', text: parts.join(' · ') }) : null;
}

function userIdRow(entry: Entry, user: UserIdInfo): HTMLElement {
  const own = entry.info.secret && entry.info.keys[0]?.secret === 'available';
  const tone = user.status === 'valid' ? 'ok' : 'bad';
  const node = h(
    'li',
    { class: `uid${user.status !== 'valid' ? ' uid--dim' : ''}` },
    h(
      'div',
      { class: 'uid-main' },
      h('div', { class: 'uid-text' }, h('span', { text: user.userId }), user.primary && entry.info.userIds.length > 1 ? h('span', { class: 'chip chip--neutral', text: t('details', 'primary') }) : null),
      user.status !== 'valid' ? h('span', { class: `chip chip--${tone}`, text: statusLabel(user.status) }) : null,
    ),
    certificationsOf(entry, user),
  );
  const items: MenuItem[] = [];
  if (own && user.status === 'valid' && entry.info.userIds.filter((u) => u.status === 'valid').length > 1) {
    items.push({ label: t('details', 'Revoke this user ID…'), danger: true, action: () => void revokeUserIdFlow(entry, user.userId) });
  }
  if (!entry.info.secret && user.status === 'valid' && entry.info.status === 'valid' && certifiers(entry).length) {
    items.push({ label: t('details', 'Certify this user ID…'), action: () => void certifyKey(entry, user.userId) });
  }
  if (items.length) node.querySelector('.uid-main')?.append(iconButton(ICONS.more, t('details', 'More'), (button) => menuAt(button, items)));
  return node;
}

/** The primary key and the subkeys, each on two lines: what it is and does, and its dates. */
function subkeyList(entry: Entry): HTMLElement {
  const list = h('ul', { class: 'subkeys' });
  entry.info.keys.forEach((part, index) => {
    const notes: string[] = [];
    if (index === 0) notes.push(t('details', 'primary'));
    if (part.secret === 'stub') notes.push(t('details', 'secret key elsewhere'));
    else if (part.secret === 'none' && entry.info.secret) notes.push(t('details', 'no secret key'));
    list.append(
      h(
        'li',
        { class: `subkey${part.status !== 'valid' ? ' subkey--dim' : ''}` },
        h(
          'div',
          { class: 'subkey-main' },
          h('span', { class: 'mono subkey-id', title: part.fingerprint, text: part.keyId }),
          h('span', { class: 'subkey-algorithm', text: part.algorithm }),
          h('span', { class: 'subkey-usage', text: usageLabel(part.usage) }),
          part.status !== 'valid' ? h('span', { class: 'chip chip--bad', text: statusLabel(part.status) }) : null,
        ),
        h(
          'div',
          { class: 'subkey-dates' },
          h('span', { text: t('details', 'created {date}', { date: formatDate(part.created) }) }),
          h('span', { text: part.expires === null ? t('details', 'does not expire') : t('details', 'expires {date}', { date: formatDate(part.expires) }) }),
          ...notes.map((note) => h('span', { class: 'subkey-note', text: note })),
        ),
      ),
    );
  });
  return list;
}

function publicKeyBlock(entry: Entry): HTMLElement {
  const pre = h('pre', { class: 'armor mono' });
  const toggle = h('button', { type: 'button', class: 'link-button', text: t('details', 'Show the public key as text') });
  const copy = h('button', { type: 'button', class: 'link-button', text: t('details', 'Copy') });
  copy.hidden = true;
  pre.hidden = true;
  toggle.addEventListener('click', () => {
    pre.hidden = !pre.hidden;
    copy.hidden = pre.hidden;
    if (!pre.hidden && !pre.textContent) pre.textContent = exportKeys([entry.key], { armor: true, secret: false }) as string;
    toggle.textContent = pre.hidden ? t('details', 'Show the public key as text') : t('details', 'Hide');
  });
  copy.addEventListener('click', () => void copyText(pre.textContent ?? '').then(() => toast(t('export', 'Public key copied'))));
  return h('section', { class: 'details-section' }, h('div', { class: 'armor-links' }, toggle, copy), pre);
}

export function renderDetails(entry: Entry, into: HTMLElement): void {
  const { info } = entry;
  const valid = validity(entry);
  const own = info.secret && info.keys[0]?.secret === 'available';

  const chips = h('div', { class: 'chips' }, h('span', { class: `chip chip--${valid.tone}`, title: valid.hint, text: valid.label }));
  if (info.secret && info.status === 'valid' && entry.trust === 'ultimate' && entry.certified.size) chips.append(h('span', { class: 'chip chip--neutral', text: t('status', 'Certified') }));
  if (info.unprotected) chips.append(h('span', { class: 'chip chip--warn', title: t('details', 'Anyone who can use this browser can use this key'), text: t('details', 'No passphrase') }));
  if (info.version === 6) chips.append(h('span', { class: 'chip chip--neutral', title: t('details', 'An RFC 9580 key: GnuPG cannot read it yet'), text: 'OpenPGP v6' }));

  const backButton = h('button', { type: 'button', class: 'icon-button details-back', title: t('details', 'Back'), 'aria-label': t('details', 'Back') }, icon(ICONS.back));
  backButton.addEventListener('click', back);

  const actions = h('div', { class: 'details-actions' });
  actions.append(actionButton(ICONS.export, t('details', 'Export'), () => void exportPublic([entry]), !info.secret));
  if (!info.secret && info.status === 'valid' && certifiers(entry).length) {
    actions.append(actionButton(ICONS.certify, t('details', 'Certify'), () => void certifyKey(entry), entry.trust === 'unknown'));
  }
  if (own) actions.append(actionButton(ICONS.save, t('details', 'Back up'), () => void backupSecret(entry)));

  const more: MenuItem[] = [];
  more.push({ label: t('keys', 'Copy fingerprint'), action: () => void copyText(info.fingerprint).then(() => toast(t('keys', 'Fingerprint copied'))) });
  if (own) {
    more.push(
      { label: t('details', 'Change expiry…'), separated: true, disabled: info.status === 'revoked', action: () => void changeExpiry(entry) },
      { label: t('details', 'Add user ID…'), disabled: info.status === 'revoked', action: () => void addUserIdFlow(entry) },
      { label: t('details', 'Change passphrase…'), action: () => void changePassphraseFlow(entry) },
      { label: t('details', 'Back up secret key…'), action: () => void backupSecret(entry) },
      { label: t('details', 'Revocation certificate…'), disabled: info.status === 'revoked', action: () => void saveRevocation(entry) },
      { label: t('details', 'Revoke key…'), danger: true, separated: true, disabled: info.status === 'revoked', action: () => void revokeKeyFlow(entry) },
    );
  }
  more.push({ label: t('details', 'Delete…'), danger: true, separated: !own, action: () => void deleteKeys([entry]) });
  actions.append(iconButton(ICONS.more, t('details', 'More actions'), (button) => menuAt(button, more)));

  const facts = h(
    'dl',
    { class: 'facts' },
    h('dt', { text: t('details', 'Created') }),
    h('dd', { text: formatDate(info.created) }),
    h('dt', { text: t('details', 'Expires') }),
    h('dd', { class: info.status === 'expired' ? 'fact--bad' : '', text: formatDate(info.expires) }),
    h('dt', { text: t('details', 'Algorithm') }),
    h('dd', { text: info.algorithm }),
    h('dt', { text: t('details', 'Key ID') }),
    h('dd', { class: 'mono', text: keyIdLabel(info.keyId) }),
  );

  const fingerprint = h(
    'section',
    { class: 'fingerprint' },
    h('span', { class: 'section-label', text: t('details', 'Fingerprint') }),
    h('div', { class: 'fingerprint-row' }, h('code', { class: 'fpr' }, ...formatFingerprint(info.fingerprint).split('  ').map((half) => h('span', { class: 'fpr-half', text: half }))), iconButton(ICONS.copy, t('keys', 'Copy fingerprint'), () => void copyText(info.fingerprint).then(() => toast(t('keys', 'Fingerprint copied'))))),
  );

  into.replaceChildren(
    h(
      'article',
      { class: 'details', 'data-fpr': info.fingerprint },
      h(
        'header',
        { class: 'details-head' },
        backButton,
        avatar(info.name, info.email, info.fingerprint, 'large'),
        h('div', { class: 'details-title' }, h('h2', { text: info.name || info.email || keyIdLabel(info.keyId) }), info.name && info.email ? h('div', { class: 'details-email', text: info.email }) : null, chips),
      ),
      actions,
      fingerprint,
      facts,
      h('section', { class: 'details-section' }, h('h3', { text: t('details', 'User IDs') }), h('ul', { class: 'uids' }, ...info.userIds.map((user) => userIdRow(entry, user)))),
      h('section', { class: 'details-section' }, h('h3', { text: t('details', 'Keys') }), subkeyList(entry)),
      publicKeyBlock(entry),
    ),
  );
}

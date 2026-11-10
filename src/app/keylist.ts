/**
 * The keys view: the keyring as a list one can search and filter, as
 * Kleopatra's certificate list, with the selected key's details beside it —
 * or, on a phone, on a screen of their own.
 */

import { t, tn } from '../core/i18n';
import type { Entry } from '../core/keyring';
import { label } from '../core/keys';
import { renderDetails } from './details';
import { formatDate, keyIdLabel, validity } from './format';
import {
  certifiers,
  certifyKey,
  deleteKeys,
  exportPublic,
  importFiles,
  importFromClipboard,
  importPasted,
  newKeyPair,
  selection as selectionHook,
} from './keyactions';
import { copyText } from './save';
import { hideDetails, isNarrow, showDetails } from './screens';
import type { KeyFilter } from './settings';
import { onKeyringChange, saveState, state } from './state';
import { avatar, h, icon, ICONS, menu, menuAt, toast, type MenuItem } from './ui';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

let selected = new Set<string>();
let focused: string | null = null;
/** The row a Shift-click extends the selection from. */
let anchor: string | null = null;
let query = '';
let shown: Entry[] = [];

const compact = (text: string): string => text.toLowerCase().replace(/\s+/g, '').replace(/^0x/, '');

function matches(entry: Entry, words: string[]): boolean {
  const info = entry.info;
  const haystack = [info.name, info.email, ...info.userIds.map((u) => u.userId)].join(' ').toLowerCase();
  const ids = [info.fingerprint, ...info.keys.map((k) => k.keyId)].join(' ').toLowerCase();
  return words.every((word) => haystack.includes(word) || ids.includes(compact(word)));
}

function passes(entry: Entry, filter: KeyFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'mine':
      return entry.info.secret;
    case 'certified':
      return entry.info.status === 'valid' && entry.trust === 'full';
    case 'uncertified':
      return entry.info.status === 'valid' && entry.trust === 'unknown';
    case 'unusable':
      return entry.info.status !== 'valid';
  }
}

const sortName = (entry: Entry): string => (entry.info.name || entry.info.email || entry.info.keyId).toLocaleLowerCase();

function visibleEntries(): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return state.keyring
    .list()
    .filter((entry) => passes(entry, state.settings.filter) && matches(entry, words))
    .sort((a, b) => sortName(a).localeCompare(sortName(b)));
}

export function selectedEntries(): Entry[] {
  return [...selected].map((fp) => state.keyring.get(fp)).filter((entry): entry is Entry => !!entry);
}

function row(entry: Entry): HTMLElement {
  const { info } = entry;
  const valid = validity(entry);
  const node = h(
    'div',
    {
      class: `key-row${selected.has(info.fingerprint) ? ' key-row--selected' : ''}${focused === info.fingerprint ? ' key-row--focused' : ''}${info.status !== 'valid' ? ' key-row--dim' : ''}`,
      role: 'row',
      id: `key-${info.fingerprint}`,
      'data-fpr': info.fingerprint,
      'aria-selected': String(selected.has(info.fingerprint)),
    },
    h(
      'span',
      { class: 'key-cell key-cell--name', role: 'gridcell' },
      avatar(info.name, info.email, info.fingerprint),
      h(
        'span',
        { class: 'key-names' },
        h('span', { class: 'key-name', text: info.name || info.email || keyIdLabel(info.keyId) }),
        h('span', { class: 'key-email', text: info.name ? info.email : '' }),
      ),
      info.secret ? h('span', { class: 'key-secret', title: t('keys', 'Your key pair: the secret key is here') }, icon(ICONS.key)) : null,
    ),
    h('span', { class: 'key-cell key-cell--email', role: 'gridcell', text: info.email }),
    h('span', { class: 'key-cell key-cell--status', role: 'gridcell' }, h('span', { class: `chip chip--${valid.tone}`, title: valid.hint, text: valid.label })),
    h('span', { class: 'key-cell key-cell--date', role: 'gridcell', text: formatDate(info.expires) }),
    h('span', { class: 'key-cell key-cell--id mono', role: 'gridcell', text: info.keyId.slice(-8) }),
  );
  return node;
}

export function renderList(): void {
  shown = visibleEntries();
  const list = $('key-rows');
  list.replaceChildren(...shown.map(row));
  const total = state.keyring.size;
  $('keys-empty').hidden = total > 0;
  document.body.classList.toggle('keyring-empty', total === 0);
  $('keys-table').hidden = total === 0;
  $('keys-none').hidden = total === 0 || shown.length > 0;
  $('nav-count').textContent = total ? String(total) : '';
  ($('export') as HTMLButtonElement).disabled = selected.size === 0;
  list.setAttribute('aria-activedescendant', focused ? `key-${focused}` : '');
  $('keys-count').textContent = shown.length === total ? tn('keys', '{count} key', '{count} keys', total) : t('keys', '{shown} of {total}', { shown: shown.length, total });
  renderSide();
}

function renderSide(): void {
  const details = $('details');
  const placeholder = $('details-placeholder');
  const entries = selectedEntries();
  const one = entries.length === 1 ? entries[0] : undefined;
  document.body.classList.toggle('details-open', entries.length > 0);
  if (one) {
    placeholder.hidden = true;
    details.hidden = false;
    renderDetails(one, details);
    return;
  }
  if (entries.length > 1) {
    placeholder.hidden = true;
    details.hidden = false;
    const exportButton = h('button', { type: 'button', class: 'button button--small' }, icon(ICONS.export), h('span', { text: t('keys', 'Export') }));
    exportButton.addEventListener('click', () => void exportPublic(entries));
    const deleteButton = h('button', { type: 'button', class: 'button button--small button--danger-ghost' }, icon(ICONS.trash), h('span', { text: t('keys', 'Delete') }));
    deleteButton.addEventListener('click', () => void deleteKeys(entries));
    details.replaceChildren(
      h(
        'div',
        { class: 'details-many' },
        h('h2', { text: tn('keys', '{count} key selected', '{count} keys selected', entries.length) }),
        h('ul', { class: 'import-list' }, ...entries.map((e) => h('li', {}, h('span', { text: label(e.info) }), h('span', { class: 'mono', text: keyIdLabel(e.info.keyId) })))),
        h('div', { class: 'details-actions' }, exportButton, deleteButton),
      ),
    );
    return;
  }
  details.hidden = true;
  details.replaceChildren();
  placeholder.hidden = false;
  hideDetails();
}

/** Selects the key and shows it — after an import, a new key, a click. */
export function showKey(fingerprint: string): void {
  if (!state.keyring.get(fingerprint)) return;
  if (!passes(state.keyring.get(fingerprint)!, state.settings.filter)) {
    state.settings.filter = 'all';
    ($('filter') as HTMLSelectElement).value = 'all';
    saveState();
  }
  selected = new Set([fingerprint]);
  focused = anchor = fingerprint;
  renderList();
  document.getElementById(`key-${fingerprint}`)?.scrollIntoView({ block: 'nearest' });
  showDetails();
}

function pick(fingerprint: string, event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }): void {
  const toggle = event.metaKey || event.ctrlKey;
  const from = shown.findIndex((e) => e.info.fingerprint === anchor);
  // An anchor hidden by the search since is no anchor: a plain click then.
  if (event.shiftKey && from >= 0 && !isNarrow()) {
    const to = shown.findIndex((e) => e.info.fingerprint === fingerprint);
    const [a, b] = from < to ? [from, to] : [to, from];
    selected = new Set(shown.slice(a, b + 1).map((e) => e.info.fingerprint));
    focused = fingerprint;
    renderList();
    return;
  }
  if (toggle && !isNarrow()) {
    if (selected.has(fingerprint)) selected.delete(fingerprint);
    else selected.add(fingerprint);
    focused = anchor = fingerprint;
    renderList();
    return;
  }
  showKey(fingerprint);
}

function rowMenu(entry: Entry, x: number, y: number): void {
  if (!selected.has(entry.info.fingerprint)) showKey(entry.info.fingerprint);
  const entries = selectedEntries();
  const many = entries.length > 1;
  const items: MenuItem[] = [
    { label: many ? t('keys', 'Export {count} public keys…', { count: entries.length }) : t('keys', 'Export public key…'), action: () => void exportPublic(entries) },
    {
      label: t('keys', 'Copy fingerprint'),
      disabled: many,
      action: () => void copyText(entry.info.fingerprint).then(() => toast(t('keys', 'Fingerprint copied'))),
    },
    { label: t('keys', 'Certify…'), disabled: many || entry.info.secret || entry.info.status !== 'valid' || !certifiers(entry).length, action: () => void certifyKey(entry) },
    { label: many ? t('keys', 'Delete {count} keys…', { count: entries.length }) : t('keys', 'Delete…'), danger: true, separated: true, action: () => void deleteKeys(entries) },
  ];
  menu(x, y, items);
}

function move(step: number): void {
  if (!shown.length) return;
  const at = shown.findIndex((e) => e.info.fingerprint === focused);
  const start = at < 0 ? (step >= 0 ? -1 : shown.length) : at;
  const next = shown[Math.max(0, Math.min(shown.length - 1, start + step))];
  if (!next) return;
  selected = new Set([next.info.fingerprint]);
  focused = anchor = next.info.fingerprint;
  renderList();
  document.getElementById(`key-${next.info.fingerprint}`)?.scrollIntoView({ block: 'nearest' });
}

export function importMenu(anchorNode: HTMLElement): void {
  menuAt(anchorNode, [
    { label: t('keys', 'From a file…'), action: () => ($('key-picker') as HTMLInputElement).click() },
    { label: t('keys', 'From the clipboard'), action: () => void importFromClipboard() },
    { label: t('keys', 'Paste as text…'), action: () => void importPasted() },
  ]);
}

export function focusSearch(): void {
  const search = $('search') as HTMLInputElement;
  search.focus();
  search.select();
}

export function bindKeyList(): void {
  selectionHook.show = showKey;
  const list = $('key-rows');
  const search = $('search') as HTMLInputElement;
  const filter = $('filter') as HTMLSelectElement;
  filter.value = state.settings.filter;

  list.addEventListener('click', (event) => {
    const node = (event.target as Element).closest<HTMLElement>('.key-row');
    if (node?.dataset['fpr']) pick(node.dataset['fpr'], event);
    list.focus({ preventScroll: true });
  });
  list.addEventListener('contextmenu', (event) => {
    const node = (event.target as Element).closest<HTMLElement>('.key-row');
    const entry = node?.dataset['fpr'] ? state.keyring.get(node.dataset['fpr']) : undefined;
    if (!entry) return;
    event.preventDefault();
    rowMenu(entry, event.clientX, event.clientY);
  });
  list.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      move(event.key === 'Home' ? -shown.length : shown.length);
    } else if ((event.key === 'Delete' || (event.key === 'Backspace' && (event.metaKey || event.ctrlKey))) && selected.size) {
      event.preventDefault();
      void deleteKeys(selectedEntries());
    } else if (event.key === 'a' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      selected = new Set(shown.map((e) => e.info.fingerprint));
      renderList();
    }
  });
  search.addEventListener('input', () => {
    query = search.value;
    renderList();
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      list.focus();
      move(0);
    } else if (event.key === 'Escape' && search.value) {
      event.stopPropagation();
      search.value = '';
      query = '';
      renderList();
    }
  });
  filter.addEventListener('change', () => {
    state.settings.filter = filter.value as KeyFilter;
    saveState();
    renderList();
  });

  for (const id of ['new-key', 'empty-new']) $(id).addEventListener('click', () => void newKeyPair());
  for (const id of ['import', 'empty-import']) $(id).addEventListener('click', (event) => importMenu(event.currentTarget as HTMLElement));
  $('export').addEventListener('click', () => void exportPublic(selectedEntries()));
  const picker = $('key-picker') as HTMLInputElement;
  picker.addEventListener('change', () => {
    const files = [...(picker.files ?? [])];
    picker.value = '';
    if (files.length) void importFiles(files);
  });

  onKeyringChange(() => {
    // Keys that are gone are no longer selected.
    selected = new Set([...selected].filter((fp) => state.keyring.get(fp)));
    if (focused && !state.keyring.get(focused)) focused = null;
    renderList();
  });
  renderList();
}

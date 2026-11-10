/**
 * Choosing whom to encrypt for: the chosen keys as chips, and a field that
 * finds keys in the keyring by name, address or key ID as one types. A key
 * nobody certified is marked, as Kleopatra marks it: encrypting to it works,
 * but whose key it is has not been checked.
 */

import { t } from '../core/i18n';
import type { Entry } from '../core/keyring';
import { label } from '../core/keys';
import { keyIdLabel, validity } from './format';
import { state } from './state';
import { h, icon, ICONS } from './ui';

export class RecipientPicker {
  readonly node: HTMLElement;
  private chosen: string[] = [];
  private readonly chips: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly list: HTMLElement;
  private suggestions: Entry[] = [];
  private active = 0;

  constructor(private readonly onChange: () => void = () => undefined) {
    this.chips = h('span', { class: 'recipient-chips' });
    this.input = h('input', {
      class: 'recipient-input',
      type: 'text',
      autocomplete: 'off',
      spellcheck: 'false',
      placeholder: t('recipients', 'Name, email or key ID'),
      'aria-label': t('recipients', 'Add a recipient'),
      role: 'combobox',
      'aria-expanded': 'false',
      'aria-autocomplete': 'list',
    });
    this.list = h('div', { class: 'recipient-list', role: 'listbox' });
    this.list.hidden = true;
    const box = h('div', { class: 'recipients' }, this.chips, this.input);
    box.addEventListener('mousedown', (event) => {
      if (event.target === box) {
        event.preventDefault();
        this.input.focus();
      }
    });
    this.node = h('div', { class: 'recipient-picker' }, box, this.list);

    this.input.addEventListener('input', () => this.suggest());
    this.input.addEventListener('focus', () => this.suggest());
    this.input.addEventListener('blur', () => window.setTimeout(() => this.close(), 120));
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (this.list.hidden) this.suggest();
        const count = this.suggestions.length;
        if (count) this.active = (this.active + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
        this.paint();
      } else if (event.key === 'Enter') {
        const pick = this.suggestions[this.active];
        if (!this.list.hidden && pick) {
          event.preventDefault();
          this.add(pick.record.fingerprint);
        }
      } else if (event.key === 'Backspace' && !this.input.value && this.chosen.length) {
        this.remove(this.chosen[this.chosen.length - 1]!);
      } else if (event.key === 'Escape' && !this.list.hidden) {
        event.stopPropagation();
        this.close();
      }
    });
    this.list.addEventListener('mousedown', (event) => {
      const option = (event.target as Element).closest<HTMLElement>('[data-fpr]');
      if (!option?.dataset['fpr']) return;
      event.preventDefault();
      this.add(option.dataset['fpr']);
    });
  }

  entries(): Entry[] {
    return this.chosen.map((fp) => state.keyring.get(fp)).filter((e): e is Entry => !!e);
  }

  set(fingerprints: string[]): void {
    this.chosen = fingerprints.filter((fp) => state.keyring.get(fp)?.info.canEncrypt);
    this.render();
  }

  /** Drops keys that left the keyring or can no longer encrypt. */
  refresh(): void {
    this.set(this.chosen);
  }

  /** What is typed but not picked: a recipient the user may think they added. */
  pending(): string {
    return this.input.value.trim();
  }

  private add(fingerprint: string): void {
    if (!this.chosen.includes(fingerprint)) this.chosen.push(fingerprint);
    this.input.value = '';
    this.render();
    this.suggest();
    this.onChange();
  }

  private remove(fingerprint: string): void {
    this.chosen = this.chosen.filter((fp) => fp !== fingerprint);
    this.render();
    this.onChange();
  }

  private render(): void {
    this.chips.replaceChildren(
      ...this.entries().map((entry) => {
        const valid = validity(entry);
        const remove = h('button', { type: 'button', class: 'chip-remove', title: t('recipients', 'Remove'), 'aria-label': t('recipients', 'Remove') }, icon(ICONS.close));
        remove.addEventListener('click', () => this.remove(entry.record.fingerprint));
        return h(
          'span',
          { class: `recipient recipient--${valid.tone}`, title: `${label(entry.info)} · ${keyIdLabel(entry.info.keyId)} · ${valid.label}` },
          valid.tone === 'warn' ? icon(ICONS.warning) : null,
          h('span', { class: 'recipient-name', text: entry.info.name || entry.info.email || keyIdLabel(entry.info.keyId) }),
          remove,
        );
      }),
    );
  }

  private suggest(): void {
    const words = this.input.value.toLowerCase().split(/\s+/).filter(Boolean);
    this.suggestions = state.keyring
      .list()
      .filter((entry) => entry.info.canEncrypt && !this.chosen.includes(entry.record.fingerprint))
      .filter((entry) => {
        const text = `${entry.info.userIds.map((u) => u.userId).join(' ')} ${entry.info.fingerprint} ${entry.info.keys.map((k) => k.keyId).join(' ')}`.toLowerCase();
        return words.every((word) => text.includes(word.replace(/^0x/, '')));
      })
      .slice(0, 8);
    this.active = 0;
    this.paint();
  }

  private paint(): void {
    const open = document.activeElement === this.input && this.suggestions.length > 0;
    this.list.hidden = !open;
    this.input.setAttribute('aria-expanded', String(open));
    this.list.replaceChildren(
      ...this.suggestions.map((entry, index) => {
        const valid = validity(entry);
        return h(
          'div',
          { class: `recipient-option${index === this.active ? ' recipient-option--active' : ''}`, role: 'option', 'data-fpr': entry.record.fingerprint },
          h('span', { class: 'recipient-option-name', text: label(entry.info) }),
          h('span', { class: `chip chip--${valid.tone}`, text: valid.label }),
          h('span', { class: 'mono recipient-option-id', text: entry.info.keyId.slice(-8) }),
        );
      }),
    );
  }

  private close(): void {
    this.list.hidden = true;
    this.input.setAttribute('aria-expanded', 'false');
  }
}

/** The user's keys that can sign, for a "Sign as" list; '' — do not sign. */
export function signerChoices(): { value: string; label: string }[] {
  const own = state.keyring.list().filter((entry) => entry.info.canSign);
  const preferred = state.settings.defaultKey;
  own.sort((a, b) => Number(b.record.fingerprint === preferred) - Number(a.record.fingerprint === preferred));
  return [...own.map((entry) => ({ value: entry.record.fingerprint, label: label(entry.info) })), { value: '', label: t('recipients', 'Do not sign') }];
}

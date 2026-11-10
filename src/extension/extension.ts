/**
 * The side panel's side of the extension, in src/app/platform.ts's place
 * (build.mjs swaps the module): text the context menu hands over comes in
 * through chrome.storage.session, for this window only, and the language the
 * user picks goes to the worker for the context menu.
 */

import type { Platform, PlatformHost, TextAction } from '../app/platform';

export type { PlatformHost, TextAction };

interface Sent {
  text: string;
  action: TextAction;
}

const isSent = (value: unknown): value is Sent =>
  !!value && typeof (value as Sent).text === 'string' && ((value as Sent).action === 'decrypt' || (value as Sent).action === 'encrypt');

export const platform: Platform = {
  start(host) {
    void chrome.windows.getCurrent().then(async ({ id }) => {
      const prefix = `sent:${id}:`;
      const take = async (keys: string[], all: Record<string, unknown>): Promise<void> => {
        const mine = keys.filter((key) => key.startsWith(prefix)).sort();
        if (!mine.length) return;
        await chrome.storage.session.remove(mine);
        // The newest is what the user just asked for; an older one was left by a panel closed too soon.
        const sent = all[mine[mine.length - 1]!];
        if (isSent(sent)) host.openText(sent.text, sent.action);
      };
      // Listening first: text handed over while the stored ones are read is not missed.
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'session') return;
        const added = Object.entries(changes).filter(([, change]) => change.newValue !== undefined);
        void take(
          added.map(([key]) => key),
          Object.fromEntries(added.map(([key, change]) => [key, change.newValue])),
        );
      });
      const all = await chrome.storage.session.get(null);
      await take(Object.keys(all), all);
    });
  },
  languageChanged(language) {
    void chrome.storage.local.set({ language });
  },
};

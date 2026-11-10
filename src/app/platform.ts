/**
 * What the page can do beyond itself. The single HTML file and the PWA do
 * nothing more, so every hook here does nothing. The Chrome extension's build
 * puts src/extension/extension.ts in this module's place (build.mjs): there
 * the page is the side panel, and text selected on a web page comes into its
 * notepad from the context menu.
 */

/** What to do with text handed over from outside. */
export type TextAction = 'decrypt' | 'encrypt';

export interface PlatformHost {
  /** Text selected on a page: into the notepad, decrypted and verified at once, or ready to encrypt. */
  openText(text: string, action: TextAction): void;
}

export interface Platform {
  start(host: PlatformHost): void;
  /** The interface's language changed: what Chrome shows of the extension follows it. */
  languageChanged(language: string): void;
}

export const platform: Platform = {
  start: () => undefined,
  languageChanged: () => undefined,
};

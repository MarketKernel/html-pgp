/**
 * The extension's service worker: the toolbar button opens the side panel,
 * and two items in a selection's context menu hand the selected text to the
 * panel's notepad — to decrypt and verify it, or to encrypt it.
 *
 * The text goes through chrome.storage.session, under a key of its own per
 * window: a panel this very click opens reads it when it starts, one already
 * open hears of it through storage.onChanged. Content scripts cannot see the
 * session area, so web pages never do.
 */

import { detectLanguage, isLanguage, setLanguage, t } from '../core/i18n';
import { reflowArmor } from '../core/armor';
import { grabSelection } from './grab';

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

/** The context menu in the panel's language: it writes its choice to storage.local. */
async function menus(): Promise<void> {
  const { language } = await chrome.storage.local.get('language');
  setLanguage(isLanguage(language) ? language : detectLanguage([chrome.i18n.getUILanguage()]));
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: 'decrypt', title: t('menu', 'Decrypt / verify with HTML PGP'), contexts: ['selection'] });
  chrome.contextMenus.create({ id: 'encrypt', title: t('menu', 'Encrypt with HTML PGP'), contexts: ['selection'] });
}

chrome.runtime.onInstalled.addListener(() => void menus());
chrome.runtime.onStartup.addListener(() => void menus());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['language']) void menus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'decrypt' && info.menuItemId !== 'encrypt') return;
  const windowId = tab?.windowId;
  if (windowId === undefined) return;
  // Only here, before any await, may the panel open: Chrome counts it as the click's doing.
  chrome.sidePanel.open({ windowId }).catch(() => undefined);
  void hand(info, tab, windowId);
});

async function hand(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined, windowId: number): Promise<void> {
  let text = '';
  if (tab?.id !== undefined) {
    try {
      // The click granted the tab (activeTab): the selection with its line breaks.
      const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [info.frameId ?? 0] }, func: grabSelection });
      if (typeof result?.result === 'string') text = result.result;
    } catch {
      /* a page the extension may not script — Chrome's own, the Web Store, a PDF */
    }
  }
  if (!text.trim()) text = reflowArmor(info.selectionText ?? '');
  if (!text.trim()) return;
  const key = `sent:${windowId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  await chrome.storage.session.set({ [key]: { text, action: info.menuItemId } });
}

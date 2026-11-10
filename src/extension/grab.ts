/**
 * Runs in the web page, through chrome.scripting.executeScript({ func }): it
 * goes there as its source text, so it uses nothing from outside its own body.
 *
 * The selection with its line breaks — the context menu's selectionText has
 * them turned into spaces, which breaks ASCII armor. Text selected in a field
 * is not part of the page's selection, so a focused field is asked first.
 */
export function grabSelection(): string {
  const field = document.activeElement;
  if (field instanceof HTMLTextAreaElement || (field instanceof HTMLInputElement && field.type === 'text')) {
    const { selectionStart, selectionEnd, value } = field;
    if (selectionStart !== null && selectionEnd !== null && selectionEnd > selectionStart) return value.slice(selectionStart, selectionEnd);
  }
  return String(window.getSelection() ?? '');
}

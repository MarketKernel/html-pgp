/**
 * Renders the PNG icons from the SVGs in assets/, with the same headless Chrome
 * the tests use — no ImageMagick. Run by hand after changing an icon; the PNGs
 * are committed.
 *
 *   assets/pwa/        192, 512, maskable 512, Apple's 180
 *   assets/extension/  16, 32, 48, 128 — the largest drawn at 112 with a margin,
 *                      as Chrome's guidelines ask
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startChrome } from './chrome.mjs';
import { root } from './load.mjs';

const plain = await readFile(join(root, 'assets/icon.svg'), 'utf8');
const maskable = await readFile(join(root, 'assets/icon-maskable.svg'), 'utf8');
const ICONS = [
  ['pwa/icon-192.png', plain, 192, 192],
  ['pwa/icon-512.png', plain, 512, 512],
  ['pwa/icon-maskable-512.png', maskable, 512, 512],
  ['pwa/apple-touch-icon.png', maskable, 180, 180],
  ['extension/icon-16.png', plain, 16, 16],
  ['extension/icon-32.png', plain, 32, 32],
  ['extension/icon-48.png', plain, 48, 48],
  ['extension/icon-128.png', plain, 128, 112],
];

const chrome = await startChrome();
try {
  const { targetId } = await chrome.send('Target.createTarget', { url: 'about:blank' });
  const session = await chrome.attach(targetId);
  await chrome.send('Page.enable', {}, session);
  await chrome.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } }, session);
  for (const [name, svg, size, drawn] of ICONS) {
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false }, session);
    const uri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    const html = `<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:transparent"><img src="${uri}" width="${drawn}" height="${drawn}"></body></html>`;
    await chrome.send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` }, session);
    await chrome.until(session, `document.images[0]?.complete`);
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: size, height: size, scale: 1 } }, session);
    await mkdir(join(root, 'assets', name, '..'), { recursive: true });
    await writeFile(join(root, 'assets', name), Buffer.from(data, 'base64'));
    console.log(`assets/${name}`);
  }
} finally {
  await chrome.close();
}

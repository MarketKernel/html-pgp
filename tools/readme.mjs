/**
 * The translated READMEs in docs/readme/: rewrites the language bar of each —
 * its own language in bold, English pointing back to ../../README.md — and
 * checks that each says as much as README.md: the same number of sections
 * and code blocks, every relative link resolving, every #anchor matching a
 * heading of the same file as GitHub makes anchors.
 *
 *   node tools/readme.mjs          # rewrite the bars, then check
 *   node tools/readme.mjs --check  # check only; exits 1 on a problem
 */
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { root } from './load.mjs';

const BAR = [
  ['en', '🇬🇧 English'],
  ['zh', '🇨🇳 中文'],
  ['hi', '🇮🇳 हिन्दी'],
  ['es', '🇪🇸 Español'],
  ['fr', '🇫🇷 Français'],
  ['ar', '🇸🇦 العربية'],
  ['bn', '🇧🇩 বাংলা'],
  ['pt', '🇧🇷 Português'],
  ['ru', '🇷🇺 Русский'],
  ['ur', '🇵🇰 اردو'],
  ['id', '🇮🇩 Bahasa Indonesia'],
  ['de', '🇩🇪 Deutsch'],
  ['ja', '🇯🇵 日本語'],
  ['mr', '🇮🇳 मराठी'],
  ['te', '🇮🇳 తెలుగు'],
  ['tr', '🇹🇷 Türkçe'],
  ['uk', '🇺🇦 Українська'],
];

const checkOnly = process.argv.includes('--check');
const dir = join(root, 'docs', 'readme');

function bar(own) {
  const items = BAR.map(([code, name]) => {
    if (code === own) return `<b>${name}</b>`;
    const href = code === 'en' ? '../../README.md' : `README.${code}.md`;
    return `<a href="${href}">${name}</a>`;
  });
  return `<!-- languages -->\n<h3 align="center">\n${items.join(' ·\n')}\n</h3>\n<!-- /languages -->`;
}

/** The anchor GitHub gives a heading: lower case, punctuation gone, spaces to hyphens. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

function anchorsOf(text) {
  const seen = new Map();
  const anchors = new Set();
  for (const [, heading] of text.replace(/```[\s\S]*?```/g, '').matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = slug(heading);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count ? `${base}-${count}` : base);
  }
  return anchors;
}

const sections = (text) => (text.match(/^## /gm) ?? []).length;
const fences = (text) => (text.match(/^```/gm) ?? []).length;

const english = await readFile(join(root, 'README.md'), 'utf8');
const problems = [];
const files = existsSync(dir) ? (await readdir(dir)).filter((name) => /^README\.\w+\.md$/.test(name)).sort() : [];
for (const name of files) {
  const code = name.split('.')[1];
  const path = join(dir, name);
  let text = await readFile(path, 'utf8');
  if (!checkOnly) {
    text = text.replace(/<!-- languages -->[\s\S]*?<!-- \/languages -->/, () => bar(code));
    await writeFile(path, text);
  }
  if (!text.includes(bar(code))) problems.push(`${name}: the language bar is not the expected one`);
  if (sections(text) !== sections(english)) problems.push(`${name}: ${sections(text)} sections, README.md has ${sections(english)}`);
  if (fences(text) !== fences(english)) problems.push(`${name}: ${fences(text) / 2} code blocks, README.md has ${fences(english) / 2}`);
  const anchors = anchorsOf(text);
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/<!-- languages -->[\s\S]*?<!-- \/languages -->/, '');
  for (const [, target] of prose.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/i.test(target)) continue;
    if (target.startsWith('#')) {
      if (!anchors.has(decodeURIComponent(target.slice(1)))) problems.push(`${name}: no heading for the link ${target}`);
      continue;
    }
    const file = target.split('#')[0];
    if (!existsSync(resolve(dirname(path), file))) problems.push(`${name}: the link ${target} leads nowhere`);
  }
}
for (const problem of problems) console.log(problem);
console.log(`${files.length} translations, ${problems.length} problems`);
if (problems.length) process.exit(1);

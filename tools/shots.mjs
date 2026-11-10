/**
 * Screenshots of every main screen: builds, then runs the browser tests with
 * `--shots`, into one folder (shots/ unless one is named).
 *
 *   npm run shots                  # -> shots/
 *   npm run shots -- shots/before  # -> shots/before/
 *
 * Its own script because `npm run test:browser -- --shots DIR` would hand the
 * flag to the last test only.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { root } from './load.mjs';

const dir = resolve(process.argv[2] ?? 'shots');
mkdirSync(dir, { recursive: true });

const runs = [['build.mjs'], ['tests/app.mjs', '--shots', dir]];
if (existsSync(join(root, 'tests/extension.mjs'))) runs.push(['tests/extension.mjs', '--shots', dir]);
for (const args of runs) {
  const { status } = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (status !== 0) process.exit(status ?? 1);
}
console.log(`screenshots in ${dir}`);

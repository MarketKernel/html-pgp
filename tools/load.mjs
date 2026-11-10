/**
 * Compiles a few src/ modules for Node, so the tests exercise the very code the
 * page runs — openpgp.js included: its browser build, the one the page bundles,
 * not the Node one, which reaches for Node's own crypto and native modules.
 */
import { build } from 'esbuild';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));

export async function load(...modules) {
  const result = await build({
    stdin: {
      // 'openpgp' is the library itself, from the same bundle: a second copy would not know the first one's objects.
      contents: modules.map((name) => (name === 'openpgp' ? `export * as openpgp from 'openpgp';` : `export * from './src/${name}';`)).join('\n'),
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    alias: { openpgp: join(root, 'node_modules/openpgp/dist/openpgp.mjs') },
    write: false,
    logLevel: 'silent',
  });
  const dir = await mkdtemp(join(tmpdir(), 'html-pgp-test-'));
  const file = join(dir, 'bundle.cjs');
  await writeFile(file, result.outputFiles[0].text);
  try {
    return createRequire(import.meta.url)(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function checker() {
  let passed = 0;
  let failed = 0;
  const check = (name, actual, expected) => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a === b) passed += 1;
    else {
      failed += 1;
      console.error(`FAIL  ${name}\n  expected: ${b}\n  actual:   ${a}`);
    }
  };
  const done = (label) => {
    console.log(`${label}: ${passed} passed, ${failed} failed`);
    if (failed) process.exit(1);
  };
  return { check, done };
}

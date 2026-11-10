/**
 * The other direction of tests/pgp.mjs: what this app writes, read by GnuPG —
 * the engine under Kleopatra. Keys of every v4 algorithm are imported into a
 * throwaway GNUPGHOME and used there: GnuPG decrypts our messages, checks our
 * signatures, sees our new expiry dates, user IDs, certifications and
 * revocations, and encrypts back to our keys for us to decrypt.
 *
 * Skipped, with a line saying so, where gpg is not installed: CI has it, a
 * computer may not.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checker, load } from '../tools/load.mjs';

if (spawnSync('gpg', ['--version']).status !== 0) {
  console.log('gnupg: gpg not found, skipped');
  process.exit(0);
}

const { check, done } = checker();
const P = await load('core/pgp', 'core/keys', 'openpgp');
const home = await mkdtemp(join(tmpdir(), 'html-pgp-gnupg-'));
const gpg = (args, input) => {
  const result = spawnSync('gpg', ['--homedir', home, '--batch', '--yes', '--pinentry-mode', 'loopback', ...args], { input, maxBuffer: 1 << 24 });
  return { status: result.status, out: result.stdout, err: result.stderr.toString() };
};
const colons = (args) => gpg(['--with-colons', '--fixed-list-mode', ...args]).out.toString().split('\n').map((line) => line.split(':'));
const ctx = (keys, passphrase) => ({
  verificationKeys: keys.map((k) => k.toPublic()),
  secretKeys: keys.filter((k) => k.isPrivate()),
  unlock: (key) => P.unlock(key, passphrase),
  password: async () => null,
});

try {
  const MESSAGE = 'Сообщение для GnuPG\nsecond line\n';
  for (const algorithm of P.ALGORITHMS.filter((a) => !a.v6)) {
    const { key } = await P.generate({ name: `Key ${algorithm.id}`, email: `${algorithm.id}@example.org`, algorithm: algorithm.id, expires: null, passphrase: 'pw' });
    const open = await P.unlock(key, 'pw');
    const fingerprint = key.getFingerprint().toUpperCase();
    // GnuPG takes the secret key with its passphrase, as an export from here would give it.
    const imported = gpg(['--passphrase', 'pw', '--import'], P.exportKeys([key], { armor: true, secret: true }));
    check(`${algorithm.id}: gpg imports the secret key`, imported.status, 0);
    const listed = colons(['--list-secret-keys', fingerprint]);
    check(`${algorithm.id}: gpg lists it`, listed.filter((f) => f[0] === 'fpr').map((f) => f[9])[0], fingerprint);
    check(`${algorithm.id}: gpg sees the usage`, listed.filter((f) => f[0] === 'sec' || f[0] === 'ssb').map((f) => f[11]), ['scESC', 'e']);

    const encrypted = await P.encrypt({ data: MESSAGE, recipients: [key.toPublic()], signers: [open], armor: true });
    const decrypted = gpg(['--passphrase', 'pw', '--status-fd', '2', '--decrypt'], encrypted);
    check(`${algorithm.id}: gpg decrypts`, decrypted.out.toString().replace(/\r\n/g, '\n'), MESSAGE);
    check(`${algorithm.id}: gpg checks the signature`, /\[GNUPG:\] GOODSIG/.test(decrypted.err) && /\[GNUPG:\] VALIDSIG/.test(decrypted.err), true);

    const back = gpg(['--trust-model', 'always', '--armor', '-r', fingerprint, '--encrypt'], 'from gpg\n');
    const opened = await P.open(back.out.toString(), ctx([key], 'pw'));
    check(`${algorithm.id}: we decrypt what gpg encrypted`, opened.text, 'from gpg\n');
  }

  // One key goes through every change; GnuPG reads each one.
  const { key: original } = await P.generate({ name: 'Changing', email: 'change@example.org', algorithm: 'curve25519', expires: null, passphrase: 'pw' });
  const open = await P.unlock(original, 'pw');
  const fingerprint = original.getFingerprint().toUpperCase();
  const reimport = (key) => {
    gpg(['--delete-secret-and-public-key', fingerprint]);
    return gpg(['--import'], P.exportKeys([key], { armor: true, secret: false }));
  };
  const until = new Date(Date.UTC(2031, 5, 1, 12));
  let key = await P.setExpiration(original, open, until);
  reimport(key);
  let listed = colons(['--list-keys', fingerprint]);
  check('gpg sees the new expiry', listed.filter((f) => f[0] === 'pub' || f[0] === 'sub').map((f) => f[6]), [String(until.getTime() / 1000), String(until.getTime() / 1000)]);
  key = await P.setExpiration(key, open, null);
  reimport(key);
  listed = colons(['--list-keys', fingerprint]);
  check('gpg sees the expiry removed', listed.filter((f) => f[0] === 'pub' || f[0] === 'sub').map((f) => f[6]), ['', '']);

  key = await P.addUserId(key, open, { name: 'Second Name', email: 'second@example.org' });
  reimport(key);
  listed = colons(['--list-keys', fingerprint]);
  check('gpg sees the new user id, the first one still primary', listed.filter((f) => f[0] === 'uid').map((f) => f[9]), ['Changing <change@example.org>', 'Second Name <second@example.org>']);
  key = await P.revokeUserId(key, open, 'Second Name <second@example.org>', { flag: 32, text: '' });
  reimport(key);
  listed = colons(['--list-keys', fingerprint]);
  check('gpg sees the user id revoked', listed.filter((f) => f[0] === 'uid').map((f) => f[1]), ['-', 'r']);

  const { key: other } = await P.generate({ name: 'Other', email: 'other@example.org', algorithm: 'rsa2048', expires: null, passphrase: 'pw' });
  const certified = await P.certify(other.toPublic(), open, ['Other <other@example.org>']);
  gpg(['--import'], P.exportKeys([certified], { armor: true, secret: false }));
  const sigs = colons(['--check-sigs', other.getFingerprint()]);
  check('gpg checks our certification', sigs.filter((f) => f[0] === 'sig' && f[4] === open.getKeyID().toHex().toUpperCase()).map((f) => f[1]), ['!']);

  // GnuPG's key with a primary that only certifies, its signing done by a subkey: its
  // certifications are still recognised.
  gpg(['--passphrase', 'pw', '--quick-gen-key', 'Carl Certifier <carl@example.org>', 'ed25519', 'cert', 'never']);
  const carlFpr = colons(['--list-keys', 'carl@example.org']).find((f) => f[0] === 'fpr')[9];
  gpg(['--passphrase', 'pw', '--quick-add-key', carlFpr, 'ed25519', 'sign', 'never']);
  const carl = await P.openpgp.readPrivateKey({ armoredKey: gpg(['--passphrase', 'pw', '--armor', '--export-secret-keys', carlFpr]).out.toString() });
  check('a certify-only primary', (await P.describe(carl)).keys[0].usage, ['certify']);
  const byCarl = await P.certify(other.toPublic(), await P.unlock(carl, 'pw'), ['Other <other@example.org>']);
  check('its certification recognised', [...(await P.certifiedBy(byCarl, [carl.toPublic()])).values()], [[carlFpr]]);

  const certificate = await P.revocationCertificate(open, { flag: 3, text: 'retired' });
  check('gpg imports our revocation certificate', gpg(['--import'], certificate).status, 0);
  listed = colons(['--list-keys', fingerprint]);
  check('gpg sees the key revoked', listed.find((f) => f[0] === 'pub')?.[1], 'r');

  // A detached signature over a file, checked by gpg against the file.
  const data = new Uint8Array([1, 2, 3, 4, 5]);
  const { key: signer } = await P.generate({ name: 'Signer', email: 's@example.org', algorithm: 'nistP384', expires: null, passphrase: 'pw' });
  gpg(['--import'], P.exportKeys([signer], { armor: true, secret: false }));
  const signature = await P.sign({ data, signers: [await P.unlock(signer, 'pw')], mode: 'detached', armor: false });
  const dir = await mkdtemp(join(tmpdir(), 'html-pgp-sig-'));
  await writeFile(join(dir, 'data.bin'), data);
  await writeFile(join(dir, 'data.bin.sig'), signature);
  const verified = gpg(['--status-fd', '2', '--verify', join(dir, 'data.bin.sig'), join(dir, 'data.bin')]);
  check('gpg verifies our detached signature', /\[GNUPG:\] GOODSIG/.test(verified.err), true);
  await rm(dir, { recursive: true, force: true });
} finally {
  try {
    execFileSync('gpgconf', ['--homedir', home, '--kill', 'all'], { stdio: 'ignore' });
  } catch {
    /* no agent was started */
  }
  await rm(home, { recursive: true, force: true });
}

done('gnupg');

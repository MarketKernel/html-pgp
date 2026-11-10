/**
 * src/core/pgp.ts and src/core/keys.ts: a key of every algorithm the app
 * offers, made, described and used; what GnuPG wrote (tests/fixtures/gnupg/,
 * made once by tools/gnupg-fixtures.sh) read back — those files are fixed
 * vectors and are never regenerated for a test to pass; and every change to a
 * key, checked by reading the key again.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checker, load, root } from '../tools/load.mjs';

const { check, done } = checker();
const P = await load('core/pgp', 'core/keys', 'openpgp');
const { openpgp } = P;
const fixture = (name) => readFile(join(root, 'tests/fixtures/gnupg', name));
const text = async (name) => (await fixture(name)).toString('utf8');
const MESSAGE = 'Привет, Alice! The meeting is at 10.\n';

/** An OpenContext over the given keys; passphrases and passwords come from these lists, in turn. */
function context(keys, { passphrases = {}, passwords = [] } = {}) {
  const asked = { unlock: [], password: [] };
  return {
    asked,
    verificationKeys: keys.map((key) => key.toPublic()),
    secretKeys: keys.filter((key) => key.isPrivate()),
    async unlock(key) {
      asked.unlock.push(key.getFingerprint().toUpperCase());
      const passphrase = passphrases[key.getFingerprint().toUpperCase()];
      return passphrase === undefined ? null : P.unlock(key, passphrase);
    },
    async password(again) {
      asked.password.push(again);
      return passwords.length ? passwords.shift() : null;
    },
  };
}

async function rejects(promise) {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    return error.code ?? error.message;
  }
}

// ---------------------------------------------------------------- names and formats
check('fingerprint v4 in two halves', P.formatFingerprint('52f222d930eabb01bcfceb5300f7bccada511930'), '52F2 22D9 30EA BB01 BCFC  EB53 00F7 BCCA DA51 1930');
check('fingerprint v6 in groups', P.formatFingerprint('a'.repeat(64)).split(' ').length, 16);
check('user id split', P.splitUserId('Alice Example (work) <alice@example.org>'), { name: 'Alice Example', email: 'alice@example.org', comment: 'work' });
check('user id: address only', P.splitUserId('alice@example.org'), { name: '', email: 'alice@example.org', comment: '' });
check('user id: name only', P.splitUserId('Alice'), { name: 'Alice', email: '', comment: '' });
check('label', P.label({ name: 'Alice', email: 'a@x.org', keyId: 'K' }), 'Alice <a@x.org>');
check('algorithms offered', P.ALGORITHMS.map((a) => a.id), ['curve25519', 'nistP256', 'nistP384', 'nistP521', 'brainpoolP256r1', 'brainpoolP384r1', 'brainpoolP512r1', 'rsa2048', 'rsa3072', 'rsa4096', 'v6-curve25519', 'v6-curve448']);

// ---------------------------------------------------------------- every algorithm, made and used
const EXPECTED = {
  curve25519: ['ed25519', 'cv25519', 4],
  rsa2048: ['rsa2048', 'rsa2048', 4],
  rsa3072: ['rsa3072', 'rsa3072', 4],
  rsa4096: ['rsa4096', 'rsa4096', 4],
  nistP256: ['nistp256', 'nistp256', 4],
  nistP384: ['nistp384', 'nistp384', 4],
  nistP521: ['nistp521', 'nistp521', 4],
  brainpoolP256r1: ['brainpoolP256r1', 'brainpoolP256r1', 4],
  brainpoolP384r1: ['brainpoolP384r1', 'brainpoolP384r1', 4],
  brainpoolP512r1: ['brainpoolP512r1', 'brainpoolP512r1', 4],
  'v6-curve25519': ['ed25519', 'x25519', 6],
  'v6-curve448': ['ed448', 'x448', 6],
};
const made = {};
for (const algorithm of P.ALGORITHMS) {
  const { key, revocation } = await P.generate({ name: 'Test User', email: 'test@example.org', algorithm: algorithm.id, expires: null, passphrase: 'pass phrase' });
  made[algorithm.id] = key;
  const info = await P.describe(key);
  const [primary, sub, version] = EXPECTED[algorithm.id];
  check(`${algorithm.id}: described`, [info.algorithm, info.keys[1]?.algorithm, info.version, info.status, info.secret, info.unprotected], [primary, sub, version, 'valid', true, false]);
  check(`${algorithm.id}: usage`, [info.keys[0].usage, info.keys[1].usage], [['certify', 'sign'], ['encrypt']]);
  check(`${algorithm.id}: can`, [info.canEncrypt, info.canSign, info.canCertify, info.expires], [true, true, true, null]);
  check(`${algorithm.id}: user id`, [info.name, info.email, info.userIds.length, info.userIds[0].primary], ['Test User', 'test@example.org', 1, true]);
  check(`${algorithm.id}: revocation certificate`, revocation.includes('BEGIN PGP PUBLIC KEY BLOCK'), true);

  const unlocked = await P.unlock(key, 'pass phrase');
  const armored = await P.encrypt({ data: MESSAGE, recipients: [key.toPublic()], signers: [unlocked], armor: true });
  const ctx = context([key], { passphrases: { [info.fingerprint]: 'pass phrase' } });
  const opened = await P.open(armored, ctx);
  check(`${algorithm.id}: round trip`, [opened.kind, opened.text, opened.decryptedWith, opened.signatures.map((s) => [s.status, s.fingerprint])], ['encrypted', MESSAGE, info.fingerprint, [['good', info.fingerprint]]]);
}

// ---------------------------------------------------------------- GnuPG's keys
const aliceSecret = await openpgp.readPrivateKey({ armoredKey: await text('alice-secret.asc') });
const bobSecret = await openpgp.readPrivateKey({ armoredKey: await text('bob-secret.asc') });
const ALICE = '52F222D930EABB01BCFCEB5300F7BCCADA511930';
const BOB = '4AB507A0DC3A1DB6D59DE24F9FAD5A48032649A2';
const alice = await P.describe(aliceSecret);
const bob = await P.describe(bobSecret);
check('gnupg alice', [alice.fingerprint, alice.algorithm, alice.keys[1].algorithm, alice.name, alice.email, alice.status], [ALICE, 'ed25519', 'cv25519', 'Alice Example', 'alice@example.org', 'valid']);
check('gnupg alice usage', alice.keys.map((k) => k.usage), [['certify', 'sign'], ['encrypt']]);
check('gnupg alice: protected secret', alice.keys.map((k) => [k.secret, k.protected]), [['available', true], ['available', true]]);
check('gnupg alice: certified by bob', alice.userIds[0].certifications.map((c) => c.fingerprint), [BOB]);
check('gnupg bob', [bob.fingerprint, bob.algorithm, bob.keys[1].algorithm, bob.canEncrypt, bob.canSign], [BOB, 'rsa3072', 'rsa3072', true, true]);
check('wrong passphrase', await rejects(P.unlock(aliceSecret, 'nope')), 'bad-passphrase');

const both = [aliceSecret, bobSecret];
const passphrases = { [ALICE]: 'alice passphrase', [BOB]: 'bob passphrase' };

// What the files are.
const kinds = {};
for (const name of ['alice-public.asc', 'alice-secret.asc', 'bob-public.gpg', 'to-alice-signed-by-bob.asc', 'to-bob.gpg', 'clearsigned-by-bob.asc', 'message.txt.sig', 'symmetric.asc', 'bob-revocation.rev', 'message.txt']) {
  kinds[name] = await P.classify(new Uint8Array(await fixture(name)));
}
check('classify', kinds, {
  'alice-public.asc': 'keys',
  'alice-secret.asc': 'keys',
  'bob-public.gpg': 'keys',
  'to-alice-signed-by-bob.asc': 'encrypted',
  'to-bob.gpg': 'encrypted',
  'clearsigned-by-bob.asc': 'cleartext',
  'message.txt.sig': 'signature',
  'symmetric.asc': 'encrypted',
  'bob-revocation.rev': 'revocation',
  'message.txt': 'unknown',
});

// Messages GnuPG wrote: fixed vectors.
let ctx = context(both, { passphrases });
let opened = await P.open(await text('to-alice-signed-by-bob.asc'), ctx);
check('gnupg: encrypted to alice, signed by bob', [opened.text, opened.decryptedWith, opened.signatures.map((s) => [s.status, s.fingerprint])], [MESSAGE, ALICE, [['good', BOB]]]);
check('gnupg: only alice asked', ctx.asked.unlock, [ALICE]);
opened = await P.open(new Uint8Array(await fixture('to-bob.gpg')), context(both, { passphrases }));
check('gnupg: binary file to bob', [opened.text, opened.filename, opened.signatures], [MESSAGE, 'message.txt', []]);
opened = await P.open(await text('clearsigned-by-bob.asc'), context(both));
check('gnupg: clear signed', [opened.kind, opened.text, opened.signatures.map((s) => s.status)], ['cleartext', MESSAGE.trimEnd(), ['good']]);
opened = await P.open(new Uint8Array(await fixture('message.txt.sig')), context(both), new Uint8Array(await fixture('message.txt')));
check('gnupg: detached signature', [opened.kind, opened.signatures.map((s) => [s.status, s.fingerprint])], ['signature', [['good', ALICE]]]);
const tampered = new TextEncoder().encode(MESSAGE.replace('10', '11'));
opened = await P.open(new Uint8Array(await fixture('message.txt.sig')), context(both), tampered);
check('gnupg: detached signature, changed file', opened.signatures.map((s) => s.status), ['bad']);
check('gnupg: detached signature without the file', await rejects(P.open(new Uint8Array(await fixture('message.txt.sig')), context(both))), 'need-data');
opened = await P.open(await text('to-alice-signed-by-bob.asc'), context([aliceSecret], { passphrases }));
check('gnupg: signer not in the keyring', opened.signatures.map((s) => [s.status, s.keyId.length, s.fingerprint]), [['missing', 16, null]]);
check('gnupg: no secret key', await rejects(P.open(await text('to-alice-signed-by-bob.asc'), context([bobSecret], { passphrases }))), 'no-secret-key');
try {
  await P.open(await text('to-alice-signed-by-bob.asc'), context([bobSecret]));
} catch (error) {
  check('no secret key names the recipient', error.keyIds, [alice.keys[1].keyId]);
}
const toBoth = await P.encrypt({ data: 'for two', recipients: [aliceSecret.toPublic(), bobSecret.toPublic()], armor: true });
ctx = context(both, { passphrases: { [BOB]: 'bob passphrase' } });
opened = await P.open(toBoth, ctx);
check('one prompt closed, the next key tried', [opened.text, opened.decryptedWith, ctx.asked.unlock], ['for two', BOB, [ALICE, BOB]]);
check('gnupg: passphrase prompt closed', await rejects(P.open(await text('to-alice-signed-by-bob.asc'), context(both))), 'cancelled');
ctx = context([], { passwords: ['wrong', 'correct horse battery staple'] });
opened = await P.open(await text('symmetric.asc'), ctx);
check('gnupg: symmetric, wrong password first', [opened.text, opened.decryptedWith, ctx.asked.password], [MESSAGE, 'password', [false, true]]);
check('not pgp', await rejects(P.open('hello', context([]))), 'not-pgp');
check('damaged armor', await rejects(P.open('-----BEGIN PGP MESSAGE-----\n\nAAAA\n-----END PGP MESSAGE-----\n', context([]))), 'not-pgp');

// ---------------------------------------------------------------- writing
const aliceOpen = await P.unlock(aliceSecret, 'alice passphrase');
const bobOpen = await P.unlock(bobSecret, 'bob passphrase');
const file = new Uint8Array([0, 1, 2, 250, 251, 252]);
const binary = await P.encrypt({ data: file, filename: 'data.bin', recipients: [bobSecret.toPublic()], signers: [aliceOpen], armor: false });
check('binary output', binary instanceof Uint8Array && (binary[0] & 0x80) !== 0, true);
opened = await P.open(binary, context(both, { passphrases }));
check('binary round trip', [Array.from(opened.data), opened.text === null, opened.filename, opened.signatures.map((s) => s.status)], [Array.from(file), true, 'data.bin', ['good']]);
const withPassword = await P.encrypt({ data: 'secret', recipients: [], passwords: ['pw'], armor: true });
opened = await P.open(withPassword, context([], { passwords: ['pw'] }));
check('password only', opened.text, 'secret');
check('nothing to encrypt for', await rejects(P.encrypt({ data: 'x', recipients: [], armor: true })), 'failed');
const clear = await P.sign({ data: 'Signed text\n', signers: [bobOpen], mode: 'clear', armor: true });
check('clear signature', clear.startsWith('-----BEGIN PGP SIGNED MESSAGE-----'), true);
opened = await P.open(clear, context(both));
check('clear signature verified', [opened.text, opened.signatures.map((s) => s.status)], ['Signed text\n', ['good']]);
const detached = await P.sign({ data: file, signers: [aliceOpen], mode: 'detached', armor: false });
opened = await P.open(detached, context(both), file);
check('detached, binary', opened.signatures.map((s) => [s.status, s.fingerprint]), [['good', ALICE]]);
const inline = await P.sign({ data: file, filename: 'data.bin', signers: [aliceOpen, bobOpen], mode: 'inline', armor: true });
opened = await P.open(inline, context(both));
check('inline, two signers', [opened.kind, opened.filename, opened.signatures.map((s) => s.status)], ['signed', 'data.bin', ['good', 'good']]);
check('no version line', clear.includes('Version:') || withPassword.includes('Version:'), false);

const exported = P.exportKeys([aliceSecret, bobSecret], { armor: true, secret: false });
let parsed = await P.parseKeys(exported);
check('export two public keys', [parsed.keys.length, parsed.keys.every((k) => !k.isPrivate())], [2, true]);
parsed = await P.parseKeys(P.exportKeys([aliceSecret], { armor: true, secret: true }));
check('export a secret key', [parsed.keys.length, parsed.keys[0].isPrivate()], [1, true]);
parsed = await P.parseKeys(`junk\n${await text('alice-public.asc')}\nmore junk\n${await text('bob-public.asc')}`);
check('two blocks pasted together', parsed.keys.map((k) => k.getFingerprint().toUpperCase()), [ALICE, BOB]);
parsed = await P.parseKeys(new Uint8Array(await fixture('bob-public.gpg')));
check('binary key', parsed.keys.map((k) => k.getFingerprint().toUpperCase()), [BOB]);
parsed = await P.parseKeys(await text('bob-revocation.rev'));
check('guarded revocation left alone', [parsed.keys.length, parsed.revocations.length], [0, 0]);
parsed = await P.parseKeys(await text('bob-revocation.rev'), { revocations: true });
check('guarded revocation read when asked', parsed.revocations.length, 1);
const revokedBob = await P.applyRevocation(bobSecret.toPublic(), parsed.revocations[0]);
check('gnupg revocation applied', (await P.describe(revokedBob)).status, 'revoked');
check('a revocation for another key', await rejects(P.applyRevocation(aliceSecret.toPublic(), parsed.revocations[0])), 'failed');

// A selection from Chrome's context menu: line breaks turned into spaces.
const flattened = (await text('to-alice-signed-by-bob.asc')).replace(/\s+/g, ' ');
opened = await P.open(P.reflowArmor(flattened), context(both, { passphrases }));
check('armor mended from one line', opened.text, MESSAGE);
const withHeaders = (await text('alice-public.asc')).replace('-----\n\n', '-----\nComment: made with GnuPG, see https://gnupg.org\nVersion: 2.5\n\n').replace(/\s+/g, ' ');
parsed = await P.parseKeys(P.reflowArmor(withHeaders));
check('armor mended, headers dropped', parsed.keys.map((k) => k.getFingerprint().toUpperCase()), [ALICE]);
check('armor with its lines left alone', P.reflowArmor(await text('alice-public.asc')), await text('alice-public.asc'));
check('other text left alone', P.reflowArmor('just words'), 'just words');

// ---------------------------------------------------------------- changing keys
const later = new Date(Date.now() + 400 * 86400e3);
const oldSignature = await P.sign({ data: 'before', signers: [aliceOpen], mode: 'clear', armor: true });
let changed = await P.setExpiration(aliceSecret, aliceOpen, later);
let info = await P.describe(changed);
const second = (ms) => Math.round(ms / 1000);
check('expiry set on a GnuPG key', [second(info.expires), second(info.keys[1].expires), info.status], [second(later.getTime()), second(later.getTime()), 'valid']);
check('expiry keeps the usage', info.keys.map((k) => k.usage), [['certify', 'sign'], ['encrypt']]);
check('expiry keeps the certification by bob', info.userIds[0].certifications.map((c) => c.fingerprint), [BOB]);
check('expiry keeps the secret encrypted', info.keys.map((k) => k.protected), [true, true]);
opened = await P.open(oldSignature, context([changed]));
check('a signature from before still verifies', opened.signatures.map((s) => s.status), ['good']);
changed = await P.setExpiration(changed, aliceOpen, null);
info = await P.describe(changed);
check('expiry removed again', [info.expires, info.keys[1].expires, info.status], [null, null, 'valid']);
check('expiry in the past refused', await rejects(P.setExpiration(aliceSecret, aliceOpen, new Date(Date.now() - 1000))), 'failed');
const reread = await openpgp.readKey({ armoredKey: changed.armor() });
check('changed key survives armor', (await P.describe(reread)).expires, null);

const soon = new Date(Date.now() + 86400e3);
for (const id of ['rsa2048', 'v6-curve25519']) {
  const key = made[id];
  const open = await P.unlock(key, 'pass phrase');
  info = await P.describe(await P.setExpiration(key, open, soon));
  check(`${id}: expiry set`, [second(info.expires), second(info.keys[1].expires), info.status], [second(soon.getTime()), second(soon.getTime()), 'valid']);
}

changed = await P.addUserId(aliceSecret, aliceOpen, { name: 'Alice Work', email: 'alice@work.example' });
info = await P.describe(changed);
check('user id added', info.userIds.map((u) => [u.userId, u.primary, u.status]), [['Alice Example <alice@example.org>', true, 'valid'], ['Alice Work <alice@work.example>', false, 'valid']]);
check('user id added twice refused', await rejects(P.addUserId(changed, aliceOpen, { name: 'Alice Work', email: 'alice@work.example' })), 'failed');
changed = await P.revokeUserId(changed, aliceOpen, 'Alice Work <alice@work.example>', { flag: 32, text: 'ушла с работы' });
info = await P.describe(changed);
check('user id revoked', info.userIds.map((u) => u.status), ['valid', 'revoked']);
check('key still valid', info.status, 'valid');
const reread2 = await openpgp.readKey({ armoredKey: changed.armor() });
check('a reason in Cyrillic survives', reread2.users.find((u) => u.userID.userID === 'Alice Work <alice@work.example>').revocationSignatures[0].reasonForRevocationString, 'ушла с работы');

const v6 = made['v6-curve25519'];
const v6Open = await P.unlock(v6, 'pass phrase');
info = await P.describe(await P.addUserId(v6, v6Open, { name: 'Second', email: 'second@example.org' }));
check('v6: user id added', info.userIds.map((u) => u.status), ['valid', 'valid']);

const certificate = await P.revocationCertificate(aliceOpen, { flag: 1, text: 'superseded' });
check('revocation certificate leaves the key', (await P.describe(aliceSecret)).status, 'valid');
parsed = await P.parseKeys(certificate, { revocations: true });
check('own revocation certificate read', parsed.revocations.length, 1);
check('own revocation certificate applied', (await P.describe(await P.applyRevocation(aliceSecret.toPublic(), parsed.revocations[0]))).status, 'revoked');
changed = await P.revoke(aliceSecret, aliceOpen, { flag: 2, text: 'compromised' });
info = await P.describe(changed);
check('key revoked', [info.status, info.canEncrypt, info.canSign], ['revoked', false, false]);

let certified = await P.certify(bobSecret.toPublic(), aliceOpen, ['Bob Example <bob@example.org>']);
let by = await P.certifiedBy(certified, [aliceSecret.toPublic()]);
check('certified by alice', [...by.entries()], [['Bob Example <bob@example.org>', [ALICE]]]);
by = await P.certifiedBy(bobSecret.toPublic(), [aliceSecret.toPublic()]);
check('not certified before', by.size, 0);
by = await P.certifiedBy(aliceSecret.toPublic(), [bobSecret.toPublic()]);
check('gnupg certification verified', [...by.entries()], [['Alice Example <alice@example.org>', [BOB]]]);
check('no certifying oneself', await rejects(P.certify(aliceSecret.toPublic(), aliceOpen, ['Alice Example <alice@example.org>'])), 'failed');
// A key whose signing subkey is not the primary: the certification is still the primary key's.
certified = await P.certify(made.rsa2048.toPublic(), bobOpen, ['Test User <test@example.org>']);
const issuer = certified.users[0].otherCertifications[0].issuerKeyID.toHex().toUpperCase();
check('certification made by the primary key', issuer, bob.keyId);

const rekeyed = await P.changePassphrase(aliceOpen, 'new passphrase');
check('old passphrase no longer works', await rejects(P.unlock(rekeyed, 'alice passphrase')), 'bad-passphrase');
check('new passphrase works', P.isUnlocked(await P.unlock(rekeyed, 'new passphrase')), true);
const bare = await P.changePassphrase(aliceOpen, '');
check('no passphrase', [P.isUnlocked(bare), (await P.describe(bare)).unprotected], [true, true]);
check('the unlocked key is left as it was', P.isUnlocked(aliceSecret), false);

done('pgp');

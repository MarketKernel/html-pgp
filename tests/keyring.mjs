/**
 * src/core/keyring.ts over a store in memory: importing and merging, a
 * secret key joining its public one, trust from certifications by the user's
 * own keys, revocation certificates, and reading the store back.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { checker, load, root } from '../tools/load.mjs';

const { check, done } = checker();
const K = await load('core/keyring', 'core/pgp', 'openpgp');
const text = async (name) => (await readFile(join(root, 'tests/fixtures/gnupg', name))).toString('utf8');
const ALICE = '52F222D930EABB01BCFCEB5300F7BCCADA511930';
const BOB = '4AB507A0DC3A1DB6D59DE24F9FAD5A48032649A2';

const store = new K.MemoryStore();
let { keyring, problems } = await K.Keyring.open(store);
check('empty', [keyring.size, problems], [0, []]);

let result = await keyring.import(await text('alice-public.asc'));
check('new key', result, { keys: [{ fingerprint: ALICE, status: 'new' }], revoked: [], problems: [], unprotected: [] });
check('stored', [...store.records.keys()], [ALICE]);
check('a public key is not trusted', keyring.get(ALICE).trust, 'unknown');
result = await keyring.import(await text('alice-public.asc'));
check('the same again', result.keys, [{ fingerprint: ALICE, status: 'unchanged' }]);
result = await keyring.import(await text('alice-secret.asc'));
check('the secret part joins', result.keys, [{ fingerprint: ALICE, status: 'secret' }]);
check('own key: ultimate', [keyring.get(ALICE).trust, keyring.get(ALICE).info.secret, keyring.secretKeys().length], ['ultimate', true, 1]);
check('fingerprint in any case', keyring.get(ALICE.toLowerCase())?.record.fingerprint, ALICE);

result = await keyring.import(new Uint8Array(await readFile(join(root, 'tests/fixtures/gnupg/bob-public.gpg'))));
check('binary import', result.keys, [{ fingerprint: BOB, status: 'new' }]);
check('bob not certified by alice', [keyring.get(BOB).trust, keyring.get(BOB).certified.size], ['unknown', 0]);
check('alice certified by bob, who is not ours', keyring.get(ALICE).certified.size, 0);
check('find by subkey id', keyring.findByKeyId(keyring.get(BOB).info.keys[1].keyId).map((e) => e.record.fingerprint), [BOB]);
check('public keys', keyring.publicKeys().length, 2);

// Alice certifies Bob's key: now it is valid for her.
const aliceOpen = await K.unlock(keyring.get(ALICE).key, 'alice passphrase');
await keyring.put(await K.certify(keyring.get(BOB).key, aliceOpen, ['Bob Example <bob@example.org>']));
check('certified by an own key', [keyring.get(BOB).trust, [...keyring.get(BOB).certified.entries()]], ['full', [['Bob Example <bob@example.org>', [ALICE]]]]);

// The store read back: the same keys, the same trust.
({ keyring, problems } = await K.Keyring.open(store));
check('read back', [keyring.size, keyring.get(ALICE).trust, keyring.get(BOB).trust, problems], [2, 'ultimate', 'full', []]);

// Revocation certificates: GnuPG's needs to be asked for.
result = await keyring.import(await text('bob-revocation.rev'));
check('guarded revocation not applied', [result.revoked, keyring.get(BOB).info.status], [[], 'valid']);
result = await keyring.import(await text('bob-revocation.rev'), { revocations: true });
check('revocation applied', [result.revoked, keyring.get(BOB).info.status], [[BOB], 'revoked']);

result = await keyring.import('just some text');
check('nothing to import', [result.keys, result.problems.length], [[], 1]);
result = await keyring.import('-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nAAAA\n-----END PGP PUBLIC KEY BLOCK-----\n');
check('damaged key', [result.keys, result.problems.length], [[], 1]);

const record = store.records.get(ALICE);
store.records.set('BROKEN', { fingerprint: 'BROKEN', armored: 'nonsense', added: 0 });
({ keyring, problems } = await K.Keyring.open(store));
check('a broken record is reported and kept', [keyring.size, problems.length, store.records.has('BROKEN')], [2, 1, true]);
check('added date kept', keyring.get(ALICE).record.added, record.added);

// A secret backup older than the public key stored: the newer signatures stay.
{
  const fresh = await K.Keyring.open(new K.MemoryStore());
  const { key } = await K.generate({ name: 'Old Backup', email: 'old@example.org', algorithm: 'curve25519', expires: null, passphrase: 'pw' });
  const backup = key.armor();
  const later = new Date(Date.now() + 500 * 86400e3);
  const renewed = await K.setExpiration(key, await K.unlock(key, 'pw'), later);
  await fresh.keyring.import(renewed.toPublic().armor());
  result = await fresh.keyring.import(backup);
  const merged = fresh.keyring.get(key.getFingerprint());
  check('old secret backup over a newer public key', [result.keys[0].status, merged.info.secret, Math.round(merged.info.expires / 1000)], ['secret', true, Math.round(later.getTime() / 1000)]);

  // A copy of a stored key whose subkey binding is broken but newer: refused, the key keeps working.
  const { openpgp } = K;
  const stored = fresh.keyring.get(key.getFingerprint()).key.toPublic();
  const list = stored.toPacketList();
  const at = list.findIndex((packet) => packet instanceof openpgp.SignaturePacket && packet.signatureType === openpgp.enums.signature.subkeyBinding);
  const bytes = list[at].write();
  // The creation time's subpacket (length 5, type 2) set to now: the hash no longer matches.
  const created = Math.floor(list[at].created.getTime() / 1000);
  for (let i = 0; i < bytes.length - 5; i++) {
    if ((bytes[i] === 5 && (bytes[i + 1] & 0x7f) === 2) && ((bytes[i + 2] << 24) | (bytes[i + 3] << 16) | (bytes[i + 4] << 8) | bytes[i + 5]) >>> 0 === created) {
      const now = created + 1;
      bytes.set([now >>> 24, (now >>> 16) & 255, (now >>> 8) & 255, now & 255], i + 2);
      break;
    }
  }
  // A second later than the real one, and already past: openpgp.js ignores signatures from the future.
  await new Promise((resolve) => setTimeout(resolve, 2100));
  const forged = new openpgp.SignaturePacket();
  forged.read(bytes);
  list[at] = forged;
  result = await fresh.keyring.import(new openpgp.PublicKey(list).armor());
  check('a damaging copy refused', [result.keys, result.problems.length, fresh.keyring.get(key.getFingerprint()).info.canEncrypt], [[], 1, true]);

  // A secret key without a passphrase is reported.
  const { key: bare } = await K.generate({ name: 'Bare', email: 'bare@example.org', algorithm: 'curve25519', expires: null, passphrase: '' });
  result = await fresh.keyring.import(bare.armor());
  check('unprotected secret key reported', result.unprotected, [bare.getFingerprint().toUpperCase()]);
}

await keyring.remove(ALICE);
check('removed', [keyring.size, store.records.has(ALICE), keyring.get(BOB).trust], [1, false, 'unknown']);

done('keyring');

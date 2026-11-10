/**
 * The keyring: every key the user has, public and secret, kept as armored
 * text in a store the page provides (IndexedDB) or the tests do (memory).
 *
 * Validity follows Kleopatra's simplest reading of the web of trust: a key
 * whose secret part is here is the user's own and trusted ultimately; a key
 * one of those certified is certified; any other key may be used, but the
 * interface says nobody vouched for it.
 */

import * as openpgp from 'openpgp';
import { applyRevocation, certifiedBy, parseKeys, type Input } from './pgp';
import { describe, hex, type KeyInfo } from './keys';

export interface KeyRecord {
  fingerprint: string;
  /** The key as openpgp.js armors it: a private key block when the secret part is here. */
  armored: string;
  /** When it came into the keyring, in milliseconds. */
  added: number;
  /** The revocation certificate made with the key, for the user's own keys made here. */
  revocation?: string;
}

/** Where the records live; the page's IndexedDB, or memory in the tests. */
export interface KeyStore {
  load(): Promise<KeyRecord[]>;
  save(record: KeyRecord): Promise<void>;
  remove(fingerprint: string): Promise<void>;
}

export class MemoryStore implements KeyStore {
  readonly records = new Map<string, KeyRecord>();
  async load(): Promise<KeyRecord[]> {
    return [...this.records.values()].map((record) => ({ ...record }));
  }
  async save(record: KeyRecord): Promise<void> {
    this.records.set(record.fingerprint, { ...record });
  }
  async remove(fingerprint: string): Promise<void> {
    this.records.delete(fingerprint);
  }
}

/** Ultimate: the user's own. Full: certified by one of the user's own keys. Unknown: nobody vouched for it. */
export type Trust = 'ultimate' | 'full' | 'unknown';

export interface Entry {
  record: KeyRecord;
  key: openpgp.Key;
  info: KeyInfo;
  trust: Trust;
  /** User ID → fingerprints of the user's own keys that certified it. */
  certified: Map<string, string[]>;
}

export type ImportStatus = 'new' | 'updated' | 'unchanged' | 'secret';

export interface ImportResult {
  keys: { fingerprint: string; status: ImportStatus }[];
  /** Fingerprints of keys revoked by a revocation certificate in the input. */
  revoked: string[];
  /** What could not be read or used, as openpgp.js put it, or a key no one can use. */
  problems: string[];
  /** Fingerprints of secret keys that came in without a passphrase. */
  unprotected: string[];
}

/** How many secret parts of the key are really here — not public, not GnuPG's stubs. */
const secretParts = (key: openpgp.Key): number =>
  key.getKeys().filter((part) => 'isDummy' in part.keyPacket && !(part.keyPacket as openpgp.SecretKeyPacket).isDummy()).length;

/** Every part that was valid — the key, a subkey, a user ID — that is no longer: an import that would damage the key. */
function damaged(before: KeyInfo, after: KeyInfo): boolean {
  const statuses = (info: KeyInfo): Map<string, string> =>
    new Map([...info.keys.map((k): [string, string] => [k.fingerprint, k.status]), ...info.userIds.map((u): [string, string] => [`uid:${u.userId}`, u.status])]);
  const now = statuses(after);
  return [...statuses(before)].some(([part, status]) => status === 'valid' && now.get(part) === 'invalid');
}

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((byte, i) => byte === b[i]);

export class Keyring {
  private readonly entries = new Map<string, Entry>();

  private constructor(private readonly store: KeyStore) {}

  /** Reads every record; one that no longer parses is left in the store, untouched, and reported. */
  static async open(store: KeyStore): Promise<{ keyring: Keyring; problems: string[] }> {
    const keyring = new Keyring(store);
    const problems: string[] = [];
    for (const record of await store.load()) {
      try {
        const key = await openpgp.readKey({ armoredKey: record.armored });
        keyring.entries.set(record.fingerprint, { record, key, info: await describe(key), trust: 'unknown', certified: new Map() });
      } catch (error) {
        problems.push(`${record.fingerprint}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await keyring.refreshTrust();
    return { keyring, problems };
  }

  /** Reads the store again: another window of the app changed it. */
  async reload(): Promise<void> {
    const fresh = await Keyring.open(this.store);
    this.entries.clear();
    for (const [fingerprint, entry] of fresh.keyring.entries) this.entries.set(fingerprint, entry);
  }

  list(): Entry[] {
    return [...this.entries.values()];
  }

  get(fingerprint: string): Entry | undefined {
    return this.entries.get(hex(fingerprint));
  }

  get size(): number {
    return this.entries.size;
  }

  /** The keys whose primary key or a subkey has this key ID. */
  findByKeyId(keyId: string): Entry[] {
    const id = hex(keyId);
    return this.list().filter((entry) => entry.info.keys.some((part) => part.keyId === id));
  }

  publicKeys(): openpgp.PublicKey[] {
    return this.list().map((entry) => entry.key.toPublic());
  }

  secretKeys(): openpgp.PrivateKey[] {
    return this.list()
      .map((entry) => entry.key)
      .filter((key): key is openpgp.PrivateKey => key.isPrivate());
  }

  /** The user's own keys that can certify others. */
  private certifiers(): openpgp.PublicKey[] {
    return this.list()
      .filter((entry) => entry.key.isPrivate() && entry.info.status === 'valid')
      .map((entry) => entry.key.toPublic());
  }

  /** Works out every key's trust again: after a key is added, changed or removed. */
  async refreshTrust(): Promise<void> {
    const certifiers = this.certifiers();
    for (const entry of this.entries.values()) {
      entry.certified = await certifiedBy(entry.key, certifiers);
      // The user's own keys certify each other too: "certified" is shown there, the trust stays ultimate.
      if (entry.key.isPrivate()) entry.trust = 'ultimate';
      else entry.trust = entry.certified.size > 0 ? 'full' : 'unknown';
    }
  }

  /** Stores `key`, as it is now, in place of what the keyring had for it. */
  async put(key: openpgp.Key, extra: Partial<Pick<KeyRecord, 'revocation'>> = {}): Promise<Entry> {
    const fingerprint = hex(key.getFingerprint());
    const before = this.entries.get(fingerprint);
    const record: KeyRecord = {
      fingerprint,
      armored: key.armor(),
      added: before?.record.added ?? Date.now(),
      ...(before?.record.revocation ? { revocation: before.record.revocation } : {}),
      ...extra,
    };
    await this.store.save(record);
    const entry: Entry = { record, key, info: await describe(key), trust: 'unknown', certified: new Map() };
    this.entries.set(fingerprint, entry);
    await this.refreshTrust();
    return entry;
  }

  /**
   * Adds every key in `input`, merged with what the keyring has: new user IDs,
   * subkeys and signatures join the stored key, and a secret part joins its
   * public one. Revocation certificates — read only when `revocations` is set —
   * revoke the keys they belong to.
   */
  async import(input: Input, { revocations = false } = {}): Promise<ImportResult> {
    const parsed = await parseKeys(input, { revocations });
    const result: ImportResult = { keys: [], revoked: [], problems: [...parsed.problems], unprotected: [] };
    if (!parsed.keys.length && !parsed.revocations.length && !parsed.problems.length) result.problems.push('No OpenPGP keys found');
    for (const incoming of parsed.keys) {
      const fingerprint = hex(incoming.getFingerprint());
      const info = await describe(incoming);
      if (info.status === 'invalid') {
        result.problems.push(`${fingerprint}: no valid self-signature`);
        continue;
      }
      const existing = this.entries.get(fingerprint);
      if (!existing) {
        const entry = await this.put(incoming);
        result.keys.push({ fingerprint, status: 'new' });
        if (entry.info.unprotected) result.unprotected.push(fingerprint);
        continue;
      }
      try {
        // The copy with more of its secret here is the base, the other merged into it: a
        // secret key joins its public one, a real secret replaces GnuPG's stub. (openpgp.js
        // turning a public key into a private one by itself loses signatures on the way.)
        const date = new Date();
        const merged = secretParts(incoming) > secretParts(existing.key) ? await (incoming as openpgp.PrivateKey).update(existing.key, date) : await existing.key.update(incoming as openpgp.PrivateKey, date);
        if (sameBytes(merged.write(), existing.key.write())) {
          result.keys.push({ fingerprint, status: 'unchanged' });
          continue;
        }
        // A copy with a broken signature newer than the good one would replace it: such a copy is refused.
        if (damaged(existing.info, await describe(merged))) {
          result.problems.push(`${fingerprint}: the imported copy would make parts of the stored key unusable; it was not merged`);
          continue;
        }
        const entry = await this.put(merged);
        result.keys.push({ fingerprint, status: secretParts(merged) > secretParts(existing.key) ? 'secret' : 'updated' });
        if (entry.info.unprotected && !existing.info.unprotected) result.unprotected.push(fingerprint);
      } catch (error) {
        result.problems.push(`${fingerprint}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    for (const certificate of parsed.revocations) {
      const issuer = certificate.packets[0]?.issuerKeyID;
      const entry = issuer ? this.list().find((e) => e.key.keyPacket.getKeyID().equals(issuer)) : undefined;
      if (!entry) {
        result.problems.push('The revocation certificate is for a key that is not in the keyring');
        continue;
      }
      try {
        await this.put(await applyRevocation(entry.key, certificate));
        result.revoked.push(entry.record.fingerprint);
      } catch (error) {
        result.problems.push(`${entry.record.fingerprint}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return result;
  }

  async remove(fingerprint: string): Promise<void> {
    const id = hex(fingerprint);
    await this.store.remove(id);
    this.entries.delete(id);
    await this.refreshTrust();
  }
}

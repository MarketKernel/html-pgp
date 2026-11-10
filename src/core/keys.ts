/**
 * What a key is, as the interface shows it: its user IDs, its primary key and
 * subkeys with their algorithms, usage, dates and status. Everything here is
 * read from the key itself and is plain data, so the list and the details pane
 * never touch an openpgp.js object, and the tests can compare it as JSON.
 *
 * Names follow GnuPG and Kleopatra where they have one — rsa3072, ed25519,
 * cv25519, nistp256 — so a key looks the same here as it does there.
 */

import * as openpgp from 'openpgp';

export type Usage = 'certify' | 'sign' | 'encrypt' | 'authenticate';

/** What the key's own signatures say, now: usable, past its date, withdrawn, or not properly signed at all. */
export type Status = 'valid' | 'expired' | 'revoked' | 'invalid';

/** A secret part that is here, one that is only a placeholder (GnuPG's offline primary key, a smartcard), or none. */
export type Secret = 'none' | 'available' | 'stub';

export interface SubkeyInfo {
  fingerprint: string;
  keyId: string;
  algorithm: string;
  created: number;
  /** Milliseconds; null — never expires. */
  expires: number | null;
  usage: Usage[];
  status: Status;
  secret: Secret;
  /** The secret part is encrypted with a passphrase. */
  protected: boolean;
}

export interface UserIdInfo {
  userId: string;
  name: string;
  email: string;
  comment: string;
  primary: boolean;
  status: Status;
  /** Key IDs of the other keys that certified this user ID, as the signatures name them. */
  certifications: { keyId: string; fingerprint: string | null; created: number }[];
}

export interface KeyInfo {
  fingerprint: string;
  keyId: string;
  /** 4 for the keys GnuPG makes, 6 for RFC 9580's. */
  version: number;
  /** Its secret part is in the keyring, whole or in part. */
  secret: boolean;
  /** Some secret part is not protected by a passphrase. */
  unprotected: boolean;
  name: string;
  email: string;
  userIds: UserIdInfo[];
  /** The primary key first, then the subkeys in their order. */
  keys: SubkeyInfo[];
  algorithm: string;
  created: number;
  expires: number | null;
  status: Status;
  canEncrypt: boolean;
  canSign: boolean;
  canCertify: boolean;
}

const CURVES: Record<string, string> = {
  ed25519Legacy: 'ed25519',
  curve25519Legacy: 'cv25519',
  nistP256: 'nistp256',
  nistP384: 'nistp384',
  nistP521: 'nistp521',
  secp256k1: 'secp256k1',
  brainpoolP256r1: 'brainpoolP256r1',
  brainpoolP384r1: 'brainpoolP384r1',
  brainpoolP512r1: 'brainpoolP512r1',
};

/** rsa3072, ed25519, cv25519, nistp384…: GnuPG's name for a key's algorithm. */
export function algorithmName(info: openpgp.AlgorithmInfo): string {
  switch (info.algorithm) {
    case 'rsaEncryptSign':
    case 'rsaEncrypt':
    case 'rsaSign':
      return `rsa${info.bits ?? ''}`;
    case 'dsa':
      return `dsa${info.bits ?? ''}`;
    case 'elgamal':
      return `elg${info.bits ?? ''}`;
    case 'ecdsa':
    case 'ecdh':
    case 'eddsaLegacy':
      return (info.curve && CURVES[info.curve]) ?? info.curve ?? info.algorithm;
    default:
      return info.algorithm;
  }
}

/** Upper-case hex, as GnuPG prints it. */
export const hex = (value: string): string => value.toUpperCase();

/**
 * A fingerprint in groups of four: a v4 one in two halves of five groups, as
 * GnuPG and Kleopatra print it, so it can be read aloud and compared by eye.
 */
export function formatFingerprint(fingerprint: string): string {
  const groups = hex(fingerprint).match(/.{1,4}/g) ?? [];
  if (groups.length === 10) return `${groups.slice(0, 5).join(' ')}  ${groups.slice(5).join(' ')}`;
  return groups.join(' ');
}

/** "Name (comment) <email>" split into its parts; a user ID that is only an address has no name. */
export function splitUserId(userId: string): { name: string; email: string; comment: string } {
  const match = /^\s*(.*?)\s*(?:\((.*)\))?\s*(?:<([^<>]*)>)?\s*$/.exec(userId);
  let name = match?.[1] ?? '';
  let email = match?.[3] ?? '';
  if (!email && /^[^\s@]+@[^\s@]+$/.test(name)) {
    email = name;
    name = '';
  }
  return { name, email, comment: match?.[2] ?? '' };
}

const FLAGS: [number, Usage][] = [
  [openpgp.enums.keyFlags.certifyKeys, 'certify'],
  [openpgp.enums.keyFlags.signData, 'sign'],
  [openpgp.enums.keyFlags.encryptCommunication | openpgp.enums.keyFlags.encryptStorage, 'encrypt'],
  [openpgp.enums.keyFlags.authentication, 'authenticate'],
];

function usageOf(flags: Uint8Array | null | undefined): Usage[] | null {
  if (!flags || flags.length === 0) return null;
  const first = flags[0] ?? 0;
  return FLAGS.filter(([bit]) => first & bit).map(([, usage]) => usage);
}

/** What a key without key flags may do, by its algorithm alone — keys from before flags existed. */
function usageByAlgorithm(info: openpgp.AlgorithmInfo, primary: boolean): Usage[] {
  switch (info.algorithm) {
    case 'rsaEncryptSign':
      return primary ? ['certify', 'sign'] : ['encrypt'];
    case 'elgamal':
    case 'ecdh':
    case 'x25519':
    case 'x448':
    case 'rsaEncrypt':
      return ['encrypt'];
    default:
      return primary ? ['certify', 'sign'] : ['sign'];
  }
}

const latest = (signatures: openpgp.SignaturePacket[]): openpgp.SignaturePacket | null =>
  signatures.reduce<openpgp.SignaturePacket | null>((best, sig) => (!best || (sig.created ?? 0) > (best.created ?? 0) ? sig : best), null);

function secretOf(packet: openpgp.Key['keyPacket'] | openpgp.Subkey['keyPacket']): { secret: Secret; protected: boolean } {
  if (!('isDummy' in packet)) return { secret: 'none', protected: false };
  if (packet.isDummy()) return { secret: 'stub', protected: false };
  return { secret: 'available', protected: !packet.isDecrypted() };
}

const time = (value: Date | number | null): number | null => (value instanceof Date ? value.getTime() : null);

async function expirationOf(get: () => Promise<Date | number | null>): Promise<number | null> {
  try {
    return time(await get());
  } catch {
    return null;
  }
}

/** Its own status, from what openpgp.js finds when it checks the key's signatures at `now`. */
async function primaryStatus(key: openpgp.Key, now: Date, expires: number | null): Promise<Status> {
  try {
    if (await key.isRevoked(undefined, undefined, now)) return 'revoked';
  } catch {
    /* a revocation that does not verify is no revocation */
  }
  try {
    await key.verifyPrimaryKey(now);
    return 'valid';
  } catch {
    if (expires !== null && expires <= now.getTime()) return 'expired';
    // Every user ID revoked leaves a key nobody can use, much as a revoked one.
    if (key.users.length > 0 && key.users.every((user) => user.revocationSignatures.length > 0)) return 'revoked';
    return 'invalid';
  }
}

async function subkeyStatus(subkey: openpgp.Subkey, now: Date, expires: number | null): Promise<Status> {
  try {
    await subkey.verify(now);
    return 'valid';
  } catch {
    if (subkey.revocationSignatures.length > 0) return 'revoked';
    if (expires !== null && expires <= now.getTime()) return 'expired';
    return 'invalid';
  }
}

async function userStatus(user: openpgp.User, now: Date): Promise<Status> {
  try {
    await user.verify(now);
    return 'valid';
  } catch {
    if (user.revocationSignatures.length > 0) return 'revoked';
    const self = latest(user.selfCertifications);
    if (self?.isExpired(now)) return 'expired';
    return 'invalid';
  }
}

/** Everything the interface shows of `key`, as it stands at `now`. */
export async function describe(key: openpgp.Key, now = new Date()): Promise<KeyInfo> {
  const primaryAlgorithm = key.getAlgorithmInfo();
  const expires = await expirationOf(() => key.getExpirationTime());
  const status = await primaryStatus(key, now, expires);

  let primaryUser: openpgp.User | null = null;
  let primarySelf: openpgp.SignaturePacket | null = null;
  try {
    const found = await key.getPrimaryUser(now);
    primaryUser = found.user;
    primarySelf = found.selfCertification;
  } catch {
    // No valid user ID now — expired or revoked: show the first one still.
    primaryUser = key.users.find((user) => user.userID) ?? null;
    primarySelf = primaryUser ? latest(primaryUser.selfCertifications) : null;
  }
  // A v6 key keeps its flags on a signature over the key itself, not on its user IDs.
  const direct = latest((key as unknown as { directSignatures?: openpgp.SignaturePacket[] }).directSignatures ?? []);
  const primaryUsage = usageOf(direct?.keyFlags) ?? usageOf(primarySelf?.keyFlags) ?? usageByAlgorithm(primaryAlgorithm, true);

  const keys: SubkeyInfo[] = [
    {
      fingerprint: hex(key.getFingerprint()),
      keyId: hex(key.getKeyID().toHex()),
      algorithm: algorithmName(primaryAlgorithm),
      created: key.getCreationTime().getTime(),
      expires,
      usage: primaryUsage,
      status,
      ...secretOf(key.keyPacket),
    },
  ];
  for (const subkey of key.subkeys) {
    const subExpires = await expirationOf(() => subkey.getExpirationTime(now));
    const binding = latest(subkey.bindingSignatures);
    keys.push({
      fingerprint: hex(subkey.getFingerprint()),
      keyId: hex(subkey.getKeyID().toHex()),
      algorithm: algorithmName(subkey.getAlgorithmInfo()),
      created: subkey.getCreationTime().getTime(),
      expires: subExpires,
      usage: usageOf(binding?.keyFlags) ?? usageByAlgorithm(subkey.getAlgorithmInfo(), false),
      status: await subkeyStatus(subkey, now, subExpires),
      ...secretOf(subkey.keyPacket),
    });
  }

  const userIds: UserIdInfo[] = [];
  for (const user of key.users) {
    if (!user.userID) continue; // a photo ID: nothing to show for it here
    userIds.push({
      userId: user.userID.userID,
      ...splitUserId(user.userID.userID),
      primary: user === primaryUser,
      status: await userStatus(user, now),
      certifications: user.otherCertifications.map((sig) => ({
        keyId: hex(sig.issuerKeyID.toHex()),
        fingerprint: sig.issuerFingerprint ? hex(Array.from(sig.issuerFingerprint, (b) => b.toString(16).padStart(2, '0')).join('')) : null,
        created: sig.created?.getTime() ?? 0,
      })),
    });
  }
  // The primary user ID leads, as in GnuPG's listing.
  userIds.sort((a, b) => Number(b.primary) - Number(a.primary));

  const usable = (usage: Usage): boolean => status === 'valid' && keys.some((k) => k.status === 'valid' && k.usage.includes(usage));
  const first = userIds[0];
  return {
    fingerprint: hex(key.getFingerprint()),
    keyId: hex(key.getKeyID().toHex()),
    version: key.keyPacket.version,
    secret: key.isPrivate(),
    unprotected: keys.some((k) => k.secret === 'available' && !k.protected),
    name: first?.name ?? '',
    email: first?.email ?? '',
    userIds,
    keys,
    algorithm: algorithmName(primaryAlgorithm),
    created: key.getCreationTime().getTime(),
    expires,
    status,
    canEncrypt: usable('encrypt'),
    // One and the same key must sign, be valid, and have its secret here.
    canSign: key.isPrivate() && status === 'valid' && keys.some((k) => k.status === 'valid' && k.usage.includes('sign') && k.secret === 'available'),
    canCertify: key.isPrivate() && status === 'valid' && keys[0]?.secret === 'available',
  };
}

/** "Alice <alice@example.org>", or whichever of the two there is, or the key ID. */
export function label(info: Pick<KeyInfo, 'name' | 'email' | 'keyId'>): string {
  if (info.name && info.email) return `${info.name} <${info.email}>`;
  return info.name || info.email || info.keyId;
}

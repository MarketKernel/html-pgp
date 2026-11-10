/**
 * Every OpenPGP operation the application performs, over openpgp.js: making
 * keys, reading what is pasted or dropped, encrypting, signing, decrypting and
 * verifying, and the changes to a key Kleopatra offers — a new expiry date, a
 * new user ID, certifying someone else's key, revoking.
 *
 * Nothing here touches the DOM or the keyring's storage: the caller hands in
 * the keys, and a way to unlock a secret key or ask for a password when one is
 * needed. That keeps the tests in Node on the very code the page runs.
 */

import * as openpgp from 'openpgp';
import { hex } from './keys';

export { reflowArmor } from './armor';

// No "Version: OpenPGP.js" or comment lines in what we write: they say nothing the reader needs.
openpgp.config.showVersion = false;
openpgp.config.showComment = false;

/* ------------------------------------------------------------------ *
 * Errors
 * ------------------------------------------------------------------ */

export type ErrorCode =
  /** The user closed a passphrase or password prompt. */
  | 'cancelled'
  /** Encrypted for keys whose secret part is not in the keyring. */
  | 'no-secret-key'
  | 'bad-passphrase'
  /** A detached signature, with nothing given to check it against. */
  | 'need-data'
  /** Not OpenPGP data at all. */
  | 'not-pgp'
  /** OpenPGP data that is damaged, or that openpgp.js refuses. */
  | 'corrupt'
  | 'failed';

export class PgpError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = code,
    /** Key IDs of the recipients, for no-secret-key. */
    readonly keyIds: string[] = [],
  ) {
    super(message);
    this.name = 'PgpError';
  }
}

const reason = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/* ------------------------------------------------------------------ *
 * Algorithms for new keys
 * ------------------------------------------------------------------ */

export type AlgorithmId =
  | 'curve25519'
  | 'rsa2048'
  | 'rsa3072'
  | 'rsa4096'
  | 'nistP256'
  | 'nistP384'
  | 'nistP521'
  | 'brainpoolP256r1'
  | 'brainpoolP384r1'
  | 'brainpoolP512r1'
  | 'v6-curve25519'
  | 'v6-curve448';

export interface Algorithm {
  id: AlgorithmId;
  /** Names of algorithms, the same in every language. */
  label: string;
  family: 'ecc' | 'rsa' | 'v6';
  /** RFC 9580 keys: GnuPG and Kleopatra do not read them yet. */
  v6: boolean;
  options: Pick<openpgp.KeyOptions, 'type' | 'curve' | 'rsaBits'>;
}

/**
 * What a new key can be made of, by family, as the list groups them.
 * Curve25519 first: GnuPG's own default, short, fast, and read by everything. secp256k1 is left out — openpgp.js refuses it
 * unless told otherwise, and nobody signs mail with it.
 */
export const ALGORITHMS: readonly Algorithm[] = [
  { id: 'curve25519', label: 'ECC Curve25519 (Ed25519 + Cv25519)', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'curve25519Legacy' } },
  { id: 'nistP256', label: 'ECC NIST P-256', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'nistP256' } },
  { id: 'nistP384', label: 'ECC NIST P-384', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'nistP384' } },
  { id: 'nistP521', label: 'ECC NIST P-521', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'nistP521' } },
  { id: 'brainpoolP256r1', label: 'ECC Brainpool P-256', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'brainpoolP256r1' } },
  { id: 'brainpoolP384r1', label: 'ECC Brainpool P-384', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'brainpoolP384r1' } },
  { id: 'brainpoolP512r1', label: 'ECC Brainpool P-512', family: 'ecc', v6: false, options: { type: 'ecc', curve: 'brainpoolP512r1' } },
  { id: 'rsa2048', label: 'RSA 2048', family: 'rsa', v6: false, options: { type: 'rsa', rsaBits: 2048 } },
  { id: 'rsa3072', label: 'RSA 3072', family: 'rsa', v6: false, options: { type: 'rsa', rsaBits: 3072 } },
  { id: 'rsa4096', label: 'RSA 4096', family: 'rsa', v6: false, options: { type: 'rsa', rsaBits: 4096 } },
  { id: 'v6-curve25519', label: 'Ed25519 + X25519 (OpenPGP v6)', family: 'v6', v6: true, options: { type: 'curve25519' } },
  { id: 'v6-curve448', label: 'Ed448 + X448 (OpenPGP v6)', family: 'v6', v6: true, options: { type: 'curve448' } },
];

export const DEFAULT_ALGORITHM: AlgorithmId = 'curve25519';

export const isAlgorithm = (value: unknown): value is AlgorithmId => ALGORITHMS.some((a) => a.id === value);

export interface NewKey {
  name: string;
  email: string;
  comment?: string;
  algorithm: AlgorithmId;
  /** null — never expires. */
  expires: Date | null;
  passphrase: string;
  date?: Date;
}

export interface Generated {
  key: openpgp.PrivateKey;
  /** Armored, kept beside the key as GnuPG keeps one in openpgp-revocs.d. */
  revocation: string;
}

/** Seconds from `from` to `to`, as a key's expiration subpacket counts them; 0 — never. */
function lifetime(from: Date, to: Date | null): number {
  if (!to) return 0;
  const seconds = Math.round((to.getTime() - from.getTime()) / 1000);
  if (seconds <= 0) throw new PgpError('failed', 'The expiry date must be in the future');
  return seconds;
}

export async function generate(spec: NewKey): Promise<Generated> {
  const algorithm = ALGORITHMS.find((a) => a.id === spec.algorithm);
  if (!algorithm) throw new PgpError('failed', `Unknown algorithm ${spec.algorithm}`);
  const date = spec.date ?? new Date();
  const userID: openpgp.UserID = { name: spec.name.trim(), email: spec.email.trim() };
  if (spec.comment?.trim()) userID.comment = spec.comment.trim();
  const { privateKey, revocationCertificate } = await openpgp.generateKey({
    ...algorithm.options,
    userIDs: [userID],
    passphrase: spec.passphrase || undefined,
    keyExpirationTime: lifetime(date, spec.expires),
    date,
    format: 'object',
    config: { v6Keys: algorithm.v6 },
  });
  return { key: privateKey, revocation: revocationCertificate };
}

/* ------------------------------------------------------------------ *
 * Reading input
 * ------------------------------------------------------------------ */

export type Input = string | Uint8Array;

const ARMOR = /^-----BEGIN PGP ([A-Z0-9 ,/]+)-----\r?\n[\s\S]*?^-----END PGP \1-----[ \t]*$/gm;

/**
 * Text if it is ASCII armor — the bytes of a .asc file are, and so is GnuPG's
 * revocation certificate with its guarding colon — the bytes as they are otherwise.
 */
export function normalize(input: Input): Input {
  if (typeof input === 'string') return input;
  const head = new TextDecoder().decode(input.subarray(0, 4096));
  if (/^:?-----BEGIN PGP /m.test(head) && (input[0] ?? 0) < 0x80) return new TextDecoder().decode(input);
  return input;
}

const PACKET = openpgp.enums.packet;

/** The tag of the first packet of binary OpenPGP data, or null if it is not that. */
function firstTag(bytes: Uint8Array): number | null {
  const first = bytes[0];
  if (first === undefined || !(first & 0x80)) return null;
  return first & 0x40 ? first & 0x3f : (first >> 2) & 0x0f;
}

export type Kind =
  /** A message encrypted to keys or a password. */
  | 'encrypted'
  /** A signed message, the signature and the text in one OpenPGP message. */
  | 'signed'
  /** Text signed in the clear: "BEGIN PGP SIGNED MESSAGE". */
  | 'cleartext'
  /** A detached signature, to be checked against a file. */
  | 'signature'
  | 'keys'
  /** A revocation certificate on its own; GnuPG guards it with a colon before the armor. */
  | 'revocation'
  | 'unknown';

/** A packet's tag: the class of each packet carries it. */
const tagOf = (packet: object): number => (packet.constructor as unknown as { tag: number }).tag;

/** The same key, by fingerprint (openpgp.js has hasSameFingerprintAs(), but its types do not). */
const same = (a: openpgp.Key, b: openpgp.Key): boolean => a.getFingerprint() === b.getFingerprint();

const WILDCARD = '0000000000000000';

const ENCRYPTED_TAGS: number[] = [PACKET.publicKeyEncryptedSessionKey, PACKET.symEncryptedSessionKey, PACKET.symEncryptedIntegrityProtectedData, PACKET.aeadEncryptedData, PACKET.symmetricallyEncryptedData];

function isRevocation(signature: openpgp.Signature): boolean {
  return signature.packets.length > 0 && signature.packets.every((p) => p.signatureType === openpgp.enums.signature.keyRevocation);
}

async function readRevocation(input: Input): Promise<openpgp.Signature | null> {
  try {
    if (typeof input === 'string') {
      const block = input.replace(/^:(-----BEGIN PGP )/m, '$1');
      const { data } = await openpgp.unarmor(block);
      const bytes = await new Response(data as ReadableStream<Uint8Array>).arrayBuffer().catch(() => null);
      const binary = bytes ? new Uint8Array(bytes) : (data as unknown as Uint8Array);
      const signature = await openpgp.readSignature({ binarySignature: binary });
      return isRevocation(signature) ? signature : null;
    }
    const signature = await openpgp.readSignature({ binarySignature: input });
    return isRevocation(signature) ? signature : null;
  } catch {
    return null;
  }
}

/** What the data is, by its armor or its first packet; an armored message is looked into to tell encrypted from signed. */
export async function classify(raw: Input): Promise<Kind> {
  const input = normalize(raw);
  if (typeof input === 'string') {
    const header = /^(:?)-----BEGIN PGP ([A-Z0-9 ,/]+)-----/m.exec(input);
    if (!header) return 'unknown';
    const type = header[2] ?? '';
    if (header[1] === ':' || type === 'SIGNATURE' || type === 'PUBLIC KEY BLOCK') {
      if (await readRevocation(input)) return 'revocation';
    }
    if (type === 'SIGNED MESSAGE') return 'cleartext';
    if (type === 'SIGNATURE') return 'signature';
    if (type === 'PUBLIC KEY BLOCK' || type === 'PRIVATE KEY BLOCK') return 'keys';
    if (type.startsWith('MESSAGE')) {
      try {
        const message = await openpgp.readMessage({ armoredMessage: input });
        return message.packets.some((p) => ENCRYPTED_TAGS.includes(tagOf(p))) ? 'encrypted' : 'signed';
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  }
  const tag = firstTag(input);
  if (tag === PACKET.publicKey || tag === PACKET.secretKey) return 'keys';
  if (tag === PACKET.signature) return (await readRevocation(input)) ? 'revocation' : 'signature';
  if (tag === PACKET.publicKeyEncryptedSessionKey || tag === PACKET.symEncryptedSessionKey || tag === PACKET.marker) {
    return 'encrypted';
  }
  if (tag === PACKET.onePassSignature || tag === PACKET.compressedData || tag === PACKET.literalData) {
    // GnuPG compresses a signed file, and an encrypted one never starts so: a look inside tells.
    try {
      const message = await openpgp.readMessage({ binaryMessage: input });
      return message.packets.some((p) => ENCRYPTED_TAGS.includes(tagOf(p))) ? 'encrypted' : 'signed';
    } catch {
      return 'unknown';
    }
  }
  return 'unknown';
}

export interface ParsedKeys {
  keys: openpgp.Key[];
  /** Revocation certificates, to be applied to keys already in the keyring. */
  revocations: openpgp.Signature[];
  /** What could not be read, as openpgp.js put it. */
  problems: string[];
}

/**
 * Every key and revocation certificate in `raw`: one armored block or several
 * pasted one after the other, or binary keys as `gpg --export` writes them.
 * GnuPG's revocation certificate is read only when `revocations` is set — its
 * colon is there so that nobody imports one by accident.
 */
export async function parseKeys(raw: Input, { revocations: takeRevocations = false } = {}): Promise<ParsedKeys> {
  const input = normalize(raw);
  const result: ParsedKeys = { keys: [], revocations: [], problems: [] };
  const take = async (read: () => Promise<openpgp.Key[]>, block: Input): Promise<void> => {
    try {
      result.keys.push(...(await read()));
    } catch (error) {
      const revocation = await readRevocation(block);
      if (revocation) result.revocations.push(revocation);
      else result.problems.push(reason(error));
    }
  };
  if (typeof input !== 'string') {
    await take(() => openpgp.readKeys({ binaryKeys: input }), input);
    return result;
  }
  const text = takeRevocations ? input.replace(/^:(-----BEGIN PGP )/gm, '$1') : input;
  for (const [block, type] of text.matchAll(ARMOR)) {
    if (type === 'PUBLIC KEY BLOCK' || type === 'PRIVATE KEY BLOCK') await take(() => openpgp.readKeys({ armoredKeys: block }), block);
    else if (type === 'SIGNATURE') {
      const revocation = await readRevocation(block);
      if (revocation) result.revocations.push(revocation);
    }
  }
  if (!takeRevocations) result.revocations = [];
  return result;
}

/* ------------------------------------------------------------------ *
 * Encrypting and signing
 * ------------------------------------------------------------------ */

export interface EncryptSpec {
  /** Text from the notepad, or a file's bytes. */
  data: Input;
  filename?: string;
  recipients: openpgp.PublicKey[];
  /** Symmetric encryption, alone or beside the recipients. */
  passwords?: string[];
  /** Unlocked secret keys: the message is signed too. */
  signers?: openpgp.PrivateKey[];
  armor: boolean;
}

async function messageOf(data: Input, filename?: string): Promise<openpgp.Message<Uint8Array> | openpgp.Message<string>> {
  if (typeof data === 'string') return openpgp.createMessage({ text: data, filename });
  return openpgp.createMessage({ binary: data, filename, format: 'binary' });
}

export async function encrypt(spec: EncryptSpec): Promise<Input> {
  if (!spec.recipients.length && !spec.passwords?.length) throw new PgpError('failed', 'No recipients and no password');
  const message = await messageOf(spec.data, spec.filename);
  const options = {
    message,
    encryptionKeys: spec.recipients,
    passwords: spec.passwords?.length ? spec.passwords : undefined,
    signingKeys: spec.signers?.length ? spec.signers : undefined,
  };
  try {
    return spec.armor ? await openpgp.encrypt({ ...options, format: 'armored' }) : await openpgp.encrypt({ ...options, format: 'binary' });
  } catch (error) {
    throw new PgpError('failed', reason(error));
  }
}

export type SignMode = 'clear' | 'inline' | 'detached';

export interface SignSpec {
  data: Input;
  filename?: string;
  signers: openpgp.PrivateKey[];
  /** Clear signing is for text only; it is always armored. */
  mode: SignMode;
  armor: boolean;
}

export async function sign(spec: SignSpec): Promise<Input> {
  try {
    if (spec.mode === 'clear') {
      const text = typeof spec.data === 'string' ? spec.data : new TextDecoder().decode(spec.data);
      return await openpgp.sign({ message: await openpgp.createCleartextMessage({ text }), signingKeys: spec.signers, format: 'armored' });
    }
    const options = { message: await messageOf(spec.data, spec.filename), signingKeys: spec.signers, detached: spec.mode === 'detached' };
    return spec.armor ? await openpgp.sign({ ...options, format: 'armored' }) : await openpgp.sign({ ...options, format: 'binary' });
  } catch (error) {
    throw new PgpError('failed', reason(error));
  }
}

/* ------------------------------------------------------------------ *
 * Decrypting and verifying
 * ------------------------------------------------------------------ */

export interface OpenContext {
  /** Every public key in the keyring: signatures are checked against them. */
  verificationKeys: openpgp.PublicKey[];
  /** The secret keys in the keyring, still locked. */
  secretKeys: openpgp.PrivateKey[];
  /** The key unlocked — asking for its passphrase if need be — or null when the user gave up. */
  unlock(key: openpgp.PrivateKey): Promise<openpgp.PrivateKey | null>;
  /** The password of a symmetrically encrypted message; `again` after a wrong one. Null — the user gave up. */
  password(again: boolean): Promise<string | null>;
}

export type SignatureStatus = 'good' | 'bad' | 'missing';

export interface SignatureCheck {
  status: SignatureStatus;
  /** The key that made it, as the signature names it. */
  keyId: string;
  /** The keyring's key it belongs to; null when the keyring has none. */
  fingerprint: string | null;
  created: number | null;
  /** Why a bad signature is bad, as openpgp.js put it. */
  error: string | null;
}

export interface Opened {
  kind: 'encrypted' | 'signed' | 'cleartext' | 'signature';
  data: Uint8Array;
  /** The data as text, when it is valid UTF-8. */
  text: string | null;
  /** The name the sender's program wrote into the message; may be empty. */
  filename: string;
  signatures: SignatureCheck[];
  /** Key IDs the message was encrypted to. */
  recipients: string[];
  /** The fingerprint of the key that decrypted it, 'password', or null when it was not encrypted. */
  decryptedWith: string | 'password' | null;
}

/**
 * The data as text, when it is valid UTF-8. A text message carries its lines
 * ended with CR LF, as OpenPGP's canonical form wants; shown, they end as the
 * notepad's own do.
 */
const asText = (data: Uint8Array): string | null => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/\r\n/g, '\n');
  } catch {
    return null;
  }
};

async function checkSignatures(results: openpgp.VerifyMessageResult['signatures'], keys: openpgp.PublicKey[]): Promise<SignatureCheck[]> {
  const checks: SignatureCheck[] = [];
  for (const result of results) {
    const signer = keys.find((key) => key.getKeys(result.keyID).length > 0) ?? null;
    let created: number | null = null;
    try {
      created = (await result.signature).packets[0]?.created?.getTime() ?? null;
    } catch {
      /* a signature that cannot even be read is reported as bad below */
    }
    const check: SignatureCheck = {
      status: 'missing',
      keyId: hex(result.keyID.toHex()),
      fingerprint: signer ? hex(signer.getFingerprint()) : null,
      created,
      error: null,
    };
    if (signer) {
      try {
        await result.verified;
        check.status = 'good';
      } catch (error) {
        check.status = 'bad';
        check.error = reason(error);
      }
    } else {
      // Let the promise settle quietly: openpgp.js rejects it for the missing key.
      result.verified.catch(() => undefined);
    }
    checks.push(check);
  }
  return checks;
}

async function readAnyMessage(input: Input): Promise<openpgp.Message<Uint8Array> | openpgp.Message<string>> {
  try {
    return typeof input === 'string' ? await openpgp.readMessage({ armoredMessage: input }) : await openpgp.readMessage({ binaryMessage: input });
  } catch (error) {
    throw new PgpError('corrupt', reason(error));
  }
}

const isWrongPassword = (error: unknown): boolean => /Session key decryption failed|Error decrypting message/i.test(reason(error));

async function decryptMessage(input: Input, ctx: OpenContext): Promise<Opened> {
  const probe = await readAnyMessage(input);
  const keyIds = probe.getEncryptionKeyIDs();
  const recipients = keyIds.map((id) => hex(id.toHex()));
  const anyone = keyIds.some((id) => id.toHex() === WILDCARD);
  const withPassword = probe.packets.some((p) => tagOf(p) === PACKET.symEncryptedSessionKey);

  const holds = (key: openpgp.PrivateKey): boolean =>
    key.getKeys().some((part) => 'isDummy' in part.keyPacket && !part.keyPacket.isDummy() && (anyone || keyIds.some((id) => part.getKeyID().equals(id))));
  const candidates = ctx.secretKeys.filter(holds);

  const finish = async (decrypted: openpgp.DecryptMessageResult & { data: Uint8Array }, by: string): Promise<Opened> => ({
    kind: 'encrypted',
    data: decrypted.data,
    text: asText(decrypted.data),
    filename: decrypted.filename ?? '',
    signatures: await checkSignatures(decrypted.signatures, ctx.verificationKeys),
    recipients,
    decryptedWith: by,
  });

  let last: unknown = null;
  // A prompt closed is that key given up, not the message: another key, or the password, may still open it.
  let declined = false;
  for (const key of candidates) {
    const unlocked = await ctx.unlock(key);
    if (!unlocked) {
      declined = true;
      continue;
    }
    try {
      const decrypted = await openpgp.decrypt({ message: await readAnyMessage(input), decryptionKeys: unlocked, verificationKeys: ctx.verificationKeys, format: 'binary' });
      return await finish(decrypted, hex(key.getFingerprint()));
    } catch (error) {
      // A wildcard recipient may be some other key: try the next one.
      last = error;
    }
  }
  if (withPassword) {
    for (let again = false; ; again = true) {
      const password = await ctx.password(again);
      if (password === null) throw new PgpError('cancelled');
      try {
        const decrypted = await openpgp.decrypt({ message: await readAnyMessage(input), passwords: password, verificationKeys: ctx.verificationKeys, format: 'binary' });
        return await finish(decrypted, 'password');
      } catch (error) {
        if (!isWrongPassword(error)) throw new PgpError('corrupt', reason(error));
      }
    }
  }
  if (last) throw new PgpError('corrupt', reason(last));
  if (declined) throw new PgpError('cancelled');
  throw new PgpError('no-secret-key', 'No secret key for this message', recipients);
}

/**
 * Decrypts and verifies whatever `raw` is. A detached signature needs the
 * signed data as `signed`; without it the error is need-data.
 */
export async function open(raw: Input, ctx: OpenContext, signed?: Uint8Array): Promise<Opened> {
  const input = normalize(raw);
  const kind = await classify(input);
  switch (kind) {
    case 'encrypted':
      return decryptMessage(input, ctx);
    case 'signed': {
      const message = await readAnyMessage(input);
      try {
        const verified = await openpgp.verify({ message, verificationKeys: ctx.verificationKeys, format: 'binary' });
        const data = verified.data;
        return {
          kind: 'signed',
          data,
          text: asText(data),
          filename: message.getFilename() ?? '',
          signatures: await checkSignatures(verified.signatures, ctx.verificationKeys),
          recipients: [],
          decryptedWith: null,
        };
      } catch (error) {
        throw new PgpError('corrupt', reason(error));
      }
    }
    case 'cleartext': {
      try {
        const message = await openpgp.readCleartextMessage({ cleartextMessage: input as string });
        const verified = await openpgp.verify({ message, verificationKeys: ctx.verificationKeys });
        const text = message.getText();
        return {
          kind: 'cleartext',
          data: new TextEncoder().encode(text),
          text,
          filename: '',
          signatures: await checkSignatures(verified.signatures, ctx.verificationKeys),
          recipients: [],
          decryptedWith: null,
        };
      } catch (error) {
        throw new PgpError('corrupt', reason(error));
      }
    }
    case 'signature': {
      if (!signed) throw new PgpError('need-data');
      try {
        const signature = typeof input === 'string' ? await openpgp.readSignature({ armoredSignature: input }) : await openpgp.readSignature({ binarySignature: input });
        const message = await openpgp.createMessage({ binary: signed });
        const verified = await openpgp.verify({ message, signature, verificationKeys: ctx.verificationKeys, format: 'binary' });
        return {
          kind: 'signature',
          data: signed,
          text: asText(signed),
          filename: '',
          signatures: await checkSignatures(verified.signatures, ctx.verificationKeys),
          recipients: [],
          decryptedWith: null,
        };
      } catch (error) {
        throw new PgpError('corrupt', reason(error));
      }
    }
    default:
      throw new PgpError('not-pgp');
  }
}

/* ------------------------------------------------------------------ *
 * Secret keys
 * ------------------------------------------------------------------ */

/** Every secret part of the key is usable as it is: no passphrase to ask for. */
export const isUnlocked = (key: openpgp.PrivateKey): boolean =>
  key.getKeys().every((part) => !('isDummy' in part.keyPacket) || part.keyPacket.isDummy() || part.keyPacket.isDecrypted());

export async function unlock(key: openpgp.PrivateKey, passphrase: string): Promise<openpgp.PrivateKey> {
  if (isUnlocked(key)) return key;
  try {
    return await openpgp.decryptKey({ privateKey: key, passphrase });
  } catch (error) {
    if (/incorrect key passphrase|passphrase/i.test(reason(error))) throw new PgpError('bad-passphrase', reason(error));
    throw new PgpError('failed', reason(error));
  }
}

/** The same key under a new passphrase; an empty one leaves the secret unprotected. */
export async function changePassphrase(unlocked: openpgp.PrivateKey, passphrase: string): Promise<openpgp.PrivateKey> {
  const copy = await openpgp.readPrivateKey({ binaryKey: unlocked.write() });
  if (!passphrase) return copy;
  return openpgp.encryptKey({ privateKey: copy, passphrase });
}

/* ------------------------------------------------------------------ *
 * Changing a key
 *
 * A key is changed by adding signatures, never by taking any away: a new
 * self-signature with another expiry date, a revocation, a certification.
 * Each is made here with the primary key, then merged into the stored key
 * by openpgp.js's update(), so the secret parts stay encrypted as they were
 * and everything other people signed stays on the key. openpgp.js's own
 * reformatKey() would do the first part, but it writes every self-signature
 * anew with its own key flags and preferences: an authentication subkey from
 * GnuPG would come out as an encryption one.
 * ------------------------------------------------------------------ */

const SIG = openpgp.enums.signature;
const HASH = openpgp.enums.hash;

/**
 * A digest that suits the signing key: as long as its curve for ECDSA,
 * SHA-512 otherwise — what GnuPG picks for keys it makes.
 */
function hashFor(key: openpgp.AnyKeyPacket): openpgp.enums.hash {
  const { curve } = key.getAlgorithmInfo();
  if (curve === 'nistP256' || curve === 'brainpoolP256r1' || curve === 'secp256k1') return HASH.sha256;
  if (curve === 'nistP384' || curve === 'brainpoolP384r1') return HASH.sha384;
  return HASH.sha512;
}

/** The fields of a self-signature that carry its meaning; a copy of them makes a new one say the same. */
const CARRIED = [
  'keyFlags',
  'features',
  'preferredSymmetricAlgorithms',
  'preferredHashAlgorithms',
  'preferredCompressionAlgorithms',
  'preferredAEADAlgorithms',
  'preferredCipherSuites',
  'keyServerPreferences',
  'preferredKeyServer',
  'isPrimaryUserID',
  'policyURI',
  'revocable',
  'revocationKeyClass',
  'revocationKeyAlgorithm',
  'revocationKeyFingerprint',
  'embeddedSignature',
] as const;

type Fields = Partial<Record<(typeof CARRIED)[number] | 'keyExpirationTime' | 'keyNeverExpires' | 'reasonForRevocationFlag' | 'reasonForRevocationString', unknown>>;

async function makeSignature(
  signer: openpgp.PrivateKey,
  type: openpgp.enums.signature,
  data: object,
  fields: Fields,
  date: Date,
): Promise<openpgp.SignaturePacket> {
  const signature = new openpgp.SignaturePacket();
  Object.assign(signature, fields);
  signature.signatureType = type;
  signature.publicKeyAlgorithm = signer.keyPacket.algorithm;
  signature.hashAlgorithm = hashFor(signer.keyPacket);
  // sign() takes the configuration fifth, though its types stop at four; without it a v4 signature throws.
  const signWith = signature.sign as (key: openpgp.SecretKeyPacket, data: object, date: Date, detached: boolean, config: openpgp.Config) => Promise<void>;
  await signWith.call(signature, signer.keyPacket as openpgp.SecretKeyPacket, data, date, false, openpgp.config);
  return signature;
}

function carried(from: openpgp.SignaturePacket | null): Fields {
  const fields: Fields = {};
  if (!from) return fields;
  for (const name of CARRIED) {
    const value = (from as unknown as Record<string, unknown>)[name];
    if (value !== null && value !== undefined) fields[name] = value;
  }
  return fields;
}

async function latestValid<T extends { created: Date | null }>(signatures: T[], valid: (sig: T) => Promise<boolean>): Promise<T | null> {
  const sorted = [...signatures].sort((a, b) => (b.created?.getTime() ?? 0) - (a.created?.getTime() ?? 0));
  for (const sig of sorted) if (await valid(sig)) return sig;
  return null;
}

/**
 * A public key made only of the packets given — the primary key, the parts
 * changed and their new signatures — for update() to merge into the real one.
 */
function patch(key: openpgp.Key, parts: (openpgp.UserIDPacket | openpgp.PublicSubkeyPacket | openpgp.SecretSubkeyPacket | openpgp.SignaturePacket)[], direct: openpgp.SignaturePacket[] = []): openpgp.PublicKey {
  const list = new openpgp.PacketList<openpgp.AnyPacket>();
  list.push(key.toPublic().keyPacket, ...direct, ...parts);
  return new openpgp.PublicKey(list);
}

/**
 * The time for a new signature on `key`: strictly after every signature it
 * has, to the second. Signatures count time in whole seconds, and of two
 * self-signatures from the same second openpgp.js and GnuPG may each keep the
 * older one — a key changed right after it was made would not change. So when
 * the key was signed this very second, this waits for the next one.
 */
async function signingTime(key: openpgp.Key): Promise<Date> {
  const all: openpgp.SignaturePacket[] = [
    ...key.revocationSignatures,
    ...((key as unknown as { directSignatures?: openpgp.SignaturePacket[] }).directSignatures ?? []),
    ...key.users.flatMap((user) => [...user.selfCertifications, ...user.otherCertifications, ...user.revocationSignatures]),
    ...key.subkeys.flatMap((subkey) => [...subkey.bindingSignatures, ...subkey.revocationSignatures]),
  ];
  const newest = Math.max(0, ...all.map((sig) => sig.created?.getTime() ?? 0));
  while (Math.floor(Date.now() / 1000) * 1000 <= newest) await new Promise((resolve) => setTimeout(resolve, 1000 - (Date.now() % 1000) + 5));
  return new Date();
}

/** GnuPG's placeholder for a primary secret key kept elsewhere: nothing to sign with. */
const isStub = (key: openpgp.PrivateKey): boolean => (key.keyPacket as openpgp.SecretKeyPacket).isDummy();

function needsUnlocked(locked: openpgp.PrivateKey, unlocked: openpgp.PrivateKey): void {
  if (!same(locked, unlocked)) throw new PgpError('failed', 'Not the same key');
  if (isStub(unlocked) || !unlocked.keyPacket.isDecrypted()) throw new PgpError('failed', 'The primary secret key is not available');
}

const userIdData = (key: openpgp.Key, user: openpgp.User): object => ({ userID: user.userID, key: key.keyPacket });

/**
 * A revocation's reason as openpgp.js writes it: one byte per character, though
 * it reads it back as UTF-8 — so the text goes in as its UTF-8 bytes.
 */
const reasonText = (text: string): string => String.fromCharCode(...new TextEncoder().encode(text));

/**
 * New self-signatures with a new expiry date for the key, every user ID and
 * every subkey not revoked — as `gpg --quick-set-expire <fpr> <date> '*'`.
 */
export async function setExpiration(locked: openpgp.PrivateKey, unlocked: openpgp.PrivateKey, expires: Date | null): Promise<openpgp.PrivateKey> {
  needsUnlocked(locked, unlocked);
  const date = await signingTime(locked);
  const key = locked.toPublic();
  if (expires && expires.getTime() <= date.getTime()) throw new PgpError('failed', 'The expiry date must be in the future');
  // Counted from the creation of the key, or of the subkey; no subpacket at all means never.
  // openpgp.js reads keyNeverExpires, which it sets only when it parses a signature.
  const expiry = (created: Date): Fields => (expires ? { keyExpirationTime: lifetime(created, expires), keyNeverExpires: false } : {});
  const keyCreated = key.getCreationTime();
  const parts: (openpgp.UserIDPacket | openpgp.PublicSubkeyPacket | openpgp.SignaturePacket)[] = [];
  const direct: openpgp.SignaturePacket[] = [];

  const directSignatures = (key as unknown as { directSignatures: openpgp.SignaturePacket[] }).directSignatures ?? [];
  const lastDirect = await latestValid(directSignatures, async (sig) => {
    try {
      await sig.verify(key.keyPacket, SIG.key, { key: key.keyPacket }, date, false, openpgp.config);
      return true;
    } catch {
      return false;
    }
  });
  // A v6 key states its expiry on a signature over the key itself.
  if (lastDirect || key.keyPacket.version === 6) {
    direct.push(await makeSignature(unlocked, SIG.key, { key: unlocked.keyPacket }, { ...carried(lastDirect), ...expiry(keyCreated) }, date));
  }
  for (const user of key.users) {
    if (!user.userID) continue;
    const self = await latestValid(user.selfCertifications, async (sig) => {
      try {
        await sig.verify(key.keyPacket, sig.signatureType ?? SIG.certPositive, userIdData(key, user), date, false, openpgp.config);
        return true;
      } catch {
        return false;
      }
    });
    // Revoked by the key itself, not merely carrying someone's withdrawn certification or an unchecked copy.
    if (!self || (await user.isRevoked(self, undefined, date, openpgp.config).catch(() => false))) continue;
    parts.push(user.userID, await makeSignature(unlocked, self.signatureType ?? SIG.certPositive, { userID: user.userID, key: unlocked.keyPacket }, { ...carried(self), ...(key.keyPacket.version === 6 ? {} : expiry(keyCreated)) }, date));
  }
  for (const subkey of key.subkeys) {
    const binding = await latestValid(subkey.bindingSignatures, async (sig) => {
      try {
        await sig.verify(key.keyPacket, SIG.subkeyBinding, { key: key.keyPacket, bind: subkey.keyPacket }, date, false, openpgp.config);
        return true;
      } catch {
        return false;
      }
    });
    if (!binding || (await subkey.isRevoked(binding, key.keyPacket, date, openpgp.config).catch(() => false))) continue;
    parts.push(subkey.keyPacket as openpgp.PublicSubkeyPacket, await makeSignature(unlocked, SIG.subkeyBinding, { key: unlocked.keyPacket, bind: subkey.keyPacket }, { ...carried(binding), ...expiry(subkey.getCreationTime()) }, date));
  }
  return locked.update(patch(key, parts, direct), date);
}

/** A new user ID, signed with the same preferences as the primary one. */
export async function addUserId(locked: openpgp.PrivateKey, unlocked: openpgp.PrivateKey, userId: openpgp.UserID): Promise<openpgp.PrivateKey> {
  needsUnlocked(locked, unlocked);
  const packet = openpgp.UserIDPacket.fromObject({ name: userId.name?.trim(), email: userId.email?.trim(), comment: userId.comment?.trim() || undefined });
  if (locked.users.some((user) => user.userID?.userID === packet.userID)) throw new PgpError('failed', 'The key has this user ID already');
  const key = locked.toPublic();
  const date = await signingTime(locked);
  const parts: (openpgp.UserIDPacket | openpgp.SignaturePacket)[] = [];
  let fields: Fields = {};
  try {
    const { user, selfCertification } = await key.getPrimaryUser(date);
    fields = { ...carried(selfCertification), isPrimaryUserID: null };
    const expires = selfCertification.keyExpirationTime;
    if (expires) Object.assign(fields, { keyExpirationTime: expires, keyNeverExpires: false });
    // Without the flag the newest self-signature makes its user ID the primary one, here and
    // in GnuPG: the one that was primary says so explicitly before the new one is signed.
    if (!selfCertification.isPrimaryUserID && user.userID) {
      const restated = { ...carried(selfCertification), isPrimaryUserID: true };
      if (expires) Object.assign(restated, { keyExpirationTime: expires, keyNeverExpires: false });
      parts.push(user.userID, await makeSignature(unlocked, selfCertification.signatureType ?? SIG.certPositive, { userID: user.userID, key: unlocked.keyPacket }, restated, date));
    }
  } catch {
    fields = { keyFlags: [openpgp.enums.keyFlags.certifyKeys | openpgp.enums.keyFlags.signData] };
  }
  parts.push(packet, await makeSignature(unlocked, SIG.certPositive, { userID: packet, key: unlocked.keyPacket }, fields, date));
  return locked.update(patch(key, parts), date);
}

export interface Revocation {
  /** RFC 9580's reasons: 0 none given, 1 superseded, 2 compromised, 3 no longer used; 32 for a user ID no longer valid. */
  flag: number;
  text: string;
}

/** Marks one user ID as no longer valid, as `gpg --quick-revoke-uid`. */
export async function revokeUserId(locked: openpgp.PrivateKey, unlocked: openpgp.PrivateKey, userId: string, why: Revocation): Promise<openpgp.PrivateKey> {
  needsUnlocked(locked, unlocked);
  const date = await signingTime(locked);
  const key = locked.toPublic();
  const user = key.users.find((u) => u.userID?.userID === userId);
  if (!user?.userID) throw new PgpError('failed', 'No such user ID');
  const signature = await makeSignature(unlocked, SIG.certRevocation, { userID: user.userID, key: unlocked.keyPacket }, { reasonForRevocationFlag: why.flag, reasonForRevocationString: reasonText(why.text) }, date);
  return locked.update(patch(key, [user.userID, signature]), date);
}

async function keyRevocation(unlocked: openpgp.PrivateKey, why: Revocation, date: Date): Promise<openpgp.SignaturePacket> {
  return makeSignature(unlocked, SIG.keyRevocation, { key: unlocked.keyPacket }, { reasonForRevocationFlag: why.flag, reasonForRevocationString: reasonText(why.text) }, date);
}

/** Revokes the key itself. Once published, it cannot be taken back. */
export async function revoke(locked: openpgp.PrivateKey, unlocked: openpgp.PrivateKey, why: Revocation): Promise<openpgp.PrivateKey> {
  needsUnlocked(locked, unlocked);
  const date = await signingTime(locked);
  return locked.update(patch(locked, [], [await keyRevocation(unlocked, why, date)]), date);
}

/** A revocation certificate to keep aside, as GnuPG writes into openpgp-revocs.d: the key stays as it is. */
export async function revocationCertificate(unlocked: openpgp.PrivateKey, why: Revocation, date = new Date()): Promise<string> {
  const list = new openpgp.PacketList<openpgp.SignaturePacket>();
  list.push(await keyRevocation(unlocked, why, date));
  return openpgp.armor(openpgp.enums.armor.publicKey, list.write(), undefined, undefined, 'This is a revocation certificate');
}

/** Applies a revocation certificate made by the key's owner. */
export async function applyRevocation(key: openpgp.Key, certificate: openpgp.Signature): Promise<openpgp.Key> {
  const signature = certificate.packets[0];
  if (!signature) throw new PgpError('failed', 'Empty revocation certificate');
  try {
    await signature.verify(key.keyPacket, SIG.keyRevocation, { key: key.keyPacket }, undefined, false, openpgp.config);
  } catch (error) {
    throw new PgpError('failed', reason(error));
  }
  const updated = await key.update(patch(key, [], [signature]));
  return updated;
}

/**
 * Certifies user IDs of someone else's key with the primary key of `signer`,
 * as `gpg --quick-sign-key`: saying "I checked that this key is theirs".
 * openpgp.js's own certify() signs with the newest signing subkey, which other
 * programs do not accept for a certification.
 */
export async function certify(target: openpgp.Key, signer: openpgp.PrivateKey, userIds: string[]): Promise<openpgp.Key> {
  if (isStub(signer) || !signer.keyPacket.isDecrypted()) throw new PgpError('failed', 'The primary secret key is not available');
  if (same(target, signer)) throw new PgpError('failed', 'A key does not certify itself');
  const key = target.toPublic();
  const date = await signingTime(target);
  const parts: (openpgp.UserIDPacket | openpgp.SignaturePacket)[] = [];
  for (const user of key.users) {
    if (!user.userID || !userIds.includes(user.userID.userID)) continue;
    parts.push(user.userID, await makeSignature(signer, SIG.certGeneric, { userID: user.userID, key: key.keyPacket }, {}, date));
  }
  if (!parts.length) throw new PgpError('failed', 'No such user ID');
  return target.update(patch(key, parts), date);
}

/** Which user IDs of `key` the given keys certified, and still do: user ID → fingerprints of those keys. */
export async function certifiedBy(key: openpgp.Key, certifiers: openpgp.PublicKey[], date = new Date()): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const user of key.users) {
    if (!user.userID) continue;
    const by: string[] = [];
    for (const certification of user.otherCertifications) {
      for (const certifier of certifiers) {
        // Made by the certifier's primary key, as a certification must be. openpgp.js's own
        // verifyCertificate() also wants that key to sign data, which a GnuPG [C] key does not.
        if (same(certifier, key) || !certifier.keyPacket.getKeyID().equals(certification.issuerKeyID)) continue;
        try {
          await certification.verify(certifier.keyPacket, SIG.certGeneric, userIdData(key, user), date, false, openpgp.config);
          if (await user.isRevoked(certification, certifier.keyPacket, date, openpgp.config)) continue;
          by.push(hex(certifier.getFingerprint()));
        } catch {
          /* expired, or made by another key with the same ID */
        }
      }
    }
    if (by.length) out.set(user.userID.userID, [...new Set(by)]);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

/** Several keys in one armored block, or one binary file, as `gpg --export` writes them. */
export function exportKeys(keys: openpgp.Key[], { armor, secret }: { armor: boolean; secret: boolean }): Input {
  const parts = keys.map((key) => (secret ? key : key.toPublic()).write());
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    bytes.set(part, at);
    at += part.length;
  }
  if (!armor) return bytes;
  return openpgp.armor(secret ? openpgp.enums.armor.privateKey : openpgp.enums.armor.publicKey, bytes);
}

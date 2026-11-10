/**
 * ASCII armor as text, apart from openpgp.js: the extension's worker needs
 * this much, and not the library.
 */

/**
 * ASCII armor whose line breaks were turned into spaces — as Chrome's context
 * menu hands over a selection — put back on its lines. The armor's headers
 * are dropped: they are optional and not checked. Text that is not such armor
 * is returned as it is; a clear-signed text cannot be mended, its own lines
 * being lost.
 */
export function reflowArmor(text: string): string {
  if (/\n/.test(text.trim())) return text;
  const match = /-----BEGIN PGP (MESSAGE|PUBLIC KEY BLOCK|PRIVATE KEY BLOCK|SIGNATURE)-----(.*?)-----END PGP \1-----/s.exec(text);
  if (!match) return text;
  const tokens = (match[2] ?? '').trim().split(/\s+/).filter(Boolean);
  const checksum = tokens.length && /^=[A-Za-z0-9+/]{4}$/.test(tokens[tokens.length - 1]!) ? tokens.pop()! : null;
  const body: string[] = [];
  while (tokens.length && /^[A-Za-z0-9+/=]+$/.test(tokens[tokens.length - 1]!)) body.unshift(tokens.pop()!);
  return [`-----BEGIN PGP ${match[1]}-----`, '', ...body, ...(checksum ? [checksum] : []), `-----END PGP ${match[1]}-----`, ''].join('\n');
}

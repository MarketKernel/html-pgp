#!/usr/bin/env bash
# Writes tests/fixtures/gnupg/: keys, messages and signatures made by GnuPG — what Kleopatra
# would hand over — which tests/pgp.mjs must read. Run once by hand; the files are committed and
# the tests never call gpg themselves. A throwaway GNUPGHOME keeps the user's own keyring out of it.
set -euo pipefail
cd "$(dirname "$0")/.."
out=tests/fixtures/gnupg
mkdir -p "$out"
export GNUPGHOME=$(mktemp -d)
trap 'gpgconf --kill all >/dev/null 2>&1; rm -rf "$GNUPGHOME"' EXIT
g() { gpg --batch --yes --pinentry-mode loopback "$@"; }

g --passphrase 'alice passphrase' --quick-gen-key 'Alice Example <alice@example.org>' ed25519 sign,cert never
ALICE=$(gpg --list-keys --with-colons alice@example.org | awk -F: '/^fpr/ { print $10; exit }')
g --passphrase 'alice passphrase' --quick-add-key "$ALICE" cv25519 encr never
g --passphrase 'bob passphrase' --quick-gen-key 'Bob Example <bob@example.org>' rsa3072 sign,cert never
BOB=$(gpg --list-keys --with-colons bob@example.org | awk -F: '/^fpr/ { print $10; exit }')
g --passphrase 'bob passphrase' --quick-add-key "$BOB" rsa3072 encr never
# Bob vouches for Alice's user ID: a certification by another key.
g --passphrase 'bob passphrase' -u "$BOB" --quick-sign-key "$ALICE" 'Alice Example <alice@example.org>'

g --armor --export "$ALICE" > "$out/alice-public.asc"
g --passphrase 'alice passphrase' --armor --export-secret-keys "$ALICE" > "$out/alice-secret.asc"
g --armor --export "$BOB" > "$out/bob-public.asc"
g --passphrase 'bob passphrase' --armor --export-secret-keys "$BOB" > "$out/bob-secret.asc"
g --export "$BOB" > "$out/bob-public.gpg"
cp "$GNUPGHOME/openpgp-revocs.d/$BOB.rev" "$out/bob-revocation.rev"

printf 'Привет, Alice! The meeting is at 10.\n' > "$out/message.txt"
g --passphrase 'bob passphrase' -u "$BOB" --trust-model always --armor -r "$ALICE" --sign --encrypt -o "$out/to-alice-signed-by-bob.asc" "$out/message.txt"
g --trust-model always -r "$BOB" --encrypt -o "$out/to-bob.gpg" "$out/message.txt"
g --passphrase 'bob passphrase' -u "$BOB" --armor --clearsign -o "$out/clearsigned-by-bob.asc" "$out/message.txt"
g --passphrase 'alice passphrase' -u "$ALICE" --detach-sign -o "$out/message.txt.sig" "$out/message.txt"
g --passphrase 'correct horse battery staple' --armor --symmetric -o "$out/symmetric.asc" "$out/message.txt"

gpg --version | head -1 > "$out/VERSION"
ls -l "$out"

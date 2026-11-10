# html-pgp

<!-- languages -->
<h3 align="center">
<b>🇬🇧 English</b> ·
<a href="docs/readme/README.zh.md">🇨🇳 中文</a> ·
<a href="docs/readme/README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="docs/readme/README.es.md">🇪🇸 Español</a> ·
<a href="docs/readme/README.fr.md">🇫🇷 Français</a> ·
<a href="docs/readme/README.ar.md">🇸🇦 العربية</a> ·
<a href="docs/readme/README.bn.md">🇧🇩 বাংলা</a> ·
<a href="docs/readme/README.pt.md">🇧🇷 Português</a> ·
<a href="docs/readme/README.ru.md">🇷🇺 Русский</a> ·
<a href="docs/readme/README.ur.md">🇵🇰 اردو</a> ·
<a href="docs/readme/README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="docs/readme/README.de.md">🇩🇪 Deutsch</a> ·
<a href="docs/readme/README.ja.md">🇯🇵 日本語</a> ·
<a href="docs/readme/README.mr.md">🇮🇳 मराठी</a> ·
<a href="docs/readme/README.te.md">🇮🇳 తెలుగు</a> ·
<a href="docs/readme/README.tr.md">🇹🇷 Türkçe</a> ·
<a href="docs/readme/README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

**HTML PGP** is an OpenPGP key manager and encryption tool in the spirit of
[Kleopatra](https://apps.kde.org/kleopatra/), the certificate manager that comes with GnuPG —
in one standalone HTML file. It keeps a keyring of your own key pairs and other people's
public keys, makes new keys (RSA, Curve25519, NIST and Brainpool curves, OpenPGP v6 Ed25519
and Ed448), certifies keys, and encrypts, signs, decrypts and verifies text and files.

It speaks the same OpenPGP as GnuPG and Kleopatra: keys, messages and signatures go both
ways, and the tests check it against GnuPG itself.

Everything works offline: no account, no server, no network requests — the page has no
network access at all. Keys are kept in the browser; secret keys stay encrypted with their
passphrases, which are never stored. The same page is also a [PWA](#github-pages) that
installs as an app and a [Chrome extension](#chrome-extension) that opens beside your tabs.

![HTML PGP: the keyring and a key's details](docs/screenshot.png)

## How to use

Build `build/html-pgp.html` (see "[Build](#build)") and open it in a browser — straight from
disk is fine. Or use the PWA from GitHub Pages, or the extension.

The app has three views, as Kleopatra has: **Keys**, **Notepad** and **Files**, and
**Settings**.

### Keys

- **New key pair** — your name and email address, and a passphrase that protects the secret
  key. Under "Algorithm and validity": the algorithm (see "[Algorithms](#algorithms)") and how
  long the key is valid — three years by default, as GnuPG and Kleopatra make them. After the
  key is made, the app offers to back it up at once: the keyring lives in this browser only.
- **Import** — from a file (`.asc`, `.gpg`, `.key`…, one or several keys in each, armored or
  binary), from the clipboard, or pasted as text. Files dropped on the keys view are imported
  too. A key already in the keyring is merged: new user IDs, subkeys and signatures join it,
  and a secret key joins its public key. A GnuPG revocation certificate (`.rev`) is imported
  only after you confirm it: it revokes the key for good.
- **Export** — the selected public keys, as text (`.asc`) or binary (`.gpg`), to a file or
  the clipboard. Several keys can be selected with ⌘/Ctrl and Shift.
- The list shows each key's name, address, validity, expiry date and key ID; search finds
  keys by name, address, key ID or fingerprint, and the filter shows your key pairs,
  certified keys, keys nobody certified, or expired and revoked ones.

A key's details show its fingerprint in groups of four, as GnuPG prints it, its user IDs and
who certified them, the primary key and the subkeys with their algorithms, usage and dates,
and the public key as text. For your own keys the ⋯ menu also has:

- **Change expiry** — a new date for the key and its subkeys, or none. Share the public key
  again afterwards, so others see it.
- **Add user ID** — another name or address for the same key. The primary one stays primary.
- **Change passphrase** — the current one is asked first, even while it is remembered. An
  empty one leaves the key unprotected, after a warning.
- **Back up secret key** — the secret key, still under its passphrase, as
  `Name_0xKEYID_SECRET.asc`. The passphrase is asked first, so the backup is known to open.
- **Revocation certificate** — the one made with the key, to keep apart from it: if the key
  is lost or stolen, import the certificate and share the revoked key.
- **Revoke key**, and **revoke** one of several user IDs.

### Certifying

Certifying a key says "I checked that this key belongs to this person". Check the fingerprint
with its owner first — in person, or on a call where you know their voice — then press
**Certify** in the key's details and choose the user IDs. The certification is made with
your key's primary key, as GnuPG makes it, and GnuPG accepts it.

Validity follows Kleopatra's simplest reading of the web of trust: your own keys are trusted
ultimately; a key you certified is **Certified**; any other key works, but is marked **Not
certified** wherever it is used — in the list, among the recipients, and on a signature it
made.

### Notepad

Type a message, choose the **recipients** — found by name, address or key ID as you type —
and press **Encrypt**, or **Sign and encrypt** when a key is chosen under "Sign as". "Encrypt
to me too" adds your own key, so you can read what you sent. "Encrypt with a password" adds a
password anyone can decrypt with, beside the recipients or instead of them. **Sign only**
makes a clear-signed text: still readable, with the signature below it.

Paste an encrypted or signed message and press **Decrypt / verify**: the text is decrypted in
place — the passphrase of your key is asked when needed — and every signature on it is
checked: good, bad (the text was changed), or made by a key that is not in your keyring.
"Show the original text" goes back. ⌘/Ctrl+Enter decrypts a message, or encrypts plain text.
A pasted key is offered for import.

### Files

Add files with the button or drop them on the window. Each one is looked at to tell what it
is: a plain file, an encrypted one, a signed one, a detached signature, keys or a revocation
certificate.

- **Sign / encrypt** — for the plain files: sign as one of your keys, encrypt for you, for
  others, with a password, or any of these together. Encrypted files get `.gpg` (or `.asc` as
  text); signing alone makes a detached signature, `.sig` (or `.asc`), beside each file.
- **Decrypt / verify** — for the rest. A detached signature finds the file it signs by its
  name (`report.pdf.sig` goes with `report.pdf`), or asks for it. Decrypted files are named
  after the encrypted ones without `.gpg`.
- **Import keys** — for key files dropped here.

Each result is saved with its own button, or all at once.

### Passphrases

A secret key unlocked once stays unlocked for a while, as gpg-agent keeps it: 10 minutes by
default, from "ask every time" to four hours in the settings. Only the decrypted key is kept,
in the page's memory — never the passphrase, never on disk. **Forget passphrases** in the
menu locks them all at once; reloading the page does too.

### On a phone

The page works on a phone: one screen at a time, the views in a tab bar at the bottom, a
key's details on a screen of their own with a back button — the system's back gesture works
too — and menus rising from the bottom. On iOS a saved file goes to the share sheet, where
"Save to Files" is.

## Algorithms

| Choice | GnuPG names | Notes |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | The default, as in GnuPG and Kleopatra: short, fast, read everywhere. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA and ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA and ECDH; common in German and European use. |
| RSA 2048, 3072, 4096 | rsa2048… | The oldest and most widely read; a few seconds to make. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | RFC 9580 keys. **GnuPG and Kleopatra cannot read them yet.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | RFC 9580 keys, as above. |

Each key is a primary key that certifies and signs and a subkey that encrypts, as GnuPG makes
them. Keys of other algorithms — DSA and ElGamal from old GnuPG keyrings, for one — are read
and used; only new ones are not made of them. secp256k1 is left out: openpgp.js refuses it
unless told otherwise.

## Compatibility with GnuPG and Kleopatra

`tests/gnupg.mjs` runs GnuPG itself, in a throwaway home directory, against what the app
writes, and `tests/pgp.mjs` reads what GnuPG wrote (`tests/fixtures/gnupg/`, made once by
`tools/gnupg-fixtures.sh`). Checked both ways:

- keys of every v4 algorithm made here are imported by GnuPG, with their usage, and used:
  GnuPG decrypts our messages and checks our signatures, and we decrypt what GnuPG encrypts
  to them;
- GnuPG sees our new expiry dates, added and revoked user IDs, certifications of other keys
  and revocation certificates;
- GnuPG's keys, messages (including its OCB-encrypted ones), clear-signed texts, detached
  signatures, password-encrypted messages and revocation certificates are read here.

To bring your keys over from Kleopatra: select your key pair → Export secret keys (or "Backup
secret keys"), and import the file here; public keys of others the same way with Export.
Back from here: export the public key, or back up the secret key, and import the file in
Kleopatra.

## Chrome extension

The same app in Chrome's side panel, beside the page you are reading. The toolbar button
opens it. Select an encrypted or signed text on any page — in a webmail, a forum, a text
field — and choose **Decrypt / verify with HTML PGP** in the context menu: it opens in the
panel's notepad, decrypted and checked. **Encrypt with HTML PGP** hands the selected text over
for you to choose the recipients.

The extension asks for as little as it can: the side panel, the context menu, its own
storage, and the tab you click in (activeTab) — to read the selection with its line breaks,
which the context menu itself loses. It has no access to any website otherwise, and its
pages, like the app's, have no network access. Where a page cannot be read (Chrome's own
pages, the Web Store, a PDF), the menu's own copy of the selection is used and its armor put
back on its lines.

The extension keeps a keyring of its own: browsers keep each origin's data apart, so the
single file, the PWA and the extension each have theirs. Move keys between them by export
and import, or with a backup.

Build it with `npm run build` and load `build/extension/` in `chrome://extensions` (Developer
mode → Load unpacked), or take `build/html-pgp-extension-<version>.zip` for the Chrome Web
Store.

## Security

- **Nothing leaves the page.** Its Content-Security-Policy has `connect-src 'none'` and
  `default-src 'none'`: no fetch, no images or fonts from elsewhere, no forms posting out.
  Everything is inlined — styles, openpgp.js, icons. The build fails on any external `src` or
  `href`, and CI checks the built file again. The PWA's copy may load its own manifest,
  service worker and icons; the extension's pages have the same policy in its manifest.
- **Secret keys are stored encrypted.** The keyring lives in the browser's IndexedDB, one
  record per key, as openpgp.js armors it: a secret key stays encrypted with its passphrase
  (AES-256, the key derived from the passphrase by an iterated and salted S2K, as GnuPG does)
  and is decrypted only in memory, when needed. The passphrase is never stored. A key without
  a passphrase is marked so in its details.
- **Unlocked keys are forgotten** after the time set in the settings, on "Forget
  passphrases", and when the page closes.
- **Passphrase fields are text inputs on purpose**, with transparent text and dots drawn over
  it. On macOS a password field turns on Secure Input, which forces a Latin keyboard layout:
  a passphrase in Cyrillic, Greek or Arabic could not be typed. The field gives the browser no
  such hint, still hides what is typed, and will not copy it.
- **Signatures are judged by the keys you trust.** A good signature from a key nobody
  certified says so, and why to check its fingerprint.
- **The browser is the trusted base.** Anything that can run code in this page or read the
  browser's profile — a malicious extension with access to all sites, malware on the
  computer — can read what the page can. Keep backups of your secret keys elsewhere:
  clearing the browser's data deletes the keyring.

## Features

- Keyring in IndexedDB, shared by the windows of the app on this origin; a change in one
  window shows in the others.
- New key pairs of twelve kinds, with an expiry date and a revocation certificate made with
  them.
- Import of armored and binary keys, several at once, merged with what is there; GnuPG
  revocation certificates on confirmation.
- Export of public keys, backup of secret keys, one or all.
- Certifying others' keys; validity from your own certifications.
- Changing your key: expiry, user IDs, passphrase, revocation — by adding signatures, as
  GnuPG does, so the key stays readable everywhere and others' certifications stay on it.
- Notepad: encrypt, sign, sign and encrypt, encrypt with a password, decrypt, verify.
- Files: the same for files, detached signatures, several files at once.
- Passphrases remembered for a while, in memory only.
- Light and dark theme, following the system or chosen.
- 17 languages, Arabic and Urdu right to left.
- A phone layout; the PWA installs on a phone or a computer and works offline.
- Files opened with the installed PWA from the Finder or Explorer come into its files view.
- A Chrome extension with the context menu for selected text.

## Keyboard shortcuts

| Keys | |
| --- | --- |
| ⌘/Ctrl+F | Search keys |
| ⇧⌘N / Shift+Ctrl+N | New key pair |
| ⇧⌘I / Shift+Ctrl+I | Import |
| ↑ ↓, Home, End | Move in the key list |
| ⌘/Ctrl+A | Select all keys in the list |
| Delete | Delete the selected keys |
| ⌘/Ctrl+Enter | In the notepad: decrypt a message, or encrypt plain text |
| Esc | Close a dialog or a menu |

## Translations

The interface speaks English and 16 more languages: Chinese, Hindi, Spanish, French, Arabic,
Bengali, Portuguese, Russian, Urdu, Indonesian, German, Japanese, Marathi, Telugu, Turkish
and Ukrainian. It follows the browser's language unless one is chosen in the settings.
Arabic and Urdu are laid out right to left.

The English text lives in the code: `t('context', 'English text')`, or
`tn('context', '{count} key', '{count} keys', n)` for a text with a number, with plain string
literals — `tools/i18n.mjs` finds them with a regular expression. In the template,
`data-i18n` translates an element's text and `data-i18n-attr` its title, placeholder and
aria-label. Each language is a dictionary, `src/locales/<code>.json`:
`{ "context": { "English text": "translation" } }`, plural forms by `Intl.PluralRules`. A
string a dictionary lacks is shown in English.

`npm run i18n` prints, per language, the strings a dictionary lacks and the ones it has but
the interface no longer uses; `npm test` checks the dictionaries: no stale keys, the same
placeholders, every plural form, each context once. What Chrome shows of the extension
itself — its name, description and button title — comes from the same dictionaries, context
`manifest`.

## Build

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ and its zip
npm run watch          # rebuilds on every change
./build.sh             # the same, installing the dependencies on the first run
```

`build.mjs` bundles `src/app/main.ts` with esbuild into one script and inlines it, the styles
and the icon into `src/app/template.html`. openpgp.js is the one runtime dependency.

```sh
npm run check          # everything below, in order
npm run typecheck      # tsc --noEmit
npm test               # unit tests in Node; tests/gnupg.mjs needs gpg, and says so without it
npm run test:browser   # the page, the PWA and the extension in headless Chrome
npm run shots -- DIR   # screenshots of every main screen into DIR
npm run icons          # the PNG icons, drawn from assets/*.svg
```

The browser tests drive a local Chrome over the DevTools protocol, with no dependencies
beyond Node; `CHROME=/path/to/chrome` picks one.

## Versions and releases

The version lives in `package.json` only. A build of the commit tagged `v<version>` shows it
as it is; any other build adds the commit — `0.1.0+1a2b3c4` — so a page built from `main` is
not taken for a release. To release: `npm version minor && git push --follow-tags`. The
release workflow checks that the tag matches `package.json`, runs the tests, and attaches
`html-pgp-<tag>.html`, `html-pgp-extension-<tag>.zip` and `SHA256SUMS.txt`.

## GitHub Pages

`build/pages/` is the same page as an installable PWA: a manifest, icons and a service
worker that keeps it working offline once opened. `.github/workflows/pages.yml` builds and
tests it on every push to `main` and deploys it to GitHub Pages (Settings → Pages → Source:
GitHub Actions); it is then at `https://<owner>.github.io/html-pgp/`.

The page still reaches nothing: its policy lets in only its own manifest, worker and icons.
A new deploy installs beside the running version and waits; Settings shows "Version X is
ready" with an Update button, and a dot marks the settings. The installed app also opens
`.gpg`, `.pgp`, `.sig` and `.asc` files from the system (Open With), into its files view.

## Layout

```text
build.mjs                 the build: the single file, the PWA, the extension and its zip
src/core/                 no DOM — runs in Node under the tests
  pgp.ts                  every OpenPGP operation, over openpgp.js
  keys.ts                 what a key is, as the interface shows it
  keyring.ts              the keyring: storage, import and merging, trust
  armor.ts                ASCII armor mended from one line
  i18n.ts                 languages and the lookup of strings
src/app/                  the page
  template.html           the markup, with the CSP
  styles.css              all of the styles
  main.ts                 start-up, views, shortcuts, files dropped, other windows
  keylist.ts              the keys view: list, search, filter, selection
  details.ts              one key in full
  keyactions.ts           the dialogs: new key, import, export, certify, changes, delete
  notepad.ts, files.ts    the notepad and the files view
  recipients.ts           choosing recipients
  outcome.ts              what decrypting and verifying found, in words
  agent.ts                passphrases and unlocked keys
  settings.ts             preferences in localStorage; settingsview.ts the view
  store.ts                IndexedDB, and news of changes from other windows
  save.ts                 files to save, the clipboard
  ui.ts, screens.ts       dialogs, menus, toasts; one screen at a time on a phone
  update.ts, platform.ts  PWA updates; what the extension adds
src/extension/            manifest, background worker, the panel's platform, grab.ts
src/pwa/sw.js             the PWA's service worker
src/locales/              16 dictionaries
tests/                    pgp, keyring, gnupg, i18n in Node; app and extension in Chrome
tests/fixtures/gnupg/     keys, messages and signatures made by GnuPG
tools/                    load.mjs, chrome.mjs, i18n.mjs, shots.mjs, icons.mjs, gnupg-fixtures.sh
```

## Limitations

- No key servers or WKD: the page has no network access by design. Exchange keys as files
  or text.
- No smartcards or hardware tokens. Keys whose secret primary key is kept elsewhere (GnuPG's
  stubs) are read, and their subkeys work; such a key cannot be changed here.
- No S/MIME or X.509 certificates — OpenPGP only.
- Trust is direct: certifications by your own keys. GnuPG's owner trust — trusting others'
  certifications — is not modelled.
- Files are read whole into memory: fine for documents and photos, not for gigabytes.
- The single file, the PWA and the extension each keep their own keyring (see "[Chrome
  extension](#chrome-extension)").
- OpenPGP v6 keys are not read by GnuPG or Kleopatra yet.

## License

MIT — see [LICENSE](LICENSE). The build includes [OpenPGP.js](https://openpgpjs.org/), under
the GNU Lesser General Public License 3.0 or later; its notice is kept at the top of the
bundled script, and its source is at https://github.com/openpgpjs/openpgpjs.

# html-pgp

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<b>🇩🇪 Deutsch</b> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

**HTML PGP** ist ein OpenPGP-Schlüsselmanager und Verschlüsselungswerkzeug im Geiste von
[Kleopatra](https://apps.kde.org/kleopatra/), dem Zertifikatsmanager, der zu GnuPG gehört –
in einer einzigen eigenständigen HTML-Datei. Es führt einen Schlüsselbund mit Ihren eigenen
Schlüsselpaaren und den öffentlichen Schlüsseln anderer, erstellt neue Schlüssel (RSA,
Curve25519, NIST- und Brainpool-Kurven, OpenPGP v6 Ed25519 und Ed448), beglaubigt Schlüssel
und verschlüsselt, signiert, entschlüsselt und prüft Texte und Dateien.

Es spricht dasselbe OpenPGP wie GnuPG und Kleopatra: Schlüssel, Nachrichten und Signaturen
lassen sich in beide Richtungen austauschen, und die Tests prüfen das gegen GnuPG selbst.

Alles funktioniert offline: kein Konto, kein Server, keine Netzwerkanfragen – die Seite hat
überhaupt keinen Netzwerkzugriff. Die Schlüssel bleiben im Browser; geheime Schlüssel bleiben
mit ihren Passphrasen verschlüsselt, die nie gespeichert werden. Dieselbe Seite ist auch eine
[PWA](#github-pages), die sich wie eine App installieren lässt, und eine
[Chrome-Erweiterung](#chrome-erweiterung), die sich neben Ihren Tabs öffnet.

![HTML PGP: der Schlüsselbund und die Details eines Schlüssels](../screenshot.png)

## Verwendung

Erstellen Sie `build/html-pgp.html` (siehe „[Build](#build)“) und öffnen Sie die Datei in
einem Browser – direkt von der Festplatte geht es auch. Oder nutzen Sie die PWA von GitHub
Pages oder die Erweiterung.

Die App hat drei Ansichten, wie Kleopatra: **Schlüssel**, **Notizen** und **Dateien**, dazu
die **Optionen**.

### Schlüssel

- **Neues Schlüsselpaar** – Ihr Name und Ihre E-Mail-Adresse sowie eine Passphrase, die den
  geheimen Schlüssel schützt. Unter „Algorithmus und Gültigkeit“: der Algorithmus (siehe
  „[Algorithmen](#algorithmen)“) und die Gültigkeitsdauer des Schlüssels – standardmäßig drei
  Jahre, wie GnuPG und Kleopatra sie erstellen. Nach der Erstellung bietet die App sofort an,
  den Schlüssel zu sichern: Der Schlüsselbund liegt nur in diesem Browser.
- **Importieren** – aus einer Datei (`.asc`, `.gpg`, `.key` …, mit einem oder mehreren
  Schlüsseln, als Text oder binär), aus der Zwischenablage oder als eingefügter Text. Auch
  Dateien, die auf die Schlüsselansicht gezogen werden, werden importiert. Ein Schlüssel, der
  bereits im Schlüsselbund ist, wird zusammengeführt: Neue Benutzerkennungen, Unterschlüssel
  und Signaturen kommen hinzu, und ein geheimer Schlüssel gesellt sich zu seinem öffentlichen
  Schlüssel. Ein GnuPG-Widerrufszertifikat (`.rev`) wird erst nach Ihrer Bestätigung
  importiert: Es widerruft den Schlüssel endgültig.
- **Exportieren** – die ausgewählten öffentlichen Schlüssel, als Text (`.asc`) oder binär
  (`.gpg`), in eine Datei oder in die Zwischenablage. Mehrere Schlüssel lassen sich mit
  ⌘/Strg und Umschalt auswählen.
- Die Liste zeigt Name, Adresse, Gültigkeit, Ablaufdatum und Schlüssel-ID jedes Schlüssels;
  die Suche findet Schlüssel nach Name, Adresse, Schlüssel-ID oder Fingerabdruck, und der
  Filter zeigt Ihre Schlüsselpaare, beglaubigte Schlüssel, Schlüssel, die niemand beglaubigt
  hat, oder abgelaufene und widerrufene.

Die Details eines Schlüssels zeigen seinen Fingerabdruck in Vierergruppen, wie GnuPG ihn
ausgibt, seine Benutzerkennungen und wer sie beglaubigt hat, den Hauptschlüssel und die
Unterschlüssel mit Algorithmen, Verwendung und Daten sowie den öffentlichen Schlüssel als
Text. Für Ihre eigenen Schlüssel bietet das Menü ⋯ außerdem:

- **Ablaufdatum ändern** – ein neues Datum für den Schlüssel und seine Unterschlüssel, oder
  keines. Geben Sie den öffentlichen Schlüssel danach erneut weiter, damit andere es sehen.
- **Benutzerkennung hinzufügen** – ein weiterer Name oder eine weitere Adresse für
  denselben Schlüssel. Die primäre bleibt primär.
- **Passphrase ändern** – die aktuelle wird zuerst abgefragt, auch wenn sie gemerkt wird. Eine
  leere Passphrase lässt den Schlüssel nach einer Warnung ungeschützt.
- **Geheimen Schlüssel sichern** – der geheime Schlüssel, weiterhin durch seine Passphrase
  geschützt, als `Name_0xKEYID_SECRET.asc`. Die Passphrase wird zuerst abgefragt, damit
  feststeht, dass sich die Sicherung öffnen lässt.
- **Widerrufszertifikat** – das mit dem Schlüssel erstellte, getrennt von ihm aufzubewahren:
  Wenn der Schlüssel verloren geht oder gestohlen wird, importieren Sie das Zertifikat und
  geben den widerrufenen Schlüssel weiter.
- **Schlüssel widerrufen** sowie das Widerrufen einer von mehreren Benutzerkennungen.

### Beglaubigen

Einen Schlüssel zu beglaubigen heißt: „Ich habe geprüft, dass dieser Schlüssel dieser Person
gehört.“ Prüfen Sie zuerst den Fingerabdruck mit dem Besitzer – persönlich oder in einem
Anruf, bei dem Sie seine Stimme erkennen –, drücken Sie dann in den Details des Schlüssels
auf **Beglaubigen** und wählen Sie die Benutzerkennungen. Die Beglaubigung wird mit dem
Hauptschlüssel Ihres Schlüssels erstellt, wie GnuPG es tut, und GnuPG akzeptiert sie.

Die Gültigkeit folgt Kleopatras einfachster Lesart des Web of Trust: Ihren eigenen
Schlüsseln wird uneingeschränkt vertraut; ein Schlüssel, den Sie beglaubigt haben, ist
**Beglaubigt**; jeder andere Schlüssel funktioniert, ist aber überall, wo er verwendet wird,
als **Nicht beglaubigt** gekennzeichnet – in der Liste, unter den Empfängern und bei einer
Signatur, die er erstellt hat.

### Notizen

Geben Sie eine Nachricht ein, wählen Sie die **Empfänger** – beim Tippen nach Name, Adresse
oder Schlüssel-ID gefunden – und drücken Sie **Verschlüsseln**, oder **Signieren und
verschlüsseln**, wenn unter „Signieren als“ ein Schlüssel gewählt ist. „Auch für mich
verschlüsseln“ fügt Ihren eigenen Schlüssel hinzu, damit Sie lesen können, was Sie
gesendet haben. „Mit einem Passwort verschlüsseln“ fügt ein Passwort hinzu, mit dem jeder
entschlüsseln kann, zusätzlich zu den Empfängern oder an deren Stelle. **Nur signieren**
erzeugt einen Klartext mit Signatur: weiterhin lesbar, mit der Signatur darunter.

Fügen Sie eine verschlüsselte oder signierte Nachricht ein und drücken Sie **Entschlüsseln /
prüfen**: Der Text wird an Ort und Stelle entschlüsselt – die Passphrase Ihres Schlüssels
wird bei Bedarf abgefragt – und jede Signatur darauf wird geprüft: gültig, ungültig (der
Text wurde verändert) oder von einem Schlüssel erstellt, der nicht in Ihrem Schlüsselbund
ist. „Originaltext anzeigen“ führt zurück. ⌘/Strg+Enter entschlüsselt eine Nachricht oder
verschlüsselt normalen Text. Ein eingefügter Schlüssel wird zum Import angeboten.

### Dateien

Fügen Sie Dateien über die Schaltfläche hinzu oder ziehen Sie sie auf das Fenster. Jede wird
daraufhin untersucht, was sie ist: eine normale Datei, eine verschlüsselte, eine signierte,
eine abgetrennte Signatur, Schlüssel oder ein Widerrufszertifikat.

- **Signieren / verschlüsseln** – für die normalen Dateien: signieren als einer Ihrer
  Schlüssel, für sich selbst verschlüsseln, für andere, mit einem Passwort oder beliebig
  kombiniert. Verschlüsselte Dateien erhalten `.gpg` (oder `.asc` als Text); reines Signieren
  erzeugt neben jeder Datei eine abgetrennte Signatur, `.sig` (oder `.asc`).
- **Entschlüsseln / prüfen** – für die übrigen. Eine abgetrennte Signatur findet die Datei,
  die sie signiert, anhand ihres Namens (`report.pdf.sig` gehört zu `report.pdf`) oder
  fragt danach. Entschlüsselte Dateien heißen wie die verschlüsselten ohne `.gpg`.
- **Schlüssel importieren** – für hier abgelegte Schlüsseldateien.

Jedes Ergebnis wird mit seiner eigenen Schaltfläche gespeichert, oder alle auf einmal.

### Passphrasen

Ein einmal entsperrter geheimer Schlüssel bleibt eine Weile entsperrt, wie gpg-agent ihn
hält: standardmäßig 10 Minuten, in den Optionen einstellbar von „Jedes Mal fragen“ bis zu
vier Stunden. Gemerkt wird nur der entschlüsselte Schlüssel, im Speicher der Seite – nie die
Passphrase, nie auf der Festplatte. **Passphrasen vergessen** im Menü sperrt alle auf
einmal; das Neuladen der Seite ebenfalls.

### Auf dem Smartphone

Die Seite funktioniert auf dem Smartphone: ein Bildschirm nach dem anderen, die Ansichten in
einer Tab-Leiste unten, die Details eines Schlüssels auf einem eigenen Bildschirm mit
Zurück-Schaltfläche – auch die Zurück-Geste des Systems funktioniert – und Menüs, die von
unten aufsteigen. Unter iOS geht eine gespeicherte Datei an das Share Sheet, wo „In Dateien
sichern“ zu finden ist.

## Algorithmen

| Auswahl | GnuPG-Namen | Hinweise |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | Die Voreinstellung, wie in GnuPG und Kleopatra: kurz, schnell, überall lesbar. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA und ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA und ECDH; im deutschen und europäischen Raum verbreitet. |
| RSA 2048, 3072, 4096 | rsa2048… | Der älteste und am weitesten gelesene; die Erstellung dauert einige Sekunden. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | RFC-9580-Schlüssel. **GnuPG und Kleopatra können sie noch nicht lesen.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | RFC-9580-Schlüssel, wie oben. |

Jeder Schlüssel besteht aus einem Hauptschlüssel, der beglaubigt und signiert, und einem
Unterschlüssel, der verschlüsselt, wie GnuPG sie erstellt. Schlüssel anderer Algorithmen –
etwa DSA und ElGamal aus alten GnuPG-Schlüsselbunden – werden gelesen und verwendet; nur
neue werden davon nicht erstellt. secp256k1 ist ausgelassen: openpgp.js lehnt ihn ab, wenn
man es nicht anders einstellt.

## Kompatibilität mit GnuPG und Kleopatra

`tests/gnupg.mjs` lässt GnuPG selbst in einem Wegwerf-Home-Verzeichnis gegen das laufen, was
die App schreibt, und `tests/pgp.mjs` liest, was GnuPG geschrieben hat
(`tests/fixtures/gnupg/`, einmal von `tools/gnupg-fixtures.sh` erstellt). In beide Richtungen
geprüft:

- Hier erstellte Schlüssel aller v4-Algorithmen werden von GnuPG samt ihrer Verwendung
  importiert und benutzt: GnuPG entschlüsselt unsere Nachrichten und prüft unsere
  Signaturen, und wir entschlüsseln, was GnuPG für sie verschlüsselt;
- GnuPG erkennt unsere neuen Ablaufdaten, hinzugefügte und widerrufene Benutzerkennungen,
  Beglaubigungen anderer Schlüssel und Widerrufszertifikate;
- GnuPGs Schlüssel, Nachrichten (auch die mit OCB verschlüsselten), Klartext-Signaturen,
  abgetrennte Signaturen, mit Passwort verschlüsselte Nachrichten und Widerrufszertifikate
  werden hier gelesen.

So übernehmen Sie Ihre Schlüssel aus Kleopatra: Wählen Sie Ihr Schlüsselpaar → Geheime
Schlüssel exportieren (oder „Backup secret keys“) und importieren Sie die Datei hier; die
öffentlichen Schlüssel anderer ebenso mit Exportieren. Von hier zurück: den öffentlichen
Schlüssel exportieren oder den geheimen Schlüssel sichern und die Datei in Kleopatra
importieren.

## Chrome-Erweiterung

Dieselbe App im Seitenbereich von Chrome, neben der Seite, die Sie lesen. Die
Symbolleisten-Schaltfläche öffnet sie. Markieren Sie auf einer beliebigen Seite – in einem
Webmailer, einem Forum, einem Textfeld – einen verschlüsselten oder signierten Text und
wählen Sie im Kontextmenü **Mit HTML PGP entschlüsseln / prüfen**: Er öffnet sich in den
Notizen des Seitenbereichs, entschlüsselt und geprüft. **Mit HTML PGP verschlüsseln** übergibt
den markierten Text, damit Sie die Empfänger wählen.

Die Erweiterung verlangt so wenig wie möglich: den Seitenbereich, das Kontextmenü, einen
eigenen Speicher und den Tab, in den Sie klicken (activeTab) – um die Markierung mit ihren
Zeilenumbrüchen zu lesen, die das Kontextmenü selbst verliert. Auf keine Website hat sie
sonst Zugriff, und ihre Seiten haben wie die der App keinen Netzwerkzugriff. Wo eine Seite
nicht gelesen werden kann (Chromes eigene Seiten, der Web Store, ein PDF), wird die Kopie der
Markierung aus dem Menü verwendet und ihre Armor wieder auf ihre Zeilen gesetzt.

Die Erweiterung führt einen eigenen Schlüsselbund: Browser halten die Daten jedes Origins
getrennt, daher haben die einzelne Datei, die PWA und die Erweiterung je einen eigenen.
Schlüssel lassen sich per Export und Import oder mit einer Sicherung zwischen ihnen
verschieben.

Erstellen Sie sie mit `npm run build` und laden Sie `build/extension/` in
`chrome://extensions` (Entwicklermodus → Entpackte Erweiterung laden), oder nehmen Sie
`build/html-pgp-extension-<version>.zip` für den Chrome Web Store.

## Sicherheit

- **Nichts verlässt die Seite.** Ihre Content-Security-Policy hat `connect-src 'none'` und
  `default-src 'none'`: kein fetch, keine Bilder oder Schriften von anderswo, keine
  Formulare, die nach außen senden. Alles ist eingebettet – Stile, openpgp.js, Icons. Der
  Build schlägt bei jedem externen `src` oder `href` fehl, und die CI prüft die erstellte
  Datei noch einmal. Die Kopie der PWA darf ihr eigenes Manifest, ihren Service Worker und
  ihre Icons laden; die Seiten der Erweiterung haben dieselbe Policy in ihrem Manifest.
- **Geheime Schlüssel werden verschlüsselt gespeichert.** Der Schlüsselbund liegt in der
  IndexedDB des Browsers, ein Eintrag pro Schlüssel, so wie openpgp.js ihn als Armor
  ausgibt: Ein geheimer Schlüssel bleibt mit seiner Passphrase verschlüsselt (AES-256, der
  Schlüssel aus der Passphrase durch ein iteriertes und gesalzenes S2K abgeleitet, wie
  GnuPG es tut) und wird nur im Speicher entschlüsselt, wenn nötig. Die Passphrase wird nie
  gespeichert. Ein Schlüssel ohne Passphrase ist in seinen Details entsprechend markiert.
- **Entsperrte Schlüssel werden vergessen** nach der in den Optionen eingestellten Zeit, bei
  „Passphrasen vergessen“ und wenn die Seite geschlossen wird.
- **Passphrasen-Felder sind absichtlich Textfelder**, mit transparentem Text und darüber
  gezeichneten Punkten. Unter macOS schaltet ein Passwortfeld Secure Input ein, das ein
  lateinisches Tastaturlayout erzwingt: Eine Passphrase in Kyrillisch, Griechisch oder
  Arabisch ließe sich nicht eintippen. Das Feld gibt dem Browser keinen solchen Hinweis,
  verbirgt das Getippte dennoch und lässt sich nicht kopieren.
- **Signaturen werden nach den Schlüsseln beurteilt, denen Sie vertrauen.** Eine gültige
  Signatur eines Schlüssels, den niemand beglaubigt hat, sagt das und warum man seinen
  Fingerabdruck prüfen sollte.
- **Der Browser ist die vertrauenswürdige Basis.** Alles, was Code in dieser Seite ausführen
  oder das Profil des Browsers lesen kann – eine bösartige Erweiterung mit Zugriff auf alle
  Websites, Schadsoftware auf dem Computer –, kann lesen, was die Seite lesen kann.
  Bewahren Sie Sicherungen Ihrer geheimen Schlüssel anderswo auf: Das Löschen der Browserdaten
  löscht den Schlüsselbund.

## Funktionen

- Schlüsselbund in IndexedDB, von den Fenstern der App an diesem Origin gemeinsam genutzt;
  eine Änderung in einem Fenster erscheint in den anderen.
- Neue Schlüsselpaare in zwölf Varianten, mit Ablaufdatum und einem mit ihnen erstellten
  Widerrufszertifikat.
- Import von Schlüsseln als Text und binär, mehrere auf einmal, mit dem Vorhandenen
  zusammengeführt; GnuPG-Widerrufszertifikate nach Bestätigung.
- Export öffentlicher Schlüssel, Sicherung geheimer Schlüssel, einzeln oder alle.
- Beglaubigen fremder Schlüssel; Gültigkeit aus Ihren eigenen Beglaubigungen.
- Ändern Ihres Schlüssels: Ablaufdatum, Benutzerkennungen, Passphrase, Widerruf – durch
  Hinzufügen von Signaturen, wie GnuPG es tut, sodass der Schlüssel überall lesbar bleibt
  und die Beglaubigungen anderer auf ihm bleiben.
- Notizen: verschlüsseln, signieren, signieren und verschlüsseln, mit einem Passwort
  verschlüsseln, entschlüsseln, prüfen.
- Dateien: dasselbe für Dateien, abgetrennte Signaturen, mehrere Dateien auf einmal.
- Passphrasen werden eine Weile gemerkt, nur im Speicher.
- Helles und dunkles Design, dem System folgend oder gewählt.
- 17 Sprachen, Arabisch und Urdu von rechts nach links.
- Ein Smartphone-Layout; die PWA lässt sich auf einem Smartphone oder Computer installieren
  und funktioniert offline.
- Dateien, die mit der installierten PWA aus dem Finder oder Explorer geöffnet werden,
  landen in ihrer Dateiansicht.
- Eine Chrome-Erweiterung mit dem Kontextmenü für markierten Text.

## Tastenkürzel

| Tasten | |
| --- | --- |
| ⌘/Strg+F | Schlüssel suchen |
| ⇧⌘N / Umschalt+Strg+N | Neues Schlüsselpaar |
| ⇧⌘I / Umschalt+Strg+I | Importieren |
| ↑ ↓, Pos1, Ende | In der Schlüsselliste navigieren |
| ⌘/Strg+A | Alle Schlüssel in der Liste auswählen |
| Entf | Die ausgewählten Schlüssel löschen |
| ⌘/Strg+Enter | In den Notizen: eine Nachricht entschlüsseln oder normalen Text verschlüsseln |
| Esc | Einen Dialog oder ein Menü schließen |

## Übersetzungen

Die Oberfläche spricht Englisch und 16 weitere Sprachen: Chinesisch, Hindi, Spanisch,
Französisch, Arabisch, Bengalisch, Portugiesisch, Russisch, Urdu, Indonesisch, Deutsch,
Japanisch, Marathi, Telugu, Türkisch und Ukrainisch. Sie folgt der Sprache des Browsers,
sofern in den Optionen keine gewählt ist. Arabisch und Urdu werden von rechts nach links
gesetzt.

Der englische Text steht im Code: `t('context', 'English text')`, oder
`tn('context', '{count} key', '{count} keys', n)` für einen Text mit einer Zahl, mit einfachen
String-Literalen – `tools/i18n.mjs` findet sie mit einem regulären Ausdruck. In der Vorlage
übersetzt `data-i18n` den Text eines Elements und `data-i18n-attr` dessen title, placeholder
und aria-label. Jede Sprache ist ein Wörterbuch, `src/locales/<code>.json`:
`{ "context": { "English text": "translation" } }`, Pluralformen per `Intl.PluralRules`. Ein
Text, der in einem Wörterbuch fehlt, wird auf Englisch angezeigt.

`npm run i18n` gibt pro Sprache die Texte aus, die einem Wörterbuch fehlen, und die, die es
hat, die die Oberfläche aber nicht mehr verwendet; `npm test` prüft die Wörterbücher: keine
veralteten Schlüssel, dieselben Platzhalter, jede Pluralform, jeder Kontext einmal. Was
Chrome von der Erweiterung selbst zeigt – ihren Namen, ihre Beschreibung und den Titel ihrer
Schaltfläche – stammt aus denselben Wörterbüchern, Kontext `manifest`.

## Build

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ and its zip
npm run watch          # rebuilds on every change
./build.sh             # the same, installing the dependencies on the first run
```

`build.mjs` bündelt `src/app/main.ts` mit esbuild zu einem einzigen Skript und bettet es,
die Stile und das Icon in `src/app/template.html` ein. openpgp.js ist die einzige
Laufzeitabhängigkeit.

```sh
npm run check          # everything below, in order
npm run typecheck      # tsc --noEmit
npm test               # unit tests in Node; tests/gnupg.mjs needs gpg, and says so without it
npm run test:browser   # the page, the PWA and the extension in headless Chrome
npm run shots -- DIR   # screenshots of every main screen into DIR
npm run icons          # the PNG icons, drawn from assets/*.svg
```

Die Browsertests steuern ein lokales Chrome über das DevTools-Protokoll, ohne Abhängigkeiten
außer Node; mit `CHROME=/path/to/chrome` wählen Sie eines aus.

## Versionen und Releases

Die Version steht nur in `package.json`. Ein Build des mit `v<version>` getaggten Commits
zeigt sie unverändert an; jeder andere Build fügt den Commit hinzu – `0.1.0+1a2b3c4` –,
sodass eine von `main` erstellte Seite nicht für ein Release gehalten wird. Für ein Release:
`npm version minor && git push --follow-tags`. Der Release-Workflow prüft, dass der Tag zu
`package.json` passt, führt die Tests aus und hängt `html-pgp-<tag>.html`,
`html-pgp-extension-<tag>.zip` und `SHA256SUMS.txt` an.

## GitHub Pages

`build/pages/` ist dieselbe Seite als installierbare PWA: ein Manifest, Icons und ein
Service Worker, der sie nach dem ersten Öffnen offline funktionsfähig hält.
`.github/workflows/pages.yml` erstellt und testet sie bei jedem Push auf `main` und
veröffentlicht sie auf GitHub Pages (Settings → Pages → Source: GitHub Actions); sie liegt
dann unter `https://<owner>.github.io/html-pgp/`.

Die Seite erreicht weiterhin nichts: Ihre Policy lässt nur ihr eigenes Manifest, ihren
Worker und ihre Icons zu. Ein neues Deployment wird neben der laufenden Version installiert
und wartet; die Optionen zeigen „Version X ist bereit.“ mit einer Schaltfläche Aktualisieren,
und ein Punkt markiert die Optionen. Die installierte App öffnet außerdem `.gpg`-, `.pgp`-,
`.sig`- und `.asc`-Dateien vom System (Öffnen mit) in ihrer Dateiansicht.

## Aufbau

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

## Einschränkungen

- Keine Schlüsselserver oder WKD: Die Seite hat absichtlich keinen Netzwerkzugriff.
  Tauschen Sie Schlüssel als Dateien oder Text aus.
- Keine Smartcards oder Hardware-Token. Schlüssel, deren geheimer Hauptschlüssel anderswo
  liegt (GnuPGs Stubs), werden gelesen, und ihre Unterschlüssel funktionieren; ein solcher
  Schlüssel lässt sich hier nicht ändern.
- Kein S/MIME und keine X.509-Zertifikate – nur OpenPGP.
- Das Vertrauen ist direkt: Beglaubigungen durch Ihre eigenen Schlüssel. GnuPGs Owner Trust –
  das Vertrauen in die Beglaubigungen anderer – ist nicht abgebildet.
- Dateien werden ganz in den Speicher gelesen: in Ordnung für Dokumente und Fotos, nicht für
  Gigabytes.
- Die einzelne Datei, die PWA und die Erweiterung führen jeweils einen eigenen Schlüsselbund
  (siehe „[Chrome-Erweiterung](#chrome-erweiterung)“).
- OpenPGP-v6-Schlüssel werden von GnuPG und Kleopatra noch nicht gelesen.

## Lizenz

MIT – siehe [LICENSE](../../LICENSE). Der Build enthält [OpenPGP.js](https://openpgpjs.org/)
unter der GNU Lesser General Public License 3.0 oder später; sein Hinweis steht am Anfang
des gebündelten Skripts, und sein Quellcode liegt unter https://github.com/openpgpjs/openpgpjs.

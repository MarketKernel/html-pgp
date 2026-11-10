# html-pgp

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<b>🇫🇷 Français</b> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

**HTML PGP** est un gestionnaire de clés et un outil de chiffrement OpenPGP dans l’esprit de
[Kleopatra](https://apps.kde.org/kleopatra/), le gestionnaire de certificats fourni avec
GnuPG — dans un seul fichier HTML autonome. Il tient un trousseau avec vos propres paires de
clés et les clés publiques des autres, crée de nouvelles clés (RSA, Curve25519, courbes NIST
et Brainpool, OpenPGP v6 Ed25519 et Ed448), certifie des clés, et chiffre, signe, déchiffre
et vérifie des textes et des fichiers.

Il parle le même OpenPGP que GnuPG et Kleopatra : clés, messages et signatures passent dans
les deux sens, et les tests le vérifient avec GnuPG lui-même.

Tout fonctionne hors ligne : pas de compte, pas de serveur, aucune requête réseau — la page
n’a aucun accès au réseau. Les clés sont conservées dans le navigateur ; les clés secrètes
restent chiffrées par leurs phrases secrètes, qui ne sont jamais enregistrées. La même page
est aussi une [PWA](#github-pages) qui s’installe comme une application et une
[extension Chrome](#extension-chrome) qui s’ouvre à côté de vos onglets.

![HTML PGP : le trousseau et les détails d’une clé](../screenshot.png)

## Utilisation

Compilez `build/html-pgp.html` (voir « [Compilation](#compilation) ») et ouvrez-le dans un
navigateur — directement depuis le disque, c’est possible. Ou utilisez la PWA depuis GitHub
Pages, ou l’extension.

L’application a trois vues, comme Kleopatra : **Clés**, **Bloc-notes** et **Fichiers**, et
les **Réglages**.

### Clés

- **Nouvelle paire de clés** — votre nom et votre adresse e-mail, et une phrase secrète qui
  protège la clé secrète. Sous « Algorithme et validité » : l’algorithme (voir
  « [Algorithmes](#algorithmes) ») et la durée de validité de la clé — trois ans par défaut,
  comme GnuPG et Kleopatra les créent. Une fois la clé créée, l’application propose de la
  sauvegarder aussitôt : le trousseau n’existe que dans ce navigateur.
- **Importer** — depuis un fichier (`.asc`, `.gpg`, `.key`…, avec une ou plusieurs clés,
  en texte ou en binaire), depuis le presse-papiers, ou collé sous forme de texte. Les
  fichiers déposés sur la vue des clés sont importés eux aussi. Une clé déjà présente dans le
  trousseau est fusionnée : les nouvelles identités, sous-clés et signatures s’y ajoutent, et
  une clé secrète rejoint sa clé publique. Un certificat de révocation GnuPG (`.rev`) n’est
  importé qu’après votre confirmation : il révoque la clé définitivement.
- **Exporter** — les clés publiques sélectionnées, en texte (`.asc`) ou en binaire (`.gpg`),
  vers un fichier ou le presse-papiers. Plusieurs clés peuvent être sélectionnées avec ⌘/Ctrl
  et Maj.
- La liste affiche le nom, l’adresse, la validité, la date d’expiration et l’ID de chaque
  clé ; la recherche trouve les clés par nom, adresse, ID de clé ou empreinte, et le filtre
  montre vos paires de clés, les clés certifiées, les clés que personne n’a certifiées, ou
  celles qui sont expirées et révoquées.

Les détails d’une clé montrent son empreinte en groupes de quatre, comme GnuPG l’affiche, ses
identités et qui les a certifiées, la clé primaire et les sous-clés avec leurs algorithmes,
leur usage et leurs dates, et la clé publique sous forme de texte. Pour vos propres clés, le
menu ⋯ propose aussi :

- **Modifier l’expiration** — une nouvelle date pour la clé et ses sous-clés, ou aucune.
  Partagez de nouveau la clé publique ensuite, pour que les autres la voient.
- **Ajouter une identité** — un autre nom ou une autre adresse pour la même clé. La
  principale reste principale.
- **Changer la phrase secrète** — l’actuelle est demandée d’abord, même si elle est
  mémorisée. Une phrase vide laisse la clé sans protection, après un avertissement.
- **Sauvegarder la clé secrète** — la clé secrète, toujours sous sa phrase secrète, sous le
  nom `Name_0xKEYID_SECRET.asc`. La phrase secrète est demandée d’abord, pour que la
  sauvegarde soit sûre de s’ouvrir.
- **Certificat de révocation** — celui créé avec la clé, à conserver séparément : si la clé
  est perdue ou volée, importez le certificat et partagez la clé révoquée.
- **Révoquer la clé**, et la révocation d’une identité parmi plusieurs.

### Certifier

Certifier une clé, c’est dire « J’ai vérifié que cette clé appartient à cette personne ».
Vérifiez d’abord l’empreinte avec son propriétaire — en personne, ou lors d’un appel où vous
reconnaissez sa voix — puis appuyez sur **Certifier** dans les détails de la clé et choisissez
les identités. La certification est faite avec la clé primaire de votre clé, comme GnuPG la
fait, et GnuPG l’accepte.

La validité suit la lecture la plus simple de Kleopatra du réseau de confiance : vos propres
clés sont de confiance ultime ; une clé que vous avez certifiée est **Certifiée** ; toute
autre clé fonctionne, mais est marquée **Non certifiée** partout où elle est utilisée — dans
la liste, parmi les destinataires, et sur une signature qu’elle a faite.

### Bloc-notes

Saisissez un message, choisissez les **destinataires** — trouvés par nom, adresse ou ID de
clé au fil de la frappe — et appuyez sur **Chiffrer**, ou sur **Signer et chiffrer** lorsqu’une
clé est choisie sous « Signer en tant que ». « Chiffrer aussi pour moi » ajoute votre propre
clé, pour que vous puissiez relire ce que vous avez envoyé. « Chiffrer avec un mot de passe »
ajoute un mot de passe avec lequel n’importe qui peut déchiffrer, en plus des destinataires ou
à leur place. **Signer seulement** produit un texte à signature en clair : toujours lisible,
avec la signature en dessous.

Collez un message chiffré ou signé et appuyez sur **Déchiffrer / vérifier** : le texte est
déchiffré sur place — la phrase secrète de votre clé est demandée au besoin — et chaque
signature qu’il porte est vérifiée : bonne, mauvaise (le texte a été modifié), ou faite par
une clé qui n’est pas dans votre trousseau. « Afficher le texte d’origine » revient en
arrière. ⌘/Ctrl+Entrée déchiffre un message, ou chiffre un texte en clair. Une clé collée est
proposée à l’import.

### Fichiers

Ajoutez des fichiers avec le bouton ou déposez-les sur la fenêtre. Chacun est examiné pour
savoir ce qu’il est : un fichier simple, un fichier chiffré, un fichier signé, une signature
détachée, des clés ou un certificat de révocation.

- **Signer / chiffrer** — pour les fichiers simples : signer avec l’une de vos clés, chiffrer
  pour vous, pour d’autres, avec un mot de passe, ou plusieurs de ces options ensemble. Les
  fichiers chiffrés reçoivent `.gpg` (ou `.asc` en texte) ; signer seul produit une signature
  détachée, `.sig` (ou `.asc`), à côté de chaque fichier.
- **Déchiffrer / vérifier** — pour les autres. Une signature détachée trouve le fichier
  qu’elle signe d’après son nom (`report.pdf.sig` va avec `report.pdf`), ou le demande. Les
  fichiers déchiffrés portent le nom des fichiers chiffrés sans `.gpg`.
- **Importer des clés** — pour les fichiers de clés déposés ici.

Chaque résultat s’enregistre avec son propre bouton, ou tous à la fois.

### Phrases secrètes

Une clé secrète déverrouillée une fois le reste un moment, comme gpg-agent la garde : 10
minutes par défaut, de « Demander à chaque fois » à quatre heures dans les réglages. Seule la
clé déchiffrée est conservée, dans la mémoire de la page — jamais la phrase secrète, jamais
sur le disque. **Oublier les phrases secrètes** dans le menu les verrouille toutes d’un coup ;
recharger la page aussi.

### Sur un téléphone

La page fonctionne sur un téléphone : un écran à la fois, les vues dans une barre d’onglets
en bas, les détails d’une clé sur un écran à part avec un bouton de retour — le geste de
retour du système fonctionne aussi — et des menus qui montent du bas. Sur iOS, un fichier
enregistré passe par la feuille de partage, où se trouve « Enregistrer dans Fichiers ».

## Algorithmes

| Choix | Noms GnuPG | Remarques |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | Le choix par défaut, comme dans GnuPG et Kleopatra : court, rapide, lu partout. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA et ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA et ECDH ; courant en Allemagne et en Europe. |
| RSA 2048, 3072, 4096 | rsa2048… | Le plus ancien et le plus largement lu ; quelques secondes à créer. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | Clés RFC 9580. **GnuPG et Kleopatra ne peuvent pas encore les lire.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | Clés RFC 9580, comme ci-dessus. |

Chaque clé est une clé primaire qui certifie et signe, et une sous-clé qui chiffre, comme
GnuPG les crée. Les clés d’autres algorithmes — DSA et ElGamal des anciens trousseaux GnuPG,
par exemple — sont lues et utilisées ; seules de nouvelles n’en sont pas créées. secp256k1
est écarté : openpgp.js le refuse sauf indication contraire.

## Compatibilité avec GnuPG et Kleopatra

`tests/gnupg.mjs` lance GnuPG lui-même, dans un répertoire personnel jetable, sur ce que
l’application écrit, et `tests/pgp.mjs` lit ce que GnuPG a écrit (`tests/fixtures/gnupg/`,
créé une fois par `tools/gnupg-fixtures.sh`). Vérifié dans les deux sens :

- les clés de chaque algorithme v4 créées ici sont importées par GnuPG, avec leur usage, et
  utilisées : GnuPG déchiffre nos messages et vérifie nos signatures, et nous déchiffrons ce
  que GnuPG chiffre pour elles ;
- GnuPG voit nos nouvelles dates d’expiration, les identités ajoutées et révoquées, les
  certifications d’autres clés et les certificats de révocation ;
- les clés de GnuPG, ses messages (y compris ceux chiffrés en OCB), textes à signature en
  clair, signatures détachées, messages chiffrés par mot de passe et certificats de
  révocation sont lus ici.

Pour apporter vos clés depuis Kleopatra : sélectionnez votre paire de clés → Exporter les
clés secrètes (ou « Backup secret keys »), et importez le fichier ici ; les clés publiques
des autres de même avec Exporter. Pour le retour : exportez la clé publique, ou sauvegardez
la clé secrète, et importez le fichier dans Kleopatra.

## Extension Chrome

La même application dans le panneau latéral de Chrome, à côté de la page que vous lisez. Le
bouton de la barre d’outils l’ouvre. Sélectionnez un texte chiffré ou signé sur n’importe
quelle page — dans une messagerie web, un forum, un champ de texte — et choisissez
**Déchiffrer / vérifier avec HTML PGP** dans le menu contextuel : il s’ouvre dans le
bloc-notes du panneau, déchiffré et vérifié. **Chiffrer avec HTML PGP** transmet le texte
sélectionné pour que vous choisissiez les destinataires.

L’extension demande le strict minimum : le panneau latéral, le menu contextuel, son propre
stockage, et l’onglet dans lequel vous cliquez (activeTab) — pour lire la sélection avec ses
sauts de ligne, que le menu contextuel lui-même perd. Elle n’a sinon accès à aucun site web,
et ses pages, comme celles de l’application, n’ont aucun accès au réseau. Là où une page ne
peut pas être lue (les pages propres à Chrome, le Web Store, un PDF), la copie de la sélection
fournie par le menu est utilisée et son armure remise sur ses lignes.

L’extension tient un trousseau à elle : les navigateurs séparent les données de chaque
origine, si bien que le fichier unique, la PWA et l’extension ont chacun le leur. Déplacez les
clés de l’un à l’autre par export et import, ou avec une sauvegarde.

Compilez-la avec `npm run build` et chargez `build/extension/` dans `chrome://extensions`
(Mode développeur → Charger l’extension non empaquetée), ou prenez
`build/html-pgp-extension-<version>.zip` pour le Chrome Web Store.

## Sécurité

- **Rien ne quitte la page.** Sa Content-Security-Policy contient `connect-src 'none'` et
  `default-src 'none'` : pas de fetch, pas d’images ni de polices venues d’ailleurs, pas de
  formulaires qui envoient vers l’extérieur. Tout est intégré — styles, openpgp.js, icônes.
  La compilation échoue sur tout `src` ou `href` externe, et la CI revérifie le fichier
  compilé. La copie de la PWA peut charger son propre manifeste, son service worker et ses
  icônes ; les pages de l’extension ont la même politique dans son manifeste.
- **Les clés secrètes sont stockées chiffrées.** Le trousseau vit dans l’IndexedDB du
  navigateur, un enregistrement par clé, tel qu’openpgp.js l’arme : une clé secrète reste
  chiffrée par sa phrase secrète (AES-256, la clé étant dérivée de la phrase secrète par un
  S2K itéré et salé, comme le fait GnuPG) et n’est déchiffrée qu’en mémoire, au besoin. La
  phrase secrète n’est jamais enregistrée. Une clé sans phrase secrète est signalée comme
  telle dans ses détails.
- **Les clés déverrouillées sont oubliées** après le délai fixé dans les réglages, avec
  « Oublier les phrases secrètes », et à la fermeture de la page.
- **Les champs de phrase secrète sont volontairement des champs de texte**, avec un texte
  transparent et des points dessinés par-dessus. Sous macOS, un champ de mot de passe active
  Secure Input, qui impose une disposition de clavier latine : une phrase secrète en
  cyrillique, en grec ou en arabe ne pourrait pas être saisie. Le champ ne donne pas cette
  indication au navigateur, masque toujours ce qui est saisi, et ne se laisse pas copier.
- **Les signatures sont jugées selon les clés auxquelles vous faites confiance.** Une bonne
  signature d’une clé que personne n’a certifiée le dit, et explique pourquoi vérifier son
  empreinte.
- **Le navigateur est la base de confiance.** Tout ce qui peut exécuter du code dans cette
  page ou lire le profil du navigateur — une extension malveillante ayant accès à tous les
  sites, un logiciel malveillant sur l’ordinateur — peut lire ce que la page peut lire.
  Conservez des sauvegardes de vos clés secrètes ailleurs : effacer les données du navigateur
  supprime le trousseau.

## Fonctionnalités

- Trousseau dans IndexedDB, partagé par les fenêtres de l’application sur cette origine ; un
  changement dans l’une apparaît dans les autres.
- Nouvelles paires de clés de douze sortes, avec une date d’expiration et un certificat de
  révocation créé avec elles.
- Import de clés en texte et en binaire, plusieurs à la fois, fusionnées avec l’existant ;
  certificats de révocation GnuPG après confirmation.
- Export de clés publiques, sauvegarde de clés secrètes, une ou toutes.
- Certification des clés des autres ; validité déduite de vos propres certifications.
- Modification de votre clé : expiration, identités, phrase secrète, révocation — en ajoutant
  des signatures, comme le fait GnuPG, pour que la clé reste lisible partout et que les
  certifications des autres y restent.
- Bloc-notes : chiffrer, signer, signer et chiffrer, chiffrer avec un mot de passe,
  déchiffrer, vérifier.
- Fichiers : la même chose pour les fichiers, signatures détachées, plusieurs fichiers à la
  fois.
- Phrases secrètes mémorisées un moment, en mémoire seulement.
- Thème clair et sombre, suivant le système ou choisi.
- 17 langues, l’arabe et l’ourdou de droite à gauche.
- Une disposition pour téléphone ; la PWA s’installe sur un téléphone ou un ordinateur et
  fonctionne hors ligne.
- Les fichiers ouverts avec la PWA installée depuis le Finder ou l’Explorateur arrivent dans
  sa vue des fichiers.
- Une extension Chrome avec le menu contextuel pour le texte sélectionné.

## Raccourcis clavier

| Touches | |
| --- | --- |
| ⌘/Ctrl+F | Rechercher des clés |
| ⇧⌘N / Maj+Ctrl+N | Nouvelle paire de clés |
| ⇧⌘I / Maj+Ctrl+I | Importer |
| ↑ ↓, Début, Fin | Se déplacer dans la liste des clés |
| ⌘/Ctrl+A | Sélectionner toutes les clés de la liste |
| Suppr | Supprimer les clés sélectionnées |
| ⌘/Ctrl+Entrée | Dans le bloc-notes : déchiffrer un message, ou chiffrer un texte en clair |
| Échap | Fermer une boîte de dialogue ou un menu |

## Traductions

L’interface parle anglais et 16 autres langues : chinois, hindi, espagnol, français, arabe,
bengali, portugais, russe, ourdou, indonésien, allemand, japonais, marathi, télougou, turc et
ukrainien. Elle suit la langue du navigateur, sauf si une autre est choisie dans les
réglages. L’arabe et l’ourdou sont mis en page de droite à gauche.

Le texte anglais vit dans le code : `t('context', 'English text')`, ou
`tn('context', '{count} key', '{count} keys', n)` pour un texte avec un nombre, avec de
simples littéraux de chaîne — `tools/i18n.mjs` les trouve avec une expression régulière. Dans
le gabarit, `data-i18n` traduit le texte d’un élément et `data-i18n-attr` son title, son
placeholder et son aria-label. Chaque langue est un dictionnaire, `src/locales/<code>.json` :
`{ "context": { "English text": "translation" } }`, formes plurielles par `Intl.PluralRules`.
Une chaîne qui manque à un dictionnaire est affichée en anglais.

`npm run i18n` affiche, par langue, les chaînes qui manquent à un dictionnaire et celles qu’il
contient mais que l’interface n’utilise plus ; `npm test` vérifie les dictionnaires : pas de
clés obsolètes, les mêmes paramètres, chaque forme plurielle, chaque contexte une seule fois.
Ce que Chrome montre de l’extension elle-même — son nom, sa description et le titre de son
bouton — vient des mêmes dictionnaires, contexte `manifest`.

## Compilation

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ and its zip
npm run watch          # rebuilds on every change
./build.sh             # the same, installing the dependencies on the first run
```

`build.mjs` regroupe `src/app/main.ts` avec esbuild en un seul script et l’intègre, avec les
styles et l’icône, dans `src/app/template.html`. openpgp.js est l’unique dépendance
d’exécution.

```sh
npm run check          # everything below, in order
npm run typecheck      # tsc --noEmit
npm test               # unit tests in Node; tests/gnupg.mjs needs gpg, and says so without it
npm run test:browser   # the page, the PWA and the extension in headless Chrome
npm run shots -- DIR   # screenshots of every main screen into DIR
npm run icons          # the PNG icons, drawn from assets/*.svg
```

Les tests de navigateur pilotent un Chrome local par le protocole DevTools, sans autre
dépendance que Node ; `CHROME=/path/to/chrome` en choisit un.

## Versions et publications

La version ne vit que dans `package.json`. Une compilation du commit étiqueté `v<version>`
l’affiche telle quelle ; toute autre compilation ajoute le commit — `0.1.0+1a2b3c4` — pour
qu’une page compilée depuis `main` ne soit pas prise pour une publication. Pour publier :
`npm version minor && git push --follow-tags`. Le workflow de publication vérifie que
l’étiquette correspond à `package.json`, lance les tests, et joint `html-pgp-<tag>.html`,
`html-pgp-extension-<tag>.zip` et `SHA256SUMS.txt`.

## GitHub Pages

`build/pages/` est la même page sous forme de PWA installable : un manifeste, des icônes et un
service worker qui la fait fonctionner hors ligne une fois ouverte.
`.github/workflows/pages.yml` la compile et la teste à chaque push sur `main` et la déploie
sur GitHub Pages (Settings → Pages → Source : GitHub Actions) ; elle se trouve alors à
`https://<owner>.github.io/html-pgp/`.

La page n’atteint toujours rien : sa politique n’admet que son propre manifeste, son worker et
ses icônes. Un nouveau déploiement s’installe à côté de la version en cours et attend ; les
Réglages affichent « La version X est prête. » avec un bouton Mettre à jour, et un point
signale les réglages. L’application installée ouvre aussi les fichiers `.gpg`, `.pgp`, `.sig`
et `.asc` depuis le système (Ouvrir avec), dans sa vue des fichiers.

## Arborescence

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

## Limites

- Pas de serveurs de clés ni de WKD : la page n’a volontairement aucun accès au réseau.
  Échangez les clés sous forme de fichiers ou de texte.
- Pas de cartes à puce ni de jetons matériels. Les clés dont la clé primaire secrète est
  gardée ailleurs (les stubs de GnuPG) sont lues, et leurs sous-clés fonctionnent ; une telle
  clé ne peut pas être modifiée ici.
- Pas de S/MIME ni de certificats X.509 — OpenPGP seulement.
- La confiance est directe : les certifications faites par vos propres clés. La confiance
  dans le propriétaire de GnuPG (owner trust) — faire confiance aux certifications des
  autres — n’est pas modélisée.
- Les fichiers sont lus entièrement en mémoire : très bien pour des documents et des photos,
  pas pour des gigaoctets.
- Le fichier unique, la PWA et l’extension tiennent chacun leur propre trousseau (voir
  « [Extension Chrome](#extension-chrome) »).
- Les clés OpenPGP v6 ne sont pas encore lues par GnuPG ni par Kleopatra.

## Licence

MIT — voir [LICENSE](../../LICENSE). La compilation inclut [OpenPGP.js](https://openpgpjs.org/),
sous la licence publique générale limitée GNU 3.0 ou ultérieure ; sa notice est conservée en
tête du script regroupé, et son code source est sur https://github.com/openpgpjs/openpgpjs.

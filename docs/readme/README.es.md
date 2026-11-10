# html-pgp

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<a href="README.zh.md">🇨🇳 中文</a> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<b>🇪🇸 Español</b> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
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

**HTML PGP** es un gestor de claves y herramienta de cifrado OpenPGP en el espíritu de
[Kleopatra](https://apps.kde.org/kleopatra/), el gestor de certificados que viene con GnuPG,
en un único archivo HTML independiente. Mantiene un anillo de claves con tus propios pares de
claves y las claves públicas de otras personas, crea claves nuevas (RSA, Curve25519, curvas
NIST y Brainpool, OpenPGP v6 Ed25519 y Ed448), certifica claves, y cifra, firma, descifra y
verifica texto y archivos.

Habla el mismo OpenPGP que GnuPG y Kleopatra: claves, mensajes y firmas funcionan en ambos
sentidos, y las pruebas lo comprueban con el propio GnuPG.

Todo funciona sin conexión: sin cuenta, sin servidor, sin peticiones de red; la página no
tiene ningún acceso a la red. Las claves se guardan en el navegador; las claves secretas
permanecen cifradas con sus frases de contraseña, que nunca se almacenan. La misma página es
también una [PWA](#github-pages) que se instala como aplicación y una
[extensión de Chrome](#extensión-de-chrome) que se abre junto a tus pestañas.

![HTML PGP: el anillo de claves y los detalles de una clave](../screenshot.png)

## Cómo se usa

Compila `build/html-pgp.html` (consulta «[Compilación](#compilación)») y ábrelo en un
navegador; directamente desde el disco funciona. O usa la PWA de GitHub Pages, o la extensión.

La aplicación tiene tres vistas, como Kleopatra: **Claves**, **Notas** y **Archivos**, y
**Ajustes**.

### Claves

- **Nuevo par de claves** — tu nombre y tu correo, y una frase de contraseña que protege la
  clave secreta. En «Algoritmo y validez»: el algoritmo (consulta «[Algoritmos](#algoritmos)»)
  y durante cuánto tiempo es válida la clave: tres años por defecto, como las crean GnuPG y
  Kleopatra. Cuando la clave está creada, la aplicación ofrece hacer enseguida una copia de
  seguridad: el anillo de claves vive solo en este navegador.
- **Importar** — desde un archivo (`.asc`, `.gpg`, `.key`…, con una o varias claves cada uno,
  en armadura de texto o binario), desde el portapapeles, o pegado como texto. Los archivos
  soltados sobre la vista de claves también se importan. Una clave que ya está en el anillo se
  fusiona: los nuevos IDs de usuario, subclaves y firmas se unen a ella, y una clave secreta
  se une a su clave pública. Un certificado de revocación de GnuPG (`.rev`) se importa solo
  después de que lo confirmes: revoca la clave para siempre.
- **Exportar** — las claves públicas seleccionadas, como texto (`.asc`) o binario (`.gpg`), a
  un archivo o al portapapeles. Se pueden seleccionar varias claves con ⌘/Ctrl y Mayús.
- La lista muestra el nombre, el correo, la validez, la fecha de caducidad y el ID de cada
  clave; la búsqueda encuentra claves por nombre, correo, ID de clave o huella digital, y el
  filtro muestra tus pares de claves, las claves certificadas, las que nadie ha certificado, o
  las caducadas y revocadas.

Los detalles de una clave muestran su huella digital en grupos de cuatro, como la imprime
GnuPG, sus IDs de usuario y quién los certificó, la clave principal y las subclaves con sus
algoritmos, usos y fechas, y la clave pública como texto. Para tus propias claves, el menú ⋯
tiene además:

- **Cambiar caducidad…** — una nueva fecha para la clave y sus subclaves, o ninguna. Vuelve a
  compartir después la clave pública, para que los demás lo vean.
- **Añadir ID de usuario…** — otro nombre o dirección para la misma clave. El principal sigue
  siendo el principal.
- **Cambiar frase de contraseña…** — primero se pide la actual, incluso mientras está
  recordada. Una vacía deja la clave sin protección, tras una advertencia.
- **Copia de seguridad de la clave secreta…** — la clave secreta, aún bajo su frase de
  contraseña, como `Nombre_0xKEYID_SECRET.asc`. Primero se pide la frase de contraseña, así se
  sabe que la copia se abre.
- **Certificado de revocación…** — el creado junto con la clave, para guardarlo aparte de
  ella: si la clave se pierde o te la roban, importa el certificado y comparte la clave
  revocada.
- **Revocar clave…**, y **revocar** uno de varios IDs de usuario.

### Certificar

Certificar una clave dice «he comprobado que esta clave pertenece a esta persona». Comprueba
antes la huella digital con su propietario, en persona o en una llamada en la que reconozcas
su voz, y luego pulsa **Certificar** en los detalles de la clave y elige los IDs de usuario.
La certificación se hace con la clave principal de tu clave, como la hace GnuPG, y GnuPG la
acepta.

La validez sigue la lectura más simple de Kleopatra de la red de confianza: tus propias
claves son de confianza total; una clave que certificaste es **Certificada**; cualquier otra
clave funciona, pero se marca como **No certificada** dondequiera que se use: en la lista,
entre los destinatarios y en una firma que haya hecho.

### Notas

Escribe un mensaje, elige los **destinatarios** (se encuentran por nombre, correo o ID de
clave mientras escribes) y pulsa **Cifrar**, o **Firmar y cifrar** cuando hay una clave
elegida en «Firmar como». «Cifrar también para mí» añade tu propia clave, para que puedas
leer lo que enviaste. «Cifrar con una contraseña» añade una contraseña con la que cualquiera
puede descifrar, junto a los destinatarios o en lugar de ellos. **Solo firmar** crea un texto
con firma en claro: sigue siendo legible, con la firma debajo.

Pega un mensaje cifrado o firmado y pulsa **Descifrar / verificar**: el texto se descifra
en el mismo lugar (la frase de contraseña de tu clave se pide cuando hace falta) y se
comprueba cada firma que lleva: buena, mala (el texto fue modificado) o hecha por una clave
que no está en tu anillo de claves. «Mostrar el texto original» vuelve atrás. ⌘/Ctrl+Enter
descifra un mensaje, o cifra texto sin formato. Si pegas una clave, se ofrece importarla.

### Archivos

Añade archivos con el botón o suéltalos sobre la ventana. Cada uno se examina para saber qué
es: un archivo normal, uno cifrado, uno firmado, una firma separada, claves o un certificado
de revocación.

- **Firmar / cifrar** — para los archivos normales: firma como una de tus claves, cifra para
  ti, para otros, con una contraseña, o cualquier combinación. Los archivos cifrados reciben
  `.gpg` (o `.asc` como texto); firmar solo crea una firma separada, `.sig` (o `.asc`), junto
  a cada archivo.
- **Descifrar / verificar** — para el resto. Una firma separada encuentra el archivo que
  firma por su nombre (`report.pdf.sig` va con `report.pdf`), o lo pide. Los archivos
  descifrados se llaman como los cifrados sin `.gpg`.
- **Importar claves** — para los archivos de claves soltados aquí.

Cada resultado se guarda con su propio botón, o todos a la vez.

### Frases de contraseña

Una clave secreta desbloqueada una vez sigue desbloqueada durante un tiempo, como la mantiene
gpg-agent: 10 minutos por defecto, desde «preguntar cada vez» hasta cuatro horas en los
ajustes. Solo se conserva la clave descifrada, en la memoria de la página; nunca la frase de
contraseña, nunca en el disco. **Olvidar frases de contraseña** en el menú las bloquea todas
a la vez; recargar la página también.

### En un teléfono

La página funciona en un teléfono: una pantalla cada vez, las vistas en una barra de
pestañas en la parte inferior, los detalles de una clave en una pantalla propia con un botón
de volver (el gesto de retroceso del sistema también funciona) y menús que suben desde abajo.
En iOS un archivo guardado va a la hoja de compartir, donde está «Guardar en Archivos».

## Algoritmos

| Opción | Nombres en GnuPG | Notas |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | La predeterminada, como en GnuPG y Kleopatra: corta, rápida, legible en todas partes. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA y ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA y ECDH; habitual en el uso alemán y europeo. |
| RSA 2048, 3072, 4096 | rsa2048… | La más antigua y la más ampliamente legible; tarda unos segundos en crearse. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | Claves RFC 9580. **GnuPG y Kleopatra aún no pueden leerlas.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | Claves RFC 9580, como arriba. |

Cada clave es una clave principal que certifica y firma y una subclave que cifra, como las
crea GnuPG. Las claves de otros algoritmos, como DSA y ElGamal de anillos de claves antiguos
de GnuPG, se leen y se usan; solo que no se crean nuevas de ellos. secp256k1 queda fuera:
openpgp.js la rechaza salvo que se le indique lo contrario.

## Compatibilidad con GnuPG y Kleopatra

`tests/gnupg.mjs` ejecuta el propio GnuPG, en un directorio personal desechable, contra lo
que escribe la aplicación, y `tests/pgp.mjs` lee lo que escribió GnuPG
(`tests/fixtures/gnupg/`, creado una vez por `tools/gnupg-fixtures.sh`). Comprobado en ambos
sentidos:

- GnuPG importa las claves de todos los algoritmos v4 creadas aquí, con su uso, y las usa:
  GnuPG descifra nuestros mensajes y comprueba nuestras firmas, y nosotros desciframos lo que
  GnuPG cifra para ellas;
- GnuPG ve nuestras nuevas fechas de caducidad, los IDs de usuario añadidos y revocados, las
  certificaciones de otras claves y los certificados de revocación;
- aquí se leen las claves, los mensajes (incluidos los cifrados con OCB), los textos con firma
  en claro, las firmas separadas, los mensajes cifrados con contraseña y los certificados de
  revocación de GnuPG.

Para traer tus claves desde Kleopatra: selecciona tu par de claves → Exportar claves secretas
(o «Copia de seguridad de claves secretas»), e importa el archivo aquí; las claves públicas
de otras personas, igual con Exportar. De vuelta desde aquí: exporta la clave pública, o haz
una copia de seguridad de la clave secreta, e importa el archivo en Kleopatra.

## Extensión de Chrome

La misma aplicación en el panel lateral de Chrome, junto a la página que estás leyendo. El
botón de la barra de herramientas la abre. Selecciona un texto cifrado o firmado en cualquier
página (en un webmail, un foro, un campo de texto) y elige **Descifrar / verificar con HTML
PGP** en el menú contextual: se abre en las notas del panel, descifrado y comprobado.
**Cifrar con HTML PGP** pasa el texto seleccionado para que elijas los destinatarios.

La extensión pide lo mínimo posible: el panel lateral, el menú contextual, su propio
almacenamiento y la pestaña en la que haces clic (activeTab), para leer la selección con sus
saltos de línea, que el propio menú contextual pierde. No tiene acceso a ningún sitio web por
lo demás, y sus páginas, como las de la aplicación, no tienen acceso a la red. Donde no se
puede leer una página (las páginas propias de Chrome, la Web Store, un PDF), se usa la copia
de la selección que da el menú y se vuelve a poner su armadura en sus líneas.

La extensión mantiene un anillo de claves propio: los navegadores mantienen separados los
datos de cada origen, así que el archivo único, la PWA y la extensión tienen cada uno el
suyo. Mueve claves entre ellos con exportar e importar, o con una copia de seguridad.

Compílala con `npm run build` y carga `build/extension/` en `chrome://extensions` (Modo
desarrollador → Cargar descomprimida), o toma `build/html-pgp-extension-<version>.zip` para
la Chrome Web Store.

## Seguridad

- **Nada sale de la página.** Su Content-Security-Policy tiene `connect-src 'none'` y
  `default-src 'none'`: ni fetch, ni imágenes ni fuentes de otros sitios, ni formularios que
  envíen hacia fuera. Todo está incrustado: estilos, openpgp.js, iconos. La compilación falla
  ante cualquier `src` o `href` externo, y la CI vuelve a comprobar el archivo compilado. La
  copia de la PWA puede cargar su propio manifiesto, service worker e iconos; las páginas de
  la extensión tienen la misma política en su manifiesto.
- **Las claves secretas se guardan cifradas.** El anillo de claves vive en el IndexedDB del
  navegador, un registro por clave, como lo arma openpgp.js: una clave secreta permanece
  cifrada con su frase de contraseña (AES-256, con la clave derivada de la frase de
  contraseña mediante un S2K iterado y con sal, como hace GnuPG) y solo se descifra en
  memoria, cuando hace falta. La frase de contraseña nunca se almacena. Una clave sin frase de
  contraseña se marca así en sus detalles.
- **Las claves desbloqueadas se olvidan** pasado el tiempo fijado en los ajustes, con «Olvidar
  frases de contraseña», y cuando la página se cierra.
- **Los campos de frase de contraseña son campos de texto a propósito**, con texto
  transparente y puntos dibujados encima. En macOS un campo de contraseña activa Secure
  Input, que obliga a una distribución de teclado latina: una frase de contraseña en cirílico,
  griego o árabe no se podría escribir. El campo no da al navegador esa pista, sigue ocultando
  lo que se escribe y no permite copiarlo.
- **Las firmas se juzgan por las claves en las que confías.** Una buena firma de una clave que
  nadie ha certificado lo dice, y explica por qué comprobar su huella digital.
- **El navegador es la base de confianza.** Cualquier cosa que pueda ejecutar código en esta
  página o leer el perfil del navegador (una extensión maliciosa con acceso a todos los
  sitios, malware en el equipo) puede leer lo que la página puede. Guarda copias de seguridad
  de tus claves secretas en otro lugar: borrar los datos del navegador elimina el anillo de
  claves.

## Características

- Anillo de claves en IndexedDB, compartido por las ventanas de la aplicación en este origen;
  un cambio en una ventana se ve en las demás.
- Nuevos pares de claves de doce tipos, con fecha de caducidad y un certificado de revocación
  creado con ellos.
- Importación de claves en armadura de texto y binarias, varias a la vez, fusionadas con lo que
  hay; certificados de revocación de GnuPG tras confirmación.
- Exportación de claves públicas, copia de seguridad de claves secretas, una o todas.
- Certificación de claves de otros; validez a partir de tus propias certificaciones.
- Cambios en tu clave: caducidad, IDs de usuario, frase de contraseña, revocación, añadiendo
  firmas, como hace GnuPG, de modo que la clave siga siendo legible en todas partes y las
  certificaciones de otros sigan en ella.
- Notas: cifrar, firmar, firmar y cifrar, cifrar con una contraseña, descifrar, verificar.
- Archivos: lo mismo para archivos, firmas separadas, varios archivos a la vez.
- Frases de contraseña recordadas durante un tiempo, solo en memoria.
- Tema claro y oscuro, siguiendo el del sistema o elegido.
- 17 idiomas, árabe y urdu de derecha a izquierda.
- Un diseño para teléfono; la PWA se instala en un teléfono o en un ordenador y funciona sin
  conexión.
- Los archivos abiertos con la PWA instalada desde el Finder o el Explorador entran en su vista
  de archivos.
- Una extensión de Chrome con el menú contextual para el texto seleccionado.

## Atajos de teclado

| Teclas | |
| --- | --- |
| ⌘/Ctrl+F | Buscar claves |
| ⇧⌘N / Shift+Ctrl+N | Nuevo par de claves |
| ⇧⌘I / Shift+Ctrl+I | Importar |
| ↑ ↓, Home, End | Moverse por la lista de claves |
| ⌘/Ctrl+A | Seleccionar todas las claves de la lista |
| Delete | Eliminar las claves seleccionadas |
| ⌘/Ctrl+Enter | En las notas: descifrar un mensaje, o cifrar texto sin formato |
| Esc | Cerrar un diálogo o un menú |

## Traducciones

La interfaz habla inglés y 16 idiomas más: chino, hindi, español, francés, árabe, bengalí,
portugués, ruso, urdu, indonesio, alemán, japonés, maratí, telugu, turco y ucraniano. Sigue
el idioma del navegador salvo que se elija otro en los ajustes. El árabe y el urdu se
disponen de derecha a izquierda.

El texto en inglés vive en el código: `t('context', 'English text')`, o
`tn('context', '{count} key', '{count} keys', n)` para un texto con un número, con literales
de cadena simples: `tools/i18n.mjs` los encuentra con una expresión regular. En la
plantilla, `data-i18n` traduce el texto de un elemento y `data-i18n-attr` su title,
placeholder y aria-label. Cada idioma es un diccionario, `src/locales/<code>.json`:
`{ "context": { "English text": "translation" } }`, con las formas plurales dadas por
`Intl.PluralRules`. Una cadena que falta en un diccionario se muestra en inglés.

`npm run i18n` imprime, por idioma, las cadenas que le faltan a un diccionario y las que
tiene pero que la interfaz ya no usa; `npm test` comprueba los diccionarios: ninguna clave
obsoleta, los mismos marcadores, todas las formas plurales, cada contexto una sola vez. Lo
que Chrome muestra de la propia extensión (su nombre, descripción y título del botón) viene
de los mismos diccionarios, contexto `manifest`.

## Compilación

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ y su zip
npm run watch          # recompila en cada cambio
./build.sh             # lo mismo, instalando las dependencias en la primera ejecución
```

`build.mjs` empaqueta `src/app/main.ts` con esbuild en un solo script y lo incrusta, junto
con los estilos y el icono, en `src/app/template.html`. openpgp.js es la única dependencia en
tiempo de ejecución.

```sh
npm run check          # todo lo que sigue, en orden
npm run typecheck      # tsc --noEmit
npm test               # pruebas unitarias en Node; tests/gnupg.mjs necesita gpg, y lo dice si falta
npm run test:browser   # la página, la PWA y la extensión en Chrome sin interfaz
npm run shots -- DIR   # capturas de todas las pantallas principales en DIR
npm run icons          # los iconos PNG, dibujados a partir de assets/*.svg
```

Las pruebas de navegador manejan un Chrome local mediante el protocolo DevTools, sin
dependencias más allá de Node; `CHROME=/path/to/chrome` elige uno.

## Versiones y lanzamientos

La versión vive solo en `package.json`. Una compilación del commit etiquetado `v<version>` la
muestra tal cual; cualquier otra compilación añade el commit (`0.1.0+1a2b3c4`), de modo que
una página compilada desde `main` no se tome por un lanzamiento. Para lanzar:
`npm version minor && git push --follow-tags`. El workflow de lanzamiento comprueba que la
etiqueta coincide con `package.json`, ejecuta las pruebas y adjunta
`html-pgp-<tag>.html`, `html-pgp-extension-<tag>.zip` y `SHA256SUMS.txt`.

## GitHub Pages

`build/pages/` es la misma página como una PWA instalable: un manifiesto, iconos y un service
worker que la mantiene funcionando sin conexión una vez abierta.
`.github/workflows/pages.yml` la compila y la prueba en cada push a `main` y la despliega en
GitHub Pages (Settings → Pages → Source: GitHub Actions); queda entonces en
`https://<owner>.github.io/html-pgp/`.

La página sigue sin alcanzar nada: su política solo deja pasar su propio manifiesto, worker e
iconos. Un nuevo despliegue se instala junto a la versión en ejecución y espera; Ajustes
muestra «La versión X está lista» con un botón Actualizar, y un punto marca los ajustes. La
aplicación instalada también abre archivos `.gpg`, `.pgp`, `.sig` y `.asc` desde el sistema
(Abrir con), en su vista de archivos.

## Estructura

```text
build.mjs                 la compilación: el archivo único, la PWA, la extensión y su zip
src/core/                 sin DOM: se ejecuta en Node bajo las pruebas
  pgp.ts                  todas las operaciones OpenPGP, sobre openpgp.js
  keys.ts                 qué es una clave, tal como la muestra la interfaz
  keyring.ts              el anillo de claves: almacenamiento, importación y fusión, confianza
  armor.ts                armadura ASCII reparada a partir de una sola línea
  i18n.ts                 idiomas y búsqueda de cadenas
src/app/                  la página
  template.html           el marcado, con la CSP
  styles.css              todos los estilos
  main.ts                 arranque, vistas, atajos, archivos soltados, otras ventanas
  keylist.ts              la vista de claves: lista, búsqueda, filtro, selección
  details.ts              una clave al completo
  keyactions.ts           los diálogos: nueva clave, importar, exportar, certificar, cambios, eliminar
  notepad.ts, files.ts    las notas y la vista de archivos
  recipients.ts           elección de destinatarios
  outcome.ts              lo que encontró descifrar y verificar, en palabras
  agent.ts                frases de contraseña y claves desbloqueadas
  settings.ts             preferencias en localStorage; settingsview.ts la vista
  store.ts                IndexedDB, y avisos de cambios de otras ventanas
  save.ts                 archivos a guardar, el portapapeles
  ui.ts, screens.ts       diálogos, menús, avisos; una pantalla cada vez en un teléfono
  update.ts, platform.ts  actualizaciones de la PWA; lo que añade la extensión
src/extension/            manifiesto, worker en segundo plano, la plataforma del panel, grab.ts
src/pwa/sw.js             el service worker de la PWA
src/locales/              16 diccionarios
tests/                    pgp, keyring, gnupg, i18n en Node; app y extensión en Chrome
tests/fixtures/gnupg/     claves, mensajes y firmas creados por GnuPG
tools/                    load.mjs, chrome.mjs, i18n.mjs, shots.mjs, icons.mjs, gnupg-fixtures.sh
```

## Limitaciones

- Sin servidores de claves ni WKD: la página no tiene acceso a la red por diseño. Intercambia
  las claves como archivos o texto.
- Sin tarjetas inteligentes ni tokens de hardware. Las claves cuya clave principal secreta se
  guarda en otro lugar (los stubs de GnuPG) se leen y sus subclaves funcionan; una clave así
  no se puede cambiar aquí.
- Sin S/MIME ni certificados X.509: solo OpenPGP.
- La confianza es directa: certificaciones hechas por tus propias claves. La confianza del
  propietario de GnuPG (confiar en las certificaciones de otros) no se modela.
- Los archivos se leen enteros en memoria: bien para documentos y fotos, no para gigabytes.
- El archivo único, la PWA y la extensión mantienen cada uno su propio anillo de claves
  (consulta «[Extensión de Chrome](#extensión-de-chrome)»).
- GnuPG y Kleopatra aún no leen las claves OpenPGP v6.

## Licencia

MIT — consulta [LICENSE](../../LICENSE). La compilación incluye [OpenPGP.js](https://openpgpjs.org/),
bajo la GNU Lesser General Public License 3.0 o posterior; su aviso se conserva al principio
del script empaquetado, y su código fuente está en https://github.com/openpgpjs/openpgpjs.

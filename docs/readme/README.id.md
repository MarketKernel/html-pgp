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
<b>🇮🇩 Bahasa Indonesia</b> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->
**HTML PGP** adalah pengelola kunci OpenPGP dan alat enkripsi dengan semangat [Kleopatra](https://apps.kde.org/kleopatra/), pengelola sertifikat yang menyertai GnuPG — dalam satu berkas HTML mandiri. Aplikasi ini menyimpan gantungan kunci berisi pasangan kunci Anda sendiri dan kunci publik orang lain, membuat kunci baru (RSA, Curve25519, kurva NIST dan Brainpool, OpenPGP v6 Ed25519 dan Ed448), mensertifikasi kunci, serta mengenkripsi, menandatangani, mendekripsi, dan memverifikasi teks dan berkas.

Aplikasi ini berbicara dalam OpenPGP yang sama dengan GnuPG dan Kleopatra: kunci, pesan, dan tanda tangan dapat berpindah ke kedua arah, dan pengujian memeriksanya terhadap GnuPG sendiri.

Semuanya bekerja secara luring: tanpa akun, tanpa server, tanpa permintaan jaringan — halamannya sama sekali tidak memiliki akses jaringan. Kunci disimpan di peramban; kunci rahasia tetap terenkripsi dengan frasa sandinya, yang tidak pernah disimpan. Halaman yang sama juga berupa [PWA](#github-pages) yang dapat dipasang sebagai aplikasi dan [ekstensi Chrome](#ekstensi-chrome) yang terbuka di samping tab Anda.

![HTML PGP: gantungan kunci dan detail sebuah kunci](../screenshot.png)

## Cara menggunakan

Bangun `build/html-pgp.html` (lihat "[Build](#build)") dan buka di peramban — langsung dari disk pun tidak masalah. Atau gunakan PWA dari GitHub Pages, atau ekstensinya.

Aplikasi ini memiliki tiga tampilan, seperti Kleopatra: **Kunci**, **Catatan** dan **Berkas**, serta **Setelan**.

### Kunci

- **Pasangan kunci baru** — nama dan alamat email Anda, serta frasa sandi yang melindungi kunci rahasia. Di bawah "Algoritma dan validitas": algoritmanya (lihat "[Algoritma](#algoritma)") dan berapa lama kunci berlaku — tiga tahun secara bawaan, seperti yang dibuat GnuPG dan Kleopatra. Setelah kunci dibuat, aplikasi langsung menawarkan untuk mencadangkannya: gantungan kunci hanya hidup di peramban ini.
- **Impor** — dari berkas (`.asc`, `.gpg`, `.key`…, berisi satu atau beberapa kunci, berformat armor maupun biner), dari papan klip, atau ditempel sebagai teks. Berkas yang dijatuhkan ke tampilan kunci juga diimpor. Kunci yang sudah ada di gantungan kunci digabungkan: ID pengguna, subkunci, dan tanda tangan baru bergabung ke dalamnya, dan kunci rahasia bergabung dengan kunci publiknya. Sertifikat pencabutan GnuPG (`.rev`) diimpor hanya setelah Anda mengonfirmasinya: sertifikat itu mencabut kunci untuk selamanya.
- **Ekspor** — kunci publik yang dipilih, sebagai teks (`.asc`) atau biner (`.gpg`), ke berkas atau papan klip. Beberapa kunci dapat dipilih dengan ⌘/Ctrl dan Shift.
- Daftar menampilkan nama, alamat, validitas, tanggal kedaluwarsa, dan ID kunci setiap kunci; pencarian menemukan kunci berdasarkan nama, alamat, ID kunci, atau sidik jari, dan filter menampilkan pasangan kunci Anda, kunci yang tersertifikasi, kunci yang belum disertifikasi siapa pun, atau yang kedaluwarsa dan dicabut.

Detail sebuah kunci menampilkan sidik jarinya dalam kelompok empat, seperti yang dicetak GnuPG, ID penggunanya dan siapa yang mensertifikasinya, kunci utama dan subkunci beserta algoritma, penggunaan, dan tanggalnya, serta kunci publik sebagai teks. Untuk kunci Anda sendiri, menu ⋯ juga memiliki:

- **Ubah masa berlaku** — tanggal baru untuk kunci dan subkuncinya, atau tanpa tanggal. Bagikan kunci publik sekali lagi sesudahnya, agar orang lain melihatnya.
- **Tambah ID pengguna** — nama atau alamat lain untuk kunci yang sama. Yang utama tetap menjadi yang utama.
- **Ubah frasa sandi** — frasa sandi saat ini ditanyakan lebih dulu, bahkan ketika sedang diingat. Frasa sandi kosong membuat kunci tidak terlindungi, setelah sebuah peringatan.
- **Cadangkan kunci rahasia** — kunci rahasia, tetap di bawah frasa sandinya, sebagai `Name_0xKEYID_SECRET.asc`. Frasa sandi ditanyakan lebih dulu, sehingga cadangan dipastikan dapat dibuka.
- **Sertifikat pencabutan** — yang dibuat bersama kunci, untuk disimpan terpisah darinya: jika kunci hilang atau dicuri, impor sertifikatnya dan bagikan kunci yang telah dicabut.
- **Cabut kunci**, dan **cabut** salah satu dari beberapa ID pengguna.

### Sertifikasi

Mensertifikasi kunci berarti menyatakan "saya sudah memeriksa bahwa kunci ini milik orang ini". Periksa sidik jarinya dengan pemiliknya terlebih dahulu — langsung bertemu, atau lewat panggilan yang suaranya Anda kenal — lalu tekan **Sertifikasi** di detail kunci dan pilih ID penggunanya. Sertifikasi dibuat dengan kunci utama dari kunci Anda, seperti yang dibuat GnuPG, dan GnuPG menerimanya.

Validitas mengikuti pembacaan paling sederhana Kleopatra atas web of trust: kunci Anda sendiri dipercaya sepenuhnya; kunci yang Anda sertifikasi berstatus **Tersertifikasi**; kunci lain mana pun tetap berfungsi, tetapi ditandai **Belum disertifikasi** di mana pun ia digunakan — di daftar, di antara penerima, dan pada tanda tangan yang dibuatnya.

### Catatan

Ketik pesan, pilih **penerima** — ditemukan berdasarkan nama, alamat, atau ID kunci saat Anda mengetik — lalu tekan **Enkripsi**, atau **Tandatangani dan enkripsi** ketika sebuah kunci dipilih di "Tandatangani sebagai". "Enkripsi juga untuk saya" menambahkan kunci Anda sendiri, sehingga Anda dapat membaca apa yang Anda kirim. "Enkripsi dengan kata sandi" menambahkan kata sandi yang dengannya siapa pun dapat mendekripsi, di samping penerima atau sebagai penggantinya. **Hanya tandatangani** membuat teks bertanda tangan jelas: tetap terbaca, dengan tanda tangan di bawahnya.

Tempel pesan terenkripsi atau bertanda tangan lalu tekan **Dekripsi / verifikasi**: teks didekripsi di tempat — frasa sandi kunci Anda ditanyakan bila perlu — dan setiap tanda tangan padanya diperiksa: baik, buruk (teks diubah), atau dibuat oleh kunci yang tidak ada di gantungan kunci Anda. "Tampilkan teks asli" kembali ke semula. ⌘/Ctrl+Enter mendekripsi pesan, atau mengenkripsi teks biasa. Kunci yang ditempel akan ditawarkan untuk diimpor.

### Berkas

Tambahkan berkas dengan tombol atau jatuhkan ke jendela. Masing-masing diperiksa untuk mengetahui apa itu: berkas biasa, berkas terenkripsi, berkas bertanda tangan, tanda tangan terpisah, kunci, atau sertifikat pencabutan.

- **Tandatangani / enkripsi** — untuk berkas biasa: tandatangani sebagai salah satu kunci Anda, enkripsi untuk Anda sendiri, untuk orang lain, dengan kata sandi, atau gabungan semuanya. Berkas terenkripsi mendapat `.gpg` (atau `.asc` sebagai teks); menandatangani saja membuat tanda tangan terpisah, `.sig` (atau `.asc`), di samping setiap berkas.
- **Dekripsi / verifikasi** — untuk sisanya. Tanda tangan terpisah menemukan berkas yang ditandatanganinya lewat namanya (`report.pdf.sig` berpasangan dengan `report.pdf`), atau menanyakannya. Berkas yang didekripsi dinamai sesuai berkas terenkripsinya tanpa `.gpg`.
- **Impor kunci** — untuk berkas kunci yang dijatuhkan di sini.

Setiap hasil disimpan dengan tombolnya sendiri, atau semuanya sekaligus.

### Frasa sandi

Kunci rahasia yang sekali dibuka tetap terbuka beberapa saat, seperti yang dilakukan gpg-agent: 10 menit secara bawaan, dari "tanyakan setiap kali" hingga empat jam di setelan. Hanya kunci yang sudah didekripsi yang disimpan, di memori halaman — bukan frasa sandinya, dan tidak pernah di disk. **Lupakan frasa sandi** di menu mengunci semuanya sekaligus; memuat ulang halaman juga demikian.

### Di ponsel

Halaman ini berfungsi di ponsel: satu layar dalam satu waktu, tampilan ada di bilah tab di bawah, detail sebuah kunci di layarnya sendiri dengan tombol kembali — gestur kembali dari sistem juga berfungsi — dan menu yang naik dari bawah. Di iOS, berkas yang disimpan masuk ke lembar bagikan, tempat "Simpan ke Berkas" berada.

## Algoritma

| Pilihan | Nama di GnuPG | Catatan |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | Bawaan, seperti di GnuPG dan Kleopatra: singkat, cepat, terbaca di mana-mana. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA dan ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA dan ECDH; umum dipakai di Jerman dan Eropa. |
| RSA 2048, 3072, 4096 | rsa2048… | Yang paling lama dan paling luas dibaca; butuh beberapa detik untuk dibuat. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | Kunci RFC 9580. **GnuPG dan Kleopatra belum dapat membacanya.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | Kunci RFC 9580, seperti di atas. |

Setiap kunci terdiri dari kunci utama yang mensertifikasi dan menandatangani serta subkunci yang mengenkripsi, seperti yang dibuat GnuPG. Kunci dengan algoritma lain — misalnya DSA dan ElGamal dari gantungan kunci GnuPG lama — dibaca dan digunakan; hanya yang baru tidak dibuat dengannya. secp256k1 ditinggalkan: openpgp.js menolaknya kecuali diperintahkan lain.

## Kompatibilitas dengan GnuPG dan Kleopatra

`tests/gnupg.mjs` menjalankan GnuPG sendiri, di direktori home sementara, terhadap apa yang ditulis aplikasi, dan `tests/pgp.mjs` membaca apa yang ditulis GnuPG (`tests/fixtures/gnupg/`, dibuat sekali oleh `tools/gnupg-fixtures.sh`). Diperiksa di kedua arah:

- kunci dari setiap algoritma v4 yang dibuat di sini diimpor oleh GnuPG, beserta penggunaannya, dan dipakai: GnuPG mendekripsi pesan kami dan memeriksa tanda tangan kami, dan kami mendekripsi apa yang dienkripsi GnuPG untuknya;
- GnuPG melihat tanggal kedaluwarsa baru kami, ID pengguna yang ditambahkan dan dicabut, sertifikasi kunci lain, dan sertifikat pencabutan;
- kunci, pesan (termasuk yang dienkripsi OCB), teks bertanda tangan jelas, tanda tangan terpisah, pesan terenkripsi kata sandi, dan sertifikat pencabutan dari GnuPG dibaca di sini.

Untuk membawa kunci Anda dari Kleopatra: pilih pasangan kunci Anda → Ekspor kunci rahasia (atau "Cadangkan kunci rahasia"), lalu impor berkasnya di sini; kunci publik orang lain dengan cara yang sama lewat Ekspor. Untuk kembali dari sini: ekspor kunci publik, atau cadangkan kunci rahasia, lalu impor berkasnya di Kleopatra.

## Ekstensi Chrome

Aplikasi yang sama di panel samping Chrome, di samping halaman yang sedang Anda baca. Tombol di bilah alat membukanya. Pilih teks terenkripsi atau bertanda tangan di halaman mana pun — di webmail, forum, kolom teks — dan pilih **Dekripsi / verifikasi dengan HTML PGP** di menu konteks: teks terbuka di catatan panel, sudah didekripsi dan diperiksa. **Enkripsi dengan HTML PGP** menyerahkan teks yang dipilih agar Anda memilih penerimanya.

Ekstensi ini meminta sesedikit mungkin: panel samping, menu konteks, penyimpanannya sendiri, dan tab tempat Anda mengeklik (activeTab) — untuk membaca pilihan beserta jeda barisnya, yang hilang pada menu konteks itu sendiri. Selebihnya ia tidak punya akses ke situs web mana pun, dan halamannya, seperti halaman aplikasi, tidak memiliki akses jaringan. Jika sebuah halaman tidak dapat dibaca (halaman Chrome sendiri, Web Store, PDF), salinan pilihan dari menu itu sendiri digunakan dan armornya dikembalikan ke barisnya.

Ekstensi memiliki gantungan kunci sendiri: peramban memisahkan data setiap origin, sehingga berkas tunggal, PWA, dan ekstensi masing-masing memilikinya. Pindahkan kunci di antara mereka dengan ekspor dan impor, atau dengan cadangan.

Bangun dengan `npm run build` dan muat `build/extension/` di `chrome://extensions` (Mode pengembang → Muat yang belum dipaketkan), atau ambil `build/html-pgp-extension-<version>.zip` untuk Chrome Web Store.

## Keamanan

- **Tidak ada yang keluar dari halaman.** Content-Security-Policy-nya memiliki `connect-src 'none'` dan `default-src 'none'`: tanpa fetch, tanpa gambar atau font dari tempat lain, tanpa formulir yang mengirim ke luar. Semuanya disematkan — gaya, openpgp.js, ikon. Build gagal pada `src` atau `href` eksternal mana pun, dan CI memeriksa berkas hasil build sekali lagi. Salinan PWA boleh memuat manifes, service worker, dan ikonnya sendiri; halaman ekstensi memiliki kebijakan yang sama di manifesnya.
- **Kunci rahasia disimpan terenkripsi.** Gantungan kunci hidup di IndexedDB peramban, satu rekaman per kunci, seperti yang diarmor openpgp.js: kunci rahasia tetap terenkripsi dengan frasa sandinya (AES-256, kunci diturunkan dari frasa sandi oleh S2K beriterasi dan bergaram, seperti GnuPG) dan hanya didekripsi di memori, saat diperlukan. Frasa sandi tidak pernah disimpan. Kunci tanpa frasa sandi ditandai demikian di detailnya.
- **Kunci yang terbuka dilupakan** setelah waktu yang ditetapkan di setelan, pada "Lupakan frasa sandi", dan saat halaman ditutup.
- **Kolom frasa sandi sengaja berupa input teks**, dengan teks transparan dan titik-titik digambar di atasnya. Di macOS, kolom kata sandi mengaktifkan Secure Input, yang memaksa tata letak keyboard Latin: frasa sandi dalam aksara Sirilik, Yunani, atau Arab tidak dapat diketik. Kolom ini tidak memberi peramban petunjuk seperti itu, tetap menyembunyikan apa yang diketik, dan tidak akan menyalinnya.
- **Tanda tangan dinilai oleh kunci yang Anda percayai.** Tanda tangan baik dari kunci yang belum disertifikasi siapa pun akan menyatakannya, dan mengapa sidik jarinya perlu diperiksa.
- **Peramban adalah basis tepercaya.** Apa pun yang dapat menjalankan kode di halaman ini atau membaca profil peramban — ekstensi berbahaya dengan akses ke semua situs, malware di komputer — dapat membaca apa yang dapat dibaca halaman. Simpan cadangan kunci rahasia Anda di tempat lain: menghapus data peramban menghapus gantungan kunci.

## Fitur

- Gantungan kunci di IndexedDB, dibagi oleh jendela-jendela aplikasi di origin ini; perubahan di satu jendela tampak di yang lain.
- Pasangan kunci baru dari dua belas jenis, dengan tanggal kedaluwarsa dan sertifikat pencabutan yang dibuat bersamanya.
- Impor kunci armor dan biner, beberapa sekaligus, digabungkan dengan yang sudah ada; sertifikat pencabutan GnuPG dengan konfirmasi.
- Ekspor kunci publik, cadangan kunci rahasia, satu atau semuanya.
- Mensertifikasi kunci orang lain; validitas dari sertifikasi Anda sendiri.
- Mengubah kunci Anda: masa berlaku, ID pengguna, frasa sandi, pencabutan — dengan menambahkan tanda tangan, seperti GnuPG, sehingga kunci tetap terbaca di mana-mana dan sertifikasi orang lain tetap melekat padanya.
- Catatan: enkripsi, tanda tangan, tanda tangan dan enkripsi, enkripsi dengan kata sandi, dekripsi, verifikasi.
- Berkas: hal yang sama untuk berkas, tanda tangan terpisah, beberapa berkas sekaligus.
- Frasa sandi diingat beberapa saat, hanya di memori.
- Tema terang dan gelap, mengikuti sistem atau dipilih.
- 17 bahasa, Arab dan Urdu dari kanan ke kiri.
- Tata letak ponsel; PWA dapat dipasang di ponsel atau komputer dan bekerja secara luring.
- Berkas yang dibuka dengan PWA terpasang dari Finder atau Explorer masuk ke tampilan berkasnya.
- Ekstensi Chrome dengan menu konteks untuk teks yang dipilih.

## Pintasan keyboard

| Tombol | |
| --- | --- |
| ⌘/Ctrl+F | Cari kunci |
| ⇧⌘N / Shift+Ctrl+N | Pasangan kunci baru |
| ⇧⌘I / Shift+Ctrl+I | Impor |
| ↑ ↓, Home, End | Bergerak di daftar kunci |
| ⌘/Ctrl+A | Pilih semua kunci di daftar |
| Delete | Hapus kunci yang dipilih |
| ⌘/Ctrl+Enter | Di catatan: dekripsi pesan, atau enkripsi teks biasa |
| Esc | Tutup dialog atau menu |

## Terjemahan

Antarmuka berbahasa Inggris dan 16 bahasa lainnya: Tionghoa, Hindi, Spanyol, Prancis, Arab, Bengali, Portugis, Rusia, Urdu, Indonesia, Jerman, Jepang, Marathi, Telugu, Turki, dan Ukraina. Antarmuka mengikuti bahasa peramban kecuali salah satu dipilih di setelan. Arab dan Urdu ditata dari kanan ke kiri.

Teks Inggris hidup di dalam kode: `t('context', 'English text')`, atau `tn('context', '{count} key', '{count} keys', n)` untuk teks dengan angka, dengan literal string biasa — `tools/i18n.mjs` menemukannya dengan ekspresi reguler. Di templat, `data-i18n` menerjemahkan teks sebuah elemen dan `data-i18n-attr` title, placeholder, dan aria-label-nya. Setiap bahasa adalah sebuah kamus, `src/locales/<code>.json`: `{ "context": { "English text": "translation" } }`, bentuk jamak oleh `Intl.PluralRules`. String yang tidak ada di kamus ditampilkan dalam bahasa Inggris.

`npm run i18n` mencetak, per bahasa, string yang tidak dimiliki kamus dan yang dimilikinya tetapi tidak lagi dipakai antarmuka; `npm test` memeriksa kamus: tanpa kunci usang, placeholder yang sama, setiap bentuk jamak, setiap konteks sekali. Apa yang ditampilkan Chrome dari ekstensi itu sendiri — nama, deskripsi, dan judul tombolnya — berasal dari kamus yang sama, konteks `manifest`.

## Build

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ and its zip
npm run watch          # rebuilds on every change
./build.sh             # the same, installing the dependencies on the first run
```

`build.mjs` membundel `src/app/main.ts` dengan esbuild menjadi satu skrip dan menyematkannya, bersama gaya dan ikon, ke dalam `src/app/template.html`. openpgp.js adalah satu-satunya dependensi runtime.

```sh
npm run check          # everything below, in order
npm run typecheck      # tsc --noEmit
npm test               # unit tests in Node; tests/gnupg.mjs needs gpg, and says so without it
npm run test:browser   # the page, the PWA and the extension in headless Chrome
npm run shots -- DIR   # screenshots of every main screen into DIR
npm run icons          # the PNG icons, drawn from assets/*.svg
```

Pengujian peramban menjalankan Chrome lokal lewat protokol DevTools, tanpa dependensi selain Node; `CHROME=/path/to/chrome` memilih salah satunya.

## Versi dan rilis

Versi hanya ada di `package.json`. Build dari commit yang diberi tag `v<version>` menampilkannya apa adanya; build lain menambahkan commit — `0.1.0+1a2b3c4` — sehingga halaman yang dibangun dari `main` tidak disangka rilis. Untuk merilis: `npm version minor && git push --follow-tags`. Alur kerja rilis memeriksa bahwa tag cocok dengan `package.json`, menjalankan pengujian, dan melampirkan `html-pgp-<tag>.html`, `html-pgp-extension-<tag>.zip`, dan `SHA256SUMS.txt`.

## GitHub Pages

`build/pages/` adalah halaman yang sama sebagai PWA yang dapat dipasang: manifes, ikon, dan service worker yang menjaganya tetap bekerja secara luring setelah dibuka. `.github/workflows/pages.yml` membangun dan mengujinya pada setiap push ke `main` dan men-deploy-nya ke GitHub Pages (Settings → Pages → Source: GitHub Actions); lalu ia berada di `https://<owner>.github.io/html-pgp/`.

Halaman tetap tidak menjangkau apa pun: kebijakannya hanya mengizinkan manifes, worker, dan ikonnya sendiri. Deploy baru dipasang di samping versi yang berjalan dan menunggu; Setelan menampilkan "Versi X siap." dengan tombol Perbarui, dan sebuah titik menandai setelan. Aplikasi terpasang juga membuka berkas `.gpg`, `.pgp`, `.sig`, dan `.asc` dari sistem (Buka Dengan), ke tampilan berkasnya.

## Tata letak

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

## Keterbatasan

- Tanpa server kunci atau WKD: halaman ini sengaja tidak memiliki akses jaringan. Tukar kunci sebagai berkas atau teks.
- Tanpa kartu pintar atau token perangkat keras. Kunci yang kunci utama rahasianya disimpan di tempat lain (stub GnuPG) dibaca, dan subkuncinya berfungsi; kunci seperti itu tidak dapat diubah di sini.
- Tanpa sertifikat S/MIME atau X.509 — hanya OpenPGP.
- Kepercayaan bersifat langsung: sertifikasi oleh kunci Anda sendiri. Owner trust GnuPG — memercayai sertifikasi orang lain — tidak dimodelkan.
- Berkas dibaca utuh ke memori: cukup untuk dokumen dan foto, tidak untuk berukuran gigabita.
- Berkas tunggal, PWA, dan ekstensi masing-masing menyimpan gantungan kuncinya sendiri (lihat "[Ekstensi Chrome](#ekstensi-chrome)").
- Kunci OpenPGP v6 belum dibaca oleh GnuPG atau Kleopatra.

## Lisensi

MIT — lihat [LICENSE](../../LICENSE). Build menyertakan [OpenPGP.js](https://openpgpjs.org/), di bawah GNU Lesser General Public License 3.0 atau yang lebih baru; pemberitahuannya disimpan di bagian atas skrip yang dibundel, dan sumbernya ada di https://github.com/openpgpjs/openpgpjs.

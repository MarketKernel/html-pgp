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
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.mr.md">🇮🇳 मराठी</a> ·
<a href="README.te.md">🇮🇳 తెలుగు</a> ·
<b>🇹🇷 Türkçe</b> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->
**HTML PGP**, [Kleopatra](https://apps.kde.org/kleopatra/) (GnuPG ile gelen sertifika yöneticisi) anlayışında bir OpenPGP anahtar yöneticisi ve şifreleme aracıdır — tek başına çalışan tek bir HTML dosyasında. Kendi anahtar çiftlerinizden ve başkalarının genel anahtarlarından oluşan bir anahtarlık tutar, yeni anahtarlar üretir (RSA, Curve25519, NIST ve Brainpool eğrileri, OpenPGP v6 Ed25519 ve Ed448), anahtarları onaylar; metinleri ve dosyaları şifreler, imzalar, şifrelerini çözer ve doğrular.

GnuPG ve Kleopatra ile aynı OpenPGP'yi konuşur: anahtarlar, iletiler ve imzalar iki yönde de geçer ve testler uygulamayı GnuPG'nin kendisiyle karşılaştırarak denetler.

Her şey çevrimdışı çalışır: hesap yok, sunucu yok, ağ isteği yok — sayfanın hiçbir ağ erişimi yoktur. Anahtarlar tarayıcıda tutulur; gizli anahtarlar, hiçbir zaman saklanmayan parolalarıyla şifreli kalır. Aynı sayfa ayrıca uygulama olarak kurulan bir [PWA](#github-pages) ve sekmelerinizin yanında açılan bir [Chrome eklentisi](#chrome-eklentisi) olarak da çalışır.

![HTML PGP: anahtarlık ve bir anahtarın ayrıntıları](../screenshot.png)

## Nasıl kullanılır

`build/html-pgp.html` dosyasını derleyin ("[Derleme](#derleme)" bölümüne bakın) ve bir tarayıcıda açın — doğrudan diskten açmak yeterlidir. Ya da GitHub Pages'teki PWA'yı veya eklentiyi kullanın.

Uygulamanın, Kleopatra'daki gibi üç görünümü vardır: **Anahtarlar**, **Notlar** ve **Dosyalar**, bir de **Ayarlar**.

### Anahtarlar

- **Yeni anahtar çifti** — adınız ve e-posta adresiniz, bir de gizli anahtarı koruyan bir parola. "Algoritma ve geçerlilik" altında: algoritma ("[Algoritmalar](#algoritmalar)" bölümüne bakın) ve anahtarın ne kadar süre geçerli olacağı — GnuPG ve Kleopatra'nın ürettiği gibi varsayılan olarak üç yıl. Anahtar üretildikten sonra uygulama hemen yedeklemeyi önerir: anahtarlık yalnızca bu tarayıcıda yaşar.
- **İçe aktar** — bir dosyadan (`.asc`, `.gpg`, `.key`…; her birinde bir veya birkaç anahtar, zırhlı veya ikili), panodan ya da metin olarak yapıştırarak. Anahtarlar görünümüne bırakılan dosyalar da içe aktarılır. Anahtarlıkta zaten bulunan bir anahtar birleştirilir: yeni kullanıcı kimlikleri, alt anahtarlar ve imzalar ona katılır, gizli anahtar da genel anahtarına katılır. GnuPG iptal sertifikası (`.rev`) yalnızca onayladıktan sonra içe aktarılır: anahtarı kalıcı olarak iptal eder.
- **Dışa aktar** — seçili genel anahtarlar, metin (`.asc`) veya ikili (`.gpg`) olarak, bir dosyaya ya da panoya. ⌘/Ctrl ve Shift ile birden çok anahtar seçilebilir.
- Liste her anahtarın adını, adresini, geçerliliğini, son kullanma tarihini ve anahtar kimliğini gösterir; arama anahtarları ad, adres, anahtar kimliği veya parmak iziyle bulur, süzgeç de kendi anahtar çiftlerinizi, onaylı anahtarları, kimsenin onaylamadığı anahtarları ya da süresi dolmuş ve iptal edilmiş olanları gösterir.

Bir anahtarın ayrıntıları; parmak izini GnuPG'nin yazdığı gibi dörtlü gruplar hâlinde, kullanıcı kimliklerini ve bunları kimin onayladığını, birincil anahtarı ve alt anahtarları algoritmaları, kullanımları ve tarihleriyle, bir de genel anahtarı metin olarak gösterir. Kendi anahtarlarınız için ⋯ menüsünde şunlar da bulunur:

- **Son kullanma tarihini değiştir** — anahtar ve alt anahtarları için yeni bir tarih ya da hiç tarih. Sonrasında genel anahtarı yeniden paylaşın ki başkaları görebilsin.
- **Kullanıcı kimliği ekle** — aynı anahtar için başka bir ad veya adres. Birincil olan birincil kalır.
- **Parolayı değiştir** — parola hatırlanıyor olsa bile önce mevcut parola sorulur. Boş bir parola, bir uyarıdan sonra anahtarı korumasız bırakır.
- **Gizli anahtarı yedekle** — gizli anahtar, hâlâ parolasının altında, `Name_0xKEYID_SECRET.asc` olarak. Önce parola sorulur, böylece yedeğin açıldığı bilinir.
- **İptal sertifikası** — anahtarla birlikte üretilen sertifika; anahtardan ayrı saklanmalıdır: anahtar kaybolursa ya da çalınırsa sertifikayı içe aktarın ve iptal edilmiş anahtarı paylaşın.
- **Anahtarı iptal et** ve birkaç kullanıcı kimliğinden birini **iptal et**.

### Onaylama

Bir anahtarı onaylamak "bu anahtarın bu kişiye ait olduğunu denetledim" demektir. Önce parmak izini sahibiyle denetleyin — yüz yüze ya da sesini tanıdığınız bir görüşmede — sonra anahtarın ayrıntılarında **Onayla**'ya basın ve kullanıcı kimliklerini seçin. Onay, GnuPG'nin yaptığı gibi anahtarınızın birincil anahtarıyla yapılır ve GnuPG onu kabul eder.

Geçerlilik, Kleopatra'nın güven ağı üzerindeki en yalın okumasını izler: kendi anahtarlarınıza sonuna kadar güvenilir; onayladığınız bir anahtar **Onaylı**dır; başka her anahtar çalışır ama kullanıldığı her yerde — listede, alıcılar arasında ve yaptığı bir imzada — **Onaylı değil** diye işaretlenir.

### Notlar

Bir ileti yazın, **alıcıları** seçin — yazarken ad, adres veya anahtar kimliğiyle bulunurlar — ve **Şifrele**'ye basın; "İmzalayan" altında bir anahtar seçiliyse **İmzala ve şifrele**'ye basın. "Kendim için de şifrele" kendi anahtarınızı ekler, böylece gönderdiğinizi okuyabilirsiniz. "Şifre ile şifrele" herkesin şifresini çözebileceği bir şifre ekler; alıcılarla birlikte ya da onların yerine kullanılır. **Yalnızca imzala** açık imzalı bir metin üretir: hâlâ okunabilir, imza altındadır.

Şifreli ya da imzalı bir ileti yapıştırın ve **Şifreyi çöz / doğrula**'ya basın: metnin şifresi yerinde çözülür — gerektiğinde anahtarınızın parolası sorulur — ve üzerindeki her imza denetlenir: geçerli, kötü (metin değiştirilmiş) ya da anahtarlığınızda olmayan bir anahtarla yapılmış. "Özgün metni göster" geri döner. ⌘/Ctrl+Enter bir iletinin şifresini çözer ya da düz metni şifreler. Yapıştırılan bir anahtar için içe aktarma önerilir.

### Dosyalar

Dosyaları düğmeyle ekleyin ya da pencereye bırakın. Her biri ne olduğunu anlamak için incelenir: düz bir dosya, şifreli, imzalı, ayrık bir imza, anahtarlar ya da bir iptal sertifikası.

- **İmzala / şifrele** — düz dosyalar için: anahtarlarınızdan biri olarak imzalayın; kendiniz için, başkaları için, bir şifreyle ya da bunların birkaçıyla birlikte şifreleyin. Şifreli dosyalar `.gpg` (metin olarak `.asc`) alır; yalnızca imzalamak her dosyanın yanına ayrık bir imza, `.sig` (ya da `.asc`) üretir.
- **Şifreyi çöz / doğrula** — geri kalanlar için. Ayrık bir imza, imzaladığı dosyayı adından bulur (`report.pdf.sig`, `report.pdf` ile eşleşir) ya da onu sorar. Şifresi çözülen dosyalar, şifreli olanların adından `.gpg` çıkarılarak adlandırılır.
- **Anahtarları içe aktar** — buraya bırakılan anahtar dosyaları için.

Her sonuç kendi düğmesiyle ya da hepsi birden kaydedilir.

### Parolalar

Bir kez açılan gizli anahtar, gpg-agent'ın tuttuğu gibi bir süre açık kalır: varsayılan olarak 10 dakika; ayarlarda "her seferinde sor"dan dört saate kadar. Yalnızca açılmış anahtar sayfanın belleğinde tutulur — parola asla, diske de asla yazılmaz. Menüdeki **Parolaları unut** hepsini bir anda kilitler; sayfayı yeniden yüklemek de öyle.

### Telefonda

Sayfa telefonda çalışır: her seferinde bir ekran, görünümler altta bir sekme çubuğunda, bir anahtarın ayrıntıları kendi ekranında bir geri düğmesiyle — sistemin geri hareketi de çalışır — ve alttan yükselen menüler. iOS'ta kaydedilen dosya, "Dosyalar'a Kaydet"in bulunduğu paylaşım sayfasına gider.

## Algoritmalar

| Seçim | GnuPG adları | Notlar |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | Varsayılan, GnuPG ve Kleopatra'daki gibi: kısa, hızlı, her yerde okunur. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA ve ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA ve ECDH; Almanya'da ve Avrupa'da yaygın. |
| RSA 2048, 3072, 4096 | rsa2048… | En eski ve en yaygın okunan; üretmesi birkaç saniye sürer. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | RFC 9580 anahtarları. **GnuPG ve Kleopatra bunları henüz okuyamaz.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | RFC 9580 anahtarları, yukarıdaki gibi. |

Her anahtar, GnuPG'nin yaptığı gibi, onaylayan ve imzalayan bir birincil anahtar ile şifreleyen bir alt anahtardan oluşur. Başka algoritmalardaki anahtarlar — örneğin eski GnuPG anahtarlıklarındaki DSA ve ElGamal — okunur ve kullanılır; yalnızca yenileri üretilmez. secp256k1 dışarıda bırakıldı: openpgp.js aksi söylenmedikçe onu reddeder.

## GnuPG ve Kleopatra ile uyumluluk

`tests/gnupg.mjs`, GnuPG'nin kendisini geçici bir ana dizinde çalıştırarak uygulamanın yazdıklarını sınar; `tests/pgp.mjs` ise GnuPG'nin yazdıklarını okur (`tests/fixtures/gnupg/`, `tools/gnupg-fixtures.sh` ile bir kez üretilmiştir). İki yönde de denetlenir:

- burada üretilen her v4 algoritmasının anahtarları GnuPG tarafından kullanım amaçlarıyla birlikte içe aktarılır ve kullanılır: GnuPG iletilerimizin şifresini çözer ve imzalarımızı denetler, biz de GnuPG'nin onlara şifrelediklerinin şifresini çözeriz;
- GnuPG yeni son kullanma tarihlerimizi, eklenen ve iptal edilen kullanıcı kimliklerini, başka anahtarların onaylarını ve iptal sertifikalarını görür;
- GnuPG'nin anahtarları, iletileri (OCB ile şifrelenmiş olanlar dahil), açık imzalı metinleri, ayrık imzaları, şifreyle şifrelenmiş iletileri ve iptal sertifikaları burada okunur.

Anahtarlarınızı Kleopatra'dan getirmek için: anahtar çiftinizi seçin → Gizli anahtarları dışa aktar (ya da "Gizli anahtarları yedekle") ve dosyayı buraya içe aktarın; başkalarının genel anahtarlarını da Dışa aktar ile aynı şekilde aktarın. Buradan geri götürmek için: genel anahtarı dışa aktarın ya da gizli anahtarı yedekleyin ve dosyayı Kleopatra'da içe aktarın.

## Chrome eklentisi

Aynı uygulama, okuduğunuz sayfanın yanında Chrome'un yan panelinde. Araç çubuğu düğmesi onu açar. Herhangi bir sayfada — bir web postasında, bir forumda, bir metin alanında — şifreli ya da imzalı bir metni seçin ve bağlam menüsünden **HTML PGP ile şifreyi çöz / doğrula**'yı seçin: panelin not defterinde, şifresi çözülmüş ve denetlenmiş olarak açılır. **HTML PGP ile şifrele** seçili metni, alıcıları sizin seçmeniz için teslim eder.

Eklenti olabildiğince az izin ister: yan panel, bağlam menüsü, kendi depolaması ve tıkladığınız sekme (activeTab) — seçimi satır sonlarıyla birlikte okumak için; bağlam menüsünün kendisi bunları kaybeder. Bunun dışında hiçbir web sitesine erişimi yoktur ve sayfalarının, uygulamanınki gibi, ağ erişimi yoktur. Bir sayfanın okunamadığı yerlerde (Chrome'un kendi sayfaları, Web Mağazası, bir PDF) menünün kendi seçim kopyası kullanılır ve zırhı satırlarına geri konur.

Eklentinin kendine ait bir anahtarlığı vardır: tarayıcılar her kaynağın verisini ayrı tutar, bu yüzden tek dosyanın, PWA'nın ve eklentinin her birinin kendi anahtarlığı vardır. Anahtarları aralarında dışa ve içe aktararak ya da bir yedekle taşıyın.

`npm run build` ile derleyin ve `build/extension/` klasörünü `chrome://extensions` sayfasında yükleyin (Geliştirici modu → Paketlenmemiş öğe yükle) ya da Chrome Web Mağazası için `build/html-pgp-extension-<version>.zip` dosyasını alın.

## Güvenlik

- **Hiçbir şey sayfadan çıkmaz.** Content-Security-Policy'sinde `connect-src 'none'` ve `default-src 'none'` vardır: fetch yok, başka yerden resim veya yazı tipi yok, dışarı gönderen form yok. Her şey gömülüdür — stiller, openpgp.js, simgeler. Derleme herhangi bir harici `src` veya `href` bulursa başarısız olur ve CI derlenmiş dosyayı yeniden denetler. PWA'nın kopyası kendi manifestini, service worker'ını ve simgelerini yükleyebilir; eklentinin sayfalarında aynı ilke manifestinde yer alır.
- **Gizli anahtarlar şifreli saklanır.** Anahtarlık tarayıcının IndexedDB'sinde yaşar, openpgp.js'in zırhladığı biçimde anahtar başına bir kayıt olarak: gizli anahtar parolasıyla şifreli kalır (AES-256; anahtar, GnuPG'de olduğu gibi yinelemeli ve tuzlu bir S2K ile paroladan türetilir) ve yalnızca gerektiğinde, bellekte çözülür. Parola asla saklanmaz. Parolasız bir anahtar, ayrıntılarında bu şekilde işaretlenir.
- **Açılmış anahtarlar unutulur:** ayarlarda belirlenen süreden sonra, "Parolaları unut" ile ve sayfa kapandığında.
- **Parola alanları bilerek metin girdisidir**; metin saydamdır ve üzerine noktalar çizilir. macOS'ta bir parola alanı Latin klavye düzenini zorlayan Secure Input'u açar: Kiril, Yunan veya Arap harfleriyle bir parola yazılamazdı. Bu alan tarayıcıya böyle bir ipucu vermez, yine de yazılanı gizler ve kopyalanmasına izin vermez.
- **İmzalar, güvendiğiniz anahtarlara göre değerlendirilir.** Kimsenin onaylamadığı bir anahtardan gelen geçerli imza bunu söyler ve parmak izinin neden denetlenmesi gerektiğini belirtir.
- **Güvenilen taban tarayıcıdır.** Bu sayfada kod çalıştırabilen ya da tarayıcının profilini okuyabilen her şey — tüm sitelere erişimi olan kötü amaçlı bir eklenti, bilgisayardaki kötü amaçlı yazılım — sayfanın okuyabildiğini okuyabilir. Gizli anahtarlarınızın yedeklerini başka yerde tutun: tarayıcının verilerini temizlemek anahtarlığı siler.

## Özellikler

- IndexedDB'de anahtarlık; uygulamanın bu kaynaktaki pencereleri paylaşır; birinde yapılan değişiklik diğerlerinde görünür.
- Son kullanma tarihli ve onlarla birlikte üretilen bir iptal sertifikalı, on iki türde yeni anahtar çiftleri.
- Zırhlı ve ikili anahtarların içe aktarılması, birkaç tanesi birden, mevcut olanlarla birleştirilerek; GnuPG iptal sertifikaları onayla.
- Genel anahtarların dışa aktarılması, gizli anahtarların yedeklenmesi, tek tek ya da hepsi.
- Başkalarının anahtarlarını onaylama; kendi onaylarınızdan geçerlilik.
- Anahtarınızı değiştirme: son kullanma tarihi, kullanıcı kimlikleri, parola, iptal — imza ekleyerek, GnuPG'nin yaptığı gibi; böylece anahtar her yerde okunabilir kalır ve başkalarının onayları üzerinde kalır.
- Notlar: şifrele, imzala, imzala ve şifrele, şifre ile şifrele, şifreyi çöz, doğrula.
- Dosyalar: dosyalar için aynıları, ayrık imzalar, birden çok dosya aynı anda.
- Bir süre hatırlanan parolalar, yalnızca bellekte.
- Sistemi izleyen ya da seçilen açık ve koyu tema.
- 17 dil; Arapça ve Urduca sağdan sola.
- Telefon düzeni; PWA bir telefona ya da bilgisayara kurulur ve çevrimdışı çalışır.
- Kurulu PWA ile Finder'dan veya Explorer'dan açılan dosyalar onun dosyalar görünümüne gelir.
- Seçili metin için bağlam menülü bir Chrome eklentisi.

## Klavye kısayolları

| Tuşlar | |
| --- | --- |
| ⌘/Ctrl+F | Anahtar ara |
| ⇧⌘N / Shift+Ctrl+N | Yeni anahtar çifti |
| ⇧⌘I / Shift+Ctrl+I | İçe aktar |
| ↑ ↓, Home, End | Anahtar listesinde gezin |
| ⌘/Ctrl+A | Listedeki tüm anahtarları seç |
| Delete | Seçili anahtarları sil |
| ⌘/Ctrl+Enter | Notlarda: bir iletinin şifresini çöz ya da düz metni şifrele |
| Esc | Bir iletişim kutusunu ya da menüyü kapat |

## Çeviriler

Arayüz İngilizce ve 16 dil daha konuşur: Çince, Hintçe, İspanyolca, Fransızca, Arapça, Bengalce, Portekizce, Rusça, Urduca, Endonezce, Almanca, Japonca, Marathi, Telugu, Türkçe ve Ukraynaca. Ayarlarda biri seçilmediyse tarayıcının dilini izler. Arapça ve Urduca sağdan sola dizilir.

İngilizce metin kodun içinde yaşar: `t('context', 'English text')` ya da sayı içeren bir metin için `tn('context', '{count} key', '{count} keys', n)`, düz dize sabitleriyle — `tools/i18n.mjs` bunları bir düzenli ifadeyle bulur. Şablonda `data-i18n` bir öğenin metnini, `data-i18n-attr` ise title, placeholder ve aria-label değerlerini çevirir. Her dil bir sözlüktür, `src/locales/<code>.json`: `{ "context": { "English text": "translation" } }`; çoğul biçimler `Intl.PluralRules` ile. Bir sözlükte eksik olan dize İngilizce gösterilir.

`npm run i18n` her dil için sözlüğün eksik olduğu dizeleri ve sözlükte olup arayüzün artık kullanmadıklarını yazdırır; `npm test` sözlükleri denetler: eskimiş anahtar yok, aynı yer tutucular, her çoğul biçim, her bağlam bir kez. Chrome'un eklentinin kendisinden gösterdikleri — adı, açıklaması ve düğme başlığı — aynı sözlüklerden, `manifest` bağlamından gelir.

## Derleme

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ and its zip
npm run watch          # rebuilds on every change
./build.sh             # the same, installing the dependencies on the first run
```

`build.mjs`, `src/app/main.ts` dosyasını esbuild ile tek bir betikte paketler ve bunu, stilleri ve simgeyi `src/app/template.html` içine gömer. openpgp.js tek çalışma zamanı bağımlılığıdır.

```sh
npm run check          # everything below, in order
npm run typecheck      # tsc --noEmit
npm test               # unit tests in Node; tests/gnupg.mjs needs gpg, and says so without it
npm run test:browser   # the page, the PWA and the extension in headless Chrome
npm run shots -- DIR   # screenshots of every main screen into DIR
npm run icons          # the PNG icons, drawn from assets/*.svg
```

Tarayıcı testleri, Node dışında bağımlılık olmadan, DevTools protokolü üzerinden yerel bir Chrome'u sürer; `CHROME=/path/to/chrome` birini seçer.

## Sürümler ve yayınlar

Sürüm yalnızca `package.json` içinde yaşar. `v<version>` etiketli işlemenin derlemesi onu olduğu gibi gösterir; başka her derleme işlemeyi ekler — `0.1.0+1a2b3c4` — böylece `main` üzerinden derlenen bir sayfa yayın sanılmaz. Yayınlamak için: `npm version minor && git push --follow-tags`. Yayın iş akışı etiketin `package.json` ile eşleştiğini denetler, testleri çalıştırır ve `html-pgp-<tag>.html`, `html-pgp-extension-<tag>.zip` ve `SHA256SUMS.txt` dosyalarını ekler.

## GitHub Pages

`build/pages/`, kurulabilir bir PWA olarak aynı sayfadır: bir manifest, simgeler ve bir kez açıldıktan sonra çevrimdışı çalışmasını sağlayan bir service worker. `.github/workflows/pages.yml` onu `main` üzerindeki her push'ta derler, sınar ve GitHub Pages'e dağıtır (Settings → Pages → Source: GitHub Actions); sonra `https://<owner>.github.io/html-pgp/` adresindedir.

Sayfa yine de hiçbir yere ulaşmaz: ilkesi yalnızca kendi manifestine, worker'ına ve simgelerine izin verir. Yeni bir dağıtım çalışan sürümün yanına kurulur ve bekler; Ayarlar "{version} sürümü hazır." ile bir Güncelle düğmesi gösterir ve bir nokta ayarları işaretler. Kurulu uygulama ayrıca sistemden `.gpg`, `.pgp`, `.sig` ve `.asc` dosyalarını (Birlikte aç) dosyalar görünümüne açar.

## Yerleşim

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

## Sınırlamalar

- Anahtar sunucusu ya da WKD yok: sayfanın tasarım gereği ağ erişimi yoktur. Anahtarları dosya ya da metin olarak değiştirin.
- Akıllı kart ya da donanım belirteci yok. Gizli birincil anahtarı başka yerde tutulan anahtarlar (GnuPG'nin stub'ları) okunur ve alt anahtarları çalışır; böyle bir anahtar burada değiştirilemez.
- S/MIME ya da X.509 sertifikası yok — yalnızca OpenPGP.
- Güven doğrudandır: kendi anahtarlarınızın onayları. GnuPG'nin sahip güveni — başkalarının onaylarına güvenmek — modellenmemiştir.
- Dosyalar bütünüyle belleğe okunur: belgeler ve fotoğraflar için uygun, gigabaytlar için değil.
- Tek dosya, PWA ve eklentinin her biri kendi anahtarlığını tutar ("[Chrome eklentisi](#chrome-eklentisi)" bölümüne bakın).
- OpenPGP v6 anahtarlarını GnuPG ya da Kleopatra henüz okumaz.

## Lisans

MIT — bkz. [LICENSE](../../LICENSE). Derleme, GNU Lesser General Public License 3.0 veya sonrası altındaki [OpenPGP.js](https://openpgpjs.org/)'i içerir; bildirimi paketlenmiş betiğin başında tutulur ve kaynağı https://github.com/openpgpjs/openpgpjs adresindedir.

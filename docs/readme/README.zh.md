# html-pgp

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<b>🇨🇳 中文</b> ·
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
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

**HTML PGP** 是一款 OpenPGP 密钥管理与加密工具，理念上与 [Kleopatra](https://apps.kde.org/kleopatra/)（GnuPG 自带的证书管理器）相近——但全部装在一个独立的 HTML 文件里。它维护一个密钥环，保存您自己的密钥对和他人的公钥，可以生成新密钥（RSA、Curve25519、NIST 和 Brainpool 曲线、OpenPGP v6 的 Ed25519 和 Ed448），认证密钥，并对文本和文件进行加密、签名、解密和验证。

它使用与 GnuPG 和 Kleopatra 相同的 OpenPGP：密钥、消息和签名可以双向互通，测试也是直接与 GnuPG 本身对照检查的。

一切都可离线运行：无需账号，无需服务器，没有任何网络请求——页面完全没有网络访问权限。密钥保存在浏览器中；私钥始终以密码短语加密，而密码短语本身从不保存。同一个页面还可以作为 [PWA](#github-pages) 安装成应用，也可以作为在标签页旁边打开的 [Chrome 扩展](#chrome-扩展)。

![HTML PGP：密钥环和密钥详情](../screenshot.png)

## 使用方法

构建 `build/html-pgp.html`（见“[构建](#构建)”），然后在浏览器中打开——直接从磁盘打开即可。也可以使用 GitHub Pages 上的 PWA，或者扩展。

与 Kleopatra 一样，应用有三个视图：**密钥**、**记事本**和**文件**，外加**设置**。

### 密钥

- **新建密钥对**——您的姓名和电子邮件地址，以及保护私钥的密码短语。在“算法和有效期”下：选择算法（见“[算法](#算法)”）和密钥的有效期——默认三年，与 GnuPG 和 Kleopatra 生成的密钥相同。密钥生成后，应用会立即提议备份：密钥环仅存在于此浏览器中。
- **导入**——从文件（`.asc`、`.gpg`、`.key`……，每个文件含一个或多个密钥，文本或二进制格式均可）、从剪贴板，或粘贴文本。拖放到密钥视图上的文件也会被导入。已在密钥环中的密钥会被合并：新的用户标识、子密钥和签名会并入其中，私钥会并入对应的公钥。GnuPG 吊销证书（`.rev`）只有在您确认后才会导入：它会永久吊销该密钥。
- **导出**——将所选公钥以文本（`.asc`）或二进制（`.gpg`）形式导出到文件或剪贴板。可以配合 ⌘/Ctrl 和 Shift 选择多个密钥。
- 列表显示每个密钥的名称、地址、有效性、有效期和密钥 ID；搜索可按名称、地址、密钥 ID 或指纹查找密钥，筛选器可以只显示您的密钥对、已认证的密钥、无人认证的密钥，或已过期和已吊销的密钥。

密钥详情会显示按四个字符一组排列的指纹（与 GnuPG 的输出方式相同）、用户标识及其认证者、主密钥和子密钥及其算法、用途和日期，以及文本形式的公钥。对于您自己的密钥，⋯ 菜单中还有：

- **更改有效期**——为密钥及其子密钥设置新的日期，或设为永不过期。之后请重新分享公钥，让其他人看到更新。
- **添加用户标识**——为同一个密钥添加另一个名称或地址。主用户标识仍然是主用户标识。
- **更改密码短语**——会先询问当前密码短语，即使它仍被记住也是如此。设为空会在警告后让密钥处于无保护状态。
- **备份私钥**——私钥仍受其密码短语保护，保存为 `Name_0xKEYID_SECRET.asc`。会先询问密码短语，以确保备份可以打开。
- **吊销证书**——随密钥一同生成的那份，请与密钥分开保存：如果密钥丢失或被盗，导入该证书并分享已吊销的密钥。
- **吊销密钥**，以及在多个用户标识中**吊销**其中之一。

### 认证

认证一个密钥，意思是“我已确认这个密钥属于这个人”。请先与密钥所有者核对指纹——当面核对，或在能听出对方声音的通话中核对——然后在密钥详情中点击**认证**，并选择要认证的用户标识。认证使用您密钥的主密钥完成，与 GnuPG 的做法一致，GnuPG 也能接受它。

有效性遵循 Kleopatra 对信任网络最简单的理解：您自己的密钥被完全信任；您认证过的密钥为**已认证**；其他密钥也可以使用，但在用到它的任何地方都会标记为**未认证**——在列表中、在收件人中，以及在它所作的签名上。

### 记事本

输入一条消息，选择**收件人**——输入时可按名称、地址或密钥 ID 查找——然后点击**加密**；如果在“签名者”下选择了密钥，则点击**签名并加密**。“同时加密给我”会加入您自己的密钥，这样您就能读到自己发出的内容。“使用密码加密”会加入一个任何人都可用来解密的密码，可以与收件人并用，也可以代替收件人。**仅签名**会生成明文签名文本：仍然可读，签名附在下方。

粘贴一条加密或签名的消息，然后点击**解密 / 验证**：文本会就地解密——需要时会询问您密钥的密码短语——并检查其上的每个签名：有效、无效（文本被改动过），或由不在您密钥环中的密钥所签。“显示原文”可以返回。⌘/Ctrl+Enter 解密消息，或加密纯文本。粘贴的密钥会提示导入。

### 文件

通过按钮添加文件，或将文件拖放到窗口上。每个文件都会被检查以判断其类型：普通文件、加密文件、已签名文件、分离签名、密钥或吊销证书。

- **签名 / 加密**——针对普通文件：以您的某个密钥签名，为自己加密、为他人加密、使用密码加密，或同时使用其中几种。加密后的文件为 `.gpg`（文本格式则为 `.asc`）；仅签名时会在每个文件旁生成分离签名 `.sig`（或 `.asc`）。
- **解密 / 验证**——针对其余文件。分离签名会按名称找到它所签名的文件（`report.pdf.sig` 对应 `report.pdf`），否则会要求您指定。解密后的文件以加密文件的名称去掉 `.gpg` 命名。
- **导入密钥**——针对拖放到这里的密钥文件。

每个结果可以用各自的按钮保存，也可以一次全部保存。

### 密码短语

解锁过一次的私钥会保持解锁一段时间，就像 gpg-agent 保管它那样：默认 10 分钟，可在设置中调整，从“每次询问”到四小时。保留的只有解密后的密钥，存放在页面内存中——绝不保留密码短语，也绝不写入磁盘。菜单中的**清除密码短语**会一次性全部锁定；重新加载页面也会。

### 在手机上

页面可在手机上使用：一次显示一个屏幕，视图位于底部的标签栏中，密钥详情独占一个带返回按钮的屏幕（系统的返回手势同样有效），菜单从底部升起。在 iOS 上，保存的文件会进入共享面板，那里有“存储到“文件””。

## 算法

| 选项 | GnuPG 名称 | 说明 |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | 默认选项，与 GnuPG 和 Kleopatra 相同：短小、快速，到处都能读取。 |
| ECC NIST P-256、P-384、P-521 | nistp256, nistp384, nistp521 | ECDSA 和 ECDH。 |
| ECC Brainpool P-256、P-384、P-512 | brainpoolP256r1… | ECDSA 和 ECDH；在德国和欧洲较常用。 |
| RSA 2048、3072、4096 | rsa2048… | 最古老、读取最广泛；生成需要几秒钟。 |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | RFC 9580 密钥。**GnuPG 和 Kleopatra 暂时无法读取。** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | RFC 9580 密钥，同上。 |

与 GnuPG 一样，每个密钥由一个负责认证和签名的主密钥和一个负责加密的子密钥组成。其他算法的密钥——例如旧 GnuPG 密钥环中的 DSA 和 ElGamal——可以读取和使用；只是不再生成这些新密钥。secp256k1 未包含在内：除非另行设置，openpgp.js 会拒绝它。

## 与 GnuPG 和 Kleopatra 的兼容性

`tests/gnupg.mjs` 在一个用后即弃的主目录中运行 GnuPG 本身，检查应用写出的内容；`tests/pgp.mjs` 则读取 GnuPG 写出的内容（`tests/fixtures/gnupg/`，由 `tools/gnupg-fixtures.sh` 一次性生成）。双向都已检查：

- 此处生成的所有 v4 算法的密钥，都能被 GnuPG 导入，连同其用途一起，并可使用：GnuPG 能解密我们的消息并验证我们的签名，我们也能解密 GnuPG 加密给这些密钥的内容；
- GnuPG 能看到我们新的有效期、添加和吊销的用户标识、对其他密钥的认证以及吊销证书；
- GnuPG 的密钥、消息（包括其 OCB 加密的消息）、明文签名文本、分离签名、密码加密的消息和吊销证书，在这里都可以读取。

要把您的密钥从 Kleopatra 迁过来：选择您的密钥对 → Export secret keys（或 “Backup secret keys”），然后在这里导入该文件；他人的公钥同样通过 Export 导出后导入。要从这里迁回去：导出公钥，或备份私钥，然后在 Kleopatra 中导入该文件。

## Chrome 扩展

同一个应用，位于 Chrome 的侧边栏中，就在您正在阅读的页面旁边。点击工具栏按钮即可打开。在任何页面上选中一段加密或签名的文本——在网页邮箱、论坛、文本框中皆可——然后在右键菜单中选择**使用 HTML PGP 解密 / 验证**：它会在侧边栏的记事本中打开，已解密并验证。**使用 HTML PGP 加密**会把选中的文本交给您，由您选择收件人。

扩展只索取尽可能少的权限：侧边栏、右键菜单、它自己的存储，以及您点击所在的标签页（activeTab）——用于读取带换行的选中内容，而右键菜单本身会丢失换行。除此之外，它无权访问任何网站，它的页面也和应用一样没有网络访问权限。在无法读取页面的地方（Chrome 自己的页面、Web Store、PDF），会使用菜单自带的选中文本副本，并把它的 armor 重新按行排好。

扩展有自己独立的密钥环：浏览器会把每个源的数据分开保存，所以单文件、PWA 和扩展各有各的密钥环。可以通过导出和导入，或通过备份，在它们之间迁移密钥。

用 `npm run build` 构建，然后在 `chrome://extensions` 中加载 `build/extension/`（开发者模式 → 加载已解压的扩展程序），或者取 `build/html-pgp-extension-<version>.zip` 提交到 Chrome Web Store。

## 安全

- **没有任何内容会离开页面。** 它的 Content-Security-Policy 设有 `connect-src 'none'` 和 `default-src 'none'`：不能 fetch，不能从别处加载图片或字体，没有向外提交的表单。一切都是内联的——样式、openpgp.js、图标。构建遇到任何外部 `src` 或 `href` 都会失败，CI 还会再次检查构建出的文件。PWA 的版本可以加载它自己的 manifest、service worker 和图标；扩展的页面在其 manifest 中有相同的策略。
- **私钥以加密形式存储。** 密钥环保存在浏览器的 IndexedDB 中，每个密钥一条记录，格式为 openpgp.js 输出的 armor：私钥始终以其密码短语加密（AES-256，由密码短语经迭代加盐的 S2K 派生密钥，与 GnuPG 相同），只在需要时于内存中解密。密码短语从不存储。没有密码短语的密钥会在其详情中标明。
- **已解锁的密钥会被遗忘**：在设置中设定的时间之后、点击“清除密码短语”时，以及页面关闭时。
- **密码短语输入框特意使用文本输入框**，文字透明，圆点绘制在其上方。在 macOS 上，密码字段会开启 Secure Input，强制使用拉丁键盘布局：用西里尔文、希腊文或阿拉伯文的密码短语就无法输入。这个输入框不给浏览器这样的提示，仍然隐藏输入的内容，也不允许复制。
- **签名由您信任的密钥来判断。** 来自无人认证的密钥的有效签名会如实说明，并提示为何要核对其指纹。
- **浏览器是可信基础。** 任何能在此页面中运行代码或读取浏览器配置文件的东西——能访问所有网站的恶意扩展、电脑上的恶意软件——都能读取页面所能读取的内容。请把私钥的备份保存在别处：清除浏览器数据会删除密钥环。

## 功能

- 密钥环存放在 IndexedDB 中，由此源上的应用各窗口共享；一个窗口中的更改会显示在其他窗口中。
- 十二种新建密钥对，带有效期，并同时生成吊销证书。
- 导入文本和二进制密钥，可一次多个，并与已有内容合并；GnuPG 吊销证书需确认后导入。
- 导出公钥，备份私钥，可单个或全部。
- 认证他人的密钥；根据您自己的认证得出有效性。
- 更改您的密钥：有效期、用户标识、密码短语、吊销——通过添加签名完成，与 GnuPG 相同，因此密钥在各处仍可读取，他人对它的认证也得以保留。
- 记事本：加密、签名、签名并加密、使用密码加密、解密、验证。
- 文件：对文件做同样的事，支持分离签名，可一次处理多个文件。
- 密码短语会被记住一段时间，仅存于内存。
- 浅色和深色主题，可跟随系统或自行选择。
- 17 种语言，阿拉伯语和乌尔都语从右到左排版。
- 手机布局；PWA 可安装在手机或电脑上，并可离线使用。
- 在 Finder 或资源管理器中用已安装的 PWA 打开的文件，会进入它的文件视图。
- 带有选中文本右键菜单的 Chrome 扩展。

## 键盘快捷键

| 按键 | |
| --- | --- |
| ⌘/Ctrl+F | 搜索密钥 |
| ⇧⌘N / Shift+Ctrl+N | 新建密钥对 |
| ⇧⌘I / Shift+Ctrl+I | 导入 |
| ↑ ↓, Home, End | 在密钥列表中移动 |
| ⌘/Ctrl+A | 选中列表中的所有密钥 |
| Delete | 删除所选密钥 |
| ⌘/Ctrl+Enter | 在记事本中：解密消息，或加密纯文本 |
| Esc | 关闭对话框或菜单 |

## 翻译

界面支持英语和另外 16 种语言：中文、印地语、西班牙语、法语、阿拉伯语、孟加拉语、葡萄牙语、俄语、乌尔都语、印度尼西亚语、德语、日语、马拉地语、泰卢固语、土耳其语和乌克兰语。默认跟随浏览器的语言，也可在设置中另行选择。阿拉伯语和乌尔都语从右到左排版。

英文文本写在代码里：`t('context', 'English text')`，带数字的文本则用 `tn('context', '{count} key', '{count} keys', n)`，且只使用普通字符串字面量——`tools/i18n.mjs` 用正则表达式查找它们。在模板中，`data-i18n` 翻译元素的文本，`data-i18n-attr` 翻译其 title、placeholder 和 aria-label。每种语言是一个字典 `src/locales/<code>.json`：`{ "context": { "English text": "translation" } }`，复数形式由 `Intl.PluralRules` 处理。字典中缺少的字符串会以英文显示。

`npm run i18n` 会按语言打印字典中缺少的字符串，以及字典中有但界面已不再使用的字符串；`npm test` 检查字典：没有过时的键、占位符相同、每种复数形式齐全、每个 context 只出现一次。Chrome 对扩展本身显示的内容——名称、描述和按钮标题——来自同样的字典，context 为 `manifest`。

## 构建

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ 及其 zip
npm run watch          # 每次更改都重新构建
./build.sh             # 同上，首次运行时会安装依赖
```

`build.mjs` 用 esbuild 将 `src/app/main.ts` 打包成一个脚本，并把它、样式和图标内联进 `src/app/template.html`。openpgp.js 是唯一的运行时依赖。

```sh
npm run check          # 以下所有内容，按顺序执行
npm run typecheck      # tsc --noEmit
npm test               # 在 Node 中运行单元测试；tests/gnupg.mjs 需要 gpg，没有时会说明
npm run test:browser   # 在无头 Chrome 中测试页面、PWA 和扩展
npm run shots -- DIR   # 将每个主要屏幕的截图保存到 DIR
npm run icons          # PNG 图标，由 assets/*.svg 绘制
```

浏览器测试通过 DevTools 协议驱动本地的 Chrome，除 Node 外没有其他依赖；可用 `CHROME=/path/to/chrome` 指定 Chrome。

## 版本与发布

版本号只存在于 `package.json` 中。带有 `v<version>` 标签的提交所构建的版本会原样显示它；其他任何构建都会附加提交信息——`0.1.0+1a2b3c4`——这样从 `main` 构建的页面就不会被当成正式发布。发布方法：`npm version minor && git push --follow-tags`。发布工作流会检查标签与 `package.json` 一致，运行测试，并附上 `html-pgp-<tag>.html`、`html-pgp-extension-<tag>.zip` 和 `SHA256SUMS.txt`。

## GitHub Pages

`build/pages/` 是同一个页面，作为可安装的 PWA：包含 manifest、图标和一个 service worker，打开过一次之后即可离线使用。`.github/workflows/pages.yml` 在每次推送到 `main` 时构建并测试它，并部署到 GitHub Pages（Settings → Pages → Source: GitHub Actions）；之后可在 `https://<owner>.github.io/html-pgp/` 访问。

该页面仍然不访问任何外部资源：它的策略只允许加载自己的 manifest、worker 和图标。新的部署会安装在正在运行的版本旁边并等待；设置中会显示“版本 X 已就绪”和“更新”按钮，设置上还有一个圆点作标记。已安装的应用还可以从系统中（打开方式）打开 `.gpg`、`.pgp`、`.sig` 和 `.asc` 文件，进入它的文件视图。

## 目录结构

```text
build.mjs                 构建：单文件、PWA、扩展及其 zip
src/core/                 不涉及 DOM——在测试中于 Node 下运行
  pgp.ts                  所有 OpenPGP 操作，基于 openpgp.js
  keys.ts                 密钥是什么，即界面所展示的样子
  keyring.ts              密钥环：存储、导入与合并、信任
  armor.ts                从单行修复的 ASCII armor
  i18n.ts                 语言与字符串查找
src/app/                  页面
  template.html           标记，含 CSP
  styles.css              全部样式
  main.ts                 启动、视图、快捷键、拖放的文件、其他窗口
  keylist.ts              密钥视图：列表、搜索、筛选、选择
  details.ts              单个密钥的完整信息
  keyactions.ts           对话框：新建密钥、导入、导出、认证、更改、删除
  notepad.ts, files.ts    记事本和文件视图
  recipients.ts           选择收件人
  outcome.ts              解密和验证的结果，用文字表述
  agent.ts                密码短语和已解锁的密钥
  settings.ts             保存在 localStorage 中的偏好设置；settingsview.ts 为其视图
  store.ts                IndexedDB，以及来自其他窗口的更改通知
  save.ts                 要保存的文件、剪贴板
  ui.ts, screens.ts       对话框、菜单、提示条；手机上一次一个屏幕
  update.ts, platform.ts  PWA 更新；扩展附加的内容
src/extension/            manifest、后台 worker、侧边栏的 platform、grab.ts
src/pwa/sw.js             PWA 的 service worker
src/locales/              16 个字典
tests/                    Node 中的 pgp、keyring、gnupg、i18n；Chrome 中的应用和扩展
tests/fixtures/gnupg/     由 GnuPG 生成的密钥、消息和签名
tools/                    load.mjs, chrome.mjs, i18n.mjs, shots.mjs, icons.mjs, gnupg-fixtures.sh
```

## 局限

- 没有密钥服务器或 WKD：页面按设计没有网络访问。请以文件或文本交换密钥。
- 不支持智能卡或硬件令牌。私有主密钥保存在别处的密钥（GnuPG 的 stub）可以读取，其子密钥可用；但这样的密钥无法在这里更改。
- 不支持 S/MIME 或 X.509 证书——仅限 OpenPGP。
- 信任是直接的：只看您自己密钥所做的认证。GnuPG 的所有者信任——信任他人所做的认证——没有建模。
- 文件会被整个读入内存：处理文档和照片没问题，处理几 GB 的文件则不行。
- 单文件、PWA 和扩展各有自己的密钥环（见“[Chrome 扩展](#chrome-扩展)”）。
- GnuPG 和 Kleopatra 暂时还无法读取 OpenPGP v6 密钥。

## 许可证

MIT——见 [LICENSE](../../LICENSE)。构建包含 [OpenPGP.js](https://openpgpjs.org/)，其许可证为 GNU Lesser General Public License 3.0 或更高版本；其声明保留在打包脚本的顶部，源代码位于 https://github.com/openpgpjs/openpgpjs。

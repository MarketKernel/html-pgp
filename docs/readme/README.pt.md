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
<b>🇧🇷 Português</b> ·
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

**HTML PGP** é um gerenciador de chaves e ferramenta de criptografia OpenPGP no espírito do
[Kleopatra](https://apps.kde.org/kleopatra/), o gerenciador de certificados que acompanha o
GnuPG, em um único arquivo HTML independente. Ele mantém um chaveiro com os seus pares de
chaves e as chaves públicas de outras pessoas, cria chaves novas (RSA, Curve25519, curvas
NIST e Brainpool, OpenPGP v6 Ed25519 e Ed448), certifica chaves, e criptografa, assina,
descriptografa e verifica textos e arquivos.

Ele fala o mesmo OpenPGP que o GnuPG e o Kleopatra: chaves, mensagens e assinaturas funcionam
nos dois sentidos, e os testes o conferem com o próprio GnuPG.

Tudo funciona offline: sem conta, sem servidor, sem requisições de rede — a página não tem
nenhum acesso à rede. As chaves ficam no navegador; as chaves secretas permanecem
criptografadas com suas frases secretas, que nunca são armazenadas. A mesma página também é
um [PWA](#github-pages) que se instala como aplicativo e uma
[extensão do Chrome](#extensão-do-chrome) que se abre ao lado das suas abas.

![HTML PGP: o chaveiro e os detalhes de uma chave](../screenshot.png)

## Como usar

Compile `build/html-pgp.html` (veja “[Compilação](#compilação)”) e abra-o em um navegador —
direto do disco funciona. Ou use o PWA do GitHub Pages, ou a extensão.

O aplicativo tem três telas, como o Kleopatra: **Chaves**, **Notas** e **Arquivos**, e
**Ajustes**.

### Chaves

- **Novo par de chaves** — seu nome e endereço de e-mail, e uma frase secreta que protege a
  chave secreta. Em “Algoritmo e validade”: o algoritmo (veja “[Algoritmos](#algoritmos)”) e
  por quanto tempo a chave é válida — três anos por padrão, como o GnuPG e o Kleopatra as
  criam. Depois que a chave é criada, o aplicativo se oferece para fazer o backup na hora: o
  chaveiro vive apenas neste navegador.
- **Importar** — a partir de um arquivo (`.asc`, `.gpg`, `.key`…, com uma ou várias chaves em
  cada um, em armadura de texto ou binário), da área de transferência, ou colado como texto.
  Arquivos soltos na tela de chaves também são importados. Uma chave que já está no chaveiro
  é mesclada: novos IDs de usuário, subchaves e assinaturas se juntam a ela, e uma chave
  secreta se junta à sua chave pública. Um certificado de revogação do GnuPG (`.rev`) só é
  importado depois que você o confirma: ele revoga a chave para sempre.
- **Exportar** — as chaves públicas selecionadas, como texto (`.asc`) ou binário (`.gpg`),
  para um arquivo ou para a área de transferência. Várias chaves podem ser selecionadas com
  ⌘/Ctrl e Shift.
- A lista mostra o nome, o endereço, a validade, a data de expiração e o ID de cada chave; a
  busca encontra chaves por nome, endereço, ID da chave ou impressão digital, e o filtro
  mostra seus pares de chaves, as chaves certificadas, as que ninguém certificou, ou as
  expiradas e revogadas.

Os detalhes de uma chave mostram sua impressão digital em grupos de quatro, como o GnuPG a
imprime, seus IDs de usuário e quem os certificou, a chave primária e as subchaves com seus
algoritmos, usos e datas, e a chave pública como texto. Para as suas próprias chaves, o menu
⋯ também tem:

- **Alterar validade…** — uma nova data para a chave e suas subchaves, ou nenhuma.
  Compartilhe a chave pública de novo depois, para que os outros a vejam.
- **Adicionar ID de usuário…** — outro nome ou endereço para a mesma chave. O primário
  continua sendo o primário.
- **Alterar frase secreta…** — a atual é pedida primeiro, mesmo enquanto está lembrada. Uma
  vazia deixa a chave sem proteção, após um aviso.
- **Backup da chave secreta…** — a chave secreta, ainda sob sua frase secreta, como
  `Nome_0xKEYID_SECRET.asc`. A frase secreta é pedida primeiro, para que se saiba que o
  backup abre.
- **Certificado de revogação…** — o criado junto com a chave, para guardar separado dela: se
  a chave for perdida ou roubada, importe o certificado e compartilhe a chave revogada.
- **Revogar chave…**, e **revogar** um entre vários IDs de usuário.

### Certificar

Certificar uma chave diz “verifiquei que esta chave pertence a esta pessoa”. Confira antes a
impressão digital com o dono — pessoalmente, ou em uma ligação em que você reconheça a voz
dele — e então pressione **Certificar** nos detalhes da chave e escolha os IDs de usuário. A
certificação é feita com a chave primária da sua chave, como o GnuPG a faz, e o GnuPG a
aceita.

A validade segue a leitura mais simples do Kleopatra da teia de confiança: suas próprias
chaves são de confiança máxima; uma chave que você certificou é **Certificada**; qualquer
outra chave funciona, mas é marcada como **Não certificada** onde quer que seja usada — na
lista, entre os destinatários e em uma assinatura que ela fez.

### Notas

Digite uma mensagem, escolha os **destinatários** — encontrados por nome, endereço ou ID da
chave enquanto você digita — e pressione **Criptografar**, ou **Assinar e criptografar**
quando uma chave está escolhida em “Assinar como”. “Criptografar também para mim” adiciona
a sua própria chave, para que você possa ler o que enviou. “Criptografar com uma senha”
adiciona uma senha com a qual qualquer pessoa pode descriptografar, junto com os
destinatários ou no lugar deles. **Somente assinar** cria um texto com assinatura em claro:
ainda legível, com a assinatura abaixo.

Cole uma mensagem criptografada ou assinada e pressione **Descriptografar / verificar**: o
texto é descriptografado no próprio lugar — a frase secreta da sua chave é pedida quando
necessário — e cada assinatura nele é conferida: boa, ruim (o texto foi alterado) ou feita
por uma chave que não está no seu chaveiro. “Mostrar o texto original” volta atrás.
⌘/Ctrl+Enter descriptografa uma mensagem, ou criptografa texto simples. Uma chave colada é
oferecida para importação.

### Arquivos

Adicione arquivos com o botão ou solte-os na janela. Cada um é examinado para saber o que é:
um arquivo simples, um criptografado, um assinado, uma assinatura separada, chaves ou um
certificado de revogação.

- **Assinar / criptografar** — para os arquivos simples: assine como uma das suas chaves,
  criptografe para você, para outros, com uma senha, ou qualquer combinação. Arquivos
  criptografados ganham `.gpg` (ou `.asc` como texto); só assinar cria uma assinatura
  separada, `.sig` (ou `.asc`), ao lado de cada arquivo.
- **Descriptografar / verificar** — para o resto. Uma assinatura separada encontra o arquivo
  que assina pelo nome (`report.pdf.sig` vai com `report.pdf`), ou o pede. Os arquivos
  descriptografados recebem o nome dos criptografados sem `.gpg`.
- **Importar chaves** — para os arquivos de chaves soltos aqui.

Cada resultado é salvo com seu próprio botão, ou todos de uma vez.

### Frases secretas

Uma chave secreta desbloqueada uma vez continua desbloqueada por um tempo, como o gpg-agent a
mantém: 10 minutos por padrão, de “perguntar sempre” até quatro horas nos ajustes. Só a chave
descriptografada é mantida, na memória da página — nunca a frase secreta, nunca em disco.
**Esquecer frases secretas** no menu bloqueia todas de uma vez; recarregar a página também.

### No celular

A página funciona em um celular: uma tela por vez, as telas em uma barra de abas na parte
inferior, os detalhes de uma chave em uma tela própria com um botão de voltar — o gesto de
voltar do sistema também funciona — e menus que sobem de baixo. No iOS, um arquivo salvo vai
para a folha de compartilhamento, onde está “Salvar em Arquivos”.

## Algoritmos

| Opção | Nomes no GnuPG | Observações |
| --- | --- | --- |
| ECC Curve25519 | ed25519 + cv25519 | O padrão, como no GnuPG e no Kleopatra: curto, rápido, lido em todo lugar. |
| ECC NIST P-256, P-384, P-521 | nistp256, nistp384, nistp521 | ECDSA e ECDH. |
| ECC Brainpool P-256, P-384, P-512 | brainpoolP256r1… | ECDSA e ECDH; comum no uso alemão e europeu. |
| RSA 2048, 3072, 4096 | rsa2048… | O mais antigo e o mais amplamente lido; alguns segundos para criar. |
| Ed25519 + X25519 (OpenPGP v6) | ed25519 + x25519 | Chaves RFC 9580. **O GnuPG e o Kleopatra ainda não conseguem lê-las.** |
| Ed448 + X448 (OpenPGP v6) | ed448 + x448 | Chaves RFC 9580, como acima. |

Cada chave é uma chave primária que certifica e assina e uma subchave que criptografa, como o
GnuPG as cria. Chaves de outros algoritmos — DSA e ElGamal de chaveiros antigos do GnuPG, por
exemplo — são lidas e usadas; só não se criam novas delas. O secp256k1 fica de fora: o
openpgp.js o recusa a menos que se diga o contrário.

## Compatibilidade com o GnuPG e o Kleopatra

`tests/gnupg.mjs` executa o próprio GnuPG, em um diretório pessoal descartável, contra o que o
aplicativo escreve, e `tests/pgp.mjs` lê o que o GnuPG escreveu (`tests/fixtures/gnupg/`,
criado uma vez por `tools/gnupg-fixtures.sh`). Conferido nos dois sentidos:

- chaves de todos os algoritmos v4 criadas aqui são importadas pelo GnuPG, com seu uso, e
  usadas: o GnuPG descriptografa nossas mensagens e confere nossas assinaturas, e nós
  descriptografamos o que o GnuPG criptografa para elas;
- o GnuPG vê nossas novas datas de expiração, IDs de usuário adicionados e revogados,
  certificações de outras chaves e certificados de revogação;
- chaves, mensagens (inclusive as criptografadas com OCB), textos com assinatura em claro,
  assinaturas separadas, mensagens criptografadas com senha e certificados de revogação do
  GnuPG são lidos aqui.

Para trazer suas chaves do Kleopatra: selecione seu par de chaves → Exportar chaves secretas
(ou “Backup de chaves secretas”), e importe o arquivo aqui; as chaves públicas de outras
pessoas, do mesmo jeito com Exportar. De volta daqui: exporte a chave pública, ou faça o
backup da chave secreta, e importe o arquivo no Kleopatra.

## Extensão do Chrome

O mesmo aplicativo no painel lateral do Chrome, ao lado da página que você está lendo. O
botão da barra de ferramentas o abre. Selecione um texto criptografado ou assinado em
qualquer página — em um webmail, um fórum, um campo de texto — e escolha **Descriptografar /
verificar com o HTML PGP** no menu de contexto: ele abre nas notas do painel,
descriptografado e conferido. **Criptografar com o HTML PGP** passa o texto selecionado para
que você escolha os destinatários.

A extensão pede o mínimo que pode: o painel lateral, o menu de contexto, seu próprio
armazenamento e a aba em que você clica (activeTab) — para ler a seleção com suas quebras de
linha, que o próprio menu de contexto perde. Ela não tem acesso a nenhum site além disso, e
suas páginas, como as do aplicativo, não têm acesso à rede. Onde uma página não pode ser lida
(as páginas do próprio Chrome, a Web Store, um PDF), usa-se a cópia da seleção do próprio
menu e sua armadura é recolocada nas linhas.

A extensão mantém um chaveiro próprio: os navegadores mantêm separados os dados de cada
origem, então o arquivo único, o PWA e a extensão têm cada um o seu. Mova chaves entre eles
por exportação e importação, ou com um backup.

Compile-a com `npm run build` e carregue `build/extension/` em `chrome://extensions` (Modo do
desenvolvedor → Carregar sem compactação), ou use `build/html-pgp-extension-<version>.zip`
para a Chrome Web Store.

## Segurança

- **Nada sai da página.** Sua Content-Security-Policy tem `connect-src 'none'` e
  `default-src 'none'`: sem fetch, sem imagens ou fontes de outros lugares, sem formulários
  enviando para fora. Tudo está embutido — estilos, openpgp.js, ícones. A compilação falha
  diante de qualquer `src` ou `href` externo, e a CI confere o arquivo compilado de novo. A
  cópia do PWA pode carregar seu próprio manifesto, service worker e ícones; as páginas da
  extensão têm a mesma política em seu manifesto.
- **As chaves secretas são armazenadas criptografadas.** O chaveiro vive no IndexedDB do
  navegador, um registro por chave, como o openpgp.js a armazena: uma chave secreta permanece
  criptografada com sua frase secreta (AES-256, com a chave derivada da frase secreta por um
  S2K iterado e com sal, como faz o GnuPG) e só é descriptografada na memória, quando
  necessário. A frase secreta nunca é armazenada. Uma chave sem frase secreta é marcada assim
  em seus detalhes.
- **As chaves desbloqueadas são esquecidas** após o tempo definido nos ajustes, em “Esquecer
  frases secretas”, e quando a página fecha.
- **Os campos de frase secreta são campos de texto de propósito**, com texto transparente e
  pontos desenhados por cima. No macOS um campo de senha ativa o Secure Input, que força um
  layout de teclado latino: uma frase secreta em cirílico, grego ou árabe não poderia ser
  digitada. O campo não dá ao navegador essa dica, ainda esconde o que é digitado e não deixa
  copiá-lo.
- **As assinaturas são julgadas pelas chaves em que você confia.** Uma boa assinatura de uma
  chave que ninguém certificou diz isso, e por que conferir sua impressão digital.
- **O navegador é a base de confiança.** Qualquer coisa que possa executar código nesta página
  ou ler o perfil do navegador — uma extensão maliciosa com acesso a todos os sites, malware
  no computador — pode ler o que a página lê. Guarde backups das suas chaves secretas em
  outro lugar: limpar os dados do navegador apaga o chaveiro.

## Recursos

- Chaveiro no IndexedDB, compartilhado pelas janelas do aplicativo nesta origem; uma mudança
  em uma janela aparece nas outras.
- Novos pares de chaves de doze tipos, com data de expiração e um certificado de revogação
  criado junto com eles.
- Importação de chaves em armadura de texto e binárias, várias de uma vez, mescladas com o que
  já existe; certificados de revogação do GnuPG mediante confirmação.
- Exportação de chaves públicas, backup de chaves secretas, uma ou todas.
- Certificação de chaves de outras pessoas; validade a partir das suas próprias
  certificações.
- Alteração da sua chave: validade, IDs de usuário, frase secreta, revogação — adicionando
  assinaturas, como faz o GnuPG, para que a chave continue legível em todo lugar e as
  certificações de outras pessoas permaneçam nela.
- Notas: criptografar, assinar, assinar e criptografar, criptografar com uma senha,
  descriptografar, verificar.
- Arquivos: o mesmo para arquivos, assinaturas separadas, vários arquivos de uma vez.
- Frases secretas lembradas por um tempo, somente na memória.
- Tema claro e escuro, seguindo o do sistema ou escolhido.
- 17 idiomas, árabe e urdu da direita para a esquerda.
- Um layout para celular; o PWA se instala em um celular ou em um computador e funciona
  offline.
- Arquivos abertos com o PWA instalado a partir do Finder ou do Explorer entram na sua tela de
  arquivos.
- Uma extensão do Chrome com o menu de contexto para o texto selecionado.

## Atalhos de teclado

| Teclas | |
| --- | --- |
| ⌘/Ctrl+F | Buscar chaves |
| ⇧⌘N / Shift+Ctrl+N | Novo par de chaves |
| ⇧⌘I / Shift+Ctrl+I | Importar |
| ↑ ↓, Home, End | Mover-se na lista de chaves |
| ⌘/Ctrl+A | Selecionar todas as chaves da lista |
| Delete | Excluir as chaves selecionadas |
| ⌘/Ctrl+Enter | Nas notas: descriptografar uma mensagem, ou criptografar texto simples |
| Esc | Fechar uma caixa de diálogo ou um menu |

## Traduções

A interface fala inglês e mais 16 idiomas: chinês, híndi, espanhol, francês, árabe, bengali,
português, russo, urdu, indonésio, alemão, japonês, marata, telugo, turco e ucraniano. Ela
segue o idioma do navegador, a menos que um seja escolhido nos ajustes. O árabe e o urdu são
dispostos da direita para a esquerda.

O texto em inglês vive no código: `t('context', 'English text')`, ou
`tn('context', '{count} key', '{count} keys', n)` para um texto com um número, com literais de
string simples — `tools/i18n.mjs` os encontra com uma expressão regular. No template,
`data-i18n` traduz o texto de um elemento e `data-i18n-attr` seu title, placeholder e
aria-label. Cada idioma é um dicionário, `src/locales/<code>.json`:
`{ "context": { "English text": "translation" } }`, com as formas de plural dadas por
`Intl.PluralRules`. Uma string que falta em um dicionário é mostrada em inglês.

`npm run i18n` imprime, por idioma, as strings que faltam em um dicionário e as que ele tem
mas que a interface não usa mais; `npm test` confere os dicionários: nenhuma chave obsoleta,
os mesmos marcadores, todas as formas de plural, cada contexto uma só vez. O que o Chrome
mostra da própria extensão — seu nome, descrição e título do botão — vem dos mesmos
dicionários, contexto `manifest`.

## Compilação

```sh
npm install
npm run build          # build/html-pgp.html, build/pages/, build/extension/ e seu zip
npm run watch          # recompila a cada mudança
./build.sh             # o mesmo, instalando as dependências na primeira execução
```

`build.mjs` empacota `src/app/main.ts` com o esbuild em um único script e o embute, junto com
os estilos e o ícone, em `src/app/template.html`. O openpgp.js é a única dependência em tempo
de execução.

```sh
npm run check          # tudo o que segue, em ordem
npm run typecheck      # tsc --noEmit
npm test               # testes unitários no Node; tests/gnupg.mjs precisa do gpg, e avisa se faltar
npm run test:browser   # a página, o PWA e a extensão no Chrome headless
npm run shots -- DIR   # capturas de todas as telas principais em DIR
npm run icons          # os ícones PNG, desenhados a partir de assets/*.svg
```

Os testes de navegador controlam um Chrome local pelo protocolo DevTools, sem dependências
além do Node; `CHROME=/path/to/chrome` escolhe um.

## Versões e lançamentos

A versão vive apenas em `package.json`. Uma compilação do commit com a tag `v<version>` a
mostra como é; qualquer outra compilação acrescenta o commit — `0.1.0+1a2b3c4` — para que uma
página compilada a partir de `main` não seja tomada por um lançamento. Para lançar:
`npm version minor && git push --follow-tags`. O workflow de lançamento confere que a tag
corresponde ao `package.json`, executa os testes e anexa `html-pgp-<tag>.html`,
`html-pgp-extension-<tag>.zip` e `SHA256SUMS.txt`.

## GitHub Pages

`build/pages/` é a mesma página como um PWA instalável: um manifesto, ícones e um service
worker que a mantém funcionando offline depois de aberta. `.github/workflows/pages.yml` a
compila e testa a cada push em `main` e a publica no GitHub Pages (Settings → Pages → Source:
GitHub Actions); ela fica então em `https://<owner>.github.io/html-pgp/`.

A página continua sem alcançar nada: sua política deixa entrar apenas seu próprio manifesto,
worker e ícones. Uma nova publicação se instala ao lado da versão em execução e espera; os
Ajustes mostram “A versão X está pronta” com um botão Atualizar, e um ponto marca os ajustes.
O aplicativo instalado também abre arquivos `.gpg`, `.pgp`, `.sig` e `.asc` a partir do
sistema (Abrir com), na sua tela de arquivos.

## Estrutura

```text
build.mjs                 a compilação: o arquivo único, o PWA, a extensão e seu zip
src/core/                 sem DOM — roda no Node sob os testes
  pgp.ts                  todas as operações OpenPGP, sobre o openpgp.js
  keys.ts                 o que é uma chave, como a interface mostra
  keyring.ts              o chaveiro: armazenamento, importação e mesclagem, confiança
  armor.ts                armadura ASCII reparada a partir de uma só linha
  i18n.ts                 idiomas e busca de strings
src/app/                  a página
  template.html           a marcação, com a CSP
  styles.css              todos os estilos
  main.ts                 inicialização, telas, atalhos, arquivos soltos, outras janelas
  keylist.ts              a tela de chaves: lista, busca, filtro, seleção
  details.ts              uma chave por inteiro
  keyactions.ts           as caixas de diálogo: nova chave, importar, exportar, certificar, alterações, excluir
  notepad.ts, files.ts    as notas e a tela de arquivos
  recipients.ts           escolha de destinatários
  outcome.ts              o que a descriptografia e a verificação encontraram, em palavras
  agent.ts                frases secretas e chaves desbloqueadas
  settings.ts             preferências no localStorage; settingsview.ts a tela
  store.ts                IndexedDB, e avisos de mudanças de outras janelas
  save.ts                 arquivos a salvar, a área de transferência
  ui.ts, screens.ts       diálogos, menus, avisos; uma tela por vez no celular
  update.ts, platform.ts  atualizações do PWA; o que a extensão acrescenta
src/extension/            manifesto, worker em segundo plano, a plataforma do painel, grab.ts
src/pwa/sw.js             o service worker do PWA
src/locales/              16 dicionários
tests/                    pgp, keyring, gnupg, i18n no Node; app e extensão no Chrome
tests/fixtures/gnupg/     chaves, mensagens e assinaturas criadas pelo GnuPG
tools/                    load.mjs, chrome.mjs, i18n.mjs, shots.mjs, icons.mjs, gnupg-fixtures.sh
```

## Limitações

- Sem servidores de chaves nem WKD: a página não tem acesso à rede por design. Troque chaves
  como arquivos ou texto.
- Sem smartcards nem tokens de hardware. Chaves cuja chave primária secreta fica em outro
  lugar (os stubs do GnuPG) são lidas, e suas subchaves funcionam; uma chave assim não pode
  ser alterada aqui.
- Sem S/MIME nem certificados X.509 — somente OpenPGP.
- A confiança é direta: certificações feitas pelas suas próprias chaves. A confiança do dono
  do GnuPG — confiar nas certificações de outros — não é modelada.
- Os arquivos são lidos inteiros na memória: bom para documentos e fotos, não para gigabytes.
- O arquivo único, o PWA e a extensão mantêm cada um o seu próprio chaveiro (veja “[Extensão
  do Chrome](#extensão-do-chrome)”).
- O GnuPG e o Kleopatra ainda não leem chaves OpenPGP v6.

## Licença

MIT — veja [LICENSE](../../LICENSE). A compilação inclui o [OpenPGP.js](https://openpgpjs.org/),
sob a GNU Lesser General Public License 3.0 ou posterior; seu aviso é mantido no topo do
script empacotado, e seu código-fonte está em https://github.com/openpgpjs/openpgpjs.

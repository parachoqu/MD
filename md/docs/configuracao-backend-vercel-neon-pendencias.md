# Configuracao do backend Vercel, Neon e Blob: estado e proximos passos

## Procedimento vigente: somente Preview/staging (05/09/2026)

Esta secao prevalece sobre o roteiro historico abaixo durante a missao de
staging. Nenhuma etapa historica de Production, Blob, troca de banco,
desconexao de recursos ou integracao publica esta autorizada nesta missao.

Resultado desta execucao e bloqueios: [relatorio de Preview/staging](relatorio-preview-staging-2026-09-05.md).

- Worktree isolada na branch `staging`, a partir de `origin/staging`; preservar
  alteracoes preexistentes e manter `main` intacta.
- Vercel: equipe `colaresdev`, projeto `mdprojetos`, Root Directory `md`,
  Functions `gru1`, ambiente `preview`, branch Git `staging`.
- Neon permitido: `neon-coquelicot-dog`, projeto `withered-moon-82282924`;
  usar somente a branch propria do Preview/staging, distinta da principal e
  de Development. Nao desligar deployment branching.
- Alias esperado: `https://mdprojetos-git-staging-colaresdev.vercel.app`.
- Nunca consultar ou baixar variaveis de Production nem acessar seu banco.

### Conexoes e validacao local

`DATABASE_URL` pooled permanece no runtime HTTP. `migrate`, `seed`,
`create-admin`, `export` e `import-admin-export --apply` exigem exclusivamente
`DATABASE_URL_UNPOOLED`. Sem URL direta valida, falham antes da conexao e nao
exibem valores. A validacao de import sem `--apply` continua offline.

Na pasta `md`, executar `npm ci`, `npm run check`, `npm test` e `npm run build`.
`npm run check:vercel-output` exige tambem um build Vercel fresco na raiz da
worktree. Se necessario baixar configuracao para esse build, usar somente:

```bash
vercel pull --environment=preview --git-branch=staging --scope colaresdev --yes
vercel build --target=preview
cd md
npm run check:vercel-output
```

Os artefatos `.vercel/` e arquivos de ambiente ficam ignorados e fora do commit.
Revisar o diff e criar o commit local `fix(db): use direct Neon connection for
maintenance scripts`; nao fazer push ainda.

### Prova obrigatoria do alvo antes de escrever

Consultar a ajuda da CLI instalada. A partir da raiz vinculada da worktree, usar
`vercel env run -e preview --git-branch staging -- <comando>` para injecao em
memoria, sem substituir `md/.env.local`. Confirmar apenas com `sim/nao`:

- identidade autenticada, equipe e projeto esperados;
- presenca das duas URLs, diferenca entre elas e correspondencia ao mesmo
  banco/endpoint, com e sem pooler;
- `NEON_PROJECT_ID` esperado, quando presente;
- vinculo verificavel entre endpoint, recurso permitido e branch Neon propria
  do deployment staging; distinta da principal e de Development;
- `APP_ORIGIN` igual ao alias estavel;
- `SESSION_SECRET`, `CSRF_SECRET` e `IP_HASH_SECRET` com minimo valido.

Nao imprimir valores, hosts, usuarios, IDs de branch ou comprimentos exatos.
Selecionar `preview/staging` na CLI ou validar apenas `NEON_PROJECT_ID` nao
substitui a prova do endpoint e da branch. Se essa prova faltar, parar antes de
migration, seed, admin e push; registrar a acao manual necessaria.

Variaveis cadastradas como sensiveis podem nao ser disponibilizadas pela CLI.
Confirmar seu cadastro por metadados nao prova comprimento minimo; uma saida
vazia do `env run` tambem nao prova que estejam vazias no deployment. Nao
recriar, reclassificar ou rotacionar secrets para contornar essa restricao.
Validar no contexto autorizado do Preview, mostrando somente sim/nao.

`env run` tambem pode carregar arquivos locais e herdar o ambiente do terminal.
Executar na worktree isolada, sem `.env.local` e sem variaveis herdadas que
substituam as recebidas da Vercel. Nunca usar o checkout original com arquivos
de Development para essa verificacao.

### Diferenca comprovada entre env run e deployment branching

Na retomada autenticada de 05/09, a CLI Neon comprovou que as URLs retornadas
por `env run` Preview/staging apontavam para a branch principal do projeto
permitido. A branch Neon Preview/staging existia separadamente, criada pela
integracao Vercel. Portanto, **nao executar os exemplos de manutencao abaixo
sem substituir as URLs no processo filho pelas conexoes da branch comprovada**.

Nesta execucao, um wrapper temporario resolveu a conexao pela CLI Neon com
branch explicita, comparou seu endpoint aos metadados autenticados e injetou
pooled/direta somente em memoria. Repetiu a prova antes de cada comando.
Nao alterou variaveis remotas, nao acessou SQL da principal e nao desligou
branching. O wrapper da sessao esta em `/tmp/md-preview-maintenance.mjs`;
se ele nao estiver disponivel, reimplementar/conferir a prova antes de operar,
sem executar cegamente `env run ... db:migrate`.

### Banco, administrador e publicacao

Somente depois do alvo comprovado, executar na mesma injecao Preview/staging:

```bash
vercel env run -e preview --git-branch staging -- npm --prefix md run db:migrate
vercel env run -e preview --git-branch staging -- npm --prefix md run db:seed
vercel env run -e preview --git-branch staging -- npm --prefix md run db:migrate
vercel env run -e preview --git-branch staging -- npm --prefix md run db:seed
```

Verificar `001_initial_schema.sql` em `schema_migrations` com SHA-256
`185bf847acf0535e449b335be2bbb8ef34ab16fffee8bc204bb21f9c2f69c719`,
18 tabelas e seed `1/3/2/1/16` (evento/projetos/paginas/configuracao/midias).
A referencia anterior a 15 tabelas estava incorreta: o SQL imutavel e o teste
versionado preveem 18. Nao modificar a migration/checksum para ajustar contagens.
O seed repetido nao duplica conteudo; cada execucao registra sua propria
auditoria. Nao consultar usuarios, inscricoes, contatos ou dados pessoais nesta
verificacao. Em falha parcial, registrar e parar, sem reparos SQL manuais.

O primeiro administrador exige participacao humana em terminal interativo:

```bash
vercel env run -e preview --git-branch staging -- npm --prefix md run db:create-admin
```

Nome, e-mail, senha e confirmacao sao informados no terminal do usuario; nunca
no chat. Senha: ao menos 12 caracteres e tres grupos entre minusculas,
maiusculas, numeros e simbolos. Relatar somente criado/ativo/hash persistido
como sim/nao, role e e-mail mascarado. Nao criar credencial padrao.

Push exclusivamente para `origin/staging` somente depois de codigo, testes,
migration, seed e administrador aprovados. Aguardar o Preview automatico. Se
nao houver deployment, solicitar que Claude dispare o hook `staging-preview`,
sem recuperar nem divulgar sua URL.

Smoke final no alias staging: health `200`, sessao sem cookie `401`, events e
bootstrap `200`, estaticos principais `200`, login humano e logout com sessao
revogada. Nao enviar inscricoes nem testar upload. Ausencia de `42P01` precisa
ser verificada no Preview; testes locais nao comprovam isso.

Referencias operacionais: [Vercel env run](https://vercel.com/docs/cli/env) e
[conexoes Neon](https://neon.com/docs/connect/connection-pooling).

## Registro historico da auditoria de 04/09/2026

Auditoria atualizada em **04/09/2026**, no checkout
`/home/https/Área de trabalho/workspace/MD/md`.

Este documento separa o que foi realmente verificado do que ainda depende de
configuracao, acesso humano ou teste externo. Nenhum valor de credencial e
registrado aqui.

## Resumo executivo

O codigo do backend esta em `main`, foi publicado na Vercel e o banco conectado
responde ao health check. O backend completo, porem, **ainda nao esta
operacional**:

- `GET /api/health` responde `200`, pois verifica apenas `SELECT 1`;
- `GET /api/public/events` e `GET /api/auth/session` respondem `500`;
- faltam cinco variaveis obrigatorias da aplicacao nos tres ambientes Vercel;
- nao existe Vercel Blob conectado;
- existem dois recursos Neon diferentes conectados ao mesmo projeto;
- as conexoes de Development inspecionadas estao vazias, sem tabelas;
- na auditoria de 04/09, migrations ainda selecionavam a conexao pooled; a
  correcao atual de staging esta descrita acima;
- o site publico continua usando dados e gravacoes demonstrativas locais.

Portanto, `health = ok` prova conectividade com Postgres, mas nao prova schema,
migration, seed, autenticacao, leitura publica, inscricao, contato ou Blob.

## Estado confirmado

### Git e implementacao local

| Item | Estado verificado |
| --- | --- |
| Branch | `main` |
| Commit local/remoto | `15129a4`, igual a `origin/main` |
| Backend | incorporado a `main` |
| Alteracoes em `md/` antes deste documento | nenhuma |
| Runtime local usado | Node `24.14.0` |
| Sintaxe | `120` arquivos JavaScript validos |
| Testes | `12` aprovados, `0` falhas |
| Build estatico | aprovado |
| Build Vercel | aprovado |
| Saida Vercel | `4` Functions `nodejs24.x` |

As quatro Functions geradas sao:

```text
api/admin/router
api/auth/[action]
api/health
api/public/router
```

O projeto usa `gru1`, `maxDuration: 30`, rewrites para as rotas profundas e uma
saida estatica por lista permitida. Fontes de servidor, migrations, testes e
documentos nao entram na saida publica.

### Projeto Vercel

| Item | Estado verificado |
| --- | --- |
| Conta CLI | autenticada |
| Equipe | `colaresdev` |
| Projeto | `mdprojetos` |
| Root Directory | `md` |
| Framework | Other |
| Node.js | `24.x` |
| Link local | `MD/.vercel/project.json` |
| Deploy atual | Production, commit `15129a4`, status `READY` |
| Functions do deploy | 4, em `gru1` |
| Deployments encontrados | 9 de Production; nenhum Preview |
| Blob stores conectados | 0 |

Aliases observados:

```text
mdprojetos.vercel.app
mdeventos.site              -> redireciona para www
www.mdeventos.site          -> responde 200
```

Se o dominio publico definitivo continuar sendo `www.mdeventos.site`, a origem
canonica de Production deve ser `https://www.mdeventos.site`. Isso precisa ser
confirmado antes de gravar `APP_ORIGIN`.

### Estado remoto observado

Testes GET feitos sem mutacao:

| Rota | Resultado em Production | Interpretacao |
| --- | --- | --- |
| `/api/health` | `200`, banco `reachable`, versao `15129a4...` | apenas conectividade e `SELECT 1` |
| `/api/public/events` | `500 INTERNAL_ERROR` | runtime completo nao inicializa |
| `/api/auth/session` | `500 INTERNAL_ERROR` | runtime completo nao inicializa |

O comportamento e coerente com a ausencia de `APP_ORIGIN`, `SESSION_SECRET`,
`CSRF_SECRET` e `IP_HASH_SECRET`: o health ignora esses segredos, mas auth,
admin e API publica carregam a configuracao completa.

### Neon conectado pela Vercel

Existem **dois recursos Neon distintos**, ambos conectados a Development,
Preview e Production:

| Recurso Vercel | Namespace de variaveis | Regiao observada localmente | Uso pelo codigo |
| --- | --- | --- | --- |
| `neon-purple-marble` | sem prefixo: `DATABASE_URL`, `NEON_PROJECT_ID`, etc. | `us-east-1` | sim, por inferencia |
| `neon-coquelicot-dog` | prefixo `mdata_` | `sa-east-1` | nao |

O codigo le somente `DATABASE_URL`; por isso o recurso sem prefixo e o usado
pelo runtime. Isso nao basta para declarar que ele e o recurso correto: antes
de remover qualquer integracao, e necessario conferir propriedade, branch,
regiao, dados, faturamento e finalidade de cada recurso.

As duas conexoes presentes nos arquivos locais de Development foram consultadas
em transacao `READ ONLY`. Resultado: **zero tabelas publicas e nenhuma migration
aplicada em ambas**. Essa constatacao vale para as conexoes locais de
Development; o schema de Production nao foi consultado diretamente.

Variaveis Neon encontradas nos tres ambientes:

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
NEON_PROJECT_ID
PG*
POSTGRES*

mdata_DATABASE_URL
mdata_DATABASE_URL_UNPOOLED
mdata_NEON_PROJECT_ID
mdata_PG*
mdata_POSTGRES*
```

`DATABASE_URL` e pooled e deve servir ao trafego normal das Vercel Functions.
`DATABASE_URL_UNPOOLED` e direta e deve ser usada por migrations, dumps e
operacoes administrativas que dependem de estado de sessao.

Nao ha `.neon`, `neon.ts`, Neon CLI autenticada nem `NEON_API_KEY` local. A
integracao via Vercel funciona sem esses arquivos, mas branch padrao, compute,
politica de Preview e estado interno do projeto ainda precisam ser conferidos
no painel Neon.

### Variaveis que ainda faltam

Ausentes em Development, Preview e Production:

```text
APP_ORIGIN
SESSION_SECRET
CSRF_SECRET
IP_HASH_SECRET
BLOB_READ_WRITE_TOKEN
```

`PII_ENCRYPTION_KEY` tambem esta ausente, mas o codigo atual apenas a reserva e
nao implementa criptografia de PII com ela. Nao preencher essa chave cria uma
pendencia de produto/seguranca; nao e a causa imediata dos erros `500` atuais.

### Ambiente local

Ha arquivos com credenciais em `MD/.env.local` e
`MD/.env.development.local`, ambos ignorados pelo Git. Eles estao com permissao
`0664`, ampla demais para segredos.

Os scripts `db:*` sao executados dentro de `MD/md` e carregam
`md/.env.local`. Esse arquivo nao existe. Assim, os scripts nao enxergam hoje
nem mesmo as URLs Neon que estao no diretorio pai.

O template `md/.env.example` tambem precisa distinguir as duas conexoes:

```text
DATABASE_URL=...             # pooled; runtime
DATABASE_URL_UNPOOLED=...    # direta; migrations e operacao
```

### Site e painel

O painel administrativo ja usa `/api/auth/*` e `/api/admin/*` e falha fechado
quando a API nao responde.

O site publico ainda esta no fluxo demonstrativo:

- eventos e projetos vem de `data/*.js`;
- inscricoes ficam em `localStorage`;
- o navegador gera protocolo `MD-DEMO-*`;
- contato usa apenas `setTimeout`;
- nao ha telas administrativas para processar inscricoes e contatos;
- recuperacao de senha nao possui entrega automatizada por e-mail.

O seed atual contem `1` evento com status `soon`, `3` projetos, `2` paginas,
`1` configuracao e `16` midias estaticas. Ele usa `ON CONFLICT DO NOTHING`, logo
nao atualiza registros ja existentes e nao oferece hoje um evento `open` para o
smoke test de inscricao.

## Passo a passo do que falta fazer

Os passos estao em ordem. Nao avance se o criterio de aceite do passo atual nao
for atendido.

### 1. Escolher o Neon canonico

Acao humana no painel Vercel/Neon:

1. Abra `mdprojetos` em Storage/Marketplace.
2. Inspecione `neon-purple-marble` e `neon-coquelicot-dog`.
3. Para cada um, registre sem copiar credenciais:
   - organizacao/proprietario;
   - project ID;
   - regiao;
   - branch padrao;
   - banco e role;
   - ambientes Vercel conectados;
   - politica de branches de Preview;
   - plano e faturamento;
   - existencia de tabelas/dados relevantes.
4. Escolha explicitamente qual recurso sera o banco oficial.

Preferencia tecnica a avaliar: Functions estao em `gru1`; um banco em
`sa-east-1` tende a reduzir latencia e manter dados no Brasil. Migrar ou trocar o
banco, entretanto, e uma decisao de infraestrutura e dados, nao uma limpeza
automatica.

**Nao desconecte nem exclua o recurso excedente ainda.** Primeiro prove que o
recurso canonico possui o ambiente e os dados esperados e que nenhuma outra
aplicacao usa o recurso antigo.

Criterio de aceite:

- um registro de decisao identifica o recurso canonico e o destino de
  Development, Preview e Production;
- o segundo recurso tem destino decidido: manter, migrar ou desconectar depois.

### 2. Definir isolamento entre ambientes

Configure a integracao Neon para que:

```text
Production  -> branch/banco exclusivo de producao
Development -> branch duradoura e nao produtiva
Preview     -> branch isolada por Preview, ou outra estrategia documentada
```

Nunca use a branch de Production em Development ou Preview. Se a integracao
gerar branches por Preview, confirme tambem a politica de exclusao das branches
quando os deployments expirarem.

Criterio de aceite:

- as tres conexoes apontam aos destinos deliberadamente escolhidos;
- nenhum teste ou seed nao produtivo pode escrever em Production.

### 3. Corrigir o contrato de conexao antes da primeira migration

Alteracao local de codigo necessaria:

1. Adicione `DATABASE_URL_UNPOOLED` a `md/.env.example`.
2. Mantenha `DATABASE_URL` pooled no runtime das Functions.
3. Altere o caminho de migration para exigir explicitamente
   `DATABASE_URL_UNPOOLED`.
4. Faca migrations falharem fechado se a URL direta estiver ausente.
5. Cubra essa selecao com teste automatizado.

Nao execute `npm run db:migrate` no Neon antes dessa correcao.

Criterio de aceite:

- o aplicativo usa a URL pooled;
- a migration usa a URL direta;
- um teste impede regressao para a URL pooled.

### 4. Corrigir o ambiente local sem expor segredos

Partindo da raiz `MD`, depois de escolher o recurso correto:

```bash
vercel env pull md/.env.local --environment=development --yes
chmod 600 md/.env.local
```

Antes de substituir qualquer arquivo, preserve manualmente apenas configuracoes
locais que nao estejam na Vercel. `vercel env pull` pode substituir o arquivo de
destino.

Restrinja tambem as copias atuais:

```bash
chmod 600 .env.local .env.development.local
```

Depois de validar `md/.env.local`, decida se as copias no diretorio pai ainda sao
necessarias. Nao as apague sem comparar as chaves e confirmar que nenhum outro
fluxo local depende delas.

Verificacao apenas por nomes, sem imprimir valores:

```bash
sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' md/.env.local | sort -u
```

Criterio de aceite:

- `md/.env.local` existe, esta ignorado pelo Git e tem permissao `0600`;
- contem as chaves do ambiente correto;
- nenhum valor secreto aparece em commit, log ou documentacao.

### 5. Criar os segredos proprios da aplicacao

Crie valores diferentes para cada ambiente e para cada finalidade:

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 48   # CSRF_SECRET
openssl rand -base64 48   # IP_HASH_SECRET
```

Cadastre-os como variaveis sensiveis em Development, Preview e Production. Nao
reutilize um valor entre ambientes nem entre as tres chaves.

Defina `APP_ORIGIN` por ambiente:

- Development: origem exata usada no desenvolvimento local;
- Preview: alias estavel da branch, pois callbacks e validacao same-origin nao
  devem depender de uma URL efemera desconhecida;
- Production: origem publica canonica confirmada, provavelmente
  `https://www.mdeventos.site`.

`APP_ORIGIN` deve usar `http` ou `https` e nao deve terminar com `/`.

Depois de qualquer mudanca de variavel, crie um novo deployment: alteracoes de
env nao atualizam deployments ja existentes.

Criterio de aceite:

- as quatro chaves existem no escopo correto dos tres ambientes;
- cada valor e independente;
- nenhum deployment antigo e usado como prova da nova configuracao.

### 6. Provisionar Vercel Blob

O codigo atual faz upload **publico** de JPEG, PNG ou WebP ate 5 MB. Confirme que
midias editoriais podem ser publicas antes de criar o store.

1. Crie um Vercel Blob store no projeto `mdprojetos`.
2. Escolha conscientemente o isolamento por ambiente.
3. Conecte o store aos ambientes autorizados.
4. Confirme que a Vercel criou `BLOB_READ_WRITE_TOKEN` nesses ambientes.
5. Puxe novamente Development para `md/.env.local`.

Nao copie o token em chat, commit, issue, captura de tela ou comando com valor
inline.

Criterio de aceite:

- ao menos o store de Development/Preview esta conectado;
- `BLOB_READ_WRITE_TOKEN` aparece por nome no ambiente correto;
- o token nao foi exposto.

### 7. Preparar primeiro o banco nao produtivo

Execute esta fase somente depois dos passos 1 a 6 e com a URL direta corrigida.

No diretorio `MD/md`:

```bash
npm run db:migrate
npm run db:seed
npm run db:create-admin
```

O primeiro administrador exige terminal interativo e nao possui credencial
padrao. Nao registre e-mail, senha ou respostas do prompt em logs compartilhados.

Verifique no banco, sem consultar dados pessoais:

- `schema_migrations` contem `001_initial_schema.sql` com checksum esperado;
- existem as 18 tabelas previstas (contagem corrigida pelo SQL versionado);
- as contagens do seed sao `1/3/2/1/16`;
- repetir migration nao reaplica o arquivo;
- repetir seed nao duplica registros.

Criterio de aceite:

- migration, seed e admin foram executados somente no ambiente nao produtivo;
- schema e contagens foram confirmados;
- Production permanece intocada.

### 8. Criar um cenario de inscricao exclusivo de Preview

O seed possui apenas um evento `soon`. Para testar inscricao:

1. Crie ou duplique no painel um evento claramente ficticio.
2. Mantenha-o exclusivamente em Preview.
3. Configure periodo, modalidade, categoria, capacidade, consentimento e
   `status = open`.
4. Publique o evento no banco de Preview.

Nao transforme um evento real em `open` apenas para satisfazer o teste.

Criterio de aceite:

- existe um evento ficticio publicado e aberto em Preview;
- nenhuma agenda publica real foi inventada ou alterada.

### 9. Criar e validar um deployment de Preview

Nao teste primeiro em Production. Gere um Preview a partir de uma branch e use a
URL/alias estavel definido em `APP_ORIGIN`.

Smoke tests minimos:

```text
GET  /api/health                         -> 200
GET  /api/public/bootstrap               -> 200
GET  /api/public/events                  -> 200
GET  /api/public/events/:slug            -> 200/404 coerente
GET  /api/auth/session sem cookie        -> 401 esperado, nao 500
POST /api/auth/login                     -> sucesso e falha generica
POST /api/auth/logout                    -> sessao revogada
```

Depois, valide pelo painel:

- login e logout;
- cookie `HttpOnly`, `Secure`, `SameSite=Strict`;
- CSRF e origem recusados quando ausentes/incorretos;
- CRUD, revisao otimista e conflito `409`;
- publicar, arquivar e restaurar;
- API publica lendo apenas snapshots publicados;
- inscricao, capacidade, idempotencia e protocolo server-side;
- contato e consulta administrativa;
- mensagens de erro sem stack, host, token ou PII.

Use `vercel curl` se o Preview estiver protegido; nao desative a protecao para
testa-lo.

Criterio de aceite:

- todas as rotas esperadas respondem no Preview;
- nenhum `500` permanece no fluxo nominal;
- logs foram revisados sem exposicao de segredos ou PII.

### 10. Validar o Blob de ponta a ponta

No Preview, usando arquivos de teste sem dados pessoais:

- upload JPEG, PNG e WebP validos;
- recusa de SVG;
- recusa de arquivo acima de 5 MB;
- recusa de MIME/extensao/assinatura divergentes;
- callback concluido e metadata gravada;
- substituicao respeitando `revision`;
- exclusao bloqueada enquanto houver uso;
- objeto anterior removido apos substituicao bem-sucedida;
- URL publica carregando a imagem esperada.

Criterio de aceite:

- banco e Blob permanecem consistentes mesmo diante de falha parcial;
- o teste real substitui, e nao apenas repete, os doubles usados nos testes
  locais.

### 11. Conectar o site publico as APIs

Esta e uma alteracao de aplicacao ainda pendente, nao apenas configuracao de
infraestrutura.

Implemente de forma localizada:

1. leitura de bootstrap, eventos e projetos pelas APIs publicas;
2. inscricao por `POST /api/public/registrations`;
3. contato por `POST /api/public/contact`;
4. `Idempotency-Key` estavel durante retries;
5. uso do protocolo retornado pelo servidor;
6. exclusao do rascunho local somente depois de `201` confirmado;
7. tratamento explicito de timeout/estado indeterminado, sem reenvio cego;
8. fallback somente leitura para conteudo estatico, se aprovado.

O formulario de contato precisa alinhar o contrato: `interest` versus `subject`,
mensagem obrigatoria, `consentVersion`, honeypot `website` e idempotencia. A
inscricao precisa enviar `categoryId`, `consentVersion` e o formato server-side
esperado.

Preserve IDs, anchors, `data-*`, acessibilidade, controle nativo `#eventStatus`,
mobile ate 767 px e desktop a partir de 768 px.

Criterio de aceite:

- nenhum protocolo oficial e produzido no navegador;
- inscricao e contato chegam ao banco de Preview uma unica vez;
- o site continua legivel se a API de leitura estiver indisponivel, sem reativar
  login ou gravacao local administrativa.

### 12. Fechar operacao, privacidade e recuperacao

Antes de aceitar dados reais, defina e implemente:

- telas ou procedimento para tratar inscricoes e contatos;
- recuperacao segura de conta administrativa ou runbook manual;
- perfis autorizados e revisao periodica de acesso;
- prazo de retencao por tipo de registro;
- exclusao e atendimento ao titular;
- minimizacao e protecao de dados de menores;
- decisao sobre criptografia de campos e `PII_ENCRYPTION_KEY`;
- limpeza de sessoes, tokens, idempotencia e rate limits expirados;
- backup, PITR, restore testado e descarte;
- resposta a incidente;
- monitoramento, alertas e revisao de logs;
- plano Vercel/Neon adequado ao uso real e seus custos.

O export administrativo atual nao inclui inscricoes nem contatos e nao substitui
backup de PII.

Criterio de aceite:

- politicas estao aprovadas e implementadas;
- restore foi ensaiado primeiro em ambiente isolado;
- nao se anuncia conformidade juridica sem revisao especializada.

### 13. Preparar Production somente com confirmacao humana

Depois de todos os criterios anteriores:

1. faça backup/PITR e registre o ponto de retorno;
2. confirme novamente o recurso Neon, branch e Blob de Production;
3. configure as variaveis exclusivas de Production;
4. aplique migration pela URL direta;
5. execute o seed somente se as contagens e conflitos forem compreendidos;
6. crie o administrador de Production em terminal seguro;
7. gere um novo deployment sem promover imediatamente, quando o fluxo permitir;
8. repita smoke tests sem criar PII real;
9. promova somente apos aprovacao humana explicita;
10. monitore erros e tenha rollback de aplicacao e banco pronto.

Nao use `health = ok`, build local ou testes PGlite como substitutos para essa
validacao.

## Checklist final

- [ ] Recurso Neon canonico identificado.
- [ ] Recurso Neon excedente revisado antes de qualquer remocao.
- [ ] Development, Preview e Production isolados.
- [ ] `DATABASE_URL` pooled mantida no runtime.
- [ ] `DATABASE_URL_UNPOOLED` exigida nas migrations.
- [ ] `md/.env.local` criado corretamente e com permissao `0600`.
- [ ] Segredos independentes cadastrados nos tres ambientes.
- [ ] `APP_ORIGIN` exata e estavel por ambiente.
- [ ] Blob criado, conectado e testado em Preview.
- [ ] Migration, schema, seed e primeiro admin validados em Preview.
- [ ] Evento ficticio `open` criado somente para o teste de Preview.
- [ ] Preview deployment criado e todas as rotas validadas.
- [ ] Upload real e recusas do Blob validados.
- [ ] Site publico conectado a leitura, inscricao e contato server-side.
- [ ] Inscricoes e contatos possuem fluxo operacional administrativo.
- [ ] Logs nao expoem segredos nem PII.
- [ ] Retencao, exclusao, backup, restore e incidente aprovados.
- [ ] Regulamento validado em exatamente 3 paginas A4.
- [ ] UI validada em `320`, `390`, `767`, `768`, `1024` e `1440` px.
- [ ] Plano e custos de Vercel, Neon e Blob aprovados.
- [ ] Production promovida somente com confirmacao humana explicita.

## Comandos de verificacao local

Use Node 24 no PATH desta maquina:

```bash
export PATH=/home/https/.config/nvm/versions/node/v24.14.0/bin:$PATH
cd "/home/https/Área de trabalho/workspace/MD/md"

npm run check
npm test
npm run build

cd ..
vercel build --yes
cd md
npm run check:vercel-output
```

Verificacoes Vercel somente leitura, executadas na raiz `MD`:

```bash
vercel whoami
vercel project inspect mdprojetos
vercel env ls
vercel integration list mdprojetos
vercel list
vercel blob list-stores
```

Nunca inclua tokens, URLs de conexao ou valores de env na saida compartilhada.

## Referencias oficiais

- [Neon: connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon: branching](https://neon.com/docs/introduction/branching)
- [Neon: conexao manual com Vercel](https://neon.com/docs/guides/vercel-manual)
- [Vercel: variaveis de ambiente](https://vercel.com/docs/environment-variables)
- [Vercel: Postgres via Marketplace](https://vercel.com/docs/postgres)
- [Vercel: Storage Marketplace](https://vercel.com/docs/marketplace-storage)
- [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Vercel: Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js)

## Limites desta auditoria

- nenhuma variavel, integracao, branch, tabela, usuario ou deployment foi criado
  ou alterado;
- nenhuma migration, seed, criacao de admin, upload ou deploy foi executado;
- as duas conexoes Neon locais foram consultadas apenas para metadados e
  contagens, em transacao somente leitura;
- Production foi validada apenas por metadados Vercel e requisicoes HTTP GET;
- o schema e as branches de Production precisam de verificacao direta posterior;
- valores de segredos e connection strings nao foram incluidos neste documento.

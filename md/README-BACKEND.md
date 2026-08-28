# Backend temporario M&D na Vercel

Backend Node.js para o site estatico M&D, executado em Vercel Functions, com Neon Postgres para dados relacionais e Vercel Blob para imagens administraveis. O frontend continua em HTML, CSS e ES Modules, sem framework.

> Estado verificado em 28/08/2026: a implementacao local, os testes com Postgres embutido e o build de Preview passam. O backend ainda nao esta operacional na Vercel porque o projeto `mdprojetos` nao possui as variaveis obrigatorias em Development, Preview ou Production. Neon, Blob, migrations, seed, primeiro administrador e testes reais de Preview continuam pendentes.

## Estado objetivo

| Area | Estado | Evidencia ou pendencia |
|---|---|---|
| Vercel Functions | Validado localmente | `vercel build --yes` gera 4 Functions `nodejs24.x` |
| Rotas profundas | Validado no build | rewrites levam todas as rotas admin/public aos dois roteadores internos |
| Saida estatica | Validada | 86 arquivos publicos; sem `server/`, `scripts/`, migrations, testes ou docs |
| Migrations | Validado em PGlite | banco vazio, repeticao idempotente, constraints e rollback |
| Seed | Validado em PGlite | 3 eventos, 3 projetos, 2 paginas, configuracoes e 16 midias estaticas |
| Autenticacao | Validada localmente | scrypt, sessao por hash, cookie seguro, CSRF, expiracao, revogacao e rate limit |
| Editorial | Validado localmente | rascunho separado, snapshot publicado e conflito otimista `409` |
| Inscricoes e contato | APIs validadas localmente | transacoes, idempotencia, protocolo no servidor e consulta administrativa |
| Vercel Blob | Fluxo testado com doubles | upload real depende de criar/configurar o Blob no ambiente |
| Neon real | Pendente | nenhuma `DATABASE_URL` configurada na Vercel |
| Preview real | Pendente | nao houve deploy, migration, seed nem smoke test externo |
| Integracao do site publico | Parcial | APIs existem; formularios e leitura publica ainda usam o fluxo estatico/demonstrativo |
| Impressao do regulamento | Reprovada | Chromium gerou 4 paginas A4; o requisito e exatamente 3 |
| Privacidade para uso real | Pendente | exige politica aprovada de retencao, exclusao, backup e revisao de seguranca |

Nao use a expressao “100% em producao” antes de concluir os itens pendentes acima.

## Arquitetura

```text
navegador
  |-- /admin/* -----------------------> /api/auth/* e /api/admin/*
  |                                      |
  |                                      +-- servicos/regras
  |                                      +-- repositorios
  |                                      +-- Neon Postgres
  |                                      +-- autorizacao de upload
  |
  |-- site publico -------------------> /api/public/*
                                         |
                                         +-- snapshots publicados
                                         +-- inscricoes e contato

navegador administrativo ------------> Vercel Blob
  upload direto com autorizacao curta     |
                                           +-- callback validado
                                           +-- metadados no Postgres
```

As dependencias de provedor ficam isoladas:

- `server/database/neon-adapter.js`: conexao e transacoes Neon;
- `server/storage/blob-service.js`: autorizacao, verificacao e ciclo de vida do Blob;
- `server/repositories/`: persistencia editorial e administrativa;
- `server/services/`: regras de negocio;
- `server/http/`: contrato HTTP, seguranca e roteamento;
- `api/`: entradas finas das Vercel Functions;
- `admin/js/repositories/`: cliente do painel, sem acesso direto ao banco;
- `admin/js/api-client.js`: cliente HTTP compartilhado do painel.

## Estrutura principal

```text
md/
├── api/
│   ├── health.js
│   ├── auth/[action].js
│   ├── admin/...
│   └── public/...
├── db/migrations/
├── server/
│   ├── auth/
│   ├── database/
│   ├── http/
│   ├── repositories/
│   ├── security/
│   ├── services/
│   ├── storage/
│   └── validation/
├── scripts/
├── test/
├── .env.example
├── package.json
└── vercel.json
```

## Requisitos

- Node.js 24.x;
- npm;
- Vercel CLI para desenvolvimento e build;
- banco Postgres compativel com Neon;
- Vercel Blob para upload real;
- origem HTTP/HTTPS estavel para `APP_ORIGIN`.

O projeto Vercel deve manter:

- Root Directory: `md`;
- Framework Preset: `Other`;
- Node.js: `24.x`;
- regiao de Functions: `gru1`;
- frontend e API na mesma origem.

O projeto usa duas Functions roteadoras para admin e publico, alem de auth e health. As 4 Functions ficam abaixo do limite atual de 12 Functions por deploy para projetos sem framework no plano Hobby, conforme a [documentacao de runtimes da Vercel](https://vercel.com/docs/functions/runtimes). Isso nao torna o plano Hobby automaticamente adequado para atividade comercial.

## Instalacao local

```bash
cd /caminho/para/MD
vercel link --project mdprojetos
vercel env pull md/.env.local
cd md
npm ci
```

O pull acima usa Development por padrao. Se nao quiser usar o CLI, copie `.env.example` para `md/.env.local` e preencha valores locais ficticios/isolados. Nunca envie esse arquivo ao Git.

Depois:

```bash
npm run db:migrate
npm run db:seed
npm run db:create-admin
npm run check
npm test
npm run build
npm run dev
```

`npm run dev` sobe para a raiz do repositorio antes de chamar a Vercel CLI, pois o projeto remoto usa Root Directory `md`. O seed e manual; ele nao roda no build nem no deploy.

## Variaveis de ambiente

| Variavel | Obrigatoria | Uso |
|---|---:|---|
| `DATABASE_URL` | sim | conexao Neon do ambiente |
| `BLOB_READ_WRITE_TOKEN` | sim para midia | credencial server-side do Vercel Blob |
| `APP_ORIGIN` | sim | origem exata aceita em mutacoes same-origin |
| `SESSION_SECRET` | sim | HMAC dos tokens de sessao e callbacks internos |
| `CSRF_SECRET` | sim | derivacao do token CSRF |
| `IP_HASH_SECRET` | sim | pseudonimizacao de endereco para rate limit |
| `PII_ENCRYPTION_KEY` | ainda nao | reservada; nao ha criptografia de PII ativada |

Gere segredos independentes para cada ambiente. Exemplo local, sem reutilizar a saida entre variaveis:

```bash
openssl rand -base64 48
```

Regras:

- nunca reutilize o banco de Production em Preview;
- use branch/banco Neon separado para Development, Preview e Production;
- avalie Blob separado quando o isolamento do ambiente exigir;
- `APP_ORIGIN` nao leva barra final;
- para Preview, prefira um alias estavel da branch e configure esse alias como `APP_ORIGIN`;
- nao exponha nenhuma dessas variaveis em JavaScript cliente.

## Configuracao Vercel, Neon e Blob

No dashboard da Vercel:

1. Abra o projeto `mdprojetos`.
2. Confirme em Settings que Root Directory e `md`, Framework e `Other` e Node e `24.x`.
3. Em Storage/Marketplace, instale Neon e crie uma base ou branch exclusiva para Preview.
4. Confirme a regiao `sa-east-1` quando estiver disponivel e compativel.
5. Crie um Vercel Blob para o ambiente.
6. Em Settings > Environment Variables, adicione as variaveis da tabela anterior somente ao ambiente correto.
7. Nao copie credenciais de Production para Preview.
8. Execute primeiro migration, seed e criacao de administrador no ambiente nao produtivo.
9. Publique um Preview e conclua os smoke tests.
10. Promova para Production somente com confirmacao humana.

O plano Hobby nao deve ser presumido adequado para um site de atividade comercial. Nao altere nem compre plano sem autorizacao.

## Banco, migrations e seed

A migration versionada fica em `db/migrations/001_initial_schema.sql`. `schema_migrations` registra nome, versao e checksum; alterar uma migration ja aplicada causa falha fechada.

```bash
npm run db:migrate
```

Tabelas:

- `admin_users`, `admin_sessions`, `password_reset_tokens`;
- `events`, `projects`, `site_pages`, `site_settings`;
- `media_assets`, `media_usages`;
- `registrations`, `registration_responsibles`, `registration_members`, `registration_consents`;
- `contact_messages`;
- `audit_logs`, `rate_limit_buckets`, `idempotency_keys`;
- `schema_migrations`.

O seed inicial importa o conteudo estatico atual como publicado sem apagar nem sobrescrever IDs ja existentes:

```bash
npm run db:seed
```

Ele nao cria usuario e nao deve ser executado automaticamente em cada deploy.

## Primeiro administrador

Execute em terminal interativo:

```bash
npm run db:create-admin
```

O script solicita e-mail, nome, senha e confirmacao. A senha nao aparece no terminal, passa por politica minima e e persistida apenas como hash scrypt com salt individual. Atualizar um usuario exige digitar `ATUALIZAR` e revoga as sessoes anteriores.

Nao existe credencial padrao e `admin/admin` nao e aceito.

## Autenticacao e seguranca

Rotas:

```text
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout
POST /api/auth/password-reset
```

Controles implementados:

- token de sessao aleatorio de 32 bytes;
- somente o hash HMAC do token e gravado;
- cookie `HttpOnly`, `SameSite=Strict`, `Path=/` e `Secure` em HTTPS/Production;
- expiracao de 12 horas e rotacao perto do vencimento;
- revogacao no logout e ao redefinir administrador pelo script;
- CSRF obrigatorio em toda mutacao administrativa;
- validacao de origem exata, sem CORS aberto;
- rate limit compartilhado no Postgres;
- mensagens genericas de login e recuperacao;
- painel falha fechado quando API ou banco nao respondem;
- o navegador pode lembrar somente o e-mail.

A recuperacao automatizada de senha nao envia e-mail enquanto nao houver provedor configurado. O endpoint retorna resposta generica e registra apenas auditoria minima.

## Modelo editorial

Eventos, projetos, paginas e configuracoes mantem:

```text
draft_data
published_data
editorial_status
revision
published_revision
published_at
archived_at
```

Salvar altera apenas `draft_data`. Publicar valida o rascunho, copia o snapshot para `published_data` e grava auditoria na mesma transacao. A API publica consulta exclusivamente registros `published` com snapshot.

Toda atualizacao exige `revision`; uma edicao obsoleta recebe `409 REVISION_CONFLICT`.

## APIs administrativas

Todas exigem sessao. Mutacoes tambem exigem `Origin` correto e `X-CSRF-Token`.

```text
GET    /api/admin/events
GET    /api/admin/events/:id
POST   /api/admin/events
PUT    /api/admin/events/:id
POST   /api/admin/events/:id/duplicate
POST   /api/admin/events/:id/publish
POST   /api/admin/events/:id/archive
DELETE /api/admin/events/:id

GET    /api/admin/projects
GET    /api/admin/projects/:id
POST   /api/admin/projects
PUT    /api/admin/projects/:id
POST   /api/admin/projects/reorder
POST   /api/admin/projects/:id/duplicate
POST   /api/admin/projects/:id/publish
POST   /api/admin/projects/:id/archive
DELETE /api/admin/projects/:id

GET  /api/admin/content/:page
PUT  /api/admin/content/:page
POST /api/admin/content/:page/publish
POST /api/admin/content/:page/restore

GET  /api/admin/settings
PUT  /api/admin/settings
POST /api/admin/settings/publish

GET    /api/admin/media
GET    /api/admin/media/:id
POST   /api/admin/media/upload-token
PUT    /api/admin/media/:id
POST   /api/admin/media/:id/replace
DELETE /api/admin/media/:id
GET    /api/admin/media/:id/usage

GET /api/admin/activity

GET /api/admin/registrations
GET /api/admin/registrations/:id
PUT /api/admin/registrations/:id/status

GET /api/admin/contact-messages
GET /api/admin/contact-messages/:id
PUT /api/admin/contact-messages/:id/status
```

Inscricoes e mensagens ja possuem API administrativa, mas ainda nao possuem telas grandes dedicadas no painel.

## API publica

```text
GET  /api/public/bootstrap
GET  /api/public/events
GET  /api/public/events/:slug
POST /api/public/registrations
POST /api/public/contact
```

Resposta de sucesso:

```json
{ "ok": true, "data": {} }
```

Resposta de erro:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Corrija os campos indicados.",
    "fields": {}
  }
}
```

As mutacoes publicas exigem `Origin` same-origin e `Idempotency-Key` entre 8 e 200 caracteres.

## Inscricoes

O servico valida em transacao:

- evento publicado e com status aberto;
- periodo, categoria e modalidade;
- minimo/maximo de atletas e comissao quando configurado;
- capacidade sob lock do evento;
- responsavel, membros e consentimentos;
- versao do regulamento;
- chave de idempotencia.

O protocolo e criado no servidor no formato `MD-AAAAMMDD-XXXXXXXX`. O payload pessoal completo nao vai para logs de auditoria.

Os dados antigos `md.registration.drafts.v1` e `md.registrations.v1` nao sao importados automaticamente. Rascunhos locais so devem ser removidos pelo frontend depois de uma resposta oficial de sucesso; essa integracao publica ainda esta pendente.

## Contato

O endpoint valida nome, e-mail ou telefone, assunto, mensagem, consentimento, honeypot, tamanhos, rate limit e idempotencia. A mensagem inicia com status `new` e fica disponivel na API administrativa. Nao ha simulacao de envio de e-mail.

O formulario publico atual ainda precisa ser ligado a esse endpoint.

## Midia e Vercel Blob

O navegador envia JPEG, PNG ou WebP diretamente ao Vercel Blob. A Function gera autorizacao curta depois de validar sessao, CSRF, origem, nome, MIME, extensao e limite de 5 MB.

No callback, o servidor confere:

- assinatura do callback do SDK;
- payload interno assinado e expiracao;
- pathname aleatorio e restrito;
- MIME e tamanho informados pelo Blob;
- assinatura binaria JPEG, PNG ou WebP;
- revisao na substituicao.

SVG de upload e recusado. Midia estatica permanece somente leitura. Exclusao e bloqueada enquanto houver referencias em `media_usages`.

Testes locais usam doubles do Blob; a prova end-to-end real depende de `BLOB_READ_WRITE_TOKEN` e Preview configurados.

## Exportacao, importacao e backup

Exportacao administrativa, sem inscricoes nem mensagens de contato:

```bash
npm run db:export -- --output=backups/md-admin.json
```

O arquivo usa `schemaVersion: 1` e inclui eventos, projetos, conteudo, configuracoes e metadados de midia. O comando nao sobrescreve um arquivo existente.

Validacao sem gravar:

```bash
npm run db:import-admin-export -- --input=backups/md-admin.json
```

Aplicacao em Development/Preview:

```bash
npm run db:import-admin-export -- --input=backups/md-admin.json --apply
```

Production exige, alem de autorizacao humana explicita:

```bash
npm run db:import-admin-export -- \
  --input=backups/md-admin.json \
  --apply \
  --confirm-production=IMPORTAR-PRODUCAO
```

Metadados de upload local ou Blob nao provam que o arquivo existe no ambiente de destino. Esses itens ficam pendentes por padrao. `--trust-existing-blob-urls` so deve ser usado em restore controlado no mesmo armazenamento, depois de verificar os objetos.

Este export administrativo nao substitui backup de dados pessoais. Para banco real, configure backup/PITR do Neon e uma politica separada para inscricoes e contato.

## Health check

```text
GET /api/health
```

Quando o banco responde:

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "database": "reachable",
    "version": "commit-ou-local",
    "checkedAt": "ISO-8601"
  }
}
```

Falhas retornam `503` sem URL de conexao, host Neon, token ou stack trace.

## Testes e build

```bash
npm run check
npm test
npm run build
vercel build --yes
npm run check:vercel-output
```

Cobertura atual inclui migrations, constraints, rollback, seed, scrypt, cookies, sessao, revogacao, CSRF, rate limit, conflito editorial, publicacao, midia, inscricao, capacidade, contato, export/import e rotas HTTP integradas.

O build estatico e criado em `.vercel-static/` por uma lista permitida. Isso impede publicar acidentalmente codigo server-side, scripts operacionais, migrations, testes, relatorios e docs como arquivos estaticos.

A verificacao do regulamento em Chromium nao apresentou erros de console, mas o PDF teve 4 paginas A4. Esse item e uma pendencia de interface e nao foi corrigido durante a auditoria do backend.

## Retencao e privacidade

Antes de aceitar inscricoes reais, aprove e implemente uma politica para:

- minimizacao de dados, especialmente de menores;
- perfis autorizados e revisao de acesso;
- prazo de retencao por tipo de registro;
- exclusao e atendimento ao titular;
- backup, restore e descarte;
- resposta a incidente;
- criptografia de campos selecionados, se adotada;
- limpeza programada de sessoes, idempotencia e buckets antigos.

Hoje `PII_ENCRYPTION_KEY` esta reservada, mas nao e usada. Nao anuncie conformidade ou prontidao juridica sem revisao especializada.

## Rollback

### Aplicacao

Use a tela de Deployments da Vercel para promover um deploy anterior validado. Isso nao apaga o banco nem o Blob.

### Banco

1. Pare novas gravacoes se houver incidente.
2. Verifique `/api/health` e os logs sem expor PII.
3. Preserve um export administrativo e o backup/PITR Neon.
4. Restaure primeiro em ambiente isolado.
5. Compare quantidades, slugs e snapshots publicados.
6. Produza restore de Production somente com confirmacao humana.

### Site publico

O site publico ainda usa dados estaticos, portanto continua disponivel sem a API. O futuro corte para `public-data-repository.js` deve manter um unico sinal de fallback somente leitura. Esse fallback nao pode reativar login local, publicacao local nem apagar dados server-side.

## Migracao futura para Firebase

O frontend conhece apenas `/api/auth/*`, `/api/admin/*` e `/api/public/*`. Para migrar:

- substitua `server/database/neon-adapter.js` e repositorios;
- substitua `server/storage/blob-service.js`;
- preserve DTOs, schemas Zod, servicos e contratos HTTP;
- converta migrations/constraints em regras e indices equivalentes;
- mantenha IDs string e datas ISO 8601;
- valide novamente transacoes, idempotencia, capacidade e auditoria.

Nenhum componente do navegador importa SDK Neon ou acessa `DATABASE_URL`.

## Checklist antes de chamar de pronto

- [ ] criar Neon separado para Development/Preview;
- [ ] criar Blob e configurar token do ambiente;
- [ ] configurar todas as variaveis sem compartilhar Production;
- [ ] executar migration e seed em Preview;
- [ ] criar o primeiro administrador em Preview;
- [ ] conectar leitura publica, inscricao e contato aos endpoints;
- [ ] validar upload real JPEG/PNG/WebP e recusas;
- [ ] testar todas as rotas no dominio de Preview;
- [ ] revisar logs e confirmar ausencia de PII;
- [ ] validar UI em 320, 390, 767, 768, 1024 e 1440 px;
- [ ] confirmar regulamento em exatamente 3 paginas A4;
- [ ] aprovar privacidade, retencao, backup e restore;
- [ ] decidir plano Vercel adequado;
- [ ] promover para Production somente com confirmacao explicita.

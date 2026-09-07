# Estrutura atual geral do projeto M&D

**Atualizado em:** 06/09/2026 (America/Sao_Paulo)

**Branch de referência:** `staging`

**Commit verificado:** `23e4dcf1fb811ae69247207503ea1248ec511567`

Este documento é a referência canônica da estrutura atual. Os relatórios de
28/08, 04/09 e 05/09 permanecem no repositório como registros históricos e não
devem ser usados isoladamente para concluir o estado presente.

## Visão geral

O projeto combina:

- frontend estático em HTML, CSS e ES Modules;
- painel administrativo também em JavaScript nativo;
- quatro Vercel Functions Node.js 24;
- Postgres no Neon para conteúdo, autenticação, inscrições, contatos e
  auditoria;
- Vercel Blob implementado no código, mas ainda sem validação real neste
  fechamento;
- CI no GitHub Actions com instalação, check, testes e build.

O diretório de aplicação é `md/`. O vínculo com a Vercel fica na raiz do
repositório porque o Root Directory remoto do projeto `mdprojetos` é `md`.

## Árvore de responsabilidades

```text
MD/
├── .github/workflows/ci.yml        # CI com Node 24
├── md/
│   ├── index.html                  # home, catálogo e detalhe consolidado
│   ├── evento.html                 # redirect legado
│   ├── inscricoes.html             # redirect legado
│   ├── regulamento-*.html          # redirect legado do regulamento
│   ├── admin/                      # login, shell e views administrativas
│   ├── api/                        # quatro entradas de Vercel Functions
│   ├── assets/                     # logos e imagens estáticas
│   ├── css/                        # reset, tokens, layout e componentes
│   ├── data/                       # fallback estático somente para leitura
│   ├── db/migrations/              # migrations SQL versionadas
│   ├── js/                         # módulos do site público
│   ├── scripts/                    # build, manutenção e verificação
│   ├── server/                     # backend em camadas
│   ├── test/                       # testes unitários, HTTP e de banco
│   ├── .env.example                # contrato de configuração, sem secrets
│   ├── package.json
│   └── vercel.json
└── relatorio-vercel-neon-md.md     # evidência operacional mais recente
```

Camadas do backend:

```text
api/ -> server/http/ -> server/services/ -> server/repositories/
                                   |                  |
                                   +-> security/      +-> database/
                                   +-> validation/    +-> storage/
```

- `api/` contém apenas as entradas da plataforma.
- `server/http/` resolve rotas, autenticação, autorização e envelopes HTTP.
- `server/services/` concentra regras de negócio e idempotência.
- `server/repositories/` concentra SQL e mapeamento de dados.
- `server/database/` separa runtime pooled de manutenção direta.
- `server/storage/` encapsula o fluxo do Vercel Blob.
- `server/security/` contém senha, sessão, origem e rate limit.
- `server/validation/` contém schemas e regras de entrada.

## Site público consolidado

`index.html` contém três estados principais:

- home e seções institucionais dentro de `#mainViews`;
- catálogo de eventos em `#inscricoes`;
- detalhe dinâmico em `#eventDetailSection`.

`GET /api/public/bootstrap` é a fonte prioritária. Se a API não responder, os
módulos em `data/` permitem leitura do conteúdo, mas marcam o evento como
bloqueado para inscrição. O fallback nunca confirma disponibilidade nem grava
dados.

Compatibilidade de URLs:

- `inscricoes.html` redireciona para `index.html#inscricoes`;
- `evento.html` preserva slug/query/hash e redireciona para o detalhe
  consolidado;
- a URL antiga do regulamento redireciona para o regulamento dentro do detalhe.

## Inscrição e contato públicos

Rotas:

```text
GET  /api/public/bootstrap
GET  /api/public/events
GET  /api/public/events/:slug
POST /api/public/registrations
POST /api/public/contact
```

As mutações exigem origem same-origin e `Idempotency-Key`. A inscrição só é
considerada concluída após `201`, com `protocol`, `registrationId` e
`receivedAt` emitidos pelo servidor. Replay válido devolve os mesmos dados e o
header `Idempotency-Replayed: true`.

O navegador mantém somente rascunhos em `md.registration.drafts.v1`, por até
sete dias. A mesma chave é reutilizada nos retries e o rascunho só é removido
após `201`. A chave legada `md.registrations.v1` é apagada sem leitura ou
migração.

O contato exige consentimento, honeypot, idempotência, rate limit e pelo menos
um canal válido.

## Painel administrativo e RBAC

Rotas de interface:

```text
/admin/#dashboard
/admin/#registrations
/admin/#events
/admin/#content/home
/admin/#projects
/admin/#media
/admin/#settings
```

Papéis:

| Papel | Conteúdo, eventos, projetos, mídia, auditoria e contatos | Inscrições |
|---|---|---|
| `admin` | permitido | listar, detalhar e alterar status |
| `editor` | permitido | listar, detalhar e alterar status |
| `organizer` | `403` | listar, detalhar e alterar status |

Sem sessão, a API responde `401`. Toda mutação administrativa exige sessão,
origem válida e CSRF. Papel desconhecido não recebe permissões.

A listagem de inscrições aceita `limit`, `cursor`, `sync`, `query`, `status`,
`eventId` e `categoryId`. Ela não contém PII; a pesquisa é restrita a protocolo
e equipe. Responsáveis, contatos, nascimento e atletas aparecem somente no
detalhe autenticado.

O painel sincroniza inscrições por cursor a cada quatro segundos, pausa em aba
oculta, atualiza imediatamente no foco, impede requisições concorrentes, aplica
backoff até 60 segundos, reconcilia periodicamente e desmonta timers/listeners
na troca de view.

## Functions e roteamento Vercel

Entradas publicadas:

```text
api/health.js
api/auth/[action].js
api/admin/router.js
api/public/router.js
```

`vercel.json` mantém Node 24, duração máxima de 30 segundos, região `gru1`,
headers de segurança/no-store e rewrites profundos para os roteadores admin e
público.

O build estático copia nove entradas públicas e exclui backend, scripts de
manutenção, migrations, testes, documentação e arquivos de ambiente.

## Banco e manutenção

O schema atual possui 18 tabelas públicas, incluindo `schema_migrations`. As
migrations versionadas são:

1. `001_initial_schema.sql` — schema inicial;
2. `002_organizer_role_and_registration_indexes.sql` — papel `organizer` e
   índices de paginação/sincronização.

O runtime HTTP usa `DATABASE_URL` pooled. Migrations, seed, criação de usuários,
export e import aplicado usam exclusivamente `DATABASE_URL_UNPOOLED` direta. O
código recusa URL ausente, inválida ou com endpoint `-pooler` para manutenção.

No Preview verificado, as migrations 001 e 002 aparecem uma vez cada, com os
mesmos checksums dos arquivos locais. Há uma conta ativa `admin` e uma
`organizer`; nenhuma PII foi consultada nesta verificação.

## Testes, build e CI

A verificação de 06/09/2026 registrou:

- 136 arquivos JavaScript com sintaxe válida;
- 18 arquivos de teste e 94 testes aprovados;
- zero falhas, skips ou vulnerabilidades em dependências de runtime;
- build estático com 96 arquivos;
- quatro Functions `nodejs24.x` no artefato Vercel verificado;
- `git diff --check` limpo.

O workflow `.github/workflows/ci.yml` roda em pushes para `staging` e `main`,
além de pull requests, usando Node 24 e `working-directory: md`.

## Estado remoto observado

- `origin/staging`: `23e4dcf1fb811ae69247207503ea1248ec511567`;
- Preview `mdprojetos`: `READY`, origem Git `staging`, região `gru1` e quatro
  Functions Node;
- `main` e o deployment de Production continuam em
  `de430ffea24c1c95098171337ee3632205e42787`;
- Neon autorizado: `withered-moon-82282924` / `neon-coquelicot-dog`, branch
  `br-hidden-poetry-ac5a7r03` (`preview/staging`), região `aws-sa-east-1`;
- nenhuma PR aberta de `staging` para `main` foi encontrada nesta verificação.

## Status das validações e pendências

1. **Taça Vale (Concluído):** O snapshot publicado no Neon Preview foi atualizado
   para `open`, com datas de 01/08 a 15/10/2026 (`publishedRevision: 2`), alinhado
   à fonte estática e validado via API.
2. **Healthcheck e banco (Concluído):** `GET /api/health` revalidado via token
   de bypass autorizado (`x-vercel-protection-bypass`): retornou 200 OK,
   `database: reachable` e SHA `23e4dcf1fb811ae69247207503ea1248ec511567`.
3. **E2E remoto completo (Concluído):** Reproduzido com sucesso contra o Preview
   remoto, cobrindo emissão de protocolo pelo servidor, replay idempotente,
   contato público, conferência no Neon e limpeza dos dados de teste.
4. **Checks de projetos extras Vercel (Exceção mantida):** Mantido inalterado
   por instrução explícita do usuário para revisão posterior de integração.
5. **PR `staging` → `main` (Pronta para abertura):** Branch atualizada; link de
   comparação e template prontos para submissão humana sem merge automático.
6. **Worktree antigo (Preservado):** `MD-preview-staging` mantido intacto
   (`ahead 1, behind 9`), sem descarte ou reset local.
7. **Backlog de produção (Delimitado):** Blob real, retenção/exclusão,
   criptografia de PII em repouso, backup/PITR, restore, monitoramento e
   impressão A4 permanecem delimitados para a fase de lançamento em Production.

## Documentos relacionados

- `../README.md`: entrada rápida da aplicação;
- `../README-BACKEND.md`: operação detalhada do backend;
- `configuracao-backend-vercel-neon-pendencias.md`: próximos passos e histórico;
- `../../relatorio-vercel-neon-md.md`: evidências da verificação mais recente;
- `backend-audit-initial.md` e `relatorio-preview-staging-2026-09-05.md`:
  snapshots históricos.

# M&D — site consolidado e backend de Preview

Site estático da M&D em HTML, CSS e ES Modules, com APIs Node.js 24 em Vercel Functions e dados relacionais no Neon Postgres.

O checkout ativo da aplicação é esta pasta `md/`. O projeto Vercel é vinculado na raiz do repositório porque o Root Directory remoto é `md`.

## Estado e limites

A branch `staging` é o ambiente de validação. Production continua vinculada a `main` e não faz parte deste fluxo.

- Vercel: somente `colaresdev/mdprojetos`, ambiente Preview da branch `staging`.
- Neon de Preview: projeto `withered-moon-82282924` (`neon-coquelicot-dog`), região Brasil, branch `br-hidden-poetry-ac5a7r03` (`preview/staging`).
- Nunca usar o projeto `neon-purple-marble` em testes, migrations ou dados de Preview.
- Runtime HTTP usa `DATABASE_URL` pooled.
- Migrations e manutenção exigem `DATABASE_URL_UNPOOLED` direta, sem fallback.
- Blob real, Production, retenção/exclusão, criptografia de PII, backup/PITR e aprovação de inscrições reais permanecem fora do escopo.

## Executar e validar

Requer Node.js 24.x.

```bash
npm ci
npm run check
npm test
npm run build
npm audit --omit=dev
```

Para servir apenas o frontend estático localmente:

```bash
python3 -m http.server 4173
```

Acesse `http://127.0.0.1:4173/md/index.html` quando o servidor for iniciado na raiz do repositório.

Para validar o artefato Vercel, execute na raiz do repositório já vinculada ao projeto correto:

```bash
vercel build --target=preview
npm --prefix md run check:vercel-output
```

O verificador exige exatamente quatro Functions Node 24 e recusa código do servidor, testes, migrations, relatórios e secrets na saída estática.

## Arquitetura pública consolidada

- `index.html`: home, catálogo `#inscricoes` e detalhe dinâmico `#eventDetailSection`.
- `inscricoes.html`: redirect compatível para `index.html#inscricoes`.
- `evento.html`: preserva query/hash e redireciona para `index.html?evento=<slug>`.
- `regulamento-taca-vale-handebol-2026.html`: redirect compatível para o regulamento dentro do detalhe.
- `GET /api/public/bootstrap`: fonte prioritária de eventos, projetos e conteúdo publicado.
- Fallback em `data/*.js`: somente leitura; todo evento recebe `registrationLocked` e não pode abrir inscrição.

A navegação dinâmica alterna `#mainViews` e `#eventDetailSection`, preserva histórico, âncoras, foco, app shell mobile e os IDs usados pela interface.

A Taça Vale está configurada na fonte estática como `open`, com inscrições de 01/08 a 15/10/2026. O snapshot publicado da API continua sendo a autoridade em runtime.

## Inscrições e contato

O modal público envia `POST /api/public/registrations` com `Idempotency-Key`. Só um `201` confirmado apaga o rascunho. A resposta oficial contém:

```json
{
  "protocol": "MD-AAAAMMDD-XXXXXXXX",
  "registrationId": "identificador",
  "receivedAt": "ISO-8601"
}
```

Um replay válido retorna o mesmo protocolo e `Idempotency-Replayed: true`. Não há protocolo nem inscrição concluída gerados ou persistidos localmente.

Rascunhos usam apenas `md.registration.drafts.v1`, expiram sete dias e conservam a mesma chave de idempotência entre tentativas. A chave antiga de inscrições concluídas é somente removida, sem leitura ou migração.

O formulário de contato envia `POST /api/public/contact` com consentimento, honeypot, limite de requisição, origem same-origin e idempotência.

## Painel e RBAC

Rotas principais:

```text
/admin/#dashboard
/admin/#registrations
/admin/#events
/admin/#content/home
/admin/#projects
/admin/#media
/admin/#settings
```

- `admin` e `editor`: conteúdo e inscrições.
- `organizer`: somente inscrições; pode listar, abrir detalhe e alterar status.
- Sem sessão: `401`.
- Sessão sem permissão: `403`.
- Toda mutação administrativa exige CSRF e origem válida.

A listagem de inscrições retorna somente dados operacionais de protocolo, equipe, evento, categoria, contagens, status e cursores. Nome de responsável, e-mail, telefone, nascimento, responsáveis e atletas existem apenas em `GET /api/admin/registrations/:id`.

A pesquisa da listagem é restrita a protocolo e equipe. O polling usa cursor incremental a cada 4 segundos, pausa quando a aba fica oculta, sincroniza imediatamente no foco, impede chamadas concorrentes, aplica backoff até 60 segundos, reconcilia periodicamente e encerra timers/listeners no unmount.

## Contratos HTTP

```text
GET  /api/health
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout

GET  /api/public/bootstrap
GET  /api/public/events
GET  /api/public/events/:slug
POST /api/public/registrations
POST /api/public/contact

GET  /api/admin/registrations
GET  /api/admin/registrations/metrics
GET  /api/admin/registrations/:id
PUT  /api/admin/registrations/:id/status
```

A listagem aceita `limit`, `cursor`, `sync`, `query`, `status`, `eventId` e `categoryId`, e responde `items`, `hasMore`, `nextCursor` e `syncCursor`. Atualização com `updatedAt` obsoleto retorna `409 revision_conflict`.

## Banco e migrations

As migrations versionadas ficam em `db/migrations/`. A migration `002_organizer_role_and_registration_indexes.sql` é imutável: libera `organizer` e cria os índices usados pelos cursores.

```bash
npm run db:migrate
```

O processo de manutenção recusa `DATABASE_URL_UNPOOLED` ausente, inválida ou com host `-pooler`. A URL direta deve ser obtida explicitamente para a branch `preview/staging` e injetada somente no processo filho; não use `vercel env run` para migration porque a integração pode resolver outra branch Neon.

## Estrutura principal

```text
md/
├── index.html
├── admin/
├── api/
├── css/
├── data/
├── db/migrations/
├── js/
├── server/
├── scripts/
├── test/
├── .env.example
├── package.json
└── vercel.json
```

## Conteúdo, visual e acessibilidade

A direção visual continua “Cadência Estruturada”: sem gradientes, glow, sombras difusas, parallax, bibliotecas externas ou títulos animados. O mobile fica isolado até 767 px; desktop começa em 768 px.

Preserve IDs, âncoras, `data-*`, controles nativos, `aria-*`, skip link, foco visível, teclado, reduced motion e contratos dos módulos. Fatos ainda não confirmados continuam como “A validar” ou placeholders demonstrativos.

O regulamento oficial é renderizado no detalhe da Taça Vale. A paginação A4 exata permanece uma pendência fora desta reconciliação.

## Documentação operacional

- `README-BACKEND.md`: arquitetura e operação do backend.
- `docs/configuracao-backend-vercel-neon-pendencias.md`: procedimento vigente e histórico da auditoria.
- `../relatorio-vercel-neon-md.md`: evidências da reconciliação e do Preview.

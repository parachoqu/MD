# Relatório de auditoria e configuração — Vercel + Neon — Sistema M&D

**Projeto:** M&D Projetos e Eventos Desportivos — `www.mdeventos.site`
**Repositório:** `parachoqu/MD`
**Team Vercel:** `colaresdev` (plano Hobby)
**Data:** 05/09/2026 · horários em UTC−03
**Escopo:** auditoria somente leitura + configuração não produtiva (Fases 1 a 3)
**Status geral:** configuração de infraestrutura concluída; Preview parcialmente aprovado; Production intocada

> Nenhum valor de secret, token, senha ou string de conexão aparece neste documento.

---

## 1. Sumário executivo

A investigação identificou e corrigiu a causa raiz dos erros 500 que afetavam o backend, além de reorganizar a topologia de bancos de dados.

**Causa raiz dos 500:** não era o banco de dados, nem tabelas, nem migrations. Era `md/server/config.js`, que lança exceção quando `APP_ORIGIN`, `SESSION_SECRET`, `CSRF_SECRET` ou `IP_HASH_SECRET` estão ausentes ou têm menos de 32 caracteres. Como `server/http/runtime.js` chama `getConfig({ requireDatabase: true })` sem `requireSecrets: false`, toda rota `/api/public/*`, `/api/admin/*` e `/api/auth/*` falhava **antes de qualquer consulta ao banco**. O `/api/health` continuava respondendo 200 porque é o único ponto do código que chama `getConfig({ requireSecrets: false })` explicitamente.

**Resultado após a correção:** em Preview, `/api/health` responde 200 e `/api/auth/session` responde 401 (comportamento correto e especificado). Os endpoints públicos passaram a falhar com o código Postgres `42P01` (`undefined_table`) — um erro diferente e mais avançado, que prova que a aplicação agora alcança o banco e apenas não encontra as tabelas.

**Pendência única de infraestrutura:** as migrations foram aplicadas na branch Neon do ambiente Development, enquanto o Preview lê uma branch Neon separada, criada automaticamente e ainda vazia. Detalhes e as duas soluções possíveis na seção 7.

---

## 2. Inventário — projetos Vercel

Três projetos apontam para o mesmo repositório e o mesmo commit.

| | **mdprojetos** | **md** | **md-78qo** |
|---|---|---|---|
| Project ID | `prj_Uj8S…SxBD` | `prj_0dKu…vwR7` | `prj_ZHrA…YzUQ` |
| Repositório | `parachoqu/MD` (conectado 22/08) | `parachoqu/MD` | `parachoqu/MD` |
| Recebe deploy do GitHub | Sim | **Sim** | **Sim** |
| Branch de produção | `main` | `main` | `main` |
| Root Directory | `md` | `./` (incorreto) | `./` (incorreto) |
| Framework Preset | Other | Other | Other |
| Node.js | 24.x | padrão | padrão |
| Build / Output | via `vercel.json`: `npm run build` / `.vercel-static` | sem override | sem override |
| Região das Functions | `gru1` (via `vercel.json`; confirmado em log) | — | — |
| Domínios | `mdeventos.site` (308 → www), `www.mdeventos.site`, `mdprojetos.vercel.app` | `md-eosin.vercel.app` | `md-78qo.vercel.app` |
| Deployment atual | `dd627cb` · main · Ready | `dd627cb` · Ready | `dd627cb` · Ready |
| Storage conectado | 2 Neon + Global Config | nenhum | nenhum |
| Variáveis de ambiente | sim | **zero** | **zero** |

**Conclusão:** `mdprojetos` é o projeto canônico — é o único que detém o domínio, o Root Directory correto, storage e variáveis. `md` e `md-78qo` são duplicados sem função válida, mas **continuam recebendo deploys automáticos do GitHub**, o que triplica builds a cada push e mantém duas cópias públicas do app quebrado em `.vercel.app`.

Nenhum dos duplicados foi excluído, desconectado ou alterado.

---

## 3. `vercel.json` em vigor (lido no deployment de produção)

```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": ".vercel-static",
  "regions": ["gru1"],
  "functions": { "api/**/*.js": { "maxDuration": 30 } },
  "rewrites": [
    { "source": "/api/admin/:path*",  "destination": "/api/admin/router?__md_route=:path" },
    { "source": "/api/public/:path*", "destination": "/api/public/router?__md_route=:path" }
  ],
  "headers": [
    { "source": "/api/(.*)", "headers": [
      { "key": "Cache-Control", "value": "no-store" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "same-origin" }
    ]}
  ]
}
```

**Observação importante:** o painel da Vercel exibe `iad1` como região das Functions e os campos de Build Command / Output Directory vazios. Isso é normal e não deve ser "corrigido" no painel: o `vercel.json` sobrepõe ambos, e o log de execução confirma *"Received in São Paulo, Brazil (gru1)"*. Alterar o painel criaria conflito com o repositório.

---

## 4. Bancos Neon — antes e depois

Ambos pertencem a uma única instalação Neon (`icfg_290A…474o`), plano **Free**, faturamento via Vercel, **custo zero**.

| | **neon-purple-marble** | **neon-coquelicot-dog** |
|---|---|---|
| Neon ID | `late-shadow-98576167` | `withered-moon-82282924` |
| Região | Washington D.C. — `iad1` / us-east-1 | **São Paulo — `gru1` / sa-east-1** |
| Plano | Free | Free |
| Neon Auth | ativo | ativo |
| Branch por deployment | desligado | **Preview ligado** |

### Estado anterior (problemático)

Ambos conectados a **All Environments**. O `purple-marble` publicava as variáveis sem prefixo (`DATABASE_URL`, `PGHOST`, …) e portanto era o banco realmente usado em runtime; o `coquelicot-dog` publicava as mesmas 18 variáveis com prefixo `mdata_`, que **nenhuma linha do código lê**. Resultado: Production, Preview e Development compartilhavam o mesmo banco, nos Estados Unidos, enquanto as Functions rodavam em São Paulo — uma travessia transcontinental por consulta.

### Estado atual

| Variáveis | Ambiente | Banco | Região |
|---|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e demais sem prefixo | **Production** | neon-purple-marble | iad1 |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e demais sem prefixo | **Preview + Development** | neon-coquelicot-dog | **gru1** |

As 18 variáveis com prefixo `mdata_` deixaram de existir. Nenhum banco foi excluído ou desconectado; o `purple-marble` permanece íntegro e serve Production exatamente como antes, com os mesmos valores.

**Banco canônico escolhido:** `neon-coquelicot-dog`, por estar na mesma região das Functions (`gru1`), conforme o próprio `README-BACKEND.md` prescreve, e por já ter o isolamento de Preview habilitado.

**Sobre dados preexistentes:** o Schema, o Query e o Data Editor do Neon no painel exigem verificação 2FA, e o console do Neon pediu verificação de e-mail — nenhum dos dois foi acessado. A ausência de tabelas foi comprovada indiretamente e de forma conclusiva pelo erro `42P01` retornado em runtime.

---

## 5. Variáveis de ambiente — estado final

| Variável | Production | Preview (`staging`) | Development | Origem |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | ✅ | integração Neon |
| `DATABASE_URL_UNPOOLED` | ✅ | ✅ | ✅ | integração Neon |
| Demais `POSTGRES_*`, `PG*`, `NEON_*` | ✅ | ✅ | ✅ | integração Neon |
| `APP_ORIGIN` | ❌ | ✅ Config | ✅ Config | manual |
| `SESSION_SECRET` | ❌ | ✅ Secret | ✅ Secret | manual |
| `CSRF_SECRET` | ❌ | ✅ Secret | ✅ Secret | manual |
| `IP_HASH_SECRET` | ❌ | ✅ Secret | ✅ Secret | manual |
| `BLOB_READ_WRITE_TOKEN` | ❌ | ❌ | ❌ | não existe Blob |
| `PII_ENCRYPTION_KEY` | ❌ | ❌ | ❌ | intencional — não implementada |
| `GLOBAL_CONFIG` | ✅ | ✅ | ✅ | Global Config Store |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | ✅ | ✅ | ✅ | Protection Bypass |

Valores de `APP_ORIGIN`: Preview usa o alias estável da branch `staging`; Development usa `http://localhost:3000`, coerente com `npm run dev` (`vercel dev`). Nenhum termina com barra.

Cada ambiente recebeu segredos próprios e distintos. Production permanece sem nenhum dos quatro — por decisão, é a Fase 4.

---

## 6. Alterações executadas

| # | Alteração | Ambiente | Horário |
|---|---|---|---|
| 1 | Branch `staging` criada no GitHub a partir de `main` (`dd627cb`) | GitHub | 10:40 |
| 2 | Deploy Hook `staging-preview` → branch `staging` | mdprojetos | 10:44 |
| 3 | `APP_ORIGIN` criada (Config) | Preview → `staging` | 10:52 |
| 4 | `APP_ORIGIN` criada (Config) | Development | 10:53 |
| 5 | Conexão `neon-purple-marble` estreitada para Production | Production | 11:02 |
| 6 | Conexão `neon-coquelicot-dog` movida para Preview + Development | pré-produção | 11:06 |
| 7 | Prefixo `mdata` removido da conexão do `coquelicot-dog` | pré-produção | ~11:12 |
| 8 | `SESSION_SECRET`, `CSRF_SECRET`, `IP_HASH_SECRET` criadas (Secret) | Preview → `staging` | 11:34 |
| 9 | `SESSION_SECRET`, `CSRF_SECRET`, `IP_HASH_SECRET` criadas (Secret) | Development | 11:51 |
| 10 | Deploy Hook disparado — 4 Preview Deployments de validação | Preview | 11:19 · 11:36 · 11:43 · 11:56 |

### Preservado integralmente

Production e o deployment `dd627cb`; `www.mdeventos.site`, `mdeventos.site` (redirect 308) e `mdprojetos.vercel.app`; os projetos `md` e `md-78qo` com seus vínculos Git e domínios; ambas as integrações Neon; todo o histórico de deployments; nenhuma migration, seed ou gravação de dados executada por este processo.

---

## 7. Smoke tests — evolução

Domínio de Preview: `mdprojetos-git-staging-colaresdev.vercel.app`

| Endpoint | Esperado | 11:20 | 11:37 | 15:02 (final) |
|---|---|---|---|---|
| `GET /api/health` | 200 | 200 | 200 | ✅ **200** |
| `GET /api/auth/session` (sem login) | 401 | 500 `UNEXPECTED` | **401** | ✅ **401** |
| `GET /api/public/events` | 200 | 500 `UNEXPECTED` | 500 `42P01` | ⚠️ 500 `42P01` |
| `GET /api/public/bootstrap` | 200 | 500 `UNEXPECTED` | 500 `42P01` | ⚠️ 500 `42P01` |

Production (`www.mdeventos.site/api/health`) permaneceu 200 e `database: reachable` durante todo o processo.

### Pendência aberta — descompasso de branch Neon

A integração `neon-coquelicot-dog` está com **"Create Database Branch For Deployment → Preview"** habilitada. Isso faz o Preview usar uma branch Neon própria, criada no primeiro deploy de `staging` (11:19) e não atualizada por deploys posteriores.

As migrations e o seed rodaram com `vercel env pull` sem argumentos, que traz o ambiente **Development** — ou seja, foram aplicadas na branch principal. O Preview lê a branch separada, ainda vazia. Daí o `42P01` persistente.

**Solução A — manter isolamento (recomendada):** aplicar as migrations também na branch de Preview.

```bash
vercel env pull md/.env.local --environment=preview --git-branch=staging
cd md
npm run db:migrate
npm run db:seed
npm run db:create-admin
# depois, para voltar o arquivo local ao ambiente de desenvolvimento:
vercel env pull md/.env.local
```

**Solução B — simplificar:** desligar "Create Database Branch For Deployment → Preview" na conexão do `coquelicot-dog` (Storage → neon-coquelicot-dog → Projects → ⋮ → Update Project Connection). Preview e Development passam a compartilhar a mesma branch, que já está migrada. Um único redeploy resolve. Production não é afetada, pois está em outro banco.

A Solução B não viola o isolamento exigido, já que a separação crítica — Preview nunca tocar o banco de Production — continua garantida por serem bancos Neon distintos.

---

## 8. Ajustes necessários no repositório (para o Codex)

### 8.1 Migrations sobre conexão pooled — prioridade alta

`md/server/database/neon-adapter.js` conecta com `process.env.DATABASE_URL`, que é a conexão **pooled** (pgbouncer):

```js
export function createNeonDatabase(connectionString = process.env.DATABASE_URL) { … }
```

`scripts/migrate.mjs`, `scripts/seed.mjs` e `scripts/create-admin.mjs` chamam `getDatabase()` de `server/database/index.js`, herdando a conexão pooled. DDL sobre pgbouncer é instável — advisory locks e transações longas podem se comportar de forma inesperada.

**Correção sugerida:** fazer os scripts operacionais usarem `DATABASE_URL_UNPOOLED`, com fallback para `DATABASE_URL`. A função `createNeonDatabase` já aceita a connection string como parâmetro, então basta os scripts passarem a variável correta, sem alterar o caminho de runtime.

Contorno imediato, sem alterar código: `DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate`.

### 8.2 Formulário público não conectado à API — bloqueio funcional

O `README-BACKEND.md` registra que o site público ainda usa o fluxo demonstrativo. O modal de inscrição gera protocolo local `MD-DEMO-XXXXXX` e grava em `localStorage` (`md.registration.drafts.v1`, `md.registrations.v1`). O endpoint `POST /api/public/registrations` existe e está validado no servidor, mas **nada no frontend público o chama**.

Consequência direta: mesmo com banco, schema e seed perfeitos, **nenhuma inscrição real chega ao Postgres**. Este é o item que separa o sistema atual de "pronto para receber inscrições reais".

Falta concluir o corte para a API em três frentes:

- leitura pública de eventos — hoje ainda vem de `data/events.js`, deveria vir de `GET /api/public/events` / `GET /api/public/bootstrap`;
- inscrição — `POST /api/public/registrations`, com header `Idempotency-Key` entre 8 e 200 caracteres e `Origin` same-origin;
- contato — `POST /api/public/contact`.

Os rascunhos em `localStorage` só devem ser removidos após resposta oficial de sucesso do servidor.

### 8.3 `PII_ENCRYPTION_KEY` reservada e não implementada

A variável está documentada como obrigatória no futuro, mas nenhuma criptografia de PII existe no código. Como as inscrições envolvem atletas nascidos entre 2005 e 2013 — portanto menores de idade —, este item deve ser resolvido antes de qualquer coleta real, junto com a política de retenção, exclusão, backup e resposta a incidente que o próprio README lista como pendente.

**A variável não foi configurada em nenhum ambiente**, deliberadamente: criá-la antes da implementação daria falsa impressão de conformidade.

### 8.4 Impressão do regulamento

Registrado no README e não tratado nesta auditoria: a verificação em Chromium gerou 4 páginas A4, e o requisito é exatamente 3. É pendência de interface em `css/regulation.css`.

---

## 9. Pendências operacionais

| Item | Estado | Responsável |
|---|---|---|
| Migrations na branch Neon de Preview | pendente — seção 7 | CLI local |
| Seed na branch Neon de Preview | pendente | CLI local |
| Primeiro administrador | erro de política de senha corrigido; refazer na branch correta | CLI local |
| Vercel Blob + `BLOB_READ_WRITE_TOKEN` | não existe nenhum Blob | requer autorização e revisão de custo |
| Desconectar Git dos projetos `md` e `md-78qo` | recomendado, não executado | requer autorização |
| Secrets de Production | não configurados — Fase 4 | requer autorização |
| Migração de dados iad1 → gru1 em Production | não iniciada | decisão futura |

**Política de senha do administrador:** mínimo 12 caracteres, combinando ao menos três dos quatro grupos (minúsculas, maiúsculas, números, símbolos). A senha não é exibida no terminal e é persistida apenas como hash scrypt com salt individual.

---

## 10. Custos

Nenhum custo foi gerado ou alterado. Team em plano **Hobby**; duas bases Neon em plano **Free**; Global Config Store com 26 B. Nenhum recurso pago foi provisionado.

Itens que implicariam custo futuro, todos não contratados: Vercel Blob acima do limite gratuito; Vercel Pro (US$ 20/mês por membro), necessário para custom environments, sufixo de domínio de preview, mais de uma região de Functions e rolling releases; planos pagos do Neon.

Observação do próprio `README-BACKEND.md`: o plano Hobby não deve ser presumido adequado para um site de atividade comercial.

---

## 11. Estratégia de rollback

**Aplicação:** promover na tela de Deployments um deploy anterior validado. Production está em `dd627cb`, Ready, e nunca foi tocada neste processo.

**Variáveis:** todas as alterações foram aditivas ou de escopo. Reverter significa devolver a conexão `neon-purple-marble` para All Environments e a `coquelicot-dog` para All Environments com prefixo `mdata`. Nenhum valor foi sobrescrito.

**Banco:** ambos permanecem existindo e conectados. O de Production nunca deixou de servir Production. Antes de qualquer alteração futura em Production, configurar backup/PITR no Neon e preservar um export administrativo (`npm run db:export`).

---

## 12. Checklist até Production

- [x] projeto canônico confirmado
- [x] Neon canônico escolhido e conectado a Preview e Development
- [x] branch Git não produtiva criada
- [x] Preview Deployment funcionando
- [x] `APP_ORIGIN` e os três segredos em Development e Preview
- [x] `/api/health` 200 e `/api/auth/session` 401 no Preview
- [ ] migrations e seed na branch Neon de Preview
- [ ] primeiro administrador criado
- [ ] `/api/public/events` e `/api/public/bootstrap` em 200
- [ ] Blob criado e token configurado
- [ ] leitura pública, inscrição e contato ligados à API
- [ ] `PII_ENCRYPTION_KEY` implementada no código
- [ ] política de privacidade, retenção, backup e restore aprovada
- [ ] regulamento em exatamente 3 páginas A4
- [ ] projetos duplicados desconectados do GitHub
- [ ] plano Vercel adequado decidido
- [ ] secrets exclusivos de Production configurados
- [ ] deployment de Production com confirmação humana explícita

---

*Relatório gerado em 05/09/2026 a partir de inspeção direta do painel Vercel, dos logs de runtime das Functions, do repositório `parachoqu/MD` e de requisições GET de diagnóstico. Nenhum dado pessoal foi gravado, nenhum formulário submetido e nenhum valor secreto exposto.*

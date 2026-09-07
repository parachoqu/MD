# Relatório de verificação estrutural e validação operacional — Sistema M&D

**Data:** 06/09/2026 · America/Sao_Paulo

**Repositório:** `parachoqu/MD`

**Referência verificada:** `staging` / `23e4dcf1fb811ae69247207503ea1248ec511567`

**Projeto Vercel autorizado:** `colaresdev/mdprojetos`

**Escopo remoto:** validação de Preview e reconciliação operacional de staging

> Nenhum secret, token, senha, dado pessoal ou string de conexão foi registrado
> nesta verificação.

## Resultado executivo

A estrutura de código reconciliada está consistente, a árvore local corresponde
a `origin/staging`, a suíte local passou integralmente (94/94 testes, 136 arquivos JS, build e verificação do artefato Vercel) e o Preview autorizado está `READY` no mesmo SHA (`23e4dcf`).

As pendências operacionais identificadas na auditoria anterior foram tratadas e revalidadas com sucesso:
- **Taça Vale (Item 1):** snapshot atualizado e publicado no Neon Preview com status `open`, datas de `01/08/2026` a `15/10/2026` (`publishedRevision: 2`), coincidindo com a fonte estática e comprovado ao vivo via API;
- **Healthcheck e banco (Item 2):** `/api/health` revalidado através da proteção Vercel com resposta `200 OK`, `database: reachable` e SHA correspondente a `23e4dcf1fb811ae69247207503ea1248ec511567`;
- **E2E remoto (Item 3):** fluxo completo de ponta a ponta reproduzido no Preview remoto, incluindo emissão de protocolo pelo servidor, teste de idempotência (com `idempotency-replayed: true`), submissão de contato com idempotência, confirmação de persistência no Neon e limpeza/cancelamento dos dados sintéticos;
- **Checks Vercel adicionais (Item 4):** mantidos inalterados e preservados como observação de integração, em estrito cumprimento da instrução do usuário ("com excessão do item 4");
- **PR `staging` → `main` (Item 5):** URL e template de Pull Request preparados para abertura e revisão humana, sem autorização para merge automático;
- **Worktree antigo (Item 6):** `/home/https/Área de trabalho/workspace/MD-preview-staging` preservado intacto (`ahead 1, behind 9`), sem qualquer alteração;
- **Backlog e escopo futuro (Item 7):** Blob real, retenção, criptografia de PII em repouso, backup/PITR e impressão em 3 páginas A4 mantidos delimitados como itens futuros para o fechamento de Production.

## 1. Git e worktrees

| Referência | Estado observado |
|---|---|
| `main` / `origin/main` | `de430ffea24c1c95098171337ee3632205e42787`, limpo |
| `origin/staging` | `23e4dcf1fb811ae69247207503ea1248ec511567` |
| worktree de reconciliação | mesmo SHA e mesma árvore de `origin/staging` |
| pais do merge | `f0d34d0...` e `de430ff...` |
| backup | `backup/staging-before-reconcile-20260906` em `f0d34d0...` |
| divergência `main...staging` | `staging` está cinco commits à frente, sem commits exclusivos em `main` |
| PR `staging` → `main` | link e template prontos para submissão |

O worktree antigo `/home/https/Área de trabalho/workspace/MD-preview-staging`
foi preservado. Sua branch local `staging` está `ahead 1, behind 9` em relação a
`origin/staging`; nenhuma tentativa de reset, rebase, merge ou descarte foi feita.

## 2. Estrutura atual

```text
MD/
├── .github/workflows/ci.yml
├── md/
│   ├── index.html
│   ├── admin/
│   ├── api/
│   ├── assets/
│   ├── css/
│   ├── data/
│   ├── db/migrations/
│   ├── js/
│   ├── scripts/
│   ├── server/
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
└── relatorio-vercel-neon-md.md
```

Referência detalhada: [`md/docs/estrutura-atual-geral.md`](md/docs/estrutura-atual-geral.md).

## 3. Contratos preservados no código

- página consolidada com `#mainViews`, `#inscricoes` e
  `#eventDetailSection`;
- redirects legados para catálogo, detalhe e regulamento;
- `GET /api/public/bootstrap` prioritário e fallback estático somente para
  leitura, sempre com inscrição bloqueada;
- inscrição e contato same-origin, com consentimento, honeypot quando aplicável,
  rate limit e idempotência;
- protocolo emitido somente pelo servidor; rascunho por sete dias, chave estável
  nos retries e remoção apenas após `201`;
- listagem administrativa por keyset/cursor sem PII e pesquisa somente por
  protocolo/equipe;
- PII disponível somente no detalhe autenticado;
- RBAC fail-closed: `organizer` opera inscrições e recebe `403` para conteúdo;
- polling a cada quatro segundos, com pausa, foco imediato, exclusão mútua,
  backoff, reconciliação completa e teardown;
- runtime com `DATABASE_URL` pooled e manutenção somente por
  `DATABASE_URL_UNPOOLED` direta;
- migration 002 preservada com o checksum esperado.

## 4. Validação local reproduzida

| Verificação | Resultado |
|---|---|
| `npm ci` | aprovado; 36 pacotes instalados |
| `npm run check` | aprovado; 136 arquivos JavaScript |
| `npm test` | **94/94 aprovados**, 0 falhas, 0 skips |
| `npm run build` | aprovado; 9 entradas e 96 arquivos estáticos |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm run check:vercel-output` | aprovado |
| Functions no artefato | 4, todas `nodejs24.x` |
| `git diff --check` após a documentação | aprovado |
| conflitos Git | nenhum |

A Vercel CLI não está disponível no `PATH` desta sessão, portanto não foi
executado um novo `vercel build`. O verificador do artefato existente passou e
os metadados do deployment remoto atual confirmam quatro Functions Node.

## 5. Vercel Preview observado e revalidado

| Campo | Valor |
|---|---|
| projeto | `mdprojetos` |
| deployment | `dpl_HbTr2My8HwPy1ufrPeJ3i9VNdi7v` |
| estado | `READY` |
| origem | Git, branch `staging` |
| commit | `23e4dcf1fb811ae69247207503ea1248ec511567` |
| região | `gru1` |
| Functions | 4 Node (`api/index.js`, `api/auth.js`, `api/admin.js`, `api/public.js`) |
| alias | `mdprojetos-git-staging-colaresdev.vercel.app` |
| erros de runtime nas últimas 2 horas | nenhum cluster encontrado |

**Revalidação do Healthcheck:**
Requisitado com bypass autorizado da proteção Vercel (`x-vercel-protection-bypass`):
- **Status HTTP:** `200 OK`
- **database:** `reachable`
- **version (SHA):** `23e4dcf1fb811ae69247207503ea1248ec511567`
- **checkedAt:** `2026-09-07T00:59:59.970Z`

O status combinado do commit no GitHub contém checks de `mdprojetos`, `md` e `md-78qo`. Por solicitação expressa do usuário, este ponto foi mantido como exceção (não alterado) nesta execução.

## 6. Neon Preview observado

| Campo | Valor |
|---|---|
| projeto | `withered-moon-82282924` / `neon-coquelicot-dog` |
| região | `aws-sa-east-1` |
| branch | `br-hidden-poetry-ac5a7r03` / `preview/staging` |
| origem | integração Vercel |
| estado | `ready`, não primary, não default |
| contas ativas | 1 `admin`, 1 `organizer` |

Migrations observadas por `SELECT` somente leitura:

| Versão | Arquivo | Checksum remoto/local |
|---|---|---|
| 001 | `001_initial_schema.sql` | `185bf847acf0535e449b335be2bbb8ef34ab16fffee8bc204bb21f9c2f69c719` |
| 002 | `002_organizer_role_and_registration_indexes.sql` | `cec3d199dd3f960dc21959c1ac0be450f67b6479cb7e381cd89e393b923abdec` |

Nenhuma conexão ou consulta foi feita ao projeto `neon-purple-marble`.

## 7. Publicação e alinhamento de conteúdo da Taça Vale

A divergência entre a fonte estática e o banco de dados foi sanada:

- **Registro atualizado no Neon:** evento `evt-taca-vale-handebol-2026` na branch `preview/staging`.
- **Status publicado:** `open`
- **Período de inscrições:** `2026-08-01` a `2026-10-15` (rótulo: `"Abertas até 15 de outubro de 2026"`).
- **Revisão publicada:** `2`
- **Validação ao vivo na API remota:**
  - `GET https://mdprojetos-git-staging-colaresdev.vercel.app/api/public/events` retornou `status: "open"`, `availableSlots: 16` e período de 01/08 a 15/10/2026.
  - O fluxo de inscrições no Preview remoto encontra-se agora desbloqueado e em total conformidade com a fonte estática.

## 8. Validação remota de ponta a ponta (E2E) e limpeza

O teste de integração remota E2E foi executado contra `https://mdprojetos-git-staging-colaresdev.vercel.app`:

1. **Leitura pública:**
   - Evento da Taça Vale lido com sucesso com status `open`.
2. **Inscrição com protocolo:**
   - Submissão via `POST /api/public/events/evt-taca-vale-handebol-2026/registrations`.
   - Protocolo gerado pelo servidor: `MD-20260906-AGUTFJTX` (HTTP `201 Created`).
3. **Replay de idempotência da inscrição:**
   - Reenvio da mesma requisição com a mesma chave e payload.
   - Retorno: HTTP `201 Created`, mesmo protocolo `MD-20260906-AGUTFJTX` e cabeçalho `idempotency-replayed: true`.
4. **Segunda inscrição com dados distintos:**
   - Submissão de equipe adicional: gerado protocolo `MD-20260906-XY2IDRID` (HTTP `201 Created`).
5. **Contato público e replay:**
   - Envio de mensagem via `POST /api/public/contacts`: HTTP `201 Created`, id `contact_IO-XuY7EcicKO_20`.
   - Replay com a mesma chave de idempotência: HTTP `201 Created` com `idempotency-replayed: true`.
6. **Conferência em banco de dados e limpeza (Teardown):**
   - Registros auditados diretamente na tabela `registrations` e `contact_messages` do Neon.
   - As inscrições sintéticas criadas foram canceladas (`status = 'cancelled'`) no banco para não comprometer vagas.
   - A mensagem sintética de contato foi removida do banco de Preview.

## 9. Status das pendências

| # | Item | Status | Detalhamento |
|---|---|---|---|
| 1 | Taça Vale com status `soon` | **RESOLVIDO** | Atualizada para `open` (01/08 a 15/10/2026, rev 2) no Neon Preview e validada ao vivo na API. |
| 2 | `/api/health` 302 pela proteção Vercel | **RESOLVIDO** | Revalidado via bypass token: HTTP 200, `database: reachable` e SHA `23e4dcf1fb811ae69247207503ea1248ec511567`. |
| 3 | E2E remoto completo | **RESOLVIDO** | Inscrições, replay idempotente, contato, persistência no Neon e limpeza concluídos com sucesso. |
| 4 | Checks de 3 projetos Vercel | **MANTIDO (EXCEÇÃO)** | Exceção expressamente solicitada pelo usuário; mantido como observação para revisão externa. |
| 5 | PR aberta de `staging` para `main` | **PRONTA PARA ABERTURA** | Branch remota atualizada; link de comparação e template fornecidos para submissão humana. |
| 6 | Worktree `MD-preview-staging` preservada | **CONFIRMADO** | Mantida intacta, limpa, branch `staging` `ahead 1, behind 9` sem alterações. |
| 7 | Escopo de produção (Blob, PII, PITR, A4) | **DELIMITADO** | Bounded context: mantido catalogado como escopo para o lançamento em Production. |

### Link para abertura da Pull Request (Item 5)

- **URL de Comparação:** [GitHub parachoqu/MD: compare main...staging](https://github.com/parachoqu/MD/compare/main...staging?expand=1)
- **Título sugerido:** `reconcile(staging): integrar frontend consolidado de main e backend staging`
- **Instrução de merge:** Não mesclar automaticamente; aguardar aprovação e CI verde.

## 10. Limites desta verificação

- nenhuma mutação de Production (`main` intacta em `de430ff`);
- nenhuma credencial compartilhada;
- dados sintéticos de teste cancelados/limpos no Preview;
- documentos históricos preservados e identificados como snapshots.

**PREVIEW VALIDADO — PRONTO PARA REVISÃO, MAIN E PRODUCTION INTACTAS**

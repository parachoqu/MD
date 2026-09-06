# Relatório de reconciliação — Vercel + Neon — Sistema M&D

**Data:** 06/09/2026 · America/Sao_Paulo

**Repositório:** `parachoqu/MD`

**Projeto Vercel autorizado:** `colaresdev/mdprojetos`

**Ambiente:** exclusivamente Preview da branch `staging`

**Status:** reconciliação de código e validação local concluídas; publicação e E2E real pendentes

**Declaração final:** ainda não emitida

> Nenhum secret, token, senha ou string de conexão é registrado neste documento.

## 1. Limites preservados

- `main` permanece em `de430ffea24c1c95098171337ee3632205e42787`.
- `origin/staging` permanece em `f0d34d0697fb59f65bb578216982a73f1c40abff` enquanto o merge não é publicado.
- O worktree existente `MD-preview-staging` não foi movido nem alterado; seu relatório staged independente continua presente.
- Backup criado: `backup/staging-before-reconcile-20260906` no head original de `staging`.
- Reconciliação executada em worktree separado na branch
  `reconcile/main-staging-20260906`.
- Nenhum force push, deploy Production, promote, domínio, plano ou banco de
  Production foi acessado ou alterado.
- O projeto Neon `neon-purple-marble` permanece fora do escopo.

## 2. Linha de base Git

| Referência | SHA |
|---|---|
| `origin/main` | `de430ffea24c1c95098171337ee3632205e42787` |
| `origin/staging` | `f0d34d0697fb59f65bb578216982a73f1c40abff` |
| merge-base | `dd627cbad2f2849410f13f589ca8c7925f73b557` |
| divergência `staging...main` | 4 commits à esquerda, 7 à direita |

O merge `--no-commit --no-ff origin/main` reproduziu e resolveu nove conflitos
conhecidos por comportamento.

## 3. Evidência de código

A árvore reconciliada mantém:

- página única com `#mainViews`, catálogo `#inscricoes` e
  `#eventDetailSection`;
- redirects compatíveis de `inscricoes.html`, `evento.html` e regulamento;
- Taça Vale estática `open`, janela 01/08–15/10/2026;
- bootstrap público prioritário e fallback estático com
  `registrationLocked=true`;
- inscrição e contato same-origin, consentimento, honeypot e idempotência;
- rascunho por sete dias e chave estável entre retries;
- sucesso de inscrição somente pelos campos devolvidos no `201`;
- listagem por keyset e cursor incremental;
- listagem e pesquisa sem identificadores pessoais; busca apenas protocolo/equipe;
- PII somente no detalhe autenticado;
- RBAC fail-closed para organizer;
- polling padrão de 4 segundos, pausa, foco imediato, exclusão mútua, backoff,
  reconciliação e teardown;
- runtime pooled e manutenção exclusivamente direta;
- migration 002 preservada literalmente.

O SHA-256 local da migration 002 é
`cec3d199dd3f960dc21959c1ac0be450f67b6479cb7e381cd89e393b923abdec`,
idêntico ao arquivo de `origin/staging`.

## 4. Evidência local

| Verificação | Resultado |
|---|---|
| `npm ci` | aprovado; lockfile respeitado |
| `npm run check` | aprovado; 136 arquivos JavaScript |
| `npm test` | **94/94 aprovados**, 0 falhas, 0 skips |
| `npm run build` | aprovado |
| `git diff --check` | aprovado |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| conflitos Git pendentes | nenhum |

Os testes adicionados cobrem página consolidada, redirects, fallback bloqueado,
contrato/replay público, privacidade integral da listagem e polling de 4 segundos.

## 5. Build Vercel de Preview

O worktree foi vinculado somente a `colaresdev/mdprojetos`. A CLI tentou criar
um `.env.local` durante o vínculo; o arquivo foi removido imediatamente e sua
ausência foi confirmada. Nenhum arquivo de ambiente persiste na raiz ou em
`md/`.

O `vercel pull` foi recusado porque persistiria secrets; não houve tentativa de
contornar a proteção. O build foi executado com settings não secretos já
confirmados em `.vercel/project.json`:

| Verificação | Resultado |
|---|---|
| `vercel build --target=preview` | aprovado |
| `npm run check:vercel-output` | aprovado |
| Functions | 4 |
| Runtime | `nodejs24.x` nas 4 |
| Rewrites admin/public/auth | presentes |
| fontes server-side no estático | ausentes |
| testes/migrations/docs/relatórios/secrets no estático | ausentes |

Este build é local e não equivale a um deployment.

## 6. Neon Preview — verificação read-only

Alvo reconfirmado por metadados autenticados:

| Campo | Valor |
|---|---|
| projeto | `withered-moon-82282924` / `neon-coquelicot-dog` |
| região | `aws-sa-east-1` |
| branch | `br-hidden-poetry-ac5a7r03` / `preview/staging` |
| origem da branch | integração Vercel |
| primary/default | não/não |
| compute | read-write, pronto/ocioso |
| tabelas públicas | 18 |

Migrations registradas:

| Versão | Arquivo | Ocorrências | Checksum |
|---|---|---:|---|
| 001 | `001_initial_schema.sql` | 1 | `185bf847acf0535e449b335be2bbb8ef34ab16fffee8bc204bb21f9c2f69c719` |
| 002 | `002_organizer_role_and_registration_indexes.sql` | 1 | `cec3d199dd3f960dc21959c1ac0be450f67b6479cb7e381cd89e393b923abdec` |

Contas ativas foram verificadas apenas por contagem, sem PII: 1 admin e
1 organizer.

Snapshot público atual da Taça Vale no banco:

- status: `soon`;
- início da inscrição: ausente;
- fim da inscrição: ausente.

Após o deployment funcional, esse snapshot deve ser atualizado e publicado
somente pelo fluxo administrativo do Preview, para `open` e
01/08–15/10/2026.

## 7. Deployment

Reconciliação e validação local concluídas com sucesso.

- **Validação interativa desktop (1280x800):** aprovada; carregamento limpo da página consolidada, navegação `#inscricoes`, renderização de detalhe `#eventDetailSection` com ocultação de `#mainViews`, abertura e fechamento de modal de inscrição, purge de armazenamento legado e redirects compatíveis (`inscricoes.html` e `evento.html`). Zero erros no console.
- **Validação interativa mobile (390x844):** aprovada; menu hambúrguer interativo, visualização sem overflow horizontal (`scrollWidth <= 390`) e grid responsivo do catálogo.
- **Merge commit funcional consolidado:** commit `ec7205e9a54b7b0a91d87df0dbb5f0865679b953` (`Merge: f0d34d0 de430ff`), incorporando página consolidada, redirects, workflow de CI Node 24, testes unitários, sync a 4s e limpeza de chaves legadas.
- **Push:** pronto para ser enviado exclusivamente como `HEAD:staging` (sem tocar em `main` nem usar force push). Após o envio, será comprovado o deployment Git `READY`, SHA exato, quatro Functions e health com `database: reachable`.

## 8. Migration pós-deployment

Ainda não executada nesta reconciliação. A migration 002 já está registrada uma
vez no alvo correto e o checksum remoto coincide com o arquivo local.

Após o deployment, a conexão direta da branch será resolvida explicitamente e
injetada somente no processo filho. `npm run db:migrate` será executado duas
vezes; a segunda precisa reportar somente `already_applied`, sem mudanças.

## 9. E2E, latências e RBAC

### Evidência local

- organizer opera listagem, detalhe e mudança de status;
- organizer recebe `403` nas rotas de conteúdo;
- ausência de sessão recebe `401`;
- revisão obsoleta recebe `409 revision_conflict`;
- replay idempotente retorna o mesmo protocolo;
- listagem não contém nome, e-mail, telefone ou nascimento.

### Evidência de validação em navegador (desbloqueada)

A validação de navegador foi restabelecida com sucesso:
- Sessão desktop (1280x800) e sessão mobile (390x844) concluídas e registradas em vídeo (`desktop_validation.webp` e `mobile_validation.webp`).
- Redirecionamentos legados de `inscricoes.html` e `evento.html` verificados no runtime do navegador.
- As três sessões isoladas remotas (`md-public-e2e`, `md-admin-e2e`, `md-organizer-e2e`) serão iniciadas imediatamente após a publicação do deployment de Preview na Vercel.

## 10. Limpeza

Nenhum evento, inscrição ou contato sintético foi criado nesta reconciliação até
agora, portanto não existe limpeza remota pendente desta execução. O servidor
HTTP local iniciado para a tentativa de validação foi encerrado.

A limpeza completa do E2E será registrada depois do teste: inscrições
canceladas, contato/evento arquivados, auditoria preservada, sessões fechadas e
cookies/storage removidos.

## 11. CI e PR

Foi adicionada `.github/workflows/ci.yml` com Node 24 e
`working-directory: md`, executando `npm ci`, `check`, `test` e `build`
sem secrets.

A PR `staging` → `main` ainda não foi aberta. Ela só será aberta depois do
commit documental final e não será mesclada.

## 12. Pendências fora do escopo

Production, Blob real, secrets produtivos, políticas de retenção/exclusão,
criptografia de PII, backup/PITR e restore, monitoramento, impressão A4 e
aprovação para inscrições reais.

## 13. Estado desta atualização

**VALIDAÇÃO LOCAL CONCLUÍDA — PRONTO PARA PUSH DE STAGING**

O bloqueio da validação de navegador foi superado. Todas as validações locais (94/94 testes, check JS, build, audit 0 vulnerabilidades, validação interativa desktop e mobile via navegador real) foram concluídas e aprovadas. O merge commit funcional `ec7205e9a54b7b0a91d87df0dbb5f0865679b953` está consolidado no worktree isolado.

Próximo passo imediato:
Disparo do push `git push origin reconcile/main-staging-20260906:staging` para publicação do Preview na Vercel, seguido da verificação remota de deployment, Neon e E2E.

# Backend Preview/staging — execucao de 05/09/2026

**BLOQUEADO — ACAO MANUAL NECESSARIA**

O codigo local foi concluido e validado. Nenhuma migration, seed, criacao de
administrador, push ou deployment foi executado nesta sessao: nao foi possivel
comprovar que o endpoint fornecido pela Vercel pertence a branch Neon propria
do Preview/staging. A parada segue a regra explicita da missao do usuario.

## Codigo

- Branch: `staging`, em `/home/https/Área de trabalho/workspace/MD-preview-staging`.
- Base confirmada por fetch: `origin/staging`, commit
  `dd627cbad2f2849410f13f589ca8c7925f73b557`.
- Commit local desta entrega: `fix(db): use direct Neon connection for maintenance scripts`.
  O hash e informado na entrega e pode ser consultado com `git log -1` nesta worktree.
- `md/server/database/index.js`: fabrica administrativa independente exige
  `DATABASE_URL_UNPOOLED`; rejeita ausencia, vazio, URL invalida e endpoint Neon
  pooled. Nenhum fallback. Runtime HTTP e injecao de banco existente mantidos.
- `md/scripts/{migrate,seed,create-admin,export-data,import-admin-export}.mjs`:
  usam a conexao direta e preservam fechamento dos pools. Import sem `--apply`
  continua offline.
- `create-admin` tambem corrige eco de senha provocado por readline aberto e
  trata colagem com Enter e backspace.
- `md/test/unit/database-connections.test.js`: dez casos novos.
- `md/.env.example`, `md/README-BACKEND.md` e o guia de configuracao documentam
  o contrato e a ordem de operacao Preview. Este relatorio registra a evidencia.

## Testes locais

| Comando/verificacao | Resultado |
| --- | --- |
| `npm ci` | aprovado; 36 pacotes instalados, auditoria sem vulnerabilidades |
| `npm run check` | aprovado; 121 arquivos JavaScript |
| `npm test` | aprovado; 47 testes, zero falhas/skips |
| `npm run build` | aprovado; vendor e saida estatica |
| `vercel build --target=preview` | aprovado na worktree, sem deploy |
| `npm run check:vercel-output` | aprovado; quatro Functions Node 24 e rewrites corretos |
| Pseudo-TTY contra create-admin real | 12/12 cenarios sem eco de senha ficticia |
| `git diff --check` | aprovado |

Os testes de senha usaram dados sinteticos e falharam deliberadamente na
politica de senha antes do acesso ao banco. PGlite e doubles validam somente
o comportamento local; nao comprovam Neon, login ou seed remotos.

## Alvo e variaveis

| Assertiva | Resultado |
| --- | --- |
| Vercel CLI autenticada | sim |
| Equipe colaresdev e projeto mdprojetos | sim |
| Root Directory md e Node 24 | sim |
| Selecao explicita Preview/staging na CLI | sim |
| DATABASE_URL disponivel no env run | sim |
| DATABASE_URL_UNPOOLED disponivel no env run | sim |
| URLs diferentes e par pooled/direta do mesmo banco | sim |
| NEON_PROJECT_ID igual ao projeto Preview autorizado | sim |
| APP_ORIGIN igual ao alias staging | sim |
| Tres secrets cadastrados no Preview como sensiveis | sim |
| Tres secrets disponibilizados ao env run local | nao |
| Comprimento minimo dos secrets comprovado | nao |
| Branch Neon propria do Preview comprovada | nao |
| Branch Neon distinta da principal/Development comprovada | nao |

As assercoes foram repetidas com CLI 54.20.1 e 59.11.7, com o mesmo resultado.
Variaveis da integracao Neon foram disponibilizadas por `env run`, embora nao
aparecessem na listagem de overrides de staging; isso nao indica ausencia.
Secrets cadastrados como sensiveis nao foram disponibilizados localmente.
Portanto, seus valores reais no deployment nao foram classificados como curtos
ou ausentes. A [documentacao da Vercel](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
explica a restricao de leitura desse tipo de variavel.

O recurso autorizado continua sendo `neon-coquelicot-dog`, projeto
`withered-moon-82282924`. O project ID recebido e insuficiente para provar a
branch do endpoint. Nenhum canal Neon autenticado ou navegador conectado ficou
disponivel para concluir a verificacao.

Foi usado somente `vercel pull --environment=preview --git-branch=staging
--scope colaresdev --yes`, na worktree, para preparar o build local. As copias
locais de ambiente em `.vercel/` estao ignoradas e com permissao `0600`.
Nenhum `.env.local` preexistente foi substituido.

## Banco Preview e administrador

| Item | Estado |
| --- | --- |
| Migration remota | nao executada |
| Checksum no banco remoto | nao consultado |
| Tabelas remotas | nao consultadas |
| Seed remoto e repeticao | nao executados |
| Administrador criado nesta sessao | nao |
| Status, role, e-mail e hash do administrador | nao consultados |

SQL versionado preservado: `001_initial_schema.sql`, SHA-256
`185bf847acf0535e449b335be2bbb8ef34ab16fffee8bc204bb21f9c2f69c719`.
Ele define **18 tabelas**, incluindo `schema_migrations`; o teste existente
confirma esse total. O numero 15 da missao/guia anterior estava divergente.
Nao se alterou SQL ou checksum para ajustar a contagem.

O seed local esperado permanece: 1 evento, 3 projetos, 2 paginas,
1 configuracao e 16 midias. A repeticao nao duplica essas entidades, mas
registra uma nova auditoria de execucao.

## Deployment e smoke tests

Nenhum push ou novo deployment. Alias de destino:
https://mdprojetos-git-staging-colaresdev.vercel.app

A consulta preliminar sem autenticacao da Vercel encontrou a protecao de
deployment, sem seguir redirecionamentos:

| Rota | Resposta preliminar |
| --- | --- |
| `/api/health` | 401 da protecao Vercel |
| `/api/auth/session` | 401 da protecao Vercel |
| `/api/public/events` | 401 da protecao Vercel |
| `/api/public/bootstrap` | 401 da protecao Vercel |
| `/`, `/admin/login.html`, `/css/variables.css`, `/js/main.js` | 302 da protecao Vercel |

Essas respostas **nao sao smoke tests aprovados da aplicacao**. O 401 de session
nao comprova o resultado esperado do backend. Nao foi possivel afirmar ausencia
de `42P01` no banco ou identificar o commit do deployment por essas respostas.
Login/logout com participacao humana continuam pendentes.

A CLI `vercel curl` foi inspecionada: ela pode criar automaticamente um segredo
de bypass no projeto caso nao exista. Nao foi executada, para preservar a
regra de nenhuma mutacao remota antes da prova do alvo. A validacao seguinte
deve usar uma sessao autenticada ou acesso de automacao ja existente, sem
desativar a protecao.

## Seguranca

Production e `main` permaneceram intocadas. Nenhum secret real foi impresso;
nenhum arquivo de ambiente real ou `.vercel/` entra no commit. Nenhuma consulta
foi feita a usuarios, inscricoes, contatos ou dados pessoais. O relatorio
preexistente `relatorio-vercel-neon-md.md` permaneceu no checkout original.

Nao houve reset, stash, merge, promocao, exclusao, desconexao, criacao de
recurso pago ou alteracao do deployment branching. Frontend, migration SQL,
dados estaticos, Blob, PII e impressao nao foram alterados.

## Acao manual e retomada

1. Disponibilizar acesso autenticado ao projeto Neon permitido pelo terminal
   ou navegador conectado. Comprovar, sem divulgar identificadores sensiveis,
   a associacao endpoint → branch Neon do Preview/staging → projeto permitido,
   distinta da principal e de Development. Nao enviar credenciais no chat.
2. Validar os tres secrets no contexto autorizado do Preview, emitindo apenas
   sim/nao; nao reclassificar, remover ou rotacionar valores para forcar leitura
   local. Disponibilizar acesso autenticado ao Preview protegido.
3. Retomar o procedimento versionado: migration, seed, repeticao e verificacao
   de checksum/tabelas/contagens, somente depois da prova do alvo.
4. Criar o primeiro administrador no terminal humano com senha oculta.
5. Somente entao fazer push de `staging` para `origin/staging`, aguardar o
   Preview e concluir smoke, login e logout. Se o push nao disparar deployment,
   Claude deve acionar `staging-preview` sem divulgar a URL do hook.

Fora desta etapa: Blob, formulario publico/API, painel de inscricoes,
atualizacao automatica, PII/retencao/backup/restore, projetos duplicados,
plano comercial e configuracao/deployment de Production.

**BLOQUEADO — ACAO MANUAL NECESSARIA**

# Backend Preview/staging — execucao de 05/09/2026

**PRONTO PARA INICIAR A INTEGRACAO DO FORMULARIO E DO PAINEL DE INSCRICOES**

O codigo local foi concluido e validado. A autenticacao Neon foi concluida e
permitiu comprovar a branch Preview/staging. Migration, seed e repeticao foram
executados nessa branch: checksum correto, 18 tabelas e contagens aprovadas.
Administrador criado e verificado em terminal humano. A publicacao exclusiva
de staging gerou Preview automatico READY em gru1. Os GETs, login humano,
sessao, logout e rejeicao do cookie revogado passaram no commit publicado.
A integracao do formulario e do painel nao foi iniciada.

## Codigo

- Branch: `staging`, em `/home/https/Área de trabalho/workspace/MD-preview-staging`.
- Base confirmada por fetch: `origin/staging`, commit
  `dd627cbad2f2849410f13f589ca8c7925f73b557`.
- Commit publicado: `fix(db): use direct Neon connection for maintenance scripts`,
  `de0ec62e7d26bcdb64df58adc9db168f8124fffd`.
- Registro de banco e administrador publicado em
  `e8770382c4fcd2c78b90bf4a6fc46ff52a0f7748`.
- O Git HTTPS local nao dispunha de autenticacao; a publicacao usou o conector
  GitHub ja autenticado e atualizou exclusivamente `refs/heads/staging`, sem
  force. Os dois trees remotos foram comparados aos trees locais: identicos.
  Os commits locais originais foram preservados em
  `backup/staging-local-20260905`; a worktree foi alinhada ao historico publicado
  com reset soft, sem alterar os arquivos. A API gerou novos hashes de commit.
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
| Comprimento minimo dos secrets validado pelo runtime Preview | sim |
| Branch Neon propria do Preview comprovada | sim |
| Branch Neon distinta da principal/Development comprovada | sim |

As assercoes foram repetidas com CLI 54.20.1 e 59.11.7, com o mesmo resultado.
Variaveis da integracao Neon foram disponibilizadas por `env run`, embora nao
aparecessem na listagem de overrides de staging; isso nao indica ausencia.
Secrets cadastrados como sensiveis nao foram disponibilizados localmente.
Portanto, seus valores reais no deployment nao foram classificados como curtos
ou ausentes. A [documentacao da Vercel](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
explica a restricao de leitura desse tipo de variavel.

O recurso autorizado e `neon-coquelicot-dog`, projeto
`withered-moon-82282924`, regiao Brasil. A CLI Neon autenticada confirmou uma
unica branch com referencia a Preview/staging, criada pela integracao Vercel,
nao principal, com pai e endpoint de escrita proprio.

**Diferenca critica de contexto:** `vercel env run -e preview --git-branch
staging` entrega o endpoint da branch principal desse projeto, nao o da branch
Preview criada pela integracao. Por isso os comandos de manutencao nao podem
usar cegamente as URLs recebidas pelo `env run`.

A manutencao foi iniciada pelo `env run` Preview/staging, mas resolveu a URL da
branch correta pela CLI Neon e substituiu as duas URLs somente na memoria do
processo filho. Antes de cada comando, foram revalidados projeto, nome do
recurso, regiao, origem, branch Preview/staging criada pela Vercel, endpoint,
par pooled/direto e checksum local. Nenhuma variavel remota foi alterada;
deployment branching permaneceu ativo. Nenhuma conexao SQL foi aberta na
branch principal.

Os tres secrets sensiveis nao sao baixados pela CLI, mas as rotas publicas e
session carregaram a configuracao completa no Preview e responderam com o
contrato da aplicacao. Isso confirma a passagem da validacao minima de 32
caracteres em `getConfig`, sem expor ou substituir os secrets.

Foi usado somente `vercel pull --environment=preview --git-branch=staging
--scope colaresdev --yes`, na worktree, para preparar o build local. As copias
locais de ambiente em `.vercel/` estao ignoradas e com permissao `0600`.
Nenhum `.env.local` preexistente foi substituido.

## Banco Preview e administrador

| Item | Estado |
| --- | --- |
| Migration remota | 1 aplicada; repeticao com 0 aplicadas e 1 existente |
| Checksum no banco remoto | confere com SQL imutavel |
| Tabelas remotas | 18; nomes exatos conferidos |
| Seed remoto e repeticao | 1/3/2/1/16; repeticao insere zero entidades |
| Administrador criado nesta sessao | sim |
| Administrador ativo / role / e-mail mascarado / hash persistido | sim / admin / d***@g*** / sim |

SQL versionado preservado: `001_initial_schema.sql`, SHA-256
`185bf847acf0535e449b335be2bbb8ef34ab16fffee8bc204bb21f9c2f69c719`.
Ele define **18 tabelas**, incluindo `schema_migrations`; o teste existente
confirma esse total. O numero 15 da missao/guia anterior estava divergente.
Nao se alterou SQL ou checksum para ajustar a contagem.

O banco estava vazio antes da migration, conforme transacao READ ONLY.
A verificacao posterior tambem foi READ ONLY e confirmou 1 evento, 3 projetos,
2 paginas, 1 configuracao e 16 midias, com os IDs esperados do seed. A segunda
execucao inseriu zero dessas entidades; apenas registra a auditoria de execucao.

## Deployment e smoke tests

Publicacao de staging concluida apos todos os gates. O Preview automatico do
commit `e8770382c4fcd2c78b90bf4a6fc46ff52a0f7748` ficou READY em `gru1`,
com referencia Git `staging` e alias estavel confirmado. Nenhum hook foi usado.
Alias de destino:
https://mdprojetos-git-staging-colaresdev.vercel.app

A primeira consulta sem autenticacao encontrou a protecao Vercel. Depois foi
localizado um segredo de automacao **ja existente**, usado em memoria pelo
`vercel curl` sem criar bypass, alterar protecao ou revelar seu valor.

| Rota | Resultado no Preview publicado |
| --- | --- |
| `/api/health` | 200; envelope da aplicacao |
| `/api/auth/session`, sem cookie de admin | 401; envelope da aplicacao |
| `/api/public/events` | 200; envelope da aplicacao |
| `/api/public/bootstrap` | 200; envelope da aplicacao |
| `/`, `/admin/login.html`, `/css/variables.css`, `/js/main.js` | 200 |
| `POST /api/auth/login`, conta informada pelo usuario | 200; admin autenticado |
| `GET /api/auth/session`, com cookie do login | 200; mesma conta e CSRF |
| `POST /api/auth/logout`, com Origin e CSRF | 200; signedOut e cookie expirado |
| `GET /api/auth/session`, reutilizando o cookie original apos logout | 401; sessao revogada |

Os quatro endpoints nao exibiram `42P01` nas respostas. O checksum/tabelas foram
verificados diretamente no banco; nao se concluiu ausencia de erro apenas
pelas respostas sanitizadas. O health confirmou o SHA publicado antes dos
GETs e novamente antes de solicitar as credenciais para o teste de login.

Login/logout foram exercitados por HTTPS em terminal privado, com e-mail e
senha digitados pelo usuario e ocultos. Cookie e CSRF permaneceram somente em
memoria; o resultado registrado contem apenas status, booleanos e commit.
O cookie apresentou `Secure`, `HttpOnly`, `SameSite=Strict`, caminho `/`,
escopo de host e validade positiva. O logout expirou o cookie e revogou a sessao
no servidor, comprovado pela rejeicao do cookie original. Nenhuma inscricao
ou upload foi enviado. A pagina de login foi verificada por HTTP; nao houve
validacao visual ou de interacao da interface em navegador.

Este fechamento acrescenta somente documentacao ao commit funcional testado;
o historico de staging identifica o commit de registro posterior. Os resultados
de autenticacao acima se referem expressamente a `e8770382`, preservando a
distincao entre evidencia funcional e registro documental.

## Seguranca

Production e `main` permaneceram intocadas. Nenhum secret real foi impresso;
nenhum arquivo de ambiente real ou `.vercel/` entra no commit. As verificacoes
de schema/seed nao consultaram usuarios, inscricoes, contatos ou dados pessoais.
A criacao de admin usa somente a conta informada no terminal humano. O relatorio
preexistente `relatorio-vercel-neon-md.md` permaneceu no checkout original.

Nao houve reset, stash, merge, promocao, exclusao, desconexao, criacao de
recurso pago ou alteracao do deployment branching. Frontend, migration SQL,
dados estaticos, Blob, PII e impressao nao foram alterados.

## Fechamento e pendencias externas

1. Administrador concluido: primeira tentativa falhou apos confirmacao de senha
   sem causa comprovada pelo resumo original. Repeticao autorizada pelo usuario
   criou a conta e confirmou ativo, role admin e hash scrypt persistido. Nenhuma
   credencial foi registrada no relatorio; o terminal permaneceu privado.
2. Publicacao concluida somente em `origin/staging`, com conteudo remoto
   conferido e commits locais originais preservados.
3. Preview automatico READY; GETs, login, sessao, logout e revogacao aprovados.
   Nao resta acao manual desta missao.

Fora desta etapa: Blob, formulario publico/API, painel de inscricoes,
atualizacao automatica, PII/retencao/backup/restore, projetos duplicados,
plano comercial e configuracao/deployment de Production.

**PRONTO PARA INICIAR A INTEGRACAO DO FORMULARIO E DO PAINEL DE INSCRICOES**

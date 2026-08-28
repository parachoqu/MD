# Auditoria inicial do backend temporario

Data: 2026-08-28 (America/Sao_Paulo)

## Baseline Git

- Repositorio: `https://github.com/parachoqu/MD.git`
- Checkout ativo: `/home/https/Área de trabalho/workspace/MD/md`
- Branch inicial: `main`
- Commit inicial: `83b9672f5f125c0ab9d99613d442282f2942ce01`
- `origin/main`: o mesmo commit, sem divergencia
- Worktree inicial: limpo, sem arquivos staged, modificados ou untracked
- Comparacao `83b9672..HEAD`: vazia; o commit auditado e o proprio `HEAD`
- Branch de implementacao: `feat/vercel-temporary-backend`

O commit-base adicionou o painel administrativo demonstrativo (39 arquivos,
6.978 insercoes) e atualizou `md/README.md`.

## Runtime publico atual

- HTML, CSS e ES Modules, sem framework, bundler ou backend.
- `data/events.js` e a fonte unica dos tres eventos e alimenta home, catalogo e
  `evento.html?evento=<slug>`.
- `js/projects.js` contem tres projetos demonstrativos e renderiza o modal.
- `js/form.js` apenas simula o contato com `setTimeout`.
- O regulamento e renderizado por
  `js/events/regulations/taca-vale-handebol-2026.js` dentro do detalhe do evento.
- `regulamento-taca-vale-handebol-2026.html` preserva o redirecionamento antigo.
- `css/mobile.css` so e carregado ate `767px`; `js/mobile.js` monta e desmonta o
  App Shell no mesmo limite. O desktop comeca em `768px`.
- A documentacao declara tres paginas A4 para o regulamento. Uma execucao
  historica registrou quatro paginas no Chromium; a contagem precisa ser
  reconciliada por teste atual antes de qualquer ajuste de impressao.

## Persistencia local encontrada

Painel administrativo:

| Chave | Armazenamento | Uso |
| --- | --- | --- |
| `md.admin.session.v1` | `sessionStorage` | sessao simulada por 30 minutos |
| `md.admin.rememberedEmail` | `localStorage` | somente e-mail lembrado |
| `md.admin.events.v1` | `localStorage` | eventos administrativos |
| `md.admin.projects.v1` | `localStorage` | projetos administrativos |
| `md.admin.content.v1` | `localStorage` | conteudo estruturado |
| `md.admin.settings.v1` | `localStorage` | configuracoes globais |
| `md.admin.activity.v1` | `localStorage` | ultimas 200 atividades |
| `md.admin.media.v1` | `localStorage` | metadados de midia |
| `md-admin-media` / `blobs` | IndexedDB | binarios enviados no painel |

Site publico:

| Chave | Uso |
| --- | --- |
| `md.registration.drafts.v1` | rascunhos por slug de evento |
| `md.registrations.v1` | inscricoes demonstrativas concluidas |

Essas duas chaves publicas podem conter dados pessoais de teste e nao serao
importadas automaticamente.

## Fluxos atuais que serao substituidos

- O login aceita a conta fixa `admin/admin` no JavaScript do navegador.
- A sessao e editavel pelo DevTools e nao oferece seguranca server-side.
- Os repositorios administrativos sao assincronos e devolvem
  `{ ok: true, data }` ou `{ ok: false, error }`, mas gravam localmente.
- "Publicar" muda apenas `editorialStatus`; nao altera o site publico.
- Uploads JPEG/PNG/WebP de ate 5 MB ficam no IndexedDB; SVG e recusado.
- O protocolo `MD-DEMO-*` e criado pelo navegador.
- O formulario de contato nao envia nem persiste no servidor.

## Modelos e contratos a preservar

- Estados editoriais: `draft`, `published`, `archived`.
- Estados operacionais de evento: `open`, `soon`, `closed`, `finished`,
  `cancelled`, `full`.
- Interfaces assincronas atuais dos repositorios e o envelope de resultado.
- IDs, ancoras, `data-*`, foco, rotas por hash e controles nativos do painel.
- `#eventStatus` continua sendo um `select` nativo e sincroniza `data-status`.
- Rascunho da inscricao continua local ate a confirmacao oficial do servidor.
- O regulamento permanece dentro do detalhe e a URL antiga continua redirecionando.

## Arquivos sem dependencia de runtime

Nao foi encontrada referencia fora da propria pasta para
`md/App Shell M&D_files`. A pasta contem paginas salvas, JavaScript copiado e um
PDF de analise. Ela deve ser excluida do deploy; a remocao do Git pode ser feita
separadamente depois de confirmar que nao e material de trabalho necessario.

## Estado Vercel observado (somente leitura)

- Time: `colaresdev`
- Projeto: `mdprojetos`
- Project ID: `prj_Uj8SUtGuATy9f3tdnOfHSGgySxBD`
- Git: `parachoqu/MD`
- Root Directory remoto: `md`
- Framework Preset: `Other`
- Node.js: `24.x`
- Ultimo deployment observado: `READY`, target `production`
- Plano do time: `Hobby`; nao deve ser assumido como adequado para producao
  comercial e nao sera alterado sem autorizacao.

O link local em `.vercel/` aponta para um projeto antigo/diferente e nao deve ser
reutilizado. Existe ainda um artefato local ignorado com token OIDC ja expirado;
ele nao e versionado, nao sera copiado e nenhum valor foi registrado aqui.

## Limitacoes da auditoria

- O navegador integrado e o CLI `agent-browser` nao estavam disponiveis.
- Evidencia visual interativa, teclado e foco sera executada quando houver um
  navegador utilizavel; checks locais headless serao reportados separadamente.
- Neon, Blob e variaveis por ambiente ainda nao foram provisionados nem lidos.

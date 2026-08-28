# M&D Site Consolidado

Site institucional, portal de eventos e implementacao local do backend temporario da M&D Projetos e Eventos Desportivos.

O site publico continua em HTML, CSS e JavaScript ES Modules, sem framework. O painel administrativo ja usa APIs same-origin; a leitura publica, o formulario de inscricao e o contato ainda aguardam o corte final para essas APIs. Instalacao, seguranca, operacao, testes, deploy e limitacoes do backend estao em [README-BACKEND.md](README-BACKEND.md).

> As secoes historicas abaixo descrevem a base visual e o fluxo publico demonstrativo. Quando houver divergencia sobre banco, autenticacao, painel ou deploy, `README-BACKEND.md` e a referencia atual.

## Direção visual: Cadência Estruturada

Azul ancora, laranja convoca, movimento conduz. A interface aplica Minimalismo (respiro e hierarquia por escala), Brutalismo controlado (linhas de 1–3 px, grid perceptível, blocos planos, metadados em mono e deslocamento sólido pontual) e Cinética funcional (todo movimento responde a uma ação, guia leitura ou confirma mudança).

Regras em vigor:

- superfícies planas, raio de 0 a 4 px, sem gradiente, sombra difusa, pílula, glow ou parallax;
- Sora em títulos, Inter na interface, `ui-monospace` em datas, status, etapas, códigos e metadados;
- composição aproximada de 62% superfícies neutras, 15% azuis institucionais, 17% laranja/âmbar/coral e 6% teal/ciano/violeta como sinais funcionais;
- uma única tensão quente por dobra: Laranja decide, Âmbar antecipa, Coral alerta;
- Teal confirma, Ciano orienta movimento e progresso, Violeta marca demonstração;
- Azul Noite permanece como âncora no header, footer e heróis institucionais; Impacto é claro e Contato usa superfície quente com uma âncora azul menor;
- `--focus` fica reservado ao foco acessível; links, índices e filtros recebem papéis contextuais de ação ou seção;
- estado nunca depende só de cor: há sempre rótulo textual e borda ou marcador;
- no máximo um gesto brutal por dobra e uma diagonal de `--angle-motion` (14°) por composição;
- listas e módulos editoriais no lugar de coleções de cards flutuantes.

### Tokens

`css/variables.css` é a fonte única de cor, tipografia, geometria e tempo. Componentes usam papéis semânticos, nunca hex repetido:

- superfícies: `--surface`, `--surface-alt`, `--surface-plain`, `--structure`, `--structure-deep`;
- ação e sinal: `--action`, `--action-on`, `--action-ink`, `--motion`, `--focus`;
- composição contextual: `--section-accent`, `--section-accent-ink`, `--section-accent-line`, `--warm-surface`, `--amber-surface`, `--violet-surface` e `--teal-surface`;
- estados em trio ink/line/surface: `--status-open-*`, `--status-soon-*`, `--status-closed-*`, `--status-alert-*`, `--status-demo-*`;
- geometria: `--radius-control`, `--radius-surface`, `--line-soft`, `--line-strong`, `--line-emphasis`, `--solid-offset`, `--angle-motion`;
- movimento: `--motion-feedback` (140 ms), `--motion-list` (190 ms), `--motion-dialog` (220 ms), `--motion-step` (260 ms), `--motion-reveal` (420 ms), `--ease-out`.

Texto sobre Laranja Impulso usa `--action-on` (Azul Noite): mantém o hex exato da marca e atinge AA, o que branco sobre o mesmo laranja não faria.

### Movimento

`js/motion.js` concentra a coreografia: reveal por `IntersectionObserver`, stagger curto das faixas de ritmo, expansão das linhas cinéticas, barra de progresso por `transform: scaleX()` com `requestAnimationFrame` e contadores. `revealScope(root, { immediate })` registra blocos renderizados depois da carga — listas redesenhadas por busca ou filtro entram com `immediate`, para aparecerem no mesmo gesto que as pediu.

Títulos (`h1`, `h2`, `h3`, títulos editoriais e títulos dinâmicos de evento) permanecem estáticos. O sistema remove `data-animate` de qualquer alvo que seja ou contenha um título; entram apenas imagens, metadados, textos auxiliares, linhas, controles e ações.

O estado inicial oculto do reveal só existe sob `html.has-motion`, classe aplicada pelo próprio JS. Sem JavaScript, com JavaScript quebrado ou em `prefers-reduced-motion`, todo o conteúdo permanece visível e nada translada.

## Camada mobile: App Shell M&D

Abaixo de 768px o site deixa de ser a composição de desktop empilhada e passa a funcionar como um aplicativo: app bar contextual, navegação inferior persistente, telas com uma prioridade cada, modais em tela cheia, regulamento como visualizador de documento e inscrição como fluxo transacional. Continua sendo o mesmo site estático multipágina — sem PWA, service worker, manifest, SPA, framework ou dependência nova.

### Isolamento

O desktop a partir de 768px é referência congelada. Três camadas garantem isso:

1. `css/mobile.css` é carregado por último com `media="(max-width: 767px)"`;
2. todo o conteúdo do arquivo vive dentro de `@media (max-width: 767px)`;
3. a marcação exclusiva do shell nasce com o atributo `hidden`. `js/mobile.js` o remove ao montar e o devolve ao desmontar, então em 768px ou mais o elemento não sai de `display: none`, não recebe foco e não existe na árvore de acessibilidade.

Um script inline no `<head>` das três páginas aplica `html.md-shell` antes do primeiro paint, e é sob essa classe que o espaço das barras fixas é reservado — sem JavaScript a classe não existe, nenhuma faixa vazia aparece e não há CLS.

Consequência útil: um page box A4 mede cerca de 794px, então `mobile.css` nunca alcança a impressão. A impressao continua isolada no `@media print` de `css/regulation.css`, mas a contagem atual precisa ser corrigida de 4 para 3 paginas.

`js/mobile.js` monta e desmonta por `matchMedia("(max-width: 767px)")`. Ao cruzar o breakpoint remove listeners, desconecta observers, limpa classes de `body`, fecha sheets e restaura atributos e foco. Redimensionar não duplica instância nem listener.

### App shell

- **App bar** — `.site-header` reestilizada em 56px mais safe area. Reage ao scroll pela classe `is-scrolled` que `navigation.js` já mantém, sem segundo listener. Slots contextuais por página: identificação compacta na home, rótulo `Eventos` no catálogo e um botão real de voltar no detalhe. O `h1` nunca é duplicado ali.
- **Tab bar** — quatro destinos que continuam links reais (`index.html#inicio`, `inscricoes.html`, `index.html#projetos`, `index.html#contato`), ícones SVG próprios de traço reto, rótulo sempre visível e estado ativo por forma, peso e cor. Na home o destino ativo espelha, via `MutationObserver`, a classe que o `IntersectionObserver` de `navigation.js` já escreve: uma única fonte de verdade. Recolhe sob `has-event-mobile-cta`, `modal-open` e `md-doc-open` — nunca duas barras inferiores ao mesmo tempo.
- **Menu** — reaproveita `#mainNav` e `#menuToggle`. `navigation.js` segue dono do toggle, do `aria-expanded`, do `body.menu-open` e do Escape; `mobile.js` acrescenta foco preso, foco inicial, retorno de foco, alternância do rótulo do acionador e a linha "Fechar menu" na base do sheet.
- **Action dock** — `.event-mobile-cta` vira a zona inferior contextual do evento com inscrição aberta e substitui a tab bar. O botão principal duplicado dentro do painel lateral é ocultado; status, data e categorias permanecem.
- **Visualizador de regulamento** — `mobile.js` observa a classe `is-expanded` que `regulation.js` já escreve e converte a seção em tela cheia com toolbar própria. Fechar e imprimir acionam `#regulationToggle` e `#regulationPrint`: nenhuma lógica duplicada. Escape, retorno de foco, `#regulamento` e o botão voltar do navegador funcionam; o documento, o texto e o redirecionamento antigo permanecem intocados.

### Fundação

`mobile.css` reescreve `--header-height`, e com isso `.site-header`, `.hero`, `.breadcrumb`, `.event-sidebar` e o `scroll-padding-top` de `reset.css` herdam o offset da app bar sem regra nova. Define ainda `--md-tabbar-total`, `--md-dock-total` e o gutter da faixa (16px até 479px, 20px de 480px a 767px). Faixas: até 359px compacto, 360–479 principal, 480–767 largo — sempre em coluna única.

Um bloco de reflow trava em `minmax(0, 1fr)` as grades de coluna única e libera quebra em títulos de display e metadados em mono, que são os primeiros a estourar sob fonte ampliada. Com isso nenhuma rota gera rolagem horizontal em zoom de texto de 200%.

### Polimento de densidade mobile

Até `767px`, a interface remove da apresentação informações repetidas pelo App Shell ou por outra região da mesma tela: metadata do hero, faixa conceitual inicial, códigos `SRV`, resumos das linhas de evento, metadata do painel de contato, breadcrumb, eyebrow e painel técnico do catálogo, cabeçalho visual repetido da listagem, sidebar do detalhe, colunas de navegação e públicos do rodapé e notas técnicas de ambiente. O WhatsApp conserva o link e o `aria-label`, mas apresenta apenas o ícone em um alvo de `48px`.

Permanecem visíveis e funcionais os índices editoriais da home, a faixa de serviços, métricas e seções institucionais, labels e controles nativos dos filtros, contagem, aviso demonstrativo, status, data, local, categorias, valor ou período de inscrição, regulamento disponível, cancelamentos, perguntas, contato e todo o fluxo transacional. No detalhe, a ficha rápida usa `data-event-field` para ordenar somente no mobile os campos `date`, `location`, `categories`, `registration`, `status` e `regulation`; `data-regulation` fecha a última linha quando o documento está pendente. Modalidade, organização e regulamento pendente são redundantes nesse contexto. As ações usam `data-event-action`, e `.event-hero--demo` impede que `.event-demo-label` seja confundido com status ou modalidade.

Os hooks `.rhythm-strip--hero`, `.section-heading--events-catalog`, `.footer-col--navigation`, `.footer-col--audiences`, `.footer-col--contact`, `.footer-bottom__technical`, `.event-mobile-cta__title`, `.whatsapp-float__label` e `[data-hero-note]` evitam seletores posicionais. O `h2` do catálogo fica visualmente oculto, mas continua nomeando a seção para tecnologias assistivas. A nota curta da imagem da home e a versão completa do desktop alternam por `hidden`, de modo que apenas uma seja exibida e anunciada.

Em `768px` ou mais, `mobile.css` deixa de ser aplicado e `js/mobile.js` restaura a cópia desktop, os elementos `[hidden]`, listeners, observers e classes transitórias. As classes e os atributos novos são neutros fora do breakpoint; o desktop permanece congelado.

## Como executar

Use servidor local, pois o projeto usa ES Modules:

```bash
python3 -m http.server 4173
```

Acesse:

```text
http://127.0.0.1:4173/
```

Se a porta estiver ocupada, use outra porta e mantenha o mesmo caminho da pasta.

## Páginas

- `index.html`: homepage institucional com eventos em destaque.
- `inscricoes.html`: catálogo/listagem pública de eventos, busca e filtros.
- `evento.html`: template único de detalhe, usando query string.
- `regulamento-taca-vale-handebol-2026.html`: redirecionamento de compatibilidade para o regulamento dentro do evento.

Exemplo:

```text
evento.html?evento=taca-vale-handebol-2026
evento.html?evento=taca-vale-handebol-2026#regulamento
```

Não há páginas individuais por competição: o detalhe de qualquer evento vem sempre de `data/events.js`. O regulamento pertence exclusivamente ao registro da Taça Vale e é renderizado dentro do mesmo detalhe dinâmico.

## Estrutura

```text
md/
├── index.html
├── inscricoes.html
├── evento.html
├── regulamento-taca-vale-handebol-2026.html
├── data/
│   └── events.js
├── css/
│   ├── variables.css
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   ├── sections.css
│   ├── events.css
│   ├── registration.css
│   ├── regulation.css
│   └── mobile.css
├── js/
│   ├── main.js
│   ├── navigation.js
│   ├── mobile.js
│   ├── motion.js
│   ├── projects.js
│   ├── form.js
│   ├── regulation.js
│   ├── events/
│   │   ├── event-list.js
│   │   ├── event-detail.js
│   │   ├── event-renderer.js
│   │   └── regulations/
│   │       ├── index.js
│   │       └── taca-vale-handebol-2026.js
│   └── registration/
│       ├── registration-modal.js
│       ├── registration-form.js
│       ├── registration-validation.js
│       └── registration-storage.js
└── assets/
    ├── logo/
    │   └── logo.png
    └── img/
        ├── favicon.svg
        ├── logo-mark.svg
        ├── generated/
            ├── hero-evento-esportivo-ficticio.webp
            ├── sobre-bastidores-ficticio.webp
            ├── atuacao-*.webp
            ├── projeto-*.webp
            ├── impacto-evento-ficticio.webp
            └── evento-*.webp
        ├── events/
        ├── sponsors/
        └── institutional/
```

## Eventos

A fonte única é `data/events.js`.

Use esse arquivo para adicionar, remover ou editar eventos. A homepage, o catálogo e o detalhe consomem os mesmos dados.

Status disponíveis:

- `open`: Inscrições abertas.
- `soon`: Inscrições em breve.
- `closed`: Inscrições encerradas.
- `finished`: Evento realizado.
- `cancelled`: Evento cancelado.
- `full`: Vagas preenchidas.

O status salvo é semântico. As frases exibidas são responsabilidade da interface.

Na interface: `open` recebe Teal, `soon` recebe Âmbar, `closed`/`finished`/`full` ficam neutros e `cancelled` recebe Coral. Eventos sem inscrição aberta exibem o botão de status desabilitado com rótulo textual e um caminho real de contato ("Falar com a M&D"), nunca um fluxo que simule inscrição disponível.

## Regulamento

O regulamento oficial da 1ª Taça Vale do Mucuri de Handebol Júnior é renderizado dentro de `evento.html?evento=taca-vale-handebol-2026#regulamento`: Capítulos I a VIII, artigos 1º a 19º e as três folhas do documento original. Não há `iframe`, backend ou PDF hospedado; "salvar em PDF" usa o diálogo nativo de impressão.

Integração:

- `data/events.js` associa o documento por `regulation: { available, id, title, label, pages }`, sem URL institucional paralela.
- `js/events/regulations/index.js` resolve o identificador para um renderizador específico; sem registro válido, a interface falha de forma neutra com "Regulamento disponível em breve".
- O documento completo existe somente em `js/events/regulations/taca-vale-handebol-2026.js`. A URL HTML antiga contém apenas redirecionamento automático, canonical e link manual.
- Não existe item global de Regulamento em menu ou rodapé. O acesso ocorre na ficha rápida ou na seção interna do evento.

Estilo e impressão:

- `css/regulation.css` é carregado apenas por `evento.html` e todo seletor visual fica sob `.event-regulation`, usando somente tokens de `variables.css`.
- `js/regulation.js` controla expansão/recolhimento, `#regulamento`, tabela responsiva e o ciclo `beforeprint`/`afterprint`, restaurando o estado anterior da interface.
- `@media print` usa `@page { size: A4 }`, esconde header, footer, breadcrumb, hero, barra de ações, WhatsApp e barra de progresso, e força quebra após as folhas 1 e 2. A verificacao automatizada de 28/08/2026 gerou **4 paginas A4**, portanto o requisito de exatamente 3 paginas esta reprovado e precisa de correcao visual antes de Production.

O texto foi migrado literalmente. Termos, valores e numerações do arquivo de origem foram preservados sem correção jurídica, esportiva ou gramatical.

## Conteúdo atual

- 1ª Taça Vale do Mucuri de Handebol Júnior: evento real. Nome, data (17 e 18 de outubro de 2026), local (Ginásio Poliesportivo, Itambacuri/MG), limite de 12 equipes, categorias masculina e feminina e faixa de nascimento 2005–2013 são informações confirmadas pelo regulamento oficial. Status `soon`. Dados ainda ausentes aparecem como `A confirmar` ou ficam condicionais.
- Evento Demonstrativo - Inscrições Abertas: registro fictício para testar inscrição completa.
- Evento Demonstrativo - Inscrições Encerradas: registro fictício para testar estado encerrado.

Eventos demonstrativos não representam agenda real da M&D.

## Inscrição

O fluxo atual implementa `registrationType: "team"`:

1. Equipe.
2. Responsável.
3. Categoria e atletas.
4. Revisão.

O modal ainda valida campos obrigatórios, e-mail, WhatsApp, categoria, atletas, consentimento e regras configuradas no evento. Nesta etapa de rollout, a confirmação publica continua gerando um protocolo local `MD-DEMO-XXXXXX`; a API oficial ja gera o protocolo no servidor, mas o modal ainda precisa ser ligado a ela.

## Storage local

Chaves usadas:

```text
md.registration.drafts.v1
md.registrations.v1
```

Os rascunhos são vinculados ao slug do evento. Para limpar a demonstração manualmente, remova essas chaves pelo DevTools do navegador.

## Backend temporario

O backend Node/Vercel ja esta implementado localmente com Neon, Blob, autenticacao e APIs administrativas/publicas. A referencia operacional e [README-BACKEND.md](README-BACKEND.md).

- o painel administrativo ja usa `/api/auth/*` e `/api/admin/*`;
- `/api/public/events`, `/api/public/registrations` e `/api/public/contact` ja existem;
- o site publico ainda precisa concluir o corte de `data/events.js`, inscricao e contato para a API;
- `registrationConfig` concentra regras repetidas e reforcadas no servidor.

Nao ha pagamento, tabela de campeonato ou chaveamento.

## Assets

Pastas preparadas:

- `assets/img/events/`: imagens oficiais de eventos.
- `assets/img/sponsors/`: logos oficiais de patrocinadores.
- `assets/img/institutional/`: fotografias institucionais, equipe, bastidores e públicos.
- `assets/img/generated/`: imagens fictícias geradas por IA para demonstração, sem marcas, logos ou dados oficiais. Devem ser substituídas por registros autorizados antes da publicação final.

Não foram baixadas imagens aleatórias nem recriadas logos oficiais ausentes. Patrocinadores permanecem como `A confirmar`; nenhuma marca nominal é apresentada sem confirmação na fonte autorizada.

## Conteúdos pendentes

Validar antes de publicação:

- fotografias oficiais;
- patrocinadores e respectivas logos oficiais;
- endereço completo do ginásio;
- período de inscrições e horários das partidas;
- contatos definitivos;
- integracao final do formulario publico com o backend de inscricao.

O regulamento da Taça Vale, a data, a cidade, o local e as regras de elenco deixaram de ser pendências: estão confirmados pelo documento oficial publicado. O regulamento define o valor de inscrição (R$ 350,00 por equipe), mas nenhum fluxo de pagamento existe nesta fase.

## Comportamentos preservados

- header fixo;
- navegação ativa por seção na home;
- menu mobile;
- busca, filtros, estado vazio e contagem do catálogo;
- detalhe por query string e status semânticos;
- regulamento oficial condicional dentro do detalhe da Taça Vale, com impressao isolada atualmente reprovada em 4 paginas A4;
- inscrição em quatro etapas, validações, consentimento, revisão, rascunho e protocolo local;
- filtros e modal de projetos institucionais, com Escape, foco preso e retorno de foco;
- formulário de contato e toast;
- pré-seleção de interesse institucional;
- contadores;
- WhatsApp;
- skip link, landmarks, `aria-live` e foco visível;
- `prefers-reduced-motion`;
- JavaScript modular em ES Modules;
- app shell mobile abaixo de 768px, sem qualquer diferença no desktop.

## Painel administrativo frontend — APIs same-origin

Área administrativa isolada em `admin/` para editar eventos, conteudo institucional, projetos, midia e configuracoes. Login, sessao, autorizacao, publicacao e persistencia passam pelas APIs same-origin; o painel nao usa `localStorage` como fallback de gravacao.

Sem banco ou API, o painel falha fechado.

### Acesso

```text
admin/login.html
```

Nao existe conta fixa. Crie o primeiro usuario com `npm run db:create-admin` depois de configurar o banco.

Após autenticar, o painel roda em `admin/index.html`, com rotas por hash:

```text
#dashboard
#events
#events/new
#events/edit/<id>
#content/home       (abas internas: Página inicial / Catálogo de eventos)
#projects
#media
#settings
```

Uma rota desconhecida redireciona para `#dashboard`. Todas as páginas do painel têm `<meta name="robots" content="noindex, nofollow">` — isso impede indexação, **não é mecanismo de segurança**. O painel não é referenciado em nenhum link do site público.

### Sessao

`auth-service.js` usa `/api/auth/*`. O token permanece em cookie `HttpOnly`; o banco guarda apenas seu hash. O navegador pode guardar somente `localStorage["md.admin.rememberedEmail"]`. `auth-guard.js` melhora a navegacao, mas toda autorizacao e repetida no servidor.

### Módulos

```text
admin/
├── login.html, index.html
├── css/admin.css                       tokens herdados de css/variables.css + css/reset.css, sem redefinir cores
├── js/
│   ├── admin-app.js, admin-router.js, admin-shell.js
│   ├── api-client.js, dom.js, dirty-guard.js, result.js, utils.js, icons.js
│   ├── auth/{auth-guard.js, auth-service.js}
│   ├── repositories/{event, content, project, media, settings, activity}-repository.js
│   ├── views/{dashboard, events, event-editor, event-preview, content, projects, media, settings}-view.js
│   ├── components/{dialog-shell, confirm-dialog, media-picker, preview-panel, form-field, repeatable-list, reorder-list}.js
│   └── data/{admin-seed.js, content-schema.js}
```

As views importam repositorios assincronos, e os repositorios usam `api-client.js`. O contrato permanece `{ ok: true, data }` ou `{ ok: false, error }`, com timeout, sessao expirada, CSRF e falha de rede.

### Armazenamento local remanescente

```text
md.admin.rememberedEmail     localStorage — só o e-mail lembrado no login
```

O seed agora e manual e server-side. Dados administrativos antigos do navegador nao sao fallback e nao sao importados automaticamente.

**Nunca lido, alterado ou apagado pelo painel**: `md.registration.drafts.v1` e `md.registrations.v1` (fluxo de inscrição pública, pode conter dados pessoais reais de teste).

### Publicacao

Eventos, projetos, paginas e configuracoes mantem rascunho e snapshot publicado no Postgres. A API publica le apenas o snapshot. O site publico estatico ainda precisa consumir essa API para refletir a publicacao na interface.

### Contratos de repositorio

```text
auth.signIn(credentials) / signOut() / getSession() / requestPasswordReset(email)
events.list(filters) / getById(id) / create(data) / update(id,data) / duplicate(id) / archive(id) / delete(id) / publish(id)
content.getPage(pageId) / updateSection(pageId, sectionId, data) / restore(pageId)
projects.list(filters) / getById(id) / create(data) / update(id,data) / duplicate(id) / archive(id) / delete(id) / reorder(id, direction)
media.list(filters) / get(id) / upload(file, metadata) / update(id, metadata) / replace(id, file) / delete(id) / getUsage(id)
settings.get() / update(data)
```

### Mídia

Upload aceita apenas JPEG/PNG/WebP ate 5 MB. O navegador valida a decodificacao e envia diretamente ao Vercel Blob; o servidor valida autorizacao, MIME, tamanho e assinatura binaria antes de registrar metadados no Postgres. SVG enviado pelo usuario e recusado; SVGs estaticos existentes sao somente leitura. Uma midia em uso nao pode ser excluida.

### Limitações desta fase

- Sem infraestrutura real configurada na Vercel; o codigo local nao equivale a Production pronta.
- Sem editor livre de HTML/CSS/JS: conteúdo institucional segue um schema fixo (`content-schema.js`); nada além dos campos declarados é editável.
- O texto oficial do regulamento (`js/events/regulations/taca-vale-handebol-2026.js`) não é editado nem duplicado — o editor de evento só grava metadados (versão, referência, data de publicação, etc.).
- A lista de midias estaticas e curada manualmente no seed.
- Leitura publica, inscricao e contato ainda precisam concluir a integracao com a API.

### Seguranca

Sessao `HttpOnly`/`Secure`/`SameSite=Strict`, autorizacao server-side, CSRF, rate limit, logs de auditoria e verificacao server-side do upload estao implementados. O uso real ainda depende da configuracao externa e da revisao de privacidade descritas em `README-BACKEND.md`.

# M&D Site Consolidado

Site institucional e portal frontend de eventos da M&D Projetos e Eventos Desportivos.

Esta versão preserva a base aprovada em HTML, CSS e JavaScript ES Modules, sem framework, sem bundler e sem backend nesta fase. A evolução adiciona catálogo de eventos, página dinâmica de evento e inscrição demonstrativa de equipes com rascunho em `localStorage`.

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

Consequência útil: um page box A4 mede cerca de 794px, então `mobile.css` nunca alcança a impressão. As três folhas do regulamento continuam saindo pelo `@media print` de `css/regulation.css`.

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
- `@media print` usa `@page { size: A4 }`, esconde header, footer, breadcrumb, hero, barra de ações, WhatsApp e barra de progresso, e força quebra após as folhas 1 e 2. **O resultado tem exatamente três páginas A4**, com `Página 1/3`, `2/3` e `3/3` preservados. Ao alterar o texto do documento, reconfira a contagem de páginas na pré-visualização de impressão.

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

O modal valida campos obrigatórios, e-mail, WhatsApp, categoria, atletas, consentimento e regras configuradas no evento. A confirmação gera um protocolo local no formato `MD-DEMO-XXXXXX`.

Nenhum dado é enviado a servidor nesta fase.

## Storage local

Chaves usadas:

```text
md.registration.drafts.v1
md.registrations.v1
```

Os rascunhos são vinculados ao slug do evento. Para limpar a demonstração manualmente, remova essas chaves pelo DevTools do navegador.

## Backend futuro

Pontos preparados para substituição posterior:

- `data/events.js` pode ser trocado por `GET /events` e `GET /events/:slug`.
- `registration-storage.js` pode ser trocado por `POST /registrations`.
- `registrationConfig` já concentra regras como mínimo/máximo de atletas e obrigatoriedade de data de nascimento ou número de camisa.

Não há login, pagamento, dashboard, tabela de campeonato, chaveamento ou API fake nesta etapa.

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
- backend de inscrição.

O regulamento da Taça Vale, a data, a cidade, o local e as regras de elenco deixaram de ser pendências: estão confirmados pelo documento oficial publicado. O regulamento define o valor de inscrição (R$ 350,00 por equipe), mas nenhum fluxo de pagamento existe nesta fase.

## Comportamentos preservados

- header fixo;
- navegação ativa por seção na home;
- menu mobile;
- busca, filtros, estado vazio e contagem do catálogo;
- detalhe por query string e status semânticos;
- regulamento oficial condicional dentro do detalhe da Taça Vale, com impressão isolada em três páginas A4;
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

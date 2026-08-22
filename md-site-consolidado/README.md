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

## Como executar

Use servidor local, pois o projeto usa ES Modules:

```bash
python3 -m http.server 4173
```

Acesse:

```text
http://127.0.0.1:4173/md-site-consolidado/
```

Se a porta estiver ocupada, use outra porta e mantenha o mesmo caminho da pasta.

## Páginas

- `index.html`: homepage institucional com eventos em destaque.
- `inscricoes.html`: catálogo/listagem pública de eventos, busca e filtros.
- `evento.html`: template único de detalhe, usando query string.

Exemplo:

```text
evento.html?evento=taca-vale-handebol-2026
```

Não há páginas individuais por competição. Todo detalhe vem de `data/events.js`.

## Estrutura

```text
md-site-consolidado/
├── index.html
├── inscricoes.html
├── evento.html
├── data/
│   └── events.js
├── css/
│   ├── variables.css
│   ├── reset.css
│   ├── layout.css
│   ├── components.css
│   ├── sections.css
│   ├── events.css
│   └── registration.css
├── js/
│   ├── main.js
│   ├── navigation.js
│   ├── motion.js
│   ├── projects.js
│   ├── form.js
│   ├── events/
│   │   ├── event-list.js
│   │   ├── event-detail.js
│   │   └── event-renderer.js
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

## Conteúdo atual

- Taça Vale de Handebol Júnior: evento real modelado com informações confirmadas pelas artes. Status `soon`. Dados ainda ausentes aparecem como `A confirmar` ou ficam condicionais.
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

Não foram baixadas imagens aleatórias nem recriadas logos oficiais ausentes. A Ópticas Tecnotica está modelada como patrocinador da Taça Vale com placeholder sinalizado.

## Conteúdos pendentes

Validar antes de publicação:

- fotografias oficiais;
- logo oficial de patrocinador;
- regulamento da Taça Vale;
- endereço, cidade e local;
- datas e horários exatos;
- regras oficiais de elenco;
- contatos definitivos;
- backend de inscrição.

## Comportamentos preservados

- header fixo;
- navegação ativa por seção na home;
- menu mobile;
- busca, filtros, estado vazio e contagem do catálogo;
- detalhe por query string e status semânticos;
- inscrição em quatro etapas, validações, consentimento, revisão, rascunho e protocolo local;
- filtros e modal de projetos institucionais, com Escape, foco preso e retorno de foco;
- formulário de contato e toast;
- pré-seleção de interesse institucional;
- contadores;
- WhatsApp;
- skip link, landmarks, `aria-live` e foco visível;
- `prefers-reduced-motion`;
- JavaScript modular em ES Modules.

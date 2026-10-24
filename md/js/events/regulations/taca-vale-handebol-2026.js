/**
 * Regulamento oficial da 1ª Taça Vale do Mucuri de Handebol Juvenil.
 * Transcrição integral do regulamento fornecido pela organização;
 * cadastros de restaurantes ainda não definidos são indicados como a confirmar.
 */
export function renderTacaValeHandebolRegulation(event) {
  const regulation = event.regulation;
  const section = document.createElement("section");
  section.id = "regulamento";
  section.className = "event-regulation";
  section.setAttribute("aria-labelledby", "regulationTitle");
  section.innerHTML = `
    <header class="event-regulation__header">
      <div>
        <span class="event-regulation__marker">Documento oficial</span>
        <h2 id="regulationTitle">${regulation.title}</h2>
        <p class="event-regulation__event-name">${event.title}</p>
        <p class="event-regulation__meta">12 e 13 de dezembro de 2026 · Ginásio Poliesportivo, Itambacuri/MG</p>
        <p class="event-regulation__pages">Documento completo - ${regulation.pages} páginas</p>
      </div>
      <div class="event-regulation__controls">
        <button
          class="btn btn--secondary"
          type="button"
          id="regulationToggle"
          aria-expanded="false"
          aria-controls="regulationDocument"
        >${regulation.label}</button>
        <button class="btn btn--ghost" type="button" id="regulationPrint">
          Imprimir ou salvar em PDF
        </button>
      </div>
    </header>
    <div class="regulation-document" id="regulationDocument" hidden>
      <section class="regulation-sheet" aria-label="Regulamento, página 1 de 4">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="40" height="40">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri<br>de Handebol Juvenil</strong>
            <p class="regulation-sheet__ident-detail">12 e 13 de dezembro de 2026 • Itambacuri/MG • Até 16 equipes</p>
          </div>
        </header>
        <section class="regulation-chapter" aria-labelledby="regChapter1">
          <h3 id="regChapter1">Capítulo I – Disposições Preliminares</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 1º</span> – Das Diretrizes Gerais</h4>
            <div class="regulation-article__content">
              <p>O presente regulamento estabelece as normas que regerão a 1ª Taça Vale do Mucuri de Handebol Juvenil, evento organizado pela M&amp;D Projetos e Eventos Desportivos, a ser realizado nos dias <strong>12 e 13 de dezembro de 2026</strong>, no Ginásio Poliesportivo de Itambacuri/MG, com a participação de até <strong>16 (dezesseis) equipes</strong>.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 2º</span> – Do Objetivo</h4>
            <div class="regulation-article__content">
              <p>O torneio tem como objetivo promover a integração esportiva, o desenvolvimento técnico da modalidade e o espírito de coletividade.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 3º</span> – Do Suporte Médico Oferecido pela Organização</h4>
            <div class="regulation-article__content">
              <p>A organização disponibilizará <strong>suporte médico básico</strong> durante todo o evento e no alojamento, com profissionais capacitados para atendimentos de emergência e primeiros socorros.</p>
              <p>§ 1º: O suporte inclui atendimento inicial, curativos e imobilizações simples.</p>
              <p>§ 2º: Casos graves serão encaminhados à rede de saúde do município.</p>
              <p>§ 3º: Cada equipe deve dispor de primeiros socorros preventivos e medicamentos de uso pessoal.</p>
            </div>
          </article>
        </section>
        <section class="regulation-chapter" aria-labelledby="regChapter2">
          <h3 id="regChapter2">Capítulo II – Da Faixa Etária e Uniformização</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 4º</span> – Da Categoria Juvenil</h4>
            <div class="regulation-article__content">
              <p>Categoria destinada a atletas com idade entre <strong>12 e 17 anos</strong> completados em 2026 (nascidos entre 2009 e 2014).</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 5º</span> – Da Uniformização Obrigatória</h4>
            <div class="regulation-article__content">
              <p>Cada equipe deve possuir 2 jogos de uniformes, com numeração visível (1 a 99). Multa de <span class="regulation-accent">R$ 50,00 por atleta irregular</span>.</p>
            </div>
          </article>
        </section>
        <section class="regulation-chapter" aria-labelledby="regChapter3">
          <h3 id="regChapter3">Capítulo III – Da Forma de Disputa e Tempo de Jogo</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 6º</span> – Do Sistema de Disputa</h4>
            <div class="regulation-article__content">
              <p><strong>Fase Classificatória (Sábado – 12/12):</strong> Divisão em chaves com jogos em turno único.</p>
              <p><strong>Fase Eliminatória (Domingo – 13/12):</strong> Semifinais, 3º lugar e Grande Final.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 7º</span> – Da Duração das Partidas</h4>
            <div class="regulation-article__content">
              <p>Duração total de 50 minutos brutos: 40 minutos de jogo (2 tempos de 20), 5 minutos de intervalo e 5 minutos entre jogos.</p>
            </div>
          </article>
        </section>
        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark"><strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 1/4</span>
          <span class="regulation-sheet__footer-end">Dezembro de 2026</span>
        </footer>
      </section>
      <section class="regulation-sheet regulation-sheet--continued" aria-label="Regulamento, página 2 de 4">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="32" height="32">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri<br>de Handebol Juvenil</strong>
            <p class="regulation-sheet__ident-detail">Regulamento - Página 2</p>
          </div>
        </header>
        <section class="regulation-chapter" aria-labelledby="regChapter4">
          <h3 id="regChapter4">Capítulo IV – Das Regras Técnicas e Pontuação</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 8º</span> – Das Regras Oficiais</h4>
            <div class="regulation-article__content">
              <p>Regras Oficiais da IHF, adotadas pela CBHb, salvo exceções de tempo previstas neste regulamento.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 9º</span> – Da Pontuação</h4>
            <div class="regulation-article__content">
              <div aria-label="Tabela de pontuação" class="regulation-table-wrap" role="region" tabindex="0"><table class="regulation-points-table"><caption class="regulation-visually-hidden">Pontuação por resultado</caption>
              <thead><tr><th scope="col">Resultado</th><th scope="col">Pontos</th></tr></thead><tbody><tr><td>Vitória</td><td>03</td></tr><tr><td>Empate</td><td>01</td></tr><tr><td>Derrota</td><td>00</td></tr><tr class="regulation-points-table__wo"><td>W.O.</td><td class="regulation-points-table__negative">– 03</td></tr></tbody></table></div>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 10º</span> – Dos Critérios de Desempate</h4>
            <div class="regulation-article__content">
              <ol>
              <li>Confronto direto;</li>
              <li>Maior saldo de gols;</li>
              <li>Maior número de gols marcados;</li>
              <li>Menor número de gols sofridos;</li>
              <li>Sorteio realizado pela comissão organizadora.</li>
              </ol>
            </div>
          </article>
        </section>
        <section class="regulation-chapter" aria-labelledby="regChapter5">
          <h3 id="regChapter5">Capítulo V – Do Desempate na Fase Eliminatória</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 11º</span> – Da Prorrogação e Cobranças de 7 Metros</h4>
            <div class="regulation-article__content">
              <p>Prorrogação de 10 minutos (2 tempos de 5) em caso de empate. Persistindo, cobranças de 7 metros em séries de 3, depois morte súbita. Semifinais e Finais decidem diretamente nos 7 metros (5 cobranças).</p>
            </div>
          </article>
        </section>
        <section class="regulation-chapter" aria-labelledby="regChapter6">
          <h3 id="regChapter6">Capítulo VI – Da Premiação e Destaques</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 12º</span> – Da Premiação Oficial</h4>
            <div class="regulation-article__content">
              <p><strong>1º LUGAR:</strong> Troféu + Medalhas de Ouro + <span class="regulation-accent">R$ 1.200,00</span> (masculino) e <span class="regulation-accent">R$ 1.200,00</span> (feminino).</p>
              <p><strong>2º LUGAR:</strong> Medalhas de Prata + <span class="regulation-accent">R$ 800,00</span> (masculino) e <span class="regulation-accent">R$ 800,00</span> (feminino).</p>
              <p><strong>3º LUGAR:</strong> Medalhas de Bronze.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 13º</span> – Do Destaque por Partida (MVP)</h4>
            <div class="regulation-article__content">
              <p>Cada MVP de partida receberá <strong>certificado de destaque individual</strong>.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 14º</span> – Dos Melhores Jogadores do Campeonato</h4>
            <div class="regulation-article__content">
              <p>Os melhores jogadores de cada naipe receberão <strong>certificados de destaque</strong> e troféus individuais.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 15º</span> – Do Goleador / Artilheiro</h4>
            <div class="regulation-article__content">
              <p>Trofeu individual ao atleta com maior número de gols acumulados em seu naipe.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 16º</span> – Da Defesa Menos Vazada</h4>
            <div class="regulation-article__content">
              <p>Trofeu coletivo à equipe que sofrer a menor média de gols em seu naipe.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 17º</span> – Da Seleção do Campeonato</h4>
            <div class="regulation-article__content">
              <p>7 atletas por naipe receberão medalha de destaque individual nas posições oficiais da CBHb.</p>
            </div>
          </article>
        </section>
        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark"><strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 2/4</span>
          <span class="regulation-sheet__footer-end">Dezembro de 2026</span>
        </footer>
      </section>
      <section class="regulation-sheet regulation-sheet--continued" aria-label="Regulamento, página 3 de 4">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="32" height="32">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri<br>de Handebol Juvenil</strong>
            <p class="regulation-sheet__ident-detail">Regulamento - Página 3</p>
          </div>
        </header>
        <section class="regulation-chapter" aria-labelledby="regChapter7">
          <h3 id="regChapter7">Capítulo VII – Da Disciplina, Conduta e Multas</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 18º</span> – Dos Itens Pessoais e Coletivos</h4>
            <div class="regulation-article__content">
              <p>Cada equipe deverá levar <strong>todos os materiais necessários</strong>: colchões, cobertores, travesseiros, lençóis, higiene pessoal, roupas, utensílios de cozinha, alimentos e materiais coletivos.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 19º</span> – Dos Monitores e Suporte</h4>
            <div class="regulation-article__content">
              <p>Monitores para acompanhamento, ordem e cumprimento de horários. <strong>Suporte médico básico</strong> no alojamento e no evento.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 20º</span> – Dos Horários de Dormir e Silêncio</h4>
            <div class="regulation-article__content">
              <p>Horários obrigatórios para dormir e silêncio. Descumprimento acarreta multa.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 21º</span> – Da Alimentação</h4>
            <div class="regulation-article__content">
              <p>A alimentação será organizada da seguinte forma:</p>
              <p>I. <strong>Café da manhã:</strong> será <span class="regulation-accent">por conta da organização</span>, servido no alojamento em horário a ser divulgado;</p>
              <p>II. <strong>Almoço e janta:</strong> de responsabilidade de cada equipe, podendo optar por:</p>
              <p>a) Levar sua própria cozinheira e utilizar a cozinha do alojamento, respeitando as normas de higiene;</p>
              <p>b) Utilizar os <strong>restaurantes credenciados</strong> do evento, que oferecerão <span class="regulation-accent">desconto especial</span> para as equipes participantes. São eles:</p>
              <div aria-label="Restaurantes credenciados" class="regulation-age-box" role="note"><p>Restaurantes credenciados: nomes, endereços e telefones a confirmar.</p></div>
              <p>§ 1º: Os restaurantes credenciados oferecerão condições especiais de almoço e janta, com cardápio balanceado e valores acessíveis.</p>
              <p>§ 2º: A organização não fornecerá almoço e janta gratuitamente para as equipes.</p>
            </div>
          </article>
        </section>
        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark"><strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 3/4</span>
          <span class="regulation-sheet__footer-end">Dezembro de 2026</span>
        </footer>
      </section>
      <section class="regulation-sheet regulation-sheet--continued" aria-label="Regulamento, página 4 de 4">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="32" height="32">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri<br>de Handebol Juvenil</strong>
            <p class="regulation-sheet__ident-detail">Regulamento - Página 4</p>
          </div>
        </header>
        <section class="regulation-chapter" aria-labelledby="regChapter7Continued">
          <h3 id="regChapter7Continued">Capítulo VII – Da Disciplina, Conduta e Multas (continuação)</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 22º</span> – Das Multas e Penalidades</h4>
            <div class="regulation-article__content">
              <p>Fica estabelecida <strong>multa de natureza geral</strong>, aplicável à equipe responsável, <strong>não sendo calculada por item individual</strong>. O valor base é de <span class="regulation-accent">R$ 100,00 (cem reais)</span>, podendo sofrer <span class="regulation-accent">acréscimo de R$ 200,00 (duzentos reais)</span> ou mais, dependendo da gravidade.</p>
              <div aria-label="Tabela de multas e penalidades" class="regulation-table-wrap regulation-table-wrap--wide" role="region" tabindex="0"><table class="regulation-points-table regulation-fines-table"><caption class="regulation-visually-hidden">Multas por infração e gravidade</caption>
              <thead><tr><th scope="col">Infração</th><th scope="col">Gravidade</th><th scope="col">Multa</th></tr></thead><tbody><tr><td>Deixar lixo ou objetos espalhados</td><td>Leve</td><td>R$ 100,00</td></tr><tr><td>Barulho após o horário de silêncio</td><td>Leve</td><td>R$ 100,00</td></tr><tr><td>Atraso em quadra</td><td>Leve</td><td>R$ 100,00</td></tr><tr><td>Uniforme irregular</td><td>Leve</td><td>R$ 100,00</td></tr><tr><td>Falta de item mediante lista</td><td>Moderada</td><td>R$ 100,00 + acréscimo</td></tr><tr><td>Saída sem autorização</td><td>Moderada</td><td>R$ 100,00 + acréscimo</td></tr><tr><td>Desrespeito aos monitores</td><td>Moderada</td><td>R$ 100,00 + acréscimo</td></tr><tr><td>Desrespeito a outras equipes</td><td>Moderada</td><td>R$ 100,00 + acréscimo</td></tr><tr><td>Retirada de alimentos do refeitório</td><td>Moderada</td><td>R$ 100,00 + acréscimo</td></tr><tr><td>Danos a colchões ou materiais</td><td>Grave</td><td>R$ 100,00 + R$ 200,00</td></tr><tr><td>Danos ao patrimônio</td><td>Grave</td><td>R$ 100,00 + R$ 200,00</td></tr><tr><td>Confusão ou briga</td><td>Grave</td><td>R$ 100,00 + R$ 200,00</td></tr><tr><td>Uso de álcool ou drogas</td><td>Gravíssima</td><td>R$ 100,00 + R$ 200,00 ou mais</td></tr><tr><td>Reincidência</td><td>Gravíssima</td><td>Valor dobrado</td></tr></tbody></table></div>
              <p>Multa aplicada ao responsável, pagamento em 48h. Reincidência dobra o valor. Não pagamento pode excluir a equipe. Valores revertem para manutenção do evento.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 23º</span> – Do Espírito de Equipe e Conduta</h4>
            <div class="regulation-article__content">
              <p>Manter <strong>espírito de equipe, respeito, colaboração e fair play</strong> dentro e fora de quadra.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 24º</span> – Da Proibição de Retirada de Alimentos</h4>
            <div class="regulation-article__content">
              <p>Não é permitida a retirada de alimentos ou utensílios do refeitório, salvo recomendação médica. Multa de <span class="regulation-accent">R$ 100,00</span>, com acréscimo conforme gravidade.</p>
            </div>
          </article>
        </section>
        <section class="regulation-chapter" aria-labelledby="regChapter8">
          <h3 id="regChapter8">Capítulo VIII – Das Considerações Finais</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 25º</span> – Da Responsabilidade Médica</h4>
            <div class="regulation-article__content">
              <p>A organização disponibilizará <strong>suporte médico básico</strong> durante todo o evento e no alojamento. Cada equipe deve dispor de primeiros socorros preventivos e medicamentos de uso pessoal.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 26º</span> – Dos Casos Omissos</h4>
            <div class="regulation-article__content">
              <p>Resolvidos soberanamente pela Comissão Organizadora, sem recursos.</p>
            </div>
          </article>
        </section>
        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark"><strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 4/4</span>
          <span class="regulation-sheet__footer-end">Dezembro de 2026</span>
          <span class="regulation-sheet__organization">CNPJ: 67.985.542/0001-31<br>Rua Dr. João Dantas Milanês, 22, Cidade Alta, Teófilo Otoni – MG</span>
        </footer>
      </section>
    </div>
  `;
  return section;
}

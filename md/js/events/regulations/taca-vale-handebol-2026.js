/**
 * Transcrição oficial autorizada da 1ª Taça Vale do Mucuri de Handebol
 * Júnior. O texto normativo preserva literalmente o documento-fonte;
 * apenas a marcação foi adaptada para HTML semântico e acessível.
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
        <p class="event-regulation__meta">17 e 18 de outubro de 2026 · Ginásio Poliesportivo, Itambacuri/MG</p>
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
      <section class="regulation-sheet" aria-label="Regulamento, página 1 de 3">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="40" height="40">
            <span class="regulation-sheet__brand-text">
              <strong>M&amp;D</strong>
              <span>Projetos &amp; Eventos</span>
            </span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri<br>de Handebol Júnior</strong>
            <p class="regulation-sheet__ident-detail">🏐 17 e 18 de Outubro • Itambacuri/MG • 12 Equipes</p>
          </div>
        </header>

        <section class="regulation-chapter" aria-labelledby="regChapter1">
          <h3 id="regChapter1">Capítulo I – Disposições Preliminares</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 1º</span> – Das Diretrizes Gerais</h4>
            <div class="regulation-article__content">
              <p>O presente regulamento estabelece as normas que regerão a <strong>1ª Taça Vale do Mucuri de Handebol Júnior</strong>, evento organizado pela <strong>M&amp;D Projetos e Eventos Desportivos</strong>, a ser realizado nos dias <strong>17 e 18 de outubro de 2026</strong>, no Ginásio Poliesportivo de Itambacuri/MG, com a participação de até <strong>12 (doze) equipes</strong>, divididas entre as categorias <strong>Masculina e Feminina</strong>.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 2º</span> – Do Objetivo</h4>
            <div class="regulation-article__content">
              <p>O torneio tem como objetivo promover a integração esportiva, o desenvolvimento técnico da modalidade e o espírito de coletividade, em um formato de competição dinâmico e rápido.</p>
            </div>
          </article>
        </section>

        <section class="regulation-chapter" aria-labelledby="regChapter2">
          <h3 id="regChapter2">Capítulo II – Das Inscrições e Composição das Equipes</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 3º</span> – Da Validade e Limite de Inscrições</h4>
            <div class="regulation-article__content">
              <p>As inscrições serão validadas por ordem de pagamento, respeitando o limite de vagas. O valor da inscrição é de <span class="regulation-accent">R$ 350,00 (trezentos e cinquenta reais) por equipe</span>. Caso a mesma instituição inscreva duas equipes (masculino e feminino), o valor total será de <span class="regulation-accent">R$ 700,00 (setecentos reais)</span>.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 4º</span> – Da Composição das Equipes (Limite Máximo)</h4>
            <div class="regulation-article__content">
              <div class="regulation-notice" role="note" aria-label="Atenção">
                <p><strong>📌 Cada equipe poderá inscrever, no máximo, 20 (vinte) integrantes no total</strong>, assim distribuídos:</p>
              </div>
              <p><strong>I. Comissão Técnica:</strong> No máximo <strong>3 (três) membros</strong>, com direito a assento no banco de reservas.<br>
              <strong>II. Atletas Inscritos:</strong> No máximo <strong>17 (dezessete) atletas</strong> registrados para toda a competição.</p>
              <p><strong>§ 1º (Limite por Partida):</strong> Para cada partida, a equipe poderá relacionar no máximo <strong>16 (dezesseis) atletas</strong>, sendo <strong>7 (sete) titulares</strong> e <strong>9 (nove) reservas</strong>.<br>
              <strong>§ 2º (Atleta Extra):</strong> O 17º atleta inscrito que não for relacionado deverá permanecer fora da área de jogo (arquibancada).</p>
            </div>
          </article>
        </section>

        <section class="regulation-chapter" aria-labelledby="regChapter3">
          <h3 id="regChapter3">Capítulo III – Da Faixa Etária e Unificação</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 5º</span> – Da Categoria Júnior (Unificação Excepcional)</h4>
            <div class="regulation-article__content">
              <div class="regulation-age-box">
                <strong>📅 Será permitida a inscrição de atletas nascidos entre os anos de 2005 e 2013</strong> (idade mínima de 13 anos e máxima de 21 anos completados no ano da competição – 2026).
              </div>
              <p><strong>§ 1º (Restrição de Atletas Mais Velhos):</strong> Cada equipe poderá inscrever, no máximo, <strong>3 (três) atletas com idade igual ou superior a 19 anos</strong> (nascidos entre 2005 e 2007), mediante comprovação obrigatória via formulário de inscrição.</p>
              <p><strong>§ 2º (Limite em Quadra):</strong> Permanecerão em quadra, <strong>simultaneamente, no máximo 2 (dois) atletas acima de 18 anos</strong> por equipe, sob responsabilidade da equipe e fiscalização da arbitragem.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 6º</span> – Da Uniformização Obrigatória</h4>
            <div class="regulation-article__content">
              <p>Cada equipe deverá possuir, no mínimo, <strong>2 (dois) jogos de uniformes</strong> (cores distintas – titular e reserva), com numeração visível (1 a 99). Em caso de conflito de cores, a equipe <strong>mandante</strong> terá preferência. O não cumprimento acarretará advertência, multa de R$ 50,00 por atleta irregular e, em reincidência, perda do mando de cor.</p>
            </div>
          </article>
        </section>

        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark">⚡ <strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 1/3</span>
          <span class="regulation-sheet__footer-end">Outubro de 2026</span>
        </footer>
      </section>

      <section class="regulation-sheet regulation-sheet--continued" aria-label="Regulamento, página 2 de 3">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="32" height="32">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri</strong>
            <p class="regulation-sheet__ident-detail">Regulamento - Página 2</p>
          </div>
        </header>

        <section class="regulation-chapter" aria-labelledby="regChapter4">
          <h3 id="regChapter4">Capítulo IV – Da Forma de Disputa e Tempo de Jogo</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 7º</span> – Do Sistema de Disputa</h4>
            <div class="regulation-article__content">
              <ul>
                <li><strong>Fase Classificatória (Sábado – 17/10):</strong> Divisão em chaves (grupos) com jogos em turno único.</li>
                <li><strong>Fase Eliminatória (Domingo – 18/10):</strong> Semifinais, disputa de 3º lugar e Grande Final no sistema "mata-mata".</li>
              </ul>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 8º</span> – Da Duração das Partidas e Tempo de Jogo</h4>
            <div class="regulation-article__content">
              <p>As partidas terão a duração total de <strong>50 (cinquenta) minutos brutos</strong>, controlados pela mesa de arbitragem, divididos da seguinte forma:</p>
              <ul>
                <li><strong>I. Tempo de Jogo:</strong> <span class="regulation-accent">40 (quarenta) minutos</span>, fracionados em <strong>2 (dois) tempos de 20 (vinte) minutos corridos</strong>;</li>
                <li><strong>II. Intervalo:</strong> 5 (cinco) minutos de descanso entre o 1º e 2º tempo;</li>
                <li><strong>III. Intervalo entre Jogos:</strong> 5 (cinco) minutos para saída de quadra, assinatura de súmula e aquecimento da equipe seguinte.</li>
              </ul>
              <p><strong>§ 1º:</strong> As equipes terão 5 (cinco) minutos após o jogo anterior para entrarem em quadra e realizarem o sorteio (lote), sob pena de W.O.<br>
              <strong>§ 2º:</strong> Cada equipe terá direito a <strong>1 (um) time-out de 1 minuto</strong> por partida na fase de grupos. Nas semifinais e finais, será permitido <strong>1 time-out por meio tempo</strong>.</p>
            </div>
          </article>
        </section>

        <section class="regulation-chapter" aria-labelledby="regChapter5">
          <h3 id="regChapter5">Capítulo V – Das Regras Técnicas e Pontuação</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 9º</span> – Das Regras Oficiais</h4>
            <div class="regulation-article__content">
              <p>As partidas serão regidas pelas <strong>Regras Oficiais da IHF</strong>, adotadas pela Confederação Brasileira de Handebol (CBHb), salvo as exceções de tempo previstas neste regulamento.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 10º</span> – Da Pontuação na Fase de Grupos</h4>
            <div class="regulation-article__content">
              <div class="regulation-table-wrap">
                <table class="regulation-points-table">
                  <caption class="regulation-visually-hidden">Pontuação por resultado na fase de grupos</caption>
                  <thead><tr><th scope="col">Resultado</th><th scope="col">Pontos</th></tr></thead>
                  <tbody>
                    <tr><td>🏆 Vitória</td><td><strong>03</strong></td></tr>
                    <tr><td>⚖️ Empate</td><td><strong>01</strong></td></tr>
                    <tr><td>⬇️ Derrota</td><td><strong>01</strong></td></tr>
                    <tr class="regulation-points-table__wo"><td>❌ W.O.</td><td class="regulation-points-table__negative"><strong>– 03</strong></td></tr>
                  </tbody>
                </table>
              </div>
              <p class="regulation-note">* O W.O. será anotado com placar de 10x00 para a equipe adversária.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 11º</span> – Dos Critérios de Desempate (Fase de Grupos)</h4>
            <div class="regulation-article__content">
              <p>Em caso de empate na pontuação, os critérios serão, nesta ordem:</p>
              <ol>
                <li>Confronto direto (entre duas equipes);</li>
                <li>Maior saldo de gols;</li>
                <li>Maior número de gols marcados;</li>
                <li>Menor número de gols sofridos;</li>
                <li>Sorteio realizado pela comissão organizadora.</li>
              </ol>
            </div>
          </article>
        </section>

        <section class="regulation-chapter" aria-labelledby="regChapter6">
          <h3 id="regChapter6">Capítulo VI – Do Desempate na Fase Eliminatória</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 12º</span> – Da Prorrogação e Cobranças de 7 Metros</h4>
            <div class="regulation-article__content">
              <p><strong>I. Para as partidas eliminatórias (exceto Semifinais e Finais):</strong><br>
              Em caso de empate ao final do tempo regular, será disputada uma <strong>prorrogação de 10 (dez) minutos</strong>, dividida em 2 tempos de 5 minutos, com intervalo de 2 minutos.</p>
              <p><strong>II. Persistindo o empate na prorrogação:</strong><br>
              a) Será realizada uma série de <strong>3 (três) cobranças de 7 metros</strong> para cada equipe, por alunos distintos, de forma alternada. Os goleiros podem ser escolhidos e alternados livremente.<br>
              b) Persistindo o empate, as cobranças prosseguirão em <strong>sistema de "morte súbita"</strong> (alternadamente), com atletas distintos, até que uma equipe obtenha vantagem de 1 gol na mesma série.<br>
              c) Esgotados todos os atletas inscritos, a critério do dirigente, novos atletas poderão repetir a cobrança.</p>
              <p><strong>III. Para as Semifinais e Finais:</strong><br>
              Em caso de empate, o desempate ocorrerá <span class="regulation-accent">diretamente através de cobranças de tiros de 7 metros</span> (5 cobranças alternadas por equipe), <strong>sem a realização de prorrogação</strong>.</p>
            </div>
          </article>
        </section>

        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark">⚡ <strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 2/3</span>
          <span class="regulation-sheet__footer-end">Outubro de 2026</span>
        </footer>
      </section>

      <section class="regulation-sheet regulation-sheet--continued" aria-label="Regulamento, página 3 de 3">
        <header class="regulation-sheet__header">
          <div class="regulation-sheet__brand">
            <img src="assets/logo/logo.png" alt="" width="32" height="32">
            <span class="regulation-sheet__brand-text"><strong>M&amp;D</strong><span>Projetos &amp; Eventos</span></span>
          </div>
          <div class="regulation-sheet__ident">
            <strong>Taça Vale do Mucuri</strong>
            <p class="regulation-sheet__ident-detail">Regulamento - Página 3</p>
          </div>
        </header>

        <section class="regulation-chapter" aria-labelledby="regChapter7">
          <h3 id="regChapter7">Capítulo VII – Da Premiação e Destaques</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 13º</span> – Da Premiação Oficial (Por Naipe)</h4>
            <div class="regulation-article__content">
              <p>A organização efetuará a entrega oficial das seguintes premiações aos três primeiros colocados de cada naipe (Masculino e Feminino):</p>
              <ul>
                <li><strong>🥇 1º LUGAR (Campeão):</strong> Troféu de Campeão + Medalhas de Ouro (até 17 atletas + 3 comissão) + <span class="regulation-accent">R$ 3.000,00 (três mil reais)</span>;</li>
                <li><strong>🥈 2º LUGAR (Vice-campeão):</strong> Medalhas de Prata (até 17 atletas + 3 comissão) + <span class="regulation-accent">R$ 1.200,00 (mil e duzentos reais)</span>;</li>
                <li><strong>🥉 3º LUGAR (Terceiro Colocado):</strong> Medalhas de Bronze (até 17 atletas + 3 comissão).</li>
              </ul>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 14º</span> – Do Destaque por Partida (MVP do Jogo)</h4>
            <div class="regulation-article__content">
              <p>Ao término de cada uma das partidas, a mesa de arbitragem escolherá o(a) <strong>"Melhor Jogador(a) da Partida" (MVP)</strong>. O atleta eleito receberá uma premiação de destaque imediatamente após o apito final.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 15º</span> – Do Goleador / Artilheiro</h4>
            <div class="regulation-article__content">
              <p>Receberá um <strong>troféu individual</strong> o(a) atleta que marcar o maior número de gols acumulados durante todo o campeonato (fase de grupos + fase final) em seu respectivo naipe.<br>
              <strong>§ 1º (Desempate):</strong> Em caso de empate em número de gols, o troféu será entregue àquele cujo time tiver alcançado a melhor classificação geral no torneio.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 16º</span> – Da Defesa Menos Vazada</h4>
            <div class="regulation-article__content">
              <p>Receberá um <strong>troféu coletivo</strong> a equipe que sofrer a menor quantidade de gols durante a competição em seu respectivo naipe.<br>
              <strong>§ 1º (Média):</strong> Serão somados todos os gols sofridos e divididos pelo número de partidas jogadas (média de gols sofridos por jogo).<br>
              <strong>§ 2º (Desempate):</strong> Em caso de empate na média, o troféu será entregue à equipe com a melhor classificação final. Os goleiros inscritos na equipe vencedora subirão para receber o troféu.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 17º</span> – Da Seleção do Campeonato (All-Star Team)</h4>
            <div class="regulation-article__content">
              <p>Após o encerramento das finais, a coordenação técnica divulgará a <strong>"Seleção do Campeonato" (Masculino e Feminino)</strong>. Cada um dos 7 (sete) atletas eleitos receberá uma medalha de destaque individual, distribuídos nas seguintes posições oficiais da CBHb:</p>
              <ol>
                <li>01 Goleiro(a);</li>
                <li>01 Ponta Esquerda;</li>
                <li>01 Armador(a) Esquerdo(a);</li>
                <li>01 Central;</li>
                <li>01 Armador(a) Direito(a);</li>
                <li>01 Ponta Direita;</li>
                <li>01 Pivô.</li>
              </ol>
              <p><strong>§ 1º:</strong> A Cerimônia de Premiação e Encerramento ocorrerá obrigatoriamente no domingo, após as finais.</p>
            </div>
          </article>
        </section>

        <section class="regulation-chapter" aria-labelledby="regChapter8">
          <h3 id="regChapter8">Capítulo VIII – Das Considerações Finais</h3>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 18º</span> – Da Responsabilidade Médica</h4>
            <div class="regulation-article__content">
              <p>É de responsabilidade de cada equipe dispor de atendimento de primeiros socorros preventivos. A organização disponibilizará suporte básico de primeiros socorros no local do evento.</p>
            </div>
          </article>
          <article class="regulation-article">
            <h4 class="regulation-article__title"><span class="regulation-article__number">Art. 19º</span> – Dos Casos Omissos</h4>
            <div class="regulation-article__content">
              <p>Os casos omissos neste regulamento serão resolvidos <strong>soberanamente pela Comissão Organizadora</strong>, não cabendo recursos às decisões tomadas por esta junta.</p>
            </div>
          </article>
        </section>

        <footer class="regulation-sheet__footer">
          <span class="regulation-sheet__mark">⚡ <strong>M&amp;D</strong> Projetos &amp; Eventos</span>
          <span class="regulation-sheet__page">Página 3/3</span>
          <span class="regulation-sheet__footer-end">Diretrizes: <strong>seguro</strong> ⚡ <strong>rápido</strong> ⚡ <strong>impecável</strong></span>
        </footer>
      </section>
    </div>
  `;

  return section;
}

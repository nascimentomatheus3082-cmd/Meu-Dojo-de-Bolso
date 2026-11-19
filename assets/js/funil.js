/* Dojô de Bolso — funil de quiz.
   Ordem: início → 6 perguntas → desafio animado → nome → montando → resultado/oferta.
   Cada resposta vira parâmetro de evento no Pixel (públicos personalizados). */

const R = { quem: null, faixa: null, prazo: null, medo: null, estudo: null, tempo: null, nome: '', desafio: null };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const fx = () => FAIXAS.find(f => f.id === R.faixa) || FAIXAS[0];
const filho = () => R.quem === 'filho';
const voce = (a, b) => (filho() ? b : a);

const PERGUNTAS = [
  { id: 'quem', titulo: () => 'Quem vai fazer o exame de faixa?', ops: [
      { v: 'eu', emo: '🥋', t: 'Eu mesmo' },
      { v: 'filho', emo: '👧', t: 'Meu filho ou minha filha' },
      { v: 'prof', emo: '📋', t: 'Sou professor e quero indicar para alunos' } ] },
  { id: 'faixa', titulo: () => voce('Qual faixa você vai buscar no exame?', 'Qual faixa seu filho vai buscar no exame?'),
    ops: () => FAIXAS.map(f => ({ v: f.id, obi: f.cor, t: 'Faixa ' + f.nome, sub: 'Vem da ' + f.vem + ' · ' + tecnicasDa(f.id).length + ' técnicas novas' })) },
  { id: 'prazo', titulo: () => 'Quando é o exame?', ops: [
      { v: 'semana', emo: '⏰', t: 'Em menos de 1 semana' },
      { v: 'mes', emo: '📅', t: 'Em até 1 mês' },
      { v: '2meses', emo: '🗓️', t: 'Em 1 a 2 meses' },
      { v: 'sem', emo: '❔', t: 'Ainda não tem data' } ] },
  { id: 'medo', titulo: () => voce('O que mais te preocupa no exame?', 'O que mais preocupa seu filho no exame?'), ops: [
      { v: 'nomes', emo: '🈳', t: 'Esquecer os nomes em japonês' },
      { v: 'execucao', emo: '🤼', t: 'Errar a execução na frente da banca' },
      { v: 'teoria', emo: '📖', t: 'As perguntas de teoria e história' },
      { v: 'branco', emo: '😶', t: 'Ficar nervoso e dar branco' } ] },
  { id: 'estudo', titulo: () => voce('Como você estuda para o exame hoje?', 'Como ele estuda para o exame hoje?'), ops: [
      { v: 'treino', emo: '🏃', t: 'Só no treino da academia' },
      { v: 'youtube', emo: '▶️', t: 'Vídeos soltos no YouTube' },
      { v: 'pdf', emo: '📄', t: 'Apostila ou PDF' },
      { v: 'nada', emo: '🤷', t: 'Ainda não começou' } ] },
  { id: 'tempo', titulo: () => 'Quanto tempo por dia dá para revisar em casa?', ops: [
      { v: '5', emo: '⚡', t: '5 minutos' },
      { v: '15', emo: '⏱️', t: '15 minutos' },
      { v: '30', emo: '📚', t: '30 minutos ou mais' } ] },
];
const TOTAL_PASSOS = PERGUNTAS.length + 2; // + desafio + nome

/* ── Navegação */
function tela(nome) {
  $$('.tela').forEach(t => t.classList.toggle('ativa', t.dataset.tela === nome));
  window.scrollTo({ top: 0 });
  document.body.classList.toggle('quiz', nome !== 'inicio');
}
function progresso(n) {
  const pct = Math.min(100, (n / TOTAL_PASSOS) * 100);
  $('#obi .obi-fill').style.width = pct + '%';
  $('#obi .obi-knot').style.left = pct + '%';
}
function corFaixa(f) {
  document.documentElement.style.setProperty('--faixa', f.cor);
  document.documentElement.style.setProperty('--faixa-tinta', f.tinta);
}

/* ── Perguntas */
function mostrarPergunta(i) {
  const P = PERGUNTAS[i];
  const ops = typeof P.ops === 'function' ? P.ops() : P.ops;
  progresso(i);
  $('#pergunta').innerHTML = `
    <p class="passo">Pergunta ${i + 1} de ${PERGUNTAS.length + 1}</p>
    <h2>${P.titulo()}</h2>
    <div class="opcoes">${ops.map(o => `
      <button class="opcao" data-v="${o.v}">
        ${o.obi ? `<span class="obi-mini" style="background:${o.obi}"></span>` : `<span class="emo" aria-hidden="true">${o.emo}</span>`}
        <span>${o.t}${o.sub ? `<small>${o.sub}</small>` : ''}</span>
      </button>`).join('')}
    </div>`;
  tela('pergunta');
  $$('#pergunta .opcao').forEach(b => b.onclick = () => {
    b.classList.add('sel');
    R[P.id] = b.dataset.v;
    if (P.id === 'faixa') corFaixa(fx());
    track('QuizPergunta', { pergunta: P.id, resposta: b.dataset.v, passo: i + 1 }, true);
    setTimeout(() => (i + 1 < PERGUNTAS.length ? mostrarPergunta(i + 1) : desafio()), 260);
  });
}

/* ── Desafio: o lead vê o produto funcionando antes da oferta */
let desafioStage;
function desafio() {
  progresso(PERGUNTAS.length);
  const nage = tecnicasAte(R.faixa).filter(t => !['OSA', 'SHIME', 'KAN', 'UKEMI'].includes(t.g));
  const certa = tecnicasDa(R.faixa).find(t => !['OSA', 'SHIME', 'KAN', 'UKEMI'].includes(t.g)) || nage[0];
  const outras = nage.filter(t => t.id !== certa.id && t.a.split(':')[0] !== certa.a.split(':')[0]);
  const ops = [certa, ...embaralhar(outras).slice(0, 2)];
  embaralhar(ops);
  $('#desafioPasso').textContent = `Pergunta ${PERGUNTAS.length + 1} de ${PERGUNTAS.length + 1} · desafio rápido`;
  $('#desafioTitulo').textContent = 'Este golpe cai no exame da faixa ' + fx().nome.toLowerCase() + '. Qual é?';
  $('#desafioStage').innerHTML = '';
  desafioStage = new JudoStage($('#desafioStage'), { spec: certa.a, belt: '#F4F5F2' });
  desafioStage.playAll(true);
  $('#desafioOpcoes').innerHTML = ops.map(o => `<button class="opcao" data-id="${o.id}"><span class="emo" aria-hidden="true">🥋</span><span>${o.n}</span></button>`).join('');
  $('#desafioFb').hidden = true;
  tela('desafio');
  $$('#desafioOpcoes .opcao').forEach(b => b.onclick = () => {
    if (R.desafio !== null) return;
    const ok = b.dataset.id === certa.id; R.desafio = ok;
    $$('#desafioOpcoes .opcao').forEach(x => x.classList.add(x.dataset.id === certa.id ? 'certa' : (x === b ? 'errada' : 'x')));
    track('QuizDesafio', { acertou: ok, tecnica: certa.id }, true);
    $('#desafioFb').hidden = false;
    $('#desafioFb').innerHTML = `<div class="feedback">${ok
      ? `<b>Acertou: é ${certa.n}.</b> ${certa.tr}. Agora imagine a banca pedindo isso e mais ${tecnicasAte(R.faixa).length - 1} técnicas, fora a teoria.`
      : `<b>Era ${certa.n}</b> (${certa.tr.toLowerCase()}). Normal confundir: muitos golpes parecem iguais até alguém mostrar a diferença em câmera lenta.`}</div>
      <button class="btn" id="desafioSeguir">Continuar</button>`;
    $('#desafioSeguir').onclick = () => { desafioStage.stop(); nome(); };
  });
}

function nome() {
  progresso(PERGUNTAS.length + 1);
  $('#nomeTitulo').textContent = filho() ? 'Qual o nome do seu filho ou filha?' : 'Qual o seu primeiro nome?';
  tela('nome'); setTimeout(() => $('#nomeInput').focus(), 300);
}
$('#nomeOk').onclick = () => { R.nome = $('#nomeInput').value.trim().replace(/[<>&"]/g, ''); montando(); };
$('#nomePular').onclick = () => { R.nome = ''; montando(); };
$('#nomeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#nomeOk').click(); });

/* ── Montando o plano */
function montando() {
  progresso(TOTAL_PASSOS);
  const f = fx();
  $('#montandoTitulo').textContent = `Montando o plano ${R.nome ? 'de ' + R.nome : ''} para a faixa ${f.nome.toLowerCase()}`;
  const passos = [
    `Separando as ${tecnicasDa(f.id).length} técnicas novas da faixa ${f.nome.toLowerCase()}`,
    `Incluindo a revisão das faixas anteriores`,
    `Distribuindo pelo tempo até o exame`,
    `Escolhendo as perguntas de teoria mais cobradas`,
  ];
  $('#montandoLista').innerHTML = passos.map(p => `<li><span class="chk">✓</span>${p}</li>`).join('');
  tela('montando');
  const lis = $$('#montandoLista li');
  lis.forEach((li, i) => setTimeout(() => li.classList.add('feito'), 600 + i * 750));
  setTimeout(resultado, 600 + lis.length * 750 + 400);
  track('Lead', { content_name: 'quiz_concluido', faixa: R.faixa, quem: R.quem, prazo: R.prazo, medo: R.medo });
}

/* ── Resultado */
const DIAS = { semana: 6, mes: 21, '2meses': 45, sem: 30 };
function resultado() {
  const f = fx();
  const novas = tecnicasDa(f.id), revisao = tecnicasAte(f.id).length - novas.length;
  const dias = DIAS[R.prazo] || 30;
  const min = +R.tempo || 15;
  const porDia = Math.max(1, Math.ceil((novas.length + Math.ceil(revisao / 2)) / Math.max(1, dias - 2)));
  const quem = R.nome || (filho() ? 'seu filho' : 'você');

  $('#resCab').innerHTML = `
    <p>Plano pronto</p>
    <h1>${R.nome ? R.nome + ', faixa' : 'Faixa'} ${f.nome.toLowerCase()} em ${dias} dias</h1>
    <div class="res-meta">
      <div><b>${novas.length}</b>técnicas novas</div>
      <div><b>${revisao}</b>para revisar</div>
      <div><b>${min}</b>min por dia</div>
    </div>`;

  const grupos = [...new Set(novas.map(t => t.g))];
  const proj = novas.filter(t => !['OSA', 'UKEMI', 'SHIME', 'KAN'].includes(t.g));
  const solo = novas.filter(t => ['OSA', 'SHIME', 'KAN', 'UKEMI'].includes(t.g));
  const conteudo = []; // [texto, peso]
  if (dias > 7 && proj.length > 4) { conteudo.push(['Projeções: ' + proj.slice(0, 4).map(t => t.n).join(', '), 4]); conteudo.push(['Projeções: ' + proj.slice(4).map(t => t.n).join(', '), proj.length - 4]); }
  else conteudo.push(['Projeções: ' + proj.map(t => t.n).join(', '), proj.length]);
  if (solo.length) conteudo.push([(solo.every(t => t.g === 'UKEMI') ? 'Quedas: ' : 'Solo e quedas: ') + solo.map(t => t.n).join(', '), Math.max(1, solo.length * 0.8)]);
  if (revisao) conteudo.push(['Revisão das faixas anteriores e teoria', Math.max(1.5, revisao / 6)]);
  else conteudo.push(['Teoria: história, comandos do árbitro e etiqueta', 1.5]);
  conteudo.push(['Simulados completos e modo banca, todo dia', Math.max(1, dias / 7)]);
  const soma = conteudo.reduce((s, c) => s + c[1], 0);
  let acum = 0, fim = 0;
  const fases = conteudo.map(([c, w], i) => {
    const resto = conteudo.length - 1 - i;
    const a = fim + 1; acum += w;
    const b = resto === 0 ? dias : Math.min(dias - resto, Math.max(a, Math.round(acum / soma * dias)));
    fim = b;
    return [a === b ? `Dia ${a}` : `Dias ${a} a ${b}`, c];
  });
  $('#plano').innerHTML = `
    <h3>A ordem de estudo</h3>
    <p class="muted small">${porDia} técnica${porDia > 1 ? 's' : ''} por dia, em ${min} minutos. ${grupos.length} grupos de técnicas na faixa ${f.nome.toLowerCase()}.</p>
    <ol>${fases.map((x, i) => `<li class="${i > 0 ? 'bloq' : ''}"><span>${x[0]}</span><span>${x[1]}</span></li>`).join('')}</ol>
    <p class="muted small" style="margin-top:10px">O plano completo libera no app, com cada técnica animada e narrada.</p>`;

  const DOR = {
    nomes: [`O nome some na hora H`, `A banca fala "${novas[0].n}" e ${quem} precisa mostrar na hora. Decorar lista não resolve: o nome fixa quando se liga ao movimento. No app cada nome vem com o golpe animado e a pronúncia falada.`],
    execucao: [`A banca olha os detalhes`, `Desequilíbrio, entrada e finalização: é isso que o sensei avalia. Cada aula do app mostra as três fases separadas, em câmera lenta, e o erro que mais reprova naquela técnica.`],
    teoria: [`A teoria pega quem só treinou`, `Quem fundou o judô, o que é kuzushi, o que significa "sono-mama". O simulado do app cobre história, regras, etiqueta e terminologia, com explicação em cada resposta.`],
    branco: [`O branco vem da surpresa`, `Nervoso no exame é falta de ensaio. O modo banca do app sorteia golpes e fala o nome como o sensei, para ${quem} chegar no dia já acostumado com a cobrança.`],
  }[R.medo] || ['', ''];
  const ESTUDO = { youtube: 'Vídeo solto no YouTube não segue o programa da faixa; o app segue.', pdf: 'PDF mostra o golpe parado; aqui ele se mexe e é explicado em voz alta.', treino: 'No treino não sobra tempo para revisar nome e teoria; o app cuida dessa parte em casa.', nada: 'Começar agora, com um plano, já coloca ' + quem + ' na frente.' }[R.estudo] || '';
  $('#dor').innerHTML = `<h2>${DOR[0]}</h2><p>${DOR[1]}</p>${ESTUDO ? `<p>${ESTUDO}</p>` : ''}`;

  // Amostra: a 1ª técnica da faixa escolhida, completa
  const amostra = novas.find(t => !['OSA', 'SHIME', 'KAN'].includes(t.g)) || novas[0];
  const root = $('#amostra');
  root.querySelector('.stage').innerHTML = '';
  const fasesN = ['Nome', ...GRUPOS[amostra.g].fases, 'Erro'];
  $('#amostraFases').innerHTML = fasesN.map((x, i) => `<button data-fase="${i}">${x}</button>`).join('');
  const player = new AulaPlayer(root, amostra, { belt: f.cor, onEnd: () => { setPlay(false); track('AmostraConcluida', { tecnica: amostra.id }, true); } });
  player.show(player.roteiro()[0], 0);
  const setPlay = on => { $('#amostraPlay span').textContent = on ? 'Parar' : 'Ouvir a aula'; $('#amostraPlay').classList.toggle('on', on); };
  $('#amostraPlay').onclick = () => {
    if (player.playing) { player.stop(); setPlay(false); return; }
    setPlay(true); player.play(0); track('ViewContent', { content_name: 'amostra_' + amostra.id });
  };
  $$('#amostraFases button').forEach(b => b.onclick = () => { setPlay(true); player.play(+b.dataset.fase); });
  $('#amostraLento').onclick = e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); player.stage.speed = on ? 0.5 : 1; };

  // Oferta
  $$('[data-preco]').forEach(e => e.textContent = CONFIG.precos[e.dataset.preco]);
  $$('[data-garantia]').forEach(e => e.textContent = CONFIG.garantiaDias);
  $$('[data-faixa-nome]').forEach(e => e.textContent = f.nome.toLowerCase());
  // O botão do plano leva para a página de oferta (resumo + order bumps); de lá vai para o checkout.
  $$('[data-plano]').forEach(a => {
    a.href = comUtm(new URL('oferta/', location.href).toString(), { plano: a.dataset.plano, faixa: f.id });
    a.onclick = () => track('AddToCart', { content_name: a.dataset.plano, value: parseFloat(CONFIG.precos[a.dataset.plano].replace(',', '.')), currency: 'BRL', faixa: f.id, quem: R.quem });
  });
  $('#irOferta').onclick = () => $('#oferta').scrollIntoView({ behavior: 'smooth' });

  tela('resultado');
  document.body.classList.remove('quiz');
  try { sessionStorage.setItem('dojo_quiz', JSON.stringify(R)); } catch (e) {}
}

function embaralhar(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ── Início */
const hero = new JudoStage($('#heroStage'), { spec: 'gari:osoto', belt: '#1F5FBF' });
(async () => { const specs = ['gari:osoto', 'koshi:seoi', 'tsuri:joelho', 'ma']; let i = 0;
  while (document.querySelector('[data-tela="inicio"].ativa')) { hero.load(specs[i++ % specs.length]); await hero.playAll(false); } })();
$$('[data-go="quem"]').forEach(b => b.onclick = () => { hero.stop(); track('ViewContent', { content_name: 'quiz_inicio' }); mostrarPergunta(0); });

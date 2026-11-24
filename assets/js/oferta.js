/* Dojô de Bolso — página de oferta (etapa antes do checkout): resumo do plano + order bumps. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const q = new URLSearchParams(location.search);
const num = s => parseFloat(String(s).replace('.', '').replace(',', '.'));
const brl = n => 'R$ ' + n.toFixed(2).replace('.', ',');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let quiz = null; try { quiz = JSON.parse(sessionStorage.getItem('dojo_quiz') || 'null'); } catch (e) {}
const faixa = FAIXAS.find(f => f.id === (q.get('faixa') || (quiz && quiz.faixa))) || FAIXAS[0];
const nome = quiz && quiz.nome ? quiz.nome : '';
let plano = ['essencial', 'completo', 'anual'].includes(q.get('plano')) ? q.get('plano') : 'completo';
const bumps = { kit: false, fichas: false };
document.documentElement.style.setProperty('--faixa', faixa.cor);

const PLANOS = {
  essencial: { nome: 'Essencial', sub: `Faixa ${faixa.nome.toLowerCase()} · pagamento único`, itens: [`Aulas animadas e narradas da faixa ${faixa.nome.toLowerCase()}`, 'Simulado da faixa com gabarito', 'Modo banca e glossário falado'] },
  completo: { nome: 'Completo', sub: 'Todas as faixas · pagamento único', itens: ['70 aulas animadas e narradas, da azul à marrom', 'Simulados ilimitados de todas as faixas', 'Modo banca e glossário falado', 'Acesso sem prazo para acabar'] },
  anual: { nome: 'Anual', sub: `Pix único · acesso por 12 meses, sem renovação automática`, itens: ['Tudo do Completo, em todas as faixas', 'Kit do Exame para Imprimir incluso', 'Fichas para imprimir inclusas', 'Plano Família: até 3 judocas', 'Os módulos novos que lançarmos nos 12 meses'] },
};
const BUMPS = {
  kit: {
    tit: () => `Sim! Quero o Kit do Exame para Imprimir por + R$ ${CONFIG.precos.kit}`,
    txt: 'A cartilha da faixa, os cartões de memorizar, o calendário de 30 dias e o checklist da véspera. Para imprimir e estudar longe da tela, na mesa da cozinha ou no carro.',
  },
  fichas: {
    tit: () => `Sim! Quero as fichas para imprimir por + R$ ${CONFIG.precos.fichas}`,
    txt: 'Uma ficha A4 por técnica, com o golpe desenhado nas 3 fases e o erro que reprova. Para colar na parede do quarto ou levar na mochila até o exame.',
    prev: true,
  },
};

function render() {
  const P = PLANOS[plano];
  $('#titulo').textContent = nome ? `Pedido de ${nome}` : 'Seu pedido';
  $('#itemPlano').innerHTML = `
    <h2>Dojô de Bolso ${P.nome}</h2>
    <span class="p-preco">R$ ${CONFIG.precos[plano]}${plano === 'anual' ? '<small style="font-size:14px">/ano</small>' : ''}</span>
    <p class="p-sub">${esc(P.sub)}</p>
    <ul>${P.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    ${plano === 'essencial' ? `<div class="upgrade"><span>Por + R$ ${brl(num(CONFIG.precos.completo) - num(CONFIG.precos.essencial)).slice(3)} leve <b>todas as faixas</b>, para os próximos exames.</span><button data-para="completo">Trocar</button></div>` : ''}
    ${plano === 'completo' ? `<div class="upgrade"><span>No <b>Anual</b> (R$ ${CONFIG.precos.anual}/ano) o kit e as fichas já vêm inclusos.</span><button data-para="anual">Ver</button></div>` : ''}`;
  $$('[data-para]').forEach(b => b.onclick = () => { plano = b.dataset.para; bumps.kit = bumps.fichas = false; render(); track('TrocaPlano', { para: plano }, true); });

  // Sem links de combinação no config.js, os bumps são marcados na própria tela de pagamento (Cakto):
  // aqui só avisamos, para o cliente não achar que já adicionou.
  const temCombos = ['kit', 'fichas', 'kit+fichas'].some(s => linkCheckout(plano + '+' + s));
  if (plano !== 'anual' && !temCombos) {
    Object.keys(bumps).forEach(k => { bumps[k] = false; });
    $('#bumps').innerHTML = `
      <div class="bump-aviso">
        <b>Na tela de pagamento você ainda pode adicionar:</b>
        <ul>
          <li><b>Kit do Exame para Imprimir</b> por + R$ ${CONFIG.precos.kit}: cartilha da faixa, cartões de memorizar, calendário de 30 dias e checklist da véspera</li>
          <li><b>Fichas para imprimir</b> por + R$ ${CONFIG.precos.fichas}: uma ficha A4 por técnica, com o golpe nas 3 fases</li>
        </ul>
        <span class="b-prev"><span class="mini" data-spec="gari:osoto"></span><span class="mini" data-spec="koshi"></span><span class="mini" data-spec="koshi:seoi"></span></span>
      </div>`;
    $$('.mini').forEach(m => { const st = new JudoStage(m, { spec: m.dataset.spec, belt: faixa.cor }); const f = st.frames[Math.min(4, st.frames.length - 1)]; st.cur = { T: f.T, U: f.U }; st.render(); });
    resumo();
    return;
  }
  $('#bumps').innerHTML = plano === 'anual' ? '' : Object.entries(BUMPS).map(([k, B]) => `
    <label class="bump ${bumps[k] ? 'on' : ''}" data-b="${k}">
      <input type="checkbox" ${bumps[k] ? 'checked' : ''}>
      <span class="caixa" aria-hidden="true">✓</span>
      <span><span class="b-tit">${B.tit()}</span><span class="b-txt" style="display:block">${B.txt}</span></span>
      ${B.prev ? '<span class="b-prev"><span class="mini" data-spec="gari:osoto"></span><span class="mini" data-spec="koshi"></span><span class="mini" data-spec="koshi:seoi"></span></span>' : ''}
    </label>`).join('');
  $$('.bump').forEach(l => l.querySelector('input').onchange = e => {
    bumps[l.dataset.b] = e.target.checked; l.classList.toggle('on', e.target.checked);
    track(e.target.checked ? 'BumpMarcado' : 'BumpDesmarcado', { bump: l.dataset.b, plano }, true);
    resumo();
  });
  $$('.mini').forEach(m => { const st = new JudoStage(m, { spec: m.dataset.spec, belt: faixa.cor }); const f = st.frames[Math.min(4, st.frames.length - 1)]; st.cur = { T: f.T, U: f.U }; st.render(); });
  resumo();
}

function combo() {
  if (plano === 'anual') return 'anual';
  return [plano, ...['kit', 'fichas'].filter(k => bumps[k])].join('+');
}
function resumo() {
  const linhas = [[`Dojô de Bolso ${PLANOS[plano].nome}`, num(CONFIG.precos[plano])]];
  if (plano !== 'anual') { if (bumps.kit) linhas.push(['Kit do Exame para Imprimir', num(CONFIG.precos.kit)]); if (bumps.fichas) linhas.push(['Fichas para imprimir', num(CONFIG.precos.fichas)]); }
  const total = linhas.reduce((s, l) => s + l[1], 0);
  $('#linhas').innerHTML = linhas.map(([n, v]) => `<div><span>${n}</span><span>${brl(v)}</span></div>`).join('');
  $('#total').textContent = brl(total) + (plano === 'anual' ? '/ano' : '');
  const c = combo();
  const url = linkCheckout(c) || linkCheckout(plano);
  const pagar = $('#pagar');
  if (!url) {
    // link da Cakto ainda não colado no config.js: não manda o cliente para uma página quebrada
    pagar.removeAttribute('href'); pagar.setAttribute('aria-disabled', 'true'); pagar.style.opacity = '.55';
    pagar.textContent = 'Pagamento em configuração';
    pagar.onclick = e => { e.preventDefault(); alert('O pagamento deste plano ainda está sendo configurado. Volte em instantes.'); };
    return;
  }
  pagar.removeAttribute('aria-disabled'); pagar.style.opacity = ''; pagar.textContent = 'Ir para o pagamento';
  pagar.href = comUtm(url, { faixa: faixa.id });
  pagar.onclick = () => track('InitiateCheckout', { content_name: c, value: total, currency: 'BRL', num_items: linhas.length, faixa: faixa.id });
}

$$('[data-garantia]').forEach(e => e.textContent = CONFIG.garantiaDias);
$('#trocar').href = '../#oferta';
$('#trocar').onclick = e => { e.preventDefault(); history.length > 1 ? history.back() : (location.href = '../'); };
track('ViewContent', { content_name: 'oferta_' + plano, faixa: faixa.id });
render();

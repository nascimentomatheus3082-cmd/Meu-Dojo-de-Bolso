/* Dojô de Bolso — app do aluno (SPA com rotas por hash). */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const view = $('#view');

/* ── Estado salvo no aparelho (sem cadastro).
   faixa, vistos e historico são de cada judoca (perfil); o resto é do aparelho. */
const DO_PERFIL = ['faixa', 'vistos', 'historico', 'xp', 'dias', 'conquistas', 'banca'];
const raw = {
  get(k, d) { try { const v = localStorage.getItem('dojo_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dojo_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('dojo_' + k); } catch (e) {} },
};
const chave = k => DO_PERFIL.includes(k) ? `p_${raw.get('perfilAtual', 'p1')}_${k}` : k;
const store = { get: (k, d) => raw.get(chave(k), d), set: (k, v) => raw.set(chave(k), v) };

/* ── Perfis: 1 judoca por acesso; o Plano Família libera até 3 */
const perfis = () => raw.get('perfis', []);
const perfilAtual = () => perfis().find(p => p.id === raw.get('perfilAtual')) || perfis()[0] || null;
const limitePerfis = () => (raw.get('familia', false) || raw.get('plano') === 'anual') ? 3 : 1;
const temFichas = () => raw.get('fichas', false) || raw.get('plano') === 'anual';
function salvarPerfis(lista) { raw.set('perfis', lista); }
function criarPerfil(nome, faixa) {
  const lista = perfis();
  const id = 'p' + (Math.max(0, ...lista.map(p => +p.id.slice(1) || 0)) + 1);
  lista.push({ id, nome: nome.slice(0, 20) }); salvarPerfis(lista);
  raw.set('perfilAtual', id); store.set('faixa', faixa);
  return id;
}
function trocarPerfil(id) { raw.set('perfilAtual', id); }
function apagarPerfil(id) {
  salvarPerfis(perfis().filter(p => p.id !== id));
  DO_PERFIL.forEach(k => raw.del(`p_${id}_${k}`));
  if (raw.get('perfilAtual') === id) raw.set('perfilAtual', perfis()[0] ? perfis()[0].id : 'p1');
}

/* Acesso pelo link de entrega:
   /app/?plano=completo | ?plano=essencial&faixa=verde | acrescente &familia=1 para o Plano Família */
(function acesso() {
  const q = new URLSearchParams(location.search);
  // Com o acesso fechado, o plano vem do servidor (login.js) e o link não libera nada.
  if (!Acesso.ligado) {
    if (q.get('plano')) raw.set('plano', q.get('plano'));
    if (q.get('familia') === '1') raw.set('familia', true);
    if (q.get('fichas') === '1') raw.set('fichas', true);
    if (q.get('faixa')) raw.set('faixaPlano', q.get('faixa'));
  }
  // quem usava o app antes dos perfis: os dados viram o perfil 1
  if (!raw.get('perfis') && (raw.get('vistos') || raw.get('faixa'))) {
    salvarPerfis([{ id: 'p1', nome: 'Judoca 1' }]); raw.set('perfilAtual', 'p1');
    DO_PERFIL.forEach(k => { const v = raw.get(k); if (v !== undefined && v !== null) { raw.set('p_p1_' + k, v); raw.del(k); } });
  }
})();
const quizSalvo = () => { try { return JSON.parse(sessionStorage.getItem('dojo_quiz') || 'null'); } catch (e) { return null; } };
const plano = () => raw.get('plano', 'completo');
// Essencial: só a faixa comprada. Sem faixa no link, o cliente escolhe uma vez no primeiro cadastro.
const liberada = id => plano() !== 'essencial' || !raw.get('faixaPlano') || id === raw.get('faixaPlano');
const faixaAtual = () => FAIXAS.find(f => f.id === store.get('faixa', 'azul')) || FAIXAS[0];
const vistos = () => store.get('vistos', {});

function aplicarCor() {
  const f = faixaAtual();
  document.documentElement.style.setProperty('--faixa', f.cor);
}

let limpar = [];
function onLeave(fn) { limpar.push(fn); }
function cab(titulo, voltar) {
  $('#barraTitulo').textContent = titulo;
  $('#voltar').hidden = !voltar;
  $('#voltar').onclick = () => { location.hash = voltar; };
}
function aba(nome) { $$('.abas a').forEach(a => a.classList.toggle('on', a.dataset.aba === nome)); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const embaralhar = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const ICON = {
  play: '<svg class="ic" viewBox="0 0 24 24"><path d="M7 4v16l13-8z" fill="currentColor"/></svg>',
  stop: '<svg class="ic" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  som: '<svg class="ic" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5c1.5 1.8 1.5 5.2 0 7M18.5 6c3 3.3 3 8.7 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

/* Capa das telas internas: avatar 3D + selo + título */
const capa = (av, selo, titulo, sub) => `<section class="capa"><div class="capa-txt"><p class="selo">${selo}</p><h1>${titulo}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div><img src="../assets/img/avatar-${av}.jpg" alt="" width="600" height="600"></section>`;

/* ── Rotas */
const rotas = [
  [/^#?\/?$/, inicio],
  [/^#\/aulas(?:\/([\w?]+))?$/, aulas],
  [/^#\/aula\/([\w-]+)$/, aula],
  [/^#\/simulado$/, simulado],
  [/^#\/banca$/, banca],
  [/^#\/glossario$/, glossario],
  [/^#\/perfis$/, telaPerfis],
  [/^#\/novo-perfil$/, () => cadastro(false)],
];
function rotear() {
  limpar.forEach(f => { try { f(); } catch (e) {} }); limpar = [];
  Voz.stop();
  if (!Acesso.liberado()) { Acesso.tela(); return; }
  document.body.classList.remove('modo-login');
  if (!perfis().length) { cadastro(true); return; }
  aplicarCor();
  Progresso.verificar();
  const h = location.hash || '#/';
  for (const [re, fn] of rotas) { const m = h.match(re); if (m) { fn(...m.slice(1)); window.scrollTo(0, 0); view.focus({ preventScroll: true }); return; } }
  inicio();
}
window.addEventListener('hashchange', rotear);

/* ── Início */
function inicio() {
  cab('Dojô de Bolso'); aba('inicio');
  const f = faixaAtual();
  const lista = tecnicasDa(f.id), v = vistos();
  const feitas = lista.filter(t => v[t.id]).length;
  const pct = Math.round(feitas / lista.length * 100);
  const hist = store.get('historico', []).filter(h => h.faixa === f.id);
  const ultima = hist[hist.length - 1];
  const eu = perfilAtual(), todos = perfis();
  const xp = Progresso.pontos(), nv = Progresso.nivel(xp), seq = Progresso.diasSeguidos(), tem = store.get('conquistas', {});
  const prox = proxima(f);
  // Trilha: técnicas da faixa → simulado (80%+) → modo banca → exame
  const passou = hist.some(h => h.nota >= 80), treinouBanca = store.get('banca', 0) > 0;
  const etapa = feitas < lista.length ? 0 : !passou ? 1 : !treinouBanca ? 2 : 3;
  const trilha = [
    ['Técnicas da faixa', `${feitas}/${lista.length}`, `#/aulas/${f.id}`],
    ['Simulado', ultima ? ultima.nota + '%' : 'meta 80%', '#/simulado'],
    ['Modo banca', treinouBanca ? 'treinado' : 'o app pede', '#/banca'],
    ['Exame', etapa === 3 ? 'pronto!' : 'no dojô', null],
  ];
  const objetivo = etapa === 0 ? `Revisar ${esc(prox.n)}` : etapa === 1 ? `Tirar 80% no simulado da faixa ${f.nome.toLowerCase()}` : etapa === 2 ? 'Treinar no modo banca' : 'Você está pronto para o exame';
  const objLink = etapa === 0 ? `#/aula/${prox.id}` : etapa === 1 ? '#/simulado' : '#/banca';
  const IC = {
    aulas: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v6l5-3z" fill="currentColor"/></svg>',
    sim: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 13l2 2 3.5-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    banca: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6" fill="currentColor"/><path d="M5 20c.8-4.4 3.6-6.4 7-6.4s6.2 2 7 6.4" fill="currentColor"/></svg>',
    rev: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    termos: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 9h6M9 13h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    fichas: '<svg viewBox="0 0 24 24"><path d="M7 3h10v6H7zM5 9h14v8h-3v4H8v-4H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    seta: '<svg viewBox="0 0 24 24" class="seta"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const tile = (href, ic, cor, b, s) => `<a class="tile" href="${href}"><span class="tile-ic ${cor}">${IC[ic]}</span><span><b>${b}</b><span>${s}</span></span></a>`;
  view.innerHTML = `
    ${limitePerfis() > 1 || todos.length > 1 ? `
    <div class="perfis-barra" role="group" aria-label="Trocar de judoca">
      ${todos.map(p => `<button class="perfil-chip ${p.id === eu.id ? 'on' : ''}" data-p="${p.id}"><span class="avatar">${esc(p.nome.trim()[0] || '?').toUpperCase()}</span>${esc(p.nome)}</button>`).join('')}
      ${todos.length < limitePerfis() ? '<a class="perfil-chip add" href="#/novo-perfil">+ Judoca</a>' : ''}
    </div>` : ''}
    <div class="home">
    <div class="ola">
      <div>
        <h1>Olá, ${esc(eu.nome.split(' ')[0])}! <span aria-hidden="true">👋</span></h1>
        <p class="muted">Pronto para evoluir no seu judô hoje? · <a href="#/perfis">editar perfil</a></p>
      </div>
      <div class="stats">
        <div class="stat"><span class="stat-ic fogo" aria-hidden="true">🔥</span><span><b>${seq}</b><small>${seq === 1 ? 'dia seguido' : 'dias seguidos'}</small></span></div>
        <div class="stat"><span class="stat-ic estrela" aria-hidden="true">⭐</span><span><b>${xp.toLocaleString('pt-BR')} <em>XP</em></b><small>Nível ${nv.n} · faltam ${nv.fim - xp}</small></span></div>
      </div>
    </div>

    <section class="hero">
      <div class="hero-txt">
        <p class="selo">Dojô de Bolso</p>
        <h2>Seu sensei de bolso para o <span class="ouro">exame de faixa</span></h2>
        <p class="hero-sub">Golpe por golpe, animado e narrado. Revise as técnicas, faça o simulado e chegue pronto na banca.</p>
        <a class="btn-ouro" href="#/aulas/${f.id}">${feitas < lista.length ? 'Continuar minha trilha' : 'Rever as aulas'} ${ICON.play}</a>
      </div>
      <img class="hero-img" src="../assets/img/avatar-judoca.jpg" alt="" width="600" height="600">
    </section>

    <section class="card grad">
      <h3>Minha graduação</h3>
      <div class="grad-topo">
        <svg class="grad-faixa" viewBox="0 0 64 40" aria-hidden="true"><path d="M2 12h60v10H2z" fill="${f.cor}"/><path d="M2 12h60v10H2z" fill="url(#brilho)"/><path d="M24 8h16l-2 18H26z" fill="${f.cor}" stroke="rgba(0,0,0,.25)"/><path d="M27 24l-9 14 7-1 3 3 4-15zM37 24l9 14-7-1-3 3-4-15z" fill="${f.cor}" stroke="rgba(0,0,0,.25)"/><defs><linearGradient id="brilho" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient></defs></svg>
        <div><b class="grad-nome">Faixa ${f.nome.toLowerCase()}</b><span class="muted small">${f.kyu} · vem da ${f.vem}</span></div>
        <span class="grad-pct"><b>${pct}%</b> concluído</span>
      </div>
      <div class="obi"><div class="obi-fill" style="width:${pct}%"></div><div class="obi-knot" style="left:${pct}%"></div></div>
      <div class="faixas-esc" role="group" aria-label="Escolher faixa">
        ${FAIXAS.map(x => `<button class="faixa-chip ${x.id === f.id ? 'on' : ''}" data-f="${x.id}" ${liberada(x.id) ? '' : 'disabled title="Disponível no plano Completo"'}><i style="background:${x.cor}"></i>${x.nome}</button>`).join('')}
      </div>
      <a class="objetivo" href="${objLink}"><span class="trofeu" aria-hidden="true">🏆</span><span><b>Próximo objetivo</b><span>${objetivo}</span></span>${IC.seta}</a>
    </section>

    <section class="acesso">
      <h3>Acesso rápido</h3>
      <div class="tiles">
        ${tile(`#/aulas/${f.id}`, 'aulas', 'vermelho', 'Aulas', prox ? 'Próxima: ' + esc(prox.n) : 'Todas revisadas')}
        ${tile('#/simulado', 'sim', 'verde', 'Simulado', ultima ? 'Último: ' + ultima.nota + '%' : 'Com gabarito comentado')}
        ${tile('#/banca', 'banca', 'azul', 'Modo banca', 'O app pede, você mostra')}
        ${tile(`#/aulas/${f.id}?todas`, 'rev', 'roxo', 'Revisão', `${tecnicasAte(f.id).length - lista.length} das faixas anteriores`)}
        ${tile('#/glossario', 'termos', 'ouro', 'Termos', `${GLOSSARIO.length} palavras com pronúncia`)}
        ${temFichas() ? tile('../fichas/', 'fichas', 'cinza', 'Fichas', 'Para imprimir em A4') : ''}
      </div>
    </section>

    <section class="card trilha">
      <h3>Minha trilha de evolução</h3>
      <ol class="trilha-passos">
        ${trilha.map(([nome, info, href], i) => {
          const st = i < etapa ? 'feito' : i === etapa ? 'atual' : 'bloq';
          const icone = st === 'feito' ? '✓' : st === 'atual' ? '▶' : '🔒';
          const inner = `<span class="tp-dot" aria-hidden="true">${icone}</span><b>${nome}</b><small>${info}</small>`;
          return `<li class="${st}">${href && st !== 'bloq' ? `<a href="${href}">${inner}</a>` : `<span>${inner}</span>`}</li>`;
        }).join('')}
      </ol>
    </section>

    <section class="card sensei">
      <div class="sensei-topo">
        <img src="../assets/img/avatar-sensei.jpg" alt="" width="600" height="600">
        <div><h3>Sensei Virtual</h3><p class="balao">Como posso te ajudar hoje, judoca?</p></div>
      </div>
      <a class="opcao" href="${prox ? '#/aula/' + prox.id : '#/aulas/' + f.id}"><span>▶</span>Explicar uma técnica${IC.seta}</a>
      <a class="opcao" href="#/simulado"><span>☰</span>Criar um simulado${IC.seta}</a>
      <a class="opcao" href="#/banca"><span>🥋</span>Treinar para a banca${IC.seta}</a>
      <div class="opcao breve"><span>?</span>Tirar dúvidas por chat<em>em breve</em></div>
    </section>
    </div>
    <section class="conquistas">
      <h2 class="grupo-tit">Conquistas <small>· ${Object.keys(tem).length} de ${CONQUISTAS.length}</small></h2>
      <ul>${CONQUISTAS.map(q => `<li class="${tem[q.id] ? 'sim' : ''}" title="${esc(q.desc)}"><span class="c-emo" aria-hidden="true">${tem[q.id] ? q.emo : '🔒'}</span><b>${q.nome}</b><span>${q.desc}</span></li>`).join('')}</ul>
    </section>
    <button class="som-toggle" id="somToggle" aria-pressed="${FX.somLigado()}">${FX.somLigado() ? '🔊 Sons de comemoração ligados' : '🔇 Sons de comemoração desligados'}</button>
    <p class="aviso">O programa segue o Gokyo do Kodokan no formato usado pela CBJ. Confirme com o seu sensei se a sua academia cobra algo a mais. As animações mostram a mecânica do golpe de forma simplificada; a execução fina se treina no tatame.</p>`;
  $$('.faixa-chip').forEach(b => b.onclick = () => { if (b.disabled) return; store.set('faixa', b.dataset.f); rotear(); });
  $$('.perfil-chip[data-p]').forEach(b => b.onclick = () => { trocarPerfil(b.dataset.p); rotear(); });
  $('#somToggle').onclick = () => { FX.setSom(!FX.somLigado()); if (FX.somLigado()) FX.som('acerto'); inicio(); };
}
function proxima(f) { const v = vistos(); return tecnicasDa(f.id).find(t => !v[t.id]); }

/* ── Cadastro de judoca (primeiro acesso e "+ Judoca") */
function cadastro(primeiro) {
  if (!primeiro && perfis().length >= limitePerfis()) { location.hash = '#/perfis'; return; }
  cab(primeiro ? 'Bem-vindo ao Dojô' : 'Novo judoca', primeiro ? null : '#/perfis'); aba('');
  const quiz = primeiro ? quizSalvo() : null;
  const faixaIni = (quiz && quiz.faixa) || raw.get('faixaPlano') || 'azul';
  view.innerHTML = `
    <div class="cadastro">
      <h1>${primeiro ? 'Quem vai estudar?' : 'Adicionar judoca'}</h1>
      <p class="muted">${primeiro ? 'O progresso e as notas dos simulados ficam salvos neste aparelho, em nome do judoca.' : `O Plano Família permite até ${limitePerfis()} judocas, cada um com o próprio progresso.`}</p>
      <label class="campo-l"><span>Nome do judoca</span>
        <input id="cNome" class="busca" maxlength="20" autocomplete="off" placeholder="Primeiro nome" value="${esc((quiz && quiz.nome) || '')}"></label>
      <p class="campo-l"><span>Faixa do próximo exame</span></p>
      <div class="faixas-grade">${FAIXAS.map(x => `<button class="faixa-chip ${x.id === faixaIni ? 'on' : ''}" data-f="${x.id}" ${liberada(x.id) ? '' : 'disabled'}><i style="background:${x.cor}"></i>${x.nome}</button>`).join('')}</div>
      <p class="erro-campo" id="cErro" hidden>Escreva o nome do judoca para continuar.</p>
      <button class="btn" id="cOk">${primeiro ? 'Começar a estudar' : 'Adicionar judoca'}</button>
    </div>`;
  let faixa = faixaIni;
  $$('.faixas-grade .faixa-chip').forEach(b => b.onclick = () => { if (b.disabled) return; faixa = b.dataset.f; $$('.faixas-grade .faixa-chip').forEach(x => x.classList.toggle('on', x === b)); });
  $('#cOk').onclick = () => {
    const nome = $('#cNome').value.trim();
    if (!nome) { $('#cErro').hidden = false; $('#cNome').focus(); return; }
    if (plano() === 'essencial' && !raw.get('faixaPlano')) { raw.set('faixaPlano', faixa); Acesso.salvarFaixa(faixa); }
    criarPerfil(nome, faixa); location.hash = '#/'; rotear();
  };
  $('#cNome').addEventListener('keydown', e => { if (e.key === 'Enter') $('#cOk').click(); });
}

/* ── Gerenciar judocas */
function telaPerfis() {
  cab('Judocas', '#/'); aba('');
  const lista = perfis(), lim = limitePerfis(), eu = perfilAtual();
  view.innerHTML = `
    <h1 class="tit-pagina">Judocas deste acesso</h1>
    <ul class="perfis-lista">${lista.map(p => {
      const f = FAIXAS.find(x => x.id === raw.get(`p_${p.id}_faixa`, 'azul')) || FAIXAS[0];
      const v = raw.get(`p_${p.id}_vistos`, {}), n = tecnicasDa(f.id).filter(t => v[t.id]).length;
      return `<li data-p="${p.id}">
        <span class="avatar">${esc(p.nome.trim()[0] || '?').toUpperCase()}</span>
        <span class="pl-info"><b>${esc(p.nome)}</b><span><i class="belt-swatch" style="background:${f.cor}"></i> Faixa ${f.nome.toLowerCase()} · ${n}/${tecnicasDa(f.id).length} revisadas</span></span>
        <span class="pl-acoes">
          ${p.id === eu.id ? '<em>Estudando</em>' : `<button data-acao="usar">Usar</button>`}
          <button data-acao="renomear" aria-label="Renomear ${esc(p.nome)}">Renomear</button>
          ${lista.length > 1 ? `<button data-acao="apagar" class="perigo" aria-label="Apagar ${esc(p.nome)}">Apagar</button>` : ''}
        </span>
      </li>`; }).join('')}</ul>
    ${lista.length < lim ? '<a class="btn dark" href="#/novo-perfil">Adicionar judoca</a>'
      : lim === 1 ? '<p class="aviso">Tem mais de um judoca em casa? O Plano Família libera até 3 judocas no mesmo acesso, cada um com o próprio progresso.</p>'
      : `<p class="aviso">Você já usa os ${lim} judocas do Plano Família.</p>`}
    ${Acesso.ligado ? `<div class="conta">
      <p><span class="muted">Conectado como</span> <b>${esc(Acesso.email() || '')}</b></p>
      <button class="btn ghost" id="sairConta">Sair desta conta</button>
    </div>` : ''}`;
  if ($('#sairConta')) $('#sairConta').onclick = () => { if (confirm('Sair da conta neste aparelho? O progresso dos judocas continua salvo aqui.')) Acesso.sair(); };
  $$('.perfis-lista li').forEach(li => li.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = li.dataset.p, p = perfis().find(x => x.id === id);
    if (b.dataset.acao === 'usar') { trocarPerfil(id); location.hash = '#/'; }
    if (b.dataset.acao === 'renomear') {
      const novo = (prompt('Novo nome do judoca:', p.nome) || '').trim().slice(0, 20);
      if (novo) { salvarPerfis(perfis().map(x => x.id === id ? { ...x, nome: novo } : x)); telaPerfis(); }
    }
    if (b.dataset.acao === 'apagar' && confirm(`Apagar ${p.nome}? O progresso e as notas dele saem deste aparelho e não dá para recuperar.`)) { apagarPerfil(id); telaPerfis(); }
  });
}

/* ── Lista de aulas */
function aulas(fid) {
  const todas = location.hash.includes('?todas');
  const f = FAIXAS.find(x => x.id === (fid || '').split('?')[0]) || faixaAtual();
  cab(todas ? 'Revisão até a ' + f.nome.toLowerCase() : 'Aulas da faixa ' + f.nome.toLowerCase(), '#/'); aba('aulas');
  const lista = todas ? tecnicasAte(f.id).filter(t => t.f !== f.id) : tecnicasDa(f.id);
  const v = vistos();
  const grupos = {};
  lista.forEach(t => (grupos[t.g] = grupos[t.g] || []).push(t));
  view.innerHTML = `
    ${capa('sensei', todas ? 'Revisão' : 'Aulas · ' + f.kyu, todas ? 'Faixas anteriores' : 'Faixa ' + f.nome.toLowerCase(), `${lista.filter(t => v[t.id]).length} de ${lista.length} técnicas revisadas`)}
    ${todas ? '' : `<div class="faixas-esc">${FAIXAS.map(x => `<a class="faixa-chip ${x.id === f.id ? 'on' : ''}" href="#/aulas/${x.id}" ${liberada(x.id) ? '' : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}><i style="background:${x.cor}"></i>${x.nome}</a>`).join('')}</div>`}
    <input class="busca" type="search" placeholder="Buscar técnica pelo nome ou tradução" aria-label="Buscar técnica">
    <div id="grupos">${Object.entries(grupos).map(([g, ts]) => `
      <section data-g>
        <h2 class="grupo-tit">${GRUPOS[g].nome} <small>· ${GRUPOS[g].desc}</small></h2>
        <ul class="tec-lista">${ts.map(t => `
          <li class="tec-item" data-busca="${esc((t.n + ' ' + t.tr).toLowerCase())}"><a href="#/aula/${t.id}">
            <span class="tec-thumb" data-spec="${t.a}"></span>
            <span><b>${esc(t.n)}</b><span class="tr">${esc(t.tr)}</span></span>
            <span class="tec-ok ${v[t.id] ? 'sim' : ''}" aria-label="${v[t.id] ? 'Revisada' : 'Não revisada'}">✓</span>
          </a></li>`).join('')}</ul>
      </section>`).join('')}</div>`;
  $$('.tec-thumb').forEach(el => {
    const st = new JudoStage(el, { spec: el.dataset.spec, belt: f.cor });
    const fr = st.frames[Math.min(4, st.frames.length - 1)]; st.cur = { T: fr.T, U: fr.U }; st.render();
  });
  $('.busca').oninput = e => {
    const q = e.target.value.toLowerCase().trim();
    $$('.tec-item').forEach(li => li.hidden = q && !li.dataset.busca.includes(q));
    $$('[data-g]').forEach(s => s.hidden = !s.querySelector('.tec-item:not([hidden])'));
  };
}

/* ── Aula */
function aula(id) {
  const t = TECNICAS.find(x => x.id === id);
  if (!t) { location.hash = '#/aulas'; return; }
  const f = FAIXAS.find(x => x.id === t.f);
  cab(t.n, '#/aulas/' + t.f); aba('aulas');
  document.documentElement.style.setProperty('--faixa', f.cor);
  const lista = tecnicasDa(t.f), i = lista.indexOf(t);
  const ant = lista[i - 1], prox = lista[i + 1];
  const G = GRUPOS[t.g];
  const prefs = store.get('prefs', { lento: false, canhoto: false, voz: true });
  view.innerHTML = `
    <div class="aula-cab">
      <h1>${esc(t.n)}</h1>
      <p class="tr">${esc(t.tr)}</p>
      <p class="meta">${G.nome}, ${G.desc} · faixa ${f.nome.toLowerCase()}</p>
    </div>
    <div class="aula" id="player">
      <div class="stage"></div>
      <div class="fases">${['Nome', ...G.fases, 'Erro'].map((x, k) => `<button data-fase="${k}">${x}</button>`).join('')}</div>
      <div class="caption" aria-live="polite"></div>
      <div class="controles">
        <button class="play" id="bPlay">${ICON.play}<span>Assistir a aula</span></button>
        <button id="bVoz" aria-pressed="${prefs.voz}" aria-label="Narração">${ICON.som}</button>
        <button id="bLento" aria-pressed="${prefs.lento}">Lento</button>
        <button id="bCanhoto" aria-pressed="${prefs.canhoto}">Canhoto</button>
      </div>
    </div>
    <div class="aula-extra">
      <ul class="passos">
        ${G.fases.map((x, k) => `<li><b>${x}</b><span>${esc(t.p[k])}</span></li>`).join('')}
        <li class="erro"><b>Erro que reprova</b><span>${esc(t.e)}</span></li>
      </ul>
      <button class="revisada ${vistos()[t.id] ? 'sim' : ''}" id="bRev">${vistos()[t.id] ? '✓ Revisada' : 'Marcar como revisada'}</button>
      <div class="aula-nav">
        ${ant ? `<a href="#/aula/${ant.id}">Anterior<b>${esc(ant.n)}</b></a>` : '<span></span>'}
        ${prox ? `<a class="prox" href="#/aula/${prox.id}">Próxima<b>${esc(prox.n)}</b></a>` : '<span></span>'}
      </div>
    </div>`;
  const root = $('#player');
  const player = new AulaPlayer(root, t, {
    belt: f.cor,
    onEnd: () => { setPlay(false); marcar(true); },
  });
  player.stage.speed = prefs.lento ? 0.5 : 1;
  player.stage.setMirror(prefs.canhoto);
  Voz.on = prefs.voz;
  player.show(player.roteiro()[0], 0);
  onLeave(() => player.stop());
  const setPlay = on => { $('#bPlay').innerHTML = (on ? ICON.stop : ICON.play) + `<span>${on ? 'Parar' : 'Assistir a aula'}</span>`; };
  $('#bPlay').onclick = () => { if (player.playing) { player.stop(); setPlay(false); } else { setPlay(true); player.play(0); } };
  $$('#player .fases button').forEach(b => b.onclick = () => { setPlay(true); player.play(+b.dataset.fase); });
  const toggle = (btn, key, apply) => $(btn).onclick = e => {
    prefs[key] = !prefs[key]; e.currentTarget.setAttribute('aria-pressed', prefs[key]); store.set('prefs', prefs); apply(prefs[key]);
  };
  toggle('#bVoz', 'voz', on => { Voz.on = on; if (!on) Voz.stop(); });
  toggle('#bLento', 'lento', on => player.stage.speed = on ? 0.5 : 1);
  toggle('#bCanhoto', 'canhoto', on => player.stage.setMirror(on));
  function marcar(sim) {
    const v = vistos(), nova = sim && !v[t.id];
    if (sim) v[t.id] = v[t.id] || Date.now(); else delete v[t.id]; store.set('vistos', v);
    $('#bRev').classList.toggle('sim', sim); $('#bRev').textContent = sim ? '✓ Revisada' : 'Marcar como revisada';
    if (!nova) return;
    // primeira vez que revisa esta técnica: pontos + comemoração
    const btn = $('#bRev'); btn.classList.remove('acerto-pulso'); void btn.offsetWidth; btn.classList.add('acerto-pulso');
    Progresso.ganhar(PONTOS.aula, btn); FX.som('acerto'); FX.vibrar(25);
    const daFaixa = tecnicasDa(t.f), feitas = daFaixa.filter(x => v[x.id]).length;
    if (feitas === daFaixa.length) {
      FX.celebrar({ titulo: `Faixa ${f.nome.toLowerCase()} dominada!`, texto: `${esc(perfilAtual().nome)} revisou as ${daFaixa.length} técnicas novas. Agora é treinar o simulado até tirar 80% ou mais.`, cor: f.cor, botao: 'Ir para o simulado' });
      setTimeout(() => { const b = document.querySelector('.fx-celebra .btn'); if (b) b.addEventListener('click', () => { location.hash = '#/simulado'; }); }, 50);
    } else {
      FX.aviso(`Aula concluída · ${feitas} de ${daFaixa.length} da faixa ${f.nome.toLowerCase()}`, 'ok');
    }
    Progresso.verificar();
  }
  $('#bRev').onclick = () => marcar(!vistos()[t.id]);
}

/* ── Gerador de questões */
function questoesTecnica(t, pool) {
  const outros = pool.filter(x => x.id !== t.id);
  const tema = ['OSA', 'SHIME', 'KAN', 'UKEMI'].includes(t.g) ? 'Solo e quedas' : 'Projeções';
  const q4 = (certa, erradas) => { const o = embaralhar([certa, ...embaralhar([...new Set(erradas)].filter(x => x !== certa)).slice(0, 3)]); return { o, c: o.indexOf(certa) }; };
  const tipos = [
    () => ({ q: `O que significa "${t.n}"?`, ...q4(t.tr, outros.map(x => x.tr)), x: `${t.n} = ${t.tr.toLowerCase()}.`, t: 'Terminologia' }),
    () => ({ q: `Qual técnica significa "${t.tr.toLowerCase()}"?`, ...q4(t.n, outros.map(x => x.n)), x: `${t.tr} é ${t.n}.`, t: 'Terminologia' }),
    () => ({ q: `${t.n} pertence a qual grupo?`, ...q4(`${GRUPOS[t.g].nome} (${GRUPOS[t.g].desc})`, Object.values(GRUPOS).map(g => `${g.nome} (${g.desc})`)), x: `${t.n} é ${GRUPOS[t.g].nome}: ${GRUPOS[t.g].desc}.`, t: 'Fundamentos' }),
    () => ({ q: `Qual é o erro que mais reprova em ${t.n}?`, ...q4(t.e, outros.filter(x => x.g === t.g).concat(outros).map(x => x.e)), x: t.e, t: tema }),
    () => { const k = Math.floor(Math.random() * 3), fase = GRUPOS[t.g].fases[k];
      return { q: `Em ${t.n}, o que acontece na fase "${fase}"?`, ...q4(t.p[k], outros.filter(x => x.g === t.g).concat(outros).map(x => x.p[k])), x: `${fase}: ${t.p[k]}`, t: tema }; },
  ];
  if (!['OSA', 'SHIME', 'KAN'].includes(t.g)) {
    tipos.push(() => { const kind = t.a.split(':')[0]; const dif = outros.filter(x => x.a.split(':')[0] !== kind && !['OSA', 'SHIME', 'KAN'].includes(x.g));
      return { q: 'Qual é este golpe?', anim: t.a, ...q4(t.n, dif.map(x => x.n)), x: `É ${t.n}: ${t.tr.toLowerCase()}.`, t: 'Visual' }; });
  }
  return tipos[Math.floor(Math.random() * tipos.length)]();
}
function montarProva(faixaId, n, foco) {
  const pool = tecnicasAte(faixaId), novas = tecnicasDa(faixaId);
  const out = [];
  const nTeoria = foco === 'teoria' ? n : foco === 'tecnica' ? 0 : Math.round(n * 0.3);
  embaralhar(TEORIA).slice(0, nTeoria).forEach(q => { const o = embaralhar(q.o); out.push({ q: q.q, o, c: o.indexOf(q.o[q.c]), x: q.x, t: q.t }); });
  const base = embaralhar([...novas, ...novas, ...pool]);
  for (let i = 0; out.length < n && i < base.length * 3; i++) {
    const t = base[i % base.length]; const q = questoesTecnica(t, pool);
    if (!out.some(x => x.q === q.q)) out.push(q);
  }
  return embaralhar(out);
}

/* ── Simulado */
function simulado() {
  cab('Simulado', '#/'); aba('simulado');
  const f = faixaAtual();
  const cfg = store.get('simcfg', { n: 20, foco: 'tudo', imediata: true });
  const hist = store.get('historico', []).filter(h => h.faixa === f.id).slice(-5).reverse();
  view.innerHTML = `
    ${capa('coach', 'Simulado', 'Faixa ' + f.nome.toLowerCase(), 'Questões sorteadas a cada prova, com técnicas da sua faixa e das anteriores.')}
    <div class="sim-config">
      <label><span>Quantas questões</span><div class="seg" data-k="n">${[10, 20, 30, 50].map(x => `<button data-v="${x}" class="${cfg.n === x ? 'on' : ''}">${x}</button>`).join('')}</div></label>
      <label><span>O que cobrar</span><div class="seg" data-k="foco">${[['tudo', 'Exame completo'], ['tecnica', 'Só técnicas'], ['teoria', 'Só teoria']].map(([v, l]) => `<button data-v="${v}" class="${cfg.foco === v ? 'on' : ''}">${l}</button>`).join('')}</div></label>
      <label><span>Correção</span><div class="seg" data-k="imediata">${[[true, 'A cada questão'], [false, 'Só no final']].map(([v, l]) => `<button data-v="${v}" class="${cfg.imediata === v ? 'on' : ''}">${l}</button>`).join('')}</div></label>
      <button class="btn" id="começar">Começar a prova</button>
    </div>
    ${hist.length ? `<p class="hist">Últimas notas: ${hist.map(h => h.nota + '%').join(' · ')}</p>` : ''}`;
  $$('.seg').forEach(s => s.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    let v = b.dataset.v; v = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v;
    cfg[s.dataset.k] = v; store.set('simcfg', cfg);
    s.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#começar').onclick = () => prova(montarProva(f.id, cfg.n, cfg.foco), cfg, f);
}

function prova(qs, cfg, f) {
  const resp = new Array(qs.length).fill(null);
  let i = 0, stage = null, seguidas = 0, melhorSeq = 0;
  const FRASES = { 3: '🔥 3 seguidas!', 5: '🔥 5 seguidas! Embalou!', 10: '⚡ 10 seguidas! Imparável!', 15: '🏆 15 seguidas!', 20: '🏆 20 seguidas! Lenda do dojô!' };
  onLeave(() => stage && stage.stop());
  const render = () => {
    const q = qs[i];
    if (stage) stage.stop();
    view.innerHTML = `
      <div class="q-topo"><span>Questão ${i + 1} de ${qs.length}</span><span class="q-seq">${cfg.imediata && seguidas >= 2 ? `🔥 ${seguidas} seguidas` : ''}</span><span class="q-tema">${q.t}</span></div>
      <div class="obi"><div class="obi-fill" style="width:${(i / qs.length) * 100}%"></div><div class="obi-knot" style="left:${(i / qs.length) * 100}%"></div></div>
      <p class="q-enunciado">${esc(q.q)}</p>
      ${q.anim ? '<div class="stage q-stage" id="qStage"></div>' : ''}
      <div class="q-ops">${q.o.map((o, k) => `<button class="q-op" data-k="${k}"><i>${'abcd'[k]}</i><span>${esc(o)}</span></button>`).join('')}</div>
      <div id="qFim"></div>`;
    if (q.anim) { stage = new JudoStage($('#qStage'), { spec: q.anim, belt: '#F4F5F2' }); stage.playAll(true); }
    $$('.q-op').forEach(b => b.onclick = () => {
      if (resp[i] !== null) return;
      const k = +b.dataset.k; resp[i] = k;
      if (k === q.c) { seguidas++; melhorSeq = Math.max(melhorSeq, seguidas); } else seguidas = 0;
      if (cfg.imediata) {
        if (k === q.c) {
          b.classList.add('acerto-pulso'); FX.som('acerto'); FX.vibrar(20);
          Progresso.ganhar(PONTOS.acerto, b);
          if (FRASES[seguidas]) { FX.aviso(FRASES[seguidas], 'ouro'); if (seguidas >= 5) FX.confete(60, [innerWidth / 2, innerHeight * .5]); }
        } else { b.classList.add('erro-treme'); FX.som('erro'); FX.vibrar([15, 40, 15]); if (melhorSeq >= 3 && seguidas === 0) FX.aviso('A sequência zerou. Bora de novo!', 'erro', 1600); }
        const sq = document.querySelector('.q-seq'); if (sq) sq.textContent = seguidas >= 2 ? `🔥 ${seguidas} seguidas` : '';
        $$('.q-op').forEach(x => { if (+x.dataset.k === q.c) x.classList.add('certa'); else if (x === b) x.classList.add('errada'); });
        $('#qFim').innerHTML = `<div class="q-exp ${k === q.c ? 'ok' : 'no'}"><b>${k === q.c ? 'Certo.' : 'Resposta: ' + esc(q.o[q.c]) + '.'}</b> ${esc(q.x)}</div>
          <button class="btn dark" id="qProx" style="margin-top:12px">${i + 1 < qs.length ? 'Próxima' : 'Ver resultado'}</button>`;
        $('#qProx').onclick = avancar; $('#qProx').focus();
      } else { b.classList.add('certa'); setTimeout(avancar, 250); }
    });
  };
  const avancar = () => { if (i + 1 < qs.length) { i++; render(); window.scrollTo(0, 0); } else resultado(); };
  const resultado = () => {
    if (stage) stage.stop();
    const acertos = qs.filter((q, k) => resp[k] === q.c).length;
    const nota = Math.round(acertos / qs.length * 100);
    const temas = {};
    qs.forEach((q, k) => { temas[q.t] = temas[q.t] || [0, 0]; temas[q.t][1]++; if (resp[k] === q.c) temas[q.t][0]++; });
    const hist = store.get('historico', []); hist.push({ faixa: f.id, nota, data: Date.now(), n: qs.length }); store.set('historico', hist.slice(-50));
    view.innerHTML = `
      <div class="res-nota"><div class="num">${nota}%</div><p>${acertos} de ${qs.length} certas · ${nota >= 80 ? 'pronto para a banca' : nota >= 60 ? 'quase lá: revise os temas abaixo' : 'volte às aulas dos temas mais fracos'}</p></div>
      <div class="temas">${Object.entries(temas).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([t, [a, n]]) => `
        <div class="tema-l"><span>${t}</span><span class="barra-t"><i style="width:${a / n * 100}%"></i></span><b>${a}/${n}</b></div>`).join('')}</div>
      <button class="btn" id="denovo">Fazer outra prova</button>
      <h2 class="sub-tit">Gabarito comentado</h2>
      <div class="gabarito">${qs.map((q, k) => `<div class="gab ${resp[k] === q.c ? '' : 'no'}"><b>${k + 1}. ${esc(q.q)}</b>
        ${resp[k] === q.c ? '' : `Você marcou: ${esc(q.o[resp[k]] ?? '—')}<br>`}Certa: ${esc(q.o[q.c])}. ${esc(q.x)}</div>`).join('')}</div>`;
    $('#denovo').onclick = () => simulado();
    window.scrollTo(0, 0);
    // comemoração do resultado
    Progresso.registrarSequencia(melhorSeq);
    if (!cfg.imediata && acertos) Progresso.ganhar(acertos * PONTOS.acerto, $('.res-nota .num'));
    if (nota >= 80) Progresso.ganhar(PONTOS.notaAlta, $('.res-nota .num'));
    const nome = esc(perfilAtual().nome);
    if (nota === 100) FX.celebrar({ titulo: 'Gabaritou!', texto: `${nome} acertou todas as ${qs.length} questões. A banca que se prepare.`, cor: f.cor, botao: 'Ver o gabarito' });
    else if (nota >= 80) FX.celebrar({ titulo: 'Pronto para a banca!', texto: `${nota}% de acerto. Faça mais um simulado amanhã para chegar no exame com folga.`, cor: f.cor, botao: 'Ver o gabarito' });
    else if (nota >= 60) { FX.som('acerto'); FX.aviso(`${nota}%: quase lá! Revise os temas com a barra mais curta.`, 'ok', 3200); }
    else FX.aviso('Cada prova ensina. Volte nas aulas e tente de novo.', 'erro', 3200);
    if (melhorSeq >= 5) $('.res-nota p').insertAdjacentHTML('afterend', `<p class="res-seq">🔥 Melhor sequência: ${melhorSeq} acertos seguidos</p>`);
    Progresso.verificar();
  };
  render();
}

/* ── Modo banca: o app pede o golpe como o sensei, você mostra */
function banca() {
  cab('Modo banca', '#/'); aba('banca');
  const f = faixaAtual();
  let ordem = embaralhar(tecnicasAte(f.id)), i = 0, timer = null, stage = null, alive = true;
  onLeave(() => { alive = false; clearInterval(timer); stage && stage.stop(); });
  const render = () => {
    const t = ordem[i % ordem.length];
    view.innerHTML = `
      ${capa('judoca', 'Modo banca', 'O app pede, você mostra', 'Fique em pé, com espaço. Execute no ar ou com um parceiro e depois confira a animação.')}
      <div class="banca-card">
        <p class="pede">A banca pede:</p>
        <p class="nome">${esc(t.n)}</p>
        <div class="banca-timer" id="timer">10</div>
      </div>
      <div class="banca-revela" id="revela"></div>
      <div class="controles" style="margin-top:12px">
        <button id="bMostrar">Conferir agora</button>
        <button class="play" id="bProx">${ICON.play}<span>Próximo golpe</span></button>
      </div>`;
    Voz.say('Mostre: ' + t.n);
    let s = 10; clearInterval(timer);
    timer = setInterval(() => { if (!alive) return clearInterval(timer); s--; const el = $('#timer'); if (el) el.textContent = s; if (s <= 0) { clearInterval(timer); revelar(t); } }, 1000);
    $('#bMostrar').onclick = () => { clearInterval(timer); revelar(t); };
    $('#bProx').onclick = () => {
      store.set('banca', store.get('banca', 0) + 1); Progresso.ganhar(PONTOS.banca, $('#bProx')); FX.som('ponto'); Progresso.verificar();
      i++; if (stage) stage.stop(); render();
    };
  };
  const revelar = t => {
    const r = $('#revela'); if (!r || r.dataset.ok) return; r.dataset.ok = 1;
    $('#timer').textContent = '✓';
    r.innerHTML = `<div class="aula"><div class="stage"></div><div class="caption"><span class="cap-fase">${esc(t.tr)}</span><span class="cap-txt">${esc(t.p[2])}</span></div><a class="btn ghost" href="#/aula/${t.id}">Ver a aula completa</a></div>`;
    stage = new JudoStage(r.querySelector('.stage'), { spec: t.a, belt: f.cor }); stage.playAll(true);
  };
  render();
}

/* ── Glossário */
function glossario() {
  cab('Termos do exame', '#/'); aba('glossario');
  view.innerHTML = `
    <input class="busca" type="search" placeholder="Buscar termo" aria-label="Buscar termo">
    <ul class="termos">${GLOSSARIO.map(([j, p]) => `<li data-b="${esc((j + ' ' + p).toLowerCase())}"><span><b>${j}</b><span>${p}</span></span><button class="ouvir" data-t="${j}" aria-label="Ouvir ${j}">${ICON.som}</button></li>`).join('')}</ul>`;
  $$('.ouvir').forEach(b => b.onclick = () => { const was = Voz.on; Voz.on = true; Voz.stop(); Voz.say(b.dataset.t); Voz.on = was; });
  $('.busca').oninput = e => { const q = e.target.value.toLowerCase(); $$('.termos li').forEach(li => li.hidden = q && !li.dataset.b.includes(q)); };
}

Acesso.iniciar(rotear);

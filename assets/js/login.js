/* Dojô de Bolso: acesso fechado.
   Com CONFIG.acessoFechado = true, o app só abre para quem comprou:
   e-mail + senha, o plano vem da compra registrada pela Cakto (functions/api/*).
   Sem internet, o último acesso confirmado vale por 7 dias. */
const Acesso = (function () {
  const LIGADO = !!CONFIG.acessoFechado;
  const OFFLINE_DIAS = 7;
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem('dojo_' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('dojo_' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('dojo_' + k); } catch (e) {} },
  };
  let liberado = !LIGADO;

  function aparelho() {
    let id = ls.get('aparelho');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '');
      ls.set('aparelho', id);
    }
    return id;
  }

  async function api(caminho, { method = 'GET', body } = {}) {
    const token = ls.get('token');
    const r = await fetch('/api/' + caminho, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let dados = {}; try { dados = await r.json(); } catch (e) {}
    return { status: r.status, ...dados };
  }

  /* O plano confirmado pelo servidor vira o estado que o app já usa (dojo_plano, dojo_familia...) */
  function aplicar(a) {
    ls.set('plano', a.plano); ls.set('familia', !!a.familia); ls.set('fichas', !!a.fichas); ls.set('kit', !!a.kit);
    if (a.faixaPlano) ls.set('faixaPlano', a.faixaPlano); else if (a.plano !== 'essencial') ls.del('faixaPlano');
    ls.set('email', a.email); ls.set('confirmadoEm', Date.now());
    liberado = true;
  }
  function sair(msg) {
    ['token', 'confirmadoEm', 'plano', 'familia', 'fichas', 'kit', 'faixaPlano'].forEach(ls.del);
    liberado = false;
    tela(msg);
  }

  /* Na abertura: confere a sessão no servidor */
  async function iniciar(seguir) {
    if (!LIGADO) { seguir(); return; }
    // O login mora no domínio próprio (é onde as functions rodam)
    if (CONFIG.dominio && location.hostname.endsWith('github.io')) {
      location.replace(CONFIG.dominio + '/app/' + location.hash); return;
    }
    if (!ls.get('token')) { tela(null, /primeiro-acesso/.test(location.hash) ? 'primeiro' : null); return; }
    const cache = ls.get('confirmadoEm');
    const cacheOk = cache && Date.now() - cache < OFFLINE_DIAS * 864e5;
    if (cacheOk) { liberado = true; seguir(); }          // abre na hora e confere por trás
    try {
      const r = await api('acesso');
      if (r.ok) { aplicar(r.acesso); if (!cacheOk) seguir(); return; }
      if (r.status === 401 || r.status === 403) { sair(r.erro); return; }
      if (!cacheOk) tela('Não conseguimos confirmar o seu acesso agora. Confira a internet e tente de novo.');
    } catch (e) {
      if (!cacheOk) tela('Sem internet. Conecte-se uma vez para confirmar o seu acesso.');
    }
  }

  /* ── Tela de login */
  function tela(aviso, modo) {
    liberado = false;
    const view = document.getElementById('view');
    document.body.classList.add('modo-login');
    const emailSalvo = ls.get('email') || '';
    const primeiro = modo === 'primeiro';
    view.innerHTML = `
      <div class="login">
        <span class="login-selo" aria-hidden="true"></span>
        <h1>${primeiro ? 'Criar o seu acesso' : 'Entrar no Dojô'}</h1>
        <p class="muted">${primeiro
          ? 'Use o <b>mesmo e-mail do pagamento</b> e os <b>4 últimos números do celular</b> que você informou na compra.'
          : 'Use o e-mail da compra e a senha que você criou.'}</p>
        ${aviso ? `<p class="login-aviso">${aviso}</p>` : ''}
        <form id="fLogin" novalidate>
          <label class="campo-l"><span>E-mail da compra</span>
            <input class="busca" id="lEmail" type="email" autocomplete="email" inputmode="email" required value="${emailSalvo.replace(/[&<>"]/g, '')}"></label>
          ${primeiro ? `<label class="campo-l"><span>4 últimos números do celular</span>
            <input class="busca" id="lDig" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="0000" required></label>` : ''}
          <label class="campo-l"><span>${primeiro ? 'Crie uma senha' : 'Senha'}</span>
            <input class="busca" id="lSenha" type="password" autocomplete="${primeiro ? 'new-password' : 'current-password'}" minlength="6" required
              ${primeiro ? 'placeholder="Mínimo de 6 caracteres"' : ''}></label>
          <p class="erro-campo" id="lErro" role="alert" hidden></p>
          <button class="btn" id="lOk" type="submit">${primeiro ? 'Criar acesso e entrar' : 'Entrar'}</button>
        </form>
        <p class="login-troca">${primeiro
          ? 'Já criou a senha? <a href="#" data-modo="entrar">Entrar</a>'
          : 'Primeira vez aqui? <a href="#" data-modo="primeiro">Criar meu acesso</a> · <a href="#" data-modo="primeiro">Esqueci a senha</a>'}</p>
        ${CONFIG.suporteWhatsapp ? `<p class="login-suporte">Problema para entrar? <a href="https://wa.me/${CONFIG.suporteWhatsapp}" target="_blank" rel="noopener">Fale com o suporte</a></p>` : ''}
        <p class="login-nota">Cada compra pode ficar conectada em até 2 aparelhos.</p>
      </div>`;
    view.querySelectorAll('[data-modo]').forEach(a => a.onclick = ev => { ev.preventDefault(); tela(null, a.dataset.modo); });
    const f = document.getElementById('fLogin'), bt = document.getElementById('lOk'), er = document.getElementById('lErro');
    const mostrarErro = m => { er.textContent = m; er.hidden = false; };
    f.onsubmit = async ev => {
      ev.preventDefault(); er.hidden = true;
      const email = document.getElementById('lEmail').value.trim();
      const senha = document.getElementById('lSenha').value;
      const corpo = { email, senha, aparelho: aparelho() };
      if (primeiro) corpo.digitos = document.getElementById('lDig').value;
      bt.disabled = true; const txt = bt.textContent; bt.textContent = 'Conferindo...';
      try {
        const r = await api(primeiro ? 'ativar' : 'entrar', { method: 'POST', body: corpo });
        if (r.ok) {
          ls.set('token', r.token); aplicar(r.acesso);
          document.body.classList.remove('modo-login');
          location.hash = '#/'; if (typeof rotear === 'function') rotear();
          try { track('AcessoLiberado', { plano: r.acesso.plano, primeiro }, true); } catch (e) {}
          return;
        }
        if (r.primeiroAcesso) { tela(r.erro, 'primeiro'); return; }
        mostrarErro(r.erro || 'Não deu certo. Tente de novo.');
      } catch (e) {
        mostrarErro('Sem conexão. Confira a internet e tente de novo.');
      }
      bt.disabled = false; bt.textContent = txt;
    };
    setTimeout(() => { const el = document.getElementById(emailSalvo ? 'lSenha' : 'lEmail'); if (el) el.focus(); }, 50);
  }

  /* Essencial: a faixa escolhida no primeiro cadastro fica gravada na conta */
  function salvarFaixa(faixa) {
    if (!LIGADO) return;
    api('acesso', { method: 'POST', body: { faixa } }).then(r => { if (r.ok && r.faixaPlano) ls.set('faixaPlano', r.faixaPlano); }).catch(() => {});
  }

  return {
    ligado: LIGADO,
    liberado: () => liberado,
    iniciar, tela, sair: () => sair(), salvarFaixa,
    email: () => ls.get('email'),
    modoPrimeiro: () => /primeiro-acesso/.test(location.hash),
  };
})();

/* Dojô de Bolso — efeitos de comemoração: confete, som, vibração e avisos.
   Respeita "reduzir movimento" do aparelho e o botão de som do app. */
const FX = {
  somLigado() { try { return JSON.parse(localStorage.getItem('dojo_som') ?? 'true'); } catch (e) { return true; } },
  setSom(on) { try { localStorage.setItem('dojo_som', JSON.stringify(on)); } catch (e) {} },
  calmo() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; },

  /* Confete nas cores das faixas */
  confete(qtd = 90, origem) {
    if (this.calmo()) return;
    const cv = document.createElement('canvas'); cv.className = 'fx-confete'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    const cores = ['#1F5FBF', '#F2C230', '#EE7A22', '#2E8B4E', '#6A3FA0', '#D0312D', '#FFFFFF'];
    const ox = (origem ? origem[0] : innerWidth / 2) * dpr, oy = (origem ? origem[1] : innerHeight * .35) * dpr;
    const ps = Array.from({ length: qtd }, () => {
      const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1, v = (8 + Math.random() * 10) * dpr;
      return { x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4, w: (6 + Math.random() * 8) * dpr, h: (3 + Math.random() * 4) * dpr, c: cores[Math.random() * cores.length | 0] };
    });
    const t0 = performance.now();
    const passo = now => {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += .32 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (now - t0 < 2600) requestAnimationFrame(passo); else cv.remove();
    };
    requestAnimationFrame(passo);
  },

  /* Sons curtos gerados na hora (sem baixar arquivo) */
  _ac: null,
  som(tipo) {
    if (!this.somLigado()) return;
    try {
      const ac = this._ac || (this._ac = new (window.AudioContext || window.webkitAudioContext)());
      const notas = { acerto: [[660, 0], [880, .09]], erro: [[220, 0], [196, .12]], conquista: [[523, 0], [659, .1], [784, .2], [1047, .3]], ponto: [[988, 0]] }[tipo] || [[660, 0]];
      notas.forEach(([f, d]) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + d;
        o.type = tipo === 'erro' ? 'triangle' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(tipo === 'erro' ? .12 : .18, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + .28);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .3);
      });
    } catch (e) {}
  },
  vibrar(ms) { try { if (navigator.vibrate && this.somLigado() && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) {} },

  /* Aviso que sobe da parte de baixo da tela */
  aviso(html, tipo = 'ok', ms = 2200) {
    let box = document.querySelector('.fx-avisos');
    if (!box) { box = document.createElement('div'); box.className = 'fx-avisos'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'fx-aviso ' + tipo; el.innerHTML = html; box.appendChild(el);
    setTimeout(() => { el.classList.add('sai'); setTimeout(() => el.remove(), 350); }, ms);
  },

  /* Número que sobe e some (+10) a partir de um elemento */
  pontos(el, txt) {
    if (!el || this.calmo()) return;
    const r = el.getBoundingClientRect(), s = document.createElement('span');
    s.className = 'fx-pontos'; s.textContent = txt; s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + 6) + 'px';
    document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
  },

  /* Tela cheia de comemoração (faixa completa, nota alta, conquista grande) */
  celebrar({ titulo, texto, cor = '#1E2647', botao = 'Continuar' }) {
    this.som('conquista'); this.vibrar([30, 60, 30]);
    const d = document.createElement('div'); d.className = 'fx-celebra'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', titulo);
    d.innerHTML = `<div class="fx-cartao">
      <svg class="fx-obi" viewBox="0 0 200 70" aria-hidden="true"><rect class="fx-obi-l" x="0" y="26" width="200" height="18" rx="3" fill="${cor}"/><g class="fx-no"><rect x="84" y="18" width="32" height="34" rx="5" fill="${cor}"/><rect x="88" y="44" width="10" height="26" rx="2" fill="${cor}" transform="rotate(18 93 44)"/><rect x="102" y="44" width="10" height="26" rx="2" fill="${cor}" transform="rotate(-18 107 44)"/></g></svg>
      <h2>${titulo}</h2><p>${texto}</p><button class="btn">${botao}</button></div>`;
    document.body.appendChild(d);
    const fechar = () => { d.classList.add('sai'); setTimeout(() => d.remove(), 300); };
    d.querySelector('button').onclick = fechar; d.onclick = e => { if (e.target === d) fechar(); };
    d.querySelector('button').focus();
    setTimeout(() => this.confete(140), 250);
  },
};

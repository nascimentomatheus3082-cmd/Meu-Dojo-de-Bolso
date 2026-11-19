/* Dojô de Bolso — pontos, dias seguidos e conquistas de cada judoca.
   Usa o `store` do app.js (dados separados por perfil). */
const PONTOS = { acerto: 10, aula: 20, notaAlta: 50, banca: 5 };

const CONQUISTAS = [
  { id: 'primeira-aula', emo: '🥋', nome: 'Primeiro passo', desc: 'Concluir a primeira aula', ok: c => c.aulas >= 1 },
  { id: 'cinco-aulas', emo: '📚', nome: 'Estudioso', desc: 'Revisar 5 técnicas', ok: c => c.aulas >= 5 },
  { id: 'vinte-aulas', emo: '🧠', nome: 'Enciclopédia', desc: 'Revisar 20 técnicas', ok: c => c.aulas >= 20 },
  { id: 'faixa-completa', emo: '🎖️', nome: 'Faixa dominada', desc: 'Revisar todas as técnicas novas de uma faixa', ok: c => c.faixaCompleta },
  { id: 'primeiro-simulado', emo: '📝', nome: 'Primeira prova', desc: 'Terminar um simulado', ok: c => c.provas >= 1 },
  { id: 'nota-80', emo: '✅', nome: 'Pronto para a banca', desc: 'Tirar 80% ou mais num simulado', ok: c => c.melhorNota >= 80 },
  { id: 'nota-100', emo: '🏆', nome: 'Gabaritou', desc: 'Acertar 100% de um simulado', ok: c => c.melhorNota >= 100 },
  { id: 'seq-5', emo: '🔥', nome: 'Embalado', desc: 'Acertar 5 questões seguidas', ok: c => c.melhorSeq >= 5 },
  { id: 'seq-10', emo: '⚡', nome: 'Imparável', desc: 'Acertar 10 questões seguidas', ok: c => c.melhorSeq >= 10 },
  { id: 'dias-3', emo: '📅', nome: 'Constância', desc: 'Estudar 3 dias seguidos', ok: c => c.diasSeguidos >= 3 },
  { id: 'dias-7', emo: '🗓️', nome: 'Uma semana de dojô', desc: 'Estudar 7 dias seguidos', ok: c => c.diasSeguidos >= 7 },
  { id: 'banca-10', emo: '🙇', nome: 'Encarou a banca', desc: 'Fazer 10 golpes no modo banca', ok: c => c.banca >= 10 },
];

const Progresso = {
  pontos() { return store.get('xp', 0); },
  nivel(xp = this.pontos()) {
    // nível n começa em 50·n·(n−1) pontos: 0, 100, 300, 600, 1000…
    let n = 1; while (50 * (n + 1) * n <= xp) n++;
    const ini = 50 * n * (n - 1), fim = 50 * (n + 1) * n;
    return { n, ini, fim, pct: Math.round((xp - ini) / (fim - ini) * 100) };
  },
  ganhar(n, el, motivo) {
    const antes = this.nivel();
    this.marcarDia(); // só conta como dia de estudo quando o judoca faz algo que dá ponto
    store.set('xp', this.pontos() + n);
    if (el) FX.pontos(el, '+' + n);
    const depois = this.nivel();
    if (depois.n > antes.n) setTimeout(() => { FX.aviso(`⭐ Subiu para o nível ${depois.n}!`, 'ouro', 2600); FX.som('conquista'); FX.confete(70); }, 500);
    return n;
  },

  hoje() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  marcarDia() {
    const dias = store.get('dias', []), h = this.hoje();
    if (!dias.includes(h)) { dias.push(h); store.set('dias', dias.slice(-120)); }
  },
  diasSeguidos() {
    const dias = new Set(store.get('dias', [])); let n = 0; const d = new Date();
    if (!dias.has(this.hoje())) d.setDate(d.getDate() - 1); // a sequência ainda vale se estudou ontem
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dias.has(k)) break; n++; d.setDate(d.getDate() - 1);
    }
    return n;
  },

  contexto(extra = {}) {
    const v = store.get('vistos', {}), hist = store.get('historico', []);
    const faixaCompleta = FAIXAS.some(f => tecnicasDa(f.id).every(t => v[t.id]));
    return Object.assign({
      aulas: Object.keys(v).length, provas: hist.length,
      melhorNota: hist.reduce((m, h) => Math.max(m, h.nota), 0),
      melhorSeq: store.get('melhorSeq', 0), diasSeguidos: this.diasSeguidos(),
      banca: store.get('banca', 0), faixaCompleta,
    }, extra);
  },
  /* Verifica e comemora conquistas novas. Retorna a lista das que acabaram de sair. */
  verificar(extra) {
    const tem = store.get('conquistas', {}), c = this.contexto(extra), novas = [];
    CONQUISTAS.forEach(q => { if (!tem[q.id] && q.ok(c)) { tem[q.id] = Date.now(); novas.push(q); } });
    if (novas.length) {
      store.set('conquistas', tem);
      novas.forEach((q, i) => setTimeout(() => { FX.aviso(`${q.emo} Conquista: <b>${q.nome}</b>`, 'ouro', 2800); FX.som('conquista'); }, 600 + i * 900));
    }
    return novas;
  },
  registrarSequencia(n) { if (n > store.get('melhorSeq', 0)) store.set('melhorSeq', n); },
};

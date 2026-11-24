/* Dojô de Bolso: palco 3D das aulas (Three.js).
   Usa os mesmos quadros-chave do anim.js (joints/framesFor): o motor 2D calcula as poses
   e aqui elas viram dois judocas em volume, num dojô com tatame e luz quente.
   - O Three.js é carregado sob demanda (assets/vendor/three.min.js), só quando uma aula 3D abre.
   - Sem WebGL ou sem o arquivo, o JudoStage continua em 2D (nada quebra).
   - Arrastar gira a câmera; pinça ou roda do mouse aproxima; toque duplo volta ao ângulo inicial. */
(function () {
  const BASE = (document.currentScript && document.currentScript.src) || location.href;
  const URL_THREE = new URL('../vendor/three.min.js', BASE).href;
  const S = 0.0185;               // metros por unidade do desenho 2D
  const CHAO = 170;               // GROUND do anim.js
  const LARG = { ombro: 0.19, quadril: 0.1 };
  const vivos = [];               // palcos abertos (para liberar WebGL dos que saíram da tela)
  let carga = null, webglOk = null;

  function temWebGL() {
    if (webglOk !== null) return webglOk;
    try { const c = document.createElement('canvas'); webglOk = !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { webglOk = false; }
    return webglOk;
  }
  function carregar() {
    if (window.THREE) return Promise.resolve(true);
    if (!temWebGL()) return Promise.resolve(false);
    if (!carga) carga = new Promise(res => {
      const s = document.createElement('script');
      s.src = URL_THREE; s.async = true;
      s.onload = () => res(!!window.THREE); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
    return carga;
  }

  /* ── Texturas desenhadas em canvas (sem arquivos extras) */
  function texTatame(T) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
    const g = c.getContext('2d');
    const tons = ['#C9B98C', '#C3B184', '#CDBE93', '#BFAE80'];
    // tatames 1 x 2 m em padrão alternado (cada quadrado da textura = 2 x 2 m)
    const pecas = [[0, 0, 512, 1024], [512, 0, 512, 512], [512, 512, 512, 512]];
    pecas.forEach(([x, y, w, h], i) => {
      g.fillStyle = tons[i % tons.length]; g.fillRect(x, y, w, h);
      g.globalAlpha = 0.08; g.strokeStyle = '#5b4a26';
      const horiz = w > h;
      for (let k = 0; k < (horiz ? h : w); k += 6) { g.beginPath(); if (horiz) { g.moveTo(x, y + k); g.lineTo(x + w, y + k); } else { g.moveTo(x + k, y); g.lineTo(x + k, y + h); } g.stroke(); }
      g.globalAlpha = 1; g.strokeStyle = 'rgba(70,52,22,.55)'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    });
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(4, 3); t.anisotropy = 4;
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  function texParede(T) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256); grad.addColorStop(0, '#1d1611'); grad.addColorStop(1, '#2b2018');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = T.SRGBColorSpace;
    return t;
  }

  /* ── Corpo de um judoca: cilindros e esferas que seguem as juntas do 2D */
  class Corpo {
    constructor(T, cena, look) {
      this.T = T; this.g = new T.Group(); cena.add(this.g);
      const mat = (cor, r = 0.85) => new T.MeshStandardMaterial({ color: cor, roughness: r, metalness: 0 });
      this.mGi = mat(look.gi); this.mGi2 = mat(look.gi2 || look.gi); this.mPele = mat(look.pele, 0.6);
      this.mCabelo = mat(look.cabelo || '#1b1410', 0.7); this.mFaixa = mat(look.faixa, 0.7);
      const cil = new T.CylinderGeometry(1, 1, 1, 14, 1);
      const esf = new T.SphereGeometry(1, 18, 14);
      const peca = (m, r) => { const me = new T.Mesh(cil, m); me.userData.r = r; me.castShadow = true; this.g.add(me); return me; };
      const bola = (m, r) => { const me = new T.Mesh(esf, m); me.scale.setScalar(r); me.castShadow = true; this.g.add(me); return me; };
      // tronco (achatado: largo na lateral) e barra do casaco
      this.tronco = peca(this.mGi, 0.16); this.saia = peca(this.mGi, 0.17);
      this.cabeca = bola(this.mPele, 0.112);
      // cabelo: calota só no alto e atrás da cabeça (o rosto fica à mostra)
      this.cabelo = new T.Mesh(new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.4), this.mCabelo);
      this.cabelo.scale.setScalar(0.119); this.cabelo.castShadow = true; this.g.add(this.cabelo);
      this.pescoco = peca(this.mPele, 0.05);
      this.faixa = new T.Mesh(new T.TorusGeometry(1, 0.16, 8, 24), this.mFaixa); this.faixa.castShadow = true; this.g.add(this.faixa);
      this.pontas = [peca(this.mFaixa, 0.022), peca(this.mFaixa, 0.022)];
      this.membros = {};
      for (const k of ['la', 'ra']) this.membros[k] = { o: bola(k === 'la' ? this.mGi : this.mGi2, 0.08), a: peca(k === 'la' ? this.mGi : this.mGi2, 0.068), j: bola(k === 'la' ? this.mGi : this.mGi2, 0.064), b: peca(k === 'la' ? this.mGi : this.mGi2, 0.06), m: bola(this.mPele, 0.05) };
      for (const k of ['ll', 'rl']) this.membros[k] = { o: bola(k === 'll' ? this.mGi : this.mGi2, 0.095), a: peca(k === 'll' ? this.mGi : this.mGi2, 0.088), j: bola(k === 'll' ? this.mGi : this.mGi2, 0.075), b: peca(k === 'll' ? this.mGi : this.mGi2, 0.07), m: bola(this.mPele, 0.05), pe: new T.Mesh(new T.BoxGeometry(1, 1, 1), this.mPele) };
      ['ll', 'rl'].forEach(k => { this.membros[k].pe.castShadow = true; this.g.add(this.membros[k].pe); });
      this.v = () => new T.Vector3();
      this._up = new T.Vector3(0, 1, 0); this._d = new T.Vector3(); this._q = new T.Quaternion();
    }
    setFaixa(c) { this.mFaixa.color.set(c); }
    /* liga um cilindro entre a e b (com raio r e achatamento opcional na lateral) */
    liga(me, a, b, achatar = 1) {
      this._d.subVectors(b, a); const len = Math.max(0.001, this._d.length());
      me.position.addVectors(a, b).multiplyScalar(0.5);
      me.quaternion.setFromUnitVectors(this._up, this._d.multiplyScalar(1 / len));
      const r = me.userData.r; me.scale.set(r * achatar, len, r);
    }
    draw(p, z0) {
      if (!p) { this.g.visible = false; return; }
      this.g.visible = true;
      const T = this.T;
      // poses do 2D com f = 1 (sem o "achatamento" do giro); o giro (f) vira rotação real do corpo no eixo Y.
      // Tudo é montado no referencial do próprio judoca (x = frente, z = lateral) e o grupo é girado.
      const L = joints(Object.assign({}, p, { x: 0, y: 0, f: 1 }));
      const f = Math.max(-1, Math.min(1, p.f));
      this.g.position.set((p.x - 150) * S, 0, z0);
      this.g.rotation.y = Math.acos(f);
      const yBase = (CHAO - p.y) * S;
      const P = (q, lz = 0) => new T.Vector3(q[0] * S, yBase - q[1] * S, lz);
      const quadril = P(L.hip), topo = P(L.top);
      // tronco: do quadril ao topo, achatado (peito largo na lateral)
      this.liga(this.tronco, quadril, topo, 0.62);
      const eixo = new T.Vector3().subVectors(topo, quadril).normalize();
      const baixo = quadril.clone().addScaledVector(eixo, -0.13);
      this.liga(this.saia, baixo, quadril.clone().addScaledVector(eixo, 0.06), 0.66);
      // cabeça e cabelo
      const cab = P(L.head); this.cabeca.position.copy(cab);
      const frenteCab = new T.Vector3(eixo.y, -eixo.x, 0); if (frenteCab.x < 0) frenteCab.negate();
      const polo = eixo.clone().addScaledVector(frenteCab, -0.55).normalize(); // inclinada para trás
      this.cabelo.position.copy(cab).addScaledVector(frenteCab, -0.012);
      this.cabelo.quaternion.setFromUnitVectors(this._up, polo);
      this.liga(this.pescoco, topo, cab);
      // faixa na cintura, perpendicular ao tronco
      const cint = quadril.clone().addScaledVector(eixo, 0.07);
      this.faixa.position.copy(cint);
      // anel perpendicular ao tronco: eixo local Z = tronco; X = frente/trás (estreito); Y = lateral (largo)
      const fx = new T.Vector3(eixo.y, -eixo.x, 0), fz = new T.Vector3(0, 0, 1);
      if (fx.x < 0) fx.negate();
      const fy = new T.Vector3().crossVectors(eixo, fx);
      this.faixa.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(fx, fy, eixo));
      this.faixa.scale.set(0.162 * 0.66, 0.162, 0.16);
      const frente = fx; // a frente do judoca (perpendicular ao tronco, no plano do golpe)
      const n1 = cint.clone().addScaledVector(frente, 0.1).addScaledVector(eixo, -0.01);
      this.liga(this.pontas[0], n1, n1.clone().addScaledVector(eixo, -0.17).addScaledVector(frente, 0.015).addScaledVector(fz, 0.02));
      this.liga(this.pontas[1], n1, n1.clone().addScaledVector(eixo, -0.15).addScaledVector(fz, -0.05).addScaledVector(frente, 0.02));
      // braços (ombros afastados na lateral) e pernas
      const lado = { la: LARG.ombro, ra: -LARG.ombro, ll: LARG.quadril, rl: -LARG.quadril };
      for (const k of ['la', 'ra', 'll', 'rl']) {
        const m = this.membros[k], seg = L[k], lz = lado[k];
        const a = P(seg[0], lz), j = P(seg[1], lz * 1.02), b = P(seg[2], lz * 1.04);
        m.o.position.copy(a); m.j.position.copy(j); m.m.position.copy(b);
        this.liga(m.a, a, j); this.liga(m.b, j, b);
        if (m.pe) {
          // pé: perpendicular à canela, para a frente do judoca
          const dx = seg[2][0] - seg[1][0], dy = seg[2][1] - seg[1][1], n = Math.hypot(dx, dy) || 1;
          const pf = P([seg[2][0] + (dy / n) * 6, seg[2][1] + (-dx / n) * 6], lz * 1.04);
          m.pe.position.addVectors(b, pf).multiplyScalar(0.5);
          m.pe.lookAt(pf); m.pe.scale.set(0.085, 0.06, Math.max(0.12, b.distanceTo(pf) * 1.6));
        }
      }
      this.g.updateMatrix(); // peito no referencial do "mundo" (o mesmo da seta, inclusive espelhado)
      this.peito = quadril.clone().lerp(topo, 0.66).applyMatrix4(this.g.matrix);
    }
    dispose() { this.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); [this.mGi, this.mGi2, this.mPele, this.mCabelo, this.mFaixa].forEach(m => m.dispose()); }
  }

  /* ── Palco: cena, luz, câmera orbital e renderização sob demanda */
  class Palco3D {
    constructor(container, opts = {}) {
      const T = window.THREE; this.T = T; this.container = container; this.aspecto = opts.aspecto || 1.6;
      container.classList.add('stage-3d');
      // preservar: mantém o quadro na tela para captura (usado só na geração de vídeos)
      const r = this.r = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: !!opts.preservar });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      r.domElement.className = 'stage-canvas'; r.domElement.setAttribute('role', 'img'); r.domElement.setAttribute('aria-label', 'Animação 3D do golpe');
      container.appendChild(r.domElement);

      const cena = this.cena = new T.Scene();
      cena.background = new T.Color('#141210'); cena.fog = new T.Fog('#141210', 7, 15);
      // tatame
      const chao = new T.Mesh(new T.PlaneGeometry(14, 10), new T.MeshStandardMaterial({ map: texTatame(T), roughness: 0.92 }));
      chao.rotation.x = -Math.PI / 2; chao.receiveShadow = true; cena.add(chao);
      // parede de madeira escura com frisos de luz quente (como no vídeo do quiz)
      const parede = new T.Mesh(new T.PlaneGeometry(14, 5), new T.MeshStandardMaterial({ map: texParede(T), roughness: 0.8 }));
      parede.position.set(0, 2.5, -3.4); cena.add(parede);
      const luzMat = new T.MeshBasicMaterial({ color: '#ffc27a' });
      for (const x of [-4.2, -1.4, 1.4, 4.2]) { const l = new T.Mesh(new T.PlaneGeometry(1.6, 0.06), luzMat); l.position.set(x, 2.35, -3.38); cena.add(l); }
      const rodape = new T.Mesh(new T.BoxGeometry(14, 0.12, 0.1), new T.MeshStandardMaterial({ color: '#3a2a1c', roughness: 0.7 }));
      rodape.position.set(0, 0.06, -3.35); cena.add(rodape);
      // luzes
      cena.add(new T.HemisphereLight('#fff0dc', '#3b2c1c', 0.75));
      const sol = new T.DirectionalLight('#ffe1b8', 2.4); sol.position.set(2.5, 5.5, 3.2); sol.castShadow = true;
      sol.shadow.mapSize.set(1024, 1024); Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 3, bottom: -1, near: 1, far: 14 }); sol.shadow.bias = -0.0008; sol.shadow.normalBias = 0.02;
      cena.add(sol);
      const recorte = new T.DirectionalLight('#9db4ff', 0.55); recorte.position.set(-3, 2.5, -2); cena.add(recorte);
      const quente = new T.PointLight('#ffb15c', 6, 9, 2); quente.position.set(0, 2.3, -2.6); cena.add(quente);

      this.mundo = new T.Group(); cena.add(this.mundo);
      this.tori = new Corpo(T, this.mundo, { gi: '#F4F2EC', gi2: '#E4E2DA', pele: '#C98F63', cabelo: '#1d1510', faixa: opts.belt || '#1E2647' });
      this.uke = new Corpo(T, this.mundo, { gi: '#1F4F9E', gi2: '#1A4386', pele: '#8A5A3A', cabelo: '#120d0a', faixa: '#14161c' });
      // seta do kuzushi (desequilíbrio)
      this.matSeta = new T.MeshBasicMaterial({ color: '#E0443F', transparent: true, opacity: 0, depthTest: false });
      this.seta = new T.Mesh(new T.BufferGeometry(), this.matSeta); this.seta.renderOrder = 10; this.mundo.add(this.seta);
      this.ponta = new T.Mesh(new T.ConeGeometry(0.05, 0.13, 14), this.matSeta); this.ponta.renderOrder = 10; this.mundo.add(this.ponta);

      this.cam = new T.PerspectiveCamera(30, 16 / 10, 0.1, 40);
      this.alvo = new T.Vector3(0, 0.78, 0);
      this.orbita = { yaw: 0.4, pitch: 0.17, dist: 5.3 }; this.inicial = Object.assign({}, this.orbita);
      this.posCam();
      this.controles();
      this.dica();

      this.ro = new ResizeObserver(() => this.tamanho()); this.ro.observe(container);
      this.tamanho();
      vivos.push(this); this.limpar();
    }
    posCam() {
      const o = this.orbita, cp = Math.cos(o.pitch);
      this.cam.position.set(this.alvo.x + o.dist * cp * Math.sin(o.yaw), this.alvo.y + o.dist * Math.sin(o.pitch), this.alvo.z + o.dist * cp * Math.cos(o.yaw));
      this.cam.lookAt(this.alvo);
    }
    tamanho() {
      const w = this.container.clientWidth || 320, h = Math.round(w / (this.aspecto || 1.6));
      this.r.setSize(w, h, false); this.r.domElement.style.width = '100%'; this.r.domElement.style.height = 'auto';
      this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.pintar();
    }
    controles() {
      const el = this.r.domElement, pts = new Map(); let ultimoToque = 0, dist0 = 0, d0 = 0;
      el.style.touchAction = 'pan-y';
      el.addEventListener('pointerdown', e => {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { const [a, b] = [...pts.values()]; dist0 = Math.hypot(a.x - b.x, a.y - b.y); d0 = this.orbita.dist; }
        const agora = performance.now(); if (agora - ultimoToque < 300) { Object.assign(this.orbita, this.inicial); this.posCam(); this.pintar(); } ultimoToque = agora;
        this.esconderDica();
      });
      el.addEventListener('pointermove', e => {
        const ant = pts.get(e.pointerId); if (!ant) return;
        const atual = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, atual);
        if (pts.size === 1) {
          // horizontal gira; vertical só se o gesto for claramente vertical (para não travar a rolagem)
          const dx = atual.x - ant.x, dy = atual.y - ant.y;
          this.orbita.yaw -= dx * 0.008;
          if (e.pointerType === 'mouse' || Math.abs(dy) > Math.abs(dx)) this.orbita.pitch = Math.max(0.02, Math.min(1.1, this.orbita.pitch + dy * 0.005));
        } else if (pts.size === 2) {
          const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist0) this.orbita.dist = Math.max(3.2, Math.min(9, d0 * dist0 / d));
        }
        this.posCam(); this.pintar();
      });
      const solta = e => { pts.delete(e.pointerId); if (pts.size < 2) dist0 = 0; };
      el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta); el.addEventListener('pointerleave', solta);
      el.addEventListener('wheel', e => { e.preventDefault(); this.orbita.dist = Math.max(3.2, Math.min(9, this.orbita.dist * (1 + Math.sign(e.deltaY) * 0.08))); this.posCam(); this.pintar(); }, { passive: false });
    }
    dica() {
      if (Palco3D.dicaVista) return;
      const d = this.elDica = document.createElement('span'); d.className = 'stage-dica'; d.textContent = '↔ Arraste para girar';
      this.container.appendChild(d);
      setTimeout(() => this.esconderDica(), 4000);
    }
    esconderDica() { if (this.elDica) { this.elDica.classList.add('sai'); Palco3D.dicaVista = true; const d = this.elDica; this.elDica = null; setTimeout(() => d.remove(), 500); } }
    setBelt(c) { this.tori.setFaixa(c); this.pintar(); }
    setMirror(on) { this.mundo.scale.x = on ? -1 : 1; this.pintar(); }
    draw(T, U, arrow) {
      this.tori.draw(T, 0.05); this.uke.draw(U, -0.05);
      // seta do kuzushi sobre o peito do uke
      if (arrow && U && this.uke.peito) {
        const Th = this.T, fwd = (U.f < 0 ? -1 : 1), d = arrow.dir === 'frente' ? fwd : -fwd;
        const c = this.uke.peito.clone().add(new Th.Vector3(0, 0.42, 0.2));
        const a = c.clone().add(new Th.Vector3(-d * 0.12, 0, 0)), b = c.clone().add(new Th.Vector3(d * 0.5, 0.12, 0));
        const meio = a.clone().lerp(b, 0.5).add(new Th.Vector3(0, 0.22, 0));
        const curva = new Th.QuadraticBezierCurve3(a, meio, b);
        this.seta.geometry.dispose(); this.seta.geometry = new Th.TubeGeometry(curva, 20, 0.022, 8, false);
        const tan = curva.getTangent(1); this.ponta.position.copy(b); this.ponta.quaternion.setFromUnitVectors(new Th.Vector3(0, 1, 0), tan);
        this.matSeta.opacity = arrow.o;
      } else this.matSeta.opacity = 0;
      this.pintar();
    }
    pintar() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; if (!this.morto) this.r.render(this.cena, this.cam); });
    }
    dispose() {
      if (this.morto) return; this.morto = true;
      this.ro.disconnect(); this.tori.dispose(); this.uke.dispose();
      this.cena.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); });
      this.r.dispose(); this.r.forceContextLoss && this.r.forceContextLoss();
      const i = vivos.indexOf(this); if (i >= 0) vivos.splice(i, 1);
    }
    /* libera os palcos que já saíram da página (o navegador aguenta poucos WebGL ao mesmo tempo) */
    limpar() { vivos.slice().forEach(p => { if (p !== this && !p.r.domElement.isConnected) p.dispose(); }); }
  }

  window.Judo3D = {
    ok: () => !!window.THREE && temWebGL(),
    carregar,
    criar: (container, opts) => new Palco3D(container, opts),
    preCarregar() { // baixa o Three.js quando o navegador estiver livre (quiz/landing)
      const vai = () => carregar();
      if ('requestIdleCallback' in window) requestIdleCallback(vai, { timeout: 4000 }); else setTimeout(vai, 2500);
    },
  };
})();

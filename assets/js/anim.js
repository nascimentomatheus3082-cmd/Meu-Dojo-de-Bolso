/* Dojô de Bolso — motor de animação dos golpes.
   Dois judocas articulados em SVG (tori de judogi branco, uke de judogi azul),
   animados por quadros-chave. Cada quadro pertence a uma fase (s):
   0 = pegada, 1 = kuzushi/controle, 2 = tsukuri/encaixe, 3 = kake/finalização. */

const SEG = { torso: 34, head: 7.5, up: 17, fore: 16, thigh: 21, shin: 21 };
const GROUND = 170;
const BASE_POSE = { x: 0, y: 128, rot: 0, f: 1, t: 0, la1: 14, la2: 14, ra1: -10, ra2: 20, ll1: 7, ll2: 0, rl1: -7, rl2: 0 };
const KEYS = Object.keys(BASE_POSE);

const rad = d => d * Math.PI / 180;
const dirv = a => [Math.sin(rad(a)), Math.cos(rad(a))];

function mk(base, o) { return Object.assign({}, BASE_POSE, base, o); }

function joints(p) {
  const tt = rad(p.t);
  const up = [Math.sin(tt), -Math.cos(tt)];
  const top = [up[0] * SEG.torso, up[1] * SEG.torso];
  const head = [top[0] + up[0] * (SEG.head + 3), top[1] + up[1] * (SEG.head + 3)];
  const limb = (o, a1, a2, l1, l2, sign) => {
    const d1 = dirv(a1); const m = [o[0] + d1[0] * l1, o[1] + d1[1] * l1];
    const d2 = dirv(a1 + sign * a2); return [o, m, [m[0] + d2[0] * l2, m[1] + d2[1] * l2]];
  };
  const L = {
    top, head, hip: [0, 0],
    la: limb(top, p.la1, p.la2, SEG.up, SEG.fore, 1),
    ra: limb(top, p.ra1, p.ra2, SEG.up, SEG.fore, 1),
    ll: limb([0, 0], p.ll1, p.ll2, SEG.thigh, SEG.shin, -1),
    rl: limb([0, 0], p.rl1, p.rl2, SEG.thigh, SEG.shin, -1),
    beltA: [up[0] * 4 + Math.cos(tt) * 7, up[1] * 4 + Math.sin(tt) * 7],
    beltB: [up[0] * 4 - Math.cos(tt) * 7, up[1] * 4 - Math.sin(tt) * 7],
    tail: [up[0] * 4 + Math.cos(tt) * 4 - up[0] * 9 + 3, up[1] * 4 + Math.sin(tt) * 4 - up[1] * 9],
  };
  const r = rad(p.rot), c = Math.cos(r), s = Math.sin(r);
  const tf = q => { const x = q[0] * c - q[1] * s, y = q[0] * s + q[1] * c; return [p.x + x * p.f, p.y + y]; };
  const out = {};
  for (const k in L) out[k] = Array.isArray(L[k][0]) ? L[k].map(tf) : tf(L[k]);
  return out;
}

const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const pts = arr => arr.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

class Judoca {
  constructor(svg, look) {
    this.g = el('g', { class: 'judoca' }, svg);
    this.look = look;
    const o = look.outline;
    this.shadow = el('ellipse', { rx: 22, ry: 3.5, fill: 'rgba(30,34,48,.18)' }, this.g);
    const limb = (fill, w) => ({
      o: el('polyline', { fill: 'none', stroke: o, 'stroke-width': w + 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.g),
      f: el('polyline', { fill: 'none', stroke: fill, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.g),
    });
    this.farArm = limb(look.far, 7);
    this.farLeg = limb(look.far, 8);
    this.torso = limb(look.gi, 13);
    this.nearLeg = limb(look.gi, 8);
    this.belt = el('line', { stroke: look.belt, 'stroke-width': 4.5, 'stroke-linecap': 'round' }, this.g);
    this.tail = el('line', { stroke: look.belt, 'stroke-width': 3, 'stroke-linecap': 'round' }, this.g);
    this.nearArm = limb(look.gi, 7);
    this.head = el('circle', { r: SEG.head, fill: look.skin, stroke: o, 'stroke-width': 1.6 }, this.g);
  }
  set(limb, p) { limb.o.setAttribute('points', pts(p)); limb.f.setAttribute('points', pts(p)); }
  draw(p) {
    if (!p) { this.g.style.display = 'none'; return; }
    this.g.style.display = '';
    const J = joints(p);
    this.set(this.farArm, J.ra); this.set(this.farLeg, J.rl);
    this.set(this.torso, [J.hip, J.top]);
    this.set(this.nearLeg, J.ll); this.set(this.nearArm, J.la);
    this.belt.setAttribute('x1', J.beltA[0]); this.belt.setAttribute('y1', J.beltA[1]);
    this.belt.setAttribute('x2', J.beltB[0]); this.belt.setAttribute('y2', J.beltB[1]);
    this.tail.setAttribute('x1', J.beltA[0]); this.tail.setAttribute('y1', J.beltA[1]);
    this.tail.setAttribute('x2', J.tail[0]); this.tail.setAttribute('y2', J.tail[1]);
    this.head.setAttribute('cx', J.head[0]); this.head.setAttribute('cy', J.head[1]);
    this.shadow.setAttribute('cx', J.hip[0]); this.shadow.setAttribute('cy', GROUND + 1);
    this.chest = [(J.hip[0] + J.top[0] * 2) / 3, (J.hip[1] + J.top[1] * 2) / 3];
  }
}

/* ───────── Arquétipos de movimento ───────── */
const LYING = { y: 162, rot: 268, t: 0, ll1: 40, ll2: 60, rl1: 25, rl2: 35, la1: 50, la2: 10, ra1: 95, ra2: 10 };
const KNEEL = { y: 149, t: 8, ll1: 0, ll2: 90, rl1: 0, rl2: 90, la1: 40, la2: 30, ra1: 30, ra2: 30 };

function framesFor(spec) {
  const [kind, v] = (spec || 'koshi').split(':');
  const GT = { x: 122, f: 1, la1: 75, la2: 25, ra1: 60, ra2: 45, ll1: 10, rl1: -10 };
  const GU = { x: 178, f: -1, la1: 75, la2: 25, ra1: 60, ra2: 45, ll1: 10, rl1: -10 };
  const T = o => mk(GT, o), U = o => mk(GU, o);
  const grip = { s: 0, d: 600, T: T({}), U: U({}) };

  if (kind === 'koshi') {
    const low = v === 'seoi' || v === 'low' || v === 'kata';
    const leg = v === 'harai' ? -60 : v === 'uchi' ? -75 : v === 'hane' ? -45 : -8;
    const leg2 = v === 'hane' ? 70 : 6;
    const tai = v === 'tai';
    const arm = v === 'seoi' ? { ra1: -165, ra2: -30 } : v === 'kata' ? { ra1: -60, ra2: 80 } : { ra1: -55, ra2: 70 };
    const fr = [grip,
      { s: 1, d: 700, arrow: 'frente', T: T({ x: 118, t: -6, la1: 55, la2: 75, ra1: 72, ra2: 30 }), U: U({ x: 170, t: 18, y: 126, ll1: 2, rl1: -16 }) },
      { s: 2, d: 420, T: T({ x: 148, f: 0.05, t: 6, y: 131, ll1: 18, ll2: 30, rl1: -12, rl2: 30 }), U: U({ x: 172, t: 22 }) },
      { s: 2, d: 480, T: T(Object.assign({ x: tai ? 150 : 161, f: -1, t: tai ? 8 : 14, y: tai ? 132 : (low ? 142 : 134), ll1: 22, ll2: low ? 75 : 40, rl1: tai ? -48 : -6, rl2: tai ? 0 : (low ? 75 : 40), la1: 45, la2: 80 }, arm)), U: U({ x: 177, t: tai ? 30 : 40, y: 124 }) },
      { s: 3, d: 460, T: T(Object.assign({ x: tai ? 150 : 160, f: -1, t: tai ? 30 : 48, y: 128, ll1: 10, ll2: 5, rl1: tai ? -48 : leg, rl2: leg2 === 70 ? 10 : 0, la1: 20, la2: 60 }, arm)), U: U({ x: tai ? 150 : 162, y: tai ? 112 : (v === 'kata' ? 84 : 96), rot: 110, t: 10, ll1: 30, rl1: -30 }) },
      { s: 3, d: 560, T: T({ x: 155, f: -1, t: 30, y: 130, ll1: 12, ll2: 10, rl1: -10, rl2: 10, la1: 10, la2: 40, ra1: 30, ra2: 30 }), U: U({ x: 118, y: 150, rot: 235, t: 0, ll1: 30, ll2: 30, rl1: 20, rl2: 10 }) },
    ];
    if (v === 'maki') {
      fr.push({ s: 3, d: 500, T: T({ x: 128, f: -1, y: 150, rot: 82, t: 0, ll1: 10, ll2: 30, rl1: -20, rl2: 10, la1: 60, la2: 30, ra1: 120, ra2: 20 }), U: U(Object.assign({ x: 112 }, LYING)) });
    } else {
      fr.push({ s: 3, d: 420, T: T({ x: 150, f: -1, t: 14, y: 128, la1: 38, la2: 20, ra1: 0, ra2: 10, ll1: 8, rl1: -8 }), U: U(Object.assign({ x: 112 }, LYING)) });
    }
    return fr;
  }

  if (kind === 'gari') {
    const lift = { osoto: [60, -58], ouchi: [28, 52], kouchi: [12, 40], kosoto: [10, 42], deashi: [20, 58], okuri: [20, 58], osotoguruma: [-40, -40], sumi: [6, 6] }[v] || [60, -58];
    const near = v === 'deashi' || v === 'okuri' ? 136 : v === 'sumi' ? 140 : 150;
    const handsFwd = v === 'sumi' ? { la1: 98, la2: 0, ra1: 95, ra2: 5 } : {};
    return [grip,
      { s: 1, d: 700, arrow: 'tras', T: T({ x: 132, t: 10, la1: 82, la2: 12, ra1: 72, ra2: 25 }), U: U({ x: 182, t: -14, ll1: 8, rl1: -4 }) },
      { s: 2, d: 600, T: T(Object.assign({ x: near, t: 15, ll1: 6, rl1: lift[0], rl2: v === 'osoto' ? 12 : 0 }, handsFwd)), U: U({ x: 184, t: -18, ll1: 4 }) },
      { s: 3, d: 460, T: T(Object.assign({ x: near + 2, t: v === 'osoto' ? 40 : 22, ll1: 4, rl1: lift[1], rl2: 4 }, handsFwd)), U: U({ x: 186, y: 124, rot: -35, t: -5, ll1: 50, rl1: 10 }) },
      { s: 3, d: 560, T: T({ x: near + 4, t: 28, rl1: -20, rl2: 20, la1: 60, ra1: 40 }), U: U({ x: 196, y: 156, rot: -80, ll1: 70, ll2: 20, rl1: 30, rl2: 30, la1: 30 }) },
      { s: 3, d: 420, T: T({ x: near, t: 18, ll1: 12, rl1: -10, la1: 55, la2: 30, ra1: 20 }), U: U({ x: 198, y: 162, rot: -90, t: 0, ll1: 60, ll2: 50, rl1: 40, rl2: 40, la1: -50, la2: 0, ra1: -40, ra2: 0 }) },
    ];
  }

  if (kind === 'tsuri') {
    const blk = { tornozelo: 48, joelho: 74, quadril: 96, sweep: 30 }[v];
    const kneel = v === 'kneel';
    const legBlock = kneel ? { y: 150, ll1: 0, ll2: 92, rl1: 82, rl2: 82 } : { ll1: blk, ll2: 0, rl1: -10, rl2: 10 };
    return [grip,
      { s: 1, d: 700, arrow: 'frente', T: T({ x: 112, t: -8, la1: 60, la2: 75, ra1: 75, ra2: 50, ll1: -4, rl1: -16 }), U: U({ x: 166, t: 20, y: 126, ll1: 12, rl1: -2 }) },
      { s: 2, d: 560, T: T(Object.assign({ x: 112, t: -10, y: 130 }, legBlock)), U: U({ x: 164, t: 26 }) },
      { s: 3, d: 500, T: T(Object.assign({ x: 110, t: -14, y: 130, la1: 38, la2: 95, ra1: 92, ra2: 30 }, legBlock, v === 'sweep' ? { ll1: 62 } : {})), U: U({ x: 150, y: 104, rot: 115, t: 10, ll1: 40, rl1: -20 }) },
      { s: 3, d: 560, T: T({ x: 104, t: -4, y: kneel ? 146 : 128, ll1: 20, ll2: 20, rl1: -10, la1: 40, la2: 60 }), U: U({ x: 146, y: 150, rot: 235 }) },
      { s: 3, d: 420, T: T({ x: 100, t: 10, la1: 40, la2: 20, ll1: 8, rl1: -8 }), U: U(Object.assign({ x: 146 }, LYING)) },
    ];
  }

  if (kind === 'ma') {
    const T2 = o => mk(Object.assign({}, GT, { x: 142 }), o), U2 = o => mk(Object.assign({}, GU, { x: 196 }), o);
    return [{ s: 0, d: 600, T: T2({}), U: U2({}) },
      { s: 1, d: 650, arrow: 'frente', T: T2({ x: 138, t: -8, la1: 60, la2: 70, ra1: 70, ra2: 50 }), U: U2({ x: 186, t: 22 }) },
      { s: 2, d: 600, T: T2({ x: 152, y: 146, rot: -22, t: -10, ll1: 95, ll2: 75, rl1: 20, rl2: 110, la1: 95, la2: 30, ra1: 100, ra2: 30 }), U: U2({ x: 184, t: 32, y: 126 }) },
      { s: 3, d: 560, T: T2({ x: 152, y: 160, rot: -80, t: 0, ll1: 150, ll2: 10, rl1: 60, rl2: 80, la1: 150, la2: 10, ra1: 160, ra2: 10 }), U: U2({ x: 148, y: 86, rot: 120, t: 10 }) },
      { s: 3, d: 560, T: T2({ x: 154, y: 162, rot: -90, t: 0, ll1: 110, ll2: 60, rl1: 60, rl2: 80, la1: 170, la2: 10, ra1: 170, ra2: 10 }), U: U2({ x: 70, y: 148, rot: 240 }) },
      { s: 3, d: 420, T: T2({ x: 156, y: 162, rot: -90, t: 0, ll1: 40, ll2: 60, rl1: 20, rl2: 60, la1: 150, la2: 0, ra1: 160, ra2: 0 }), U: U2(Object.assign({ x: 58 }, LYING)) },
    ];
  }

  if (kind === 'yoko') {
    const back = v === 'tras';
    return [grip,
      { s: 1, d: 650, arrow: back ? 'tras' : 'frente', T: T(back ? { x: 132, t: 8, la1: 82, la2: 12 } : { x: 120, t: -8, la1: 58, la2: 72, ra1: 72, ra2: 45 }), U: U(back ? { x: 182, t: -14 } : { x: 172, t: 22 }) },
      { s: 2, d: 560, T: T({ x: back ? 160 : 136, y: 148, rot: -40, t: 0, ll1: 70, ll2: 0, rl1: 10, rl2: 60, la1: 100, ra1: 110 }), U: U(back ? { x: 184, t: -18 } : { x: 172, t: 28 }) },
      { s: 3, d: 520, T: T({ x: back ? 162 : 132, y: 160, rot: -75, t: 0, ll1: 82, ll2: 0, rl1: 30, rl2: 40, la1: 125, ra1: 140 }), U: back ? U({ x: 188, y: 126, rot: -40, ll1: 50 }) : U({ x: 152, y: 100, rot: 120, ll1: 30, rl1: -30 }) },
      { s: 3, d: 560, T: T({ x: back ? 160 : 128, y: 162, rot: -86, t: 0, ll1: 60, ll2: 20, rl1: 30, rl2: 40, la1: 140, ra1: 150 }), U: back ? U({ x: 200, y: 156, rot: -80, ll1: 70 }) : U({ x: 112, y: 150, rot: 238 }) },
      { s: 3, d: 420, T: T({ x: back ? 158 : 124, y: 162, rot: -88, t: 0, ll1: 40, ll2: 50, rl1: 20, rl2: 40, la1: 150, ra1: 160 }), U: back ? U({ x: 204, y: 162, rot: -90, ll1: 60, ll2: 50, rl1: 40, rl2: 40, la1: -50, ra1: -40 }) : U(Object.assign({ x: 96 }, LYING)) },
    ];
  }

  if (kind === 'ura') {
    return [grip,
      { s: 1, d: 650, T: T({ x: 128, t: 4 }), U: U({ x: 152, f: 0.05, t: 10, y: 130 }) },
      { s: 2, d: 520, T: T({ x: 128, y: 140, t: 12, la1: 95, la2: 20, ra1: 88, ra2: 30, ll1: 28, ll2: 55, rl1: -10, rl2: 50 }), U: U({ x: 150, f: 1, t: 22, y: 132, ll1: 20, ll2: 30, rl1: -5, rl2: 30, la1: 60, ra1: 40 }) },
      { s: 3, d: 520, T: T({ x: 130, y: 126, t: -22, la1: 100, la2: 15, ra1: 100, ra2: 20, ll1: 8, rl1: -12 }), U: U({ x: 140, f: 1, y: 92, rot: -25, t: 0, ll1: 20, ll2: 35, rl1: 8, rl2: 45, la1: 60, ra1: 30 }) },
      { s: 3, d: 600, T: T({ x: 132, y: 128, t: 0, la1: 70, ra1: 60 }), U: U({ x: 172, f: 1, y: 150, rot: -75, ll1: 60, ll2: 30, rl1: 30, rl2: 30 }) },
      { s: 3, d: 420, T: T({ x: 130, t: 14, la1: 50, la2: 20, ra1: 30 }), U: U({ x: 180, f: 1, y: 162, rot: -90, t: 0, ll1: 60, ll2: 50, rl1: 40, rl2: 40, la1: -50, ra1: -40 }) },
    ];
  }

  if (kind === 'ground' || kind === 'shime' || kind === 'kan') {
    const UL = o => mk({ x: 150, f: -1 }, Object.assign({}, LYING, o));
    const start = { s: 0, d: 600, T: mk({ x: 92, f: 1 }, KNEEL), U: UL({}) };
    let pos, uke = {};
    if (kind === 'shime') {
      const sit = { y: 154, rot: 0, t: 6, ll1: 92, ll2: 8, rl1: 86, rl2: 28, la1: 40, la2: 30, ra1: 30, ra2: 40 };
      const US = o => mk({ x: 178, f: 1 }, Object.assign({}, sit, o));
      return [
        { s: 0, d: 600, T: mk({ x: 140, f: 1 }, KNEEL), U: US({}) },
        { s: 1, d: 650, T: mk({ x: 152, f: 1 }, { y: 154, t: 22, ll1: 80, ll2: 40, rl1: 70, rl2: 60, la1: 95, la2: 40, ra1: 80, ra2: 50 }), U: US({}) },
        { s: 2, d: 600, T: mk({ x: 156, f: 1 }, { y: 154, t: 28, ll1: 80, ll2: 40, rl1: 70, rl2: 60, la1: 118, la2: 70, ra1: 105, ra2: 80 }), U: US({ t: 2 }) },
        { s: 3, d: 650, T: mk({ x: 154, f: 1 }, { y: 155, t: 4, rot: -10, ll1: 80, ll2: 40, rl1: 70, rl2: 60, la1: 120, la2: 85, ra1: 110, ra2: 90 }), U: US({ x: 174, t: -16, la1: 60, la2: 20, ra1: 20, ra2: 10 }) },
        { s: 3, d: 300, T: mk({ x: 154, f: 1 }, { y: 155, t: 4, rot: -10, ll1: 80, ll2: 40, rl1: 70, rl2: 60, la1: 120, la2: 85, ra1: 110, ra2: 90 }), U: US({ x: 174, t: -16, la1: 60, la2: 20, ra1: -10, ra2: 0 }) },
        { s: 3, d: 300, T: mk({ x: 154, f: 1 }, { y: 155, t: 4, rot: -10, ll1: 80, ll2: 40, rl1: 70, rl2: 60, la1: 120, la2: 85, ra1: 110, ra2: 90 }), U: US({ x: 174, t: -16, la1: 60, la2: 20, ra1: 25, ra2: 10 }) },
      ];
    }
    const P = {
      kesa:   { x: 168, f: 1,  y: 155, rot: 0,  t: 52, ll1: 72, ll2: 75, rl1: -80, rl2: 25, la1: 125, la2: 20, ra1: -20, ra2: 40 },
      kata:   { x: 166, f: 1,  y: 155, rot: 0,  t: 62, ll1: 72, ll2: 85, rl1: -85, rl2: 10, la1: 140, la2: 30, ra1: 120, ra2: 40 },
      ukesa:  { x: 176, f: -1, y: 155, rot: 0,  t: 50, ll1: 72, ll2: 75, rl1: -80, rl2: 25, la1: 125, la2: 20, ra1: 100, ra2: 40 },
      kami:   { x: 226, f: -1, y: 152, rot: 72, t: 0,  ll1: 70, ll2: 120, rl1: 40, rl2: 100, la1: 140, la2: 20, ra1: 120, ra2: 40 },
      yoko:   { x: 146, f: 1,  y: 150, rot: 66, t: 0,  ll1: 70, ll2: 120, rl1: 40, rl2: 100, la1: 120, la2: 30, ra1: 150, ra2: 20 },
      tate:   { x: 140, f: 1,  y: 150, rot: 76, t: 0,  ll1: 80, ll2: 140, rl1: 60, rl2: 130, la1: 150, la2: 30, ra1: 140, ra2: 40 },
      tatejime: { x: 142, f: 1, y: 146, rot: 50, t: 0, ll1: 70, ll2: 130, rl1: 50, rl2: 120, la1: 120, la2: 40, ra1: 110, ra2: 50 },
      juji:   { x: 176, f: -1, y: 160, rot: -80, t: 0, ll1: 120, ll2: 20, rl1: 100, rl2: 30, la1: 170, la2: 10, ra1: 160, ra2: 10 },
      garami: { x: 150, f: 1,  y: 148, rot: 60, t: 0,  ll1: 70, ll2: 120, rl1: 40, rl2: 100, la1: 110, la2: 60, ra1: 140, ra2: 60 },
      ude:    { x: 196, f: -1, y: 150, rot: 0,  t: 40, ll1: 0, ll2: 92, rl1: 70, rl2: 85, la1: 120, la2: 10, ra1: 110, ra2: 20 },
    };
    const key = kind === 'kan' ? v : v;
    pos = P[key] || P.kesa;
    if (kind === 'kan') uke = v === 'garami' ? { ra1: 90, ra2: 90 } : { ra1: 90, ra2: 0 };
    const approach = Object.assign({}, KNEEL, { x: (pos.x + 92) / 2, f: pos.f, t: 30, la1: 70, la2: 20, ra1: 60, ra2: 30 });
    const hold = mk({}, pos);
    return [start,
      { s: 1, d: 700, T: mk({}, approach), U: UL({}) },
      { s: 2, d: 650, T: hold, U: UL(uke) },
      { s: 3, d: 420, T: hold, U: UL(Object.assign({ rot: 262, x: 147, ll1: 60, ll2: 80 }, uke)) },
      { s: 3, d: 420, T: hold, U: UL(Object.assign({ rot: 274, x: 152, ll1: 30, ll2: 50 }, uke)) },
      { s: 3, d: 420, T: hold, U: UL(uke) },
    ];
  }

  if (kind === 'ukemi') {
    const S = o => mk({ x: 150, f: 1 }, o);
    if (v === 'ushiro') return [
      { s: 0, d: 500, T: S({ la1: 88, la2: 0, ra1: 84, ra2: 4 }), U: null },
      { s: 1, d: 700, T: S({ y: 149, t: 30, ll1: 90, ll2: 90, rl1: 85, rl2: 92, la1: 88, la2: 0, ra1: 84, ra2: 4 }), U: null },
      { s: 2, d: 600, T: S({ x: 140, y: 157, rot: -65, t: 25, ll1: 95, ll2: 60, rl1: 90, rl2: 70, la1: 60, la2: 0, ra1: 55, ra2: 0 }), U: null },
      { s: 3, d: 380, T: S({ x: 134, y: 160, rot: -88, t: 20, ll1: 70, ll2: 50, rl1: 64, rl2: 55, la1: -60, la2: 0, ra1: -50, ra2: 0 }), U: null },
      { s: 3, d: 700, T: S({ x: 134, y: 160, rot: -88, t: 20, ll1: 70, ll2: 50, rl1: 64, rl2: 55, la1: -60, la2: 0, ra1: -50, ra2: 0 }), U: null },
    ];
    if (v === 'yoko') return [
      { s: 0, d: 500, T: S({ la1: 30, la2: 10 }), U: null },
      { s: 1, d: 650, T: S({ y: 136, t: 10, ll1: 60, ll2: 0, rl1: -10, rl2: 60, la1: 75, la2: 0 }), U: null },
      { s: 2, d: 560, T: S({ x: 140, y: 156, rot: -60, t: 25, ll1: 75, ll2: 0, rl1: 30, rl2: 70, la1: 70, la2: 0, ra1: 30, ra2: 30 }), U: null },
      { s: 3, d: 380, T: S({ x: 136, y: 161, rot: -86, t: 20, ll1: 50, ll2: 0, rl1: 40, rl2: 60, la1: -55, la2: 0, ra1: 60, ra2: 50 }), U: null },
      { s: 3, d: 700, T: S({ x: 136, y: 161, rot: -86, t: 20, ll1: 50, ll2: 0, rl1: 40, rl2: 60, la1: -55, la2: 0, ra1: 60, ra2: 50 }), U: null },
    ];
    if (v === 'mae') return [
      { s: 0, d: 500, T: S({ la1: 130, la2: 70, ra1: 125, ra2: 75 }), U: null },
      { s: 1, d: 650, T: S({ rot: 28, la1: 120, la2: 70, ra1: 115, ra2: 75, ll1: 0, rl1: 0 }), U: null },
      { s: 2, d: 520, T: S({ x: 152, y: 140, rot: 70, la1: 95, la2: 80, ra1: 92, ra2: 82, ll1: 0, rl1: 0 }), U: null },
      { s: 3, d: 300, T: S({ x: 152, y: 152, rot: 82, la1: 90, la2: 82, ra1: 88, ra2: 84, ll1: 0, rl1: 0 }), U: null },
      { s: 3, d: 700, T: S({ x: 152, y: 152, rot: 82, la1: 90, la2: 82, ra1: 88, ra2: 84, ll1: 0, rl1: 0 }), U: null },
    ];
    return [ // kaiten
      { s: 0, d: 500, T: S({ x: 90, ll1: 25, rl1: -20, la1: 30, la2: 30 }), U: null },
      { s: 1, d: 650, T: S({ x: 100, y: 138, t: 62, ll1: 40, ll2: 50, rl1: -20, rl2: 30, la1: 30, la2: 20, ra1: 40, ra2: 10 }), U: null },
      { s: 2, d: 500, T: S({ x: 125, y: 146, rot: 100, t: 20, ll1: 110, ll2: 130, rl1: 95, rl2: 120, la1: 120, la2: 30, ra1: 110, ra2: 40 }), U: null },
      { s: 2, d: 500, T: S({ x: 150, y: 146, rot: 190, t: 20, ll1: 120, ll2: 140, rl1: 100, rl2: 120, la1: 60, la2: 30, ra1: 60, ra2: 40 }), U: null },
      { s: 3, d: 450, T: S({ x: 172, y: 158, rot: 270, t: 20, ll1: 80, ll2: 60, rl1: 70, rl2: 70, la1: -60, la2: 0, ra1: 60, ra2: 50 }), U: null },
      { s: 3, d: 650, T: S({ x: 196, y: 128, rot: 360, t: 0, ll1: 8, rl1: -8, la1: 14, ra1: -10 }), U: null },
    ];
  }
  return framesFor('koshi');
}

/* ───────── Player ───────── */
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function lerpPose(a, b, k) {
  if (!a || !b) return b || a;
  const o = {}; for (const key of KEYS) o[key] = a[key] + (b[key] - a[key]) * k; return o;
}

class JudoStage {
  constructor(container, opts = {}) {
    this.svg = el('svg', { viewBox: '0 18 300 172', class: 'stage-svg', role: 'img', 'aria-label': 'Animação do golpe' });
    container.appendChild(this.svg);
    this.container = container; this.opts = opts;
    // 3D (anim3d.js): quando pedido (opts.d3), troca o desenho 2D pelo palco 3D assim que o Three.js estiver pronto.
    if (opts.d3 && window.Judo3D) {
      if (Judo3D.ok()) setTimeout(() => this.usar3D(), 0);
      else Judo3D.carregar().then(ok => { if (ok) this.usar3D(); });
    }
    const defs = el('defs', {}, this.svg);
    const m = el('marker', { id: 'ah' + Math.random().toString(36).slice(2, 7), viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--hinomaru, #D0312D)' }, m);
    this.markerId = m.id;
    this.world = el('g', {}, this.svg);
    el('rect', { x: -20, y: GROUND, width: 340, height: 30, fill: 'var(--tatami, #DCCB8E)' }, this.world);
    for (let i = 0; i < 6; i++) el('line', { x1: i * 60 + 10, y1: GROUND, x2: i * 60 - 6, y2: 190, stroke: 'var(--tatami-line, rgba(90,70,20,.25))', 'stroke-width': 1.2 }, this.world);
    el('line', { x1: -20, y1: GROUND, x2: 320, y2: GROUND, stroke: 'var(--tatami-edge, rgba(90,70,20,.45))', 'stroke-width': 1.5 }, this.world);
    this.tori = new Judoca(this.world, { gi: '#FFFFFF', far: '#DDE2EA', outline: '#1E2647', belt: opts.belt || '#1E2647', skin: '#D9A877' });
    this.uke = new Judoca(this.world, { gi: '#2A5CAA', far: '#1F477F', outline: '#10213F', belt: '#1E2647', skin: '#8D5A3B' });
    this.arrow = el('path', { fill: 'none', stroke: 'var(--hinomaru, #D0312D)', 'stroke-width': 3, 'stroke-linecap': 'round', 'marker-end': `url(#${m.id})`, opacity: 0 }, this.world);
    this.arrowTxt = el('text', { 'font-size': 9, 'font-weight': 700, fill: 'var(--hinomaru, #D0312D)', opacity: 0, 'font-family': 'inherit' }, this.world);
    this.arrowTxt.textContent = 'kuzushi';
    this.speed = 1; this.mirror = false; this.token = 0;
    this.load(opts.spec || 'koshi');
  }
  usar3D() {
    if (this.r3d || this.morto || !this.svg.isConnected) return;
    try { this.r3d = Judo3D.criar(this.container, { belt: this.opts.belt }); }
    catch (e) { this.r3d = null; return; } // sem WebGL de verdade: fica no 2D
    this.svg.remove();
    if (this.mirror) this.r3d.setMirror(true);
    this.render();
  }
  destruir() { this.morto = true; this.token++; if (this.r3d) this.r3d.dispose(); }
  setBelt(c) { this.tori.belt.setAttribute('stroke', c); this.tori.tail.setAttribute('stroke', c); if (this.r3d) this.r3d.setBelt(c); }
  setMirror(on) { this.mirror = on; this.world.setAttribute('transform', on ? 'translate(300,0) scale(-1,1)' : ''); this.arrowTxt.setAttribute('transform', ''); if (this.r3d) this.r3d.setMirror(on); }
  load(spec) {
    const ground = /^(ground|kan|shime)/.test(spec || '');
    this.world.appendChild(ground ? this.uke.g : this.tori.g);
    this.world.appendChild(ground ? this.tori.g : this.uke.g);
    this.world.appendChild(this.arrow); this.world.appendChild(this.arrowTxt);
    this.frames = framesFor(spec); this.idx = 0; this.cur = { T: this.frames[0].T, U: this.frames[0].U, arrow: null }; this.render(); }
  render() {
    this.tori.draw(this.cur.T); this.uke.draw(this.cur.U);
    const a = this.cur.arrow;
    if (a && this.uke.chest) {
      const fwd = (this.cur.U ? this.cur.U.f : -1) < 0 ? -1 : 1;
      const d = a.dir === 'frente' ? fwd : -fwd;
      const [cx, cy] = this.uke.chest;
      const x1 = cx - d * 6, y1 = cy - 14, x2 = cx + d * 30, y2 = cy - 22;
      this.arrow.setAttribute('d', `M${x1},${y1} Q${(x1 + x2) / 2},${y1 - 14} ${x2},${y2}`);
      this.arrow.setAttribute('opacity', a.o);
      this.arrowTxt.setAttribute('x', Math.min(x1, x2) + 2); this.arrowTxt.setAttribute('y', y1 - 18);
      this.arrowTxt.setAttribute('opacity', this.mirror ? 0 : a.o);
    } else { this.arrow.setAttribute('opacity', 0); this.arrowTxt.setAttribute('opacity', 0); }
    if (this.r3d) this.r3d.draw(this.cur.T, this.cur.U, this.cur.arrow);
  }
  reset() { this.token++; this.cur = { T: this.frames[0].T, U: this.frames[0].U, arrow: null }; this.render(); }
  stop() { this.token++; }
  tween(from, to, dur, arrowDir) {
    const tok = this.token;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return new Promise(res => {
      const D = reduce ? 1 : dur / this.speed; const t0 = performance.now();
      const step = now => {
        if (tok !== this.token) return res(false);
        const k = Math.min(1, (now - t0) / D), e = ease(k);
        this.cur = { T: lerpPose(from.T, to.T, e), U: lerpPose(from.U, to.U, e), arrow: arrowDir ? { dir: arrowDir, o: Math.min(1, k * 2) } : null };
        this.render();
        if (k < 1) requestAnimationFrame(step); else res(true);
      };
      requestAnimationFrame(step);
    });
  }
  /* Anima todos os quadros de uma fase. Retorna false se foi interrompido. */
  async playPhase(s) {
    const tok = this.token;
    let i = this.frames.findIndex(f => f.s === s);
    if (i < 0) return true;
    if (i === 0) { this.cur = { T: this.frames[0].T, U: this.frames[0].U, arrow: null }; this.render(); i = 1; if (this.frames[1] && this.frames[1].s !== s) { await wait(this.frames[0].d / this.speed); return tok === this.token; } }
    let prev = this.frames[i - 1];
    for (; i < this.frames.length && this.frames[i].s === s; i++) {
      const ok = await this.tween({ T: prev.T, U: prev.U }, this.frames[i], this.frames[i].d, this.frames[i].arrow);
      if (!ok) return false;
      prev = this.frames[i];
    }
    if (this.cur.arrow) { this.cur.arrow.o = 1; this.render(); }
    return tok === this.token;
  }
  async playAll(loop = false) {
    const tok = ++this.token;
    do {
      this.cur = { T: this.frames[0].T, U: this.frames[0].U, arrow: null }; this.render();
      await wait(350 / this.speed);
      for (let i = 1; i < this.frames.length; i++) {
        if (tok !== this.token) return;
        await this.tween(this.frames[i - 1], this.frames[i], this.frames[i].d, this.frames[i].arrow);
      }
      await wait(900);
    } while (loop && tok === this.token);
  }
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ───────── Narração (Web Speech API, pt-BR) ───────── */
const Voz = {
  on: true, voice: null, rate: 1,
  init() {
    if (!('speechSynthesis' in window)) { this.on = false; return; }
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /pt-BR/i.test(v.lang) && /Google|Francisca|Luciana|Natural/i.test(v.name)) || vs.find(v => /pt-BR/i.test(v.lang)) || vs.find(v => /^pt/i.test(v.lang)) || null;
    };
    pick(); speechSynthesis.onvoiceschanged = pick;
  },
  falavel(txt) { return txt.replace(/-/g, ' ').replace(/\buke\b/gi, 'úke').replace(/\btori\b/gi, 'tóri'); },
  say(text) {
    return new Promise(res => {
      if (!this.on || !('speechSynthesis' in window)) return setTimeout(res, Math.min(5200, 900 + text.length * 38));
      const u = new SpeechSynthesisUtterance(this.falavel(text));
      u.lang = 'pt-BR'; if (this.voice) u.voice = this.voice; u.rate = this.rate;
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 2500 + text.length * 95);
      speechSynthesis.speak(u);
    });
  },
  stop() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
};

/* ───────── Aula narrada: animação + voz + legenda sincronizadas ───────── */
class AulaPlayer {
  constructor(root, tec, opts = {}) {
    this.root = root; this.tec = tec; this.opts = opts;
    this.stage = new JudoStage(root.querySelector('.stage'), { spec: tec.a, belt: opts.belt, d3: opts.d3 !== false });
    this.cap = root.querySelector('.caption');
    this.playing = false; this.run = 0;
  }
  roteiro() {
    const g = GRUPOS[this.tec.g];
    return [
      { s: 0, fase: this.tec.n, txt: `${this.tec.n}. ${this.tec.tr}. ${g.nome}, ${g.desc}.` },
      { s: 1, fase: g.fases[0], txt: this.tec.p[0] },
      { s: 2, fase: g.fases[1], txt: this.tec.p[1] },
      { s: 3, fase: g.fases[2], txt: this.tec.p[2] },
      { s: -1, fase: 'Erro que reprova', txt: this.tec.e },
    ];
  }
  show(item, i) {
    if (!this.cap) return;
    this.cap.innerHTML = `<span class="cap-fase">${item.fase}</span><span class="cap-txt">${item.txt}</span>`;
    this.cap.dataset.erro = item.s === -1 ? '1' : '';
    this.root.querySelectorAll('[data-fase]').forEach(b => b.classList.toggle('on', +b.dataset.fase === i));
    if (this.opts.onStep) this.opts.onStep(i, item);
  }
  async play(from = 0) {
    const my = ++this.run; this.playing = true; Voz.stop(); this.stage.stop();
    this.root.classList.add('is-playing');
    const r = this.roteiro();
    if (from > 0) { this.stage.reset(); for (let s = 0, alvo = r[from].s < 0 ? 4 : r[from].s; s < alvo; s++) { const f = this.stage.frames.filter(x => x.s === s).pop(); if (f) this.stage.cur = { T: f.T, U: f.U }; } this.stage.render(); }
    for (let i = from; i < r.length; i++) {
      if (my !== this.run) return;
      this.show(r[i], i);
      const anim = r[i].s >= 0 ? this.stage.playPhase(r[i].s) : wait(300);
      await Promise.all([anim, Voz.say(r[i].txt)]);
      if (my !== this.run) return;
      await wait(250);
    }
    this.playing = false; this.root.classList.remove('is-playing');
    if (this.opts.onEnd) this.opts.onEnd();
  }
  stop() { this.run++; this.playing = false; Voz.stop(); this.stage.stop(); this.root.classList.remove('is-playing'); }
}

Voz.init();

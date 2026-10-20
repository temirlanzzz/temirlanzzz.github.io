// An ASCII ocean that lives behind the whole page. Zero dependencies, one 2D
// canvas, everything drawn as monospace glyphs on a cell grid:
//   - a dark grid with twinkling coloured plankton dots
//   - a light field that spreads and fades wherever something swims (the wake)
//   - a flocking school of fish, drawn as single direction glyphs
//   - sharks, a manta ray and a humpback whale, rasterised cell by cell from
//     a swimming spine, shaded by a light and textured with a glyph ramp
//   - jellyfish with pulsing bells and trailing tentacles
// The deeper the page is scrolled, the deeper the water: darker, more glow.
// The school can be asked to spell a word, which a passing shark then breaks.
// The look is inspired by github.com/stackedlol/ascii-sharks; this is a separate
// implementation written from scratch, not a copy of its code.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/* ---------------- palettes ---------------- */
const PALETTES = {
  dark: {
    bg: '#000000', grid: 'rgba(255,255,255,0.032)',
    dots: [[48, 52, 235], [52, 205, 60], [228, 50, 44], [190, 212, 255]],
    deep: [[96, 40, 220], [30, 140, 190], [210, 40, 140], [150, 160, 255]],
    wake: [110, 230, 255], fish: [232, 240, 255], glow: 1
  },
  light: {
    bg: '#f2f1ec', grid: 'rgba(0,0,0,0.04)',
    dots: [[40, 60, 220], [20, 150, 60], [210, 50, 40], [70, 80, 110]],
    deep: [[90, 50, 200], [20, 110, 150], [190, 40, 120], [60, 60, 120]],
    wake: [0, 130, 170], fish: [20, 26, 40], glow: .8
  }
};

// Skin ramps per material: dark → light, 8 steps. Dark theme uses them as is;
// light theme darkens them so creatures read as ink on paper.
const RAMPS = {
  shark: [[38, 44, 52], [58, 66, 78], [80, 90, 104], [104, 116, 132], [128, 140, 156], [156, 168, 184], [186, 196, 210], [220, 228, 238]],
  mako: [[22, 28, 70], [34, 44, 104], [48, 62, 140], [70, 86, 172], [98, 116, 196], [132, 150, 214], [170, 184, 228], [210, 220, 244]],
  hammer: [[46, 44, 30], [68, 66, 46], [92, 90, 64], [118, 116, 86], [146, 144, 110], [174, 172, 138], [202, 200, 168], [230, 228, 204]],
  manta: [[14, 16, 22], [26, 30, 40], [40, 46, 60], [58, 66, 84], [84, 94, 116], [120, 132, 156], [170, 182, 204], [226, 234, 248]],
  whale: [[16, 22, 34], [26, 34, 52], [38, 50, 74], [54, 70, 100], [74, 94, 128], [100, 122, 156], [140, 160, 190], [200, 214, 232]],
  fin: [[150, 160, 170], [170, 180, 190], [186, 196, 206], [200, 210, 218], [214, 222, 230], [226, 232, 238], [236, 240, 244], [246, 248, 250]],
  jelly: [[90, 30, 120], [130, 40, 170], [170, 60, 210], [205, 90, 235], [230, 130, 245], [244, 170, 250], [250, 205, 252], [255, 235, 255]],
  jelly2: [[20, 80, 120], [30, 120, 170], [40, 160, 210], [70, 195, 235], [110, 220, 245], [160, 235, 250], [205, 245, 252], [235, 252, 255]],
  eye: [[255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255], [255, 255, 255]],
  accent: [[224, 137, 44], [224, 58, 50], [180, 74, 224], [51, 200, 204], [60, 181, 74], [49, 80, 232], [217, 193, 74], [255, 255, 255]]
};
const RAMP_NAMES = Object.keys(RAMPS);
const ALPHAS = 6;
const SKIN = ':;t%SX8#@';          // sparse glyphs on bright skin, dense in shadow
const EDGE = ".'`,:;";
const FISH_GLYPH = ['-', '\\', '|', '/'];

/* ---------------- swimmers ---------------- */
// A spine of nodes; the head swims, the rest follow at a fixed spacing, so the
// body bends and undulates like a real swimmer.
class Spine {
  constructor(n, len, x, y, a) {
    this.n = n; this.len = len; this.seg = len / (n - 1);
    this.p = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { this.p[i * 2] = x - Math.cos(a) * this.seg * i; this.p[i * 2 + 1] = y - Math.sin(a) * this.seg * i; }
  }
  lead(x, y) {
    const p = this.p; p[0] = x; p[1] = y;
    for (let i = 1; i < this.n; i++) {
      const dx = p[i * 2] - p[i * 2 - 2], dy = p[i * 2 + 1] - p[i * 2 - 1], d = Math.hypot(dx, dy) || 1;
      p[i * 2] = p[i * 2 - 2] + dx / d * this.seg; p[i * 2 + 1] = p[i * 2 - 1] + dy / d * this.seg;
    }
  }
  shift(dx, dy) { for (let i = 0; i < this.n; i++) { this.p[i * 2] += dx; this.p[i * 2 + 1] += dy; } }
}

// Body outlines (top-down half-width as a fraction of length, s from snout 0 to tail 1).
const SHAPES = {
  shark: (s) => s < .13 ? .09 * Math.pow(Math.sin(s / .13 * Math.PI / 2), .95) : s < .3 ? .09 + .016 * smooth(.13, .3, s) : s < .86 ? .02 + .086 * Math.pow(1 - (s - .3) / .56, 1.25) : .02 * (1 - (s - .86) / .14) + .004,
  mako: (s) => s < .17 ? .086 * Math.pow(Math.sin(s / .17 * Math.PI / 2), 1.5) : s < .32 ? .086 + .012 * smooth(.17, .32, s) : s < .86 ? .014 + .084 * Math.pow(1 - (s - .32) / .54, 1.45) : .014 * (1 - (s - .86) / .14) + .004,
  hammer: (s) => s < .06 ? .045 : s < .3 ? .045 + .06 * smooth(.06, .3, s) : s < .86 ? .019 + .085 * Math.pow(1 - (s - .3) / .56, 1.25) : .019 * (1 - (s - .86) / .14) + .004,
  whale: (s) => s < .08 ? .06 + .5 * s : s < .32 ? .1 + .02 * smooth(.08, .32, s) : s < .82 ? .028 + .092 * Math.pow(1 - (s - .32) / .5, 1.1) : .028 * (1 - (s - .82) / .18) + .008,
  manta: (s) => s < .05 ? .2 : s < .5 ? .2 + .3 * Math.sin((s - .05) / .45 * Math.PI) * (1 - s * .3) : s < .62 ? .2 * (1 - (s - .5) / .12) + .02 : .012
};

class Beast {
  constructor(kind, o) {
    Object.assign(this, { kind, z: 1, speed: 60, wig: .3, wigF: 1.6, ramp: kind, tail: 0, ...o });
    this.shape = SHAPES[o.shape || kind];
    this.a = o.a ?? rnd() * TAU; this.t = rnd() * 10; this.turn = 0; this.boost = 0;
    this.x = o.x; this.y = o.y;
    this.sp = new Spine(o.nodes || 14, o.len, this.x, this.y, this.a);
    this.tris = [];
  }
  steer(world, dt) {
    const { W, H } = world;
    this.t += dt;
    if (this.path) { // scripted swimmers (whale, the shark that breaks the word)
      const dx = this.path.x - this.x, dy = this.path.y - this.y;
      const want = Math.atan2(dy, dx);
      let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.a += clamp(d, -1, 1) * dt * (this.turnRate || .6);
    } else { // wander, turning back towards the screen when outside it
      this.turn += (rnd() - .5) * dt * 2.2; this.turn *= Math.pow(.4, dt);
      const m = this.len * .7;
      let want = null;
      if (this.x < -m) want = 0; else if (this.x > W + m) want = Math.PI; else if (this.y < -m) want = Math.PI / 2; else if (this.y > H + m) want = -Math.PI / 2;
      if (this.prey && this.boost > 0) want = Math.atan2(this.prey.y - this.y, this.prey.x - this.x);
      if (want !== null) { let d = want - this.a; d = Math.atan2(Math.sin(d), Math.cos(d)); this.turn += d * dt * 1.6; }
      this.a += this.turn * dt;
    }
    this.boost = Math.max(0, this.boost - dt);
    const v = this.speed * (1 + this.boost * 1.6);
    const sw = Math.sin(this.t * this.wigF * (1 + this.boost)) * this.wig;
    this.x += Math.cos(this.a + sw * .35) * v * dt; this.y += Math.sin(this.a + sw * .35) * v * dt;
    this.sp.lead(this.x, this.y);
    this.v = v;
  }
}

/* ---------------- the engine ---------------- */
export function createOcean(canvas, opt = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, cw = 11, ch = 17, cols = 0, rows = 0, N = 0, coarse = 0;
  let pal = PALETTES.dark, theme = 'dark', depth = 0, font = '';
  let dotKind, dotPhase, dotFreq, energy, energy2, shade, stamp, glyph, style, zbuf;
  let gridCanvas = document.createElement('canvas');
  let styles = [], buckets = [], frame = 0, running = true, last = performance.now(), T = 0;
  const fish = [], beasts = [], jellies = [], pings = [];
  let word = null; // { targets, until, phase }
  const mouse = { x: -1e4, y: -1e4, px: -1e4, py: -1e4, v: 0, t: 0 };

  /* ---- style table: (ramp, level, alpha) and (dot colour, alpha) ---- */
  function buildStyles() {
    styles = []; const mk = (r, g, b, a) => `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
    const dk = theme === 'light';
    for (const name of RAMP_NAMES) for (let l = 0; l < 8; l++) for (let a = 0; a < ALPHAS; a++) {
      let [r, g, b] = RAMPS[name][l];
      if (dk && name !== 'eye') { const k = .55; r *= k; g *= k; b *= k; }
      if (dk && name === 'eye') { r = g = b = 20; }
      styles.push(mk(r, g, b, (a + 1) / ALPHAS));
    }
    // plankton dots (4 colours, blended toward the deep palette by depth), wake and fish
    const dotBase = styles.length;
    for (let c = 0; c < 6; c++) for (let a = 0; a < ALPHAS; a++) {
      let col = c < 4 ? pal.dots[c].map((v, i) => lerp(v, pal.deep[c][i], depth)) : c === 4 ? pal.wake : pal.fish;
      styles.push(mk(col[0], col[1], col[2], (a + 1) / ALPHAS));
    }
    styles.dotBase = dotBase;
    buckets = styles.map(() => []);
  }
  const rampIndex = (name, level, alpha) => (RAMP_NAMES.indexOf(name) * 8 + clamp(level | 0, 0, 7)) * ALPHAS + clamp(alpha | 0, 0, ALPHAS - 1);
  const dotIndex = (c, alpha) => styles.dotBase + c * ALPHAS + clamp(alpha | 0, 0, ALPHAS - 1);
  const RIX = Object.fromEntries(RAMP_NAMES.map((n) => [n, RAMP_NAMES.indexOf(n)]));

  /* ---- layout ---- */
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    // cap the simulated height: a full-page screenshot can make the viewport thousands of px tall
    W = innerWidth; H = Math.min(innerHeight, 1600);
    canvas.style.height = H + 'px';
    const small = W < 700;
    // slower devices step up to coarser cells (see the frame-time check in loop)
    cw = (small ? 8 : 9) + coarse * 2; ch = (small ? 12 : 14) + coarse * 3;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch); N = cols * rows;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    font = `600 ${(small ? 10 : 11.5) + coarse * 2}px 'Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace`;
    dotKind = new Uint8Array(N); dotPhase = new Float32Array(N); dotFreq = new Float32Array(N);
    energy = new Float32Array(N); energy2 = new Float32Array(N); shade = new Float32Array(N);
    stamp = new Uint32Array(N); glyph = new Uint16Array(N); style = new Uint16Array(N); zbuf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = rnd();
      dotKind[i] = r < .045 ? 1 : r < .07 ? 2 : r < .085 ? 3 : r < .16 ? 4 : 0;
      dotPhase[i] = rnd() * TAU; dotFreq[i] = .4 + rnd() * 1.6;
    }
    paintGrid();
  }
  function paintGrid() {
    gridCanvas.width = canvas.width; gridCanvas.height = canvas.height;
    const g = gridCanvas.getContext('2d');
    g.fillStyle = pal.bg; g.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
    g.strokeStyle = pal.grid; g.lineWidth = 1; g.beginPath();
    for (let c = 0; c <= cols; c++) { const x = Math.round(c * cw * dpr) + .5; g.moveTo(x, 0); g.lineTo(x, gridCanvas.height); }
    for (let r = 0; r <= rows; r++) { const y = Math.round(r * ch * dpr) + .5; g.moveTo(0, y); g.lineTo(gridCanvas.width, y); }
    g.stroke();
  }

  /* ---- population ---- */
  function populate() {
    fish.length = 0; beasts.length = 0; jellies.length = 0;
    const small = W < 700, nf = small ? 150 : 300;
    for (let i = 0; i < nf; i++) {
      const a = rnd() * TAU;
      fish.push({ x: rnd() * W, y: rnd() * H, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, a, glint: 0, tx: 0, ty: 0, target: false, z: .6 + rnd() * .4 });
    }
    const L = clamp(Math.min(W, H * 1.7), 380, 1500);
    beasts.push(new Beast('shark', { x: -260, y: H * .3, a: .1, len: L * .34, nodes: 16, speed: 72, z: 1, accents: true }));
    beasts.push(new Beast('mako', { x: W + 260, y: H * .72, a: Math.PI, len: L * .29, nodes: 16, speed: 88, z: .9, shape: 'mako' }));
    beasts.push(new Beast('hammer', { x: W * .5, y: H + 260, a: -Math.PI / 2, len: L * .31, nodes: 16, speed: 64, z: .8, shape: 'hammer', head: true }));
    beasts.push(new Beast('manta', { x: -320, y: H * .55, a: .05, len: L * .17, nodes: 10, speed: 40, z: .7, wig: .1, wigF: .9, manta: true }));
    for (let i = 0; i < (small ? 3 : 5); i++) jellies.push(newJelly(rnd() * W, H * (.3 + rnd() * .7)));
  }
  function newJelly(x, y) {
    const r = 16 + rnd() * 16, ten = [];
    for (let k = 0; k < 5; k++) { const pts = []; for (let j = 0; j < 13; j++) pts.push({ x, y: y + j * 7, ox: x, oy: y + j * 7 }); ten.push(pts); }
    return { x, y, r, vy: 0, phase: rnd() * TAU, f: .6 + rnd() * .5, ten, ramp: rnd() < .5 ? 'jelly' : 'jelly2', flash: 0 };
  }

  /* ---- whale: a slow giant that crosses the whole screen now and then ---- */
  let whaleAt = 14;
  function maybeWhale() {
    if (T < whaleAt || beasts.some((b) => b.kind === 'whale')) return;
    const fromLeft = rnd() < .5, y = H * (.3 + rnd() * .4);
    const len = Math.max(W * .62, 520);
    const w = new Beast('whale', { x: fromLeft ? -len * .2 : W + len * .2, y, a: fromLeft ? 0 : Math.PI, len, nodes: 24, speed: 46, z: 1.2, wig: .06, wigF: .7, whale: true, turnRate: .2 });
    w.path = { x: fromLeft ? W + len * 1.4 : -len * 1.4, y: y + (rnd() - .5) * H * .3 };
    beasts.unshift(w);
  }

  /* ---- the school spells a word, then a shark breaks it ---- */
  function spell(text, rect) {
    if (reduce) return;
    const off = document.createElement('canvas'), gc = off.getContext('2d');
    const c0 = Math.floor(rect.x / cw), r0 = Math.floor(rect.y / ch);
    const wc = Math.floor(rect.w / cw), hr = Math.floor(rect.h / ch);
    off.width = wc; off.height = hr;
    // narrow screens split the word over two lines so each letter keeps enough cells
    const lines = wc < 70 && text.length > 5 ? [text.slice(0, Math.ceil(text.length * .6)), text.slice(Math.ceil(text.length * .6))] : [text];
    const widest = lines.reduce((a, b) => (b.length > a.length ? b : a));
    let fs = Math.floor(hr / lines.length);
    const setFont = () => { gc.font = `900 ${fs}px 'Geist', system-ui, sans-serif`; };
    setFont();
    while (gc.measureText(widest).width * (cw / ch) > wc * .92 && fs > 6) { fs--; setFont(); }
    // draw squashed horizontally so the glyph grid's tall cells give true proportions
    gc.save(); gc.scale(ch / cw, 1);
    gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillStyle = '#fff';
    lines.forEach((ln, i) => gc.fillText(ln, wc / 2 * cw / ch, hr / 2 + (i - (lines.length - 1) / 2) * fs * 1.02));
    gc.restore();
    const d = gc.getImageData(0, 0, wc, hr).data, pts = [];
    for (let r = 0; r < hr; r++) for (let c = 0; c < wc; c++) if (d[(r * wc + c) * 4 + 3] > 128) pts.push([(c0 + c + .5) * cw, (r0 + r + .5) * ch]);
    // match fish to targets left-to-right so they stream in without crossing
    const take = Math.min(pts.length, fish.length);
    const step = pts.length / take, chosen = [];
    for (let i = 0; i < take; i++) chosen.push(pts[Math.floor(i * step)]);
    chosen.sort((a, b) => a[0] - b[0]);
    const order = fish.map((f, i) => i).sort((a, b) => fish[a].x - fish[b].x);
    fish.forEach((f) => { f.target = false; });
    for (let i = 0; i < take; i++) { const f = fish[order[Math.floor(i * fish.length / take)]]; f.target = true; f.tx = chosen[i][0]; f.ty = chosen[i][1]; }
    word = { phase: 'form', t: 0, rect, pts };
  }
  function breakWord() {
    if (!word) return;
    const r = word.rect, y = r.y + r.h * .5;
    const s = beasts.find((b) => b.kind === 'shark');
    if (s) { s.x = -s.len * .9; s.y = y; s.a = 0; s.sp = new Spine(s.sp.n, s.len, s.x, s.y, 0); s.path = { x: W + s.len * 2, y }; s.turnRate = .4; s.boost = 3; s.charge = true; }
    word.phase = 'hold-break';
  }

  /* ---- input ---- */
  function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = T; }
  function onDown(e) {
    if (e.target.closest && e.target.closest('a,button,input,textarea,canvas:not(#ocean),.box,video')) return;
    ping(e.clientX, e.clientY);
  }
  function ping(x, y) { pings.push({ x, y, r: 0, life: 1 }); for (const j of jellies) if (Math.hypot(j.x - x, j.y - y) < 500) j.flash = 1; }

  /* ---- simulation ---- */
  const GRID = 48; let hash = new Map();
  function updateFish(dt) {
    hash.clear();
    for (let i = 0; i < fish.length; i++) { const f = fish[i], k = ((f.x / GRID) | 0) * 7919 + ((f.y / GRID) | 0); let b = hash.get(k); if (!b) hash.set(k, b = []); b.push(i); }
    const predators = beasts.filter((b) => b.kind !== 'manta');
    const mSpeed = mouse.v;
    for (const f of fish) {
      let ax = 0, ay = 0;
      if (f.target && word && word.phase !== 'scatter') { // spring to a letter cell, ignore the flock
        const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
        ax += dx * 4 - f.vx * 3.2; ay += dy * 4 - f.vy * 3.2;
        if (d < 4) f.glint = Math.max(f.glint, .4);
      } else {
        let sx = 0, sy = 0, cx = 0, cy = 0, vx = 0, vy = 0, n = 0;
        const gx = (f.x / GRID) | 0, gy = (f.y / GRID) | 0;
        for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) {
          const b = hash.get((gx + ix) * 7919 + gy + iy); if (!b) continue;
          for (const j of b) { const o = fish[j]; if (o === f) continue; const dx = o.x - f.x, dy = o.y - f.y, d2 = dx * dx + dy * dy; if (d2 > 2400) continue; n++; cx += o.x; cy += o.y; vx += o.vx; vy += o.vy; if (d2 < 260) { sx -= dx / (d2 + 1) * 40; sy -= dy / (d2 + 1) * 40; } }
        }
        if (n) { ax += (cx / n - f.x) * .9 + (vx / n - f.vx) * 1.4 + sx * 6; ay += (cy / n - f.y) * .9 + (vy / n - f.vy) * 1.4 + sy * 6; }
        // predators and the whale: flee hard
        for (const p of predators) {
          const dx = f.x - p.x, dy = f.y - p.y, d = Math.hypot(dx, dy), R = p.kind === 'whale' ? p.len * .5 : 170;
          if (d < R) { const k = (1 - d / R) * 900; ax += dx / (d + 1) * k; ay += dy / (d + 1) * k; f.glint = Math.max(f.glint, 1 - d / R); }
        }
        // the cursor: a lure when slow, a threat when fast
        const dx = mouse.x - f.x, dy = mouse.y - f.y, d = Math.hypot(dx, dy);
        if (d < 180) { const k = mSpeed > 900 ? -500 : 70; ax += dx / (d + 1) * k * (1 - d / 180); ay += dy / (d + 1) * k * (1 - d / 180); }
        for (const p of pings) { const ddx = f.x - p.x, ddy = f.y - p.y, dd = Math.hypot(ddx, ddy); if (Math.abs(dd - p.r) < 40) { ax += ddx / (dd + 1) * 1600; ay += ddy / (dd + 1) * 1600; f.glint = 1; } }
        ax += Math.cos(T * .3 + f.z * 9) * 8; ay += Math.sin(T * .23 + f.z * 7) * 8;
      }
      f.vx += ax * dt; f.vy += ay * dt;
      const sp = Math.hypot(f.vx, f.vy), max = f.target && word && word.phase !== 'scatter' ? 420 : 170, min = 26;
      if (sp > max) { f.vx *= max / sp; f.vy *= max / sp; } else if (sp < min && !(f.target && word)) { f.vx *= min / (sp || 1); f.vy *= min / (sp || 1); }
      const na = Math.atan2(f.vy, f.vx); let da = na - f.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > dt * 6) f.glint = Math.max(f.glint, .7);
      f.a = na; f.glint = Math.max(0, f.glint - dt * 1.8);
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (!f.target) { // free fish wrap around the screen like a current
        if (f.x < -20) f.x += W + 40; else if (f.x > W + 20) f.x -= W + 40;
        if (f.y < -20) f.y += H + 40; else if (f.y > H + 20) f.y -= H + 40;
      }
      wake(f.x, f.y, .025);
    }
  }

  function updateBeasts(dt) {
    for (const b of beasts) {
      if (b.kind !== 'whale' && !b.charge) { // hunt the nearest fish now and then
        if (!b.prey || rnd() < dt * .2) { let best = null, bd = 260 * 260; for (const f of fish) { const d = (f.x - b.x) ** 2 + (f.y - b.y) ** 2; if (d < bd) { bd = d; best = f; } } b.prey = best; if (best && rnd() < .5) b.boost = 1.2; }
      }
      b.steer({ W, H }, dt);
      if (b.charge && b.x > W + b.len) { b.charge = false; b.path = null; b.boost = 0; }
      if (b.path && b.kind === 'whale' && Math.hypot(b.path.x - b.x, b.path.y - b.y) < b.len * .3) { b.dead = true; whaleAt = T + 35 + rnd() * 20; }
      // the body lights up the water it passes through
      const p = b.sp.p, k = b.kind === 'whale' ? .35 : .16;
      for (let i = 0; i < b.sp.n; i += 2) wake(p[i * 2], p[i * 2 + 1], k * (1 + b.boost));
    }
    for (let i = beasts.length - 1; i >= 0; i--) if (beasts[i].dead) beasts.splice(i, 1);
    if (word) {
      word.t += dt;
      if (word.phase === 'form' && word.t > 3.6) { word.phase = 'held'; word.t = 0; }
      if (word.phase === 'held' && word.t > 2.2) { breakWord(); word.t = 0; }
      if (word.phase === 'hold-break') {
        const s = beasts.find((b) => b.charge);
        if (s && s.x > word.rect.x - s.len * .1) { word.phase = 'scatter'; word.t = 0; for (const f of fish) if (f.target) { const dy = f.y - s.y; f.vy += Math.sign(dy || 1) * (240 + rnd() * 200); f.vx += (rnd() - .3) * 260; f.glint = 1; } }
        if (!s && word.t > 3) word.phase = 'scatter';
      }
      if (word.phase === 'scatter' && word.t > 1.5) { for (const f of fish) f.target = false; word = null; }
    }
  }

  function updateJellies(dt) {
    for (const j of jellies) {
      j.phase += dt * j.f * TAU * .5;
      const pulse = Math.max(0, Math.sin(j.phase));
      j.vy += (-pulse * 26 + 6) * dt; j.vy *= Math.pow(.6, dt);
      j.y += j.vy * dt; j.x += Math.sin(T * .2 + j.r) * 6 * dt;
      j.flash = Math.max(0, j.flash - dt * .8);
      if (j.y < -80) { j.y = H + 60; j.x = rnd() * W; for (const t of j.ten) for (const p of t) { p.x = j.x; p.y = j.y; p.ox = p.x; p.oy = p.y; } }
      // verlet tentacles hanging from the bell rim
      j.ten.forEach((t, k) => {
        const ax = j.x + (k - 2) * j.r * .32, ay = j.y + j.r * .45;
        t[0].x = ax; t[0].y = ay;
        for (let i = 1; i < t.length; i++) { const p = t[i], vx = (p.x - p.ox) * .96, vy = (p.y - p.oy) * .96; p.ox = p.x; p.oy = p.y; p.x += vx + Math.sin(T * 1.3 + i * .6 + k) * .25; p.y += vy + 9 * dt; }
        for (let it = 0; it < 2; it++) for (let i = 1; i < t.length; i++) { const a = t[i - 1], b = t[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, seg = j.r * .55, k2 = (d - seg) / d; b.x -= dx * k2; b.y -= dy * k2; }
      });
      wake(j.x, j.y, .05 + pulse * .1);
    }
  }

  function wake(x, y, amt) {
    const c = (x / cw) | 0, r = (y / ch) | 0;
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    energy[r * cols + c] = Math.min(1.6, energy[r * cols + c] + amt);
  }
  function diffuse(dt) {
    const decay = Math.pow(.06, dt), sp = .2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, e = energy[i];
      const n = (c > 0 ? energy[i - 1] : e) + (c < cols - 1 ? energy[i + 1] : e) + (r > 0 ? energy[i - cols] : e) + (r < rows - 1 ? energy[i + cols] : e);
      energy2[i] = (e * (1 - sp) + n * .25 * sp) * decay;
    }
    const t = energy; energy = energy2; energy2 = t;
  }

  /* ---- rasterising ---- */
  function put(c, r, ch2, st, z) {
    if (c < 0 || r < 0 || c >= cols || r >= rows) return;
    const i = r * cols + c;
    if (stamp[i] === frame && zbuf[i] > z) return;
    stamp[i] = frame; zbuf[i] = z; glyph[i] = ch2; style[i] = st;
  }
  const light = { x: -.45, y: -.55, z: .7 };
  function drawBeast(b) {
    const sp = b.sp, p = sp.p, n = sp.n, L = sp.len, shapeW = b.shape;
    const isWhale = b.kind === 'whale', isManta = b.kind === 'manta';
    // per-node tangents and normals
    const tx = new Float32Array(n), ty = new Float32Array(n);
    for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), c = Math.min(n - 1, i + 1); const dx = p[a * 2] - p[c * 2], dy = p[a * 2 + 1] - p[c * 2 + 1], d = Math.hypot(dx, dy) || 1; tx[i] = dx / d; ty[i] = dy / d; }
    const flap = isManta ? .72 + .28 * Math.sin(b.t * 2.2) : 1;
    const widest = (isManta ? .5 * flap : isWhale ? .14 : .12) * L + (b.head ? .17 * L : 0) + (isWhale ? .26 * L : .3 * L);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, p[i * 2]); x1 = Math.max(x1, p[i * 2]); y0 = Math.min(y0, p[i * 2 + 1]); y1 = Math.max(y1, p[i * 2 + 1]); }
    x0 -= widest; y0 -= widest; x1 += widest; y1 += widest;
    const c0 = Math.max(0, Math.floor(x0 / cw)), c1 = Math.min(cols - 1, Math.ceil(x1 / cw));
    const r0 = Math.max(0, Math.floor(y0 / ch)), r1 = Math.min(rows - 1, Math.ceil(y1 / ch));
    if (c0 > c1 || r0 > r1) return;
    const ramp = RIX[b.ramp], depthDim = clamp(b.z, .5, 1.2);
    // fins as triangles in (along, across) body space
    const fins = isManta ? [] : isWhale
      ? [[.18, .26, .5, .32, 'fin'], [.88, .97, 1.08, .16, null]]
      : [[.2, .31, .45, .19, null], [.58, .64, .68, .06, null], [.9, .99, 1.07, .13, null]];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const X = (c + .5) * cw, Y = (r + .5) * ch;
      // nearest point on the spine polyline
      let best = 1e9, bs = 0, blat = 0;
      for (let i = 0; i < n - 1; i++) {
        const ax = p[i * 2], ay = p[i * 2 + 1], bx = p[i * 2 + 2], by = p[i * 2 + 3];
        const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
        let u = ((X - ax) * vx + (Y - ay) * vy) / l2; const extend = i === n - 2 ? 1.35 : 1;
        u = clamp(u, i === 0 ? -.15 : 0, extend);
        const raw = ((X - ax) * vx + (Y - ay) * vy) / l2;
        const qx = ax + vx * u, qy = ay + vy * u, dx = X - qx, dy = Y - qy, d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2; bs = (i + u) / (n - 1);
          const perp = (dx * -vy + dy * vx) / Math.sqrt(l2);
          blat = raw !== u ? Math.sign(perp || 1) * Math.sqrt(d2) : perp;
        }
      }
      const s = bs, along = s * L, lat = blat, alat = Math.abs(lat);
      const ni = clamp(Math.round(s * (n - 1)), 0, n - 1);
      let hw = (s >= 0 && s <= 1 ? shapeW(s) : 0) * L * (isManta ? flap : 1);
      let inside = alat < hw, edge = !inside && hw > 0 && s >= 0 && s <= 1 && alat < hw + cw * .9, lvl = 0, glyphSet = SKIN, rName = ramp, alpha = 5;
      let finHit = false;
      if (!inside) for (const [f0, f1, ft, reach, rr] of fins) { // fins
        const fa = f0 * L, fb = f1 * L, tipA = ft * L, tipL = reach * L;
        const rootW0 = shapeW(clamp(f0, 0, 1)) * L, rootW1 = shapeW(clamp(f1, 0, 1)) * L;
        if (along > fa - 2 && along < Math.max(fb, tipA) + 2) {
          // triangle (fa,rootW0) (fb,rootW1) (tipA, tipL) mirrored across the spine
          if (inTri(along, alat, fa, rootW0 * .9, fb, rootW1 * .9, tipA, tipL)) { finHit = true; if (rr) rName = RIX[rr]; break; }
        }
      }
      if (!inside && !finHit && !edge) continue;
      // shading: a rounded cross-section lit from the upper left
      const u = clamp(lat / (hw || 1), -1, 1), nz = Math.sqrt(Math.max(0, 1 - u * u));
      const nx = -ty[ni] * u, ny = tx[ni] * u;
      let sh = clamp(nx * light.x + ny * light.y + nz * light.z, 0, 1);
      if (finHit) sh = .35 + .3 * (1 - alat / (hw + 60));
      lvl = Math.round(sh * 7 * depthDim);
      let g;
      if (edge && !finHit) { g = EDGE[clamp(Math.floor((alat - hw) / (cw * .9) * EDGE.length), 0, EDGE.length - 1)]; alpha = 3; lvl = Math.max(lvl, 3); }
      else if (finHit) g = SKIN[clamp(Math.round((1 - sh) * 5) + 1, 0, SKIN.length - 1)];
      else {
        const gi = clamp(Math.round((1 - sh) * (glyphSet.length - 1) + (hashN(c, r, frame >> 4) - .5) * .7), 0, glyphSet.length - 1);
        g = glyphSet[gi];
        if (alat < hw * .14 && s > .22 && s < .5 && !isWhale && !isManta) { g = '@8%'[(c + r) & 1]; lvl = Math.min(7, lvl + 2); } // dorsal ridge
        if (isWhale && s > .05 && s < .4 && alat < hw * .5 && hashN(c, r, 1) > .93) { g = 'o'; rName = RIX.fin; } // barnacles
        if (isManta && Math.abs(u) > .75) { rName = RIX.fin; lvl = 5; }  // pale wing margins
        // a shimmer of accent colours on the first shark
        if (b.accents && hashN(c, r, (T * 2) | 0) > .985) { rName = RIX.accent; lvl = (c * 7 + r) % 7; }
      }
      put(c, r, g.charCodeAt(0), (rName * 8 + clamp(lvl, 0, 7)) * ALPHAS + clamp(alpha, 0, 5), b.z + (inside ? .01 : 0));
      // the shadow cast on the sea floor below
      const sc = c + 2, srr = r + 2;
      if (inside && sc < cols && srr < rows) shade[srr * cols + sc] = Math.max(shade[srr * cols + sc], .8);
    }
    // eyes: one bright glyph on each side of the head
    if (!isManta && !b.head) {
      const se = isWhale ? .09 : .1, i = Math.round(se * (n - 1)), hw = shapeW(se) * L * .72;
      for (const sd of [-1, 1]) put(Math.floor((p[i * 2] - ty[i] * hw * sd) / cw), Math.floor((p[i * 2 + 1] + tx[i] * hw * sd) / ch), 8226, (RIX.eye * 8 + 7) * ALPHAS + 5, b.z + .05);
    }
    // the hammerhead's cephalofoil: a wide bar across the snout
    if (b.head) {
      const hx = p[0], hy = p[1], nx2 = -ty[0], ny2 = tx[0], span = .17 * L;
      for (let k = -span; k <= span; k += cw * .5) for (let d = 0; d < .07 * L; d += ch * .5) {
        const sweep = Math.abs(k) / span * .03 * L;
        const X = hx + nx2 * k - tx[0] * (d + sweep), Y = hy + ny2 * k - ty[0] * (d + sweep);
        const cc = Math.floor(X / cw), rr = Math.floor(Y / ch);
        const isEye = Math.abs(Math.abs(k) - span) < cw * .5 && d < ch * .5;
        put(cc, rr, (isEye ? '•' : 'X%S8'[(cc + rr) & 3]).charCodeAt(0), ((isEye ? RIX.eye : ramp) * 8 + (isEye ? 7 : 4)) * ALPHAS + 5, b.z + .02);
      }
    }
    // the manta's long whip tail and cephalic fins
    if (isManta) {
      for (let k = 1; k < 26; k++) { const i = n - 1, X = p[i * 2] - tx[i] * -k * 6, Y = p[i * 2 + 1] - ty[i] * -k * 6; put(Math.floor(X / cw), Math.floor(Y / ch), (k % 3 ? '-' : '~').charCodeAt(0), (ramp * 8 + 4) * ALPHAS + 4, b.z); }
    }
  }
  function inTri(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  function hashN(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  function drawJelly(j) {
    const pulse = Math.max(0, Math.sin(j.phase)), r = j.r * (1 - pulse * .18), wide = r * (1 + pulse * .25);
    const glow = 1 + j.flash + depth * 1.2, ramp = RIX[j.ramp];
    const c0 = Math.floor((j.x - wide) / cw), c1 = Math.ceil((j.x + wide) / cw), r0 = Math.floor((j.y - r) / ch), r1 = Math.ceil((j.y + r * .5) / ch);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const X = (cc + .5) * cw, Y = (rr + .5) * ch, dx = (X - j.x) / wide, dy = (Y - j.y) / r;
      if (dy > .45) continue;
      const d = Math.hypot(dx, dy); if (d > 1.08) continue;
      const rim = d > .82, g = rim ? (dy > .25 ? (dx < 0 ? '(' : ')') : 'O') : d < .35 ? '·' : ':';
      put(cc, rr, g.charCodeAt(0), (ramp * 8 + clamp(Math.round((rim ? 6 : 3) * Math.min(glow, 1.3)), 0, 7)) * ALPHAS + (rim ? 5 : 3), .5);
    }
    for (const t of j.ten) for (let i = 1; i < t.length; i++) {
      const p = t[i], g = i % 3 === 0 ? ':' : i % 2 ? '¦' : '.';
      put(Math.floor(p.x / cw), Math.floor(p.y / ch), g.charCodeAt(0), (ramp * 8 + clamp(Math.round((6 - i * .5) * Math.min(glow, 1.3)), 1, 7)) * ALPHAS + clamp(5 - (i >> 1), 1, 5), .45);
    }
  }

  /* ---- frame ---- */
  function render() {
    frame++;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(gridCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    shade.fill(0);
    for (const b of beasts) drawBeast(b);
    for (const j of jellies) drawJelly(j);
    if (word && (word.phase === 'held' || word.phase === 'hold-break' || (word.phase === 'form' && word.t > 2.2))) {
      const k = word.phase === 'form' ? (word.t - 2.2) / 1.4 : 1;
      for (const [x, y] of word.pts) put(Math.floor(x / cw), Math.floor(y / ch), (hashN(x, y, (T * 3) | 0) > .5 ? 58 : 43), styles.dotBase + 4 * ALPHAS + clamp(Math.round(k * 3), 0, 5), .55);
    }
    for (const f of fish) {
      const c = Math.floor(f.x / cw), r = Math.floor(f.y / ch);
      let a = ((f.a % Math.PI) + Math.PI) % Math.PI, gi = Math.round(a / (Math.PI / 4)) % 4;
      const held = f.target && word && word.phase !== 'scatter' && word.phase !== 'form';
      const g = held ? '#' : f.glint > .6 ? '•' : FISH_GLYPH[gi];
      const alpha = held ? 5 : clamp(Math.round((f.z * .7 + f.glint * .5) * 5 * (1 - depth * .35)), 1, 5);
      put(c, r, g.charCodeAt(0), styles.dotBase + 5 * ALPHAS + alpha, .6 + (held ? .5 : 0));
    }
    // bucket every visible cell by style, then draw each bucket in one fillStyle
    for (const b of buckets) b.length = 0;
    const glow = pal.glow * (1 + depth * .6);
    for (let r = 0, i = 0; r < rows; r++) for (let c = 0; c < cols; c++, i++) {
      if (stamp[i] === frame) { buckets[style[i]].push(i); continue; }
      const e = energy[i] * glow, k = dotKind[i], sh = shade[i];
      if (e > .16) { // wake: cyan dots that brighten with energy
        const a = clamp(Math.round(e * 3.2) - 1, 0, 5);
        glyph[i] = (e > .9 ? 43 : e > .45 ? 58 : 183); buckets[dotIndex(4, a)].push(i);
      } else if (k) {
        const tw = .5 + .5 * Math.sin(T * dotFreq[i] + dotPhase[i]);
        const a = Math.round((k === 4 ? .35 : .25 + tw * .75) * 5 * (1 - sh * .8) * (1 - depth * .25));
        if (a <= 0) continue;
        glyph[i] = k === 4 ? 46 : tw > .9 ? 42 : 183; buckets[dotIndex(k - 1, a - 1)].push(i);
      }
    }
    for (let s = 0; s < buckets.length; s++) {
      const b = buckets[s]; if (!b.length) continue;
      ctx.fillStyle = styles[s];
      for (const i of b) { const c = i % cols, r = (i / cols) | 0; ctx.fillText(String.fromCharCode(glyph[i]), (c + .5) * cw, (r + .5) * ch + 1); }
    }
  }

  function step(dt) {
    T += dt;
    mouse.v = Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py) / Math.max(dt, 1e-3); mouse.px = mouse.x; mouse.py = mouse.y;
    if (T - mouse.t < .6) { wake(mouse.x, mouse.y, .5); }
    for (const p of pings) { p.r += 520 * dt; p.life -= dt * .55; for (let a = 0; a < TAU; a += 6 / Math.max(p.r, 20)) wake(p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r * .9, .35 * p.life); }
    for (let i = pings.length - 1; i >= 0; i--) if (pings[i].life <= 0) pings.splice(i, 1);
    maybeWhale();
    updateBeasts(dt); updateJellies(dt); updateFish(dt); diffuse(dt);
  }

  let rafId = 0, acc = 0, slow = 0, coarseAt = 0;
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!running) return;
    acc += dt;
    // reduced motion and automated browsers (test runners, crawlers) get a calm 8–10 fps
    const target = reduce ? 1 / 8 : navigator.webdriver ? 1 / 10 : W < 700 ? 1 / 30 : 0;
    if (acc < target) return;
    step(Math.min(acc, .05)); acc = 0;
    const t0 = performance.now();
    render();
    // if drawing alone takes more than ~20 ms for a couple of seconds, use bigger cells
    slow = slow * .95 + (performance.now() - t0) * .05;
    if (slow > 20 && coarse < 2 && T - coarseAt > 3) { coarse++; coarseAt = T; slow = 0; resize(); buildStyles(); }
  }

  function setTheme(t) { theme = t; pal = PALETTES[t] || PALETTES.dark; buildStyles(); paintGrid(); }
  function setDepth(d) {
    const nd = clamp(d, 0, 1);
    if (Math.abs(nd - depth) > .02) { depth = nd; buildStyles(); }
    // the deeper you go, the more jellies drift up
    const want = Math.round((W < 700 ? 3 : 5) + depth * (W < 700 ? 3 : 6));
    while (jellies.length < want) jellies.push(newJelly(rnd() * W, H + 40));
    while (jellies.length > want) jellies.pop();
  }

  resize(); buildStyles(); populate();
  addEventListener('resize', () => { resize(); buildStyles(); });
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });
  // warm the simulation up so the first frame is already alive
  for (let i = 0; i < 90; i++) step(1 / 30);
  rafId = requestAnimationFrame(loop);

  return {
    setTheme, setDepth, ping, spell,
    pause(v) { running = !v; last = performance.now(); },
    stepFrames(n, dt = 1 / 30) { for (let i = 0; i < n; i++) step(dt); render(); }, // for deterministic captures
    destroy() { cancelAnimationFrame(rafId); }
  };
}

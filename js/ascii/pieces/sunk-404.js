/* sunk-404: the not-found page. A 404 resting under the waves, bubbles rising,
   an anchor on a chain, weed swaying on the sand and a fish passing through.
   The block digits come from ascii-magic-art's page-404 piece (MIT). */
import { Grid, palette, gradient, rng } from "../lib/kit.js";
import { themed } from "./theme.js";

// keys: 0-9 water ramp for the digits, a text, b muted, c faint, d darker, e accent,
// f sand, g weed, h digit shadow, i bubble, j surface
const DARK = [...gradient(["#0d3a4a", "#17708a", "#3fb8c9", "#b8f3ff"], 10), "#efefec", "#a9a9a4", "#5e5e5a", "#2c2c2a", "#ff6a33", "#8a7a5c", "#3f8f5a", "#0c1a20", "#9fdde6", "#56c8d4"];
const LIGHT = [...gradient(["#063848", "#0e6f80", "#1696a8", "#4cc0cc"], 10), "#111111", "#4f4f4c", "#8c8c87", "#c9c9c3", "#e14d12", "#a08a5a", "#2e7d4a", "#cfe6ea", "#2a8f9c", "#0e7c86"];
const pal = themed(DARK, LIGHT);

export const meta = {
  slug: "sunk-404",
  name: "Sunk 404",
  category: "screens",
  note: "A not found page: a 404 resting under the waves with bubbles, an anchor, weed and a passing fish.",
  cols: 84, rows: 26, fps: 20,
  palette: palette(DARK),
};

const GL = {
  "4": ["##   ##", "##   ##", "#######", "     ##", "     ##"],
  "0": [" ##### ", "##   ##", "##   ##", "##   ##", " ##### "],
};
const ANCHOR = ["  _|_  ", "   |   ", "\\  |  /", " \\_|_/ "];
const FISH = "><(((°>", FRY = "<><";

export default function create() {
  const { cols: W, rows: H } = meta;
  const g = new Grid(W, H);
  const r = rng(404);
  const motes = Array.from({ length: 90 }, () => [r() * W, 3 + r() * (H - 7), r() * 6.28, r()]);
  const bubbles = Array.from({ length: 16 }, () => [8 + r() * 56, r() * 30, 2 + r() * 2.5, r() * 6.28]);
  const weeds = [3, 9, 31, 47, 58, 76, 80].map((x) => [x, 2 + Math.floor(r() * 4), r() * 6.28]);
  const sand = Array.from({ length: W * 3 }, () => ".,_ ·"[Math.floor(r() * 5)]);
  const FLOOR = H - 3;
  return (t) => {
    g.clear();
    // surface
    for (let x = 0; x < W; x++) {
      const v = Math.sin(x * 0.27 - t * 1.6) + 0.6 * Math.sin(x * 0.11 + t * 0.8);
      g.set(x, 0, v > 0.9 ? "^" : v > -0.2 ? "~" : "-", "j");
      if (v > 1.2) g.set(x, 1, "·", "c");
    }
    // drifting motes in the water
    for (const [x, y, ph, b] of motes) {
      const tw = 0.5 + 0.5 * Math.sin(t * (0.8 + b) + ph);
      g.set((x + t * (0.3 + b * 0.5)) % W, y + Math.sin(t * 0.5 + ph) * 0.6, tw > 0.8 ? "·" : ".", tw > 0.8 ? "c" : "d");
    }
    // a fish and a fry crossing behind the digits
    const fx = ((t * 6) % (W + 30)) - 10;
    g.text(Math.round(fx), 13, FISH, "b");
    const ry = 3 + Math.round(Math.sin(t * 0.6));
    g.text(Math.round(W + 8 - ((t * 9) % (W + 16))), ry, FRY, "c");
    // the anchor on its chain
    const ax = 66, sway = Math.round(Math.sin(t * 0.5) * 0.6);
    for (let y = 1; y < FLOOR - 4; y++) g.set(ax + 3 + (y > 8 ? sway : 0), y, y % 2 ? "o" : "8", "c");
    ANCHOR.forEach((line, i) => { for (let k = 0; k < line.length; k++) if (line[k] !== " ") g.set(ax + k + sway, FLOOR - 4 + i, line[k], "b"); });
    // 404 resting in the water, gently swaying, with caustic light across it
    const ox = 6, oy = 3;
    for (let d = 0; d < 3; d++) {
      const gl = GL["404"[d]], bob = Math.round(Math.sin(t * 0.9 + d * 1.1) * 0.6);
      for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
        if (gl[row][col] !== "#") continue;
        for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
          const x = ox + d * 19 + col * 2 + sx, y = oy + row * 2 + sy + bob;
          g.set(x + 1, y + 1, "░", "h");
          const caustic = Math.sin(x * 0.35 + t * 1.3) + Math.sin(y * 0.9 - t * 1.1 + x * 0.12);
          const k = Math.max(0, Math.min(9, Math.round(6 - (y - oy) * 0.35 + caustic * 1.6)));
          g.set(x, y, "█", String(k));
        }
      }
    }
    // bubbles rising from the digits to the surface
    for (const [bx, ph, sp, wob] of bubbles) {
      const y = 14 - ((t * sp + ph) % 14);
      const x = bx + Math.sin(t * 2 + wob) * 0.8;
      g.set(x, y, y < 4 ? "°" : y < 9 ? "o" : ".", "i");
    }
    // sand and weed
    for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) g.set(x, y, sand[x + (y - FLOOR) * W], "f");
    for (const [x, h, ph] of weeds) for (let k = 0; k < h; k++) {
      const s = Math.sin(t * 1.2 + ph + k * 0.7);
      g.set(x + (k > 1 && s > 0.4 ? 1 : 0), FLOOR - 1 - k, s > 0 ? ")" : "(", "g");
    }
    // copy
    g.text(6, 16, "ERROR 404 · PAGE NOT FOUND", "e");
    g.text(6, 18, "This page sank to the bottom.", "a");
    g.text(6, 19, "The link may be broken, or the page has moved.", "b");
    g.text(W - 24, H - 1, " sonar: no echo", "c");
    g.text(W - 9, H - 1, ".".repeat(1 + (Math.floor(t * 2) % 3)).padEnd(3), "c");
    return { ...g.frame(), palette: pal() };
  };
}

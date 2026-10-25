/* career-log: my career as `git log --graph`, the commits landing oldest first.
   Layout after ascii-magic-art's git-log-graph (MIT); the history is real. */
import { Grid, palette } from "../lib/kit.js";
import { themed } from "./theme.js";

// keys: 0 message, 1 muted, 2 faint, 3 main line, 4 branch line, 5 hash, 6 HEAD, 7 tag
const DARK = ["#efefec", "#a9a9a4", "#3a3a38", "#ff6a33", "#56c8d4", "#8a8a85", "#ff8a5c", "#7fe0ad"];
const LIGHT = ["#111111", "#4f4f4c", "#c9c9c3", "#e14d12", "#0e7c86", "#7a7a75", "#d9420c", "#11734a"];
const pal = themed(DARK, LIGHT);

export const meta = {
  slug: "career-log",
  name: "Career Log",
  category: "screens",
  note: "Six years of work and study as a git commit graph, with education merged in as branches.",
  cols: 90, rows: 21, fps: 12,
  palette: palette(DARK),
};

// newest first: [graph, kind (c commit, m merge, b branch commit, "" connector), date, message, label]
const LOG = [
  ["*   ", "c", "10.2025", "adigy.ai: team lead · bid optimizer, revenue +20%", "head"],
  ["*   ", "m", "2025", "Merge branch 'msc' · MSc Data Analytics, Hildesheim"],
  ["|\\  ", ""],
  ["* | ", "c", "08.2024", "sewts: ML engineer · active learning, labeling −90%"],
  ["* | ", "c", "09.2023", "fleek.kz: team lead · logistics MVP in 2 months"],
  ["| * ", "b", "2023", "msc: ML, computer vision, optimization"],
  ["|/  ", ""],
  ["*   ", "m", "2023", "Merge branch 'bsc' · BSc CS, Nazarbayev University"],
  ["|\\  ", ""],
  ["* | ", "c", "2023", "IEEE MetroAgriFor · ML training via a mobile app", "paper"],
  ["* | ", "c", "12.2022", "macdent.kz: responses 10× faster, moved to AWS"],
  ["* | ", "c", "2022", "ASTES journal · accuracy vs interpretability", "paper"],
  ["* | ", "c", "08.2021", "nazarbayev univ: ML researcher · pest detection +50%"],
  ["* | ", "c", "07.2020", "bri: full-stack · daily active users 20k → 40k"],
  ["| * ", "b", "2019", "bsc: computer science"],
  ["|/  ", ""],
  ["*   ", "c", "2019", "init: hello, world"],
];
const hash = (n) => { let h = (n * 2654435761 + 40427) >>> 0; h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; return h.toString(16).padStart(8, "0").slice(0, 7); };
const PER = 0.32; // seconds between commits landing

export default function create() {
  const { cols: W, rows: H } = meta;
  const g = new Grid(W, H);
  return (t) => {
    g.clear();
    g.box(0, 0, W, H, "round", "2");
    g.text(2, 0, " $ git log --graph --oneline career ", "1");
    const shown = Math.floor(t / PER); // rows revealed, counted from the bottom (oldest)
    const n = LOG.length;
    LOG.forEach(([gr, kind, date, msg, label], i) => {
      const age = n - 1 - i; // 0 = oldest
      if (age >= shown) return;
      const y = 1 + i, fresh = age === shown - 1 && t < n * PER + 0.4;
      for (let k = 0; k < gr.length; k++) if (gr[k] !== " ") g.set(2 + k, y, gr[k], k === 0 ? "3" : "4");
      if (!kind) return;
      let x = 7;
      g.text(x, y, hash(i + 3), "5"); x += 8;
      g.text(x, y, date.padEnd(7), "1"); x += 9;
      if (label === "head") {
        g.text(x, y, "(", "1"); g.text(x + 1, y, "HEAD -> main", "6"); g.text(x + 13, y, ")", "1"); x += 15;
      } else if (label) {
        g.text(x, y, `(tag: ${label})`, "7"); x += label.length + 8;
      }
      // the newest landed commit types itself out
      const typed = fresh ? Math.floor(((t % PER) / PER) * msg.length * 1.6) : msg.length;
      g.text(x, y, msg.slice(0, Math.min(msg.length, W - 2 - x)).slice(0, typed), kind === "m" ? "1" : "0");
    });
    // prompt with a blinking cursor once the log is out
    if (shown >= n) {
      g.text(2, H - 2, "$", "3");
      if (Math.floor(t * 1.6) % 2 === 0) g.set(4, H - 2, "█", "1");
    }
    return { ...g.frame(), palette: pal() };
  };
}

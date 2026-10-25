/* reel-loader: a one-line terminal progress bar shown on a project card while its
   video reel buffers. reelLoader(progress) returns a piece module; progress() gives
   the real buffered fraction (0..1), or a negative number while it is unknown. */
import { Grid, palette } from "../lib/kit.js";

const SPIN = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
// keys: 0 text, 1 bar, 2 track, 3 spinner (always on a dark chip, so one palette)
const PAL = palette(["#efefec", "#ff6a33", "#4a4a47", "#ff8a5c"]);

export function reelLoader(progress) {
  const meta = { slug: "reel-loader", name: "Reel Loader", cols: 24, rows: 1, fps: 15, palette: PAL };
  function create() {
    const g = new Grid(meta.cols, meta.rows);
    return (t) => {
      g.clear();
      const p = progress(), w = 12;
      g.set(0, 0, SPIN[Math.floor(t * 12) % SPIN.length], "3");
      g.text(2, 0, "reel", "0");
      if (p < 0) {
        // unknown length: a block bouncing along the track
        const at = Math.round((Math.sin(t * 3) * 0.5 + 0.5) * (w - 3));
        for (let k = 0; k < w; k++) g.set(7 + k, 0, k >= at && k < at + 3 ? "█" : "░", k >= at && k < at + 3 ? "1" : "2");
      } else {
        const n = Math.round(Math.min(1, p) * w);
        for (let k = 0; k < w; k++) g.set(7 + k, 0, k < n ? "█" : "░", k < n ? "1" : "2");
        g.text(20, 0, `${Math.round(Math.min(1, p) * 100)}%`.padStart(4), "0");
      }
      return g.frame();
    };
  }
  return { meta, default: create };
}

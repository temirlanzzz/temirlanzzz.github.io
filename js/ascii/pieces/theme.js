/* Picks a piece palette for the site's light or dark theme. Pieces attach it to
   each frame as frame.palette, which the player prefers over meta.palette. */
import { palette } from "../lib/kit.js";

export const isDark = () => typeof document === "undefined" || document.documentElement.dataset.theme !== "light";

export function themed(dark, light) {
  const D = palette(dark), L = palette(light);
  return () => (isDark() ? D : L);
}

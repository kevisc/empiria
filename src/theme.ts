/**
 * Central colour palette, shared by the Canvas visualizations (which read the
 * mutable THEME object) and the CSS chrome (via the matching custom properties
 * in styles.css). Series colours use the Okabe–Ito colourblind-safe set, and
 * every significance cue is paired with text so it never relies on hue alone.
 */
export interface Theme {
  bg: string; // canvas background
  ink: string; // primary text / strong strokes
  muted: string; // secondary text
  grid: string; // axes / gridlines
  accent: string; // primary data series (histogram bars)
  gold: string; // theoretical curve / point estimate
  ok: string; // non-significant / white-noise / in-band
  bad: string; // reject / out-of-band
  series2: string; // secondary series (bootstrap, data, categories)
}

// Okabe–Ito colourblind-safe hues.
const OKABE = {
  orange: "#E69F00",
  skyBlue: "#56B4E9",
  green: "#009E73",
  blue: "#0072B2",
  vermillion: "#D55E00",
  purple: "#CC79A7",
};

const DARK: Theme = {
  bg: "#10151b",
  ink: "#e8edf2",
  muted: "#8b97a6",
  grid: "#2c3a4a",
  accent: OKABE.skyBlue,
  gold: OKABE.orange,
  ok: OKABE.green,
  bad: OKABE.vermillion,
  series2: OKABE.purple,
};

const LIGHT: Theme = {
  bg: "#eef1f5",
  ink: "#16202b",
  muted: "#566373",
  grid: "#c2ccd6",
  accent: OKABE.blue,
  gold: "#b8860b",
  ok: OKABE.green,
  bad: OKABE.vermillion,
  series2: OKABE.purple,
};

export type ThemeName = "dark" | "light";

/** Mutated in place so already-running draw calls pick up the new palette. */
export const THEME: Theme = { ...DARK };

export function setTheme(name: ThemeName): void {
  Object.assign(THEME, name === "light" ? LIGHT : DARK);
}

/** Hex colour with an alpha channel, for translucent fills. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

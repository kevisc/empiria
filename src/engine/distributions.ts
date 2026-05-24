import type { MT19937 } from "./rng.ts";

/**
 * Parametric data-generating processes for the `Sample` node. Each draws a
 * single i.i.d. value from the given seeded RNG, so a clocked Sample node
 * produces a reproducible stream.
 */

export function uniform(rng: MT19937, a = 0, b = 1): number {
  return a + (b - a) * rng.random();
}

export function exponential(rng: MT19937, lambda = 1): number {
  // Inversion; guard against log(0).
  let u = rng.random();
  while (u <= 1e-12) u = rng.random();
  return -Math.log(u) / lambda;
}

/** Standard normal via Box–Muller (returns one variate; spare is discarded). */
export function standardNormal(rng: MT19937): number {
  let u1 = rng.random();
  while (u1 <= 1e-12) u1 = rng.random();
  const u2 = rng.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function normal(rng: MT19937, mu = 0, sigma = 1): number {
  return mu + sigma * standardNormal(rng);
}

export type DistName = "normal" | "uniform" | "exponential";

export function draw(
  rng: MT19937,
  dist: DistName,
  p1: number,
  p2: number,
): number {
  switch (dist) {
    case "normal":
      return normal(rng, p1, p2);
    case "uniform":
      return uniform(rng, p1, p2);
    case "exponential":
      return exponential(rng, p1);
  }
}

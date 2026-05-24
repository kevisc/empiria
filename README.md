# Empiria

A self-contained, browser-based **dataflow canvas for simulation-based
statistics education**. Wire data-generating processes, estimators, and
hypothesis tests together as a visible left-to-right signal chain, turn the
knobs, and watch sampling distributions, confidence bands, and null
distributions evolve in real time.

Empiria is the standalone successor to the VCV Rack module suite of the same
name: it keeps the ideas that mattered — composable signal-flow, exact
auditable numerics, deterministic seeding, portable patches — and sheds the
dependency on a third-party host. It runs in any modern browser, on any
device (including Chromebooks), with no install.

## Why this exists

Most statistics-teaching tools are **siloed**: one applet per concept, whose
output cannot be piped into the next. But the workflow students must
internalize — data-generating process → sample → estimate → infer → diagnose
— *is* a pipeline. Empiria restores composition at the level of the platform:
the output of any node is a signal routable into any other, so the whole
inferential pipeline sits on one screen, wired together, every intermediate
value live.

It descends from the **dataflow / analog-computing** tradition (Vannevar
Bush's differential analyzer, LabVIEW, Pure Data): the patch *is* the
program, each node a mathematical operator, the cable a wire carrying state.

## Design commitments

- **Exact, not approximate.** Closed-form quantities use named numerical
  recipes (regularized incomplete beta via Lentz continued fraction, BCa
  bootstrap, etc.), cross-checked against R/SciPy to machine precision — see
  `scripts/verify.ts`. No normal-approximation shortcuts.
- **Deterministic & reproducible.** A seeded MT19937 RNG (never
  `Math.random()`) means the same patch reproduces byte-identically in any
  browser on any OS.
- **Portable artifacts.** A patch is a small JSON document, shareable by file
  or URL — a citeable scientific object, not a perishable script.

## Status

Early. The dependency-free **engine core** is in place and verified:

- `src/engine/rng.ts` — seeded MT19937.
- `src/engine/distributions.ts` — Normal / Uniform / Exponential samplers.
- `src/engine/stats/special.ts` — log-gamma, regularized incomplete beta,
  exact Student-t two-tailed p.
- `src/engine/stats/tTest.ts` — one-sample and Welch two-sample t-tests.

### Verifying it (for reviewers / auditors)

Every statistical routine is checked against R to machine precision; the
behaviour of the system (determinism, the Law of Large Numbers, CI coverage
≈ 95%, Type-I error ≈ α) is checked too.

```sh
npm test          # vitest: 41 automated checks
npm run verify    # the same numerics + engine checks, printed with R values
Rscript verification/reference_values.R   # regenerate the R reference values independently
```

See **[VERIFICATION.md](VERIFICATION.md)** for the full audit trail: every
method → algorithm + citation → reference R command → the test that asserts it,
plus the reproducibility guarantees and an independent audit procedure.

### v1 scope (in progress)

Inference vertical slice: **Sample → Frame → Test → Boot → Regress**, plus a
**Seed** source and CSV import/export — enough for one complete guided lesson
(CLT / sampling distribution → bootstrap → t-test) end to end. UI layer (Vite
+ React + React Flow node editor, per-node Canvas visualizations) and the
graph evaluation engine are the next milestones.

## Tech stack

TypeScript. Vite + React + React Flow for the node canvas; per-node `<canvas>`
for live plots. Builds to a static site (deployable on GitHub Pages),
installable as a PWA for offline classroom use, and wrappable as a desktop app
later. The engine core (`src/engine/`) is framework-agnostic and DOM-free.

## License

GPL-3.0-or-later.

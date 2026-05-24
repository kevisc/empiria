# Empiria — user guide

Empiria is a canvas for **simulation-based statistics**. You build an analysis
by wiring small modules ("nodes") together with cables, then watch the
statistics update live as the clock runs. Nothing to install — it runs in the
browser at <https://kevinschoenholzer.com/empiria/>.

## The canvas

- **▶ Run / ❚❚ Pause** — start or stop the global clock.
- **↺ Reset** — re-seed and restart the current patch from tick 0.
- **speed** — how many ticks advance per frame.
- **Pan / zoom** — drag the background; scroll to zoom; the minimap (bottom
  right) helps on big patches.

## Wiring nodes

Every node has labelled **ports**: inputs (●) down the left, outputs (●, with a
live value) down the right. **Drag from an output port to an input port** to
connect them. A node updates from whatever is patched into it, so a signal
flows left to right: a source → a transform → a statistic → a display.

Each node carries small buttons: **ⓘ** (what it is, with the live formula and
"what to look for"), **⤓** (save its plot as PNG), **⧉** (duplicate), **✕**
(delete).

## The node palette

Grouped on the toolbar:

- **Sources** — `Seed` (the master seed; reproduces the whole patch), `Sample`
  (draw from a distribution; has real-world presets), `Data` (import a CSV / paste numbers).
- **Transform** — `Mix` (build mixture distributions), `Transform` (`y = a·f(x)+b`),
  `Noise` (measurement error), `Code` (continuous → Likert).
- **Statistics** — `Frame` (mean/SD/SE), `Summary` (full descriptives), `Test`
  (t-test), `Tab` (χ²), `Boot` (BCa bootstrap), `Regress` (OLS), `Means` (the
  CLT engine), `Power` (power / Type-I error), `Lag` (autocorrelation),
  `Coverage` (CI coverage).
- **Display** — `Scope` (time trace), `Box` (box plot), `ECDF`, `QQ` (normality),
  `Gauge` (units readout).
- **Annotate** — `Note` (a sticky note saved with the patch).

## Lessons & the guided tour

The **📚 Lessons** menu loads ready-made activities — each is a patch plus an
explanatory Note. The **★ Guided tour** walks four core ideas (Law of Large
Numbers → bootstrap → t-test → confidence-interval coverage) with a Prev/Next
bar. Pick any lesson, press Run, and follow the Note.

## Save, share, export

- **⬇ Save / ⬆ Load** — a patch is a small JSON file (nodes, wiring, seed).
- **🔗 Share** — encodes the whole patch into a URL you can send; opening it
  rebuilds the patch exactly.
- **🖼 Figure** — exports the whole canvas as one PNG (for slides or papers).
- **⬇ export CSV** — on `Sample`, `Data`, and `Frame`, downloads the underlying
  data so you can reproduce the analysis in R / Python.

## Reproducibility

All randomness comes from one seeded RNG. The **Seed** node sets the master
seed; the same seed reproduces the same run byte-for-byte on any machine, so a
shared patch (or link) is exactly reproducible.

## Display options

- **☀ Light / 🌙 Dark** theme, and a **📽 Projector** mode (larger text and
  nodes) for lecture rooms. The palette is colourblind-safe.

## Further reading

- **How the numbers are verified** — every routine is checked against R to
  machine precision: see [VERIFICATION.md](VERIFICATION.md).
- **Design & background** — [paper.md](paper.md).
- **Source code & issues** — <https://github.com/kevisc/empiria>.

*For the music-side sibling — the same real math repurposed as VCV Rack
modules — see [Stochast](https://shlabs.kevinschoenholzer.com/stochast/).*

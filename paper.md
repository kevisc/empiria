---
title: 'Empiria: A Browser-Based Dataflow Canvas for Simulation-Based Statistics Education'
tags:
  - statistics education
  - data science pedagogy
  - simulation-based inference
  - sampling distributions
  - bootstrap
  - reproducibility
  - open educational software
authors:
  - name: Kevin Schoenholzer
    orcid: 0000-0001-9892-5869
    affiliation: 1
    corresponding: true
    url: https://kevinschoenholzer.com
affiliations:
  - name: Postdoctoral researcher, Università della Svizzera italiana (USI), Lugano, Switzerland.
    index: 1
date: 23 May 2026
bibliography: paper.bib
---

# Summary

**Empiria** is an open-source, browser-based environment for teaching
simulation-based statistics. Students wire data-generating processes,
estimators, hypothesis tests, and diagnostics together as a visible
left-to-right **dataflow graph** — a node-and-cable canvas in the tradition
of analog computing and visual programming — and watch the statistics evolve
in real time on each node. Rather than reading about a sampling distribution
or a confidence interval, a learner *builds* one, turns its knobs, and pipes
the result into the next analytical step.

The platform runs entirely in a web browser with no installation, no server,
and no dependency on any third-party application; it works on any laptop,
tablet, or Chromebook. Every random draw comes from a seeded Mersenne-Twister
generator, so a patch — saved as a small JSON file or encoded in a shareable
URL — reproduces byte-identically on any machine. Every closed-form quantity
is computed with an exact, named numerical recipe and is verified against R to
machine precision (see *Numerical correctness and reproducibility*). Empiria
is released under GPL-3.0.

# Statement of need

A sustained line of statistics-education research documents how hard students
find it to form durable intuitions about sampling variability, the sampling
distribution of an estimator, and the logic of inference [@chance2004;
@delmas2007; @garfield2009]. Cobb's influential critique [@cobb2007] argued
that the curriculum overemphasizes closed-form, normal-theory derivation at
the expense of simulation-based approaches in which the sampling distribution
is *constructed empirically before it is named*; subsequent work shows
simulation-first curricula improve standardized reasoning scores, especially
on *p*-values and confidence intervals [@tintle2014], and the GAISE College
Report makes the same recommendation explicit [@gaise2016].

Existing simulation tools — sampling-distribution visualizers [@chance2004;
@delmas2007], *TinkerPlots* [@konold2008], CODAP [@finzer2013], *NetLogo*
[@wilensky1999], and a wide array of R Shiny applets — are typically
**siloed**: each addresses one concept in isolation, and the output of one
applet cannot be piped into another. Yet the workflow students must
internalize — data-generating process → sample → estimate → infer → diagnose —
*is* a pipeline; fragmenting it across applets makes that structure invisible.
Empiria's contribution is to restore **composition** at the level of the
platform: the output of any node is a signal routable into any other, so an
entire inferential pipeline sits on one screen, wired together, with every
intermediate value observable. Its panel grammar also lowers the cost of
authoring a new teaching module to a single function plus a small UI schema,
versus the R + HTML + reactive-programming fluency a Shiny applet demands.

Two further design commitments distinguish Empiria from applet-style tools.
First, **a teaching tool should be a trustworthy instrument**: its numerics
must be auditable, so a sceptical student or instructor can check them rather
than accept "good enough" results. Second, **reproducibility should be
tactile**: a worked example should travel as a file that re-runs identically
elsewhere. Empiria treats both as first-class features rather than
afterthoughts.

# Functionality

Empiria is a single-page TypeScript application (Vite + React + React Flow,
with Canvas visualizations). The canvas hosts typed **nodes** connected by
signal **cables**; a global clock advances the graph in topological order, and
each node renders a live plot matched to the statistic it computes. Nodes are
grouped on the palette:

- **Sources** — `Seed` (the master reproducibility control), `Sample`
  (parametric data-generating process with real-world presets), `Data` (import
  a CSV / paste numbers).
- **Transform** — `Mix` (build mixture distributions), `Transform`
  (`y = a·f(x)+b`, for unit conversions or genuine X→Y relationships), `Noise`
  (measurement error), `Code` (continuous → ordinal Likert).
- **Statistics** — `Frame` (sample window: mean, SD, SE), `Summary`
  (full descriptive statistics), `Test` (one/two-sample *t*-test with the
  exact null overlaid against the normal approximation), `Tab` (contingency
  χ² and Cramér's V), `Boot` (BCa bootstrap [@efron1987]), `Regress` (OLS),
  `Means` (the CLT engine: the sampling distribution of the mean, built
  directly), `Power` (statistical power / Type-I error), `Lag` (autocorrelation),
  `Coverage` (confidence-interval coverage).
- **Display** — `Scope` (time trace), `Box` (box-and-whisker), `ECDF`,
  `QQ` (Normal quantile-quantile), `Gauge` (units readout).
- **Annotate** — `Note` (an editable sticky note saved with the patch).

A patch is portable JSON: it can be saved to a file, shared as a URL, or
auto-restored from the last session. Any node's plot exports to **PNG**, the
data-bearing nodes export to **CSV**, and the entire canvas exports as a single
**figure** for slides or papers — supporting an end-to-end *import → describe →
visualise → diagnose → export* exploratory workflow.

The tool ships with sixteen ready-made **lessons** and a guided multi-step
tour, each a self-contained worksheet (a patch plus an explanatory Note):
the Law of Large Numbers, the bootstrap, small-sample *t*-tests, regression,
survey coding, mixtures, the central limit theorem, statistical power,
false positives under the null, normality checking, confidence-interval
coverage, and a four-panel exploratory-data-analysis dashboard. A light/dark
theme, a large-text "projector" mode, and a colourblind-safe palette support
classroom use.

# Numerical correctness and reproducibility

Because the pedagogy depends on the numbers being exactly right, Empiria
treats verification as part of the artifact. Closed-form quantities use named
recipes — the regularized incomplete beta and gamma functions via continued
fractions [@press2007] for the exact Student-*t* and χ² tails, the
bias-corrected and accelerated bootstrap [@efron1987], and a Mersenne-Twister
RNG [@matsumoto1998] — implemented in a dependency-free engine core that is
independent of the user interface.

A test suite (`npm test`) of 41 checks asserts every routine against R to
machine precision (incomplete beta/gamma, Student-*t* probabilities and
critical values, the normal CDF/quantile, one-sample and Welch *t*-tests, OLS,
contingency χ², autocorrelation, and descriptive moments), confirms the RNG
against the canonical MT19937 test vector, and verifies system-level
properties: byte-identical reproduction under a fixed seed, the Law of Large
Numbers, ≈95% confidence-interval coverage, and a Type-I error rate ≈ α under
the null. An accompanying R script (`verification/reference_values.R`)
regenerates every reference constant independently, so a reviewer can confirm
the references themselves; `VERIFICATION.md` documents, for each method, the
algorithm, citation, reference command, and test. Because patches are seeded
JSON computed in IEEE-754 double precision with no platform-specific code, a
worked example reproduces identically across machines, and a student can export
a node's data to CSV and recompute the statistic in R as an independent check.

# Availability

Empiria is GPL-3.0 licensed, runs in any modern browser with no installation,
and builds to a static site. Source, the test suite, the verification
materials, the bundled lessons, and documentation are in the project
repository.

# Acknowledgements

The author thanks the open-source scientific-computing and
statistics-education communities whose tools and findings shaped this work.

# References

Chance, B., delMas, R., & Garfield, J. (2004). Reasoning about sampling distributions. In D. Ben-Zvi & J. Garfield (Eds.), *The Challenge of Developing Statistical Literacy, Reasoning, and Thinking* (pp. 295–323). Springer. <https://doi.org/10.1007/1-4020-2278-6_13>

Cobb, G. W. (2007). The introductory statistics course: A Ptolemaic curriculum? *Technology Innovations in Statistics Education*, 1(1). <https://doi.org/10.5070/T511000028>

delMas, R., Garfield, J., Ooms, A., & Chance, B. (2007). Assessing students' conceptual understanding after a first course in statistics. *Statistics Education Research Journal*, 6(2), 28–58. <https://doi.org/10.52041/serj.v6i2.483>

Efron, B. (1987). Better bootstrap confidence intervals. *Journal of the American Statistical Association*, 82(397), 171–185. <https://doi.org/10.1080/01621459.1987.10478410>

Finzer, W. (2013). The data science education dilemma. *Technology Innovations in Statistics Education*, 7(2). <https://doi.org/10.5070/T572013891>

GAISE College Report ASA Revision Committee. (2016). *Guidelines for Assessment and Instruction in Statistics Education (GAISE) College Report 2016*. American Statistical Association. <https://www.amstat.org/education/gaise>

Garfield, J., & Ben-Zvi, D. (2009). Helping students develop statistical reasoning: Implementing a statistical reasoning learning environment. *Teaching Statistics*, 31(3), 72–77. <https://doi.org/10.1111/j.1467-9639.2009.00363.x>

Konold, C., & Lehrer, R. (2008). Technology and mathematics education: An essay in honor of Jim Kaput. In L. D. English (Ed.), *Handbook of International Research in Mathematics Education*. Routledge.

Matsumoto, M., & Nishimura, T. (1998). Mersenne Twister: A 623-dimensionally equidistributed uniform pseudo-random number generator. *ACM Transactions on Modeling and Computer Simulation*, 8(1), 3–30. <https://doi.org/10.1145/272991.272995>

Press, W. H., Teukolsky, S. A., Vetterling, W. T., & Flannery, B. P. (2007). *Numerical Recipes: The Art of Scientific Computing* (3rd ed.). Cambridge University Press.

Tintle, N., Chance, B., Cobb, G., Roy, S., Swanson, T., & VanderStoep, J. (2015). Combating anti-statistical thinking using simulation-based methods throughout the undergraduate curriculum. *The American Statistician*, 69(4), 362–370. <https://doi.org/10.1080/00031305.2015.1081619>

Wilensky, U. (1999). *NetLogo*. Center for Connected Learning and Computer-Based Modeling, Northwestern University. <http://ccl.northwestern.edu/netlogo/>

---
title: "Empiria: A Composable, Browser-Based Environment for Simulation-Based Statistics Education"
author: "Kevin Schoenholzer"
date: "May 2026"
---

# Abstract

Reform efforts in statistics education have, for two decades, urged that
introductory instruction be reorganized around simulation-based reasoning, in
which students construct a sampling distribution empirically before they meet
it as a formula. The software that supports this approach, however, is
typically *siloed*: each applet or visualization addresses a single concept,
and its output cannot be passed to the next step of an analysis, so the
data-generating-process → sampling → estimation → inference → diagnostics
workflow that students must internalize is left implicit. This article
describes **Empiria**, an open-source, browser-based environment that makes
that workflow explicit by representing it as a composable dataflow graph:
students wire small modules together with cables and observe every
intermediate quantity update in real time. Empiria runs with no installation
on any modern device, ships sixteen guided lessons and a four-step tour, and
exports figures, data (CSV), and fully reproducible patches (as files or
shareable links). Its numerical routines use exact recipes rather than
normal-theory approximations and are verified against R to machine precision by
an automated test suite, so the tool is auditable as well as legible. We
describe the design, the module library, the pedagogical rationale, and the
verification methodology, and we outline a planned classroom evaluation.
Empiria is released under GPL-3.0 and is available at
<https://kevinschoenholzer.com/empiria/>.

**Keywords:** simulation-based inference; statistics education; sampling
distributions; bootstrap; reproducibility; educational technology; dataflow

# Introduction

The case for reorganizing introductory statistics around simulation-based
reasoning, rather than closed-form normal-theory derivation, is by now well
established. Cobb (2007) argued that the curriculum had over-invested in
analytic derivations at the expense of randomization- and simulation-based
approaches in which the sampling distribution is built empirically before it
is named; the simulation-based-inference movement subsequently demonstrated
measurable gains in students' reasoning about *p*-values and confidence
intervals (Tintle et al., 2015), and the GAISE College Report codified the
corresponding recommendations—foster active learning, use real data, integrate
technology, and emphasize statistical thinking (American Statistical
Association, 2016). A sustained research literature documents *why* this is
hard: students struggle to form durable intuitions about sampling variability
and the sampling distribution of an estimator, and they benefit from
manipulating parameters and observing the consequences in real time (Chance et
al., 2004; delMas et al., 2007; Garfield & Ben-Zvi, 2009).

The pedagogical principle is now mainstream; what remains uneven is the
*toolkit* through which it is delivered. The existing landscape is fragmented.
Sampling-distribution visualizers address sampling variability (Chance et al.,
2004; delMas et al., 2007); TinkerPlots supports school-level exploratory
analysis (Konold & Lehrer, 2008) and CODAP extends this to data science for
younger learners (Finzer, 2013); NetLogo is the dominant agent-based-modeling
environment (Wilensky, 1999); and a large number of single-purpose applets
(for example, the *Rossman/Chance* applet collection and *Seeing Theory*) and
instructor-built R Shiny dashboards address specific techniques. Each of these
tools is effective within its domain, but each is also *self-contained*: the
output of one cannot be piped into the next analytical step. This matters
because the workflow students must internalize—data-generating process →
sampling → estimation → inference → diagnostics—is exactly a *composable
pipeline*, and one-applet-per-concept tools render that pipeline invisible.

This article describes **Empiria**, an open-source, browser-based environment
that restores composition at the level of the platform. In Empiria a student
builds an analysis as a *dataflow graph*: small modules ("nodes") are connected
by cables, a global clock advances the computation, and the output of any node
is a signal that can be routed into any other. The entire inferential pipeline
therefore sits on a single screen, wired together, with every intermediate
quantity visible and manipulable as it updates. The contributions of the tool,
and of this article, are: (1) a composable, signal-flow interaction model for
simulation-based inference that makes the inferential workflow explicit; (2) a
zero-installation, cross-device implementation with sixteen ready-made lessons
and a guided tour; and (3) a verification methodology—exact numerical recipes,
deterministic seeding, and an automated test suite checked against R—that makes
the tool auditable rather than merely persuasive.

# Background and related tools

Empiria's nearest neighbors are the sampling-distribution visualizers studied
in the statistics-education literature (Chance et al., 2004; delMas et al.,
2007), TinkerPlots (Konold & Lehrer, 2008), CODAP (Finzer, 2013), NetLogo
(Wilensky, 1999), the *Rossman/Chance* and *Seeing Theory* applet collections,
and the many instructor-authored R Shiny applications. These tools established
that dynamic, manipulable visualization supports the construction of sampling
intuitions, and Empiria builds directly on that finding.

Empiria differs from these precedents in three respects. First, it is a
*composable signal-flow environment* rather than a single-purpose application:
the output of any module is a signal that can be routed into any other, so a
parametric sampler can feed a sampling-window estimator, which can feed a
hypothesis test or a bootstrap, with no copy-paste or context switch. Second,
it lowers the cost of authoring new teaching material: where a Shiny applet
requires fluency in R, HTML, and reactive programming, an Empiria activity is
assembled by wiring existing modules, and a new module is a single function
with a small parameter schema. Third, it treats numerical correctness and
reproducibility as first-class, testable properties (described below), so that
the tool can be audited by a skeptical instructor rather than taken on trust.
Empiria does not aim to replace analytic software such as R; it is a
complementary, simulation-first interface intended to make the elementary
operations of sampling, estimation, inference, and diagnosis directly
manipulable.

# Design

## The dataflow canvas

Empiria presents an infinite canvas on which the user places typed *nodes* and
connects their ports with *cables*. Every node exposes labelled input ports on
its left and output ports on its right; dragging a cable from an output to an
input establishes a dependency. A global clock advances the graph in
topological order, and on each tick every node reads its inputs, updates its
internal state, and renders a small visualization matched to the quantity it
computes. The result is that a complete analysis is laid out left to right as a
visible chain—source → transform → statistic → display—and every intermediate
value is observable as it changes. This interaction model is a deliberate
descendant of the dataflow and analog-computing traditions (visual
patch-and-cable environments and the differential analyzers that preceded
digital computation), in which the wiring *is* the program.

The clock speed is adjustable from roughly one tick per second—slow enough to
watch individual draws accumulate—to several thousand per second for rapid
convergence, with the current rate displayed. Light and dark themes, a
large-type "projector" mode for lecture rooms, and a colorblind-safe palette
support classroom use.

## The engine and reproducibility model

Empiria's computational core is implemented as a dependency-free TypeScript
engine that is independent of the user interface. All randomness derives from a
single seeded Mersenne-Twister generator (Matsumoto & Nishimura, 1998); the
standard `Math.random` is never used, because it is neither seedable nor
reproducible across browsers. Each stochastic node derives its own stream
deterministically from the master seed and its node identifier, so that adding
or removing a node does not perturb the others. A patch—the complete
description of the nodes, their parameters, the wiring, and the master
seed—serializes to a small JSON document that can be saved as a file or encoded
into a shareable URL; loading it reconstructs the simulation byte-for-byte on
any machine. Computation is performed in IEEE-754 double precision with no
platform-specific code paths, so a worked example is exactly reproducible
across operating systems and devices.

## The module library

The modules are organized on the palette into five families (Table 1). Sources
generate or import data; transforms reshape a signal; statistics estimate,
test, or summarize; displays render a signal; and an annotation node lets the
instructor leave explanatory text that travels with the patch.

Table 1. *The Empiria module library.*

| Family | Modules |
|---|---|
| **Sources** | Seed (master seed), Sample (parametric distribution with real-world presets), Data (CSV import) |
| **Transform** | Mix (mixtures), Transform (`y = a·f(x)+b`), Noise (measurement error), Code (continuous → ordinal/Likert) |
| **Statistics** | Frame (mean/SD/SE), Summary (descriptives), Test (one/two-sample *t*), Tab (χ² and Cramér's V), Boot (BCa bootstrap), Regress (OLS), Means (sampling distribution of the mean), Power (power / Type-I error), Lag (autocorrelation), Coverage (confidence-interval coverage) |
| **Display** | Scope (time trace), Box (box plot), ECDF, QQ (normal quantile–quantile), Gauge (units readout) |
| **Annotate** | Note (editable, saved with the patch) |

Each statistic ships with a visualization designed for the concept it
represents: a histogram with a confidence band, a scatterplot with a fitted
line and prediction band, a null *t*-distribution with shaded rejection regions
and the normal approximation overlaid for contrast, a bootstrap distribution
annotated with its bias-correction diagnostics, and a confidence-interval
"coverage" display that stacks repeated intervals and colors those that miss
the true value.

# Pedagogical rationale

Empiria's design rests on three findings from the statistics-education and
mathematical-cognition literatures.

**Dynamic, manipulable visualization supports the construction of sampling
intuitions.** Students who manipulate parameters and watch sampling
distributions respond in real time develop more durable inferential intuitions
than those who encounter the same material as static figures (Chance et al.,
2004; delMas et al., 2007; Garfield & Ben-Zvi, 2009). Empiria adopts this
throughout: every parameter is a control, every estimator is a live trace, and
every confidence interval is a band that visibly widens and narrows with the
sample.

**Concrete-to-abstract sequencing scaffolds inferential thinking.** Empiria's
patch grammar lets a procedure be *enacted* before it is *symbolized*. A
two-sample *t*-test is, in Empiria, a literal sequence of objects the student
wires together—two samplers, a sampling-window estimator on each branch, and a
test module that consumes both—so that when the algebraic formula is later
introduced, each symbol corresponds to a module the student has already
manipulated.

**Composition makes the inferential workflow visible.** Because the output of
any module is routable into any other, the data-generating process → sampling →
estimation → inference → diagnostics pipeline is a single wired chain rather
than a sequence of disconnected applets. This directly targets the structure
the reform literature identifies as the learning objective (Cobb, 2007; Tintle
et al., 2015).

These principles are operationalized in sixteen bundled lessons, each a
self-contained worksheet consisting of a patch plus an explanatory note, and a
four-step guided tour (Law of Large Numbers → bootstrap → *t*-test →
confidence-interval coverage) with previous/next navigation. The same modules
serve a range of audiences: a general-education class can place a sampler and a
sampling-window estimator and watch the standard error shrink as 1/√*n*; an
introductory course can add regression, testing, and the bootstrap as a live
picture of the workflow students will later carry out in R; and a graduate
methods seminar can use the platform to interrogate small-sample behavior or to
compare bootstrap intervals against analytic ones. What differs across
audiences is the depth at which the underlying mathematics is examined, not the
tool.

# Illustrative classroom use

Several bundled lessons illustrate the range. A *Law of Large Numbers* activity
wires a sampler into a growing sampling window; as the clock runs, the mean
settles on the population value and the standard error contracts visibly. A
*bootstrap* activity resamples a fixed dataset and draws the bootstrap
distribution of a statistic—making the sampling distribution explicit without a
formula—and reports a bias-corrected and accelerated interval (Efron, 1987). A
*small-sample t-test* activity overlays the exact Student-*t* null distribution
against the normal approximation, so that students see the normal mislead at
low degrees of freedom and watch the reject/retain decision flip from sample to
sample. A *confidence-interval coverage* activity repeats the whole experiment
and tallies how often the interval covers the true mean, giving an operational
meaning to "95% confidence." A *central-limit* activity shows that the means of
batches drawn from a skewed population are themselves approximately normal. An
*exploratory-data-analysis* activity fans one imported dataset into a summary
table, a box plot, an empirical CDF, and a normal quantile–quantile plot, so
that the same data are seen four ways at once. In each case the patch is
seeded, so an instructor can distribute it, have students run it, and be
confident that every result reproduces.

# Numerical correctness and reproducibility

Because the pedagogy depends on the displayed numbers being correct rather than
merely plausible, Empiria treats verification as part of the artifact. Where
introductory tooling has often relied on normal-theory approximations, Empiria
computes closed-form quantities with their exact numerical recipes: the
two-tailed Student-*t* and χ² tail probabilities are evaluated through the
regularized incomplete beta and gamma functions using continued-fraction
expansions (Press et al., 2007); confidence-interval critical values use the
exact *t* quantile rather than the *z* ≈ 1.96 approximation; and bootstrap
intervals are bias-corrected and accelerated (Efron, 1987).

These routines are checked by an automated test suite that compares each result
against R to machine precision—covering the incomplete beta and gamma
functions, Student-*t* probabilities and critical values, the normal CDF and
quantile, one-sample and Welch two-sample *t*-tests, ordinary least squares,
the contingency-table χ² and Cramér's V, autocorrelation, and the descriptive
moments—and against the canonical Mersenne-Twister test vector for the
generator. The suite also verifies system-level properties: byte-identical
reproduction under a fixed seed, the contraction of the standard error under
the Law of Large Numbers, approximately nominal (95%) confidence-interval
coverage, and a Type-I error rate near α under the null. An accompanying R
script regenerates every reference value independently, so a reviewer can
confirm the reference values themselves rather than only the tool's
self-consistency, and a verification document maps each routine to its
algorithm, citation, reference command, and test. Finally, because a patch is
seeded JSON, a student can export any node's data to CSV and reproduce the
statistic in R as an external check; the same patch and seed yield an identical
export on any machine.

# Availability

Empiria is released under the GPL-3.0 license. It runs in any modern browser
with no installation, on laptops, tablets, and Chromebooks alike, and builds to
a static site. The live application is at <https://kevinschoenholzer.com/empiria/>;
the source code, the test suite, the verification materials, the bundled
lessons, and the documentation are in the public repository at
<https://github.com/kevisc/empiria>.

# Limitations and future work

Empiria has not yet been subjected to a controlled classroom evaluation; the
evidence offered here concerns the tool's design and its numerical correctness,
not learning outcomes. We are planning a within-instructor, between-section
comparison in an introductory course, contrasting an Empiria-augmented
condition against a matched condition using comparable static and applet-based
visualizations, with sampling-variability and inference subscales of a
validated assessment as primary outcomes together with a transfer task. The
most plausible adoption obstacle is *activation cost*: although there is nothing
to install, a node-and-cable interface is unfamiliar, and our deployment plan
therefore pairs the tool with the guided tour and the bundled lesson patches. A
second risk is that the visual immediacy of the modules invites
disproportionate class time relative to analytic content; the suggested
integration is explicitly additive to, not a replacement for, a standard
workflow. Finally, confidence intervals for proportions currently use the
normal (Wald) form, and the bootstrap is validated by its coverage behavior and
by exact tests of its components rather than by a value-for-value match to a
specific resampling implementation.

# Conclusion

Empiria operationalizes the central recommendation of the statistics-education
reform literature—that students build the sampling distribution before they
name it—by making the inferential workflow a composable, manipulable object
rather than a sequence of disconnected applets. By pairing that interaction
model with exact, independently auditable numerics and frictionless,
reproducible sharing, it aims to be trustworthy as well as legible: a tool a
student can learn from and an instructor can verify.

# Acknowledgements

The author thanks the open-source scientific-computing and statistics-education
communities whose tools and findings shaped this work.

# Disclosure statement

The author reports no competing interests. No funding supported this work.

# References

American Statistical Association. (2016). *Guidelines for Assessment and Instruction in Statistics Education (GAISE) College Report 2016*. American Statistical Association. <https://www.amstat.org/education/gaise>

Chance, B., delMas, R., & Garfield, J. (2004). Reasoning about sampling distributions. In D. Ben-Zvi & J. Garfield (Eds.), *The Challenge of Developing Statistical Literacy, Reasoning, and Thinking* (pp. 295–323). Springer. <https://doi.org/10.1007/1-4020-2278-6_13>

Cobb, G. W. (2007). The introductory statistics course: A Ptolemaic curriculum? *Technology Innovations in Statistics Education*, 1(1). <https://doi.org/10.5070/T511000028>

delMas, R., Garfield, J., Ooms, A., & Chance, B. (2007). Assessing students' conceptual understanding after a first course in statistics. *Statistics Education Research Journal*, 6(2), 28–58. <https://doi.org/10.52041/serj.v6i2.483>

Efron, B. (1987). Better bootstrap confidence intervals. *Journal of the American Statistical Association*, 82(397), 171–185. <https://doi.org/10.1080/01621459.1987.10478410>

Finzer, W. (2013). The data science education dilemma. *Technology Innovations in Statistics Education*, 7(2). <https://doi.org/10.5070/T572013891>

Garfield, J., & Ben-Zvi, D. (2009). Helping students develop statistical reasoning: Implementing a statistical reasoning learning environment. *Teaching Statistics*, 31(3), 72–77. <https://doi.org/10.1111/j.1467-9639.2009.00363.x>

Konold, C., & Lehrer, R. (2008). Technology and mathematics education: An essay in honor of Jim Kaput. In L. D. English (Ed.), *Handbook of International Research in Mathematics Education* (2nd ed.). Routledge.

Matsumoto, M., & Nishimura, T. (1998). Mersenne Twister: A 623-dimensionally equidistributed uniform pseudo-random number generator. *ACM Transactions on Modeling and Computer Simulation*, 8(1), 3–30. <https://doi.org/10.1145/272991.272995>

Press, W. H., Teukolsky, S. A., Vetterling, W. T., & Flannery, B. P. (2007). *Numerical Recipes: The Art of Scientific Computing* (3rd ed.). Cambridge University Press.

Tintle, N., Chance, B., Cobb, G., Roy, S., Swanson, T., & VanderStoep, J. (2015). Combating anti-statistical thinking using simulation-based methods throughout the undergraduate curriculum. *The American Statistician*, 69(4), 362–370. <https://doi.org/10.1080/00031305.2015.1081619>

Wilensky, U. (1999). *NetLogo*. Center for Connected Learning and Computer-Based Modeling, Northwestern University. <http://ccl.northwestern.edu/netlogo/>

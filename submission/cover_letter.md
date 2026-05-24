Kevin Schoenholzer
Università della Svizzera italiana (USI)
Lugano, Switzerland
kevin.schoenholzer@usi.ch

To the Editors,
*Technology Innovations in Statistics Education*

Dear Editors,

I am pleased to submit an original article, "Empiria: A Composable,
Browser-Based Environment for Simulation-Based Statistics Education," for
consideration in *Technology Innovations in Statistics Education*.

Reform efforts in statistics education have long urged that instruction be
organized around simulation-based reasoning, yet the supporting software is
typically siloed—each applet addresses one concept and cannot pass its output
to the next step of an analysis, leaving the data-generating-process →
sampling → estimation → inference → diagnostics workflow implicit. The article
introduces Empiria, an open-source, browser-based environment that makes that
workflow explicit by representing it as a composable dataflow graph: students
wire small modules together and watch every intermediate quantity update in
real time. Empiria requires no installation, runs on any modern device
(including Chromebooks), ships sixteen guided lessons and a four-step tour, and
exports figures, data, and fully reproducible patches as files or shareable
links.

I believe the article fits the journal's scope in three ways. First, it
contributes a novel interaction model—composable signal flow—for the
simulation-based-inference approach the field has adopted. Second, it is built
on, and cites, the statistics-education research that motivates that approach.
Third, and distinctively for an educational tool, its numerical routines use
exact recipes rather than normal-theory approximations and are verified against
R to machine precision by an automated test suite, with an accompanying script
that regenerates every reference value independently; the tool is therefore
auditable by an instructor, not merely persuasive.

The article is a description of an educational technology and its design
rationale; it does not report a classroom evaluation, and it states this
limitation explicitly and outlines a planned controlled study. The software is
open source (GPL-3.0) and freely available, so reviewers can use it directly
at <https://kevinschoenholzer.com/empiria/> and inspect the source and tests at
<https://github.com/kevisc/empiria>.

The manuscript is original, is not under consideration elsewhere, and has a
single author with no competing interests and no funding to declare. Thank you
for your consideration.

Sincerely,
Kevin Schoenholzer

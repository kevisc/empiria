# Submission package — Teaching Statistics (Wiley)

Target journal: **Teaching Statistics** (Wiley) — a refereed, **double-anonymized**
journal for teachers of statistics and data science at any level; emphasis on
good practice in teaching, written accessibly for an international audience.

**Submit online** via the Wiley Authors portal:
<https://authors.wiley.com/journal/TEST> (system: <https://wiley.atyponrex.com/journal/TEST>).
Technical help: Wiley Research Exchange Author Help / submissionhelp@wiley.com.

**Editor** (offline submissions): Rhys Jones, Editor, *Teaching Statistics*,
MMU, Geoffrey Manton Building, 4 Rosamond Street West, Manchester M15 6LL, UK —
minkywhales@hotmail.com.

> Chosen over TISE because Teaching Statistics is Wiley-published, indexed, and
> more widely recognized, while still accepting a teaching-tool / good-practice
> article that does not require a classroom-outcomes study.

## Files in this package

| File | Purpose |
|---|---|
| [`../paper.md`](../paper.md) | The manuscript (Markdown source). |
| [`figures/`](figures/) | Figures 1–4 as separate high-resolution PNGs (also placed in the text). |
| [`supplementary_materials.md`](supplementary_materials.md) | **Supplementary Materials** appendix (validation, benchmark, reproducibility, AI-use, module library, lessons) — upload into the portal's Supporting Information section. Built to `.pdf`/`.docx`. |
| [`title_page.md`](title_page.md) | Title, author, affiliation, email, corresponding author, ORCID, keywords, **Acknowledgements**, disclosures (incl. AI use) — submitted **separately** from the anonymized manuscript. |
| [`cover_letter.md`](cover_letter.md) | Cover letter to the editor. |
| `../VERIFICATION.md`, `../GUIDE.md` | Supporting materials reviewers may consult. |

## House style (applied)

- **Length:** no fixed limit; focused writing. Sections with an **Introduction**
  and **Conclusion**; single-spaced, 12-pt.
- **Title** ≤ 50 words; **abstract** ≤ 150 words *(current: ~140)*.
- **Keywords:** must include **"Teaching Statistics"** *(added, listed first)*.
- **References:** **in-text citations use author names + dates** (author–year,
  e.g. "Cobb (2007)", "(Tintle et al., 2015)"); the **reference list is
  alphabetical by lead author and numbered**, initials-first, with DOIs.
  *(Reference style per the journal's March-2025 guidelines; applied throughout.)*
- **Footnotes:** none (not permitted).
- **Figures:** numbered, with legends, placed in the text **and** provided as
  separate PNG files in `figures/`; uploaded at high resolution.
- **Acknowledgements:** on the **title page**, not in the manuscript body.
- **Double-anonymized:** the manuscript carries no author-identifying text;
  the title page is a separate file.
- **AI:** disclosed in the manuscript's *Disclosure statement* and on the title
  page, per Wiley's AI Principles / "Using AI tools in your writing".

## Building the manuscript for upload

```sh
# Full (non-anonymized) reference copy
pandoc paper.md -o submission/manuscript.docx

# Anonymized manuscript for double-anonymized review:
# strip the YAML author and replace the two identifying URLs.
sed -e '/^author:/d' \
    -e 's#https://kevinschoenholzer.com/empiria/#[live tool — withheld for review]#g' \
    -e 's#https://github.com/kevisc/empiria#[repository — withheld for review]#g' \
    paper.md > /tmp/paper_blinded.md
pandoc /tmp/paper_blinded.md -o submission/manuscript_blinded.docx
```

(Acknowledgements already live only on the title page, so they need no redaction.)

## Submission preparation checklist

- [ ] Not previously published / not under consideration elsewhere.
- [ ] Title ≤ 50 words; abstract ≤ 150 words; **"Teaching Statistics"** among the keywords.
- [ ] In-text citations are author–year and match the numbered, alphabetized
      reference list (and vice versa); no bracket-number citations remain.
- [ ] No footnotes; sections include Introduction and Conclusion; single-spaced, 12-pt.
- [ ] Figures numbered with legends, in text and uploaded as separate high-res PNGs.
- [ ] **Anonymized** manuscript uploaded; **separate title page** with full details + Acknowledgements; no identifying text/URLs in the manuscript.
- [ ] Disclosure statement includes competing-interests, funding, and **AI-use**; title page repeats the AI-use disclosure.
- [ ] Live tool reachable: <https://kevinschoenholzer.com/empiria/>; repo green: <https://github.com/kevisc/empiria> (`npm test`).

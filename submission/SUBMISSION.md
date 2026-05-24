# Submission package — TISE

Target journal: **Technology Innovations in Statistics Education (TISE)**,
hosted on UC eScholarship — <https://escholarship.org/uc/uclastat_cts_tise>.
TISE is open access (no author fees) and peer reviewed; it publishes articles
on the use of technology in statistics education. Submissions are made through
the eScholarship submission system; manuscripts follow APA style.

## Files in this package

| File | Purpose |
|---|---|
| [`../paper.md`](../paper.md) | The manuscript (Markdown source; APA author–year citations and reference list). |
| [`title_page.md`](title_page.md) | Title, author, affiliation, ORCID, keywords, disclosures, availability. |
| [`cover_letter.md`](cover_letter.md) | Cover letter to the editors. |
| `../VERIFICATION.md`, `../GUIDE.md` | Supporting materials reviewers may consult (verification methodology; user guide). |

## Building the manuscript for upload (PDF / DOCX)

The manuscript is maintained in Markdown so it stays in sync with the
repository. Produce a submission file with pandoc. **Word (`.docx`) is
recommended**: it renders the statistical symbols (χ², ρ, →, √, ≈) using the
word processor's fonts and is convenient for reviewer comments.

```sh
# Recommended: Word
pandoc paper.md -o manuscript.docx

# Optional: PDF — requires a main font that covers Greek/math glyphs;
# otherwise symbols such as χ² and → may render blank.
pandoc paper.md -o manuscript.pdf --pdf-engine=xelatex \
  -V mainfont="Arial Unicode MS" -V geometry:margin=1in
```

## Pre-submission checklist

- [ ] Abstract ≤ ~250 words; keywords present.
- [ ] All in-text citations are author–year and appear in the reference list (and vice versa); no raw `[@key]` markup remains.
- [ ] References in APA 7 style with DOIs/URLs.
- [ ] Title page kept **separate** from the manuscript; if the review is masked, also produce an anonymized manuscript PDF (remove the author/affiliation/ORCID block and the repository URLs that identify the author, replacing them with "[withheld for review]").
- [ ] Live tool reachable: <https://kevinschoenholzer.com/empiria/>.
- [ ] Repository public and test suite green: <https://github.com/kevisc/empiria> (`npm test`).
- [ ] Figures (if added) exported at sufficient resolution via the in-app "Figure" export.
- [ ] Cover letter addressed to the editors; competing-interests and funding statements included.

## Note on masked review

If TISE requests masked review, generate the anonymized manuscript from a copy
of `paper.md` with the `author`, `affiliation`, and `orcid` fields removed and
the two repository/live URLs replaced by "[withheld for review]"; submit the
full `title_page.md` separately through the system's metadata fields.

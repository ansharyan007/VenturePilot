# Frozen NovaEdge evaluation sets

`questions.dev.json` and `questions.heldout.json` were written before any model
evaluation. Each has twelve distinct questions, covers the listed planning
topics, and includes one false-premise question. Predicates are regular
expression checks against normalized answer and pattern text: lowercase;
replace hyphens, en/em dashes, and non-breaking hyphens with spaces; replace
curly apostrophes with straight apostrophes; strip Markdown, thousands commas,
and currency symbols; collapse whitespace; and remove whitespace surrounding
`/`. A `require` predicate must match, `require_any` passes when at least one
supplied pattern matches, and a `forbid` predicate must not match. These rule
checks are not a measure of semantic correctness.

Numeric predicates are taken from the saved fixture and deterministic output of
`python3 src/demo_check.py`; no model output was used to write them. The
checked-in `chunks.nova.json` is produced by the existing `makeChunks()`
function, not a replacement chunker:

```sh
node --import tsx eval/dump_chunks.mts
```

Chunk object IDs within their content are runtime UUIDs created by the demo
fixture. The stable outer chunk IDs (`s-financials-0`, `s-bom-0`, and so on)
are what `gold_evidence_ids` annotates. Regenerating the snapshot can change
only those embedded UUID values, not the stable chunk IDs or source fields.

Phase 3 will evaluate direct, RAG, and full-pipeline modes with these files
unchanged. Results will report macro predicate pass rate, evidence recall for
retrieval modes, and whole-pipeline latency.

## Corrections before the first run

No model had been run when these corrections were made. The false-premise
items no longer forbid denial language, so a valid rejection such as “no
certificate number was issued” can pass. Capacity accepts either whole-unit
rendering (1658 or 1659) and now checks the derived theoretical capacity rather
than the weak `12` input. Numeric predicates use word-boundary regular
expressions. Question-echoing or common-word predicates were replaced with
stored evidence terms, and `require_any` accepts documented equivalent wording
for mitigation and false-premise denials. Gold evidence IDs were retained:
each corrected predicate is supported by its previously annotated chunk.

The second pre-run correction removed the unasked theoretical-capacity check,
made hyphen normalization explicit, strengthened numeric and supplier checks,
reworded the team item to test its recorded salary, and replaced heldout-11
with a market question using `s-analysis-0`. It also replaced verbatim phrases
with distinctive stems or alternatives. `s-scaling-0` records the first two
stage names as “Prototype” and “Small batch”; heldout-07 therefore checks
those names. The dev-05 exclusion was removed: Hardware engineer is stored at
the Prototype stage, but a correct answer need not mention it. No model had
been run.

The final pre-run correction uses alternative spellings for Wi-Fi, e-commerce,
and e-waste; uses bounded CEO/CTO checks; and makes slash spacing equivalent.
It also turns heldout-11's phrase checks into evidence-backed stems and accepts
common 14-inch screen-size renderings. No model had been run.

The last pre-run correction adds portable Wi-Fi and certificate-denial
alternatives plus a standalone predicate implementation and 17-case test
harness. Run it with `node eval/run-predicates-tests.mjs`. No model had been
run.

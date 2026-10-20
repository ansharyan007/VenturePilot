# Frozen NovaEdge evaluation sets

`questions.dev.json` and `questions.heldout.json` were written before any model
evaluation. Each has twelve distinct questions, covers the listed planning
topics, and includes one false-premise question. Predicates are literal checks
against a normalized answer: lowercase text with Markdown punctuation, commas,
and currency symbols removed. A `require` predicate must be present; a
`forbid` predicate must be absent. These rule checks are not a measure of
semantic correctness.

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

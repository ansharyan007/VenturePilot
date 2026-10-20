/** Summarize raw evaluation records; never calls a model or changes raw.jsonl. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { score } from './predicates.mjs'

const seed = 20261014, B = 10_000, modes = ['direct', 'rag', 'full'], sets = ['dev', 'heldout']
const rawPath = resolve('eval/results/raw.jsonl')
const questions = Object.fromEntries((await Promise.all(sets.map(async set => [set, JSON.parse(await readFile(resolve(`eval/questions.${set}.json`), 'utf8'))]))).flatMap(([set, qs]) => qs.map(q => [`${set}|${q.id}`, { ...q, set }])))
const raw = (await readFile(rawPath, 'utf8')).split('\n').filter(Boolean).map((line, i) => { try { return JSON.parse(line) } catch { throw new Error(`Invalid JSONL at line ${i + 1}`) } })
const rows = raw.map(row => {
  const question = questions[`${row.set}|${row.question_id}`]
  if (!question) throw new Error(`Unknown question in raw.jsonl: ${row.set}|${row.question_id}`)
  const rescored = score(row.answer || '', question.predicates)
  const stored = row.score
  const mismatch = !stored || stored.passed !== rescored.passed || stored.total !== rescored.total || JSON.stringify(stored.results) !== JSON.stringify(rescored.results)
  return { ...row, question, rescored, mismatch, rate: rescored.total ? rescored.passed / rescored.total : null }
})
let state = seed >>> 0
const random = () => (state = (1664525 * state + 1013904223) >>> 0) / 2 ** 32
const mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const sd = xs => xs.length > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean(xs)) ** 2, 0) / (xs.length - 1)) : null
const quantile = (xs, q) => { if (!xs.length) return null; const s = [...xs].sort((a,b) => a-b), p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.ceil(p)] - s[i]) * (p - i) }
const round = x => x === null || x === undefined ? null : Number(x.toFixed(6))
function bootstrap(values, stat = xs => mean(xs)) {
  if (!values.length) return [null, null]
  const samples = Array.from({ length: B }, () => stat(Array.from({ length: values.length }, () => values[Math.floor(random() * values.length)])))
  return [round(quantile(samples, .025)), round(quantile(samples, .975))]
}
const filter = (set, mode) => rows.filter(r => (set === 'combined' || r.set === set) && r.mode === mode)
function metric(set, mode) {
  const rs = filter(set, mode), byQuestion = Object.values(Object.groupBy(rs, r => `${r.set}|${r.question_id}`))
  const qRates = byQuestion.map(group => mean(group.map(r => r.rate)))
  const repeatMeans = [1,2,3].map(repeat => mean(rs.filter(r => r.repeat === repeat).map(r => r.rate))).filter(x => x !== null)
  const passes = rs.reduce((n, r) => n + r.rescored.passed, 0), total = rs.reduce((n, r) => n + r.rescored.total, 0)
  const allByRepeat = [1,2,3].map(repeat => {
    const passed = rs.filter(r => r.repeat === repeat && r.rescored.passed === r.rescored.total).length
    return { repeat, passed, out_of: set === 'combined' ? 24 : 12, observed: rs.filter(r => r.repeat === repeat).length }
  })
  const any = byQuestion.filter(group => group.some(r => r.rescored.passed === r.rescored.total)).length
  const latency = rs.map(r => r.latency_ms / 1000).filter(Number.isFinite)
  const perQuestionLatency = Object.fromEntries(byQuestion.map(group => [`${group[0].set}|${group[0].question_id}`, { min_s: round(Math.min(...group.map(r => r.latency_ms / 1000))), max_s: round(Math.max(...group.map(r => r.latency_ms / 1000))) }]))
  const recallValues = byQuestion.map(group => mean(group.map(r => {
    const gold = r.question.gold_evidence_ids
    return gold.length ? r.evidence_ids.filter(id => gold.includes(id)).length / gold.length : null
  }).filter(x => x !== null)))
  const recall = mode === 'direct'
    ? { value: null, note: 'undefined for direct (no retrieved evidence)' }
    : { value: round(mean(recallValues)), note: null }
  const failed = rs.filter(r => r.error).length, thinking = rs.filter(r => Number(r.thinking_chars) > 0).length
  const failures = []
  for (const group of byQuestion) group[0].question.predicates.forEach((predicate, index) => { const count = group.filter(r => !r.rescored.results[index]).length; if (count) failures.push({ question_id: group[0].question_id, predicate_index: index + 1, predicate, failed_runs: count, total_runs: group.length }) })
  return { runs: rs.length, questions_observed: byQuestion.length, pass_rate: { macro_mean: round(mean(qRates)), sd_across_repeats: round(sd(repeatMeans)), repeat_macro_means: repeatMeans.map(round), bootstrap_95_ci: bootstrap(qRates) }, pooled_passes: { passed: passes, total, rate: round(total ? passes / total : null) }, questions_passing_every_check: { per_repeat: allByRepeat, any_repeat: { passed: any, out_of: set === 'combined' ? 24 : 12, observed: byQuestion.length } }, evidence_recall: recall, latency_seconds: { mean: round(mean(latency)), median: round(quantile(latency, .5)), p95: round(quantile(latency, .95)), per_question_min_max: perQuestionLatency }, most_failed_predicates: failures.sort((a,b) => b.failed_runs - a.failed_runs || a.question_id.localeCompare(b.question_id)).slice(0,5), failed_runs: failed, thinking_chars_positive_runs: thinking }
}
function paired(set, left, right) {
  const keys = Object.keys(questions).filter(key => (set === 'combined' || key.startsWith(`${set}|`)))
  const diffs = keys.flatMap(key => { const [s, q] = key.split('|'); const a = rows.filter(r => r.set === s && r.question_id === q && r.mode === left), b = rows.filter(r => r.set === s && r.question_id === q && r.mode === right); return a.length && b.length ? [mean(a.map(r => r.rate)) - mean(b.map(r => r.rate))] : [] })
  return { comparison: `${left} minus ${right}`, questions_observed: diffs.length, mean_difference: round(mean(diffs)), bootstrap_95_ci: bootstrap(diffs) }
}
const summary = { generated_at: new Date().toISOString(), source: 'eval/results/raw.jsonl', bootstrap: { seed, resamples: B, unit: 'question' }, records: raw.length, score_mismatches: rows.filter(r => r.mismatch).map(r => ({ key: r.key, stored: r.score ?? null, rescored: r.rescored })), sets: {}, combined: {} }
for (const set of sets) { summary.sets[set] = { modes: Object.fromEntries(modes.map(mode => [mode, metric(set, mode)])), false_premise: Object.fromEntries(modes.map(mode => [mode, rows.filter(r => r.set === set && r.mode === mode && r.question.topic === 'false premise').map(r => ({ question_id: r.question_id, repeat: r.repeat, pass: r.rescored.passed === r.rescored.total, passed: r.rescored.passed, total: r.rescored.total }))])), paired_comparisons: [paired(set, 'full', 'rag'), paired(set, 'full', 'direct')] } }
summary.combined = { modes: Object.fromEntries(modes.map(mode => [mode, metric('combined', mode)])), false_premise: Object.fromEntries(modes.map(mode => [mode, rows.filter(r => r.mode === mode && r.question.topic === 'false premise').map(r => ({ set: r.set, question_id: r.question_id, repeat: r.repeat, pass: r.rescored.passed === r.rescored.total, passed: r.rescored.passed, total: r.rescored.total }))])), paired_comparisons: [paired('combined', 'full', 'rag'), paired('combined', 'full', 'direct')] }
const barRows = ['dev','heldout','combined'].flatMap(set => modes.map(mode => { const m = (set === 'combined' ? summary.combined : summary.sets[set]).modes[mode]; return `${set},${mode},${m.pass_rate.macro_mean ?? ''},${m.pass_rate.bootstrap_95_ci[0] ?? ''},${m.pass_rate.bootstrap_95_ci[1] ?? ''},${m.evidence_recall.value ?? ''}` }))
const latencyRows = ['dev','heldout','combined'].flatMap(set => modes.map(mode => { const m = (set === 'combined' ? summary.combined : summary.sets[set]).modes[mode]; return `${set},${mode},${m.latency_seconds.mean ?? ''},${m.pass_rate.macro_mean ?? ''},${m.pass_rate.bootstrap_95_ci[0] ?? ''},${m.pass_rate.bootstrap_95_ci[1] ?? ''}` }))
await writeFile(resolve('eval/results/figure_pass_recall.csv'), `set,mode,pass_rate,pass_rate_ci_low,pass_rate_ci_high,evidence_recall\n${barRows.join('\n')}\n`)
await writeFile(resolve('eval/results/figure_latency_pass.csv'), `set,mode,mean_latency_s,pass_rate,pass_rate_ci_low,pass_rate_ci_high\n${latencyRows.join('\n')}\n`)
const line = (set, mode) => { const m = (set === 'combined' ? summary.combined : summary.sets[set]).modes[mode], p = m.pass_rate; return `| ${mode} | ${m.runs} | ${p.macro_mean ?? 'N/A'} | ${p.sd_across_repeats ?? 'N/A'} | ${p.bootstrap_95_ci.join('–')} | ${m.evidence_recall.value ?? 'undefined'} | ${m.latency_seconds.mean ?? 'N/A'} | ${m.latency_seconds.median ?? 'N/A'} | ${m.latency_seconds.p95 ?? 'N/A'} |` }
const details = (set, mode) => { const m = (set === 'combined' ? summary.combined : summary.sets[set]).modes[mode]; return `${mode}: pooled ${m.pooled_passes.passed}/${m.pooled_passes.total}; all-check ${JSON.stringify(m.questions_passing_every_check)}; failed runs ${m.failed_runs}; thinking_chars > 0 ${m.thinking_chars_positive_runs}; per-question latency min/max in summary.json.` }
const report = ['# Evaluation summary', '', `Source: \`eval/results/raw.jsonl\` (${raw.length} records). Answers were re-scored with \`eval/predicates.mjs\`; stored-score mismatches: ${summary.score_mismatches.length}. Bootstrap CIs use ${B.toLocaleString()} question-level resamples with seed ${seed}.`, '', ...['dev','heldout','combined'].flatMap(set => [`## ${set}`, '', '| Mode | Runs | Macro pass rate | SD across repeats | 95% bootstrap CI | Evidence recall | Mean latency (s) | Median (s) | P95 (s) |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|', ...modes.map(mode => line(set, mode)), '', ...modes.map(mode => details(set, mode)), '', `Paired: ${JSON.stringify((set === 'combined' ? summary.combined : summary.sets[set]).paired_comparisons)}`, `False premise: ${JSON.stringify((set === 'combined' ? summary.combined : summary.sets[set]).false_premise)}`, `Most failed predicates: ${JSON.stringify(Object.fromEntries(modes.map(mode => [mode, (set === 'combined' ? summary.combined : summary.sets[set]).modes[mode].most_failed_predicates])))}`, '']), '', 'Direct evidence recall is undefined because direct mode supplies no retrieved evidence. Per-question latency min/max and score-mismatch details are in `summary.json`.'].join('\n')
await writeFile(resolve('eval/results/summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
await writeFile(resolve('eval/results/summary.md'), `${report}\n`)
console.log(report)

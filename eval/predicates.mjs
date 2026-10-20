/** Predicate normalization and scoring defined by eval/README.md. */
export function normalize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[‐‑‒–—-]/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[`*_~>#]/g, '')
    .replace(/(?<=\d),(?=\d{3}\b)/g, '')
    .replace(/[₹$€£]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matches(answer, pattern) {
  return new RegExp(normalize(pattern), 'i').test(normalize(answer))
}

export function passes(answer, predicate) {
  if (predicate.type === 'require') return matches(answer, predicate.pattern)
  if (predicate.type === 'require_any') return predicate.patterns.some(pattern => matches(answer, pattern))
  if (predicate.type === 'forbid') return !matches(answer, predicate.pattern)
  throw new Error(`Unknown predicate type: ${predicate.type}`)
}

export function score(answer, predicates) {
  const results = predicates.map(predicate => passes(answer, predicate))
  return { passed: results.filter(Boolean).length, total: results.length, results }
}

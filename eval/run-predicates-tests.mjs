import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const base = pathToFileURL(`${resolve('eval')}/`).href
let source = await readFile(resolve('eval/predicates.test'), 'utf8')
source = source
  .replace("'./predicates.mjs'", `'${base}predicates.mjs'`)
  .replace("new URL('./questions.dev.json', import.meta.url)", `new URL('${base}questions.dev.json')`)
  .replace("new URL('./questions.heldout.json', import.meta.url)", `new URL('${base}questions.heldout.json')`)
await import(`data:text/javascript,${encodeURIComponent(source)}`)

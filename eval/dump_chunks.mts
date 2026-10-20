/** Write the reproducible NovaEdge chunk snapshot used to annotate eval sets. */
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { demoStartup } from '../src/data/demoStartup.ts'
import { makeChunks } from '../server/orchestrator.ts'

const startup = { ...demoStartup, id: 'novaedge-eval', ownerId: 'evaluation' }
const chunks = makeChunks(startup).map(({ id, title, content, kind }) => ({ id, title, content, kind }))
await writeFile(resolve('eval/chunks.nova.json'), `${JSON.stringify(chunks, null, 2)}\n`)
console.log(`Wrote ${chunks.length} chunks to eval/chunks.nova.json`)

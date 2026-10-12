import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStartupDraft } from '../src/data/demoStartup.ts'
import { fillMissingPlan, metricCoverage, missingPlanningSections } from '../src/utils/workspacePlanning.ts'
import { workspacePlanSchema } from '../src/types/workspacePlan.ts'
import { calculateFinance, calculateCapacity, sumBOM } from '../src/utils/calculations.ts'
import { requireModels } from './health.ts'
import { generateWorkspacePlan, plannerGroups } from './workspacePlanner.ts'
import { VectorStore } from './vectorStore.ts'

// Explicit live check: real installed models, isolated temporary SQLite, no Firebase writes.
const directory = mkdtempSync(join(tmpdir(), 'buildmyidea-live-plan-'))
const store = new VectorStore(join(directory, 'knowledge.sqlite'))
const startup = { ...createStartupDraft({ founderName: 'Test founder', name: 'Fitness watch imports', country: 'India', region: 'Karnataka', founderCount: 1, experience: 'Retail', budget: 5000000, idea: 'Import finished fitness smartwatches from China and sell them to students in India', category: 'Wearable', description: 'Affordable imported fitness watches with local support', targetCustomer: 'Students', targetMarket: 'Student wearables', geographicMarket: 'India', sellingPrice: 2400, launchTimeline: '9 months' }), id: 'live-verification', ownerId: 'verification', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
try {
  await requireModels(plannerGroups.map(group => group.role))
  const proposal = await generateWorkspacePlan(store, startup.ownerId, startup, AbortSignal.timeout(720000), progress => console.log(`${Math.round(progress.elapsedMs / 1000)}s ${progress.stage}: ${progress.state}`))
  workspacePlanSchema.parse(proposal)
  const filled = { ...startup, ...fillMissingPlan(startup, proposal) }
  assert.deepEqual(missingPlanningSections(filled), [])
  assert.deepEqual(metricCoverage(filled), { bom: true, finance: true, capacity: true, risks: true })
  assert.equal(filled.financials.sellingPrice, 2400)
  assert.equal(filled.financials.initialCapital, 5000000)
  assert.ok(!JSON.stringify(proposal).toLowerCase().includes('laptop'))
  assert.ok(filled.bom.every(item => item.id && item.notes.includes('not a supplier quote')))
  assert.ok(filled.compliance.every(item => item.status === 'Not started' && item.applicability === 'Needs review'))
  assert.ok(filled.risks.every(item => item.status === 'Open'))
  assert.ok(filled.roadmap.every(item => item.status === 'Planned'))
  assert.equal(filled.financials.employeeExpenses, filled.team.reduce((sum, role) => sum + role.salary, 0))
  console.log(JSON.stringify({ result: 'PASS', sections: proposal.planningDraft?.modules.length, bomItems: filled.bom.length, bom: sumBOM(filled.bom), margin: calculateFinance(filled.financials, sumBOM(filled.bom)).grossMargin, capacity: calculateCapacity(filled.manufacturing).realisticMonthly, risks: filled.risks.length, allFigures: 'unverified draft estimates' }))
} finally {
  store.close()
  rmSync(directory, { recursive: true, force: true })
}

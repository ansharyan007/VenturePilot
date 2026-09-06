import { describe, expect, it } from 'vitest'
import { calculateCapacity, calculateFinance, sumBOM } from './calculations'
import type { FinancialModel, ManufacturingPlan } from '../types'

describe('deterministic startup calculations', () => {
  it('totals BOM quantity times unit cost', () => {
    expect(sumBOM([{ id:'1', component:'A', quantity:2, unitCost:100, supplierType:'', criticality:'Low', notes:'' }, { id:'2', component:'B', quantity:1, unitCost:50, supplierType:'', criticality:'High', notes:'' }])).toBe(250)
  })
  it('calculates revenue, COGS, margin, and break-even', () => {
    const model: FinancialModel = { initialCapital:100000, sellingPrice:1000, manufacturingCost:100, packaging:50, logistics:50, employeeExpenses:1000, rent:500, marketing:500, technology:0, compliance:0, otherExpenses:0, monthlySales:10 }
    const result = calculateFinance(model, 300)
    expect(result.unitCost).toBe(500)
    expect(result.revenue).toBe(10000)
    expect(result.cogs).toBe(5000)
    expect(result.grossProfit).toBe(5000)
    expect(result.grossMargin).toBe(50)
    expect(result.breakEvenUnits).toBe(4)
  })
  it('separates theoretical and realistic capacity', () => {
    const plan: ManufacturingPlan = { strategy:'Contract manufacturing', advantages:'', disadvantages:'', complexity:'', capitalRequirements:0, workforce:'', qualityControl:'', risks:'', factorySize:1000, productionLines:2, unitsPerHour:10, hoursPerDay:8, daysPerMonth:20, utilization:75 }
    const result = calculateCapacity(plan)
    expect(result.theoreticalDaily).toBe(160)
    expect(result.realisticMonthly).toBe(2400)
    expect(result.realisticAnnual).toBe(28800)
  })
})

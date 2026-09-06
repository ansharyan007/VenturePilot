import type { BOMItem, FinancialModel, ManufacturingPlan } from '../types'

export const sumBOM = (items: BOMItem[]) => items.reduce((sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unitCost), 0)

export const calculateCapacity = (m: ManufacturingPlan) => {
  const theoreticalDaily = Math.max(0, m.productionLines * m.unitsPerHour * m.hoursPerDay)
  const theoreticalMonthly = theoreticalDaily * Math.max(0, m.daysPerMonth)
  const utilization = Math.min(100, Math.max(0, m.utilization)) / 100
  return {
    theoreticalDaily,
    theoreticalMonthly,
    theoreticalAnnual: theoreticalMonthly * 12,
    realisticDaily: theoreticalDaily * utilization,
    realisticMonthly: theoreticalMonthly * utilization,
    realisticAnnual: theoreticalMonthly * 12 * utilization,
  }
}

export const calculateFinance = (model: FinancialModel, bomCost: number) => {
  const unitCost = bomCost + model.manufacturingCost + model.packaging + model.logistics
  const grossProfitPerUnit = model.sellingPrice - unitCost
  const grossMargin = model.sellingPrice > 0 ? (grossProfitPerUnit / model.sellingPrice) * 100 : 0
  const revenue = model.sellingPrice * model.monthlySales
  const cogs = unitCost * model.monthlySales
  const grossProfit = revenue - cogs
  const operatingExpenses = model.employeeExpenses + model.rent + model.marketing + model.technology + model.compliance + model.otherExpenses
  const operatingProfit = grossProfit - operatingExpenses
  const breakEvenUnits = grossProfitPerUnit > 0 ? Math.ceil(operatingExpenses / grossProfitPerUnit) : 0
  return { unitCost, grossProfitPerUnit, grossMargin, revenue, cogs, grossProfit, operatingExpenses, operatingProfit, breakEvenUnits, breakEvenRevenue: breakEvenUnits * model.sellingPrice }
}

export const inr = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)
export const number = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0)

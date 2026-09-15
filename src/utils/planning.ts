import type { ScalingStage, TeamRole } from '../types'
export function canReportTo(roles: TeamRole[], employeeId: string, managerId: string) {
  if (!managerId) return true
  const seen = new Set([employeeId])
  let cursor = managerId
  while (cursor) {
    if (seen.has(cursor)) return false
    seen.add(cursor)
    const manager = roles.find(role => role.id === cursor)
    if (!manager) return false
    cursor = manager.reportsTo || ''
  }
  return true
}
export function reviewGate(stages: ScalingStage[], index: number, status: NonNullable<ScalingStage['gateStatus']>) {
  if (status === 'Ready' && (!stages[index].evidence?.trim() || !stages[index].milestones.trim())) throw new Error('Record exit criteria and supporting evidence before marking this gate ready.')
  if (status === 'Ready' && stages.slice(0, index).some(stage => stage.gateStatus !== 'Ready')) throw new Error('Review the earlier stage gates first.')
  return stages.map((stage, i) => i === index ? { ...stage, gateStatus: status } : i > index && status !== 'Ready' && stage.gateStatus === 'Ready' ? { ...stage, gateStatus: 'Not reviewed' as const } : stage)
}

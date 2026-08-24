import type { SpendingItem } from '@/data/types'
import { formatBRL } from './utils'

export interface SafeToSpendResult {
  monthlyBudget: number
  totalSpentThisMonth: number
  remainingBudget: number
  daysInMonth: number
  currentDayOfMonth: number
  daysRemaining: number
  burnRatePerDay: number
  safeToSpendPerDay: number
  paceStatus: 'comfortable' | 'attention' | 'critical'
  progressPercent: number
  statusMessage: string
  formattedSafeToSpend: string
  formattedBurnRate: string
  formattedRemainingBudget: string
}

export function calculateSafeToSpend(
  spending: SpendingItem[],
  customBudget?: number,
): SafeToSpendResult {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const currentDayOfMonth = now.getDate()

  // Total de dias no mês atual
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysRemaining = Math.max(1, daysInMonth - currentDayOfMonth + 1)
  const daysPassed = Math.max(1, currentDayOfMonth)

  // Filtra gastos pertencentes ao mês atual
  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthSpendings = (spending || []).filter((s) => {
    if (!s.date) return false
    return s.date.startsWith(currentMonthPrefix)
  })

  const totalSpentThisMonth = monthSpendings.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  // Orçamento (customizado, ou localStorage, ou fallback)
  const savedBudget = Number(localStorage.getItem('act.financas.monthlyBudget')) || 3500
  const monthlyBudget = customBudget && customBudget > 0 ? customBudget : savedBudget

  const remainingBudget = Math.max(0, monthlyBudget - totalSpentThisMonth)
  const safeToSpendPerDay = Math.max(0, remainingBudget / daysRemaining)
  const burnRatePerDay = totalSpentThisMonth / daysPassed

  const progressPercent = monthlyBudget > 0 
    ? Math.min(100, Math.round((totalSpentThisMonth / monthlyBudget) * 100)) 
    : 0

  let paceStatus: 'comfortable' | 'attention' | 'critical' = 'comfortable'
  let statusMessage = 'Ritmo equilibrado para o mês'

  if (totalSpentThisMonth > monthlyBudget) {
    paceStatus = 'critical'
    statusMessage = 'Orçamento mensal ultrapassado'
  } else if (safeToSpendPerDay <= (monthlyBudget / daysInMonth) * 0.5) {
    paceStatus = 'attention'
    statusMessage = 'Atenção ao limite diário'
  } else {
    paceStatus = 'comfortable'
    statusMessage = 'Cota diária saudável'
  }

  return {
    monthlyBudget,
    totalSpentThisMonth,
    remainingBudget,
    daysInMonth,
    currentDayOfMonth,
    daysRemaining,
    burnRatePerDay,
    safeToSpendPerDay,
    paceStatus,
    progressPercent,
    statusMessage,
    formattedSafeToSpend: formatBRL(safeToSpendPerDay),
    formattedBurnRate: formatBRL(burnRatePerDay),
    formattedRemainingBudget: formatBRL(remainingBudget),
  }
}

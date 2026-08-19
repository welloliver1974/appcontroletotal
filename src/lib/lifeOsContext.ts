import { db } from './db'
import type { AgendaEvent, Asset, DocVaultItem, FixedBill, MaintenanceRecord, PantryItem, SpendingItem } from '@/data/types'
import { calculateVehiclePredictiveStats } from '@/features/manutencao/predictiveMaint'

export interface LifeOsSummaryContext {
  todayFormatted: string
  spendingMonthTotal: number
  pendingFixedBills: string[]
  upcomingEvents: string[]
  lowPantryItems: string[]
  criticalAssets: string[]
  vehicleSummary: string[]
  docVaultSummary: string[]
  recentNotesCount: number
}

/**
 * Extracts a concise, high-density RAG context of the entire Life OS Hub
 * to allow Hermes AI to answer natural language questions accurately.
 */
export async function getLifeOsSummaryContext(): Promise<LifeOsSummaryContext> {
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const currentMonthPrefix = todayIso.slice(0, 7) // YYYY-MM

  const [
    events,
    pantry,
    spending,
    fixedBills,
    assets,
    maintenance,
    docVault,
    lifeLog,
  ] = await Promise.all([
    db.get<AgendaEvent>('events').catch(() => []),
    db.get<PantryItem>('pantry').catch(() => []),
    db.get<SpendingItem>('spending_entries').catch(() => []),
    db.get<FixedBill>('fixed_bills').catch(() => []),
    db.get<Asset>('assets').catch(() => []),
    db.get<MaintenanceRecord>('maintenance').catch(() => []),
    db.get<DocVaultItem>('doc_vault').catch(() => []),
    db.get<{ id: string; title: string; createdAt: string }>('life_log').catch(() => []),
  ])

  // 1. Finanças
  const monthSpending = spending.filter((s) => s.date && s.date.startsWith(currentMonthPrefix))
  const spendingMonthTotal = monthSpending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  const pendingBills = fixedBills
    .filter((b) => !(b.paidMonths || []).includes(currentMonthPrefix))
    .map((b) => `${b.name} (R$ ${Number(b.amount || 0).toFixed(2)}, vence dia ${b.dueDay})`)

  // 2. Agenda (hoje e próximos 3 dias)
  const threeDaysLater = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)
  const upcomingEvents = events
    .filter((e) => e.date >= todayIso && e.date <= threeDaysLater)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart || '').localeCompare(b.timeStart || ''))
    .map((e) => `${e.date} às ${e.timeStart || 'dia todo'}: ${e.title}${e.location ? ` em ${e.location}` : ''}`)

  // 3. Despensa
  const lowPantryItems = pantry
    .filter((p) => Number(p.qty || 0) <= Number(p.lowThreshold || 1))
    .map((p) => `${p.name} (${p.qty}/${p.lowThreshold} ${p.unit})`)

  // 4. Manutenção & Veículos
  const criticalAssets = assets
    .filter((a) => a.lifePct <= 25 || a.nextMaintenance < todayIso)
    .map((a) => `${a.name} (Vida útil: ${a.lifePct}%, próx. revisão: ${a.nextMaintenance})`)

  const vehicleSummary = assets
    .filter((a) => a.category === 'carro')
    .map((a) => {
      const pred = calculateVehiclePredictiveStats(a.id, maintenance)
      return pred
        ? `${a.name}: ${pred.currentKm.toLocaleString('pt-BR')} km (${pred.formattedSummary})`
        : `${a.name}`
    })

  // 5. DocVault (Documentos, números, medidas)
  const docVaultSummary = docVault.map((d) => `[${d.category}] ${d.title}: ${d.value}${d.extra ? ` (${d.extra})` : ''}`)

  return {
    todayFormatted: now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    spendingMonthTotal,
    pendingFixedBills: pendingBills,
    upcomingEvents,
    lowPantryItems,
    criticalAssets,
    vehicleSummary,
    docVaultSummary,
    recentNotesCount: lifeLog.length,
  }
}

/**
 * Builds full prompt context string to feed the LLM.
 */
export async function buildFullLifeOsPromptContext(): Promise<string> {
  try {
    const ctx = await getLifeOsSummaryContext()

    return `CONTEXTO EM TEMPO REAL DO LIFE OS HUB DO USUÁRIO:
- Data atual: ${ctx.todayFormatted}
- Finanças Mês Atual: Total gasto registrado = R$ ${ctx.spendingMonthTotal.toFixed(2)}.
- Contas Fixas Pendentes: ${ctx.pendingFixedBills.length > 0 ? ctx.pendingFixedBills.join('; ') : 'Nenhuma conta pendente este mês'}.
- Próximos Compromissos (3 dias): ${ctx.upcomingEvents.length > 0 ? ctx.upcomingEvents.join('; ') : 'Nenhum compromisso próximo'}.
- Despensa em Falta: ${ctx.lowPantryItems.length > 0 ? ctx.lowPantryItems.join(', ') : 'Despensa abastecida'}.
- Manutenções Críticas: ${ctx.criticalAssets.length > 0 ? ctx.criticalAssets.join('; ') : 'Todos os ativos em dia'}.
- Veículos & Estimativas: ${ctx.vehicleSummary.length > 0 ? ctx.vehicleSummary.join('; ') : 'Nenhum veículo cadastrado'}.
- Cofre de Documentos & Informações Úteis: ${ctx.docVaultSummary.length > 0 ? ctx.docVaultSummary.join(' | ') : 'Cofre vazio'}.
- Notas no Diário: ${ctx.recentNotesCount} notas registradas.`
  } catch (err) {
    console.warn('[LifeOsContext] Context extraction error:', err)
    return `Data atual: ${new Date().toISOString().slice(0, 10)}`
  }
}

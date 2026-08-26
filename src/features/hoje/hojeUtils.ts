import type {
  AgendaEvent,
  Asset,
  DailyHabit,
  FixedBill,
  MaintenanceRecord,
  PantryItem,
  Trip,
} from '@/data/types'

export type TodayPrioritySource =
  | 'agenda'
  | 'financas'
  | 'despensa'
  | 'manutencao'
  | 'viagens'
  | 'habitos'

export type TodayPrioritySeverity = 'critical' | 'warning' | 'normal'

export interface TodayPriority {
  id: string
  source: TodayPrioritySource
  severity: TodayPrioritySeverity
  title: string
  description: string
  actionLabel?: string
  path?: string
  timeLabel?: string
  completed?: boolean
  rawId?: string
  rawItem?: unknown
}

export interface TodayPlan {
  dateLabel: string
  shortDateLabel: string
  fullDateLabel: string
  greeting: string
  summary: string
  now?: TodayPriority
  priorities: TodayPriority[]
  alerts: TodayPriority[]
  counts: {
    events: number
    bills: number
    pantryLow: number
    habitsPending: number
    maintAlerts: number
  }
}

export interface RawTodayData {
  events: AgendaEvent[]
  fixedBills: FixedBill[]
  pantry: PantryItem[]
  assets: Asset[]
  maintenance: MaintenanceRecord[]
  habits: DailyHabit[]
  trips: Trip[]
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function todayIsoString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function buildTodayPlan(data: Partial<RawTodayData>, nowRef = new Date()): TodayPlan {
  const today = todayIsoString(nowRef)
  const monthKey = currentMonthKey(nowRef)
  const currentDay = nowRef.getDate()
  const currentHour = nowRef.getHours()
  const currentMinutes = nowRef.getMinutes()
  const currentTimeMinutes = currentHour * 60 + currentMinutes

  const greeting = `${getGreeting(currentHour)}!`

  const dateLabel = nowRef.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  const weekdayShort = nowRef.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').trim()
  const dayNum = nowRef.getDate()
  const monthShort = nowRef.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').trim()
  const shortDateLabel = `${weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1)}, ${dayNum} ${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}`

  const fullDateLabel = nowRef.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const events = data.events || []
  const fixedBills = data.fixedBills || []
  const pantry = data.pantry || []
  const assets = data.assets || []
  const habits = data.habits || []
  const trips = data.trips || []

  // 1. Eventos de Hoje
  const todayEvents = events
    .filter((e) => e.date === today)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  // 2. Contas Fixas de Hoje / Vencidas
  const dueBills = fixedBills.filter((bill) => {
    const isPaidThisMonth = (bill.paidMonths || []).includes(monthKey)
    if (isPaidThisMonth) return false
    return bill.dueDay <= currentDay
  })

  const billsDueToday = dueBills.filter((b) => b.dueDay === currentDay)
  const billsOverdue = dueBills.filter((b) => b.dueDay < currentDay)

  // 3. Despensa Crítica (zerada ou vencendo)
  const expiredPantry = pantry.filter((p) => p.expiresAt && p.expiresAt <= today)
  const lowStockPantry = pantry.filter((p) => p.qty <= 0 || p.qty <= (p.lowThreshold || 1))

  // 4. Manutenção Crítica
  const criticalAssets = assets.filter((a) => {
    if (a.lifePct !== undefined && a.lifePct <= 15) return true
    if (a.nextMaintenance && a.nextMaintenance <= today) return true
    return false
  })

  // 5. Hábitos do Dia
  const pendingHabits = habits.filter((h) => !(h.completedDates || []).includes(today))

  // 6. Viagens Ativas
  const activeTrips = trips.filter(
    (t) => t.startDate <= today && t.endDate >= today && t.status !== 'realizado',
  )

  // Montagem da lista unificada de prioridades
  const priorityPool: (TodayPriority & { score: number })[] = []
  const alertPool: TodayPriority[] = []

  // Adiciona eventos
  todayEvents.forEach((ev) => {
    const [evH, evM] = (ev.timeStart || '12:00').split(':').map(Number)
    const evMinutes = (evH || 0) * 60 + (evM || 0)
    const isPast = evMinutes + 45 < currentTimeMinutes
    const isDone = Boolean(ev.completed)

    priorityPool.push({
      id: `event-${ev.id}`,
      rawId: ev.id,
      source: 'agenda',
      severity: isDone ? 'normal' : isPast ? 'normal' : 'critical',
      title: ev.title,
      description: `${ev.timeStart}${ev.location ? ` · ${ev.location}` : ''}${isDone ? ' (Concluído)' : ''}`,
      timeLabel: ev.timeStart,
      completed: isDone,
      actionLabel: 'Ver Agenda',
      path: '/agenda',
      score: isDone ? 15 : isPast ? 30 : 100 - Math.max(0, Math.min(60, (evMinutes - currentTimeMinutes) / 10)),
    })
  })

  // Adiciona contas vencidas (críticas) e que vencem hoje
  billsOverdue.forEach((bill) => {
    const p: TodayPriority = {
      id: `bill-overdue-${bill.id}`,
      rawId: bill.id,
      source: 'financas',
      severity: 'critical',
      title: `Conta em Atraso: ${bill.name}`,
      description: `R$ ${bill.amount.toFixed(2)} (venceu dia ${bill.dueDay})`,
      actionLabel: 'Pagar Conta',
      path: '/financas',
    }
    priorityPool.push({ ...p, score: 95 })
    alertPool.push(p)
  })

  billsDueToday.forEach((bill) => {
    const p: TodayPriority = {
      id: `bill-today-${bill.id}`,
      rawId: bill.id,
      source: 'financas',
      severity: 'warning',
      title: `Vence Hoje: ${bill.name}`,
      description: `R$ ${bill.amount.toFixed(2)}`,
      actionLabel: 'Pagar Conta',
      path: '/financas',
    }
    priorityPool.push({ ...p, score: 85 })
    alertPool.push(p)
  })

  // Adiciona alertas de despensa
  if (expiredPantry.length > 0) {
    const p: TodayPriority = {
      id: 'pantry-expired',
      source: 'despensa',
      severity: 'critical',
      title: `${expiredPantry.length} ${expiredPantry.length === 1 ? 'item vencido' : 'itens vencidos'} na Despensa`,
      description: expiredPantry.map((i) => i.name).slice(0, 3).join(', '),
      actionLabel: 'Ver Despensa',
      path: '/despensa',
    }
    priorityPool.push({ ...p, score: 90 })
    alertPool.push(p)
  }

  if (lowStockPantry.length > 0) {
    const p: TodayPriority = {
      id: 'pantry-low',
      source: 'despensa',
      severity: 'warning',
      title: `${lowStockPantry.length} ${lowStockPantry.length === 1 ? 'item em falta' : 'itens em falta/acabando'}`,
      description: lowStockPantry.map((i) => i.name).slice(0, 3).join(', '),
      actionLabel: 'Lista de Compras',
      path: '/despensa',
    }
    priorityPool.push({ ...p, score: 65 })
    alertPool.push(p)
  }

  // Adiciona manutenção crítica
  criticalAssets.forEach((asset) => {
    const p: TodayPriority = {
      id: `asset-${asset.id}`,
      rawId: asset.id,
      source: 'manutencao',
      severity: 'warning',
      title: `Manutenção: ${asset.name}`,
      description: asset.lifePct !== undefined ? `Vida útil em ${asset.lifePct}%` : 'Revisão prevista',
      actionLabel: 'Ver Ativos',
      path: '/manutencao',
    }
    priorityPool.push({ ...p, score: 70 })
    alertPool.push(p)
  })

  // Adiciona viagem ativa
  activeTrips.forEach((trip) => {
    priorityPool.push({
      id: `trip-${trip.id}`,
      rawId: trip.id,
      source: 'viagens',
      severity: 'normal',
      title: `Em Viagem: ${trip.destination}`,
      description: `${trip.stops?.length || 0} paradas planejadas`,
      actionLabel: 'Ver Roteiro',
      path: '/viagens',
      score: 60,
    })
  })

  // Adiciona hábitos pendentes (agrupados ou prioritários)
  if (pendingHabits.length > 0) {
    priorityPool.push({
      id: 'habits-pending-summary',
      source: 'habitos',
      severity: 'normal',
      title: `${pendingHabits.length} ${pendingHabits.length === 1 ? 'hábito pendente' : 'hábitos pendentes'} hoje`,
      description: pendingHabits.map((h) => h.title).slice(0, 3).join(' · '),
      score: 50,
    })
  }

  // Ordenar prioridades por score decrescente
  priorityPool.sort((a, b) => b.score - a.score)

  // Limitar prioridades a no máximo 5 itens
  const priorities = priorityPool.slice(0, 5).map(({ ...rest }) => rest)

  // Determinar o card "Agora"
  let nowItem: TodayPriority | undefined

  // Primeiro tenta achar o próximo evento de hoje que ainda não passou e não foi concluído
  const upcomingEvent = todayEvents.find((ev) => {
    if (ev.completed) return false
    const [evH, evM] = (ev.timeStart || '00:00').split(':').map(Number)
    const evMinutes = (evH || 0) * 60 + (evM || 0)
    return evMinutes + 30 >= currentTimeMinutes
  })

  if (upcomingEvent) {
    nowItem = {
      id: `now-event-${upcomingEvent.id}`,
      rawId: upcomingEvent.id,
      source: 'agenda',
      severity: 'critical',
      title: upcomingEvent.title,
      description: `Próximo compromisso às ${upcomingEvent.timeStart}${upcomingEvent.location ? ` · ${upcomingEvent.location}` : ''}`,
      timeLabel: upcomingEvent.timeStart,
      actionLabel: 'Ver Agenda',
      path: '/agenda',
    }
  } else if (billsOverdue.length > 0) {
    nowItem = {
      id: `now-bill-${billsOverdue[0].id}`,
      rawId: billsOverdue[0].id,
      source: 'financas',
      severity: 'critical',
      title: `Conta em atraso: ${billsOverdue[0].name}`,
      description: `Valor: R$ ${billsOverdue[0].amount.toFixed(2)}. Regularize assim que possível.`,
      actionLabel: 'Pagar Conta',
      path: '/financas',
    }
  } else if (billsDueToday.length > 0) {
    nowItem = {
      id: `now-bill-today-${billsDueToday[0].id}`,
      rawId: billsDueToday[0].id,
      source: 'financas',
      severity: 'warning',
      title: `Conta vence hoje: ${billsDueToday[0].name}`,
      description: `Valor: R$ ${billsDueToday[0].amount.toFixed(2)}`,
      actionLabel: 'Pagar Conta',
      path: '/financas',
    }
  } else if (todayEvents.length > 0) {
    const lastEvent = todayEvents[todayEvents.length - 1]
    nowItem = {
      id: `now-event-done-${lastEvent.id}`,
      source: 'agenda',
      severity: 'normal',
      title: 'Compromissos do dia concluídos',
      description: `Último evento foi ${lastEvent.title} (${lastEvent.timeStart}).`,
      actionLabel: 'Ver Agenda',
      path: '/agenda',
    }
  }

  // Síntese local inteligente do Hermes
  const summaryParts: string[] = []

  if (todayEvents.length > 0) {
    summaryParts.push(`${todayEvents.length} ${todayEvents.length === 1 ? 'compromisso' : 'compromissos'}`)
  }
  if (dueBills.length > 0) {
    summaryParts.push(`${dueBills.length} ${dueBills.length === 1 ? 'conta para pagar' : 'contas para pagar'}`)
  }
  if (expiredPantry.length + lowStockPantry.length > 0) {
    summaryParts.push(`${expiredPantry.length + lowStockPantry.length} alertas na despensa`)
  }
  if (pendingHabits.length > 0) {
    summaryParts.push(`${pendingHabits.length} ${pendingHabits.length === 1 ? 'hábito pendente' : 'hábitos pendentes'}`)
  }

  let summary = ''
  if (summaryParts.length === 0) {
    summary = 'Tudo calmo e organizado por aqui. Nenhum alerta crítico ou compromisso agendado para hoje.'
  } else if (summaryParts.length === 1) {
    summary = `Hoje seu dia tem ${summaryParts[0]}.`
  } else if (summaryParts.length === 2) {
    summary = `Hoje pede atenção para ${summaryParts[0]} e ${summaryParts[1]}.`
  } else {
    const lastPart = summaryParts.pop()
    summary = `Hoje pede atenção para ${summaryParts.join(', ')} e ${lastPart}.`
  }

  return {
    dateLabel,
    shortDateLabel,
    fullDateLabel,
    greeting,
    summary,
    now: nowItem,
    priorities,
    alerts: alertPool,
    counts: {
      events: todayEvents.length,
      bills: dueBills.length,
      pantryLow: expiredPantry.length + lowStockPantry.length,
      habitsPending: pendingHabits.length,
      maintAlerts: criticalAssets.length,
    },
  }
}

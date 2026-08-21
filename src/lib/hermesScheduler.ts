/**
 * Background Scheduler for Hermes Automatic Briefing & Debriefing.
 * Checks scheduled times every 30 seconds and dispatches directly to Telegram or VPS.
 */
import { generateFastAIBriefing, generateNightDebriefing } from './fastBriefing'
import { getHermesAdvancedConfig, sendDirectTelegramMessage, sendHermesWebhook } from './hermes'
import { db } from './db'
import type { AgendaEvent, Asset, InboxEmail, LifeLogEntry, MaintenanceRecord, PantryItem, Trip, WeeklySpending } from '@/data/types'
import type { DashboardData } from '@/features/dashboard/dashboardData'

interface ScheduleConfig {
  enabled?: boolean
  morningEnabled?: boolean
  morningTime?: string // "07:00"
  nightEnabled?: boolean
  nightTime?: string // "21:30"
  channel?: 'telegram' | 'webhook'
  telegramBotToken?: string
  telegramChatId?: string
}

const STORAGE_KEY = 'act.hermes.autoBriefing'
const LAST_DISPATCH_KEY = 'act.hermes.lastDispatch'

interface LastDispatchRecord {
  morningDate?: string // "YYYY-MM-DD"
  nightDate?: string // "YYYY-MM-DD"
}

function getLastDispatch(): LastDispatchRecord {
  try {
    const raw = localStorage.getItem(LAST_DISPATCH_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setLastDispatch(patch: Partial<LastDispatchRecord>) {
  try {
    const current = getLastDispatch()
    localStorage.setItem(LAST_DISPATCH_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {}
}

async function collectDashboardData(): Promise<DashboardData> {
  const [events, spending, pantry, assets, maintenance, lifeLog, trips, emails] = await Promise.all([
    db.get<AgendaEvent>('events').catch(() => []),
    db.get<WeeklySpending>('spending').catch(() => []),
    db.get<PantryItem>('pantry').catch(() => []),
    db.get<Asset>('assets').catch(() => []),
    db.get<MaintenanceRecord>('maintenance').catch(() => []),
    db.get<LifeLogEntry>('lifeLog').catch(() => []),
    db.get<Trip>('trips').catch(() => []),
    db.get<InboxEmail>('emails').catch(() => []),
  ])

  return {
    events,
    spending,
    pantry,
    assets,
    maintenance,
    lifeLog,
    trips,
    emails,
    maintMonths: [],
  }
}

async function dispatchMessage(text: string, channel: 'telegram' | 'webhook', config: ScheduleConfig) {
  const hermesConfig = getHermesAdvancedConfig()
  const token = config.telegramBotToken || hermesConfig.telegramBotToken
  const chat = config.telegramChatId || hermesConfig.telegramChatId

  if (channel === 'telegram' && token && chat) {
    return await sendDirectTelegramMessage(text, token, chat)
  }

  if (channel === 'webhook' && hermesConfig.vpsUrl) {
    return await sendHermesWebhook('briefing_dispatch', {
      channel: 'webhook',
      content: text,
    })
  }

  // Fallback para Telegram se tiver credenciais
  if (token && chat) {
    return await sendDirectTelegramMessage(text, token, chat)
  }

  return { ok: false, status: 400, response: 'Nenhum canal configurado' }
}

let schedulerTimer: number | null = null

export function initHermesBackgroundScheduler() {
  if (typeof window === 'undefined') return

  if (schedulerTimer) {
    clearInterval(schedulerTimer)
  }

  const checkAndRun = async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const config: ScheduleConfig = JSON.parse(raw)
      if (!config.enabled && !config.morningEnabled && !config.nightEnabled) return

      const now = new Date()
      const todayIso = now.toISOString().slice(0, 10)
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMinutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${currentHours}:${currentMinutes}`

      const lastDispatch = getLastDispatch()
      const channel = config.channel || 'telegram'

      // 1. Briefing Matinal
      if (config.morningEnabled !== false && config.morningTime) {
        if (config.morningTime === currentTime && lastDispatch.morningDate !== todayIso) {
          console.log(`[HermesScheduler] Disparando Briefing Matinal (${currentTime})...`)
          setLastDispatch({ morningDate: todayIso })

          const dashboardData = await collectDashboardData()
          const briefingText = await generateFastAIBriefing(dashboardData)

          const formattedMessage = [
            `☀️ *BOM DIA! RESUMO MATINAL — LIFE OS HUB*`,
            `📅 *Data:* ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`,
            ``,
            `🤖 *Mensagem do Hermes:*`,
            `"${briefingText}"`,
            ``,
            `🚀 _Enviado automaticamente pelo Hermes Scheduler_`,
          ].join('\n')

          await dispatchMessage(formattedMessage, channel, config)
        }
      }

      // 2. Debriefing Noturno
      if (config.nightEnabled && config.nightTime) {
        if (config.nightTime === currentTime && lastDispatch.nightDate !== todayIso) {
          console.log(`[HermesScheduler] Disparando Debriefing Noturno (${currentTime})...`)
          setLastDispatch({ nightDate: todayIso })

          const dashboardData = await collectDashboardData()
          const debriefingText = await generateNightDebriefing(dashboardData)

          const formattedMessage = [
            `🌙 *DEBRIEFING NOTURNO — LIFE OS HUB*`,
            `📅 *Data:* ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`,
            ``,
            `🤖 *Mensagem do Hermes:*`,
            `"${debriefingText}"`,
            ``,
            `🚀 _Enviado automaticamente pelo Hermes Scheduler_`,
          ].join('\n')

          await dispatchMessage(formattedMessage, channel, config)
        }
      }
    } catch (err) {
      console.warn('[HermesScheduler] Error checking schedule:', err)
    }
  }

  // Executa checagem a cada 20 segundos
  schedulerTimer = window.setInterval(checkAndRun, 20_000)
  // Executa imediatamente na inicialização
  void checkAndRun()
}

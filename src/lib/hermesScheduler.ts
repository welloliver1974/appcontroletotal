/**
 * Background Scheduler for Hermes Automatic Briefing & Debriefing.
 * Checks scheduled times every 30 seconds and dispatches directly to Telegram or VPS.
 */
import { generateFastAIBriefing, generateNightDebriefing } from './fastBriefing'
import { getHermesAdvancedConfig, sendDirectTelegramMessage, sendHermesWebhook } from './hermes'
import { db } from './db'
import type { AgendaEvent, Asset, InboxEmail, LifeLogEntry, MaintenanceRecord, PantryItem, Trip, WeeklySpending } from '@/data/types'
import type { DashboardData } from '@/features/dashboard/dashboardData'

export interface ScheduleConfig {
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

export interface LastDispatchRecord {
  morningDate?: string // "YYYY-MM-DD"
  morningTimestamp?: string
  nightDate?: string // "YYYY-MM-DD"
  nightTimestamp?: string
}

export function getHermesScheduleConfig(): ScheduleConfig {
  const hermesConfig = getHermesAdvancedConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabled: parsed.enabled ?? true,
        morningEnabled: parsed.morningEnabled ?? true,
        morningTime: parsed.morningTime || '07:00',
        nightEnabled: parsed.nightEnabled ?? true,
        nightTime: parsed.nightTime || '21:30',
        channel: parsed.channel || 'telegram',
        telegramBotToken: (parsed.telegramBotToken || hermesConfig.telegramBotToken || '').trim(),
        telegramChatId: (parsed.telegramChatId || hermesConfig.telegramChatId || '').trim(),
      }
    }
  } catch {}

  return {
    enabled: true,
    morningEnabled: true,
    morningTime: '07:00',
    nightEnabled: true,
    nightTime: '21:30',
    channel: 'telegram',
    telegramBotToken: hermesConfig.telegramBotToken || '',
    telegramChatId: hermesConfig.telegramChatId || '',
  }
}

export function getLastDispatch(): LastDispatchRecord {
  try {
    const raw = localStorage.getItem(LAST_DISPATCH_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setLastDispatch(patch: Partial<LastDispatchRecord>) {
  try {
    const current = getLastDispatch()
    localStorage.setItem(LAST_DISPATCH_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {}
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':')
  const h = Number(parts[0]) || 0
  const m = Number(parts[1]) || 0
  return h * 60 + m
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

export async function dispatchMessage(text: string, channel: 'telegram' | 'webhook', config: ScheduleConfig) {
  const hermesConfig = getHermesAdvancedConfig()
  const token = (config.telegramBotToken || hermesConfig.telegramBotToken || '').trim()
  const chat = (config.telegramChatId || hermesConfig.telegramChatId || '').trim()

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

  return { ok: false, status: 400, response: 'Nenhum canal configurado (Token ou Chat ID ausente)' }
}

export async function triggerImmediateBriefingDispatch(mode: 'morning' | 'night') {
  const config = getHermesScheduleConfig()
  const dashboardData = await collectDashboardData()
  const now = new Date()
  const dateFormatted = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
  const channel = config.channel || 'telegram'

  if (mode === 'morning') {
    const briefingText = await generateFastAIBriefing(dashboardData)
    const formattedMessage = [
      `☀️ *BOM DIA! RESUMO MATINAL — LIFE OS HUB*`,
      `📅 *Data:* ${dateFormatted}`,
      ``,
      `🤖 *Mensagem do Hermes:*`,
      `"${briefingText}"`,
      ``,
      `🚀 _Enviado pelo Hermes Scheduler_`,
    ].join('\n')

    return await dispatchMessage(formattedMessage, channel, config)
  } else {
    const debriefingText = await generateNightDebriefing(dashboardData)
    const formattedMessage = [
      `🌙 *DEBRIEFING NOTURNO — LIFE OS HUB*`,
      `📅 *Data:* ${dateFormatted}`,
      ``,
      `🤖 *Mensagem do Hermes:*`,
      `"${debriefingText}"`,
      ``,
      `🚀 _Enviado pelo Hermes Scheduler_`,
    ].join('\n')

    return await dispatchMessage(formattedMessage, channel, config)
  }
}

let schedulerTimer: number | null = null

export function initHermesBackgroundScheduler() {
  if (typeof window === 'undefined') return

  if (schedulerTimer) {
    clearInterval(schedulerTimer)
  }

  const checkAndRun = async () => {
    try {
      const config = getHermesScheduleConfig()
      if (!config.enabled && !config.morningEnabled && !config.nightEnabled) return

      const now = new Date()
      const todayLocal = getLocalDateString(now)
      const currentHours = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentTotalMinutes = currentHours * 60 + currentMinutes
      const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`

      const lastDispatch = getLastDispatch()
      const channel = config.channel || 'telegram'

      // 1. Briefing Matinal (Dispara no horário matinal definido ou na primeira abertura do app pela manhã)
      if (config.morningEnabled !== false) {
        const morningTargetMinutes = timeToMinutes(config.morningTime || '07:00')
        // Janela matinal: a partir do horário agendado até às 13:00
        const isMorningWindow = currentTotalMinutes >= morningTargetMinutes && currentTotalMinutes < 13 * 60

        if (isMorningWindow && lastDispatch.morningDate !== todayLocal) {
          console.log(`[HermesScheduler] Disparando Briefing Matinal (${currentTimeStr}, agendado: ${config.morningTime || '07:00'})...`)
          setLastDispatch({ morningDate: todayLocal, morningTimestamp: now.toISOString() })

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

          const res = await dispatchMessage(formattedMessage, channel, config)
          console.log('[HermesScheduler] Resultado do disparo matinal:', res)
        }
      }

      // 2. Debriefing Noturno (Dispara no horário noturno definido ou na primeira abertura da noite)
      if (config.nightEnabled !== false) {
        const nightTargetMinutes = timeToMinutes(config.nightTime || '21:30')
        // Janela noturna: a partir do horário noturno até às 04:00 da madrugada
        const isNightWindow = currentTotalMinutes >= nightTargetMinutes || currentTotalMinutes < 4 * 60

        if (isNightWindow && lastDispatch.nightDate !== todayLocal) {
          console.log(`[HermesScheduler] Disparando Debriefing Noturno (${currentTimeStr}, agendado: ${config.nightTime || '21:30'})...`)
          setLastDispatch({ nightDate: todayLocal, nightTimestamp: now.toISOString() })

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

          const res = await dispatchMessage(formattedMessage, channel, config)
          console.log('[HermesScheduler] Resultado do disparo noturno:', res)
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

/**
 * Hermes Agent & LLM Integration Service.
 * Supports VPS with Cloudflare, OpenRouter, Groq, NVIDIA, and Telegram.
 */
import { PROVIDERS, type ProviderId } from './llmProviders'
import { extractAndExecuteHermesActions, type ExecutedAction } from './hermesActions'
import { db } from './db'

const STORAGE_KEY = 'act.hermesAdvancedConfig'

export interface HermesAdvancedConfig {
  vpsUrl: string
  vpsSecret: string
  provider: ProviderId
  llmApiKey: string
  llmModel: string
  customBaseUrl: string
  telegramBotUrl: string
  enabled: boolean
}

export function getHermesAdvancedConfig(): HermesAdvancedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        vpsUrl: parsed.vpsUrl || import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
        vpsSecret: parsed.vpsSecret || import.meta.env.VITE_HERMES_API_KEY || '',
        provider: parsed.provider || 'groq',
        llmApiKey: parsed.llmApiKey || import.meta.env.VITE_LLM_API_KEY || '',
        llmModel: parsed.llmModel || 'llama-3.3-70b-versatile',
        customBaseUrl: parsed.customBaseUrl || '',
        telegramBotUrl: parsed.telegramBotUrl || '',
        enabled: parsed.enabled ?? true,
      }
    }
  } catch {}

  return {
    vpsUrl: import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
    vpsSecret: import.meta.env.VITE_HERMES_API_KEY || '',
    provider: 'groq',
    llmApiKey: import.meta.env.VITE_LLM_API_KEY || '',
    llmModel: 'llama-3.3-70b-versatile',
    customBaseUrl: '',
    telegramBotUrl: '',
    enabled: true,
  }
}

export function saveHermesAdvancedConfig(config: HermesAdvancedConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

// Backwards-compatible getters
export function getHermesConfig() {
  const adv = getHermesAdvancedConfig()
  return {
    webhookUrl: adv.vpsUrl,
    apiKey: adv.vpsSecret,
    aiEndpointUrl: adv.vpsUrl ? `${adv.vpsUrl.replace(/\/+$/, '')}/api/chat` : '',
    enabled: adv.enabled,
  }
}

export function saveHermesConfig(config: { webhookUrl: string; apiKey: string; aiEndpointUrl: string; enabled: boolean }) {
  const current = getHermesAdvancedConfig()
  saveHermesAdvancedConfig({
    ...current,
    vpsUrl: config.webhookUrl,
    vpsSecret: config.apiKey,
    enabled: config.enabled,
  })
}

export interface HermesWebhookResult {
  ok: boolean
  status: number
  response: string
}

/**
 * Send webhook notification to Hermes (VPS / Telegram bridge).
 */
export async function sendHermesWebhook(
  event: string,
  payload: Record<string, unknown> | unknown[] | string,
  overrideUrl?: string,
): Promise<HermesWebhookResult> {
  const config = getHermesAdvancedConfig()
  const targetUrl = overrideUrl || config.vpsUrl

  if (!targetUrl || !targetUrl.trim()) {
    return {
      ok: false,
      status: 0,
      response: 'URL do Hermes (VPS/Cloudflare) não configurada em Configurações.',
    }
  }

  const body = {
    event,
    timestamp: new Date().toISOString(),
    source: 'life-os-hub',
    payload,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.vpsSecret) {
    headers['X-Hermes-Signature'] = config.vpsSecret
    headers['Authorization'] = `Bearer ${config.vpsSecret}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: typeof payload === 'string' && event === 'raw' ? payload : JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const text = await res.text()

    return {
      ok: res.ok,
      status: res.status,
      response: text || (res.ok ? 'OK' : 'Erro no servidor'),
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      response: err instanceof Error ? err.message : 'Erro de conexão com o servidor',
    }
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface HermesChatResult {
  reply: string
  actions: ExecutedAction[]
  source: 'llm' | 'vps' | 'local'
  error?: string
}

/**
 * Builds dynamic system prompt with current user state (events, pantry, etc.)
 */
async function buildSystemPrompt(): Promise<string> {
  try {
    const [events, pantry] = await Promise.all([
      db.get<Record<string, unknown>>('events').catch(() => []),
      db.get<Record<string, unknown>>('pantry').catch(() => []),
    ])

    const todayStr = new Date().toISOString().slice(0, 10)
    const todayEvents = events.filter((e) => String(e.date || '').startsWith(todayStr))
    const lowStock = pantry.filter((p) => Number(p.quantity || 0) <= Number(p.minQuantity || 1))

    return `Você é o HERMES AGENT, o copiloto de Inteligência Artificial do Life OS Hub (AppControleTotal).
Hoje é: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.
Compromissos de hoje: ${todayEvents.length > 0 ? todayEvents.map((e) => `${e.title} às ${e.timeStart || ''}`).join(', ') : 'Nenhum'}.
Itens em baixa na despensa: ${lowStock.length > 0 ? lowStock.map((i) => `${i.name} (${i.quantity} ${i.unit || 'un'})`).join(', ') : 'Nenhum'}.

Você é proativo, inteligente, direto e prestativo.

AÇÕES AUTOMÁTICAS:
Se o usuário pedir para adicionar algo (despensa, gasto, compromisso ou nota no diário), além da sua resposta em texto amigável, você DEVE anexar ao final da mensagem a tag de ação exata no formato:
- Para Despensa: ACTION: {"action": "pantry_add", "payload": {"name": "Nome", "quantity": 1, "unit": "un", "category": "alimentos"}}
- Para Gasto: ACTION: {"action": "spending_add", "payload": {"amount": 50.0, "category": "Alimentação", "note": "Almoço"}}
- Para Agenda: ACTION: {"action": "event_add", "payload": {"title": "Título", "date": "YYYY-MM-DD", "timeStart": "HH:MM", "category": "pessoal"}}
- Para Diário: ACTION: {"action": "lifelog_add", "payload": {"title": "Título", "body": "Texto", "mood": 4}}`
  } catch {
    return 'Você é o HERMES AGENT, o copiloto de Inteligência Artificial do Life OS Hub. Seja direto, amigável e prestativo.'
  }
}

/**
 * Main chat completion method: queries selected provider (OpenRouter/Groq/NVIDIA/VPS).
 */
export async function sendHermesChat(
  history: ChatMessage[],
  userMessage: string,
): Promise<HermesChatResult> {
  const config = getHermesAdvancedConfig()
  const systemPrompt = await buildSystemPrompt()

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user', content: userMessage },
  ]

  // If VPS is configured as provider
  if (config.provider === 'vps' && config.vpsUrl) {
    try {
      const vpsChatUrl = `${config.vpsUrl.replace(/\/+$/, '')}/api/chat`
      const res = await fetch(vpsChatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.vpsSecret ? { Authorization: `Bearer ${config.vpsSecret}` } : {}),
        },
        body: JSON.stringify({
          messages: fullMessages,
          model: config.llmModel,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const rawReply = data.reply || data.choices?.[0]?.message?.content || data.answer || ''
        if (rawReply) {
          const { cleanedReply, actions } = await extractAndExecuteHermesActions(rawReply)
          return { reply: cleanedReply, actions, source: 'vps' }
        }
      }
    } catch {
      // Fallback
    }
  }

  // LLM Provider Direct (Groq, OpenRouter, NVIDIA, Custom)
  const provider = PROVIDERS[config.provider] || PROVIDERS.groq
  let endpoint = provider.chatEndpoint
  if (config.provider === 'custom' && config.customBaseUrl) {
    endpoint = `${config.customBaseUrl.replace(/\/+$/, '')}/chat/completions`
  }

  if (config.llmApiKey && endpoint) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.llmApiKey.trim()}`,
      }

      if (config.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://appcontroletotal.local'
        headers['X-Title'] = 'Life OS Hub - Hermes'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.llmModel || provider.defaultModel,
          messages: fullMessages,
          temperature: 0.7,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.ok) {
        const data = await res.json()
        const rawReply = data.choices?.[0]?.message?.content || ''
        if (rawReply) {
          const { cleanedReply, actions } = await extractAndExecuteHermesActions(rawReply)
          return { reply: cleanedReply, actions, source: 'llm' }
        }
      }
    } catch (err) {
      console.warn('[HermesChat] Provider error:', err)
    }
  }

  // Smart Local Fallback
  return generateLocalHermesResponse(userMessage)
}

/**
 * Fallback response generator when offline or without API key.
 */
async function generateLocalHermesResponse(userMessage: string): Promise<HermesChatResult> {
  const lower = userMessage.toLowerCase()

  if (lower.includes('despensa') || lower.includes('comprar') || lower.includes('leite') || lower.includes('arroz')) {
    const pantry = await db.get<Record<string, unknown>>('pantry').catch(() => [])
    const low = pantry.filter((p) => Number(p.quantity || 0) <= Number(p.minQuantity || 1))
    return {
      reply: `Hermes (Local): Você tem ${pantry.length} itens cadastrados na despensa. ${low.length > 0 ? `Atenção: ${low.map((i) => i.name).join(', ')} estão com estoque baixo.` : 'Tudo com estoque adequado.'}`,
      actions: [],
      source: 'local',
    }
  }

  if (lower.includes('agenda') || lower.includes('hoje') || lower.includes('compromisso')) {
    const events = await db.get<Record<string, unknown>>('events').catch(() => [])
    const today = new Date().toISOString().slice(0, 10)
    const todayEvents = events.filter((e) => String(e.date || '').startsWith(today))
    return {
      reply: `Hermes (Local): Você tem ${todayEvents.length} compromisso(s) agendado(s) para hoje. ${todayEvents.map((e) => `• ${e.title} (${e.timeStart || ''})`).join(' ')}`,
      actions: [],
      source: 'local',
    }
  }

  return {
    reply: `Hermes: Recebi sua mensagem: "${userMessage}". Configure sua API Key (Groq, OpenRouter ou VPS Cloudflare) em Configurações ➔ Hermes & IA para conversas profundas com LLM.`,
    actions: [],
    source: 'local',
  }
}

/**
 * Query Hermes AI for Life-Log synthesis.
 */
export async function queryHermesAI(
  question: string,
  context: string,
): Promise<{ answer: string; source: 'api' | 'local' } | null> {
  const res = await sendHermesChat([], `Contexto das anotações:\n${context}\n\nPergunta: ${question}`)
  if (res && res.reply) {
    return { answer: res.reply, source: res.source === 'local' ? 'local' : 'api' }
  }
  return null
}

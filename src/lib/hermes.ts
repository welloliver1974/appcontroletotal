/**
 * Hermes Agent & LLM Integration Service.
 * Supports VPS with Cloudflare, OpenRouter, Groq, NVIDIA, and Telegram.
 */
import { PROVIDERS, type ProviderId } from './llmProviders'
import { extractAndExecuteHermesActions, type ExecutedAction } from './hermesActions'
import { db, supabase } from './db'

const STORAGE_KEY = 'act.hermesAdvancedConfig'

export interface HermesAdvancedConfig {
  vpsUrl: string
  vpsSecret: string
  provider: ProviderId
  llmApiKey: string
  groqApiKey?: string
  llmModel: string
  visionModel?: string
  customBaseUrl: string
  telegramBotUrl: string
  telegramBotToken?: string
  telegramChatId?: string
  enabled: boolean
}

export function getDefaultVisionModel(provider: ProviderId): string {
  const p = PROVIDERS[provider]
  return p?.defaultVisionModel || 'google/gemini-2.0-flash-001'
}

export function getHermesAdvancedConfig(): HermesAdvancedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const provider = (parsed.provider || 'groq') as ProviderId
      const rawModel = parsed.llmModel || ''
      const defaultModel = provider === 'groq' ? 'openai/gpt-oss-120b' : 'meta-llama/llama-3.3-70b-instruct'
      const normalizedModel =
        !rawModel || rawModel === 'llama-3.3-70b-versatile' || rawModel === 'llama-3.1-70b-versatile'
          ? defaultModel
          : rawModel

      const rawVision = parsed.visionModel || ''
      const defaultVision = getDefaultVisionModel(provider)
      const normalizedVision =
        !rawVision || rawVision === 'qwen/qwen3.6-27b' || rawVision === 'llama-3.2-11b-vision-preview'
          ? defaultVision
          : rawVision

      return {
        vpsUrl: parsed.vpsUrl || import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
        vpsSecret: parsed.vpsSecret || import.meta.env.VITE_HERMES_API_KEY || '',
        provider,
        llmApiKey: parsed.llmApiKey || parsed.groqApiKey || import.meta.env.VITE_LLM_API_KEY || '',
        groqApiKey: parsed.groqApiKey || parsed.llmApiKey || import.meta.env.VITE_GROQ_API_KEY || '',
        llmModel: normalizedModel,
        visionModel: normalizedVision,
        customBaseUrl: parsed.customBaseUrl || '',
        telegramBotUrl: parsed.telegramBotUrl || '',
        telegramBotToken: parsed.telegramBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
        telegramChatId: parsed.telegramChatId || import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
        enabled: parsed.enabled ?? true,
      }
    }
  } catch {}

  return {
    vpsUrl: import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
    vpsSecret: import.meta.env.VITE_HERMES_API_KEY || '',
    provider: 'groq',
    llmApiKey: import.meta.env.VITE_LLM_API_KEY || '',
    groqApiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    llmModel: 'openai/gpt-oss-120b',
    visionModel: getDefaultVisionModel('groq'),
    customBaseUrl: '',
    telegramBotUrl: '',
    telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '',
    telegramChatId: import.meta.env.VITE_TELEGRAM_CHAT_ID || '',
    enabled: true,
  }
}

export function saveHermesAdvancedConfig(config: HermesAdvancedConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))

  // Persist to Supabase so config survives redeploys and syncs across devices
  if (supabase) {
    void (async () => {
      try {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            {
              id: 'hermes_config',
              data: config,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' },
          )
        if (error) {
          console.warn('[hermes] Cloud sync warning (Supabase):', error.message)
        }
      } catch (err) {
        console.warn('[hermes] Cloud sync error:', err)
      }
    })()
  }
}

/**
 * Load latest config from Supabase cloud and update local storage.
 */
export async function loadHermesConfigFromCloud(): Promise<HermesAdvancedConfig> {
  const local = getHermesAdvancedConfig()
  if (!supabase) return local

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('data')
      .eq('id', 'hermes_config')
      .maybeSingle()

    if (error || !data?.data) {
      // If cloud is empty and local device already has configured keys, automatically seed the cloud!
      if (local.llmApiKey || local.groqApiKey || local.vpsUrl) {
        saveHermesAdvancedConfig(local)
      }
      return local
    }

    const cloudData = data.data as Partial<HermesAdvancedConfig>
    const merged: HermesAdvancedConfig = {
      ...local,
      ...cloudData,
      vpsUrl: cloudData.vpsUrl || local.vpsUrl,
      vpsSecret: cloudData.vpsSecret || local.vpsSecret,
      provider: cloudData.provider || local.provider,
      llmApiKey: cloudData.llmApiKey || local.llmApiKey,
      groqApiKey: cloudData.groqApiKey || local.groqApiKey,
      llmModel: cloudData.llmModel || local.llmModel,
      visionModel: cloudData.visionModel || local.visionModel,
      customBaseUrl: cloudData.customBaseUrl || local.customBaseUrl,
      telegramBotUrl: cloudData.telegramBotUrl || local.telegramBotUrl,
      telegramBotToken: cloudData.telegramBotToken || local.telegramBotToken,
      telegramChatId: cloudData.telegramChatId || local.telegramChatId,
      enabled: cloudData.enabled ?? local.enabled,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return merged
  } catch (err) {
    console.warn('[hermes] Could not sync config from cloud:', err)
    return local
  }
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
    module: event.split('_')[0] || 'briefing',
    action: event,
    timestamp: new Date().toISOString(),
    source: 'life-os-hub',
    message: typeof payload === 'object' && payload !== null && 'content' in payload ? (payload as Record<string, unknown>).content : typeof payload === 'string' ? payload : '',
    text: typeof payload === 'object' && payload !== null && 'content' in payload ? (payload as Record<string, unknown>).content : typeof payload === 'string' ? payload : '',
    payload,
    data: payload,
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

/**
 * Send direct message to user via Telegram Bot API (No browser opening needed).
 * Hits https://api.telegram.org/bot<TOKEN>/sendMessage
 */
export async function sendDirectTelegramMessage(
  text: string,
  overrideToken?: string,
  overrideChatId?: string,
): Promise<{ ok: boolean; status: number; response: string }> {
  const config = getHermesAdvancedConfig()
  const botToken = (
    overrideToken ||
    config.telegramBotToken ||
    import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
    ''
  ).trim()
  const chatId = (
    overrideChatId ||
    config.telegramChatId ||
    import.meta.env.VITE_TELEGRAM_CHAT_ID ||
    ''
  ).trim()

  if (!botToken || !chatId) {
    return {
      ok: false,
      status: 0,
      response:
        'Token do Bot ou Chat ID não configurados. Preencha seus dados do Telegram para envio direto.',
    }
  }

  const cleanToken = botToken.startsWith('bot') ? botToken.slice(3) : botToken
  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`

  // 1. Primeira tentativa: com parse_mode Markdown
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const json = await res.json()

    if (res.ok && json.ok) {
      return {
        ok: true,
        status: 200,
        response: 'Mensagem entregue no seu Telegram com sucesso! 📱✨',
      }
    }

    // Se falhou por erro de parse do Markdown, tenta novamente como texto puro
    if (json.description && json.description.toLowerCase().includes('parse')) {
      const cleanText = text.replace(/[*_`[\]()]/g, '')
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
        }),
      })
      const retryJson = await retryRes.json()
      if (retryRes.ok && retryJson.ok) {
        return {
          ok: true,
          status: 200,
          response: 'Mensagem entregue no seu Telegram com sucesso (modo texto seguro)! 📱✨',
        }
      }
    }

    return {
      ok: false,
      status: res.status,
      response: json.description || 'Erro retornado pela API do Telegram.',
    }
  } catch (err) {
    // 2. Segunda tentativa de resiliência: Envio sem formatação em caso de falha de conexão inicial
    try {
      const cleanText = text.replace(/[*_`[\]()]/g, '')
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
        }),
      })
      const retryJson = await retryRes.json()
      if (retryRes.ok && retryJson.ok) {
        return {
          ok: true,
          status: 200,
          response: 'Mensagem entregue no seu Telegram com sucesso! 📱✨',
        }
      }
    } catch {}

    return {
      ok: false,
      status: 0,
      response: err instanceof Error ? err.message : 'Erro ao conectar à API do Telegram.',
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

import { buildFullLifeOsPromptContext } from './lifeOsContext'

/**
 * Builds dynamic system prompt with real-time user state (financials, events, pantry, vehicle, docs, etc.)
 */
async function buildSystemPrompt(): Promise<string> {
  try {
    const lifeOsContext = await buildFullLifeOsPromptContext()

    return `Você é o HERMES AGENT, o copiloto de Inteligência Artificial do Life OS Hub (AppControleTotal).
Você possui acesso em tempo real a todas as informações e dados da vida do usuário.

${lifeOsContext}

SUA POSTURA:
- Seja direto, conciso, inteligente e prestativo.
- Quando o usuário perguntar sobre gastos, datas, documentos ou despensa, use os dados acima com precisão cirúrgica.
- Se os dados mostrarem alertas críticos, avise com gentileza.

AÇÕES AUTOMÁTICAS:
Se o usuário pedir para cadastrar, adicionar ou comprar algo (despensa/compras, gasto, compromisso ou nota no diário), além da sua resposta em texto amigável, você DEVE anexar ao final da mensagem a tag de ação exata no formato:
- Para Lista de Compras / Despensa: ACTION: {"action": "pantry_add", "payload": {"name": "Coca-Cola", "quantityToBuy": 3, "unit": "un", "category": "Bebidas"}}
- Para Gasto / Despesa: ACTION: {"action": "spending_add", "payload": {"amount": 50.0, "category": "Alimentação", "note": "Almoço"}}
- Para Agenda / Compromisso: ACTION: {"action": "event_add", "payload": {"title": "Título", "date": "YYYY-MM-DD", "timeStart": "HH:MM", "category": "pessoal"}}
- Para Diário / Life-Log: ACTION: {"action": "lifelog_add", "payload": {"title": "Título", "body": "Texto", "mood": 4}}`
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
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)

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
        signal: controller.signal,
      })

      clearTimeout(timeout)

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

  // LLM Provider Setup (Groq, OpenRouter, NVIDIA, Custom)
  const provider = PROVIDERS[config.provider] || PROVIDERS.groq
  const apiKey = (config.provider === 'groq' ? (config.groqApiKey || config.llmApiKey) : config.llmApiKey || config.groqApiKey || '').trim()
  const modelToUse =
    config.provider === 'groq' && (!config.llmModel || config.llmModel.includes('llama-3.3-70b-versatile') || config.llmModel.includes('llama-3.1-70b-versatile'))
      ? 'openai/gpt-oss-120b'
      : (config.llmModel || provider.defaultModel)

  let endpoint = provider.chatEndpoint
  if (config.provider === 'custom' && config.customBaseUrl) {
    endpoint = `${config.customBaseUrl.replace(/\/+$/, '')}/chat/completions`
  }

  // 1. Direct LLM Provider Fetch (Prioridade máxima para IA Livre, Rápida e Aberta)
  if (apiKey && endpoint) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }

      if (config.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://appcontroletotal.local'
        headers['X-Title'] = 'Life OS Hub - Hermes'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: fullMessages,
          temperature: 0.7,
          max_tokens: 1000,
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
      } else {
        const errJson = await res.json().catch(() => null)
        console.warn('[HermesChat] Direct LLM returned non-ok status:', res.status, errJson)
      }
    } catch (err) {
      console.warn('[HermesChat] Direct LLM fetch error:', err)
    }
  }

  // 2. Serverless Proxy Fallback (Bypasses CORS if needed)
  if (config.provider !== 'vps' && apiKey) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 6000)

      const proxyRes = await fetch('/api/llm/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          provider: config.provider,
          apiKey,
          model: modelToUse,
          messages: fullMessages,
          customUrl: config.customBaseUrl,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (proxyRes.ok) {
        const data = await proxyRes.json()
        const rawReply = data.data?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || ''
        if (rawReply) {
          const { cleanedReply, actions } = await extractAndExecuteHermesActions(rawReply)
          return { reply: cleanedReply, actions, source: 'llm' }
        }
      }
    } catch {
      // Proxy unavailable, fallback to local
    }
  }

  // Smart Local Fallback
  return generateLocalHermesResponse(userMessage)
}

/**
 * Fallback response generator when offline or without API key.
 * Provides instant, warm and data-rich answers using local DB state.
 */
async function generateLocalHermesResponse(userMessage: string): Promise<HermesChatResult> {
  const lower = userMessage.toLowerCase().trim()

  // 1. Saudações de Noite (Boa noite / até amanhã / debriefing)
  if (
    lower.includes('boa noite') ||
    lower.includes('boa-noite') ||
    lower.includes('dormir') ||
    lower.includes('debriefing') ||
    lower.includes('ate amanha') ||
    lower.includes('até amanhã')
  ) {
    const events = await db.get<Record<string, unknown>>('events').catch(() => [])
    const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const tomorrowEvents = events.filter((e) => String(e.date || '').startsWith(tomorrowIso))

    const agendaText =
      tomorrowEvents.length > 0
        ? `Lembrete: você tem ${tomorrowEvents.length} compromisso(s) agendado(s) para amanhã (${tomorrowEvents.map((e) => e.title).join(', ')}).`
        : 'Sua agenda está livre para amanhã.'

    return {
      reply: `Boa noite! 🌙✨ Espero que seu dia tenha sido excelente e produtivo. ${agendaText} Descanse bem e recarregue as energias! Se precisar de mim amanhã, estarei por aqui a postos.`,
      actions: [],
      source: 'local',
    }
  }

  // 2. Saudações de Dia / Geral (Bom dia, Boa tarde, Olá, Oi)
  if (
    lower.includes('bom dia') ||
    lower.includes('bom-dia') ||
    lower.includes('boa tarde') ||
    lower.includes('boa-tarde') ||
    lower === 'ola' ||
    lower === 'olá' ||
    lower === 'oi' ||
    lower === 'opa' ||
    lower.startsWith('ola ') ||
    lower.startsWith('olá ') ||
    lower.startsWith('oi ') ||
    lower.includes('tudo bem') ||
    lower.includes('como vai')
  ) {
    const now = new Date()
    const hour = now.getHours()
    const greeting = hour < 12 ? 'Bom dia! ☀️' : hour < 18 ? 'Boa tarde! 🌤️' : 'Boa noite! 🌙'

    return {
      reply: `${greeting} Sou o Hermes, seu copiloto no Life OS Hub. Como posso te ajudar agora? Posso te informar seus gastos do mês, listar compromissos de hoje, conferir o estoque da despensa ou agendar um novo compromisso para você!`,
      actions: [],
      source: 'local',
    }
  }

  // 3. Despensa e Compras
  if (lower.includes('despensa') || lower.includes('comprar') || lower.includes('falta') || lower.includes('estoque') || lower.includes('mercado')) {
    const pantry = await db.get<Record<string, unknown>>('pantry').catch(() => [])
    const low = pantry.filter((p) => Number(p.quantity || p.qty || 0) <= Number(p.minQuantity || p.lowThreshold || 1))
    return {
      reply: `Hermes (Despensa): Você tem ${pantry.length} itens cadastrados no total. ${low.length > 0 ? `🛒 Em falta ou estoque baixo: ${low.map((i) => i.name).join(', ')}.` : '✅ Todos os itens estão com estoque adequado.'}`,
      actions: [],
      source: 'local',
    }
  }

  // 4. Agenda e Compromissos
  if (lower.includes('agenda') || lower.includes('hoje') || lower.includes('compromisso') || lower.includes('reunião') || lower.includes('reuniao')) {
    const events = await db.get<Record<string, unknown>>('events').catch(() => [])
    const today = new Date().toISOString().slice(0, 10)
    const todayEvents = events.filter((e) => String(e.date || '').startsWith(today))
    return {
      reply: `Hermes (Agenda): Você tem ${todayEvents.length} compromisso(s) para hoje: ${todayEvents.length > 0 ? todayEvents.map((e) => `• ${e.title} (${e.timeStart || 'dia todo'})`).join(' ') : 'Nenhum compromisso agendado para hoje. Aproveite o dia livre!' }`,
      actions: [],
      source: 'local',
    }
  }

  // 5. Finanças e Gastos
  if (lower.includes('gasto') || lower.includes('gastei') || lower.includes('finanças') || lower.includes('financas') || lower.includes('dinheiro') || lower.includes('fatura')) {
    const spending = await db.get<Record<string, unknown>>('spending_entries').catch(() => [])
    const currentMonth = new Date().toISOString().slice(0, 7)
    const monthSpending = spending.filter((s) => String(s.date || '').startsWith(currentMonth))
    const total = monthSpending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    return {
      reply: `Hermes (Finanças): Neste mês (${currentMonth}), você registrou ${monthSpending.length} despesa(s) somando R$ ${total.toFixed(2).replace('.', ',')}.`,
      actions: [],
      source: 'local',
    }
  }

  // 6. Veículo, Combustível e Manutenção
  if (lower.includes('carro') || lower.includes('moto') || lower.includes('veiculo') || lower.includes('veículo') || lower.includes('abastec') || lower.includes('combustivel') || lower.includes('combustível') || lower.includes('óleo') || lower.includes('oleo')) {
    const assets = await db.get<Record<string, unknown>>('assets').catch(() => [])
    const maint = await db.get<Record<string, unknown>>('maintenance').catch(() => [])
    const vehicles = assets.filter((a) => a.category === 'carro' || a.category === 'moto')
    return {
      reply: `Hermes (Veículos): Você possui ${vehicles.length} veículo(s) cadastrado(s) (${vehicles.map((v) => v.name).join(', ')}), com um total de ${maint.length} registros de manutenção e abastecimento.`,
      actions: [],
      source: 'local',
    }
  }

  return {
    reply: `Hermes: Entendido! Recebi sua mensagem: "${userMessage}".\n\n💡 **Dica:** Para habilitar conversas profundas com inteligência artificial generativa em tempo real, você pode configurar uma chave de API gratuita (da Groq ou OpenRouter) no menu **Configurações ➔ Hermes & IA**.`,
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

/**
 * High-fidelity Audio Transcription via Groq Whisper API.
 * Rapid (<400ms), handles accents, punctuation, background noise and long speech.
 */
export async function transcribeAudioWithWhisper(audioBlob: Blob): Promise<string | null> {
  const config = getHermesAdvancedConfig()
  const apiKey =
    config.groqApiKey ||
    (config.provider === 'groq' ? config.llmApiKey : '') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    import.meta.env.VITE_LLM_API_KEY
  if (!apiKey) return null

  try {
    const formData = new FormData()
    const mime = audioBlob.type || 'audio/webm'
    const ext = mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : 'webm'
    formData.append('file', audioBlob, `audio.${ext}`)
    formData.append('model', 'whisper-large-v3-turbo')
    formData.append('language', 'pt')
    formData.append('response_format', 'json')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      console.warn('[Whisper] Groq API returned status:', res.status)
      return null
    }

    const data = (await res.json()) as { text?: string }
    return data.text ? data.text.trim() : null
  } catch (err) {
    console.warn('[Whisper] Audio transcription error:', err)
    return null
  }
}

export interface AnalyzedReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface AnalyzedReceipt {
  establishment: string
  date: string
  category: 'alimentacao' | 'transporte' | 'moradia' | 'saude' | 'lazer' | 'educacao' | 'outros'
  totalAmount: number
  paymentMethod: string
  items: AnalyzedReceiptItem[]
}

/**
 * Analyze receipt or invoice image using Vision LLM (Groq Llama 3.2 Vision or OpenRouter).
 */
export async function analyzeReceiptImage(base64Image: string): Promise<AnalyzedReceipt | null> {
  const config = getHermesAdvancedConfig()
  const apiKey =
    config.groqApiKey ||
    config.llmApiKey ||
    import.meta.env.VITE_GROQ_API_KEY ||
    import.meta.env.VITE_LLM_API_KEY

  if (!apiKey) {
    console.warn('[ReceiptOCR] No API key available for Vision OCR.')
    return null
  }

  const prompt = `Analise a imagem deste cupom fiscal ou recibo.
Extraia com precisão os dados da compra e retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
  "establishment": "Nome do estabelecimento ou loja",
  "date": "YYYY-MM-DD",
  "category": "alimentacao" | "transporte" | "moradia" | "saude" | "lazer" | "educacao" | "outros",
  "totalAmount": 0.00,
  "paymentMethod": "Cartão de Crédito" | "Cartão de Débito" | "PIX" | "Dinheiro" | "Outro",
  "items": [
    {
      "name": "Nome do item",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00
    }
  ]
}

Se a data não estiver legível, use a data atual ${new Date().toISOString().slice(0, 10)}.
Responda APENAS o JSON puro, sem markdown adicional.`

  try {
    const isGroq = config.provider === 'groq' || !config.llmApiKey.startsWith('sk-or-')
    const endpoint = isGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions'
    const model = isGroq ? 'qwen/qwen3.6-27b' : 'google/gemini-2.0-flash-001'

    const imageUri = base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUri } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      console.warn('[ReceiptOCR] Vision API returned error status:', res.status)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) return null

    const parsed = JSON.parse(match[0]) as AnalyzedReceipt
    return {
      establishment: parsed.establishment || 'Estabelecimento',
      date: parsed.date || new Date().toISOString().slice(0, 10),
      category: parsed.category || 'alimentacao',
      totalAmount: Number(parsed.totalAmount) || 0,
      paymentMethod: parsed.paymentMethod || 'Cartão de Crédito',
      items: Array.isArray(parsed.items)
        ? parsed.items.map((i) => ({
            name: String(i.name || 'Item'),
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            totalPrice: Number(i.totalPrice) || 0,
          }))
        : [],
    }
  } catch (err) {
    console.error('[ReceiptOCR] Error analyzing receipt:', err)
    return null
  }
}


/**
 * Hermes Agent Integration Service.
 * Manages webhook dispatches, API credentials, and AI queries.
 */

const STORAGE_KEY = 'act.hermesConfig'

export interface HermesConfig {
  webhookUrl: string
  apiKey: string
  aiEndpointUrl: string
  enabled: boolean
}

export function getHermesConfig(): HermesConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        webhookUrl: parsed.webhookUrl || import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
        apiKey: parsed.apiKey || import.meta.env.VITE_HERMES_API_KEY || '',
        aiEndpointUrl: parsed.aiEndpointUrl || import.meta.env.VITE_HERMES_AI_URL || '',
        enabled: parsed.enabled ?? true,
      }
    }
  } catch {}

  return {
    webhookUrl: import.meta.env.VITE_HERMES_WEBHOOK_URL || '',
    apiKey: import.meta.env.VITE_HERMES_API_KEY || '',
    aiEndpointUrl: import.meta.env.VITE_HERMES_AI_URL || '',
    enabled: true,
  }
}

export function saveHermesConfig(config: HermesConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export interface HermesWebhookPayload {
  event: string
  timestamp: string
  source: 'life-os-hub'
  payload: Record<string, unknown> | unknown[] | string
}

export interface HermesWebhookResult {
  ok: boolean
  status: number
  response: string
}

/**
 * Send a webhook payload to Hermes Agent.
 */
export async function sendHermesWebhook(
  event: string,
  payload: Record<string, unknown> | unknown[] | string,
  overrideUrl?: string,
): Promise<HermesWebhookResult> {
  const config = getHermesConfig()
  const targetUrl = overrideUrl || config.webhookUrl

  if (!targetUrl || !targetUrl.trim()) {
    return {
      ok: false,
      status: 0,
      response: 'URL do Hermes Webhook não configurada.',
    }
  }

  const body: HermesWebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    source: 'life-os-hub',
    payload,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.apiKey) {
    headers['X-Hermes-Signature'] = config.apiKey
    headers['Authorization'] = `Bearer ${config.apiKey}`
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
 * Query Hermes AI / LLM endpoint if configured, with error handling.
 */
export async function queryHermesAI(
  question: string,
  context: string,
): Promise<{ answer: string; source: 'api' | 'local' } | null> {
  const config = getHermesConfig()
  if (!config.aiEndpointUrl || !config.aiEndpointUrl.trim()) {
    return null
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const res = await fetch(config.aiEndpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, context }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    if (data && typeof data.answer === 'string') {
      return { answer: data.answer, source: 'api' }
    }
  } catch {
    // Network or API failure -> gracefully fall back to local
  }

  return null
}

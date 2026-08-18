/**
 * LLM Providers integration: OpenRouter, Groq, NVIDIA, VPS and Custom OpenAI-compatible APIs.
 */

export type ProviderId = 'vps' | 'openrouter' | 'groq' | 'nvidia' | 'custom'

export interface ProviderConfig {
  id: ProviderId
  name: string
  defaultBaseUrl: string
  modelsEndpoint: string
  chatEndpoint: string
  docsUrl: string
  defaultModel: string
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  vps: {
    id: 'vps',
    name: 'Sua VPS Hermes (Cloudflare)',
    defaultBaseUrl: '',
    modelsEndpoint: '/api/models',
    chatEndpoint: '/api/chat',
    docsUrl: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/',
    defaultModel: 'hermes-vps-model',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    docsUrl: 'https://openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
  },
  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Rápido)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    docsUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA AI Foundation',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    modelsEndpoint: 'https://integrate.api.nvidia.com/v1/models',
    chatEndpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    docsUrl: 'https://build.nvidia.com',
    defaultModel: 'meta/llama-3.1-70b-instruct',
  },
  custom: {
    id: 'custom',
    name: 'Endpoint Customizado (OpenAI-compatible)',
    defaultBaseUrl: '',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    docsUrl: '',
    defaultModel: 'default-model',
  },
}

export interface ModelItem {
  id: string
  name: string
  description?: string
  contextLength?: number
}

/**
 * Fetches available models from the selected provider using the user's API Key.
 */
export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  customBaseUrl?: string,
): Promise<{ ok: boolean; models: ModelItem[]; error?: string }> {
  const provider = PROVIDERS[providerId]
  let url = ''

  if (providerId === 'custom' || providerId === 'vps') {
    const base = (customBaseUrl || '').replace(/\/+$/, '')
    if (!base) {
      return { ok: false, models: [], error: 'URL base não informada.' }
    }
    url = `${base}${provider.modelsEndpoint}`
  } else {
    url = provider.modelsEndpoint
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`
    if (providerId === 'openrouter') {
      headers['HTTP-Referer'] = 'https://appcontroletotal.local'
      headers['X-Title'] = 'Life OS Hub - Hermes Agent'
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 9000)

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      return {
        ok: false,
        models: [],
        error: `Erro HTTP ${res.status}: ${errText.slice(0, 150) || 'Falha ao buscar modelos'}`,
      }
    }

    const json = await res.json()
    const rawList = Array.isArray(json) ? json : json.data || json.models || []

    const models: ModelItem[] = rawList
      .map((item: unknown) => {
        if (typeof item === 'string') return { id: item, name: item }
        if (item && typeof item === 'object') {
          const m = item as Record<string, unknown>
          return {
            id: String(m.id || m.name || ''),
            name: String(m.name || m.id || ''),
            description: typeof m.description === 'string' ? m.description : undefined,
            contextLength: typeof m.context_length === 'number' ? m.context_length : undefined,
          }
        }
        return null
      })
      .filter((m: ModelItem | null): m is ModelItem => Boolean(m && m.id))
      .sort((a: ModelItem, b: ModelItem) => a.id.localeCompare(b.id))

    return { ok: true, models }
  } catch (err) {
    return {
      ok: false,
      models: [],
      error: err instanceof Error ? err.message : 'Falha na conexão com a API',
    }
  }
}

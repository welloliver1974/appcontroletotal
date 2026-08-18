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
    defaultModel: 'meta/llama-3.3-70b-instruct',
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

export const DEFAULT_NVIDIA_MODELS: ModelItem[] = [
  { id: 'meta/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct (Recomendado)', description: 'Alta velocidade e precisão' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Meta Llama 3.1 70B Instruct', description: 'Versátil e robusto' },
  { id: 'meta/llama-3.1-8b-instruct', name: 'Meta Llama 3.1 8B Instruct', description: 'Ultra-rápido e leve' },
  { id: 'meta/llama-3.1-405b-instruct', name: 'Meta Llama 3.1 405B Instruct', description: 'Máxima capacidade de raciocínio' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', description: 'Raciocínio analítico avançado' },
  { id: 'deepseek-ai/deepseek-v3', name: 'DeepSeek V3', description: 'Alta performance geral' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA Llama 3.1 Nemotron 70B', description: 'Otimizado pela NVIDIA' },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large 2407', description: 'Excelente para tarefas complexas' },
  { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', description: 'Alta capacidade multilíngue' },
  { id: 'microsoft/phi-3.5-moe-instruct', name: 'Microsoft Phi 3.5 MoE', description: 'Mixture of Experts leve' },
]

export const DEFAULT_GROQ_MODELS: ModelItem[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Recomendado)' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B 32k' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
]

function parseModelList(json: unknown): ModelItem[] {
  if (!json || typeof json !== 'object') return []
  const obj = json as Record<string, unknown>
  const rawList = Array.isArray(json) ? json : (obj.data || obj.models || [])

  if (!Array.isArray(rawList)) return []

  return rawList
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
}

/**
 * Fetches available models from the selected provider using the user's API Key.
 * Uses a serverless proxy to bypass browser CORS restrictions with graceful fallbacks.
 */
export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  customBaseUrl?: string,
): Promise<{ ok: boolean; models: ModelItem[]; error?: string }> {
  // 1. Try Serverless Proxy first (handles CORS flawlessly)
  if (providerId !== 'vps') {
    try {
      const proxyRes = await fetch('/api/llm/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'models',
          provider: providerId,
          apiKey: apiKey.trim(),
          customUrl: customBaseUrl,
        }),
      })

      if (proxyRes.ok) {
        const json = await proxyRes.json()
        const parsed = parseModelList(json.data || json)
        if (parsed.length > 0) {
          return { ok: true, models: parsed }
        }
      }
    } catch {
      // Proxy unavailable, continue to direct fetch
    }
  }

  // 2. Try Direct Fetch
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
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      // Return curated list on error for NVIDIA / Groq
      if (providerId === 'nvidia') {
        return { ok: true, models: DEFAULT_NVIDIA_MODELS }
      }
      if (providerId === 'groq') {
        return { ok: true, models: DEFAULT_GROQ_MODELS }
      }

      const errText = await res.text().catch(() => '')
      return {
        ok: false,
        models: [],
        error: `Erro HTTP ${res.status}: ${errText.slice(0, 150) || 'Falha ao buscar modelos'}`,
      }
    }

    const json = await res.json()
    const models = parseModelList(json)

    if (models.length > 0) {
      return { ok: true, models }
    }

    if (providerId === 'nvidia') return { ok: true, models: DEFAULT_NVIDIA_MODELS }
    if (providerId === 'groq') return { ok: true, models: DEFAULT_GROQ_MODELS }

    return { ok: true, models: [] }
  } catch {
    // Graceful fallback on CORS / network error
    if (providerId === 'nvidia') {
      return { ok: true, models: DEFAULT_NVIDIA_MODELS }
    }
    if (providerId === 'groq') {
      return { ok: true, models: DEFAULT_GROQ_MODELS }
    }

    return {
      ok: false,
      models: [],
      error: 'Falha na conexão com a API. Verifique a chave de API.',
    }
  }
}

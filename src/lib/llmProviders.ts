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
  defaultVisionModel: string
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
    defaultVisionModel: 'hermes-vps-vision',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    docsUrl: 'https://openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    defaultVisionModel: 'google/gemini-2.0-flash-001',
  },
  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Rápido)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    docsUrl: 'https://console.groq.com/keys',
    defaultModel: 'openai/gpt-oss-120b',
    defaultVisionModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA AI Foundation',
    defaultBaseUrl: 'https://integrate.api.nvidia.com/v1',
    modelsEndpoint: 'https://integrate.api.nvidia.com/v1/models',
    chatEndpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    docsUrl: 'https://build.nvidia.com',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    defaultVisionModel: 'meta/llama-3.2-11b-vision-instruct',
  },
  custom: {
    id: 'custom',
    name: 'Endpoint Customizado (OpenAI-compatible)',
    defaultBaseUrl: '',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    docsUrl: '',
    defaultModel: 'default-model',
    defaultVisionModel: 'default-vision-model',
  },
}

export interface ModelItem {
  id: string
  name: string
  description?: string
  contextLength?: number
  isVision?: boolean
}

/**
 * Checks if a model ID or name represents a multimodal / vision model capable of image OCR.
 */
export function isVisionModel(modelId: string): boolean {
  if (!modelId || typeof modelId !== 'string') return false
  const lower = modelId.toLowerCase()
  return (
    lower.includes('vision') ||
    lower.includes('gemini') ||
    lower.includes('vl') ||
    lower.includes('scout') ||
    lower.includes('gpt-4o') ||
    lower.includes('pixtral') ||
    lower.includes('claude-3') ||
    lower.includes('llama-3.2-11b') ||
    lower.includes('llama-3.2-90b') ||
    lower.includes('qwen-vl') ||
    lower.includes('internvl') ||
    lower.includes('omni') ||
    lower.includes('multimodal')
  )
}

export const DEFAULT_NVIDIA_MODELS: ModelItem[] = [
  { id: 'meta/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct (Recomendado)', description: 'Alta velocidade e precisão' },
  { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Meta Llama 3.2 11B Vision (Scanner/OCR)', description: 'Capacidade de visão e leitura de notas', isVision: true },
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
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (Recomendado - Máxima Inteligência)', description: 'Raciocínio livre de alta capacidade' },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (Ultra-Rápido)', description: 'Velocidade instantânea' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout (Visão & Imagens)', description: 'Suporte multimodal para leitura de cupons', isVision: true },
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision', description: 'Visão computacional e OCR', isVision: true },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision', description: 'Visão de alta resolução', isVision: true },
  { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B', description: 'Excelente em português' },
  { id: 'groq/compound', name: 'Groq Compound', description: 'Múltiplos agentes combinados' },
  { id: 'groq/compound-mini', name: 'Groq Compound Mini', description: 'Versão compacta' },
]

export const DEFAULT_OPENROUTER_MODELS: ModelItem[] = [
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct (Recomendado)', description: 'Chat rápido e inteligente' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Recomendado p/ OCR)', description: 'Visão instantânea e precisa', isVision: true },
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash Grátis', description: 'Visão e leitura grátis', isVision: true },
  { id: 'google/gemini-flash-1.5-8b', name: 'Gemini Flash 1.5 8B', description: 'Ultra-econômico com visão', isVision: true },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B Vision Grátis', description: 'OCR de cupons e documentos', isVision: true },
  { id: 'qwen/qwen-2.5-vl-72b-instruct:free', name: 'Qwen 2.5 VL 72B Grátis', description: 'Multimodal de alta capacidade', isVision: true },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Raciocínio analítico avançado' },
]

function parseModelList(json: unknown): ModelItem[] {
  if (!json || typeof json !== 'object') return []
  const obj = json as Record<string, unknown>
  const rawList = Array.isArray(json) ? json : (obj.data || obj.models || [])

  if (!Array.isArray(rawList)) return []

  const items: ModelItem[] = []

  for (const item of rawList) {
    if (typeof item === 'string' && item.trim()) {
      items.push({ id: item.trim(), name: item.trim(), isVision: isVisionModel(item) })
    } else if (item && typeof item === 'object') {
      const m = item as Record<string, unknown>
      const id = String(m.id || m.name || '').trim()
      const name = String(m.name || m.id || '').trim()
      if (id) {
        items.push({
          id,
          name: name || id,
          description: typeof m.description === 'string' ? m.description : undefined,
          contextLength: typeof m.context_length === 'number' ? m.context_length : undefined,
          isVision: isVisionModel(id) || isVisionModel(name),
        })
      }
    }
  }

  return items.sort((a, b) => a.id.localeCompare(b.id))
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
      // Return curated list on error for NVIDIA / Groq / OpenRouter
      if (providerId === 'nvidia') {
        return { ok: true, models: DEFAULT_NVIDIA_MODELS }
      }
      if (providerId === 'groq') {
        return { ok: true, models: DEFAULT_GROQ_MODELS }
      }
      if (providerId === 'openrouter') {
        return { ok: true, models: DEFAULT_OPENROUTER_MODELS }
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
    if (providerId === 'openrouter') return { ok: true, models: DEFAULT_OPENROUTER_MODELS }

    return { ok: true, models: [] }
  } catch {
    // Graceful fallback on CORS / network error
    if (providerId === 'nvidia') {
      return { ok: true, models: DEFAULT_NVIDIA_MODELS }
    }
    if (providerId === 'groq') {
      return { ok: true, models: DEFAULT_GROQ_MODELS }
    }
    if (providerId === 'openrouter') {
      return { ok: true, models: DEFAULT_OPENROUTER_MODELS }
    }

    return {
      ok: false,
      models: [],
      error: 'Falha na conexão com a API. Verifique a chave de API.',
    }
  }
}

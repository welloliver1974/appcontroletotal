// src/lib/llmProviders.ts

export type ProviderId = 'groq' | 'openrouter' | 'nvidia' | 'custom' | 'vps'

export interface ProviderConfig {
  id: ProviderId
  name: string
  defaultBaseUrl: string
  modelsEndpoint: string
  chatEndpoint: string
  docsUrl: string
  defaultModel: string
  defaultVisionModel: string
  supportsVision: boolean
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  groq: {
    id: 'groq',
    name: 'Groq (Ultra-Rápido)',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: 'https://api.groq.com/openai/v1/models',
    chatEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    docsUrl: 'https://console.groq.com/keys',
    defaultModel: 'openai/gpt-oss-120b',
    defaultVisionModel: '',
    supportsVision: false,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    chatEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    docsUrl: 'https://openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    defaultVisionModel: 'google/gemini-2.0-flash',
    supportsVision: true,
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
    supportsVision: true,
  },
  vps: {
    id: 'vps',
    name: 'Sua VPS Hermes (Cloudflare)',
    defaultBaseUrl: '',
    modelsEndpoint: '/api/models',
    chatEndpoint: '/api/chat',
    docsUrl: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/',
    defaultModel: 'hermes-vps-model',
    defaultVisionModel: 'hermes-vps-vision',
    supportsVision: true,
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
    supportsVision: true,
  },
}

export interface ModelItem {
  id: string
  name: string
  description?: string
  contextLength?: number
  isVision?: boolean
}

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
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (Recomendado - Chat Inteligente)', description: 'Raciocínio livre de alta capacidade' },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (Ultra-Rápido)', description: 'Velocidade instantânea' },
  { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B', description: 'Excelente em português' },
  { id: 'groq/compound', name: 'Groq Compound', description: 'Múltiplos agentes combinados' },
  { id: 'groq/compound-mini', name: 'Groq Compound Mini', description: 'Versão compacta' },
]

export const DEFAULT_OPENROUTER_MODELS: ModelItem[] = [
  {
    id: 'google/gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Recomendado OCR)',
    description: 'Leitura multimodal e OCR de cupons com altíssima velocidade e precisão',
    isVision: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Modelo de visão avançado para leitura de notas',
    isVision: true,
  },
  {
    id: 'meta-llama/llama-3.2-11b-vision-instruct',
    name: 'Meta Llama 3.2 11B Vision',
    description: 'Modelo multimodal da Meta no OpenRouter',
    isVision: true,
  },
  {
    id: 'deepseek/deepseek-v4-flash-vision-exp',
    name: 'DeepSeek V4 Flash Vision',
    description: 'Modelo de visão ultrarrápido',
    isVision: true,
  },
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Router',
    description: 'Roteador automático de modelos gratuitos',
    isVision: true,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Meta Llama 3.3 70B Instruct (Chat)',
    description: 'Excelente para conversação de texto',
  },
]

function parseModelList(raw: any): ModelItem[] {
  let list: any[] = []
  if (Array.isArray(raw)) list = raw
  else if (Array.isArray(raw?.data)) list = raw.data
  else if (Array.isArray(raw?.models)) list = raw.models
  else return []

  const result: ModelItem[] = []
  for (const item of list) {
    const id = typeof item === 'string' ? item : item.id || item.name
    if (id && typeof id === 'string') {
      result.push({
        id,
        name: typeof item === 'object' && item.name ? item.name : id,
        description: typeof item === 'object' ? item.description : undefined,
        contextLength: typeof item === 'object' ? item.context_length : undefined,
        isVision: isVisionModel(id),
      })
    }
  }
  return result
}

export async function fetchProviderModels(
  providerId: ProviderId,
  apiKey: string,
  customBaseUrl?: string,
): Promise<{ ok: boolean; models: ModelItem[]; error?: string }> {
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
    } catch {}
  }

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
      if (providerId === 'nvidia') return { ok: true, models: DEFAULT_NVIDIA_MODELS }
      if (providerId === 'groq') return { ok: true, models: DEFAULT_GROQ_MODELS }
      if (providerId === 'openrouter') return { ok: true, models: DEFAULT_OPENROUTER_MODELS }

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
    if (providerId === 'nvidia') return { ok: true, models: DEFAULT_NVIDIA_MODELS }
    if (providerId === 'groq') return { ok: true, models: DEFAULT_GROQ_MODELS }
    if (providerId === 'openrouter') return { ok: true, models: DEFAULT_OPENROUTER_MODELS }

    return {
      ok: false,
      models: [],
      error: 'Falha na conexão com a API. Verifique a chave de API.',
    }
  }
}

export const CHAT_PROVIDERS: ProviderId[] = ['groq', 'openrouter', 'nvidia', 'vps']
export const VISION_PROVIDERS: ProviderId[] = ['openrouter', 'nvidia', 'custom', 'vps']

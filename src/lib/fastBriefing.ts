/**
 * Ultra-Fast Hermes Morning Briefing Generator.
 * Directly queries Groq (Llama 3.1 8B Instant / 3.3 70B) or OpenRouter in < 400ms,
 * with zero redundant DB queries (uses in-memory DashboardData) and instant smart heuristic fallback.
 */
import { getHermesAdvancedConfig } from './hermes'
import type { DashboardData } from '@/features/dashboard/dashboardData'
import { calculateVehiclePredictiveStats } from '@/features/manutencao/predictiveMaint'

export async function generateFastAIBriefing(data: DashboardData): Promise<string> {
  const config = getHermesAdvancedConfig()

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  const todayEvents = (data.events || []).filter((e) => e.date === todayStr)
  const lowStock = (data.pantry || []).filter((p) => p.qty <= p.lowThreshold)
  const urgentAssets = (data.assets || []).filter(
    (a) => typeof a.lifePct === 'number' && a.lifePct > 0 && a.lifePct <= 20,
  )

  const vehicleAlerts = (data.assets || [])
    .filter((a) => a.category === 'carro')
    .map((a) => ({ asset: a, stats: calculateVehiclePredictiveStats(a.id, data.maintenance || []) }))
    .filter((v) => v.stats && (v.stats.urgency === 'critical' || v.stats.urgency === 'warning'))

  // 1. Identify API Key and Best Fast Endpoint
  const groqKey =
    config.groqApiKey ||
    (config.provider === 'groq' ? config.llmApiKey : '') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    ''

  const genericKey = config.llmApiKey || import.meta.env.VITE_LLM_API_KEY || ''
  const apiKey = groqKey || genericKey

  // If user has Groq or OpenRouter/NVIDIA key, attempt ultra-fast LLM call (< 400ms)
  if (apiKey) {
    try {
      const isGroq = Boolean(groqKey || config.provider === 'groq')
      const isOpenRouter = config.provider === 'openrouter' || apiKey.startsWith('sk-or-')

      let endpoint = 'https://api.groq.com/openai/v1/chat/completions'
      let model = 'llama-3.1-8b-instant' // Ultra-rapid generation (< 300ms)

      if (isGroq) {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions'
        // Use fast instant model or configured Groq model
        model = config.llmModel.includes('llama-3') ? config.llmModel : 'llama-3.1-8b-instant'
      } else if (isOpenRouter) {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions'
        model = config.llmModel || 'meta-llama/llama-3.3-70b-instruct'
      } else if (config.provider === 'nvidia') {
        endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions'
        model = config.llmModel || 'meta/llama-3.3-70b-instruct'
      } else if (config.provider === 'custom' && config.customBaseUrl) {
        endpoint = `${config.customBaseUrl.replace(/\/+$/, '')}/chat/completions`
        model = config.llmModel || 'default-model'
      }

      const eventsText =
        todayEvents.length > 0
          ? todayEvents.map((e) => `${e.title}${e.timeStart ? ` às ${e.timeStart}` : ''}`).join(', ')
          : 'agenda livre'

      const pantryText =
        lowStock.length > 0
          ? `${lowStock.length} itens acabando (${lowStock.slice(0, 2).map((i) => i.name).join(', ')})`
          : 'despensa em dia'

      const alertsText =
        vehicleAlerts.length > 0 && vehicleAlerts[0].stats
          ? `Alerta carro: ${vehicleAlerts[0].stats.formattedSummary}`
          : urgentAssets.length > 0
            ? `Manutenção: ${urgentAssets[0].name} com vida útil baixa`
            : 'ativos todos revisados'

      const systemPrompt =
        'Você é o Hermes, assistente executivo e motivador do Life OS. Escreva um briefing matinal em português em no máximo 2 frases curtas, elegantes e objetivas com foco em ação e produtividade. Não use introduções genéricas.'

      const userPrompt = `Contexto de hoje (${now.toLocaleDateString('pt-BR')}):
- Compromissos: ${eventsText}
- Despensa: ${pantryText}
- Alertas: ${alertsText}

Gere o briefing matinal executivo (2 frases curtas):`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000) // Fast 4s timeout

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      }

      if (isOpenRouter) {
        headers['HTTP-Referer'] = 'https://appcontroletotal.local'
        headers['X-Title'] = 'Life OS Hub - Hermes Briefing'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 120,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        const text = json.choices?.[0]?.message?.content?.trim()
        if (text) {
          // Remove quotes if LLM wraps in quotation marks
          return text.replace(/^["']|["']$/g, '')
        }
      }
    } catch (err) {
      console.warn('[FastBriefing] LLM request fallback:', err)
    }
  }

  // 2. Instant Smart Dynamic Briefing (Zero Latency Heuristic Fallback)
  return buildSmartDynamicBriefing(todayEvents, lowStock, vehicleAlerts, urgentAssets)
}

function buildSmartDynamicBriefing(
  todayEvents: any[],
  lowStock: any[],
  vehicleAlerts: any[],
  urgentAssets: any[],
): string {
  const parts: string[] = []

  if (todayEvents.length > 0) {
    parts.push(
      `Você tem ${todayEvents.length} compromisso(s) hoje, com foco principal em "${todayEvents[0].title}"${todayEvents[0].timeStart ? ` às ${todayEvents[0].timeStart}` : ''}`,
    )
  } else {
    parts.push('Sua agenda está limpa de compromissos para hoje, dia perfeito para foco em projetos')
  }

  if (lowStock.length > 0) {
    parts.push(
      `Lembre-se de repor ${lowStock.length} item(ns) na despensa (${lowStock.slice(0, 2).map((i) => i.name).join(', ')})`,
    )
  }

  if (vehicleAlerts.length > 0 && vehicleAlerts[0].stats) {
    parts.push(`Atenção ao veículo: ${vehicleAlerts[0].stats.formattedSummary}`)
  } else if (urgentAssets.length > 0) {
    parts.push(`Atenção: ${urgentAssets[0].name} com vida útil baixa`)
  } else if (lowStock.length === 0) {
    parts.push('Todos os seus ativos, despensa e manutenções estão 100% em dia!')
  }

  return parts.join('. ') + '.'
}

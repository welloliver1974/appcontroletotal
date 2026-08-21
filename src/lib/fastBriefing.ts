/**
 * Refined Hermes Morning Briefing Generator.
 * Considers a 2-day agenda horizon (Today + Tomorrow), monthly finances,
 * pantry items, and verified maintenance alerts (no phantom vehicle alerts).
 */
import { getHermesAdvancedConfig } from './hermes'
import type { DashboardData } from '@/features/dashboard/dashboardData'
import { calculateVehiclePredictiveStats } from '@/features/manutencao/predictiveMaint'
import { isValidIsoDate } from './utils'
import { fetchCurrentWeather } from './weatherService'

export async function generateFastAIBriefing(data: DashboardData): Promise<string> {
  const config = getHermesAdvancedConfig()

  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  // Clima em tempo real (Open-Meteo)
  const weather = await fetchCurrentWeather().catch(() => null)

  // 1. Agenda de 2 dias (Hoje e Amanhã)
  const todayEvents = (data.events || [])
    .filter((e) => e.date === todayIso)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  const tomorrowEvents = (data.events || [])
    .filter((e) => e.date === tomorrowIso)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  // 2. Despensa
  const lowStock = (data.pantry || []).filter((p) => Number(p.qty || 0) <= Number(p.lowThreshold || 1))

  // 3. Manutenção real (apenas se data explícita estiver cadastrada e for próxima)
  const urgentAssets = (data.assets || []).filter((a) => {
    if (!a.nextMaintenance || !isValidIsoDate(a.nextMaintenance)) return false
    return a.nextMaintenance <= tomorrowIso
  })

  // 4. Veículos reais (somente se houver dados suficientes de odômetro)
  const vehicleAlerts = (data.assets || [])
    .filter((a) => a.category === 'carro' || a.category === 'moto')
    .map((a) => ({ asset: a, stats: calculateVehiclePredictiveStats(a.id, data.maintenance || []) }))
    .filter((v) => v.stats && v.stats.hasEnoughData && (v.stats.urgency === 'critical' || v.stats.urgency === 'warning'))

  // 5. Finanças do mês (somatório das categorias semanais)
  const totalMonthSpent = (data.spending || []).reduce(
    (acc, s) =>
      acc +
      (Number(s.despensa) || 0) +
      (Number(s.manutencao) || 0) +
      (Number(s.viagens) || 0),
    0,
  )

  // Identifica chave de API para geração com IA
  const groqKey =
    config.groqApiKey ||
    (config.provider === 'groq' ? config.llmApiKey : '') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    ''

  const genericKey = config.llmApiKey || import.meta.env.VITE_LLM_API_KEY || ''
  const apiKey = groqKey || genericKey

  if (apiKey) {
    try {
      const isGroq = Boolean(groqKey || config.provider === 'groq')
      const isOpenRouter = config.provider === 'openrouter' || apiKey.startsWith('sk-or-')

      let endpoint = 'https://api.groq.com/openai/v1/chat/completions'
      let model = 'llama-3.3-70b-versatile'

      if (isGroq) {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions'
        model = config.llmModel || 'llama-3.3-70b-versatile'
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

      const todayText =
        todayEvents.length > 0
          ? todayEvents.map((e) => `${e.title}${e.timeStart ? ` às ${e.timeStart}` : ''}`).join(', ')
          : 'Nenhum compromisso marcado para hoje'

      const tomorrowText =
        tomorrowEvents.length > 0
          ? tomorrowEvents.map((e) => `${e.title}${e.timeStart ? ` às ${e.timeStart}` : ''}`).join(', ')
          : 'Agenda livre amanhã'

      const pantryText =
        lowStock.length > 0
          ? `${lowStock.length} itens acabando (${lowStock.slice(0, 3).map((i) => i.name).join(', ')})`
          : 'Despensa 100% em dia'

      const maintenanceText =
        vehicleAlerts.length > 0 && vehicleAlerts[0].stats
          ? `Alerta veicular: ${vehicleAlerts[0].stats.formattedSummary}`
          : urgentAssets.length > 0
            ? `Revisão pendente: ${urgentAssets[0].name}`
            : 'Todos os ativos e veículos revisados'

      const weatherText = weather
        ? `${weather.icon} ${weather.description}, temperatura atual ${weather.temperature}°C (máx ${weather.tempMax}°C / mín ${weather.tempMin}°C)`
        : 'Clima estável'

      const systemPrompt = `Você é o HERMES, o copiloto executivo e pessoal do Life OS Hub.
Escreva um briefing matinal em português brasileiro, fluído, inteligente, encorpador e motivador (com cerca de 3 a 4 frases bem articuladas).
DIRETRIZES:
1. Comece com uma saudação executiva calorosa, mencione brevemente o clima do dia (${weatherText}) e destaque os compromissos de HOJE.
2. Dê uma visão prévia dos compromissos de AMANHÃ para que o usuário se planeje com antecedência.
3. Se houver itens em falta na despensa ou alerta real de manutenção, mencione de forma construtiva. Se estiver tudo em dia, parabenize pela organização.
4. Feche com uma frase inspiradora de foco e alta performance para o dia.
NÃO use marcadores com hífen ou tópicos — escreva em texto corrido e elegante.`

      const userPrompt = `DADOS ATUAIS (${now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}):
- Clima: ${weatherText}
- Agenda Hoje: ${todayText}
- Agenda Amanhã: ${tomorrowText}
- Finanças do Mês: R$ ${totalMonthSpent.toFixed(2)} gastos registrados
- Despensa: ${pantryText}
- Manutenção: ${maintenanceText}

Gere o briefing matinal executivo:`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

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
          temperature: 0.7,
          max_tokens: 280,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        const text = json.choices?.[0]?.message?.content?.trim()
        if (text) {
          return text.replace(/^["']|["']$/g, '')
        }
      }
    } catch (err) {
      console.warn('[RefinedBriefing] LLM request fallback:', err)
    }
  }

  // Fallback heurístico inteligente refinado (0ms)
  return buildSmartRefinedBriefing(todayEvents, tomorrowEvents, lowStock, vehicleAlerts, urgentAssets, totalMonthSpent)
}

function buildSmartRefinedBriefing(
  todayEvents: any[],
  tomorrowEvents: any[],
  lowStock: any[],
  vehicleAlerts: any[],
  urgentAssets: any[],
  totalMonthSpent: number,
): string {
  const sentences: string[] = []

  // 1. Saudação + Hoje
  if (todayEvents.length > 0) {
    const nextEvt = todayEvents[0]
    sentences.push(
      `Bom dia! Seu foco principal para hoje é "${nextEvt.title}"${nextEvt.timeStart ? ` às ${nextEvt.timeStart}` : ''}${todayEvents.length > 1 ? `, com mais ${todayEvents.length - 1} compromisso(s) na pauta` : ''}.`,
    )
  } else {
    sentences.push('Bom dia! Sua agenda de hoje está livre de compromissos fixos, um ótimo cenário para focar em projetos prioritários.')
  }

  // 2. Panorama de Amanhã
  if (tomorrowEvents.length > 0) {
    sentences.push(
      `Para amanhã, você já tem ${tomorrowEvents.length} atividade(s) programada(s), iniciando por "${tomorrowEvents[0].title}"${tomorrowEvents[0].timeStart ? ` às ${tomorrowEvents[0].timeStart}` : ''}.`,
    )
  } else {
    sentences.push('Amanhã o dia também segue calmo na agenda.')
  }

  // 3. Despensa / Manutenção / Finanças
  if (lowStock.length > 0) {
    sentences.push(
      `Na despensa, vale a pena repor ${lowStock.length} item(ns) em baixa (${lowStock.slice(0, 2).map((i) => i.name).join(', ')}).`,
    )
  } else if (vehicleAlerts.length > 0 && vehicleAlerts[0].stats) {
    sentences.push(`No carro: ${vehicleAlerts[0].stats.formattedSummary}.`)
  } else if (urgentAssets.length > 0) {
    sentences.push(`Fique atento à revisão de ${urgentAssets[0].name}.`)
  } else if (totalMonthSpent > 0) {
    sentences.push(`Seus gastos acumulados no mês somam R$ ${totalMonthSpent.toFixed(2)}, com despensa e ativos em dia.`)
  } else {
    sentences.push('Sua despensa, veículos e ativos estão 100% organizados e em dia.')
  }

  // 4. Fechamento
  sentences.push('Tenha um excelente dia de produtividade e conquistas!')

  return sentences.join(' ')
}

/**
 * Generates Night Debriefing (Fechamento do Dia às 21:30).
 */
export async function generateNightDebriefing(data: DashboardData): Promise<string> {
  const config = getHermesAdvancedConfig()
  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  const todayEvents = (data.events || []).filter((e) => e.date === todayIso)
  const tomorrowEvents = (data.events || []).filter((e) => e.date === tomorrowIso)

  // Despesas registradas
  const totalMonthSpent = (data.spending || []).reduce(
    (acc, s) =>
      acc +
      (Number(s.despensa) || 0) +
      (Number(s.manutencao) || 0) +
      (Number(s.viagens) || 0),
    0,
  )

  const groqKey =
    config.groqApiKey ||
    (config.provider === 'groq' ? config.llmApiKey : '') ||
    import.meta.env.VITE_GROQ_API_KEY ||
    ''
  const genericKey = config.llmApiKey || import.meta.env.VITE_LLM_API_KEY || ''
  const apiKey = groqKey || genericKey

  if (apiKey) {
    try {
      let endpoint = 'https://api.groq.com/openai/v1/chat/completions'
      let model = config.llmModel || 'llama-3.3-70b-versatile'

      if (config.provider === 'openrouter' || apiKey.startsWith('sk-or-')) {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions'
        model = config.llmModel || 'meta-llama/llama-3.3-70b-instruct'
      }

      const systemPrompt = `Você é o HERMES, copiloto executivo do Life OS Hub.
Escreva um fechamento noturno carinhoso, inteligente e relaxante (3 frases) para o usuário descansar a mente.
1. Parabenize pelo dia e mencione que os compromissos de hoje foram concluídos.
2. Dê uma visão leve do que espera por ele amanhã.
3. Lembre com delicadeza de registrar algum gasto que tenha ficado pendente e deseje uma excelente noite de sono reparador.`

      const userPrompt = `DADOS DA NOITE:
- Compromissos de Hoje: ${todayEvents.length} atividades
- Amanhã: ${tomorrowEvents.length > 0 ? tomorrowEvents.map((e) => e.title).join(', ') : 'Agenda livre'}
- Total Gasto no Mês: R$ ${totalMonthSpent.toFixed(2)}

Gere o Debriefing Noturno:`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 220,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const json = await res.json()
        const text = json.choices?.[0]?.message?.content?.trim()
        if (text) return text.replace(/^["']|["']$/g, '')
      }
    } catch {}
  }

  // Fallback noturno
  const tomorrowPreview =
    tomorrowEvents.length > 0
      ? `Para amanhã, você tem ${tomorrowEvents.length} compromisso(s) previsto(s) (iniciando por "${tomorrowEvents[0].title}").`
      : 'Sua agenda de amanhã está livre para focar em novos projetos.'

  return `Boa noite! Mais um dia de conquistas concluído com sucesso. ${tomorrowPreview} Se realizou alguma compra ou despesa hoje, lembre-se de registrar antes de dormir. Tenha uma excelente noite de descanso!`
}

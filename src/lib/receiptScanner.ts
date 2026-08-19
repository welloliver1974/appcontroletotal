import { getHermesAdvancedConfig } from './hermes'

export interface ScannedPantryItem {
  name: string
  qty: number
  unit: string
}

export interface ParsedReceiptData {
  establishment: string
  amount: number
  date: string // YYYY-MM-DD
  time?: string // HH:mm
  category: string
  items?: string[]
  detailedItems?: ScannedPantryItem[]
  rawSummary?: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function currentHhMm() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

/**
 * Sends compressed receipt image to Vision LLM via proxy to extract structured spending data and pantry items.
 */
export async function parseReceiptWithVision(
  compressedDataUrl: string,
): Promise<ParsedReceiptData> {
  const config = getHermesAdvancedConfig()

  if (!config.llmApiKey && config.provider !== 'vps') {
    throw new Error('Configure sua API Key de IA em Configurações > Inteligência Artificial Hermes.')
  }

  // Vision model selection based on provider
  let visionModel = config.llmModel
  if (config.provider === 'groq') {
    visionModel = 'llama-3.2-11b-vision-preview'
  } else if (config.provider === 'nvidia') {
    visionModel = config.llmModel.includes('vision')
      ? config.llmModel
      : 'meta/llama-3.2-11b-vision-instruct'
  } else if (config.provider === 'openrouter') {
    visionModel = config.llmModel.includes('vision') || config.llmModel.includes('gemini')
      ? config.llmModel
      : 'google/gemini-2.0-flash-exp:free'
  }

  const systemPrompt = `Você é um scanner OCR especialista em cupom fiscal brasileiro (NFC-e, SAT, Danfe, recibos).
Sua tarefa é analisar a imagem do cupom e extrair EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown, sem explicações).

Estrutura JSON obrigatória:
{
  "establishment": "Nome da loja ou supermercado (ex.: Carrefour, Pão de Açúcar, Droga Raia)",
  "amount": 123.45, // valor TOTAL final pago em formato numérico float com ponto
  "date": "YYYY-MM-DD", // data da emissão (ex.: 2026-08-18). Se não encontrar, use "${todayIso()}"
  "time": "HH:MM", // hora da compra se visível (ex.: 14:30)
  "category": "Alimentação" | "Despensa" | "Saúde" | "Transporte" | "Lazer" | "Serviços" | "Outros",
  "items": ["Item 1", "Item 2"], // lista dos nomes dos produtos identificados
  "detailedItems": [
    { "name": "Item 1", "qty": 1, "unit": "un" }
  ]
}

Responda APENAS o JSON puro.`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extraia os dados deste cupom fiscal para registro financeiro. Retorne apenas o JSON.',
        },
        {
          type: 'image_url',
          image_url: {
            url: compressedDataUrl,
          },
        },
      ],
    },
  ]

  // Call through LLM serverless proxy
  const res = await fetch('/api/llm/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      provider: config.provider,
      apiKey: config.llmApiKey.trim(),
      model: visionModel,
      messages,
      temperature: 0.1,
      max_tokens: 600,
      customUrl: config.customBaseUrl,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Falha no leitor de cupom: ${errText.slice(0, 120)}`)
  }

  const data = await res.json()
  const content =
    data.data?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || ''

  if (!content) {
    throw new Error('Nenhum texto retornado pelo modelo de visão.')
  }

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content
    const parsed = JSON.parse(jsonStr)

    const numAmount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount).replace(',', '.'))

    const rawDetailed = Array.isArray(parsed.detailedItems)
      ? parsed.detailedItems
      : Array.isArray(parsed.items)
        ? parsed.items.map((it: string) => ({ name: String(it), qty: 1, unit: 'un' }))
        : []

    const detailedItems: ScannedPantryItem[] = rawDetailed.map((it: any) => ({
      name: String(it?.name || 'Item'),
      qty: Math.max(1, Number(it?.qty) || 1),
      unit: String(it?.unit || 'un'),
    }))

    return {
      establishment: parsed.establishment || 'Cupom Fiscal',
      amount: isNaN(numAmount) ? 0 : Math.abs(numAmount),
      date: parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : todayIso(),
      time: parsed.time || currentHhMm(),
      category: parsed.category || 'Alimentação',
      items: Array.isArray(parsed.items) ? parsed.items : detailedItems.map((i) => i.name),
      detailedItems,
      rawSummary: content,
    }
  } catch {
    throw new Error('Não foi possível identificar o valor e os dados no cupom. Tente uma foto mais nítida.')
  }
}

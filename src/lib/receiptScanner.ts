import { getHermesAdvancedConfig } from './hermes'

export interface ScannedPantryItem {
  name: string
  qty: number
  unit: string
  unitPrice?: number
  totalPrice?: number
}

export interface ParsedReceiptData {
  establishment: string
  amount: number
  date: string // YYYY-MM-DD
  time?: string // HH:mm
  category: string
  items?: string[]
  detailedItems?: ScannedPantryItem[]
  paymentMethod?: string
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
 * Robust JSON cleaner to fix common LLM formatting glitches:
 * - Markdown blocks ```json ... ```
 * - Trailing commas in objects/arrays
 * - Brazilian decimal numbers with comma e.g. "amount": 45,90 -> "amount": 45.90
 */
function cleanAndParseJson(raw: string): any {
  let text = raw.trim()

  // Remove markdown code fences if present
  text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim()

  // Find opening and closing brackets
  const startIdx = text.indexOf('{')
  const endIdx = text.lastIndexOf('}')

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error('Nenhum formato JSON válido retornado.')
  }

  let jsonStr = text.slice(startIdx, endIdx + 1)

  // Fix Brazilian comma decimals in numeric values (e.g. "amount": 12,50 or : 12,50,)
  jsonStr = jsonStr.replace(/:\s*(\d+),(\d{1,2})\s*([,\n\r}])/g, ': $1.$2$3')

  // Remove trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')

  try {
    return JSON.parse(jsonStr)
  } catch {
    // If standard JSON.parse fails, try replacing any remaining unquoted keys or single quotes
    const sanitized = jsonStr
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, '$1')

    return JSON.parse(sanitized)
  }
}

/**
 * Normalizes dates found in Brazilian format (DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY) to YYYY-MM-DD.
 */
function normalizeBrazilianDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return todayIso()

  const clean = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/)
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0')
    const month = dmyMatch[2].padStart(2, '0')
    let year = dmyMatch[3]
    if (year.length === 2) {
      year = `20${year}`
    }
    return `${year}-${month}-${day}`
  }

  return todayIso()
}

/**
 * Sends high-clarity receipt image to Vision LLM to extract structured spending data and pantry items.
 */
export async function parseReceiptWithVision(
  compressedDataUrl: string,
): Promise<ParsedReceiptData> {
  const config = getHermesAdvancedConfig()

  if (!config.llmApiKey && config.provider !== 'vps') {
    throw new Error('Configure sua API Key em Configurações > Inteligência Artificial Hermes.')
  }

  // Vision model selection based on provider
  // For Groq, llama-3.2-90b-vision-preview is drastically superior for reading dense receipt tables
  let visionModel = config.llmModel || ''
  if (config.provider === 'groq') {
    visionModel = 'llama-3.2-90b-vision-preview'
  } else if (config.provider === 'nvidia') {
    visionModel = config.llmModel.includes('vision')
      ? config.llmModel
      : 'meta/llama-3.2-11b-vision-instruct'
  } else if (config.provider === 'openrouter') {
    visionModel =
      config.llmModel.includes('vision') ||
      config.llmModel.includes('gemini') ||
      config.llmModel.includes('qwen')
        ? config.llmModel
        : 'google/gemini-2.0-flash-001'
  }

  const systemPrompt = `Você é um scanner OCR de alta precisão especialista em cupons fiscais brasileiros (NFC-e, SAT CFe, Danfe Simplificada, Cupom de Restaurante/Posto/Mercado).
Sua missão é ler o cupom de cima a baixo e extrair as informações reais contidas na foto.

COMO LER CADA PARTE DO CUPOM BRASILEIRO:

1. ESTABELECIMENTO (Nome da Loja / Mercado / Posto):
   - Olhe no TOPO SUPERIOR (Cabeçalho).
   - Extraia o Nome Fantasia comercial ou Razão Social da loja (ex: "Assaí Atacadista", "Pão de Açúcar", "Supermercados BH", "Carrefour", "Atacadão", "Dia Supermercado", "Droga Raia", "Drogasil", "Posto Shell", "Posto Ipiranga", "Padaria Central", "Oxxo").
   - REGRA DE OURO: NUNCA coloque nomes do sistema emissor ou fabricante da impressora (ex: "NFC-e", "SAT", "SEFAZ", "Documento Auxiliar", "Extrato No", "Bematech", "Daruma", "Elgin", "Sweda", "Epson", "Totvs", "Linx", "CFe", "Gerencial"). O estabelecimento é a loja física onde o cliente comprou!

2. VALOR TOTAL PAGO (amount):
   - Localize o "VALOR A PAGAR R$", "TOTAL R$" ou "VALOR LÍQUIDO R$".
   - NUNCA confunda com SUBTOTAL, TOTAL BRUTO, TROCO, VALOR RECEBIDO ou DESCONTOS.
   - Retorne o número float (ex: 78.45).

3. DATA E HORA DE EMISSÃO:
   - Data (date): Localize no cupom a data da compra (geralmente escrita como "EMISSÃO: DD/MM/AAAA" ou "DATA: DD/MM/AAAA"). Converta para "YYYY-MM-DD".
   - Hora (time): Localize no cupom o horário exato da compra (geralmente ao lado da data, ex: "14:35:12" ou "18:20"). Retorne "HH:MM". Se NÃO encontrar no cupom, retorne "".

4. CATEGORIA (category):
   - "Despensa" (Supermercados, atacados, hortifruti, açougue, compras de casa)
   - "Alimentação" (Restaurantes, padarias, lanchonetes, delivery, bares)
   - "Saúde" (Farmácias, drogarias)
   - "Transporte" (Postos de gasolina, combustível, estacionamento, pedágio)
   - "Moradia", "Lazer", "Serviços", "Outros"

5. ITENS / PRODUTOS COMPRADOS (detailedItems):
   - Na lista de produtos do cupom fiscal brasileiro, cada linha tem o formato:
     [#] [Código/EAN] [NOME DO PRODUTO] [QTD] [UN] X [VL_UNIT] [VL_TOTAL]
     Exemplo real: "001 7891000315507 DETERGENTE YPE 500ML 2 UN X 2,49 4,98"
   - Extraia o NOME REAL do produto (ignore o código numérico/EAN).
   - Expanda abreviações para nomes limpos e naturais (ex: "LEITE INT CEMIL 1L" -> "Leite Integral Cemil 1L", "ARROZ T1 TIO J 5KG" -> "Arroz Tio João 5kg", "SAB LIQ OMO" -> "Sabão Líquido Omo", "COCA COLA 2L" -> "Coca-Cola 2L").
   - Quantidade (qty): o número real comprado (ex: 1, 2, 0.750).
   - Unidade (unit): "un", "kg", "g", "l", "pct", "cx", "lat".

ESTRUTURA JSON OBRIGATÓRIA (sem markdown adicional):
{
  "establishment": "Nome da Loja",
  "amount": 123.45,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": "Despensa",
  "detailedItems": [
    { "name": "Nome Limpo do Produto", "qty": 1, "unit": "un" }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Leia com atenção este cupom fiscal. Extraia o nome da loja no topo, o valor total a pagar, a data e hora de emissão impressas no cupom, e a lista de produtos reais.',
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

  // Call through LLM serverless proxy with retry on fallback vision model
  let res = await fetch('/api/llm/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'chat',
      provider: config.provider,
      apiKey: config.llmApiKey.trim(),
      model: visionModel,
      messages,
      temperature: 0.1,
      max_tokens: 2500,
      customUrl: config.customBaseUrl,
    }),
  })

  // If 90b vision model returns rate limit or error on Groq, fallback to 11b
  if (!res.ok && config.provider === 'groq' && visionModel === 'llama-3.2-90b-vision-preview') {
    res = await fetch('/api/llm/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        provider: 'groq',
        apiKey: config.llmApiKey.trim(),
        model: 'llama-3.2-11b-vision-preview',
        messages,
        temperature: 0.1,
        max_tokens: 2500,
      }),
    })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Falha no leitor de cupom: ${errText.slice(0, 150)}`)
  }

  const data = await res.json()
  const content =
    data.data?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || ''

  if (!content) {
    throw new Error('Nenhum texto retornado pelo modelo de visão. Verifique a chave de API.')
  }

  // Parse and sanitize JSON response
  try {
    const parsed = cleanAndParseJson(content)

    // Parse amount safely
    let numAmount = 0
    if (typeof parsed.amount === 'number') {
      numAmount = parsed.amount
    } else if (parsed.amount) {
      const sanitizedNum = String(parsed.amount).replace(/[^\d.,]/g, '').replace(',', '.')
      numAmount = parseFloat(sanitizedNum) || 0
    }

    // Process detailed items
    const rawDetailed = Array.isArray(parsed.detailedItems)
      ? parsed.detailedItems
      : Array.isArray(parsed.items)
        ? parsed.items.map((it: any) =>
            typeof it === 'string'
              ? { name: it, qty: 1, unit: 'un' }
              : { name: it?.name || 'Item', qty: Number(it?.qty || it?.quantity) || 1, unit: it?.unit || 'un' },
          )
        : []

    const detailedItems: ScannedPantryItem[] = rawDetailed
      .map((it: any) => ({
        name: String(it?.name || it?.description || 'Item').trim(),
        qty: Math.max(0.1, Number(it?.qty || it?.quantity) || 1),
        unit: String(it?.unit || 'un').trim().toLowerCase(),
        unitPrice: typeof it?.unitPrice === 'number' ? it.unitPrice : undefined,
        totalPrice: typeof it?.totalPrice === 'number' ? it.totalPrice : undefined,
      }))
      .filter((it: ScannedPantryItem) => it.name.length > 0 && it.name.toLowerCase() !== 'item')

    const itemsNames = detailedItems.map((i) => i.name)

    return {
      establishment: String(parsed.establishment || 'Cupom Fiscal').trim(),
      amount: isNaN(numAmount) ? 0 : Math.abs(numAmount),
      date: normalizeBrazilianDate(parsed.date),
      time: parsed.time && /^\d{1,2}:\d{2}$/.test(parsed.time) ? parsed.time : currentHhMm(),
      category: parsed.category || 'Despensa',
      items: itemsNames.length > 0 ? itemsNames : undefined,
      detailedItems,
      paymentMethod: parsed.paymentMethod,
      rawSummary: content,
    }
  } catch (err) {
    console.error('[ReceiptScanner] Error parsing JSON response:', content, err)
    throw new Error('Não foi possível ler todos os dados automaticamente. Tente tirar a foto mais de perto e com boa iluminação.')
  }
}


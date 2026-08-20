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

/**
 * Robust JSON cleaner with regex fallback parser.
 * Even if the LLM output is slightly broken or cut off, extracts all available data gracefully.
 */
function parseReceiptResponse(raw: string): ParsedReceiptData {
  let text = raw.trim()

  // Remove markdown code fences if present
  text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim()

  // 1. Try Structured JSON Parsing
  const startIdx = text.indexOf('{')
  const endIdx = text.lastIndexOf('}')

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    let jsonStr = text.slice(startIdx, endIdx + 1)
    // Fix Brazilian comma decimals in numeric values (e.g. "amount": 12,50)
    jsonStr = jsonStr.replace(/:\s*(\d+),(\d{1,2})\s*([,\n\r}])/g, ': $1.$2$3')
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1')

    try {
      const parsed = JSON.parse(jsonStr)

      let numAmount = 0
      if (typeof parsed.amount === 'number') {
        numAmount = parsed.amount
      } else if (parsed.amount) {
        const sanitizedNum = String(parsed.amount).replace(/[^\d.,]/g, '').replace(',', '.')
        numAmount = parseFloat(sanitizedNum) || 0
      }

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
          name: String(it?.name || it?.description || '').trim(),
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
        time: parsed.time && /^\d{1,2}:\d{2}$/.test(parsed.time) ? parsed.time : '',
        category: parsed.category || 'Despensa',
        items: itemsNames.length > 0 ? itemsNames : undefined,
        detailedItems,
        paymentMethod: parsed.paymentMethod,
        rawSummary: text,
      }
    } catch {
      // Proceed to Regex Fallback below
    }
  }

  // 2. Resilient Regex Fallback
  const estMatch = text.match(/"establishment"\s*:\s*"([^"]+)"/i) || text.match(/estabelecimento|loja\s*[:=]\s*"([^"]+)"/i)
  const establishment = estMatch ? estMatch[1].trim() : 'Cupom Fiscal'

  const amtMatch = text.match(/"amount"\s*:\s*"?([\d.,]+)"?/i) || text.match(/(?:valor|total|pago|r\$)\s*[:=]?\s*r?\$?\s*([\d.,]+)/i)
  let amount = 0
  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
  }

  const dateMatch = text.match(/"date"\s*:\s*"([^"]+)"/i) || text.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})/)
  const date = dateMatch ? normalizeBrazilianDate(dateMatch[1]) : todayIso()

  const timeMatch = text.match(/"time"\s*:\s*"([^"]+)"/i) || text.match(/(\d{1,2}:\d{2})/)
  const time = timeMatch ? timeMatch[1] : ''

  const catMatch = text.match(/"category"\s*:\s*"([^"]+)"/i)
  const category = catMatch ? catMatch[1] : 'Despensa'

  const detailedItems: ScannedPantryItem[] = []
  const itemRegex = /"name"\s*:\s*"([^"]+)"\s*,\s*"qty"\s*:\s*([\d.]+)/g
  let m
  while ((m = itemRegex.exec(text)) !== null) {
    if (m[1].trim()) {
      detailedItems.push({
        name: m[1].trim(),
        qty: parseFloat(m[2]) || 1,
        unit: 'un',
      })
    }
  }

  return {
    establishment,
    amount,
    date,
    time,
    category,
    detailedItems,
    items: detailedItems.map((i) => i.name),
    rawSummary: text,
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
  let visionModel = config.llmModel || ''
  if (config.provider === 'groq') {
    visionModel = 'llama-3.2-11b-vision-preview'
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
          text: 'Leia com atenção este cupom fiscal brasileiro. Extraia o nome da loja no cabeçalho, o valor total pago, a data/hora e a lista dos produtos comprados.',
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
      max_tokens: 2500,
      customUrl: config.customBaseUrl,
    }),
  })

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

  return parseReceiptResponse(content)
}



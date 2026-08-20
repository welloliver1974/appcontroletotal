import { getHermesAdvancedConfig } from './hermes'
import { detectQrCodeFromDataUrl, type SefazQrCodeData } from './qrReceiptReader'

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
  qrCode?: SefazQrCodeData
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
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
 * Robust JSON cleaner with regex fallback parser.
 * Handles polymorphic keys, decimal commas and broken JSONs gracefully.
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
      } else if (typeof parsed.valor === 'number') {
        numAmount = parsed.valor
      } else if (typeof parsed.total === 'number') {
        numAmount = parsed.total
      } else if (parsed.amount || parsed.valor || parsed.total || parsed.valor_total || parsed.total_pago) {
        const rawVal = parsed.amount || parsed.valor || parsed.total || parsed.valor_total || parsed.total_pago
        const sanitizedNum = String(rawVal).replace(/[^\d.,]/g, '').replace(',', '.')
        numAmount = parseFloat(sanitizedNum) || 0
      }

      // Check all possible item key variations (English & Portuguese)
      const rawItemList =
        parsed.detailedItems ||
        parsed.items ||
        parsed.itens ||
        parsed.produtos ||
        parsed.products ||
        parsed.lista ||
        parsed.itens_comprados ||
        parsed.compras ||
        []

      const detailedItems: ScannedPantryItem[] = Array.isArray(rawItemList)
        ? rawItemList
            .map((it: any) => {
              if (typeof it === 'string') {
                return { name: it.trim(), qty: 1, unit: 'un' }
              }
              const name = String(
                it?.name || it?.nome || it?.descricao || it?.description || it?.produto || it?.item || '',
              ).trim()
              const qty = Math.max(
                0.1,
                Number(it?.qty || it?.qtd || it?.quantidade || it?.quantity || it?.quant) || 1,
              )
              const unit = String(it?.unit || it?.un || it?.unidade || 'un').trim().toLowerCase()
              const unitPrice = typeof it?.unitPrice === 'number' ? it.unitPrice : typeof it?.preco_unitario === 'number' ? it.preco_unitario : undefined
              const totalPrice = typeof it?.totalPrice === 'number' ? it.totalPrice : typeof it?.preco_total === 'number' ? it.preco_total : undefined

              return { name, qty, unit, unitPrice, totalPrice }
            })
            .filter((it: ScannedPantryItem) => it.name.length > 0 && it.name.toLowerCase() !== 'item')
        : []

      const storeName = String(
        parsed.establishment ||
          parsed.loja ||
          parsed.mercado ||
          parsed.supermercado ||
          parsed.padaria ||
          parsed.empresa ||
          parsed.local ||
          'Cupom Fiscal',
      ).trim()

      const itemsNames = detailedItems.map((i) => i.name)

      return {
        establishment: storeName,
        amount: isNaN(numAmount) ? 0 : Math.abs(numAmount),
        date: normalizeBrazilianDate(parsed.date || parsed.data),
        time: parsed.time || parsed.hora ? String(parsed.time || parsed.hora).slice(0, 5) : '',
        category: parsed.category || parsed.categoria || 'Despensa',
        items: itemsNames.length > 0 ? itemsNames : undefined,
        detailedItems,
        paymentMethod: parsed.paymentMethod || parsed.forma_pagamento,
        rawSummary: text,
      }
    } catch {
      // Proceed to Regex Fallback below
    }
  }

  // 2. Resilient Regex Fallback
  const estMatch =
    text.match(/"(?:establishment|loja|mercado|padaria|empresa)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(?:estabelecimento|loja|mercado|padaria)\s*[:=]\s*"([^"]+)"/i)
  const establishment = estMatch ? estMatch[1].trim() : 'Cupom Fiscal'

  const amtMatch =
    text.match(/"(?:amount|valor|total)"\s*:\s*"?([\d.,]+)"?/i) ||
    text.match(/(?:valor|total|pago|r\$)\s*[:=]?\s*r?\$?\s*([\d.,]+)/i)
  let amount = 0
  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
  }

  const dateMatch =
    text.match(/"(?:date|data)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(\d{2}[\/\.-]\d{2}[\/\.-]\d{2,4})/)
  const date = dateMatch ? normalizeBrazilianDate(dateMatch[1]) : todayIso()

  const timeMatch =
    text.match(/"(?:time|hora)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(\d{1,2}:\d{2})/)
  const time = timeMatch ? timeMatch[1] : ''

  const catMatch = text.match(/"(?:category|categoria)"\s*:\s*"([^"]+)"/i)
  const category = catMatch ? catMatch[1] : 'Despensa'

  // Extract items via regex matching both "name" and "nome" and "descricao"
  const detailedItems: ScannedPantryItem[] = []
  const itemRegex = /"(?:name|nome|descricao|produto)"\s*:\s*"([^"]+)"/gi
  let m
  while ((m = itemRegex.exec(text)) !== null) {
    const itemName = m[1].trim()
    if (itemName && itemName.toLowerCase() !== 'nome limpo do produto' && itemName.toLowerCase() !== 'item') {
      detailedItems.push({
        name: itemName,
        qty: 1,
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
 * High-speed, QR-assisted Vision OCR for Brazilian tax receipts (SAT, NFC-e, Padarias, Restaurantes).
 * Finishes in ~2-3 seconds without hanging or hitting rate limits.
 */
export async function parseReceiptWithVision(
  compressedDataUrl: string,
): Promise<ParsedReceiptData> {
  const config = getHermesAdvancedConfig()

  if (!config.llmApiKey && config.provider !== 'vps') {
    throw new Error('Configure sua API Key em Configurações > Inteligência Artificial Hermes.')
  }

  // 1. Fast client-side QR Code detection (executes in ~15ms on downscaled canvas)
  const qrCode = await detectQrCodeFromDataUrl(compressedDataUrl).catch(() => null)

  // 2. Vision Model selection (Groq Llama 3.2 Vision or OpenRouter Gemini)
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

  const systemPrompt = `Você é um scanner OCR de alta precisão especialista em cupons fiscais brasileiros (Padarias, Lanchonetes, Supermercados, Farmácias, Postos, SAT CFe, NFC-e).

DIRETRIZES DE EXTRAÇÃO:

1. ESTABELECIMENTO (establishment):
   - Extraia o Nome Comercial / Fantasia ou Razão Social no topo da nota (Linha 1 do cabeçalho).
   - Exemplos: "Padaria Bella Paulista", "Panificadora Estrela", "Sendas Distribuidora (Assaí)", "Carrefour", "Droga Raia", "Posto Ipiranga", "Café do Ponto".
   - NUNCA use "Cupom Fiscal", "Documento Auxiliar", "NFC-e", "SAT", "SEFAZ", "Consumidor" nem endereços.

2. VALOR TOTAL LÍQUIDO (amount):
   - Localize o "VALOR A PAGAR R$", "TOTAL R$" ou "VALOR LÍQUIDO R$" final pós-descontos.
   - Retorne o número float (ex: 59.88).

3. CATEGORIA (category):
   - "Alimentação": Padarias, restaurantes, lanchonetes, bares, cafés, delivery.
   - "Despensa": Supermercados, atacadões, hortifrutis, açougues.
   - "Saúde": Farmácias, drogarias.
   - "Transporte": Postos de combustível, estacionamento.
   - "Outros": Demais despesas.

4. DATA E HORA:
   - Data no formato ISO "YYYY-MM-DD" e Hora "HH:MM". Se não visível, use "${todayIso()}".

5. ITENS / PRODUTOS (detailedItems):
   - Extraia todos os produtos da compra (tanto no formato de 1 linha quanto em 2 linhas):
     * "name": Nome claro e natural do produto (ex: "Pão Francês", "Café Expresso", "Be It Whey 250ml", "Detergente Ypê").
     * "qty": Quantidade numérica (ex: 1, 2, 0.350).
     * "unit": "un", "kg", "g", "l", "pct", "cx", "lat".
     * "unitPrice": Preço unitário numérico float se visível.
     * "totalPrice": Preço total numérico float se visível.

${qrCode?.cnpj ? `[DADOS CONFIRMADOS VIA QR CODE SEFAZ: CNPJ ${qrCode.cnpj}, UF: ${qrCode.uf || 'SP'}]` : ''}

ESTRUTURA JSON OBRIGATÓRIA (sem markdown, apenas o JSON puro):
{
  "establishment": "Nome da Loja ou Padaria",
  "amount": 45.50,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": "Alimentação" | "Despensa" | "Saúde" | "Transporte" | "Outros",
  "detailedItems": [
    {
      "name": "Nome do Produto",
      "qty": 1,
      "unit": "un",
      "unitPrice": 10.00,
      "totalPrice": 10.00
    }
  ]
}`

  // Timeout safety controller (15 seconds)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch('/api/llm/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'chat',
        provider: config.provider,
        apiKey: config.llmApiKey.trim(),
        model: visionModel,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Leia este cupom fiscal / recibo. Extraia o estabelecimento no topo, valor líquido pós-desconto, categoria correta, data/hora e produtos comprados.',
              },
              { type: 'image_url', image_url: { url: compressedDataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
        customUrl: config.customBaseUrl,
      }),
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`Falha no leitor de visão: ${errText.slice(0, 150)}`)
    }

    const data = await res.json()
    const content =
      data.data?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || ''

    if (!content) {
      throw new Error('Não foi possível ler o cupom. Verifique a iluminação e sua chave de API.')
    }

    const result = parseReceiptResponse(content)
    if (qrCode) result.qrCode = qrCode

    return result
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      throw new Error('Tempo limite excedido (15s). A conexão com a IA demorou para responder.')
    }
    throw err
  }
}

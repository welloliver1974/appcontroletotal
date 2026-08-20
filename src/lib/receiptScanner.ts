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
    text.match(/"(?:establishment|loja|mercado|empresa)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(?:estabelecimento|loja|mercado)\s*[:=]\s*"([^"]+)"/i)
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

  const systemPrompt = `Você é um scanner OCR especialista em cupons fiscais brasileiros (SAT CFe, NFC-e, Danfe e Recibos).
Sua tarefa é analisar a imagem do cupom fiscal e extrair os dados com máxima fidelidade.

DIRETRIZES DE EXTRAÇÃO:

1. ESTABELECIMENTO (establishment):
   - Extraia o nome da empresa na PRIMEIRA LINHA do cabeçalho no topo da nota.
   - Exemplos: "SENDAS DISTRIBUIDORA S/A" (Assaí Atacadista), "CARREFOUR COMERCIO E INDUSTRIA", "CIA BRASILEIRA DE DISTRIBUICAO" (Pão de Açúcar), "DROGARIA SAO PAULO S/A", "SUPERMERCADOS BH".
   - NUNCA retorne nomes genéricos como "Cupom Fiscal", "Documento Auxiliar", "SAT" ou "NFC-e".

2. VALOR TOTAL LÍQUIDO PAGO (amount):
   - Localize no rodapé o "VALOR A PAGAR R$" ou "VALOR PAGO R$" final após todos os descontos.
   - NUNCA pegue o "VALOR TOTAL R$" bruto se houver linha de "DESCONTO R$". O amount deve ser o valor efetivamente pago (ex: se Total é 65,88 e Desconto é 6,00, o amount é 59.88).

3. DATA E HORA DE EMISSÃO:
   - Procure por "DATA: DD/MM/AAAA - HH:MM" ou "EMISSÃO: DD/MM/AAAA HH:MM:SS".
   - date: formato ISO "YYYY-MM-DD" (ex: "2026-08-20").
   - time: formato "HH:MM" (ex: "10:54").

4. CATEGORIA (category):
   - "Despensa" (Supermercados, atacados, compras de alimentos/bebidas)
   - "Alimentação" (Restaurantes, lanchonetes)
   - "Saúde" (Farmácias)
   - "Transporte" (Postos de gasolina)

5. ITENS / PRODUTOS (detailedItems):
   - ATENÇÃO AO PADRÃO MULTI-LINHA BRASILEIRO (Assaí, Carrefour, Pão de Açúcar, SAT):
     Cada produto vem dividido em 2 linhas:
     Linha 1: [Item#] [Código] [DESCRIÇÃO DO PRODUTO] (ex: "001 11662410001 BE IT WHEY 250ML CH")
     Linha 2: [Quantidade] [Unidade] x [Valor Unitário] [Valor Total] (ex: "12,000 Un x 5,49 65,88")
     Linha 3 (opcional): [Desconto no item - 6,00]
   - Extraia TODOS os itens listados:
     - name: Nome do produto da linha 1 (ex: "Be It Whey 250ml Ch" ou "Be It Whey 250ml Chocolate")
     - qty: Quantidade numérica (ex: 12)
     - unit: "un", "kg", "g", "l", "pct", "cx", "lat"
     - unitPrice: Preço unitário float (ex: 5.49)
     - totalPrice: Preço total float (ex: 59.88 ou 65.88)

ESTRUTURA JSON OBRIGATÓRIA (sem markdown, apenas o JSON puro):
{
  "establishment": "Sendas Distribuidora (Assaí)",
  "amount": 59.88,
  "date": "2026-08-20",
  "time": "10:54",
  "category": "Despensa",
  "detailedItems": [
    {
      "name": "Be It Whey 250ml Ch",
      "qty": 12,
      "unit": "un",
      "unitPrice": 5.49,
      "totalPrice": 59.88
    }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Extraia os dados completos deste cupom fiscal brasileiro: nome da empresa no topo da primeira linha, valor total líquido pago no rodapé, data/hora e todos os produtos com quantidade e valor.',
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



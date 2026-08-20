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

  const systemPrompt = `Você é um scanner OCR especialista em TODOS os tipos de cupons fiscais e recibos brasileiros (Padarias, Restaurantes, Supermercados, Farmácias, Postos, Lanchonetes, Lojas, SAT CFe, NFC-e, Danfe e Comandas).
Sua tarefa é extrair os dados reais da compra com máxima precisão.

DIRETRIZES UNIVERSAIS DE EXTRAÇÃO:

1. ESTABELECIMENTO (Nome da Loja, Padaria, Restaurante ou Mercado):
   - Localize o Nome Fantasia ou Razão Social no cabeçalho do topo.
   - Exemplos:
     * Padarias/Lanchonetes/Cafés: "Padaria Bella Paulista", "Panificadora Estrela", "Café do Ponto", "Lanchonete Central", "Casa do Pão de Queijo".
     * Restaurantes/Bares: "Churrascaria Boi Preto", "Spoleto", "Madero", "Restaurante Sabor da Vila", "Pizzaria Bella".
     * Supermercados/Atacados: "Sendas Distribuidora (Assaí)", "Carrefour", "Pão de Açúcar", "Supermercados BH", "Atacadão", "Dia", "Oxxo".
     * Farmácias/Postos: "Droga Raia", "Drogasil", "Posto Shell", "Posto Ipiranga".
   - NUNCA retorne "Cupom Fiscal", "Documento Auxiliar", "NFC-e", "SAT", "SEFAZ", "Consumidor" nem endereços.

2. CATEGORIA AUTOMÁTICA (category):
   - "Alimentação": Se for Padaria, Restaurante, Lanchonete, Bar, Café, Delivery, Pizzaria, Hamburgueria.
   - "Despensa": Se for Supermercado, Atacado, Hortifruti, Açougue, Mercearia de bairro.
   - "Saúde": Se for Farmácia ou Drogaria.
   - "Transporte": Se for Posto de Combustível ou Estacionamento.
   - "Outros": Demais estabelecimentos.

3. VALOR TOTAL LÍQUIDO PAGO (amount):
   - Localize o "VALOR A PAGAR R$", "TOTAL R$", "VALOR PAGO R$" ou "VALOR LÍQUIDO R$" final.
   - Se houver linha de DESCONTO, o amount DEVE SER O VALOR FINAL LÍQUIDO PÓS-DESCONTO.

4. DATA E HORA DE EMISSÃO:
   - Data: formato ISO "YYYY-MM-DD" (ex: "2026-08-20"). Se não visível, use "${todayIso()}".
   - Hora: formato "HH:MM" (ex: "10:54" ou "16:30"). Se não encontrar no cupom, use "".

5. ITENS / PRODUTOS (detailedItems):
   - O cupom pode ter os produtos em qualquer formato:
     A) FORMATO 1 LINHA (Comum em Padarias, Restaurantes, Bares, Farmácias):
        * "001 PAO FRANCES KG 0,350 KG X 22,90 8,02" -> name: "Pão Francês", qty: 0.35, unit: "kg"
        * "002 CAFE EXPRESSO 1 UN X 6,50 6,50" -> name: "Café Expresso", qty: 1, unit: "un"
        * "1x Pao na Chapa 7,50" -> name: "Pão na Chapa", qty: 1, unit: "un"
        * "SUCO LARANJA 500ML 1 12,00" -> name: "Suco de Laranja 500ml", qty: 1, unit: "un"
     B) FORMATO 2 LINHAS (Comum em Supermercados e Atacados):
        * Linha 1: "001 11662410001 BE IT WHEY 250ML CH"
        * Linha 2: "12,000 Un x 5,49 65,88"
        * -> name: "Be It Whey 250ml Ch", qty: 12, unit: "un"
   - Extraia TODOS os produtos identificados com nome limpo, quantidade numérica e unidade.

ESTRUTURA JSON OBRIGATÓRIA (sem markdown adicional):
{
  "establishment": "Nome da Padaria / Loja",
  "amount": 45.50,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": "Alimentação",
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

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Leia este cupom fiscal / recibo. Extraia o nome do estabelecimento no cabeçalho, o valor total líquido pago, a categoria correta, a data/hora e a lista de produtos.',
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



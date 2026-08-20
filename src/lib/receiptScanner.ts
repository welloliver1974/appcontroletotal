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

  const systemPrompt = `Você é um scanner OCR de alta precisão especialista em cupons fiscais brasileiros (NFC-e, SAT CFe, Danfe Simplificada, Cupom de Restaurante/Posto/Mercado).
Sua missão é ler o cupom de cima a baixo e extrair as informações reais contidas na foto.

REGRAS DE EXTRAÇÃO:

1. ESTABELECIMENTO (Nome da Loja / Mercado / Posto / Farmácia):
   - Olhe estritamente nas 3 primeiras linhas do TOPO do cupom (Cabeçalho).
   - Extraia o NOME FANTASIA comercial em destaque (ex: "Carrefour", "Pão de Açúcar", "Assaí", "Atacadão", "Supermercados BH", "Droga Raia", "Drogasil", "Posto Ipiranga", "Posto Shell", "Oxxo", "Swift", "Spoleto", "McDonald's", "Burguer King") ou a Razão Social principal (ex: "Sendas Distribuidora S/A", "RaiaDrogasil S/A", "Companhia Brasileira de Distribuição").
   - NUNCA coloque:
     * Nomes fiscais ou de sistemas ("NFC-e", "SAT", "SEFAZ", "Documento Auxiliar", "Extrato No", "Bematech", "Daruma", "Elgin", "Sweda", "Epson", "Totvs", "Linx", "CFe", "Gerencial").
     * Endereço, Bairro, Cidade ou CEP.
     * CNPJ ou Inscrição Estadual.
     * Slogans ou frases promocionais.

2. VALOR TOTAL LÍQUIDO PAGO (amount):
   - REGRA DE OURO DO DESCONTO: Se o cupom tiver descontos ou abatimentos, o amount DEVE SER O VALOR FINAL EFETIVAMENTE PAGO PELO CLIENTE (PÓS-DESCONTO)!
   - Localize no rodapé: "VALOR A PAGAR R$", "VALOR LÍQUIDO R$", "TOTAL A PAGAR R$" ou o valor final cobrado na Forma de Pagamento (Cartão/PIX/Dinheiro).
   - NUNCA retorne o "TOTAL BRUTO", "SUBTOTAL" ou "TOTAL DOS ITENS" antes dos descontos.
   - Retorne sempre o número float com ponto decimal (ex: 89.90).

3. DATA E HORA DE EMISSÃO:
   - Data (date): Localize no cupom a data da compra (geralmente escrita como "EMISSÃO: DD/MM/AAAA" ou "DATA: DD/MM/AAAA"). Converta para "YYYY-MM-DD".
   - Hora (time): Localize no cupom o horário exato da compra (geralmente ao lado da data, ex: "14:35:12" ou "18:20"). Retorne "HH:MM". Se NÃO encontrar no cupom, retorne "".

4. CATEGORIA (category):
   - "Despensa" (Supermercados, atacados, hortifruti, açougue, compras de mantimentos)
   - "Alimentação" (Restaurantes, padarias, lanchonetes, delivery, bares)
   - "Saúde" (Farmácias, drogarias)
   - "Transporte" (Postos de combustível, estacionamento, pedágio)
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
          text: 'Analise este cupom fiscal brasileiro com muita atenção. Identifique o nome comercial da loja no cabeçalho do topo, o VALOR FINAL LÍQUIDO PAGO (já subtraindo qualquer desconto), a data/hora e a lista de produtos comprados.',
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



import { getHermesAdvancedConfig } from './hermes'
import { detectQrCodeFromDataUrl, detectQrCodeFromFile, type SefazQrCodeData } from './qrReceiptReader'

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
          parsed.hortifruti ||
          parsed.empresa ||
          parsed.local ||
          'Cupom Fiscal',
      ).trim()

      const itemsNames = detailedItems.map((i) => i.name)

      // Check if 44-digit access key was returned
      let qrFromKey = qrCode
      const rawKey =
        parsed.accessKey ||
        parsed.chave ||
        parsed.chave_acesso ||
        parsed.chaveNFe ||
        text.match(/\b(\d{44})\b/)?.[1] ||
        text.match(/\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\b/)?.[1]?.replace(/\s+/g, '')

      if (!qrFromKey && rawKey && rawKey.length === 44) {
        qrFromKey = parseSefazUrl(`https://www.nfce.fazenda.sp.gov.br/consulta?p=${rawKey}`)
      }

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
        qrCode: qrFromKey,
      }
    } catch {
      // Proceed to Regex Fallback below
    }
  }

  // 2. Resilient Regex Fallback
  const estMatch =
    text.match(/"(?:establishment|loja|mercado|padaria|hortifruti|empresa)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(?:estabelecimento|loja|mercado|padaria|hortifruti)\s*[:=]\s*"([^"]+)"/i)
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

  // Extract items via regex
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

  // 44-digit Access Key Regex fallback
  let qrFromKey = qrCode
  const rawKeyMatch =
    text.match(/"(?:accessKey|chave|chave_acesso)"\s*:\s*"([^"]+)"/i) ||
    text.match(/\b(\d{44})\b/) ||
    text.match(/\b(\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4})\b/)

  if (!qrFromKey && rawKeyMatch) {
    const cleanedKey = rawKeyMatch[1].replace(/\D/g, '')
    if (cleanedKey.length === 44) {
      qrFromKey = parseSefazUrl(`https://www.nfce.fazenda.sp.gov.br/consulta?p=${cleanedKey}`)
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
    qrCode: qrFromKey,
  }
}

/**
 * High-speed, QR-assisted Vision OCR for Brazilian tax receipts (SAT, NFC-e, Padarias, Restaurantes).
 * Finishes in ~2-3 seconds without hanging or hitting rate limits.
 */
export async function parseReceiptWithVision(
  compressedDataUrl: string,
  rawFile?: File | Blob,
): Promise<ParsedReceiptData> {
  const config = getHermesAdvancedConfig()

  if (!config.llmApiKey && config.provider !== 'vps') {
    throw new Error('Configure sua API Key em Configurações > Inteligência Artificial Hermes.')
  }

  // 1. Fast client-side QR Code detection directly on raw sensor File or DataURL
  const qrCode = rawFile
    ? await detectQrCodeFromFile(rawFile).catch(() => null)
    : await detectQrCodeFromDataUrl(compressedDataUrl).catch(() => null)

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

  const systemPrompt = `Você é um scanner OCR especialista em cupons fiscais brasileiros (Hortifrutis, Mercados, Padarias, Lanchonetes, SAT CFe, NFC-e).

REGRAS DE EXTRAÇÃO:

1. ESTABELECIMENTO (establishment):
   - Extraia o Nome Comercial / Fantasia ou Razão Social no topo da nota (Linha 1 do cabeçalho).
   - Exemplos: "Hortifruti Queiroz Filho Ltda", "Sacolão Vila Pompeia", "Padaria Bella Paulista", "Sendas Distribuidora (Assaí)", "Carrefour".
   - NUNCA use "Cupom Fiscal", "Documento Auxiliar", "NFC-e", "SAT", "SEFAZ", "Consumidor" nem endereços.

2. VALOR TOTAL LÍQUIDO (amount):
   - Localize o "TOTAL R$", "VALOR A PAGAR R$" ou "VALOR LÍQUIDO R$".
   - Retorne o número float (ex: 39.97).

3. CATEGORIA (category):
   - "Despensa": Hortifrutis, sacolões, supermercados, atacadões, açougues.
   - "Alimentação": Padarias, lanchonetes, restaurantes, bares, cafés.
   - "Saúde": Farmácias, drogarias.
   - "Transporte": Postos de combustível.
   - "Outros": Demais despesas.

4. DATA E HORA:
   - Data no formato ISO "YYYY-MM-DD" e Hora "HH:MM" (ex: "2026-08-15" e "19:15").

5. ITENS / PRODUTOS (detailedItems):
   - Extraia todos os produtos comprados listados no cupom:
     * "name": Nome claro do produto (ex: "Batata Cong Bemb", "Pão Panizan 2006", "Ovos Bastos Ext").
     * "qty": Quantidade numérica (ex: 1, 2, 0.500).
     * "unit": "un", "kg", "g", "l", "pct", "cx".
     * "unitPrice": Preço unitário float (ex: 18.99).
     * "totalPrice": Preço total do item float (ex: 18.99).

6. CHAVE DE ACESSO FISCAL SEFAZ (accessKey):
   - Extraia a sequência de 44 dígitos da 'Chave de Acesso' ou 'Consulte pela Chave de Acesso' se presente no cupom (ex: "35260817879943000139650130000291821778634186" sem espaços).

ESTRUTURA JSON OBRIGATÓRIA (sem markdown, apenas o JSON puro):
{
  "establishment": "Nome do Estabelecimento",
  "amount": 39.97,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": "Despensa" | "Alimentação" | "Saúde" | "Transporte" | "Outros",
  "accessKey": "35260817879943000139650130000291821778634186",
  "detailedItems": [
    {
      "name": "Nome do Produto",
      "qty": 1,
      "unit": "un",
      "unitPrice": 18.99,
      "totalPrice": 18.99
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
                text: 'Leia este cupom fiscal / recibo. Extraia o estabelecimento no topo, valor líquido pago, data/hora, produtos e a chave de acesso fiscal.',
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
    if (qrCode && !result.qrCode) result.qrCode = qrCode

    return result
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      throw new Error('Tempo limite excedido (15s). A conexão com a IA demorou para responder.')
    }
    throw err
  }
}

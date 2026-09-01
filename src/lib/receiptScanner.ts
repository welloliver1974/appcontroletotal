import { getHermesAdvancedConfig, getDefaultVisionModel } from './hermes'
import { PROVIDERS } from './llmProviders'
import { lookupCnpj } from './cnpjLookup'
import { todayStr } from './utils'
import {
  detectQrCodeFromDataUrl,
  detectQrCodeFromFile,
  parseSefazUrl,
  type SefazQrCodeData,
} from './qrReceiptReader'

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
  return todayStr()
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
  const dmyMatch = clean.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
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
function parseReceiptResponse(raw: string, existingQr?: SefazQrCodeData | null): ParsedReceiptData {
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
      let qrFromKey = existingQr
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
        qrCode: qrFromKey || undefined,
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
    text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/)
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
  let qrFromKey = existingQr
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
    qrCode: qrFromKey || undefined,
  }
}

/**
 * High-speed, QR-assisted Vision OCR for Brazilian tax receipts (SAT, NFC-e, Padarias, Restaurantes).
 * Finishes in ~2-3 seconds with Direct Fetch and proxy fallback.
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

  // 2. Vision Model selection (User-configured or Smart Provider Default)
  const visionModel = config.visionModel || getDefaultVisionModel(config.provider)

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

  const userMessages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Leia este cupom fiscal / recibo. Extraia o estabelecimento no topo, valor líquido pago, data/hora, produtos e a chave de acesso fiscal em JSON.',
        },
        { type: 'image_url', image_url: { url: compressedDataUrl } },
      ],
    },
  ]

  let rawContent = ''

  // 1. TENTATIVA 1: DIRECT FETCH (Navegador -> Provedor direto, ultrarrápido)
  const provider = PROVIDERS[config.provider] || PROVIDERS.groq
  const apiKey = (config.provider === 'groq' ? (config.groqApiKey || config.llmApiKey) : config.llmApiKey || config.groqApiKey || '').trim()

  let endpoint = provider.chatEndpoint
  if (config.provider === 'custom' && config.customBaseUrl) {
    endpoint = `${config.customBaseUrl.replace(/\/+$/, '')}/chat/completions`
  }

  if (apiKey && endpoint && config.provider !== 'vps') {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }

      if (config.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://appcontroletotal.local'
        headers['X-Title'] = 'Life OS Hub - Receipt Scanner'
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: visionModel,
          messages: userMessages,
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        rawContent = data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // Falha de rede/CORS no direct fetch, continua para fallback de proxy
    }
  }

  // 2. TENTATIVA 2: SERVERLESS PROXY FALLBACK
  if (!rawContent) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const res = await fetch('/api/llm/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'chat',
          provider: config.provider,
          apiKey: apiKey,
          model: visionModel,
          messages: userMessages,
          temperature: 0.1,
          max_tokens: 1500,
          customUrl: config.customBaseUrl,
        }),
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        rawContent = data.data?.choices?.[0]?.message?.content || data.choices?.[0]?.message?.content || ''
      } else {
        const errText = await res.text().catch(() => '')
        let cleanMsg = errText
        try {
          const parsed = JSON.parse(errText)
          if (parsed?.error) {
            cleanMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error)
            try {
              const inner = JSON.parse(cleanMsg)
              if (inner?.error?.message) cleanMsg = inner.error.message
            } catch {}
          }
        } catch {}
        throw new Error(`Falha no leitor de visão: ${cleanMsg.slice(0, 160)}`)
      }
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err?.name === 'AbortError') {
        throw new Error('Tempo limite excedido. A conexão com a IA demorou para responder. Tente novamente.')
      }
      throw err
    }
  }

  if (!rawContent) {
    throw new Error('Não foi possível ler o cupom. Verifique sua chave de API e se o modelo escolhido suporta visão/imagens.')
  }

  const result = parseReceiptResponse(rawContent, qrCode)

  // 3. Auto-resolução de CNPJ para nome real do estabelecimento
  const cnpjToResolve = result.qrCode?.cnpj || qrCode?.cnpj
  if (cnpjToResolve && (result.establishment === 'Cupom Fiscal' || result.establishment.startsWith('Nota Fiscal'))) {
    try {
      const lookup = await lookupCnpj(cnpjToResolve)
      if (lookup && lookup.tradeName) {
        result.establishment = lookup.tradeName
      }
    } catch {
      // Ignore CNPJ lookup failures
    }
  }

  return result
}

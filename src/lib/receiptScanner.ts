import {
  getHermesAdvancedConfig,
  normalizeVisionModelForProvider,
  getApiKeyForProvider,
} from './hermes'
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
  const isoMatch = clean.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) {
    return isoMatch[1]
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
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
 * Extracts HH:MM from strings like "08:22:40", "DATA: 07/09/2026 - 08:22", "08:22"
 */
function extractTime(timeStr?: string, fallbackDateStr?: string): string {
  if (timeStr && typeof timeStr === 'string') {
    const match = timeStr.match(/(\d{1,2}:\d{2})/)
    if (match) return match[1].padStart(5, '0')
  }
  if (fallbackDateStr && typeof fallbackDateStr === 'string') {
    const match = fallbackDateStr.match(/(\d{1,2}:\d{2})/)
    if (match) return match[1].padStart(5, '0')
  }
  return ''
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

      const rawDateStr = parsed.date || parsed.data || ''
      const rawTimeStr = parsed.time || parsed.hora || ''

      return {
        establishment: storeName,
        amount: isNaN(numAmount) ? 0 : Math.abs(numAmount),
        date: normalizeBrazilianDate(rawDateStr),
        time: extractTime(rawTimeStr, rawDateStr),
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
    text.match(/"(?:amount|valor|total|a_pagar|total_pago)"\s*:\s*"?([\d.,]+)"?/i) ||
    text.match(/(?:valor\s+a\s+pagar|total|pago|r\$)\s*[:=]?\s*r?\$?\s*([\d.,]+)/i)
  let amount = 0
  if (amtMatch) {
    amount = parseFloat(amtMatch[1].replace(/[^\d.,]/g, '').replace(',', '.')) || 0
  }

  const dateMatch =
    text.match(/"(?:date|data)"\s*:\s*"([^"]+)"/i) ||
    text.match(/DATA:\s*(\d{2}[/.-]\d{2}[/.-]\d{2,4})/i) ||
    text.match(/(\d{2}[/.-]\d{2}[/.-]\d{2,4})/)
  const rawDateMatched = dateMatch ? dateMatch[1] : ''
  const date = rawDateMatched ? normalizeBrazilianDate(rawDateMatched) : todayIso()

  const timeMatch =
    text.match(/"(?:time|hora)"\s*:\s*"([^"]+)"/i) ||
    text.match(/(?:DATA:.*?)(\d{1,2}:\d{2})/i) ||
    text.match(/(\d{1,2}:\d{2}:\d{2})/) ||
    text.match(/(\d{1,2}:\d{2})/)
  const time = extractTime(timeMatch ? timeMatch[1] : '', rawDateMatched)

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
  compressedDataUrls: string | string[],
  rawFiles?: (File | Blob) | (File | Blob)[],
): Promise<ParsedReceiptData> {
  const config = getHermesAdvancedConfig()

  // 1. Normalizar entradas em arrays
  const urls = Array.isArray(compressedDataUrls) ? compressedDataUrls : [compressedDataUrls]
  const files = rawFiles ? (Array.isArray(rawFiles) ? rawFiles : [rawFiles]) : []

  if (urls.length === 0) {
    throw new Error('Nenhuma imagem fornecida para o leitor de visão.')
  }

  // 2. Provedor de Visão Dedicado e Independente do Chat
  const visionProvider = config.visionProvider || (config.nvidiaApiKey ? 'nvidia' : 'openrouter')

  if (visionProvider === 'groq') {
    throw new Error(
      'A Groq não possui modelos de visão/OCR. Acesse Configurações > Hermes e selecione OpenRouter ou NVIDIA para o Scanner de Cupons.'
    )
  }

  const apiKey = getApiKeyForProvider(config, visionProvider)

  if (!apiKey && visionProvider !== 'vps') {
    const pName = PROVIDERS[visionProvider]?.name || visionProvider
    throw new Error(`Configure sua chave de API para o Leitor de Visão (${pName}) em Configurações > Inteligência Artificial Hermes.`)
  }

  // 3. Detecção ultrarrápida de QR Code em qualquer uma das fotos
  let qrCode: SefazQrCodeData | null = null
  for (let i = 0; i < Math.max(urls.length, files.length); i++) {
    const file = files[i]
    const url = urls[i]
    try {
      const detected = file
        ? await detectQrCodeFromFile(file).catch(() => null)
        : url
          ? await detectQrCodeFromDataUrl(url).catch(() => null)
          : null
      if (detected) {
        qrCode = detected
        break
      }
    } catch {
      // Ignora erro de leitura de QR code e continua
    }
  }

  // 4. Seleção do Modelo de Visão normalizado para o provedor de visão
  const visionModel = normalizeVisionModelForProvider(visionProvider, config.visionModel)

  const multiPhotoNote =
    urls.length > 1
      ? `\n\n🚨 ATENÇÃO CRÍTICA - CUPOM LONGO COMPOSTO POR ${urls.length} FOTOS CONSECUTIVAS:
- Você recebeu ${urls.length} fotos sequenciais (Partes 1 a ${urls.length}) do MESMO cupom fiscal.
- É ESTRITAMENTE OBRIGATÓRIO ler e extrair os produtos de TODAS AS ${urls.length} FOTOS.
- A Foto 1 contém os primeiros itens, e as Fotos 2, 3, etc. contêm a continuação com o RESTANTE dos itens.
- NUNCA pare na Foto 1! Você DEVE continuar extraindo todos os itens que aparecem nas fotos seguintes.
- Una e consolide todos os produtos comprados de todas as partes na mesma lista 'detailedItems' sem cortar nada.
- Se houver 1 ou 2 produtos repetidos na transição/sobreposição entre duas fotos, inclua-o apenas uma vez.
- Extraia o valor TOTAL pago geralmente visível no rodapé da última foto.`
      : ''

  const systemPrompt = `Você é um scanner OCR especialista em cupons fiscais brasileiros (Hortifrutis, Mercados, Padarias, Lanchonetes, SAT CFe, NFC-e).${multiPhotoNote}

REGRAS DE EXTRAÇÃO:

1. ESTABELECIMENTO (establishment):
   - Extraia o Nome Comercial / Fantasia ou Razão Social no topo da nota (Linha 1 do cabeçalho da Foto 1).
   - Exemplos: "Sendas Distribuidora (Assaí)", "Hortifruti Queiroz Filho Ltda", "Sacolão Vila Pompeia", "Padaria Bella Paulista", "Carrefour".
   - NUNCA use "Cupom Fiscal", "Documento Auxiliar", "NFC-e", "SAT", "SEFAZ", "Consumidor" nem endereços.

2. VALOR TOTAL LÍQUIDO A PAGAR (amount):
   - Localize o "VALOR A PAGAR R$", "VALOR LÍQUIDO R$" ou "TOTAL R$" (geralmente no rodapé da última foto, após descontos).
   - Retorne o número float com o valor real final pago (ex: 573.83).

3. CATEGORIA (category):
   - "Despensa": Supermercados, atacadões (Assaí, Atacadão, etc.), hortifrutis, sacolões, açougues.
   - "Alimentação": Padarias, lanchonetes, restaurantes, bares, cafés.
   - "Saúde": Farmácias, drogarias.
   - "Transporte": Postos de combustível.
   - "Outros": Demais despesas.

4. DATA E HORA EXATAS:
   - Procure no cabeçalho ou no rodapé a linha com data e horário (ex: "DATA: 07/09/2026 - 08:22" ou "07/09/2026 08:22:40").
   - Retorne a Data no formato ISO "YYYY-MM-DD" (ex: "2026-09-07") e a Hora "HH:MM" (ex: "08:22").

5. ITENS / PRODUTOS (detailedItems) - DICIONÁRIO E LEITURA RIGOROSA:
   - Extraia TODOS os produtos comprados percorrendo todas as fotos sequenciais da primeira à última.
   
   * DESABREVIAÇÃO INTELIGENTE DE TERMOS DE SUPERMERCADO:
     - "CR LEITE" / "CREM LEITE" ➔ "Creme de Leite" (NUNCA coloque só "Leite" quando houver "CR" antes!)
     - "CR RICOTA" ➔ "Creme de Ricota"
     - "CR CHEESE" ➔ "Cream Cheese"
     - "L COND" / "LTE COND" ➔ "Leite Condensado"
     - "L PO" / "LTE PO" ➔ "Leite em Pó"
     - "LTE DESN" / "LTE INT" / "LTE SEMI" ➔ "Leite Desnatado" / "Leite Integral" / "Leite Semidesnatado"
     - "BE IT WHEY" / "BEB LACT" ➔ "Bebida Láctea Whey"
     - "REQ" / "REQ CREM" / "REQ CATUP" ➔ "Requeijão Cremoso" / "Requeijão Catupiry"
     - "MARG" ➔ "Margarina"
     - "PRES" / "PRES SADIA" ➔ "Presunto Sadia"
     - "MUSS" ➔ "Muçarela" (ou Mussarela)
     - "ACH PO" ➔ "Achocolatado em Pó"
     - "DET" / "DET MINUANO" ➔ "Detergente Minuano"
     - "DES" / "DESOD" / "DES GB" ➔ "Desodorante"
     - "OL SJ" / "OL SOJA" ➔ "Óleo de Soja"
     - "OVO BCO" / "OVO VERM" ➔ "Ovos Brancos" / "Ovos Vermelhos"
     - "S/AC" ➔ "sem Açúcar" | "C/S" ➔ "com Sal" | "S/S" ➔ "sem Sal" ou "sem Semente" | "S/C" ➔ "sem Capa"
     - "FT" ➔ "Fatiado" | "BJ" ➔ "Bandeja" | "PT" ➔ "Pote" | "GF" ➔ "Garrafa" | "PC" ➔ "Pacote" | "UN" ➔ "Unidade" | "CT" ➔ "Caixa"
     - Remova códigos numéricos de barras (ex: 7891000...), NCMs, índices "001", "002" e referências fiscais grudadas no nome.

   * QUANTIDADE E UNIDADE:
     - MULTIPLICADOR DE UNIDADES: Se o cupom tiver "6.000 Un x 2.99" ou "3.000 PC x 5.29", extraia "qty": 6 ou 3 e "unit": "un" ou "pct".
     - PRODUTOS POR PESO (KG): Em frios, carnes ou frutas (ex: "0.318 Kg x 34.69" ou "1.084 Kg x 38.90"), extraia o peso com decimais "qty": 0.318 ou 1.084 e "unit": "kg".
     - "unitPrice": Preço unitário float.
     - "totalPrice": Preço total líquido da linha.

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

  const userContent: any[] = [
    {
      type: 'text',
      text:
        urls.length > 1
          ? `Abaixo estão as ${urls.length} fotos consecutivas do mesmo cupom longo. Extraia OBRIGATORIAMENTE todos os produtos de TODAS as ${urls.length} imagens (sem parar na 1ª imagem) e consolide no JSON com o valor total:`
          : 'Leia este cupom fiscal / recibo. Extraia o estabelecimento no topo, valor líquido pago, data/hora, produtos e a chave de acesso fiscal em JSON.',
    },
  ]

  urls.forEach((url, idx) => {
    if (urls.length > 1) {
      userContent.push({
        type: 'text',
        text: `--- [FOTO ${idx + 1} DE ${urls.length}]: ${idx === 0 ? 'Início do cupom / Cabeçalho e primeiros itens' : idx === urls.length - 1 ? 'Final do cupom / Últimos itens e Rodapé com Valor Total' : 'Continuação da lista de itens comprados'} ---`,
      })
    }
    userContent.push({
      type: 'image_url',
      image_url: { url },
    })
  })

  const userMessages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: userContent,
    },
  ]

  let rawContent = ''

  // 1. TENTATIVA 1: DIRECT FETCH (Navegador -> Provedor de Visão direto)
  const provider = PROVIDERS[visionProvider] || PROVIDERS.openrouter

  let endpoint = provider.chatEndpoint
  if (visionProvider === 'custom' && config.customBaseUrl) {
    endpoint = `${config.customBaseUrl.replace(/\/+$/, '')}/chat/completions`
  }

  if (apiKey && endpoint && visionProvider !== 'vps') {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 40000)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }

      if (visionProvider === 'openrouter') {
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
          max_tokens: 4000,
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
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const res = await fetch('/api/llm/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'chat',
          provider: visionProvider,
          apiKey: apiKey,
          model: visionModel,
          messages: userMessages,
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
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

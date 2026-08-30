/**
 * CNPJ Lookup Service using public Brazilian APIs (BrasilAPI & MinhaReceita).
 * Resolves CNPJs from SEFAZ QR codes / access keys to real Trade Names (Nome Fantasia / Razão Social).
 * Completely free, no API key needed, cached in memory for instant subsequent lookups.
 */

export interface CnpjLookupResult {
  cnpj: string
  tradeName: string // Nome Fantasia ou Razão Social limpa
  corporateName: string // Razão Social oficial
  fantasyName?: string // Nome Fantasia se houver
  city?: string
  state?: string
  cnaeDescription?: string
}

// In-memory cache to avoid redundant network requests
const cnpjCache = new Map<string, CnpjLookupResult>()

/**
 * Cleans a corporate name removing trailing S/A, LTDA, EIRELI, ME, etc. for cleaner display
 */
export function cleanCorporateName(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .replace(/\s+(s\/?a|s\.a\.|ltda|eireli|me|epp|sociedade\s+anonima)\.?$/i, '')
    .replace(/\s+-\s+em\s+recuperacao\s+judicial/i, '')
    .trim()
}

/**
 * Queries public BrasilAPI and MinhaReceita to get business information from CNPJ.
 */
export async function lookupCnpj(rawCnpj: string): Promise<CnpjLookupResult | null> {
  const digits = rawCnpj.replace(/\D/g, '').trim()
  if (digits.length !== 14) return null

  // 1. Check in-memory cache
  if (cnpjCache.has(digits)) {
    return cnpjCache.get(digits)!
  }

  // 2. Try BrasilAPI first (High speed, CORS friendly)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      const fantasy = data.nome_fantasia ? String(data.nome_fantasia).trim() : undefined
      const corporate = String(data.razao_social || '').trim()

      const bestName = fantasy && fantasy.length > 2
        ? fantasy
        : cleanCorporateName(corporate) || corporate || `CNPJ ${digits}`

      const result: CnpjLookupResult = {
        cnpj: digits,
        tradeName: bestName,
        corporateName: corporate,
        fantasyName: fantasy,
        city: data.municipio,
        state: data.uf,
        cnaeDescription: data.cnae_fiscal_descricao,
      }

      cnpjCache.set(digits, result)
      return result
    }
  } catch {
    // Fallback below
  }

  // 3. Fallback: MinhaReceita API
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://minhareceita.org/${digits}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      const fantasy = data.nome_fantasia ? String(data.nome_fantasia).trim() : undefined
      const corporate = String(data.razao_social || '').trim()

      const bestName = fantasy && fantasy.length > 2
        ? fantasy
        : cleanCorporateName(corporate) || corporate || `CNPJ ${digits}`

      const result: CnpjLookupResult = {
        cnpj: digits,
        tradeName: bestName,
        corporateName: corporate,
        fantasyName: fantasy,
        city: data.municipio,
        state: data.uf,
        cnaeDescription: data.cnae_fiscal_descricao,
      }

      cnpjCache.set(digits, result)
      return result
    }
  } catch {
    // Both failed
  }

  return null
}

import jsQR from 'jsqr'

export interface SefazQrCodeData {
  rawUrl: string
  accessKey?: string // 44 digits
  cnpj?: string
  uf?: string
  yearMonth?: string // YYMM
  totalAmount?: number
  model?: string // 55, 65 (NFC-e), 59 (SAT)
  date?: string
}

const UF_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

/**
 * Parses raw SEFAZ QR Code URL and extracts access key and fiscal metadata.
 * Uses robust pipe field index parsing (avoiding hash indices).
 */
export function parseSefazUrl(url: string): SefazQrCodeData | null {
  if (!url || typeof url !== 'string') return null

  try {
    const cleanUrl = url.trim()
    const parsed = new URL(cleanUrl)
    let accessKey = ''
    let totalAmount: number | undefined

    const p = parsed.searchParams.get('p')
    if (p) {
      const fields = decodeURIComponent(p).split('|')
      const ak = fields[0]?.replace(/\D/g, '')
      if (ak && ak.length === 44) {
        accessKey = ak
        // No QR Code padrão NFC-e, o valor total costuma estar no índice 4 ou 5 (se >= 6 campos)
        if (fields.length >= 6) {
          for (const idx of [4, 5]) {
            const raw = fields[idx]
            if (raw && raw.trim() && !/^[a-f]/i.test(raw.trim())) {
              const total = parseFloat(raw.replace(',', '.'))
              if (!isNaN(total) && total > 0) {
                totalAmount = total
                break
              }
            }
          }
        }
      }
    }

    if (!accessKey) {
      const chave = parsed.searchParams.get('chaveNFe') || parsed.searchParams.get('chNFe')
      if (chave) {
        const ak = chave.replace(/\D/g, '')
        if (ak.length === 44) accessKey = ak
      }
    }

    // Fallback regex for accessKey in raw url
    if (!accessKey) {
      const match = cleanUrl.match(/\b(\d{44})\b/)
      if (match) accessKey = match[1]
    }

    if (!accessKey && !cleanUrl.includes('fazenda') && !cleanUrl.includes('sefaz') && !cleanUrl.includes('nfce')) {
      return null
    }

    let cnpj: string | undefined
    let uf: string | undefined
    let yearMonth: string | undefined
    let model: string | undefined
    let dateStr: string | undefined

    if (accessKey && accessKey.length === 44) {
      const ufCode = accessKey.slice(0, 2)
      uf = UF_MAP[ufCode] || ufCode
      yearMonth = accessKey.slice(2, 6)
      const rawCnpj = accessKey.slice(6, 20)
      cnpj = rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
      model = accessKey.slice(20, 22)

      const year = 2000 + parseInt(accessKey.substring(2, 4), 10)
      const month = parseInt(accessKey.substring(4, 6), 10)
      if (!isNaN(year) && !isNaN(month)) {
        dateStr = `${year}-${String(month).padStart(2, '0')}-01`
      }
    }

    return {
      rawUrl: cleanUrl,
      accessKey: accessKey || undefined,
      cnpj,
      uf,
      yearMonth,
      totalAmount,
      date: dateStr,
      model: model === '65' ? 'NFC-e' : model === '59' ? 'SAT' : model,
    }
  } catch {
    return null
  }
}

/**
 * High-precision QR code decoder ported from appmercado.
 * 1. Tenta nativo BarcodeDetector via createImageBitmap.
 * 2. Recorta área central (65%) para fotos tiradas pelo celular em alta resolução.
 * 3. Faz varredura multi-escala [1200, 800, 1600, 2000].
 */
export async function decodeQrFromImageElement(img: HTMLImageElement): Promise<string | null> {
  // 1. BarcodeDetector nativo no bitmap original
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(img)
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      const barcodes = await detector.detect(bitmap)
      bitmap.close?.()
      if (barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue
      }
    } catch {
      // Fallback para jsQR
    }
  }

  try {
    const bitmap = await createImageBitmap(img)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      bitmap.close?.()
      return null
    }

    // 1. Otimização: Tenta ler recortando a área central (65%)
    // Evita borrão de downsampling em imagens tiradas pelo celular
    if (bitmap.width > 600 && bitmap.height > 600) {
      const cropSize = Math.round(Math.min(bitmap.width, bitmap.height) * 0.75)
      const cropX = Math.round((bitmap.width - cropSize) / 2)
      const cropY = Math.round((bitmap.height - cropSize) / 2)

      canvas.width = cropSize
      canvas.height = cropSize
      ctx.drawImage(bitmap, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize)

      const imageData = ctx.getImageData(0, 0, cropSize, cropSize)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })
      if (code && code.data) {
        bitmap.close?.()
        return code.data
      }
    }

    // 2. Otimização: Tenta ler a metade inferior (onde QR de NFC-e/SAT sempre fica em cupom vertical)
    if (bitmap.height > bitmap.width) {
      const cropY = Math.round(bitmap.height * 0.35)
      const cropHeight = bitmap.height - cropY
      canvas.width = bitmap.width
      canvas.height = cropHeight
      ctx.drawImage(bitmap, 0, cropY, bitmap.width, cropHeight, 0, 0, bitmap.width, cropHeight)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code && code.data) {
        bitmap.close?.()
        return code.data
      }
    }

    // 3. Fallback: Escala a imagem completa em múltiplas dimensões
    for (const maxDim of [1200, 800, 1600, 2000]) {
      const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1)
      const sw = Math.round(bitmap.width * scale)
      const sh = Math.round(bitmap.height * scale)
      if (sw === 0 || sh === 0) continue

      canvas.width = sw
      canvas.height = sh
      ctx.drawImage(bitmap, 0, 0, sw, sh)

      const imageData = ctx.getImageData(0, 0, sw, sh)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code && code.data) {
        bitmap.close?.()
        return code.data
      }
    }

    bitmap.close?.()
  } catch (err) {
    console.warn('[QRDecoder] Decoding error:', err)
  }

  return null
}

/**
 * Decodes a raw File / Blob taken by the phone camera.
 */
export async function detectQrCodeFromFile(file: File | Blob): Promise<SefazQrCodeData | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(null)
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return resolve(null)

      const img = new Image()
      img.onerror = () => resolve(null)
      img.onload = async () => {
        const raw = await decodeQrFromImageElement(img)
        if (raw) {
          const parsed = parseSefazUrl(raw)
          resolve(parsed)
        } else {
          resolve(null)
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Decodes a DataURL image.
 */
export async function detectQrCodeFromDataUrl(dataUrl: string): Promise<SefazQrCodeData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onerror = () => resolve(null)
    img.onload = async () => {
      const raw = await decodeQrFromImageElement(img)
      if (raw) {
        const parsed = parseSefazUrl(raw)
        resolve(parsed)
      } else {
        resolve(null)
      }
    }
    img.src = dataUrl
  })
}

import jsQR from 'jsqr'

export interface SefazQrCodeData {
  rawUrl: string
  accessKey?: string // 44 digits
  cnpj?: string
  uf?: string
  yearMonth?: string // YYMM
  totalAmount?: number
  model?: string // 55, 65 (NFC-e), 59 (SAT)
}

const UF_MAP: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
}

/**
 * Parses raw SEFAZ QR Code URL and extracts access key and fiscal metadata
 */
export function parseSefazUrl(url: string): SefazQrCodeData | null {
  if (!url || typeof url !== 'string') return null

  const cleanUrl = url.trim()

  // Match 44 consecutive digits (Chave de Acesso) anywhere in the URL or query params
  const keyMatch = cleanUrl.match(/\b(\d{44})\b/) || cleanUrl.match(/[?&]p=([0-9]{44})/i)

  let accessKey: string | undefined
  let cnpj: string | undefined
  let uf: string | undefined
  let yearMonth: string | undefined
  let model: string | undefined
  let totalAmount: number | undefined

  if (keyMatch) {
    accessKey = keyMatch[1]
    const ufCode = accessKey.slice(0, 2)
    uf = UF_MAP[ufCode] || ufCode
    yearMonth = accessKey.slice(2, 6)
    const rawCnpj = accessKey.slice(6, 20)
    cnpj = rawCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    model = accessKey.slice(20, 22)
  }

  // Check if QR code params have pipe-separated values e.g. p=CHAVE|2|1|1|VALOR|...
  const paramP = cleanUrl.match(/[?&]p=([^&]+)/i)
  if (paramP) {
    const parts = decodeURIComponent(paramP[1]).split('|')
    if (parts.length >= 5) {
      const possibleAmount = parseFloat(parts[4].replace(',', '.'))
      if (!isNaN(possibleAmount) && possibleAmount > 0) {
        totalAmount = possibleAmount
      }
    }
  }

  if (!accessKey && !cleanUrl.includes('fazenda') && !cleanUrl.includes('nfce') && !cleanUrl.includes('sefaz')) {
    return null
  }

  return {
    rawUrl: cleanUrl,
    accessKey,
    cnpj,
    uf,
    yearMonth,
    totalAmount,
    model: model === '65' ? 'NFC-e' : model === '59' ? 'SAT' : model,
  }
}

/**
 * Scans an image for QR codes using client-side jsQR and native BarcodeDetector API.
 */
export async function detectQrCodeFromDataUrl(dataUrl: string): Promise<SefazQrCodeData | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onerror = () => resolve(null)

    img.onload = async () => {
      try {
        const { width, height } = img
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return resolve(null)

        ctx.drawImage(img, 0, 0, width, height)

        // 1. Try native BarcodeDetector API if supported (extremely fast)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const detected = await detector.detect(canvas)
            if (detected && detected.length > 0 && detected[0].rawValue) {
              const parsed = parseSefazUrl(detected[0].rawValue)
              if (parsed) return resolve(parsed)
            }
          } catch {
            // Continue to jsQR fallback
          }
        }

        // 2. Fallback to jsQR
        const imageData = ctx.getImageData(0, 0, width, height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        })

        if (code && code.data) {
          const parsed = parseSefazUrl(code.data)
          if (parsed) return resolve(parsed)
        }

        resolve(null)
      } catch (err) {
        console.warn('[QrReader] QR detection failed:', err)
        resolve(null)
      }
    }

    img.src = dataUrl
  })
}

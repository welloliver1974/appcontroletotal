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
 * Scans a raw image File/Blob for QR codes directly at original sensor resolution
 * using createImageBitmap (instant C++ multithreaded processing).
 */
export async function detectQrCodeFromFile(file: File | Blob): Promise<SefazQrCodeData | null> {
  // 1. Try native BarcodeDetector on original full-resolution ImageBitmap (instant <5ms)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
      const detected = await detector.detect(bitmap)
      bitmap.close?.()
      if (detected && detected.length > 0 && detected[0].rawValue) {
        const parsed = parseSefazUrl(detected[0].rawValue)
        if (parsed) return parsed
      }
    } catch {
      // Continue to canvas fallback
    }
  }

  // 2. Fallback to DataURL scanning
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(null)
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const res = await detectQrCodeFromDataUrl(reader.result)
        resolve(res)
      } else {
        resolve(null)
      }
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Scans an image for QR codes using:
 * 1. Native BarcodeDetector on full image (ultra fast C++ browser engine).
 * 2. jsQR on balanced canvas.
 * 3. jsQR on Lower-Half Region-of-Interest (ROI) where small Brazilian NFC-e/SAT QR codes reside.
 */
export async function detectQrCodeFromDataUrl(dataUrl: string): Promise<SefazQrCodeData | null> {
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))

  const scanPromise = new Promise<SefazQrCodeData | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onerror = () => resolve(null)

    img.onload = async () => {
      try {
        const { naturalWidth: width, naturalHeight: height } = img
        if (!width || !height) return resolve(null)

        // 1. Try native BarcodeDetector on full resolution if supported (native C++ runs in ~10ms)
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const detected = await detector.detect(img)
            if (detected && detected.length > 0 && detected[0].rawValue) {
              const parsed = parseSefazUrl(detected[0].rawValue)
              if (parsed) return resolve(parsed)
            }
          } catch {
            // Continue to canvas fallback
          }
        }

        // 2. jsQR on 1200px balanced canvas
        const maxDim = 1200
        const scale = Math.min(1, maxDim / Math.max(width, height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width * scale)
        canvas.height = Math.round(height * scale)

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imgDataFull = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const codeFull = jsQR(imgDataFull.data, imgDataFull.width, imgDataFull.height, {
          inversionAttempts: 'dontInvert',
        })

        if (codeFull && codeFull.data) {
          const parsed = parseSefazUrl(codeFull.data)
          if (parsed) return resolve(parsed)
        }

        // 3. Lower-Half Crop (Region of Interest) for small/distant QR codes in tall receipts
        const cropY = Math.round(height * 0.35)
        const cropHeight = height - cropY
        const cropScale = Math.min(1, 1000 / Math.max(width, cropHeight))

        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = Math.round(width * cropScale)
        cropCanvas.height = Math.round(cropHeight * cropScale)
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })

        if (cropCtx) {
          cropCtx.drawImage(
            img,
            0, cropY, width, cropHeight, // source rect
            0, 0, cropCanvas.width, cropCanvas.height, // dest rect
          )

          const imgDataCrop = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height)
          const codeCrop = jsQR(imgDataCrop.data, imgDataCrop.width, imgDataCrop.height, {
            inversionAttempts: 'attemptBoth',
          })

          if (codeCrop && codeCrop.data) {
            const parsed = parseSefazUrl(codeCrop.data)
            if (parsed) return resolve(parsed)
          }
        }

        resolve(null)
      } catch (err) {
        console.warn('[QrReader] QR detection failed:', err)
        resolve(null)
      }
    }

    img.src = dataUrl
  })

  return Promise.race([scanPromise, timeoutPromise])
}

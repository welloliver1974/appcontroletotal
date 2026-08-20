/**
 * Client-side Image Compression & OCR Enhancement Utility.
 * Optimizes camera photos of receipts for Vision LLMs by balancing
 * high readability of small thermal print with low bandwidth/token footprint.
 */

export interface CompressionResult {
  dataUrl: string
  originalSizeKb: number
  compressedSizeKb: number
  compressionRatio: number
  width: number
  height: number
}

/**
 * Auto-level contrast normalization:
 * Automatically stretches thermal receipt contrast so faded gray ink becomes crisp dark black
 * and yellowish/shadowy paper background becomes clean white, vastly improving OCR accuracy.
 */
function enhanceImageContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    // Sample luminance to find min and max levels
    let minLum = 255
    let maxLum = 0
    const step = 4 // sample every 4th pixel for high speed
    for (let i = 0; i < data.length; i += 4 * step) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      if (lum < minLum) minLum = lum
      if (lum > maxLum) maxLum = lum
    }

    // Add safe margin (clip top/bottom 5%)
    const low = Math.min(minLum + 10, 100)
    const high = Math.max(maxLum - 10, 160)
    const range = high - low

    if (range > 20) {
      for (let i = 0; i < data.length; i += 4) {
        // Linear contrast stretch with slight gamma boost for text sharpness
        const r = Math.min(255, Math.max(0, ((data[i] - low) / range) * 255))
        const g = Math.min(255, Math.max(0, ((data[i + 1] - low) / range) * 255))
        const b = Math.min(255, Math.max(0, ((data[i + 2] - low) / range) * 255))

        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
      }
      ctx.putImageData(imgData, 0, 0)
    }
  } catch {
    // If canvas getImageData fails (e.g. security origin), proceed with untouched canvas
  }
}

export async function compressImageForOcr(
  file: File | Blob,
  maxDimension = 1800,
  quality = 0.88,
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'))

    reader.onload = (event) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem inválido ou corrompido.'))

      img.onload = () => {
        let { width, height } = img

        // Calculate proportional scale preserving aspect ratio with higher resolution for thermal receipts
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          return reject(new Error('Canvas 2D context não disponível.'))
        }

        // Draw image with smooth rendering
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Enhance contrast for thermal receipt text readability
        enhanceImageContrast(ctx, width, height)

        // Export as high-clarity compressed JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality)

        // Calculate compressed size from Base64 length
        const base64Length = dataUrl.length - 'data:image/jpeg;base64,'.length
        const compressedSizeKb = Math.round((base64Length * 0.75) / 1024)
        const ratio = originalSizeKb > 0 ? Math.round((1 - compressedSizeKb / originalSizeKb) * 100) : 0

        resolve({
          dataUrl,
          originalSizeKb,
          compressedSizeKb,
          compressionRatio: Math.max(0, ratio),
          width,
          height,
        })
      }

      img.src = event.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}

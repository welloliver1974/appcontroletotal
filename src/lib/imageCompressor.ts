/**
 * Client-side Image Compression Utility for Vision LLM OCR.
 * Resizes large camera photos to a crisp, natural resolution (~1600px, quality 0.88),
 * preserving all original details, small text and lighting without destructive pixel filtering.
 */

export interface CompressionResult {
  dataUrl: string
  originalSizeKb: number
  compressedSizeKb: number
  compressionRatio: number
  width: number
  height: number
}

export async function compressImageForOcr(
  file: File | Blob,
  maxDimension = 2048,
  quality = 0.90,
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

        // Calculate proportional scale preserving natural aspect ratio
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

        // Draw image with high quality bilinear smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Export as clean, high-clarity JPEG without destructive filters
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


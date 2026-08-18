/**
 * Client-side Image Compression Utility for Free-Tier LLMs.
 * Resizes large camera photos (3-12MB) to ~800px JPEG (~30-60KB),
 * saving 98% of network bandwidth and multimodal token quota.
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
  maxDimension = 900,
  quality = 0.7,
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

        // Calculate proportional scale
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

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Export as compressed JPEG
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

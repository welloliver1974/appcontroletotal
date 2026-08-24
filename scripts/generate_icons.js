import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const svgPath = path.resolve('public/favicon.svg')
const svgBuffer = fs.readFileSync(svgPath)

const sizes = [
  { file: 'public/favicon-16.png', size: 16 },
  { file: 'public/favicon-32.png', size: 32 },
  { file: 'public/favicon-48.png', size: 48 },
  { file: 'public/icons/icon-72.png', size: 72 },
  { file: 'public/icons/icon-96.png', size: 96 },
  { file: 'public/icons/icon-128.png', size: 128 },
  { file: 'public/icons/icon-144.png', size: 144 },
  { file: 'public/icons/icon-152.png', size: 152 },
  { file: 'public/icons/icon-192.png', size: 192 },
  { file: 'public/icons/icon-384.png', size: 384 },
  { file: 'public/icons/icon-512.png', size: 512 },
]

async function generate() {
  console.log('Gerando ícones PWA a partir do Neural Orb SVG...')
  fs.mkdirSync(path.resolve('public/icons'), { recursive: true })

  for (const item of sizes) {
    const dest = path.resolve(item.file)
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(dest)
    console.log(`✅ Gerado: ${item.file} (${item.size}x${item.size})`)
  }

  console.log('✨ Todos os ícones foram gerados com sucesso!')
}

generate().catch((err) => {
  console.error('Erro ao gerar ícones:', err)
  process.exit(1)
})

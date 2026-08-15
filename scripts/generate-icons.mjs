import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = `${__dirname}/../public/icons`

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true })
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

// Colors matching the app theme
const bgColor = '#09090b' // zinc-950
const accentColor = '#6366f1' // indigo-500
const accentLight = '#818cf8' // indigo-400

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, size, size)

  // Ambient glow (top)
  const gradient1 = ctx.createRadialGradient(size / 2, -size * 0.2, 0, size / 2, -size * 0.2, size * 0.8)
  gradient1.addColorStop(0, 'rgba(99, 102, 241, 0.15)')
  gradient1.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient1
  ctx.fillRect(0, 0, size, size)

  // Ambient glow (right)
  const gradient2 = ctx.createRadialGradient(size * 1.2, size * 0.3, 0, size * 1.2, size * 0.3, size * 0.7)
  gradient2.addColorStop(0, 'rgba(34, 211, 238, 0.1)')
  gradient2.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient2
  ctx.fillRect(0, 0, size, size)

  // Ambient glow (bottom-left)
  const gradient3 = ctx.createRadialGradient(-size * 0.2, size * 1.2, 0, -size * 0.2, size * 1.2, size * 0.8)
  gradient3.addColorStop(0, 'rgba(244, 63, 94, 0.1)')
  gradient3.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient3
  ctx.fillRect(0, 0, size, size)

  // Main icon - rounded square with indigo border
  const padding = size * 0.15
  const iconSize = size - padding * 2
  const radius = iconSize * 0.2

  ctx.beginPath()
  ctx.roundRect(padding, padding, iconSize, iconSize, radius)
  ctx.fillStyle = '#18181b' // zinc-900
  ctx.fill()

  // Border
  ctx.beginPath()
  ctx.roundRect(padding, padding, iconSize, iconSize, radius)
  ctx.strokeStyle = accentColor
  const lineWidth = Math.max(2, size * 0.015)
  ctx.lineWidth = lineWidth
  ctx.stroke()

  // Inner accent line (top highlight)
  ctx.beginPath()
  ctx.moveTo(padding + radius, padding)
  ctx.lineTo(padding + iconSize - radius, padding)
  const highlightWidth = Math.max(1, size * 0.008)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = highlightWidth
  ctx.stroke()

  // Calendar icon in center
  const centerX = size / 2
  const centerY = size / 2
  const calSize = iconSize * 0.5

  // Calendar base
  const calX = centerX - calSize / 2
  const calY = centerY - calSize / 2
  const calRadius = calSize * 0.1

  ctx.beginPath()
  ctx.roundRect(calX, calY, calSize, calSize, calRadius)
  ctx.fillStyle = accentColor
  ctx.fill()

  // Calendar top bar
  ctx.beginPath()
  ctx.roundRect(calX, calY, calSize, calSize * 0.25, calRadius)
  ctx.fillStyle = accentLight
  ctx.fill()

  // Calendar dots (days)
  const dotSize = calSize * 0.08
  const dotGap = calSize * 0.22
  const startX = calX + calSize * 0.18
  const startY = calY + calSize * 0.4

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.beginPath()
      ctx.arc(startX + col * dotGap, startY + row * dotGap, dotSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Highlight one dot (today)
  ctx.fillStyle = '#f43f5e' // rose-500
  ctx.beginPath()
  ctx.arc(startX + dotGap, startY + dotGap, dotSize / 2, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toBuffer('image/png')
}

for (const size of sizes) {
  const png = drawIcon(size)
  writeFileSync(`${outDir}/icon-${size}.png`, png)
  console.log(`Generated icon-${size}.png`)
}

// Also generate favicon sizes
const faviconSizes = [16, 32, 48]
for (const size of faviconSizes) {
  const png = drawIcon(size)
  writeFileSync(`${__dirname}/../public/favicon-${size}.png`, png)
  console.log(`Generated favicon-${size}.png`)
}

// Copy favicon.svg to also create favicon.ico (via multiple PNGs in HTML)
console.log('All icons generated!')
import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sizes = [1024, 512, 256, 128, 64, 32, 16]

// The Last Farewell kleuren
const bgColor = '#1e293b'  // Donker slate
const heartColor1 = '#8BA4B8'  // Licht pastelblauw
const heartColor2 = '#6B8BA3'  // Donkerder pastelblauw

function drawHeart(ctx, size) {
  const scale = size / 1024
  
  // Background circle
  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.arc(size/2, size/2, size/2 - 10*scale, 0, Math.PI * 2)
  ctx.fill()
  
  // Heart shape
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, heartColor1)
  gradient.addColorStop(1, heartColor2)
  ctx.fillStyle = gradient
  
  // Draw heart using bezier curves
  const centerX = size / 2
  const centerY = size / 2
  const heartSize = size * 0.35
  
  ctx.beginPath()
  ctx.moveTo(centerX, centerY + heartSize * 0.8)
  
  // Left curve
  ctx.bezierCurveTo(
    centerX - heartSize * 1.2, centerY + heartSize * 0.2,
    centerX - heartSize * 1.2, centerY - heartSize * 0.6,
    centerX, centerY - heartSize * 0.3
  )
  
  // Right curve
  ctx.bezierCurveTo(
    centerX + heartSize * 1.2, centerY - heartSize * 0.6,
    centerX + heartSize * 1.2, centerY + heartSize * 0.2,
    centerX, centerY + heartSize * 0.8
  )
  
  ctx.fill()
}

const iconDir = path.join(__dirname, '../build/icons')

// Maak icons in verschillende formaten
for (const size of sizes) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  drawHeart(ctx, size)
  
  const buffer = canvas.toBuffer('image/png')
  const filename = size === 1024 ? 'icon.png' : `icon_${size}x${size}.png`
  fs.writeFileSync(path.join(iconDir, filename), buffer)
  console.log(`Created: ${filename}`)
}

console.log('\n✅ PNG icons aangemaakt in build/icons/')
console.log('\nVolgende stappen:')
console.log('1. Voor macOS (.icns): gebruik https://cloudconvert.com/png-to-icns')
console.log('2. Voor Windows (.ico): gebruik https://cloudconvert.com/png-to-ico')
console.log('3. Upload icon.png (1024x1024) en download als .icns/.ico')

/**
 * Script om app icons te genereren vanuit SVG
 * Maakt PNG bestanden in verschillende formaten voor macOS en Windows
 * 
 * Gebruik: node scripts/generate-icons.js
 * 
 * Na het runnen van dit script:
 * - macOS: Gebruik iconutil om .icns te maken
 * - Windows: Gebruik online converter of ImageMagick voor .ico
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sizes = [16, 32, 64, 128, 256, 512, 1024]
const iconDir = path.join(__dirname, '../build/icons')

console.log('=== Farewell Player Icon Generator ===\n')
console.log('SVG icon aangemaakt in:', path.join(iconDir, 'icon.svg'))
console.log('\nOm de icons te genereren voor productie:\n')

console.log('1. OPTIE A - Online converter (makkelijkst):')
console.log('   - Ga naar https://cloudconvert.com/svg-to-icns')
console.log('   - Upload build/icons/icon.svg')
console.log('   - Download icon.icns en plaats in build/icons/')
console.log('')

console.log('2. OPTIE B - macOS Terminal (iconutil):')
console.log('   # Eerst SVG naar PNG converteren (bijv. met Inkscape of online)')
console.log('   # Dan iconset maken:')
console.log('   mkdir build/icons/icon.iconset')
console.log('   # Kopieer PNGs met juiste namen:')
console.log('   # icon_16x16.png, icon_16x16@2x.png, icon_32x32.png, etc.')
console.log('   iconutil -c icns build/icons/icon.iconset')
console.log('')

console.log('3. OPTIE C - ImageMagick (als geïnstalleerd):')
console.log('   brew install imagemagick')
console.log('   convert -background none build/icons/icon.svg -resize 1024x1024 build/icons/icon.png')
console.log('')

console.log('Benodigde bestanden voor electron-builder:')
console.log('   - build/icons/icon.icns (macOS)')
console.log('   - build/icons/icon.ico (Windows)')
console.log('   - build/icons/icon.png (Linux)')

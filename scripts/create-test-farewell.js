/**
 * Script om een test .farewell bestand te genereren
 * Gebruik: node scripts/create-test-farewell.js
 */

import JSZip from 'jszip'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas } from 'canvas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Genereer een PNG afbeelding met canvas
function createColoredImage(color, text) {
  const width = 1920
  const height = 1080
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Achtergrond
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)
  
  // Tekst
  ctx.fillStyle = 'white'
  ctx.font = 'bold 72px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)
  
  return canvas.toBuffer('image/png')
}

async function createTestFarewell() {
  const zip = new JSZip()
  
  // Manifest met volledige sessie-data
  const manifest = {
    version: "1.0",
    name: "Afscheid van Jan Jansen",
    created: new Date().toISOString(),
    createdBy: "The Last Farewell",
    
    sessions: [
      {
        id: "session-1",
        name: "Welkom",
        slides: ["001.png", "002.png", "003.png"],
        slideDuration: 4,
        audio: {
          file: "audio/01_welkom.mp3",
          duration: 180,
          autoPlay: false
        }
      },
      {
        id: "session-2",
        name: "Het leven van Jan",
        slides: ["004.png", "005.png", "006.png"],
        slideDuration: 5,
        audio: {
          file: "audio/02_leven.mp3",
          duration: 240,
          autoPlay: false
        }
      },
      {
        id: "session-3",
        name: "Familie & Vrienden",
        slides: ["007.png", "008.png"],
        slideDuration: 6,
        audio: null
      }
    ],
    
    settings: {
      transition: "fade",
      transitionDuration: 1000,
      defaultSlideDuration: 5
    },
    
    externalMusic: [
      {
        sessionId: "session-3",
        type: "spotify",
        name: "Somewhere Over The Rainbow",
        artist: "Israel Kamakawiwo'ole",
        spotifyUrl: "https://open.spotify.com/track/5IVuqXILoxVWvWEPm82Jxr",
        youtubeUrl: "https://www.youtube.com/watch?v=V1bFr2SWP1I"
      }
    ]
  }
  
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  
  // Slides folder met gekleurde afbeeldingen
  const slidesFolder = zip.folder('slides')
  
  const slides = [
    { num: '001', color: '#2c3e50', text: 'Welkom' },
    { num: '002', color: '#34495e', text: 'In liefdevolle herinnering' },
    { num: '003', color: '#1abc9c', text: 'Jan Jansen' },
    { num: '004', color: '#3498db', text: 'Jeugdjaren' },
    { num: '005', color: '#9b59b6', text: 'Familie' },
    { num: '006', color: '#e74c3c', text: 'Passies' },
    { num: '007', color: '#f39c12', text: 'Dankbaarheid' },
    { num: '008', color: '#2c3e50', text: 'Tot ziens' },
  ]
  
  for (const slide of slides) {
    const pngContent = createColoredImage(slide.color, slide.text)
    slidesFolder.file(`${slide.num}.png`, pngContent)
  }
  
  // Lege audio folder (geen echte audio in test)
  zip.folder('audio')
  
  // Genereer ZIP
  const content = await zip.generateAsync({ type: 'nodebuffer' })
  
  // Schrijf naar bestand
  const outputPath = path.join(__dirname, '..', 'test-presentatie.farewell')
  fs.writeFileSync(outputPath, content)
  
  console.log(`✅ Test .farewell bestand aangemaakt: ${outputPath}`)
  console.log(`   - ${slides.length} slides`)
  console.log(`   - ${manifest.sessions.length} sessies`)
  console.log('')
  console.log('Sleep dit bestand naar de Farewell Player om te testen!')
}

createTestFarewell().catch(console.error)

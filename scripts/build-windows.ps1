<#
  build-windows.ps1
  -----------------
  Bouwt, signeert en uploadt de Windows versie van Farewell Player
  
  Vereisten:
  - Node.js geïnstalleerd
  - Git geïnstalleerd  
  - GitHub CLI (gh) geïnstalleerd en ingelogd
  - SimplySign Desktop connected (voor signing)
  - Windows SDK (voor signtool)
#>

param(
    [switch]$SkipSign,
    [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"

# Kleuren voor output
function Write-Step { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "⚠ $msg" -ForegroundColor Yellow }

# Ga naar project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  Farewell Player - Windows Build" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# Haal versie uit package.json
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
Write-Host "Versie: v$version" -ForegroundColor White

# 1. Git pull
Write-Step "Git pull (laatste code ophalen)..."
git pull origin main
Write-Success "Code up-to-date"

# 2. Dependencies installeren
Write-Step "Dependencies installeren..."
npm ci
Write-Success "Dependencies geïnstalleerd"

# 3. Build renderer
Write-Step "Renderer bouwen..."
npm run build:renderer
Write-Success "Renderer gebouwd"

# 4. Build Windows
Write-Step "Windows app bouwen..."
npx electron-builder --win --publish never
Write-Success "Windows build klaar"

# Zoek het exe bestand
$exeFile = Get-ChildItem "dist\*.exe" | Select-Object -First 1
$ymlFile = "dist\latest.yml"

if (-not $exeFile) {
    throw "Geen .exe bestand gevonden in dist\"
}

Write-Host "`nGebouwd: $($exeFile.Name)" -ForegroundColor White

# 5. Sign (tenzij -SkipSign)
if (-not $SkipSign) {
    Write-Step "Signing met Certum SimplySign..."
    Write-Warn "Zorg dat SimplySign Desktop CONNECTED is!"
    
    # Zoek signtool
    $signtool = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue | 
                Sort-Object { $_.Directory.Name } -Descending | 
                Select-Object -First 1
    
    if (-not $signtool) {
        throw "signtool.exe niet gevonden. Installeer Windows SDK."
    }
    
    Write-Host "Signtool: $($signtool.FullName)" -ForegroundColor Gray
    
    # Sign
    & $signtool.FullName sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /a $exeFile.FullName
    
    if ($LASTEXITCODE -ne 0) {
        throw "Signing mislukt! Is SimplySign connected?"
    }
    
    # Verify
    Write-Step "Handtekening verifiëren..."
    & $signtool.FullName verify /pa $exeFile.FullName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Signing succesvol!"
    } else {
        Write-Warn "Verificatie waarschuwing - maar signing lijkt gelukt"
    }
} else {
    Write-Warn "Signing overgeslagen (-SkipSign)"
}

# 6. Upload naar GitHub Release (tenzij -SkipUpload)
if (-not $SkipUpload) {
    Write-Step "Uploaden naar GitHub Release v$version..."
    
    # Check of release bestaat
    $releaseExists = gh release view "v$version" 2>$null
    
    if (-not $releaseExists) {
        Write-Warn "Release v$version bestaat nog niet. Maak eerst een release aan (bijv. via Mac build)."
        Write-Host "Of maak nu een release:" -ForegroundColor Yellow
        Write-Host "  gh release create v$version --title `"Farewell Player v$version`"" -ForegroundColor Gray
        exit 1
    }
    
    # Upload exe
    Write-Host "Uploaden: $($exeFile.Name)..." -ForegroundColor Gray
    gh release upload "v$version" $exeFile.FullName --clobber
    
    # Upload latest.yml als die bestaat
    if (Test-Path $ymlFile) {
        Write-Host "Uploaden: latest.yml..." -ForegroundColor Gray
        gh release upload "v$version" $ymlFile --clobber
    }
    
    Write-Success "Upload compleet!"
    Write-Host "`nRelease: https://github.com/Voskesss/farewell-player/releases/tag/v$version" -ForegroundColor Cyan
} else {
    Write-Warn "Upload overgeslagen (-SkipUpload)"
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  KLAAR!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# JARVIS AI - Quick Install Script for Windows
# Run this in PowerShell: irm https://raw.githubusercontent.com/Jatin8784/Jarvis-AI-Agent/main/install.ps1 | iex

Write-Host "🤖 Installing JARVIS AI..." -ForegroundColor Cyan

# Set variables
$version = "1.0.0"
$downloadUrl = "https://github.com/Jatin8784/Jarvis-AI-Agent/releases/download/v$version/Jarvis-$version-Windows-Portable.zip"
$installPath = "$env:LOCALAPPDATA\Jarvis"
$tempZip = "$env:TEMP\Jarvis-$version.zip"

# Download
Write-Host "📥 Downloading JARVIS v$version..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
    Write-Host "✅ Download complete!" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "📦 Extracting files..." -ForegroundColor Yellow
try {
    if (Test-Path $installPath) {
        Remove-Item -Path $installPath -Recurse -Force
    }
    Expand-Archive -Path $tempZip -DestinationPath $installPath -Force
    Write-Host "✅ Extraction complete!" -ForegroundColor Green
} catch {
    Write-Host "❌ Extraction failed: $_" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item -Path $tempZip -Force

# Create desktop shortcut
Write-Host "🔗 Creating desktop shortcut..." -ForegroundColor Yellow
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\JARVIS AI.lnk")
$Shortcut.TargetPath = "$installPath\Jarvis.exe"
$Shortcut.WorkingDirectory = $installPath
$Shortcut.Description = "JARVIS AI Desktop Agent"
$Shortcut.Save()

Write-Host ""
Write-Host "🎉 JARVIS AI installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Installation location: $installPath" -ForegroundColor Cyan
Write-Host "🖥️  Desktop shortcut created" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 To start JARVIS:" -ForegroundColor Yellow
Write-Host "   1. Double-click the desktop shortcut" -ForegroundColor White
Write-Host "   2. Or run: $installPath\Jarvis.exe" -ForegroundColor White
Write-Host ""
Write-Host "⚙️  First time setup:" -ForegroundColor Yellow
Write-Host "   1. Click Settings (gear icon)" -ForegroundColor White
Write-Host "   2. Select AI Provider (Gemini recommended)" -ForegroundColor White
Write-Host "   3. Enter your API key" -ForegroundColor White
Write-Host "   4. Click Save" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Get free API keys:" -ForegroundColor Yellow
Write-Host "   Gemini: https://makersuite.google.com/app/apikey" -ForegroundColor White
Write-Host "   Groq:   https://console.groq.com" -ForegroundColor White
Write-Host ""

# Ask to launch
$launch = Read-Host "Launch JARVIS now? (Y/N)"
if ($launch -eq "Y" -or $launch -eq "y") {
    Start-Process "$installPath\Jarvis.exe"
    Write-Host "🚀 JARVIS is starting..." -ForegroundColor Green
}

Write-Host ""
Write-Host "📚 Documentation: https://github.com/Jatin8784/Jarvis-AI-Agent" -ForegroundColor Cyan
Write-Host "💬 Support: https://github.com/Jatin8784/Jarvis-AI-Agent/issues" -ForegroundColor Cyan
Write-Host ""
Write-Host "Thank you for using JARVIS AI! 🤖" -ForegroundColor Green

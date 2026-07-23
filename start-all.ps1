# start-all.ps1
# Starts the Seventh Sky Property Care app

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "    STARTING SEVENTH SKY PROPERTY CARE" -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = $PSScriptRoot

$components = @(
    @{ Name = "Backend API";  Dir = "backend";      Cmd = '$env:PORT = "50001"; node server.js';              Port = 50001 },
    @{ Name = "Admin Portal"; Dir = "admin-portal"; Cmd = "npm run dev -- --host 127.0.0.1 --port 3005"; Port = 3005 }
)

foreach ($comp in $components) {
    $fullPath = Join-Path $baseDir $comp.Dir
    if (Test-Path $fullPath) {
        Write-Host "  [+] Starting $($comp.Name) on port $($comp.Port)..." -ForegroundColor Green
        $title = $comp.Name
        $cmd = $comp.Cmd
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$fullPath'; `$host.UI.RawUI.WindowTitle = '$title'; $cmd" -WindowStyle Minimized
        Start-Sleep -Seconds 2
    } else {
        Write-Host "  [!] SKIP: $fullPath not found" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host "    ALL SERVICES LAUNCHED" -ForegroundColor Cyan
Write-Host "  ========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admin    : http://127.0.0.1:3005/admin/" -ForegroundColor White
Write-Host "  Backend  : http://127.0.0.1:50001" -ForegroundColor White
Write-Host ""

$f = Join-Path $PSScriptRoot "..\admin-portal\src\pages\Payroll.jsx"
$lines = Get-Content $f
$newLines = New-Object System.Collections.ArrayList
for ($i = 0; $i -lt $lines.Count; $i++) {
    $ln = $i + 1
    if (($ln -ge 245 -and $ln -le 402) -or ($ln -ge 518 -and $ln -le 537)) {
        continue
    }
    [void]$newLines.Add($lines[$i])
}
$newLines | Set-Content $f -Encoding UTF8
Write-Host "Done. Removed old UI lines. New line count: $($newLines.Count)"

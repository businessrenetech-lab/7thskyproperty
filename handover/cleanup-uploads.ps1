# Remove uploads tied to wiped tables (assets, expenses, student photos, docs).
# KEEPS blogs/, courses/, resources/, branches/ (referenced by retained data).
# Dry-run by default. Apply with:  .\cleanup-uploads.ps1 -Apply
param([switch]$Apply)

$uploads = Join-Path $PSScriptRoot "..\backend\uploads"

$targets = @(
    (Join-Path $uploads "assets\*"),
    (Join-Path $uploads "expenses\*")
)
$looseFiles = Get-ChildItem -Path $uploads -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like 'student_*' -or $_.Name -like 'doc_*' }

$items = @()
foreach ($t in $targets) { $items += Get-ChildItem -Path $t -File -ErrorAction SilentlyContinue }
$items += $looseFiles

if (-not $items) { Write-Host "Nothing to clean."; return }

Write-Host "$($items.Count) file(s) to remove:`n"
$items | ForEach-Object { Write-Host "  $($_.FullName)" }

if ($Apply) {
    $items | Remove-Item -Force
    Write-Host "`nDeleted." -ForegroundColor Green
} else {
    Write-Host "`nDry-run. Re-run with -Apply to delete." -ForegroundColor Yellow
}

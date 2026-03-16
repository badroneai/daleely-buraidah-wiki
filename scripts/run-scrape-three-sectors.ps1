# تشغيل 3 سكربتات جلب في نفس الوقت: مخابز، محامص، شوكولاتة
# كل سكربت يكتب في مجلد مخرجات خاص (لا تضارب):
#   outputs/bakeries/   — مخابز
#   outputs/roasteries/ — محامص
#   outputs/chocolates/ — شوكولاتة
#
# استعمال من جذر المشروع:
#   .\scripts\run-scrape-three-sectors.ps1
#
# يفتح 3 نوافذ طرفية، كل نافذة تعمل على قطاعها حتى النهاية.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$env:PYTHONIOENCODING = "utf-8"

$ScriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"

$sectors = @(
    @{ Sector = "bakeries";   Title = "Buraidah - Bakeries" },
    @{ Sector = "roasteries"; Title = "Buraidah - Roasteries" },
    @{ Sector = "chocolates"; Title = "Buraidah - Chocolates" }
)

foreach ($item in $sectors) {
    $args = @(
        $ScriptPath,
        "--sector", $item.Sector,
        "--device-id", $item.Sector,
        "--headless"
    )
    Write-Host "Starting: $($item.Sector) (window title: $($item.Title))"
    Start-Process -FilePath "python" -ArgumentList $args -WorkingDirectory $ProjectRoot -WindowStyle Normal -PassThru | Out-Null
}

Write-Host ""
Write-Host "3 scraping windows started. Each writes to:"
Write-Host "  outputs/bakeries/"
Write-Host "  outputs/roasteries/"
Write-Host "  outputs/chocolates/"
Write-Host ""
Write-Host "To resume after stop: add --resume when running the same sector again."

# تشغيل سكربت الجلب من جهاز 1 — المخرجات في outputs/device-1/
# استعمال من جذر المشروع:
#   .\scripts\run-scrape-device1.ps1
#   .\scripts\run-scrape-device1.ps1 -Limit 5
#   .\scripts\run-scrape-device1.ps1 -Resume

param(
    [int]$Limit = 0,
    [switch]$Resume
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

$env:PYTHONIOENCODING = "utf-8"

$argList = @("scripts/scrape-gmaps.py", "--device-id", "device-1", "--headless")
if ($Limit -gt 0) {
    $argList += "--limit"; $argList += $Limit
}
if ($Resume) {
    $argList += "--resume"
}

& python $argList

# تشغيل سكرابنج من جهاز 2 — قالب عام لجميع القطاعات
# المخرجات في outputs/device-2/
#
# استعمال:
#   .\scripts\run-scrape-device2.ps1
#   .\scripts\run-scrape-device2.ps1 -Sector cafes -Limit 10
#   .\scripts\run-scrape-device2.ps1 -Sector restaurants -WebFallback
#   .\scripts\run-scrape-device2.ps1 -Sector restaurants -Resume

param(
    [string]$Sector = "cafes",
    [int]$Limit = 0,
    [switch]$Resume,
    [switch]$WebFallback,
    [switch]$NoHeadless
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

$env:PYTHONIOENCODING = "utf-8"
$args = @("scripts/scrape-gmaps.py", "--device-id", "device-2", "--sector", $Sector)
if ($Limit -gt 0) { $args += "--limit"; $args += $Limit }
if ($Resume) { $args += "--resume" }
if ($WebFallback) { $args += "--web-fallback" }
if (-not $NoHeadless) { $args += "--headless" }

python @args

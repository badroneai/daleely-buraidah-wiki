# تشغيل سكرابنج من جهاز 2 — المخرجات في outputs/device-2/
# الاستخدام: .\scripts\run-scrape-device2.ps1
# أو مع حد: .\scripts\run-scrape-device2.ps1 -Limit 10
# استئناف: .\scripts\run-scrape-device2.ps1 -Resume

param(
    [int]$Limit = 0,
    [switch]$Resume,
    [switch]$NoHeadless
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $root) { $root = (Get-Location).Path }
Set-Location $root

$env:PYTHONIOENCODING = "utf-8"
$args = @("scripts/scrape-gmaps.py", "--device-id", "device-2")
if ($Limit -gt 0) { $args += "--limit"; $args += $Limit }
if ($Resume) { $args += "--resume" }
if (-not $NoHeadless) { $args += "--headless" }

python @args

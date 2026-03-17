# سكربت مستقل: جلب العيادات والمستشفيات (clinics)
# المخرجات: outputs/clinics/
# التشغيل من جذر المشروع: .\scripts\run-scrape-clinics.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$ScriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"
$pyCmd = "cd /d `"$ProjectRoot`" && set PYTHONIOENCODING=utf-8 && python `"$ScriptPath`" --sector clinics --device-id clinics --headless --web-fallback && pause"
Start-Process cmd -ArgumentList "/k", $pyCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

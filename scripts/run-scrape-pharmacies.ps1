# سكربت مستقل: جلب الصيدليات (pharmacies)
# المخرجات: outputs/pharmacies/
# التشغيل من جذر المشروع: .\scripts\run-scrape-pharmacies.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$ScriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"
$pyCmd = "cd /d `"$ProjectRoot`" && set PYTHONIOENCODING=utf-8 && python `"$ScriptPath`" --sector pharmacies --device-id pharmacies --headless --web-fallback && pause"
Start-Process cmd -ArgumentList "/k", $pyCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

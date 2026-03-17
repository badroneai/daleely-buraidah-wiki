# سكربت مستقل: جلب الصالونات الرجالية (salons)
# المخرجات: outputs/salons/
# التشغيل من جذر المشروع: .\scripts\run-scrape-salons.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$ScriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"
$pyCmd = "cd /d `"$ProjectRoot`" && set PYTHONIOENCODING=utf-8 && python `"$ScriptPath`" --sector salons --device-id salons --headless --web-fallback && pause"
Start-Process cmd -ArgumentList "/k", $pyCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

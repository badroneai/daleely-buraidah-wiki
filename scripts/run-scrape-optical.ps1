# سكربت مستقل: جلب النظارات والبصريات (optical)
# المخرجات: outputs/optical/
# التشغيل من جذر المشروع: .\scripts\run-scrape-optical.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path
$ScriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"
$pyCmd = "cd /d `"$ProjectRoot`" && set PYTHONIOENCODING=utf-8 && python `"$ScriptPath`" --sector optical --device-id optical --headless --web-fallback && pause"
Start-Process cmd -ArgumentList "/k", $pyCmd -WorkingDirectory $ProjectRoot -WindowStyle Normal

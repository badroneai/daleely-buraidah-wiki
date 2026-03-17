# تشغيل سكربت جلب لكل فئة في قطاع التسوق والتجزئة (7 نوافذ مستقلة)
# كل نافذة PowerShell تبقى مفتوحة وتشغّل الجلب حتى النهاية

$ErrorActionPreference = "Stop"
# مجلد المشروع = المجلد الأب لمجلد scripts
$ProjectRoot = (Resolve-Path (Split-Path -Parent $PSScriptRoot)).Path

$sectors = @(
    @{ id = "fashion";     title = "Fashion" },
    @{ id = "jewelry";     title = "Jewelry" },
    @{ id = "perfumes";    title = "Perfumes" },
    @{ id = "electronics"; title = "Electronics" },
    @{ id = "furniture";   title = "Furniture" },
    @{ id = "baby-stores"; title = "Baby-stores" },
    @{ id = "malls";       title = "Malls" }
)

foreach ($s in $sectors) {
    $title = "$($s.title) - $($s.id)"
    $pyCmd = "cd /d `"$ProjectRoot`" && set PYTHONIOENCODING=utf-8 && python scripts\scrape-gmaps.py --sector $($s.id) --device-id $($s.id) --headless --web-fallback && pause"
    Write-Host "Opening window: $($s.title) ($($s.id))"
    Start-Process cmd -ArgumentList "/k", $pyCmd
    Start-Sleep -Milliseconds 600
}

Write-Host ""
Write-Host "7 windows opened. Each runs one sector. Outputs: outputs/fashion/, outputs/jewelry/, ..."

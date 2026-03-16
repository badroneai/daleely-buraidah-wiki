# جلسة جلب كاملة لجهاز 1 — تعمل بدون توقف وتستأنف تلقائياً عند إعادة التشغيل
#
# استعمال: من جذر المشروع شغّل:
#   .\scripts\run-full-session-device1.ps1
#
# ماذا يفعل:
# - إذا وُجد تقدم سابق (scrape-progress.json) يُشغّل مع --resume ويستكمل من آخر نقطة.
# - إذا لم يُوجد تقدم يبدأ من الصفر.
# - لا ينتظر أي إدخال منك؛ شغّله واتركه يعمل. إذا انقطع (نوم، إغلاق) شغّله مرة أخرى وسيستأنف.
# - عند اكتمال الجلب يُحدّث DEVICE1_WORKLOG.md تلقائياً.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

$env:PYTHONIOENCODING = "utf-8"

$progressFile = Join-Path $ProjectRoot "outputs\device-1\scrape-progress.json"
$resume = $false
if (Test-Path $progressFile) {
    $resume = $true
    Write-Host "Resuming from previous progress..." -ForegroundColor Cyan
}

$scriptPath = Join-Path $ProjectRoot "scripts\scrape-gmaps.py"
$args = @(
    $scriptPath,
    "--device-id", "device-1",
    "--headless"
)
if ($resume) {
    $args += "--resume"
}

Set-Location $ProjectRoot
& python @args

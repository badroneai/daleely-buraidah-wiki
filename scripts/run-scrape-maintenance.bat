@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
start "Maintenance" cmd /k "cd /d \"%~dp0..\" && set PYTHONIOENCODING=utf-8 && python \"%~dp0scrape-gmaps.py\" --sector maintenance --device-id maintenance --headless --web-fallback && pause"

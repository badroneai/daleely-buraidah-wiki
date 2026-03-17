@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
start "Travel" cmd /k "cd /d \"%~dp0..\" && set PYTHONIOENCODING=utf-8 && python \"%~dp0scrape-gmaps.py\" --sector travel --device-id travel --headless --web-fallback && pause"

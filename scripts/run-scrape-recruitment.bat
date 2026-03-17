@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
start "Recruitment" cmd /k "cd /d \"%~dp0..\" && set PYTHONIOENCODING=utf-8 && python \"%~dp0scrape-gmaps.py\" --sector recruitment --device-id recruitment --headless --web-fallback && pause"

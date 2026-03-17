@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
start "General-Services" cmd /k "cd /d \"%~dp0..\" && set PYTHONIOENCODING=utf-8 && python \"%~dp0scrape-gmaps.py\" --sector general-services --device-id general-services --headless --web-fallback && pause"

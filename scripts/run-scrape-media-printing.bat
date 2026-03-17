@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set PYTHONIOENCODING=utf-8
start "Media-Printing" cmd /k "cd /d \"%~dp0..\" && set PYTHONIOENCODING=utf-8 && python \"%~dp0scrape-gmaps.py\" --sector media-printing --device-id media-printing --headless --web-fallback && pause"

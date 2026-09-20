@echo off
title WeatherNow Fullstack Launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    py main.py
    goto end
)
where python >nul 2>nul
if %errorlevel% equ 0 (
    python main.py
    goto end
)
echo [ERROR] Python was not found in PATH or Windows Launcher.
echo Please install Python 3.10+ from https://www.python.org/
pause
:end

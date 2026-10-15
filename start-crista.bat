@echo off
title CRISTA - AI Desktop Companion
cd /d "%~dp0"
echo ========================================================
echo          CRISTA - AI Desktop Companion
echo ========================================================
echo Cleaning up any background instances...
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo Launching CRISTA on your desktop...
call npm start
pause

@echo off
title Next.js Server Monitor
echo ========================================
echo    Next.js Server Monitor - STABLE
echo ========================================
echo.

:start
echo [%date% %time%] Starting Next.js server...
npm run dev

echo.
echo [%date% %time%] Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak > nul

goto start

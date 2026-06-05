@echo off
title Panel Zarządzania Botem
cd /d "%~dp0botmanager"
echo Uruchamianie panelu zarządzania botem...
echo Adres: http://localhost:3002
echo.
node server.js
pause
@echo off
REM ====================================================================
REM   Facebook Clone (2018 edition) - single click setup
REM
REM   Double-click this file. It asks for administrator rights, then runs
REM   setup\Setup.ps1 which installs the toolchain, the IDEs, and starts
REM   the Docker stack.
REM
REM   Optional switches are passed straight through, e.g.
REM     setup.bat -SkipIdes
REM     setup.bat -Rebuild
REM ====================================================================

setlocal
title Facebook Clone - Setup

REM --- elevate if we are not already running as administrator ----------
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo   Requesting administrator rights...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

echo.
echo   ==================================================================
echo     Facebook Clone - 2018 edition
echo     React + TypeScript + Vite  ^|  Java 21 + Spring Boot  ^|  Docker
echo.
echo     Installing the toolchain and IDEs, then starting the stack.
echo     Allow 20-40 minutes on a clean machine.
echo   ==================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\Setup.ps1" %*
set EXITCODE=%errorlevel%

echo.
if %EXITCODE% neq 0 (
  echo   Setup finished with errors. The full log is in setup\logs.
) else (
  echo   Setup finished. The app is at http://localhost:3000
)
echo.
pause
endlocal

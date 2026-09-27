@echo off
REM ====================================================================
REM   Facebook Clone - day-to-day stack control
REM
REM     start.bat            start the containers and open the browser
REM     start.bat down       stop the containers (keeps the database)
REM     start.bat rebuild    rebuild images and restart
REM     start.bat logs       tail all logs
REM     start.bat logs backend
REM     start.bat status     show container status
REM     start.bat reset      wipe the database and re-seed
REM ====================================================================

setlocal
title Facebook Clone - Stack

cd /d "%~dp0"

if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\Start.ps1" -Action up
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\Start.ps1" -Action %1 -Service "%~2"
)

endlocal

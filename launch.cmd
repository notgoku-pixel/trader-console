@echo off
rem Launcher used by the "Trader Console" desktop shortcut.
rem Starts the API and UI only if they are not already running, then opens the browser.
cd /d "%~dp0"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"

netstat -ano | findstr ":8787" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Trader Console API" /min cmd /c ""%NODE_EXE%" server\index.js"
  set STARTED=1
)

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Trader Console UI" /min cmd /c ""%NPM_CMD%" run dev"
  set STARTED=1
)

if defined STARTED timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

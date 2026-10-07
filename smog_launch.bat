@echo off
setlocal
cd /d "%~dp0"
"Nuvori.exe" %*
exit /b %errorlevel%

@echo off
setlocal
cd /d "%~dp0"
"MyGame.exe"
exit /b %errorlevel%

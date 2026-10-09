@echo off
title Nuvori World Studio - Private Beta
cd /d "%~dp0"
call npm run world:editor
if errorlevel 1 pause

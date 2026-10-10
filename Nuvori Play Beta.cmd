@echo off
title Nuvori - Private Beta
cd /d "%~dp0"
call npm run beta -- --open
if errorlevel 1 pause

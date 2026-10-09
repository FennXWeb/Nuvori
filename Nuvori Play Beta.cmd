@echo off
title Nuvori - Private Beta
cd /d "%~dp0"
call npm run beta
if errorlevel 1 pause

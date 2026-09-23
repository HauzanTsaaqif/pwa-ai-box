@echo off
cd /d "%~dp0"
set SERWIST_SUPPRESS_TURBOPACK_WARNING=1
call npx next dev


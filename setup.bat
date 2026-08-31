@echo off
title AI Box Photobooth - Setup
echo ============================================
echo  AI Box Photobooth - Setup Script
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js tidak ditemukan. Install dulu dari https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js ditemukan
node --version

:: Install dependencies
echo.
echo Menginstall dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Gagal install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies terinstall

:: Build
echo.
echo Melakukan build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Build gagal. Cek error di atas.
    echo Pastikan .env.local sudah diisi dengan benar.
)

echo.
echo ============================================
echo  Setup Selesai!
echo ============================================
echo.
echo Langkah selanjutnya:
echo 1. Edit .env.local dengan API key asli
echo 2. Jalankan 'npm run dev' untuk development
echo 3. Buka http://localhost:3000
echo.
echo Login Admin default:
echo   Username: admin
echo   Password: aibox2026
echo.
echo Untuk inisialisasi database:
echo   Buka http://localhost:3000/api/init-db
echo.
pause

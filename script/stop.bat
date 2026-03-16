@echo off
REM ============================================================================
REM BeautyHub - Script para Parar o Sistema
REM ============================================================================

echo.
echo ========================================
echo  BeautyHub - Parando Sistema
echo ========================================
echo.

echo Parando containers...
docker-compose stop

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao parar containers!
    pause
    exit /b 1
)

echo.
echo [OK] Sistema parado com sucesso!
echo.
echo Para iniciar novamente, execute: start.bat
echo Para remover containers: docker-compose down
echo Para remover tudo (incluindo dados): docker-compose down -v
echo.
pause

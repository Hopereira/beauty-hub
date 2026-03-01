@echo off
REM ============================================================================
REM BeautyHub - Script para Remover Containers (CMD)
REM Mantem os dados (volumes)
REM ============================================================================

echo.
echo ========================================
echo  BeautyHub - Removendo Containers
echo ========================================
echo.

echo ATENCAO: Isso vai parar e remover os containers.
echo Os dados (volumes) serao mantidos.
echo.

set /p CONFIRM="Deseja continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo Parando e removendo containers...
docker-compose down

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao remover containers!
    pause
    exit /b 1
)

echo.
echo [OK] Containers removidos com sucesso!
echo.
echo Os dados foram mantidos.
echo Para iniciar novamente: start.bat
echo.
pause

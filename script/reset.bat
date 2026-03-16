@echo off
REM ============================================================================
REM BeautyHub - Script para Resetar TUDO (CMD)
REM CUIDADO: Remove containers E dados (volumes)
REM ============================================================================

echo.
echo ========================================
echo  BeautyHub - RESETAR TUDO
echo ========================================
echo.

echo ATENCAO: Isso vai APAGAR TUDO!
echo - Containers serao removidos
echo - Volumes (dados) serao apagados
echo - Voce perdera todos os dados do banco
echo.

set /p CONFIRM="Tem certeza que deseja continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
set /p CONFIRM2="Confirme novamente digitando 'APAGAR': "
if /i not "%CONFIRM2%"=="APAGAR" (
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo [1/3] Parando containers...
docker-compose down -v

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao remover containers!
    pause
    exit /b 1
)
echo [OK] Containers e volumes removidos
echo.

echo [2/3] Removendo imagens antigas...
docker-compose rm -f >nul 2>&1
echo [OK] Imagens removidas
echo.

echo [3/3] Limpando cache do Docker...
docker system prune -f >nul 2>&1
echo [OK] Cache limpo
echo.

echo ========================================
echo  Sistema Resetado Completamente!
echo ========================================
echo.
echo Para iniciar o sistema novamente:
echo   start.bat
echo.
echo Isso vai:
echo   - Criar containers novos
echo   - Criar banco de dados novo
echo   - Executar migrations
echo   - Executar seeds (dados de teste)
echo.
pause

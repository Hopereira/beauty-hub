@echo off
REM ============================================================================
REM BeautyHub - Script para Ver Logs
REM ============================================================================

echo.
echo ========================================
echo  BeautyHub - Logs em Tempo Real
echo ========================================
echo.
echo Pressione Ctrl+C para sair
echo.

docker-compose logs -f backend

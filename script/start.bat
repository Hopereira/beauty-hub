@echo off
REM ============================================================================
REM BeautyHub - Script de Inicializacao Completa
REM Executa todos os comandos necessarios para iniciar o sistema
REM ============================================================================

echo.
echo ========================================
echo  BeautyHub - Iniciando Sistema
echo ========================================
echo.

REM Verificar se Docker esta rodando
echo [1/8] Verificando Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Docker nao esta rodando!
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b 1
)
echo [OK] Docker esta rodando
echo.

REM Parar containers antigos (se existirem)
echo [2/8] Parando containers antigos...
docker-compose down >nul 2>&1
echo [OK] Containers antigos parados
echo.

REM Subir containers
echo [3/8] Iniciando containers (Nginx + Backend + PostgreSQL)...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao iniciar containers!
    pause
    exit /b 1
)
echo [OK] Containers iniciados
echo.

REM Aguardar containers ficarem prontos
echo [4/8] Aguardando containers ficarem prontos (30 segundos)...
timeout /t 30 /nobreak >nul
echo [OK] Aguardando concluido
echo.

REM Verificar status dos containers
echo [5/8] Verificando status dos containers...
docker-compose ps
echo.

REM Executar migrations
echo [6/8] Executando migrations (criando tabelas)...
:retry_migrate
docker exec beautyhub_backend npm run migrate
if %errorlevel% neq 0 (
    echo [AVISO] Backend ainda nao esta pronto, aguardando 10 segundos...
    timeout /t 10 /nobreak >nul
    goto retry_migrate
)
echo [OK] Migrations executadas
echo.

REM Executar seeds
echo [7/8] Executando seeds (populando dados de teste)...
docker exec beautyhub_backend npm run seed
if %errorlevel% neq 0 (
    echo [AVISO] Seeds podem ja ter sido executados anteriormente
)
echo [OK] Seeds executados
echo.

REM Verificar health do backend
echo [8/8] Verificando health do backend...
:retry_health
curl -s http://localhost:5001/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Backend ainda nao esta respondendo, aguardando 5 segundos...
    timeout /t 5 /nobreak >nul
    goto retry_health
)
echo [OK] Backend esta respondendo
echo.

REM Exibir informacoes finais
echo ========================================
echo  Sistema Iniciado com Sucesso!
echo ========================================
echo.
echo URLs de Acesso:
echo   Frontend:  http://localhost:8080
echo   Backend:   http://localhost:5001
echo   Health:    http://localhost:5001/api/health
echo.
echo Credenciais de Teste:
echo   MASTER:  master@beautyhub.com / 123456
echo   OWNER:   owner@belezapura.com / 123456
echo   ADMIN:   admin@belezapura.com / 123456
echo   PROF:    prof@belezapura.com / 123456
echo.
echo Tenant: beleza-pura
echo.

REM Perguntar se deseja abrir o navegador
set /p OPEN_BROWSER="Deseja abrir o frontend no navegador? (S/N): "
if /i "%OPEN_BROWSER%"=="S" (
    echo Abrindo navegador...
    start http://localhost:8080
)

echo.
echo Para ver logs em tempo real, execute:
echo   docker-compose logs -f backend
echo.
echo Para parar o sistema, execute:
echo   docker-compose stop
echo.
pause

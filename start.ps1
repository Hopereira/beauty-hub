# ============================================================================
# BeautyHub - Script de Inicializacao Completa (PowerShell)
# Executa todos os comandos necessarios para iniciar o sistema
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BeautyHub - Iniciando Sistema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Docker esta rodando
Write-Host "[1/8] Verificando Docker..." -ForegroundColor Blue
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker esta rodando" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Docker nao esta rodando!" -ForegroundColor Red
    Write-Host "Por favor, inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host ""

# Parar containers antigos (se existirem)
Write-Host "[2/8] Parando containers antigos..." -ForegroundColor Blue
docker-compose down 2>&1 | Out-Null
Write-Host "[OK] Containers antigos parados" -ForegroundColor Green
Write-Host ""

# Subir containers
Write-Host "[3/8] Iniciando containers (Nginx + Backend + PostgreSQL)..." -ForegroundColor Blue
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao iniciar containers!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] Containers iniciados" -ForegroundColor Green
Write-Host ""

# Aguardar containers ficarem prontos
Write-Host "[4/8] Aguardando containers ficarem prontos (30 segundos)..." -ForegroundColor Blue
Start-Sleep -Seconds 30
Write-Host "[OK] Aguardando concluido" -ForegroundColor Green
Write-Host ""

# Verificar status dos containers
Write-Host "[5/8] Verificando status dos containers..." -ForegroundColor Blue
docker-compose ps
Write-Host ""

# Executar migrations com retry
Write-Host "[6/8] Executando migrations (criando tabelas)..." -ForegroundColor Blue
$maxRetries = 5
$retryCount = 0
$success = $false

while ($retryCount -lt $maxRetries -and -not $success) {
    docker exec beautyhub_backend npm run migrate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Migrations executadas" -ForegroundColor Green
        $success = $true
    } else {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "[AVISO] Backend ainda nao esta pronto, aguardando 10 segundos... (tentativa $retryCount/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        } else {
            Write-Host "[ERRO] Falha ao executar migrations apos $maxRetries tentativas" -ForegroundColor Red
            Read-Host "Pressione Enter para sair"
            exit 1
        }
    }
}
Write-Host ""

# Executar seeds
Write-Host "[7/8] Executando seeds (populando dados de teste)..." -ForegroundColor Blue
docker exec beautyhub_backend npm run seed 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Seeds executados" -ForegroundColor Green
} else {
    Write-Host "[AVISO] Seeds podem ja ter sido executados anteriormente" -ForegroundColor Yellow
}
Write-Host ""

# Verificar health do backend com retry
Write-Host "[8/8] Verificando health do backend..." -ForegroundColor Blue
$maxRetries = 10
$retryCount = 0
$success = $false

while ($retryCount -lt $maxRetries -and -not $success) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Backend esta respondendo" -ForegroundColor Green
            $success = $true
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "[AVISO] Backend ainda nao esta respondendo, aguardando 5 segundos... (tentativa $retryCount/$maxRetries)" -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        } else {
            Write-Host "[ERRO] Backend nao esta respondendo apos $maxRetries tentativas" -ForegroundColor Red
            Write-Host "Verifique os logs com: docker-compose logs backend" -ForegroundColor Yellow
            Read-Host "Pressione Enter para sair"
            exit 1
        }
    }
}
Write-Host ""

# Exibir informacoes finais
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sistema Iniciado com Sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs de Acesso:" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:5001" -ForegroundColor Cyan
Write-Host "  Health:    http://localhost:5001/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "Credenciais de Teste:" -ForegroundColor White
Write-Host "  MASTER:  master@beautyhub.com / 123456" -ForegroundColor Yellow
Write-Host "  OWNER:   owner@belezapura.com / 123456" -ForegroundColor Yellow
Write-Host "  ADMIN:   admin@belezapura.com / 123456" -ForegroundColor Yellow
Write-Host "  PROF:    prof@belezapura.com / 123456" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tenant: beleza-pura" -ForegroundColor Magenta
Write-Host ""

# Perguntar se deseja abrir o navegador
$openBrowser = Read-Host "Deseja abrir o frontend no navegador? (S/N)"
if ($openBrowser -eq "S" -or $openBrowser -eq "s") {
    Write-Host "Abrindo navegador..." -ForegroundColor Green
    Start-Process "http://localhost:8080"
}

Write-Host ""
Write-Host "Para ver logs em tempo real, execute:" -ForegroundColor White
Write-Host "  docker-compose logs -f backend" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar o sistema, execute:" -ForegroundColor White
Write-Host "  docker-compose stop" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para sair"

# ============================================================================
# BeautyHub - Script para Parar o Sistema (PowerShell)
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BeautyHub - Parando Sistema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando containers..." -ForegroundColor Blue
docker-compose stop

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao parar containers!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "[OK] Sistema parado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar novamente, execute: .\start.ps1" -ForegroundColor Cyan
Write-Host "Para remover containers: docker-compose down" -ForegroundColor Yellow
Write-Host "Para remover tudo (incluindo dados): docker-compose down -v" -ForegroundColor Red
Write-Host ""
Read-Host "Pressione Enter para sair"

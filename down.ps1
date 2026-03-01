# ============================================================================
# BeautyHub - Script para Remover Containers (PowerShell)
# Mantém os dados (volumes)
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BeautyHub - Removendo Containers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  ATENÇÃO: Isso vai parar e remover os containers." -ForegroundColor Yellow
Write-Host "Os dados (volumes) serão mantidos." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Parando e removendo containers..." -ForegroundColor Blue
docker-compose down

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao remover containers!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "[OK] Containers removidos com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Os dados foram mantidos." -ForegroundColor Cyan
Write-Host "Para iniciar novamente: .\start.ps1" -ForegroundColor Cyan
Write-Host ""
Read-Host "Pressione Enter para sair"

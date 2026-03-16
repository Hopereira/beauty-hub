# ============================================================================
# BeautyHub - Script para Resetar TUDO (PowerShell)
# ⚠️ CUIDADO: Remove containers E dados (volumes)
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  BeautyHub - RESETAR TUDO" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Write-Host "⚠️  ATENÇÃO: Isso vai APAGAR TUDO!" -ForegroundColor Red
Write-Host "- Containers serão removidos" -ForegroundColor Yellow
Write-Host "- Volumes (dados) serão apagados" -ForegroundColor Yellow
Write-Host "- Você perderá todos os dados do banco" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Tem certeza que deseja continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Green
    exit 0
}

Write-Host ""
$confirm2 = Read-Host "Confirme novamente digitando 'APAGAR'"
if ($confirm2 -ne "APAGAR") {
    Write-Host "Operação cancelada." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "[1/3] Parando containers..." -ForegroundColor Blue
docker-compose down -v

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao remover containers!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "[OK] Containers e volumes removidos" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Removendo imagens antigas..." -ForegroundColor Blue
docker-compose rm -f 2>&1 | Out-Null
Write-Host "[OK] Imagens removidas" -ForegroundColor Green
Write-Host ""

Write-Host "[3/3] Limpando cache do Docker..." -ForegroundColor Blue
docker system prune -f 2>&1 | Out-Null
Write-Host "[OK] Cache limpo" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sistema Resetado Completamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o sistema novamente:" -ForegroundColor White
Write-Host "  .\start.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Isso vai:" -ForegroundColor White
Write-Host "  - Criar containers novos" -ForegroundColor Yellow
Write-Host "  - Criar banco de dados novo" -ForegroundColor Yellow
Write-Host "  - Executar migrations" -ForegroundColor Yellow
Write-Host "  - Executar seeds (dados de teste)" -ForegroundColor Yellow
Write-Host ""
Read-Host "Pressione Enter para sair"

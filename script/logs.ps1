# ============================================================================
# BeautyHub - Script para Ver Logs (PowerShell)
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BeautyHub - Logs em Tempo Real" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para sair" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f backend

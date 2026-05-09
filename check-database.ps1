#!/usr/bin/env pwsh
# Check Database Connection Script
# Verifica se o banco Supabase está acessível

Write-Host "=== Database Connection Check ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se nslookup está disponível
Write-Host "1. Testando DNS..." -ForegroundColor Yellow
try {
    $result = nslookup db.sbidpqhncyqmlbriyroo.supabase.co 2>$null
    if ($result -match "Address:") {
        Write-Host "   ✅ DNS resolvido com sucesso" -ForegroundColor Green
        Write-Host "   $result" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ DNS não resolvido" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erro ao consultar DNS: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Instruções para resolver:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   a) Acesse: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   b) Faça login na sua conta" -ForegroundColor White
Write-Host "   c) Verifique se o projeto 'beautyhub' está ativo" -ForegroundColor White
Write-Host "   d) Se estiver pausado, clique em 'Restore Project'" -ForegroundColor White
Write-Host ""
Write-Host "   e) Vá em Project Settings → Database" -ForegroundColor White
Write-Host "   f) Copie a Connection String (URI format)" -ForegroundColor White
Write-Host ""
Write-Host "   g) Atualize no Fly.io:" -ForegroundColor White
Write-Host "      flyctl secrets set DATABASE_URL='sua-nova-url' --app beautyhub-backend" -ForegroundColor Cyan
Write-Host ""
Write-Host "   h) Retry deploy:" -ForegroundColor White
Write-Host "      flyctl deploy --app beautyhub-backend" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Verificar status do projeto Supabase:" -ForegroundColor Yellow
Write-Host "   URL do projeto: https://app.supabase.com/project/sbidpqhncyqmlbriyroo" -ForegroundColor White
Write-Host ""

# Testar ping no host (se possível)
Write-Host "4. Testando ping..." -ForegroundColor Yellow
try {
    $ping = Test-Connection -ComputerName db.sbidpqhncyqmlbriyroo.supabase.co -Count 1 -Quiet -ErrorAction Stop
    if ($ping) {
        Write-Host "   ✅ Host responde ao ping" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Host não responde ao ping" -ForegroundColor Red
    }
} catch {
    Write-Host "   ⚠️  Ping falhou (firewall pode bloquear): $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Fim do diagnóstico ===" -ForegroundColor Cyan

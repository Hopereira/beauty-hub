# 🚀 DEPLOY WORKFLOW — BeautyHub FASE 1

## Status Atual
✅ Código mergeado no master  
⏳ Aguardando deploy no Fly.io  

---

## PRÓXIMOS PASSOS MANUAIS

### 1. Login no Fly.io
```powershell
cd d:\Ficando_rico\Projetos\beatyhub
flyctl auth login
# Abrirá browser para autenticação
```

### 2. Deploy Backend
```powershell
flyctl deploy --app beautyhub-backend
# Aguardar ~2-3 minutos
```

### 3. Verificar Deploy
```powershell
# Health check
curl https://api.biaxavier.com.br/api/health

# Deve retornar:
# {"status":"healthy",...}
```

### 4. Rodar Migrations
```powershell
flyctl ssh console --app beautyhub-backend
npx sequelize-cli db:migrate
# ou
node_modules/.bin/sequelize db:migrate
```

### 5. Ativar Feature Flags (após validação)
```powershell
# Ativar CSP gradualmente
flyctl secrets set CSP_ENFORCEMENT=true --app beautyhub-backend

# Verificar logs
flyctl logs --app beautyhub-backend
```

---

## CHECKLIST PÓS-DEPLOY

- [ ] Deploy sem erros no Fly.io
- [ ] Health check retorna 200
- [ ] Migrations executadas com sucesso
- [ ] Site acessível: https://app.biaxavier.com.br
- [ ] API acessível: https://api.biaxavier.com.br/api/health
- [ ] Login funcionando
- [ ] CSP report-only verificado (se ativado)

---

## ROLLBACK (se necessário)

```powershell
# Desativar CSP
flyctl secrets set CSP_ENFORCEMENT=false --app beautyhub-backend

# Ou reverter código
git revert HEAD
git push origin master
flyctl deploy --app beautyhub-backend
```

---

## COMANDOS ÚTEIS

```powershell
# Ver status do app
flyctl status --app beautyhub-backend

# Ver logs em tempo real
flyctl logs --app beautyhub-backend --follow

# Ver secrets configuradas
flyctl secrets list --app beautyhub-backend

# SSH no container
flyctl ssh console --app beautyhub-backend

# Ver releases
flyctl releases list --app beautyhub-backend
```

---

Próximo: FASE 2 (HTTPOnly cookies) — agendar para 1 semana

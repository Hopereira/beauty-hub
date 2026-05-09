# 🚀 DEPLOY GUIDE — BeautyHub Enterprise Security
**Passo a passo para produção**

---

## 📋 PRE-DEPLOY CHECKLIST

- [ ] Backup do banco de dados criado
- [ ] Branch `security/p0-critical-fixes` revisada
- [ ] Staging testado
- [ ] Rollback plano documentado
- [ ] Time de plantão disponível

---

## 🎯 ORDEM DE DEPLOY

### PASSO 1: FASE 1 — P0 Critical (HOJE)

```bash
# 1. Ir para branch
cd d:\Ficando_rico\Projetos\beatyhub
git checkout security/p0-critical-fixes

# 2. Merge para master (via GitHub PR)
# https://github.com/Hopereira/beauty-hub/compare/master...security/p0-critical-fixes

# 3. Deploy backend
flyctl deploy --app beautyhub-backend

# 4. Rodar migrations
flyctl ssh console --app beautyhub-backend
npx sequelize-cli db:migrate

# 5. Verificar saúde
curl https://api.biaxavier.com.br/api/health

# 6. Ativar CSP gradualmente (depois de validar)
flyctl secrets set CSP_ENFORCEMENT=true --app beautyhub-backend

# 7. Verificar logs
flyctl logs --app beautyhub-backend
```

**Validação:**
```bash
# CSP ativo?
curl -I https://api.biaxavier.com.br/api/health | grep -i content-security-policy

# Trust proxy configurado?
# (Verificar em logs se IPs são capturados corretamente)
```

---

### PASSO 2: FASE 2 — HTTPOnly Cookies (1 semana)

```bash
# Depois de validar FASE 1 estável
git checkout security/http-only-cookies
# Merge via PR
flyctl deploy
flyctl ssh console
npx sequelize-cli db:migrate
flyctl secrets set USE_HTTPONLY_COOKIES=true
```

---

### PASSO 3: FASE 4 — Performance (2 semanas)

```bash
git checkout database/performance-indexes
# Merge via PR
flyctl deploy
flyctl ssh console
npx sequelize-cli db:migrate
```

---

## 🔍 MONITORAMENTO PÓS-DEPLOY

### Primeiras 2 horas
```bash
# Watch logs em tempo real
flyctl logs --app beautyhub-backend --follow

# Verificar erros
flyctl logs --app beautyhub-backend | grep -i error

# Verificar webhooks
flyctl logs --app beautyhub-backend | grep -i webhook
```

### Primeiras 24 horas
```bash
# Health check a cada hora
curl -s https://api.biaxavier.com.br/api/health | jq .

# Verificar métricas (se disponíveis)
```

---

## 🚨 ROLLBACK EMERGÊNCIA

Se algo quebrar CRÍTICO:

```bash
# 1. Reverter imediatamente
flyctl deploy --app beautyhub-backend --image-label v-previous

# 2. Ou reverter código
git checkout master
git revert HEAD  # Reverte último merge
git push origin master
flyctl deploy --app beautyhub-backend

# 3. Desativar flags
flyctl secrets set CSP_ENFORCEMENT=false --app beautyhub-backend
flyctl secrets unset USE_HTTPONLY_COOKIES --app beautyhub-backend

# 4. Verificar se voltou
sleep 30
curl https://api.biaxavier.com.br/api/health
```

---

## 📞 CONTATOS EMERGÊNCIA

| Situação | Ação |
|----------|------|
| Site fora | Verificar Fly.io status + Cloudflare |
| Banco lento | Verificar Supabase dashboard |
| Erros 500 | Logs + Sentry (se configurado) |
| Webhooks falhando | Verificar assinatura + idempotency |

---

## ✅ CHECKLIST FINAL

- [ ] Deploy realizado
- [ ] Migrations executadas
- [ ] Healthcheck passou
- [ ] CSP ativo (se habilitado)
- [ ] Logs sem erros críticos
- [ ] Webhooks processando
- [ ] Tenants acessando normalmente
- [ ] Rollback testado (simulação)

---

**Pronto para deploy!** 🚀

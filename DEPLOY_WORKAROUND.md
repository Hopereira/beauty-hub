# 🛠️ DEPLOY WORKAROUND — Problema de DNS/Migration

## Status
- ✅ Build da imagem: **Sucesso**
- ❌ Migration automática: **Falhou** (DNS não resolvido no Fly.io)
- 🔧 Solução: Deploy sem migration + Migration manual

---

## WORKAROUND (Solução Temporária)

### Passo 1: Deploy sem Migration Automática

```powershell
# Usar config alternativa sem release_command
cd d:\Ficando_rico\Projetos\beatyhub
flyctl deploy --app beautyhub-backend --config fly-no-migrate.toml
```

### Passo 2: Verificar se o App está rodando

```powershell
flyctl status --app beautyhub-backend
# Deve mostrar: running
```

### Passo 3: Rodar Migration Manualmente

```powershell
# SSH no container
flyctl ssh console --app beautyhub-backend

# Dentro do container, verificar conectividade
node -e "require('dns').lookup('db.sbidpqhncyqmlbriyroo.supabase.co', console.log)"

# Se DNS resolver, rodar migration
npx sequelize-cli db:migrate --env production
```

### Passo 4: Se falhar, verificar DATABASE_URL

```powershell
# Listar secrets
flyctl secrets list --app beautyhub-backend

# Se DATABASE_URL estiver incorreta, atualizar:
flyctl secrets set DATABASE_URL="postgresql://postgres.sbidpqhncyqmlbriyroo:[SENHA]@db.sbidpqhncyqmlbriyroo.supabase.co:5432/postgres" --app beautyhub-backend
```

### Passo 5: Voltar para Config Normal

Após migration bem-sucedida:

```powershell
# Restaurar config original
flyctl deploy --app beautyhub-backend --config fly.toml
```

---

## 🔍 DIAGNÓSTICO LOCAL

Execute no seu terminal:

```powershell
# Script criado
.\check-database.ps1
```

Resultado esperado:
- ✅ DNS: Resolvido
- ⚠️ Ping: Pode falhar (firewall do Supabase)

Se DNS resolver localmente, o problema é específico do ambiente Fly.io.

---

## 🚨 CAUSAS POSSÍVEIS

### 1. Problema Temporário de DNS no Fly.io
**Solução:** Aguardar 10-30 minutos e tentar novamente.

```powershell
flyctl deploy --app beautyhub-backend
```

### 2. Projeto Supabase Pausado
**Solução:** 
1. Acesse: https://supabase.com/dashboard
2. Encontre o projeto
3. Clique "Restore Project" se estiver pausado

### 3. URL do Banco Mudou
**Solução:**
1. Supabase Dashboard → Project Settings → Database
2. Copie a nova Connection String
3. Atualize no Fly.io:
```powershell
flyctl secrets set DATABASE_URL="nova-url" --app beautyhub-backend
```

---

## ✅ CHECKLIST PARA RESOLVER

- [ ] Verificar projeto no Supabase Dashboard (ativo/pausado)
- [ ] Confirmar DATABASE_URL no Fly.io
- [ ] Tentar deploy sem migration (fly-no-migrate.toml)
- [ ] Testar conexão manual via SSH
- [ ] Rodar migration manual
- [ ] Restaurar config original

---

## 📞 COMANDOS RÁPIDOS

```powershell
# Status geral
flyctl status --app beautyhub-backend

# Logs
flyctl logs --app beautyhub-backend

# SSH no container
flyctl ssh console --app beautyhub-backend

# Listar releases
flyctl releases list --app beautyhub-backend

# Ver secrets
flyctl secrets list --app beautyhub-backend
```

---

## 🎯 PRÓXIMO PASSO RECOMENDADO

1. **Tente novamente:** O problema pode ser temporário
   ```powershell
   flyctl deploy --app beautyhub-backend
   ```

2. **Se falhar novamente:** Use o workaround acima

3. **Verifique o Supabase:** Confirme que o projeto está ativo

---

**Nota:** O código está correto. O problema é de infraestrutura (DNS/connectividade).

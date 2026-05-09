# 🚨 TROUBLESHOOTING — Deploy FASE 1

## Erro Atual
```
ERROR: getaddrinfo ENOTFOUND db.sbidpqhncyqmlbriyroo.supabase.co
```

**Significado:** O DNS do banco Supabase não foi resolvido durante a migration.

---

## 🔍 DIAGNÓSTICO

### 1. Verificar DATABASE_URL no Fly.io
```bash
flyctl secrets list --app beautyhub-backend
# Deve mostrar DATABASE_URL configurada
```

### 2. Verificar se a URL está correta
```bash
# Extrair host da DATABASE_URL
echo $DATABASE_URL | sed 's/.*@//; s/:.*//; s/\/.*//'
# Deve retornar: db.sbidpqhncyqmlbriyroo.supabase.co
```

### 3. Testar conectividade DNS
```bash
# De qualquer máquina com internet
nslookup db.sbidpqhncyqmlbriyroo.supabase.co
# ou
dig db.sbidpqhncyqmlbriyroo.supabase.co
```

---

## 🛠️ SOLUÇÕES

### Opção 1: Verificar/Atualizar DATABASE_URL

Se a URL do banco mudou no Supabase:

1. Acesse: https://supabase.com/dashboard
2. Vá em Project Settings → Database
3. Copie a Connection String (URI format)
4. Atualize no Fly.io:

```bash
flyctl secrets set DATABASE_URL="postgresql://..." --app beautyhub-backend
```

### Opção 2: Retry do Deploy (problema temporário de DNS)

```bash
# Tente o deploy novamente
flyctl deploy --app beautyhub-backend
```

### Opção 3: Desativar release_command temporariamente

Se o problema persistir, desative a migration automática:

```bash
# Editar fly.toml
[deploy]
  # release_command = "node_modules/.bin/sequelize db:migrate --env production"
```

Deploy sem migration:
```bash
flyctl deploy --app beautyhub-backend --no-release
```

Depois rode migration manualmente:
```bash
flyctl ssh console --app beautyhub-backend
npx sequelize-cli db:migrate
```

---

## ✅ CHECKLIST PARA RESOLVER

- [ ] Verificar se DATABASE_URL está setada no Fly.io
- [ ] Confirmar que a URL do Supabase está correta
- [ ] Testar DNS: `nslookup db.sbidpqhncyqmlbriyroo.supabase.co`
- [ ] Atualizar DATABASE_URL se necessário
- [ ] Retry do deploy

---

## 📝 COMANDOS ÚTEIS

```bash
# Verificar secrets
flyctl secrets list --app beautyhub-backend

# Ver logs do deploy
flyctl logs --app beautyhub-backend

# Status do app
flyctl status --app beautyhub-backend

# Ver releases
flyctl releases list --app beautyhub-backend

# SSH no container
flyctl ssh console --app beautyhub-backend

# Testar conexão com banco (dentro do container)
node -e "const {Sequelize} = require('sequelize'); const s = new Sequelize(process.env.DATABASE_URL, {dialect: 'postgres', ssl: true}); s.authenticate().then(() => console.log('OK')).catch(e => console.error(e))"
```

---

## 🎯 PRÓXIMO PASSO RECOMENDADO

1. Verifique se a `DATABASE_URL` está correta no Fly.io
2. Se estiver incorreta, atualize com a nova URL do Supabase
3. Retry: `flyctl deploy --app beautyhub-backend`

**Possível causa:** O projeto Supabase pode ter sido movido ou a URL mudou.

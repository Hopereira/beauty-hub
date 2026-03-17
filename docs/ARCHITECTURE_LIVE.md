# BeautyHub SaaS — Arquitetura de Produção

> Atualizado: 2026-03-17 (sessão de deploy completo) | Backend: **LIVE ✅** | Frontend: **LIVE ✅** | CI/CD: **LIVE ✅**

---

## 1. Diagrama Geral

```
                        USUÁRIO (Browser)
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
 biaxavier.com.br    app.biaxavier.com.br   cliente1.biaxavier.com.br
 (Landing Beatriz)   (SPA SaaS)            (Tenant Subdomain)
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                   Cloudflare Pages (CDN)
                   Serve: dist/ (Vite build)
                              │
                              ▼
                  api.biaxavier.com.br ──► Fly.io (GRU)
                  Node.js/Express:5001     │
                              │            │
                              ▼            │
                  Supabase PostgreSQL 15   │
                  db.sbidpqh...supabase.co │
                              │            │
                    ┌─────────┴─────────┐  │
                    ▼                   ▼  ▼
              Resend (emails)    UptimeRobot (monit.)
```

---

## 2. Mapa de Domínios

| Domínio | Função | Hosting | Status |
|---------|--------|---------|--------|
| `biaxavier.com.br` | Site/Landing da Beatriz | Cloudflare Pages | ✅ Live |
| `app.biaxavier.com.br` | SPA do SaaS (login, dashboard) | Cloudflare Pages | ✅ Live |
| `adm.biaxavier.com.br` | Painel Master (mesma SPA, rota /master) | Cloudflare Pages | ✅ Live |
| `api.biaxavier.com.br` | API Backend Node.js | Fly.io (beautyhub-backend) | ✅ Live |
| `*.biaxavier.com.br` | Tenants (multi-tenant) | Cloudflare Pages wildcard | ✅ Wildcard ativo |

### DNS Necessários

```
# API (Fly.io) — beautyhub-backend  ✅ CONFIGURADO
A     api   → 66.241.125.210
AAAA  api   → 2a09:8280:1::e4:20f0:0

# Frontend (Cloudflare Pages — projeto: beauty-hub)  ✅ CONFIGURADO
CNAME app   → beauty-hub.pages.dev   (proxied)
CNAME adm   → beauty-hub.pages.dev   (proxied)
CNAME *     → beauty-hub.pages.dev   (proxied, wildcard para tenants)
```

### Slugs Reservados (não são tenants)

```
www, api, app, adm, admin, mail, ftp, smtp, cdn, static, assets
```

---

## 3. Fluxo Multi-Tenant

```
cliente1.biaxavier.com.br
  │
  ├─ DNS *.biaxavier.com.br → Cloudflare Pages (mesma SPA)
  ├─ Frontend config.js → getTenantSlug()
  │    hostname.split('.')[0] = "cliente1" (não é reservado) → return "cliente1"
  ├─ http.js envia Header: X-Tenant-Slug: cliente1
  ├─ Backend tenantResolver.js resolve tenant no DB
  └─ Todas queries filtradas por tenant_id
```

---

## 4. Backend (Fly.io)

| Item | Valor |
|------|-------|
| App | `beautyhub-backend` |
| URL | `https://beautyhub-backend.fly.dev` ✅ |
| Custom | `https://api.biaxavier.com.br` ✅ |
| Região | `gru` (São Paulo) |
| Runtime | Node.js 20, Express, Sequelize 6 |
| Porta | 5001 |
| Máquinas | 256mb shared CPU, `min_machines_running=1` |
| Migrations | `release_command = node_modules/.bin/sequelize db:migrate` |

### Endpoints Principais

| Grupo | Rotas | Auth | Tenant |
|-------|-------|------|--------|
| **Público** | `/api/health`, `/api/auth/login`, `/api/billing/plans` | ❌ | ❌ |
| **Master** | `/api/master/tenants/*`, `/api/master/billing/*`, `/api/master/lgpd/*` | ✅ master | ❌ |
| **Tenant** | `/api/users/*`, `/api/tenant/*`, `/api/auth/me`, `/api/lgpd/*`, `/api/notifications/*` | ✅ | ✅ |
| **Owner** | `/api/services,clients,appointments,financial,professionals,products,suppliers,purchases,reports/*` | ✅ | ✅ + subscription |

### Secrets (Fly.io)

```
DATABASE_URL       → postgresql://postgres:***@db.sbidpqh...:5432/postgres?sslmode=require
NODE_ENV           → production
JWT_SECRET         → ***
JWT_REFRESH_SECRET → ***
CORS_ORIGIN        → https://app.biaxavier.com.br,https://adm.biaxavier.com.br
```

---

## 5. Frontend (Vite SPA)

| Item | Valor |
|------|-------|
| Framework | Vanilla JS ES6 Modules |
| Bundler | Vite 5 → `dist/` |
| API URL | `VITE_API_URL` ou `/api` (dev proxy) |
| Auth | JWT em localStorage |
| Tenant | Extraído do subdomain ou localStorage |

### Build de Produção

```bash
VITE_API_URL=https://api.biaxavier.com.br npm run build
```

### Rotas SPA

| Rota | Auth | Role |
|------|------|------|
| `/` Landing, `/login`, `/register` | ❌ | — |
| `/dashboard`, `/appointments`, `/clients`, `/services`, `/financial`, `/billing` | ✅ | any |
| `/inventory`, `/suppliers`, `/purchases`, `/reports` | ✅ | owner+ |
| `/professional/*` (7 rotas) | ✅ | professional |
| `/master`, `/master/tenants`, `/master/plans`, `/master/billing` | ✅ | master |

---

## 6. Banco de Dados (Supabase)

| Item | Valor |
|------|-------|
| Host | `db.sbidpqhncyqmlbriyroo.supabase.co:5432` |
| SSL | require |
| Migrations | 36 ✅ (036 adicionada nesta sessão — coluna `avatar`) |
| Seeds | subscription_plans + master_and_tenant ✅ |

### Tabelas Principais

```
users, tenants, subscriptions, subscription_plans
professionals, services, clients, appointments
financial_entries, financial_exits, payment_methods
products, suppliers, purchases, purchase_items
professional_details, payment_transactions, inventory_movements
invoices, usage_logs, establishments (legacy)
login_attempts          ← novo (migration 032)
lgpd_deletion_requests  ← novo (migration 035)
```

---

## 7. Credenciais de Teste (Produção)

| Role | Email | Senha | Tenant |
|------|-------|-------|--------|
| master | `master@beautyhub.com` | `123456` | — |
| owner | `owner@belezapura.com` | `123456` | `beleza-pura` |
| admin | `admin@belezapura.com` | `123456` | `beleza-pura` |
| professional | `prof@belezapura.com` | `123456` | `beleza-pura` |

---

## 8. Status das Correções Pós-Auditoria

| PR | Título | Status |
|----|--------|--------|
| #6 | JWT_SECRET obrigatório + bruteForce em /auth/login | ✅ Merged |
| #7 | SQL parametrizado + requireSubscription + migrations 032/033 | ✅ Merged |
| #8 | asyncHandler billing + DB_PASSWORD obrigatório + app.legacy removido | ✅ Merged |
| #10 | LGPD + Notifications + migrations 034/035 + 24 testes Jest | 🔄 PR aberto |

---

## 9. ⚠️ Problemas Residuais

### 9.1 Detecção de subdomain para domínios .com.br

O `getTenantSlug()` no frontend usa `hostname.split('.').length >= 3` para detectar subdomínio. Para domínios `.com.br` (TLD de 2 partes), isso gera falso positivo:

```
biaxavier.com.br → ["biaxavier","com","br"] → length=3 → sub="biaxavier" ❌ (falso tenant!)
app.biaxavier.com.br → ["app","biaxavier","com","br"] → length=4 → sub="app" → reservado ✅
cliente1.biaxavier.com.br → ["cliente1","biaxavier","com","br"] → length=4 → sub="cliente1" ✅
```

**Fix necessário**: Para `.com.br`, exigir `parts.length >= 4`. **Já implementado no frontend `config.js:34`** — verificar backend `tenantResolver.js`.

### 9.2 CORS para subdomínios de tenants

O `CORS_ORIGIN` atual só permite `app.biaxavier.com.br` e `adm.biaxavier.com.br`. Tenants em subdomínios (`cliente1.biaxavier.com.br`) serão bloqueados.

**Fix**: Usar regex ou wildcard no CORS:

```javascript
// app.multitenant.js
origin: (origin, callback) => {
  if (!origin || origin.endsWith('.biaxavier.com.br') || origin === 'https://biaxavier.com.br') {
    callback(null, true);
  } else {
    callback(new Error('CORS blocked'));
  }
}
```

### 9.3 Suite de Testes Jest

O job `Test` falha no CI (`continue-on-error: true`). Os testes precisam de variáveis de ambiente de banco de dados para rodar. Solução: criar banco de testes no Supabase ou mockar o Sequelize.

---

## 10. Próximos Passos

1. **Seeds produção**: Rodar `sequelize db:seed:all` para criar master user e planos de assinatura
2. **Testes Jest**: Corrigir suite de testes no CI (atualmente `continue-on-error`)
3. **CORS wildcard**: Suportar subdomínios de tenants (`*.biaxavier.com.br`)
4. **Fix subdomain backend**: Verificar `tenantResolver.js → extractSubdomain()` para `.com.br`
5. **Senhas padrão**: Alterar credenciais `123456` dos usuários de seed
6. **Redis**: Para tenant cache compartilhado em deploy multi-instância
7. **Emails**: Integrar Resend para transacionais (registro, reset senha)
8. **CSP**: Habilitar Helmet ContentSecurityPolicy com nonce para SPA
9. **Monitoramento**: Configurar alertas UptimeRobot para `api.biaxavier.com.br/api/health`

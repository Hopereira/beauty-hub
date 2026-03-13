# BeautyHub SaaS — Arquitetura de Produção

> Atualizado: 2026-03-13 | Backend: **LIVE ✅** | Frontend: **Pendente deploy**

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
| `biaxavier.com.br` | Site/Landing da Beatriz | Cloudflare Pages | 🔲 Pendente |
| `app.biaxavier.com.br` | SPA do SaaS (login, dashboard) | Cloudflare Pages | 🔲 Pendente |
| `adm.biaxavier.com.br` | Painel Master (mesma SPA, rota /master) | Cloudflare Pages | 🔲 Pendente |
| `api.biaxavier.com.br` | API Backend Node.js | Fly.io | ✅ Cert criado, DNS pendente |
| `*.biaxavier.com.br` | Tenants (multi-tenant) | Cloudflare Pages wildcard | 🔲 Pendente |

### DNS Necessários

```
# API (Fly.io)
A     api   → 66.241.125.104
AAAA  api   → 2a09:8280:1::e2:5ed6:0

# Frontend (Cloudflare Pages)
CNAME app   → <projeto>.pages.dev
CNAME adm   → <projeto>.pages.dev
CNAME *     → <projeto>.pages.dev   (wildcard para tenants)
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
| App | `backend-dawn-voice-9214` |
| URL | `https://backend-dawn-voice-9214.fly.dev` |
| Custom | `https://api.biaxavier.com.br` (após DNS) |
| Região | `gru` (São Paulo) |
| Runtime | Node.js 20, Express, Sequelize 6 |
| Porta | 5001 |

### Endpoints Principais

| Grupo | Rotas | Auth | Tenant |
|-------|-------|------|--------|
| **Público** | `/api/health`, `/api/auth/login`, `/api/billing/plans` | ❌ | ❌ |
| **Master** | `/api/master/tenants/*`, `/api/master/billing/*` | ✅ master | ❌ |
| **Tenant** | `/api/users/*`, `/api/tenant/*`, `/api/auth/me` | ✅ | ✅ |
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
| Migrations | 31 ✅ |
| Seeds | subscription_plans + master_and_tenant ✅ |

### Tabelas Principais

```
users, tenants, subscriptions, subscription_plans
professionals, services, clients, appointments
financial_entries, financial_exits, payment_methods
products, suppliers, purchases, purchase_items
professional_details, payment_transactions, inventory_movements
invoices, usage_logs, establishments (legacy)
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

## 8. ⚠️ Problemas Identificados

### 8.1 CRÍTICO: Detecção de subdomain para domínios .com.br

O `getTenantSlug()` no frontend usa `hostname.split('.').length >= 3` para detectar subdomínio. Para domínios `.com.br` (TLD de 2 partes), isso gera falso positivo:

```
biaxavier.com.br → ["biaxavier","com","br"] → length=3 → sub="biaxavier" ❌ (falso tenant!)
app.biaxavier.com.br → ["app","biaxavier","com","br"] → length=4 → sub="app" → reservado ✅
cliente1.biaxavier.com.br → ["cliente1","biaxavier","com","br"] → length=4 → sub="cliente1" ✅
```

**Fix necessário**: Para `.com.br`, exigir `parts.length >= 4`:

```javascript
// config.js → getTenantSlug()
const parts = hostname.split('.');
const isComBr = parts.slice(-2).join('.') === 'com.br';
const minParts = isComBr ? 4 : 3;
if (parts.length >= minParts) {
    const sub = parts[0].toLowerCase();
    if (!RESERVED_SLUGS.includes(sub)) return sub;
}
```

Mesmo fix necessário no backend `tenantResolver.js → extractSubdomain()`.

### 8.2 CORS para subdomínios de tenants

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

### 8.3 VITE_API_URL não configurado

O frontend precisa de `VITE_API_URL=https://api.biaxavier.com.br` no build. Sem isso, usa `/api` que só funciona com proxy local.

### 8.4 Frontend não deployado

O SPA ainda não está em Cloudflare Pages. Passos:
1. Criar projeto no Cloudflare Pages
2. Configurar build: `npm run build`, output `dist/`
3. Env var: `VITE_API_URL=https://api.biaxavier.com.br`
4. Custom domains: `app.biaxavier.com.br`, `adm.biaxavier.com.br`
5. Wildcard domain para tenants

---

## 9. Próximos Passos

1. **DNS**: Adicionar registros A/AAAA para `api.biaxavier.com.br` → Fly.io
2. **Fix subdomain**: Corrigir detecção de subdomain para `.com.br` (frontend + backend)
3. **Fix CORS**: Permitir wildcard `*.biaxavier.com.br`
4. **Deploy frontend**: Cloudflare Pages com `VITE_API_URL`
5. **Wildcard DNS**: `*.biaxavier.com.br → pages.dev`
6. **Monitoramento**: UptimeRobot para `api.biaxavier.com.br/api/health`
7. **Emails**: Integrar Resend para transacionais (welcome, reset password)
8. **Senhas**: Trocar credenciais padrão `123456` por senhas seguras

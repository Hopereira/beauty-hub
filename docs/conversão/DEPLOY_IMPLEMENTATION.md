# PLANO DE IMPLEMENTAÇÃO DE DEPLOY EM PRODUÇÃO
## BeautyHub SaaS — biaxavier.com.br

**Data:** 2026-03-12  
**Stack:** Vite SPA + Node.js/Express + PostgreSQL (Sequelize)  
**Infra:** Cloudflare Pages + Fly.io + Supabase + Resend + BetterStack + UptimeRobot

---

## 1 — ARQUITETURA FINAL VALIDADA

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE (DNS + CDN)                       │
│                                                                     │
│  biaxavier.com.br         → Cloudflare Pages (landing)              │
│  app.biaxavier.com.br     → Cloudflare Pages (SPA SaaS)             │
│  adm.biaxavier.com.br     → Cloudflare Pages (SPA SaaS)             │
│  api.biaxavier.com.br     → Fly.io (backend, CNAME)                 │
│  *.biaxavier.com.br       → Cloudflare Pages (SPA SaaS, wildcard)   │
└─────────────────────────────────────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
   ┌──────────▼──────────┐                 ┌────────────▼────────────┐
   │   Cloudflare Pages   │                 │        Fly.io           │
   │  (Frontend estático) │                 │  (Node.js + Express)    │
   │                      │  /api/* proxy   │  PORT 5001              │
   │  dist/ (Vite build)  │────────────────▶│  app.multitenant.js     │
   │  _redirects (SPA)    │                 │                         │
   │  _headers (cache)    │                 └────────────┬────────────┘
   └──────────────────────┘                              │
                                                         │ DATABASE_URL (SSL)
                                              ┌──────────▼──────────┐
                                              │       Supabase       │
                                              │  PostgreSQL 15       │
                                              │  PgBouncer (pool)    │
                                              │  31 migrations       │
                                              └──────────────────────┘
```

### Fluxo de multitenancy

```
Usuário acessa salonmaria.biaxavier.com.br
    │
    ▼
Cloudflare Pages serve index.html (SPA)
    │
    ▼
Frontend JS (http.js) envia header: X-Tenant-Slug: salonmaria
    │
    ▼
api.biaxavier.com.br/api/...  (Fly.io)
    │
    ▼
tenantResolver.js → SELECT * FROM tenants WHERE slug='salonmaria'
    │
    ▼
req.tenant injetado em todos os controllers (tenant_id isolation)
```

### Serviços de suporte

| Serviço | Função | Integração |
|---------|--------|-----------|
| Resend | Emails transacionais | `RESEND_API_KEY` no Fly.io secrets |
| BetterStack | Logs estruturados | Log drain HTTP no Fly.io |
| UptimeRobot | Uptime + alertas | Monitor externo `/api/health` |
| Cloudflare R2 | Storage (fase futura) | SDK S3-compat, variáveis `STORAGE_*` |

---

## 2 — CONFIGURAÇÃO DE DOMÍNIO (Cloudflare DNS)

### 2.1 Zona DNS no Cloudflare

Acesse **Cloudflare Dashboard → biaxavier.com.br → DNS → Records**

### 2.2 Registros necessários

| Tipo | Nome | Conteúdo | Proxy | TTL | Finalidade |
|------|------|----------|-------|-----|-----------|
| `CNAME` | `@` | `beautyhub-frontend.pages.dev` | ✅ Proxied | Auto | Landing institucional |
| `CNAME` | `app` | `beautyhub-frontend.pages.dev` | ✅ Proxied | Auto | Landing SaaS |
| `CNAME` | `adm` | `beautyhub-frontend.pages.dev` | ✅ Proxied | Auto | Painel admin |
| `CNAME` | `api` | `beautyhub-api.fly.dev` | ✅ Proxied | Auto | Backend API |
| `CNAME` | `*` | `beautyhub-frontend.pages.dev` | ✅ Proxied | Auto | Clientes (tenants) |

> **Atenção:** O registro wildcard `*` cobre automaticamente todos os subdomínios de clientes. O Cloudflare emite certificado TLS wildcard automaticamente quando o proxy está ativo.

### 2.3 Configuração de SSL/TLS no Cloudflare

1. **SSL/TLS → Overview** → Modo: **Full (strict)**
2. **SSL/TLS → Edge Certificates** → Ativar:
   - Always Use HTTPS: ✅
   - Automatic HTTPS Rewrites: ✅
   - Minimum TLS Version: TLS 1.2
3. **SSL/TLS → Custom Hostnames** (para wildcard de clientes):
   - Adicionar `*.biaxavier.com.br` se necessário para Pages

### 2.4 Cloudflare Pages — Domínios customizados

No dashboard **Cloudflare Pages → beautyhub-frontend → Custom domains**:
```
Adicionar: biaxavier.com.br
Adicionar: app.biaxavier.com.br
Adicionar: adm.biaxavier.com.br
Adicionar: *.biaxavier.com.br   (wildcard — requer plano Pro/Business)
```

> **Alternativa sem plano Pro:** Usar Cloudflare Workers como proxy para subdomínios de clientes (ver seção 6.3).

---

## 3 — CONFIGURAÇÃO DO BACKEND (Fly.io)

### 3.1 Instalar CLI e autenticar

```bash
# Instalar Fly CLI
curl -L https://fly.io/install.sh | sh

# Autenticar
flyctl auth login

# Criar app (primeira vez)
flyctl apps create beautyhub-api --org personal
```

### 3.2 fly.toml

O arquivo `fly.toml` (já criado na raiz) define toda a configuração:

```toml
# Arquivo: fly.toml (ver arquivo real no repositório)
app = "beautyhub-api"
primary_region = "gru"   # São Paulo
```

### 3.3 Variáveis de ambiente — Fly.io Secrets

Execute **uma vez** antes do primeiro deploy:

```bash
flyctl secrets set \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -hex 64) \
  JWT_REFRESH_SECRET=$(openssl rand -hex 64) \
  DATABASE_URL="postgresql://USER:PASS@db.XXXX.supabase.co:5432/postgres?sslmode=require" \
  CORS_ORIGIN="https://app.biaxavier.com.br,https://adm.biaxavier.com.br,https://*.biaxavier.com.br" \
  PAYMENT_PROVIDER=stripe \
  STRIPE_SECRET_KEY=sk_live_xxx \
  STRIPE_WEBHOOK_SECRET=whsec_xxx \
  RESEND_API_KEY=re_xxx \
  EMAIL_FROM=noreply@biaxavier.com.br \
  LOG_LEVEL=info \
  LOG_FORMAT=json \
  TRUST_PROXY=true \
  BILLING_DEFAULT_TRIAL_DAYS=30 \
  --app beautyhub-api
```

### 3.4 Deploy do backend

```bash
# Primeiro deploy
flyctl deploy --remote-only --config fly.toml --app beautyhub-api

# Executar migrations após deploy
flyctl ssh console --app beautyhub-api -C "node -e \"
  const { Sequelize } = require('sequelize');
  const { Umzug, SequelizeStorage } = require('umzug');
  // migrations executam via sequelize-cli
\""

# Ou via npm script (se existir)
flyctl ssh console --app beautyhub-api -C "npm run migrate"

# Verificar saúde
curl https://api.biaxavier.com.br/api/health
```

### 3.5 Configuração SSL no Sequelize para Supabase

Em `backend/src/config/database.js`, certifique-se que existe:
```js
dialectOptions: process.env.NODE_ENV === 'production' ? {
  ssl: { require: true, rejectUnauthorized: false }
} : {}
```

---

## 4 — CONFIGURAÇÃO DO FRONTEND (Cloudflare Pages)

### 4.1 Configuração de build no Cloudflare Pages Dashboard

```
Framework preset:   None (Vite customizado)
Build command:      npm run build
Build output dir:   dist
Root directory:     /  (raiz do repositório)
Node version:       20
```

### 4.2 Variáveis de ambiente no Cloudflare Pages

**Pages → Settings → Environment variables → Production:**

```
VITE_API_URL    = https://api.biaxavier.com.br
VITE_APP_URL    = https://app.biaxavier.com.br
NODE_VERSION    = 20
```

### 4.3 Arquivos de configuração Pages

`public/_redirects` (SPA fallback — já criado):
```
/* /index.html 200
```

`public/_headers` (cache e segurança — já criado):
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/index.html
  Cache-Control: no-cache, no-store, must-revalidate
```

### 4.4 VITE_API_URL no http.js

O frontend deve usar a variável de ambiente. Em `src/shared/utils/http.js`:
```js
const API_BASE = import.meta.env.VITE_API_URL || '';
```
Isso garante que em desenvolvimento use URL relativa (`/api/...`) e em produção use `https://api.biaxavier.com.br/api/...`.

---

## 5 — CONFIGURAÇÃO DE MULTITENANCY

### 5.1 RESERVED_SLUGS (já corrigido)

`backend/src/shared/middleware/tenantResolver.js` — já possui:
```js
const RESERVED_SLUGS = ['www', 'api', 'app', 'adm', 'admin', 'mail', 'ftp', 'smtp', 'cdn', 'static', 'assets'];
```

### 5.2 Como cada subdomínio se comporta

| Subdomínio | Tratamento | Resultado |
|-----------|-----------|---------|
| `app.biaxavier.com.br` | Reservado → não resolve como tenant | Serve SPA, frontend pede login/cadastro |
| `adm.biaxavier.com.br` | Reservado → não resolve como tenant | Serve SPA, frontend roteia para `/master` |
| `api.biaxavier.com.br` | Reservado → não resolve como tenant | Backend, sem tenant context |
| `salonmaria.biaxavier.com.br` | Resolve slug `salonmaria` | Backend injeta `req.tenant` |

### 5.3 nginx.prod.conf — regex corrigida

Já corrigido para o domínio real:
```nginx
if ($host ~* ^([^.]+)\.biaxavier\.com\.br$) {
    set $tenant_slug $1;
}
```

> **Nota:** Com Cloudflare Pages (sem nginx próprio), o frontend não faz extração de subdomínio. É responsabilidade do `http.js` enviar o header `X-Tenant-Slug`. O frontend deve extrair o slug do `window.location.hostname` e incluí-lo em todas as requests.

### 5.4 Extração do tenant no frontend (http.js)

Garantir que `http.js` extrai e envia o slug:
```js
function getTenantSlug() {
  const host = window.location.hostname;
  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    const reserved = ['www', 'app', 'adm', 'api'];
    if (!reserved.includes(sub)) return sub;
  }
  return null;
}
```

---

## 6 — CONFIGURAÇÃO DO BANCO DE DADOS (Supabase)

### 6.1 Criar projeto no Supabase

1. Acessar [supabase.com](https://supabase.com) → New Project
2. Região: **South America (São Paulo)** — `sa-east-1`
3. Anotar as credenciais:
   - `Project URL`
   - `DB Password`
   - `Connection string` (pooler — Transaction mode)

### 6.2 Connection String correta

No Supabase → **Settings → Database → Connection string → URI**:

```
# Direto (para migrations — Session mode)
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require

# Via PgBouncer (para aplicação — Transaction mode)
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
```

> **Importante:** Use a connection string de **Transaction mode (PgBouncer)** no Fly.io para evitar esgotar conexões.  
> Use a **Direct connection** apenas para executar migrations (Sequelize não é compatível com PgBouncer em Transaction mode para migrations).

### 6.3 Executar migrations no Supabase

```bash
# Setar DATABASE_URL temporário para migrations (direct, sem pooler)
export DATABASE_URL="postgresql://postgres:PASS@db.XXX.supabase.co:5432/postgres?sslmode=require"

# Via Fly.io console
flyctl ssh console --app beautyhub-api
> npx sequelize-cli db:migrate
> npx sequelize-cli db:seed --seed 001_seed_subscription_plans.js
> npx sequelize-cli db:seed --seed 002_seed_master_and_tenant.js
```

### 6.4 Pool de conexões recomendado

```env
# Para Fly.io com PgBouncer
DB_POOL_MAX=5          # máximo por instância (Supabase free = 15 total)
DB_POOL_MIN=1
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
```

### 6.5 Backup

Supabase Pro: backup diário automático + PITR (7 dias).  
Free tier: backup manual via `pg_dump`.

```bash
pg_dump "postgresql://postgres:PASS@db.XXX.supabase.co:5432/postgres?sslmode=require" \
  --no-acl --no-owner -Fc > backup_$(date +%Y%m%d).dump
```

---

## 7 — SEGURANÇA

### 7.1 Checklist de secrets pré-deploy

```bash
# Gerar secrets seguros (execute no terminal)
echo "JWT_SECRET=$(openssl rand -hex 64)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 64)"
echo "DB_PASSWORD=$(openssl rand -base64 32)"
```

**Nunca commitar** os valores reais. Usar apenas `flyctl secrets set` e Cloudflare Pages env vars.

### 7.2 CORS em produção

Em `backend/src/config/env.js` ou diretamente via Fly secret:
```env
CORS_ORIGIN=https://app.biaxavier.com.br,https://adm.biaxavier.com.br,https://biaxavier.com.br
```

Para subdomínios wildcard, o `app.multitenant.js` já possui:
```js
const isSubdomain = allowedOrigins.some(allowed => {
  const pattern = allowed.replace('*.', '.*\\.');
  return new RegExp(`^${pattern}$`).test(origin);
});
```

### 7.3 Rate limiting — corrigir hardcode

Em `app.multitenant.js` o rate limit global está hardcoded em 500. Corrigir para ler do env:

```js
// Atual (hardcoded):
max: 500,
// Deve ser:
max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
```

### 7.4 Headers de segurança

Helmet já ativo. Adicionar ao `_headers` do Cloudflare Pages:
```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 7.5 Stripe/Webhook security

O webhook `/api/billing/webhooks/stripe` já verifica assinatura HMAC. Garantir que `STRIPE_WEBHOOK_SECRET` está configurado e que o Nginx/Cloudflare não interfere no raw body.

---

## 8 — CI/CD (GitHub Actions)

O arquivo `.github/workflows/deploy.yml` (já criado) define o pipeline:

### 8.1 Fluxo do pipeline

```
Push para branch main
    │
    ├── Job: test
    │   ├── npm ci (backend)
    │   └── npm test (se existir)
    │
    ├── Job: deploy-frontend (needs: test)
    │   ├── npm ci
    │   ├── npm run build
    │   └── wrangler pages deploy dist/ (Cloudflare Pages)
    │
    └── Job: deploy-backend (needs: test)
        ├── flyctl deploy --remote-only
        └── flyctl ssh console -C "npm run migrate"
```

### 8.2 Secrets no GitHub

Configurar em **GitHub → Settings → Secrets → Actions**:

```
CF_API_TOKEN          # Cloudflare API token (permissão: Pages:Edit)
CF_ACCOUNT_ID         # Cloudflare Account ID
FLY_API_TOKEN         # flyctl auth token (flyctl auth token)
```

### 8.3 Obter tokens

```bash
# Fly.io token
flyctl auth token

# Cloudflare token
# Dashboard → My Profile → API Tokens → Create Token
# Template: "Edit Cloudflare Pages"
```

---

## 9 — MONITORAMENTO

### 9.1 UptimeRobot

Criar monitores em [uptimerobot.com](https://uptimerobot.com):

| Monitor | URL | Intervalo | Alerta |
|---------|-----|-----------|--------|
| API Health | `https://api.biaxavier.com.br/api/health` | 5 min | Email + Telegram |
| Frontend | `https://app.biaxavier.com.br` | 5 min | Email |
| Landing | `https://biaxavier.com.br` | 5 min | Email |

### 9.2 BetterStack (Logs)

**Opção 1 — Log drain do Fly.io (recomendado):**
```bash
# No BetterStack: Sources → Create source → Fly.io
# Copiar o endpoint HTTPS de ingestão

flyctl logs --app beautyhub-api  # verificar logs antes
# Configurar drain:
flyctl extensions sentry create  # ou usar HTTP drain manual
```

**Opção 2 — Winston transport (via código):**

Em `backend/src/shared/utils/logger.js`, adicionar transport HTTP:
```js
if (process.env.BETTERSTACK_SOURCE_TOKEN) {
  const { Logtail } = require('@logtail/node');
  const { LogtailTransport } = require('@logtail/winston');
  const logtail = new Logtail(process.env.BETTERSTACK_SOURCE_TOKEN);
  logger.add(new LogtailTransport(logtail));
}
```

Instalar: `npm install @logtail/node @logtail/winston`

### 9.3 Alertas de billing

Configurar no Stripe Dashboard:
- Email alerts para pagamentos falhos
- Webhook para `/api/billing/webhooks/stripe` (já implementado)

---

## 10 — CHECKLIST FINAL DE DEPLOY

Execute em ordem. Marque cada item antes de avançar.

### PRÉ-DEPLOY

```
[ ] 1.  Conta Cloudflare criada e zona biaxavier.com.br adicionada
[ ] 2.  Conta Fly.io criada e CLI instalado (flyctl auth login)
[ ] 3.  Projeto Supabase criado (região sa-east-1)
[ ] 4.  Conta Resend criada e domínio biaxavier.com.br verificado
[ ] 5.  Conta BetterStack criada e source configurado
[ ] 6.  Repositório no GitHub com secrets configurados (CF_API_TOKEN, FLY_API_TOKEN)
[ ] 7.  Secrets gerados: JWT_SECRET, JWT_REFRESH_SECRET, DB_PASSWORD (openssl rand)
[ ] 8.  fly.toml presente na raiz do repositório
[ ] 9.  public/_redirects e public/_headers presentes
[ ] 10. VITE_API_URL configurado em http.js / vite.config.js
```

### BANCO DE DADOS

```
[ ] 11. Supabase: connection string (direct) anotada
[ ] 12. Supabase: connection string (pooler Transaction mode) anotada
[ ] 13. DATABASE_URL setado no Fly.io secrets (usar pooler para app)
[ ] 14. SSL configurado em database.js (rejectUnauthorized: false para Supabase)
[ ] 15. Migrations executadas: npx sequelize-cli db:migrate
[ ] 16. Seeds executados: subscription_plans + master_and_tenant
[ ] 17. Login testado: master@beautyhub.com / 123456
```

### BACKEND (Fly.io)

```
[ ] 18. flyctl apps create beautyhub-api
[ ] 19. Todos os secrets setados via flyctl secrets set
[ ] 20. flyctl deploy --remote-only executado com sucesso
[ ] 21. GET https://api.biaxavier.com.br/api/health → {"success":true}
[ ] 22. Rate limit RATE_LIMIT_MAX=100 configurado (não hardcoded)
[ ] 23. CORS_ORIGIN inclui todos os domínios necessários
```

### DNS (Cloudflare)

```
[ ] 24. CNAME @ → beautyhub-frontend.pages.dev (proxied)
[ ] 25. CNAME app → beautyhub-frontend.pages.dev (proxied)
[ ] 26. CNAME adm → beautyhub-frontend.pages.dev (proxied)
[ ] 27. CNAME api → beautyhub-api.fly.dev (proxied)
[ ] 28. CNAME * → beautyhub-frontend.pages.dev (proxied)
[ ] 29. SSL/TLS modo Full (strict)
[ ] 30. Always Use HTTPS: ativado
```

### FRONTEND (Cloudflare Pages)

```
[ ] 31. Projeto criado no Cloudflare Pages conectado ao repositório GitHub
[ ] 32. Build command: npm run build | Output: dist | Node: 20
[ ] 33. VITE_API_URL=https://api.biaxavier.com.br configurado
[ ] 34. Domínios customizados adicionados (biaxavier.com.br, app.*, adm.*, *.*)
[ ] 35. Deploy bem-sucedido: https://app.biaxavier.com.br carrega SPA
[ ] 36. Rota /login acessível
[ ] 37. Rota /privacy-policy acessível
```

### MULTITENANCY

```
[ ] 38. app.biaxavier.com.br NÃO resolve como tenant (RESERVED_SLUGS ok)
[ ] 39. adm.biaxavier.com.br NÃO resolve como tenant
[ ] 40. teste1.biaxavier.com.br → X-Tenant-Slug: teste1 injetado
[ ] 41. Login com owner@belezapura.com no tenant beleza-pura funciona
[ ] 42. Isolamento verificado: tenant A não acessa dados de tenant B
```

### SEGURANÇA

```
[ ] 43. JWT_SECRET rotacionado (não é o valor padrão do .env.example)
[ ] 44. Stripe webhook registrado com URL de produção
[ ] 45. Cloudflare Bot Fight Mode: ativado
[ ] 46. Cloudflare → Scrape Shield → E-mail obfuscation: ativado
```

### MONITORAMENTO

```
[ ] 47. UptimeRobot: 3 monitores criados e alertas configurados
[ ] 48. BetterStack: logs chegando (testar com uma request ao /api/health)
[ ] 49. Fly.io → Metrics: dashboard visível
[ ] 50. Supabase → Database → Logs: queries visíveis
```

### CI/CD

```
[ ] 51. .github/workflows/deploy.yml presente no repositório
[ ] 52. Push para main: pipeline disparado com sucesso
[ ] 53. Deploy automático frontend verificado no Cloudflare Pages
[ ] 54. Deploy automático backend verificado no Fly.io
[ ] 55. Migrations rodando automaticamente no pipeline
```

### PÓS-DEPLOY — SMOKE TEST

```
[ ] 56. Cadastro de novo tenant via app.biaxavier.com.br
[ ] 57. Login com novo tenant no slug gerado
[ ] 58. Criar cliente → verificar isolamento
[ ] 59. Criar agendamento → salvo com tenant_id correto
[ ] 60. Email de boas-vindas recebido (Resend)
[ ] 61. Fatura de cobrança gerada (billing)
[ ] 62. Master login: master@beautyhub.com → /master funcional
```

---

## APÊNDICE — REFERÊNCIAS RÁPIDAS

### Comandos frequentes

```bash
# Ver logs em tempo real
flyctl logs --app beautyhub-api

# SSH no container
flyctl ssh console --app beautyhub-api

# Ver secrets configurados
flyctl secrets list --app beautyhub-api

# Escalar instâncias
flyctl scale count 2 --app beautyhub-api

# Rollback
flyctl releases --app beautyhub-api
flyctl deploy --image registry.fly.io/beautyhub-api:v<N> --app beautyhub-api

# Migrations manualmente
flyctl ssh console --app beautyhub-api -C "npx sequelize-cli db:migrate"
```

### Custos estimados (mês)

| Serviço | Plano | Custo |
|---------|-------|-------|
| Fly.io (1 instância shared-cpu-1x, 256MB) | Pay-as-go | ~$0–5 |
| Cloudflare Pages | Free | $0 |
| Cloudflare DNS + CDN | Free | $0 |
| Supabase | Free (500MB, 2 conn) / Pro $25 | $0–25 |
| Resend | Free (3k emails/mês) | $0 |
| BetterStack | Free (1GB/mês) | $0 |
| UptimeRobot | Free (50 monitores) | $0 |
| **Total fase inicial** | | **~$0–30/mês** |

---

*Documento gerado com base na análise real do repositório BeautyHub. Ver `docs/DEPLOY_AUDIT.md` para lista completa de riscos e lacunas identificadas.*

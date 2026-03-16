# RELATÓRIO TÉCNICO DE AUDITORIA — DEPLOY E ARQUITETURA SAAS
## BeautyHub / biaxavier.com.br

**Data:** 2026-03-12  
**Auditor:** Arquitetura Interna  
**Escopo:** Viabilidade de produção, lacunas de infra, segurança, escalabilidade e próximos passos  
**Método:** Análise arquivo-a-arquivo do filesystem real + plano de infra declarado

---

## 1 — ANÁLISE DA ARQUITETURA

**Classificação: ✅ ADEQUADA — com lacunas de operacionalização**

A arquitetura SaaS implementada no BeautyHub é tecnicamente correta e alinhada com padrões modernos:

| Dimensão | Status | Evidência |
|----------|--------|-----------|
| Multi-tenancy | ✅ Implementado | `tenantResolver.js` — extrai slug de header > subdomínio > query param |
| Isolamento por tenant_id | ✅ Implementado | Todos os módulos `owner-*` usam `req.tenant.id` |
| RBAC hierárquico | ✅ Implementado | `MASTER > OWNER > ADMIN > PROFESSIONAL > CLIENT` |
| Subscription enforcement | ✅ Implementado | `requireActiveSubscription()` em todos os módulos OWNER |
| Billing multi-provider | ✅ Implementado | Stripe + Pagar.me + Mock (`modules/billing/providers/`) |
| JWT dual-token | ✅ Implementado | Access (1h) + Refresh (7d), auto-refresh no `http.js` |
| CORS com subdomínios | ✅ Implementado | Regex wildcard em `app.multitenant.js` linha 64 |
| SPA com lazy-loading | ✅ Implementado | `router.js` — 35 rotas com imports dinâmicos |
| Dockerfile multi-stage | ✅ Implementado | `Dockerfile.prod` — deps → production, non-root user |
| Nginx prod-ready | ✅ Implementado | `nginx.prod.conf` — rate limiting, gzip, JSON logs, upstream keepalive |

**Lacunas críticas de operacionalização:**
- Configurações de infra cloud (Fly.io, Cloudflare Pages, Supabase) **não existem** no repositório
- Cache em memória (`Map`) em `tenantResolver.js` e `bruteForceProtection` **não sobrevivem** a reinícios ou múltiplas instâncias
- Pipeline CI/CD **não existe** no repositório

---

## 2 — COMPONENTES EXISTENTES

### 2.1 Backend — O que JÁ existe

| Componente | Arquivo | Estado |
|-----------|---------|--------|
| App multi-tenant | `backend/src/app.multitenant.js` | ✅ Produção-ready |
| Tenant resolver + cache | `backend/src/shared/middleware/tenantResolver.js` | ✅ Funcional (cache em memória) |
| Rate limiting global | `app.multitenant.js` — `rateLimit` (500/15min) | ⚠️ Hardcoded, não lê env |
| Rate limiting auth | `app.multitenant.js` — `authLimiter` (20/15min) | ✅ OK |
| Brute force protection | `backend/src/shared/middleware/bruteForceProtection.js` | ⚠️ In-memory |
| Helmet (security headers) | `app.multitenant.js` linha 40 | ✅ Ativo |
| Health check | `GET /api/health`, `GET /api/health/schema` | ✅ Pronto |
| 31 migrations Sequelize | `backend/src/migrations/` | ✅ Completo |
| 15 módulos backend | `backend/src/modules/` | ✅ Completo |
| Billing + webhooks | `modules/billing/` — 41 arquivos | ✅ Stripe + Pagar.me + Mock |
| LGPD service | `modules/tenants/lgpd.service.js` | ✅ Existe |
| Dockerfiles | `Dockerfile`, `Dockerfile.prod` | ✅ Multi-stage |
| Docker Compose dev | `docker-compose.yml` | ✅ 3 serviços |
| Docker Compose prod | `docker-compose.prod.yml` | ✅ Resource limits, JSON logs |
| Nginx dev | `nginx/nginx.conf` | ✅ Funcional |
| Nginx prod | `nginx/nginx.prod.conf` | ✅ Rate zones, upstream keepalive |
| Variables de ambiente | `.env.example` | ✅ Documentado |

### 2.2 Frontend — O que JÁ existe

| Componente | Arquivo | Estado |
|-----------|---------|--------|
| SPA Vite + Vanilla JS | `src/` | ✅ Build em 572ms, 37 páginas |
| HTTP client com tenant header | `src/shared/utils/http.js` | ✅ JWT auto-refresh, `X-Tenant-Slug` |
| Router SPA 35 rotas | `src/core/router.js` | ✅ Lazy load, auth guard, role guard |
| Páginas públicas legais | `src/features/public/privacy-policy.js` etc. | ✅ 3 páginas recém-criadas |
| RBAC no sidebar | `src/shared/components/shell/shell.js` | ✅ 18 itens OWNER + 7 PROFESSIONAL |

---

## 3 — COMPONENTES FALTANTES (LACUNAS)

### 3.1 Infra Cloud — O que FALTA implementar

| Serviço Planejado | Arquivo necessário | Status |
|-------------------|--------------------|--------|
| **Fly.io** (backend) | `fly.toml` | ❌ Não existe |
| **Cloudflare Pages** (frontend) | `_headers`, `_redirects` ou `wrangler.toml` | ❌ Não existe |
| **Supabase** (banco) | `DATABASE_URL` com connection string Supabase | ❌ Não configurado |
| **Cloudflare R2** (storage) | SDK `@aws-sdk/client-s3`, `STORAGE_*` env vars | ❌ Não integrado |
| **Resend** (emails) | `RESEND_API_KEY` env, email service wrapper | ❌ Não integrado |
| **BetterStack** (logs) | Log shipper / winston transport | ❌ Não integrado |
| **UptimeRobot** | Configuração externa (sem código) | ⚪ Externo |
| **Redis / Upstash** (cache) | Comentado em `docker-compose.prod.yml` | ❌ Não implementado |

### 3.2 CI/CD — O que FALTA

| Item | Status |
|------|--------|
| GitHub Actions workflow | ❌ Não existe `.github/workflows/` |
| Pipeline: build frontend → deploy Cloudflare Pages | ❌ Não existe |
| Pipeline: build backend → deploy Fly.io | ❌ Não existe |
| Step de migrations automáticas pós-deploy | ❌ Manual via `docker exec` |
| Secrets de CI (JWT, DB, API keys) | ❌ Não configurados em repositório remoto |

### 3.3 Domínio e TLS

| Item | Status |
|------|--------|
| Wildcard DNS `*.biaxavier.com.br` | ❌ Precisa criar no Cloudflare |
| Certificado wildcard TLS | ❌ Cloudflare gerencia automaticamente com proxy ativo |
| `nginx.prod.conf` — regex hardcoded `beautyhub.com` | ⚠️ **Conflito** — linha 140 usa `beautyhub.(com\|local)`, deve ser `biaxavier.com.br` |
| Rota `adm.biaxavier.com.br` | ❌ Nenhum `server_name` dedicado no nginx |
| Rota `app.biaxavier.com.br` | ❌ Nenhum `server_name` dedicado para landing SaaS |

---

## 4 — ANÁLISE DA ESTRUTURA DE DOMÍNIO

```
biaxavier.com.br          → landing institucional
app.biaxavier.com.br      → landing SaaS / onboarding  ← mesmo SPA, rota /
adm.biaxavier.com.br      → painel admin               ← mesmo SPA, rota /master
api.biaxavier.com.br      → API backend                ← container Fly.io
*.biaxavier.com.br        → clientes (tenants)          ← mesmo frontend, tenant por subdomínio
```

**Conflito identificado:** O `nginx.prod.conf` extrai o tenant do host com:
```nginx
if ($host ~* ^([^.]+)\.beautyhub\.(com|local)$) {
```
Isso **não vai funcionar** com `biaxavier.com.br`. Deve ser:
```nginx
if ($host ~* ^([^.]+)\.biaxavier\.com\.br$) {
```

**Conflito adicional:** `adm.biaxavier.com.br` e `app.biaxavier.com.br` precisam de `server_name` específicos no nginx (ou Cloudflare Workers/Pages routing) para não serem resolvidos como tenants com slug `adm` e `app`.

**Solução recomendada:** Lista de slugs reservados no `tenantResolver.js`:
```js
const RESERVED_SLUGS = ['www', 'api', 'app', 'adm', 'mail', 'ftp'];
```

---

## 5 — ANÁLISE DE INFRAESTRUTURA CLOUD

### 5.1 Cloudflare Pages (Frontend)

**Compatibilidade:** ✅ Alta — Vite gera `dist/` estático.

**O que falta:**
- `_redirects` para SPA fallback:
  ```
  /* /index.html 200
  ```
- `_headers` para cache control e CSP
- Configurar variável `VITE_API_URL=https://api.biaxavier.com.br`

**Risco:** Frontend hoje faz chamadas para `/api/*` relativo (mesmo host). Com Cloudflare Pages + Fly.io separados, precisará de URL absoluta configurada via variável de build.

### 5.2 Fly.io (Backend)

**Compatibilidade:** ✅ Alta — Node.js 20, Dockerfile.prod pronto.

**O que falta:**
```toml
# fly.toml (mínimo necessário)
app = "beautyhub-api"
[build]
  dockerfile = "backend/Dockerfile.prod"
[env]
  NODE_ENV = "production"
  PORT = "5001"
[[services]]
  internal_port = 5001
  protocol = "tcp"
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
  [services.concurrency]
    type = "requests"
    hard_limit = 250
    soft_limit = 200
[[services.http_checks]]
  path = "/api/health"
```

**Risco:** Backend exposto diretamente na porta 443; precisa configurar `TRUST_PROXY=true` (já está no docker-compose.prod.yml mas precisa estar em `fly.toml` secrets).

### 5.3 Supabase (PostgreSQL)

**Compatibilidade:** ✅ Alta — Sequelize suporta qualquer PostgreSQL 15.

**Mudança necessária:** Trocar `DB_HOST/PORT/NAME/USER/PASSWORD` por `DATABASE_URL`:
```env
DATABASE_URL=postgresql://user:password@db.xxx.supabase.co:5432/postgres?sslmode=require
```
E habilitar SSL no `config/database.js` (verificar se já suporta `ssl: { require: true }`).

**Risco:** Connection pooling — Supabase tem limite por plano. Com `DB_POOL_MAX=20` e 2+ instâncias Fly.io = 40 conexões. Considerar **PgBouncer** (disponível no Supabase) ou reduzir pool.

### 5.4 Cloudflare R2 (Storage)

**Estado:** ❌ Não há nenhuma integração de upload/storage no sistema.

**Quando implementar:** Ao adicionar upload de fotos de perfil, imagens de serviços ou documentos.

### 5.5 Resend (Emails)

**Estado:** ❌ Não integrado. O módulo `notifications` existe mas usa rotas legadas.

**Impacto imediato:** Emails de boas-vindas, confirmação de agendamento e cobrança não são enviados. O módulo `billing/` tem hooks para emails mas sem provider real configurado.

---

## 6 — ANÁLISE DE MULTITENANCY

**Classificação: ✅ Implementado corretamente — com risco de escala**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| Resolução de tenant | ✅ | Header `X-Tenant-Slug` > subdomínio > query param (dev) |
| Isolamento no banco | ✅ | Todos os queries usam `WHERE tenant_id = req.tenant.id` |
| Validação de consistência JWT | ✅ | `validateTenantConsistency` verifica `req.user.tenantId === req.tenantId` |
| Cache de tenant | ⚠️ | `Map` in-memory, TTL 60s — **não persiste em reinícios, quebra em multi-instância** |
| Suspensão de tenant | ✅ | Status `SUSPENDED` e `CANCELLED` bloqueiam acesso |
| Slugs reservados | ❌ | `adm`, `app`, `api` não estão na lista de exclusão do resolver |

**Risco crítico de multitenancy:** Se `app.biaxavier.com.br` chamar a API sem o header `X-Tenant-Slug`, o `tenantResolver` vai tentar resolver `app` como slug de tenant → `TenantError: "app" não encontrado`. Deve-se:
1. Adicionar lista de slugs reservados
2. OU garantir que o frontend sempre envie `X-Tenant-Slug` explícito via `http.js`

---

## 7 — ANÁLISE DE SEGURANÇA

| Item | Status | Criticidade |
|------|--------|-------------|
| JWT_SECRET padrão inseguro | ⚠️ | 🔴 CRÍTICO — deve ser rotacionado antes de produção |
| DB_PASSWORD padrão inseguro | ⚠️ | 🔴 CRÍTICO — `beautyhub_secret_2026` no `.env.example` |
| Rate limit hardcoded 500/req | ⚠️ | 🟡 MÉDIO — não lê `RATE_LIMIT_MAX` do env |
| CORS OPTIONS em nginx.conf dev | ⚠️ | 🟡 MÉDIO — `Access-Control-Allow-Origin: *` no dev nginx |
| Helmet ativo | ✅ | — |
| Brute force protection | ⚠️ | 🟡 MÉDIO — in-memory, não persiste |
| Nginx oculta arquivos `.` | ✅ | — |
| Dockerfile.prod non-root | ✅ | — |
| HTTPS via Cloudflare proxy | ✅ | Requer Cloudflare como intermediário |
| Webhook signature verification | ✅ | Billing webhooks verificam assinatura |
| Segredos em `.env.example` | ✅ | Apenas exemplos, `.env` está no `.gitignore` |

**Ação imediata pré-deploy:**
```bash
# Gerar secrets seguros
openssl rand -hex 64  # JWT_SECRET
openssl rand -hex 64  # JWT_REFRESH_SECRET
openssl rand -base64 32  # DB_PASSWORD
```

---

## 8 — ANÁLISE DE ESCALABILIDADE

| Componente | Escala Atual | Limite | Solução |
|-----------|--------------|--------|---------|
| Frontend (Cloudflare Pages) | Global CDN | Ilimitado | ✅ Adequado |
| Backend (Fly.io, 1 instância) | ~250 req/s | CPU-bound | Fly.io auto-scale ou 2+ instâncias |
| PostgreSQL (Supabase) | Pool 20 conn | Plano-dependente | PgBouncer ativo |
| Tenant cache (Map in-memory) | 1 instância | ❌ Quebra em 2+ instâncias | Redis / Upstash |
| Session/brute force (in-memory) | 1 instância | ❌ Quebra em 2+ instâncias | Redis / Upstash |
| Rate limiting (express-rate-limit) | 1 instância | ❌ Contador por processo | Redis store para `express-rate-limit` |

**Conclusão de escalabilidade:** O sistema é funcional para **single-instance** (fase inicial). Para escalar horizontalmente, o **Redis/Upstash é pré-requisito**, bloqueando: tenant cache, brute force e rate limiting distribuído.

---

## 9 — AUTOMAÇÃO DE DEPLOY (CI/CD)

**Estado atual:** ❌ Não existe pipeline. Deploy é 100% manual.

**Pipeline recomendado (GitHub Actions):**

```
on: push to main
├── Job: test
│   └── npm ci && npm test
├── Job: build-frontend (depends: test)
│   ├── npm ci && npm run build
│   └── Deploy to Cloudflare Pages (wrangler)
└── Job: deploy-backend (depends: test)
    ├── fly deploy --remote-only
    └── fly ssh console -C "node scripts/migrate.js"
```

**Arquivos a criar:**
- `.github/workflows/deploy.yml`
- `fly.toml` (raiz do projeto)
- `_redirects` e `_headers` (pasta `public/` do Vite)

---

## 10 — MONITORAMENTO

| Ferramenta | Estado | Configuração necessária |
|-----------|--------|------------------------|
| **UptimeRobot** | ⚪ Externo | Monitorar `https://api.biaxavier.com.br/api/health` e `https://app.biaxavier.com.br` |
| **BetterStack** | ❌ Não integrado | Adicionar winston transport ou HTTP drain para logs do Fly.io |
| Healthcheck `/api/health` | ✅ Existe | Retorna versão, uptime, timestamp |
| Healthcheck `/api/health/schema` | ⚠️ Bug | Linha 151: `sequelize` usado antes de ser definido (`const { sequelize } = modules` está na linha 184) |
| Logs Nginx (JSON) | ✅ `nginx.prod.conf` | Configurado em formato JSON com tenant slug |

**Bug crítico detectado:** Em `app.multitenant.js`, o endpoint `/api/health/schema` (linha 145-174) usa `sequelize` antes que a variável seja declarada (linha 184). Isso vai causar `ReferenceError` em produção se esse endpoint for chamado.

---

## 11 — GESTÃO DE CLIENTES SAAS

| Funcionalidade | Estado |
|---------------|--------|
| Self-signup via landing | ✅ `OnboardingService` + `POST /api/signup` |
| Criação automática de tenant + slug | ✅ `onboarding.service.js` |
| Trial de 30 dias | ✅ `BILLING_DEFAULT_TRIAL_DAYS=30` |
| Suspensão por inadimplência | ✅ `requireActiveSubscription()` + grace period |
| Painel MASTER para gerenciar tenants | ✅ `/master/tenants`, `/master/billing` |
| Email de boas-vindas | ❌ Resend não integrado |
| Email de cobrança / fatura | ❌ Resend não integrado |
| Portal de faturas para tenant | ✅ `/billing` frontend + `modules/billing/` |
| Exclusão de dados (LGPD) | ✅ `lgpd.service.js` + página `/data-deletion` |

---

## 12 — RISCOS TÉCNICOS PRIORIZADOS

| # | Risco | Severidade | Impacto | Mitigação |
|---|-------|-----------|---------|-----------|
| R1 | JWT/DB secrets padrão em produção | 🔴 CRÍTICO | Comprometimento total | Rotacionar antes do primeiro deploy |
| R2 | Regex de subdomínio com `beautyhub.com` | 🔴 CRÍTICO | Multitenancy quebrado | Corrigir para `biaxavier.com.br` |
| R3 | Bug `sequelize` indefinido em `/health/schema` | 🔴 CRÍTICO | Crash em produção | Mover declaração para linha 144 |
| R4 | Cache in-memory não escala | 🟠 ALTO | Quebra ao escalar | Implementar Redis/Upstash antes de 2ª instância |
| R5 | Frontend usa `/api/*` relativo | 🟠 ALTO | 404 em Cloudflare Pages | Adicionar `VITE_API_URL` env var |
| R6 | Slugs reservados não bloqueados | 🟠 ALTO | `adm`/`app` resolvidos como tenants | Adicionar `RESERVED_SLUGS` no resolver |
| R7 | Migrations manuais pós-deploy | 🟡 MÉDIO | Downtime se esquecido | Automatizar no CI/CD |
| R8 | Resend não integrado | 🟡 MÉDIO | Sem emails transacionais | Integrar antes do lançamento |
| R9 | Rate limit não lê env `RATE_LIMIT_MAX` | 🟡 MÉDIO | Limite hardcoded 500 em prod | Conectar ao `env.js` |
| R10 | Sem backup automatizado do banco | 🟡 MÉDIO | Perda de dados | Ativar backups do Supabase + PITR |

---

## 13 — PLANO DE AÇÃO — PRÓXIMOS PASSOS

### FASE 1 — Pré-deploy imediato (bloqueadores críticos)
```
[ ] R1  Gerar e configurar JWT_SECRET, DB_PASSWORD seguros
[ ] R2  Corrigir regex nginx.prod.conf: beautyhub.com → biaxavier.com.br
[ ] R3  Corrigir bug sequelize indefinido em /health/schema
[ ] R5  Adicionar VITE_API_URL ao vite.config.js e http.js
[ ] R6  Adicionar RESERVED_SLUGS ao tenantResolver.js
```

### FASE 2 — Configuração de infra cloud
```
[ ] Criar fly.toml e deployar backend no Fly.io
[ ] Configurar Cloudflare Pages com _redirects e _headers
[ ] Migrar DATABASE_URL para Supabase (SSL required)
[ ] Configurar DNS Cloudflare: A/CNAME para api, app, adm, *.
[ ] Testar wildcard *.biaxavier.com.br → tenant isolation
```

### FASE 3 — Serviços de suporte
```
[ ] Integrar Resend para emails (billing, boas-vindas, agendamento)
[ ] Configurar BetterStack log drain no Fly.io
[ ] Criar monitores UptimeRobot (health, frontend, webhook)
[ ] Ativar backup PITR no Supabase
```

### FASE 4 — CI/CD
```
[ ] Criar .github/workflows/deploy.yml
[ ] Configurar secrets: FLY_API_TOKEN, CF_API_TOKEN, etc.
[ ] Adicionar step de migration automática no pipeline
[ ] Smoke test pós-deploy: /api/health + login
```

### FASE 5 — Escalabilidade (quando necessário)
```
[ ] Provisionar Redis/Upstash
[ ] Migrar tenant cache para Redis
[ ] Migrar brute force store para Redis
[ ] Configurar express-rate-limit com Redis store
[ ] Habilitar auto-scale no Fly.io
```

---

## APÊNDICE — VARIÁVEIS DE AMBIENTE PRODUÇÃO

Abaixo as variáveis que **precisam ser configuradas** antes do primeiro deploy (além das já documentadas no `.env.example`):

```env
# ── Novos (infra cloud) ──
DATABASE_URL=postgresql://...supabase.co:5432/postgres?sslmode=require
VITE_API_URL=https://api.biaxavier.com.br

# ── Resend ──
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@biaxavier.com.br

# ── Fly.io / Produção ──
CORS_ORIGIN=https://app.biaxavier.com.br,https://*.biaxavier.com.br

# ── Stripe / Pagar.me (produção) ──
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# ── Redis (fase 5) ──
REDIS_URL=rediss://xxx.upstash.io:6380

# ── Secrets — OBRIGATÓRIO ROTACIONAR ──
JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
DB_PASSWORD=<openssl rand -base64 32>
```

---

*Relatório gerado com base em análise real dos arquivos do repositório. Nenhuma funcionalidade foi inventada ou assumida sem evidência de código.*

# 📋 AUDITORIA COMPLETA DE CÓDIGO — BeautyHub SaaS 2026
**Data inicial:** 16 de março de 2026 — **Atualizada:** 16 de março de 2026 (pós PRs #6, #7, #8, #10)  
**Tipo:** Análise Estática — Leitura e Diagnóstico (sem alterações destrutivas)  
**Branch auditada:** `master` (pós-merge de fix/security-p1, fix/hardening-p2, fix/cleanup-p3, feature/audit-fase4-completion)  
**Auditor:** Cascade AI  
**Status geral:** 🟢 Fases P1/P2/P3 completas — Fase 4 em review (PR #10)

---

## 1. RESUMO EXECUTIVO

O sistema BeautyHub SaaS apresenta **arquitetura sólida e bem estruturada**, com implementação correta dos pilares de um SaaS multi-tenant: RBAC hierárquico, isolamento por `tenant_id`, rate limiting, brute force protection e logging estruturado via Winston. O frontend SPA em Vite + Vanilla JS é modular e bem organizado por feature.

**Pontos fortes:** BaseRepository com escopo automático de tenant, middleware de assinatura com modo leitura/escrita, tratamento global de erros cobrindo Sequelize + Joi + JWT, lazy loading de módulos no frontend, módulo LGPD implementado, Notifications CRUD completo, suite de testes Jest com 24 testes passando.

### Estado das Correções (Pós-Auditoria)

| Fase | PRs | Itens | Status |
|------|-----|-------|--------|
| P1 Crítico | #6 | JWT_SECRET obrigatório em produção; bruteForce montado em login | ✅ Merged |
| P2 Hardening | #7 | SQL parametrizado; requireSubscription desacoplado; migrations 032/033 | ✅ Merged |
| P3 Limpeza | #8 | asyncHandler billing; DB_PASSWORD obrigatório; app.legacy removido | ✅ Merged |
| Fase 4 Roadmap | #10 | LGPD module; Notifications module; migrations 034/035; 24 testes Jest; fix cancelled/canceled | 🔄 PR aberto |

**Riscos ainda em aberto:**
1. **Cache de tenant em memória (Map)** — incompatível com deploy multi-instância no Fly.io (aguarda infra Redis)
2. **Módulos `owner-*` sem BaseRepository** — acesso direto a modelos legados (refatoração progressiva)
3. **Tokens em `localStorage`** — suscetível a XSS (CSP deveria ser habilitado)
4. **Pagar.me** — apenas documentado, não implementado
5. **Webhook resilience/DLQ** — não implementado

---

## 2. ANÁLISE DETALHADA

### 2.1 Frontend (Vite 5 + Vanilla JS SPA)

#### Conformidade Estrutural

| Área | Status | Observação |
|------|--------|------------|
| Feature-based modules | ✅ Conforme | 19 módulos em `src/features/` |
| SPA Router com lazy loading | ✅ Conforme | `loadPageModule()` com import dinâmico |
| Core centralized (router/state/auth/config) | ✅ Conforme | `src/core/` |
| Shared utils (http, toast, validation) | ✅ Conforme | `src/shared/utils/` |
| Shell component reutilizável | ✅ Conforme | `src/shared/components/shell/` |
| Landing page pública | ✅ Conforme | `src/features/public/landing/` |
| Páginas legais (privacy, terms, data-deletion) | ✅ Conforme | `src/features/public/` |

#### Rotas Mapeadas (36 total)

```
/ (landing)           /login              /register
/dashboard            /appointments       /financial
/clients              /services           /professionals
/billing              /settings           /account
/inventory            /suppliers          /purchases
/reports              /users              /professional-details
/payment-transactions /payment-methods    /privacy-policy
/data-deletion        /terms-of-service
/professional/dashboard                   /professional/appointments
/professional/clients                     /professional/earnings
/professional/performance                 /professional/profile
/professional/availability
/master                                   /master/tenants
/master/plans                             /master/billing
/master/system
```

#### HTTP Client (`src/shared/utils/http.js`)

**Pontos positivos:**
- Auto-refresh de token JWT com fila de subscribers (`refreshSubscribers`)
- Event bus global para erros 401/subscription/network
- Headers automáticos `Authorization` + `X-Tenant-Slug`
- Separação clara de `ApiError`, `AuthError`, `SubscriptionError`

**Atenção:**
- Tokens armazenados em `localStorage` sem criptografia — suscetível a XSS se houver injeção de script
- Chaves de token hardcoded: `bh_access_token`, `bh_refresh_token`, `bh_user`

#### RBAC no Frontend

O router aplica guards por role (`route.role`), redirecionando PROFESSIONAL para `/professional/dashboard` e MASTER para `/master`. A verificação usa comparação de string lowercase, consistente com o backend.

**Observação:** Módulos de páginas são cacheados em `pageModules{}` após primeiro carregamento. Se o role do usuário mudar durante a sessão sem reload, o módulo cacheado permanece ativo.

---

### 2.2 Backend (Node.js 20 + Express + Sequelize + PostgreSQL)

#### Endpoints Mapeados (~80+)

**Públicos (sem auth):**
```
GET  /api/health
GET  /api/health/schema
GET  /api/public/plans
POST /api/public/register
GET  /api/billing/plans
GET  /api/billing/plans/:slug
POST /api/onboarding/register
```

**Auth:**
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/logout
GET  /api/auth/me
```

**Master (MASTER role):**
```
GET/POST/PUT/DELETE /api/master/tenants
GET/POST/PUT/DELETE /api/master/billing  (planos, assinaturas, faturas, MRR)
```

**Owner/Admin (com subscription):**
```
/api/services          /api/clients          /api/appointments
/api/financial         /api/professionals    /api/reports
/api/products          /api/suppliers        /api/purchases
/api/professional-details                    /api/payment-transactions
/api/users             /api/tenant           /api/profile
```

**Professional:**
```
/api/professional/* (via professionalArea routes)
```

**LGPD (Fase 4):**
```
GET  /api/lgpd/export                    POST /api/lgpd/delete-request
GET  /api/master/lgpd/requests           POST /api/master/lgpd/requests/:id/process
```

**Notifications (Fase 4):**
```
GET    /api/notifications                PATCH /api/notifications/read-all
PATCH  /api/notifications/:id/read       DELETE /api/notifications/:id
POST   /api/notifications                POST  /api/notifications/broadcast
```

#### Arquitetura Modular

O padrão `Controller → Service → Repository → Model` está implementado nos módulos `tenants/`, `billing/`, `users/`. Os módulos `owner-*` implementam `Controller → Service` mas **não usam BaseRepository** — acessam os modelos legados diretamente.

```
backend/src/modules/
├── tenants/       ✅ Controller→Service→Repository→Model (completo)
├── billing/       ✅ Controller→Service→Repository→Model (completo)
├── users/         ✅ Controller→Service→Repository→Model (completo)
├── public/        ✅ Controller→Service (adequado para rotas públicas)
├── lgpd/          ✅ Service→Controller→Routes (Fase 4) [PR #10]
├── notifications/ ✅ Service→Controller→Routes (Fase 4) [PR #10]
├── owner-clients/      ⚠️ Controller→Service (sem BaseRepository)
├── owner-services/     ⚠️ Controller→Service (sem BaseRepository)
├── owner-appointments/ ⚠️ Controller→Service (sem BaseRepository)
├── owner-financial/    ⚠️ Controller→Service (sem BaseRepository)
├── owner-reports/      ⚠️ Controller→Service (sem BaseRepository)
└── inventory/, suppliers/, purchases/, professionals/, financial/ ✅ Com arquivos
```

> Diretórios stub vazios (`appointments/`, `clients/`, `services/`) foram removidos (PR #8/P3).

#### Multi-Tenancy

| Mecanismo | Implementação | Status |
|-----------|--------------|--------|
| BaseRepository `_scopedWhere(tenantId)` | Automático em todos os métodos | ✅ |
| tenantResolver middleware | Header `X-Tenant-Slug` → Subdomain → Query (dev) | ✅ |
| validateTenantConsistency | JWT tenantId vs request tenantId | ✅ |
| tenant_id em tabelas legadas | Migrations 031→033 backfill→034 NOT NULL [PR #10] | ✅ em PR |
| Cache de tenant (Map, 1min TTL) | Em memória — sem Redis | ⚠️ |
| MASTER bypass de tenant | `req.user.role === ROLES.MASTER` | ✅ |

> Migrations 032 (login_attempts), 033 (backfill tenant_id via establishment_id), 034 (NOT NULL constraint) e 035 (lgpd_deletion_requests) incluídas em PR #10.

#### RBAC

```javascript
ROLE_HIERARCHY = ['client', 'professional', 'admin', 'owner', 'master']
```

A hierarquia está corretamente implementada em `auth.js`: roles com índice maior têm acesso a recursos de roles menores. `authorizeExact()` disponível para casos onde a hierarquia não deve ser aplicada.

#### Segurança

| Mecanismo | Implementado | Observações |
|-----------|-------------|-------------|
| Helmet | ✅ | CSP desativado para SPA |
| CORS | ✅ | Wildcard `*.biaxavier.com.br` + Cloudflare Pages |
| Rate Limit global | ✅ | 100 req/15min por tenant+IP |
| Rate Limit auth | ✅ | 20 req/15min em `/api/auth/login` e `/register` |
| Brute Force Protection | ✅ Montado | `checkLoginAllowed()` em `/api/auth/login` (PR #6) |
| Account Lockout | ✅ | 10 falhas/hora → bloqueia conta |
| JWT obrigatório em produção | ✅ | `env.js` valida JWT_SECRET/DB_PASSWORD em NODE_ENV=production (PR #6) |
| JWT + Refresh Token | ✅ | Access: 1h, Refresh: 7d |
| bcryptjs | ✅ | Hash de senhas |
| Joi validation | ✅ | Nos módulos tenants, billing, users |
| SQL Parameterizado | ✅ | Template literals corrigidos para bind parameters (PR #7) |
| LGPD (export/anonimização) | ✅ em PR | Módulo implementado em PR #10 |
| Webhook resilience/DLQ | ❌ | Não implementado — roadmap |
| Pagar.me integração | ❌ | Apenas documentada, não implementada — roadmap |

#### Logging (Winston)

Logging estruturado via `winston` com:
- Formato customizado com timestamp, tenantId, userId
- Console colorido em desenvolvimento
- Arquivo `logs/error.log` + `logs/combined.log` em produção (5MB, 5 arquivos)
- `createTenantLogger(tenantId)` para contexto de tenant
- Morgan integrado direcionando ao Winston (skipping `/api/health`)

#### Tratamento de Erros

O `errorHandler.js` cobre:
- `AppError` (erros operacionais tipados)
- `SequelizeValidationError` / `SequelizeUniqueConstraintError`
- `SequelizeForeignKeyConstraintError`
- `SequelizeDatabaseError`
- `JsonWebTokenError` / `TokenExpiredError`
- Erros Joi (`err.isJoi`)
- Erros inesperados (oculta detalhes em produção)

---

### 2.3 Banco de Dados (PostgreSQL 15 via Supabase em Produção)

#### Migrations (35 arquivos)

```
001-010: Tabelas legadas (users, establishments, professionals, services,
         clients, appointments, payment_methods, financial_entries,
         financial_exits, notifications)
011-018: Tabelas SaaS (tenants, subscription_plans, subscriptions,
         invoices, usage_logs, users multi-tenant, billing enhance,
         saas production tables)
019-022: Professional details/specialties/commissions/payments
023-027: Suppliers, purchases, products, purchase_items, inventory_movements
028-030: Service categories, payment fields, service_categories table
031:     Adiciona tenant_id às tabelas legadas (allowNull: true)
032:     ✅ [PR #7] Cria tabela login_attempts com índices
033:     ✅ [PR #7] Backfill tenant_id via establishment_id → tenants
034:     ✅ [PR #10] NOT NULL constraint em tenant_id tabelas legadas
035:     ✅ [PR #10] Cria tabela lgpd_deletion_requests
```

#### Índices Críticos

Migration 031 adiciona `{table}_tenant_id_idx` para todas as 7 tabelas legadas. Os módulos SaaS têm índices nos campos `slug`, `tenant_id`, `status` via migrations 011-018.

---

### 2.4 Infraestrutura

#### docker-compose.yml

- 3 serviços: `nginx` (8080→80), `backend` (5001→5001), `database` (5433→5432)
- Healthchecks configurados nos 3 serviços
- Rede isolada `beautyhub_network`
- Volume persistente `db_data`

**Corrigido (PR #8):** Credenciais agora obrigatórias com sintaxe `:?`:
```yaml
DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required. Copy .env.example to .env}
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required. Copy .env.example to .env}
```
O docker-compose falha com mensagem clara se a variável não estiver definida.

#### Fly.io (Produção Backend)

- `fly.toml` configurado com `internal_port = 5001`
- `backend/fly.toml` separado para o backend
- `trust proxy = 1` configurado corretamente para Fly.io
- `DATABASE_URL` parseado automaticamente para suporte ao Supabase

#### Cloudflare Pages (Frontend)

- `public/_redirects` para SPA fallback
- `public/_headers` para headers de segurança
- `.env.production`: `VITE_API_URL=https://api.biaxavier.com.br/api`

---

## 3. DISCREPÂNCIAS IDENTIFICADAS

| # | Discrepância | Localização | Impacto | Status |
|---|-------------|-------------|---------|--------|
| D1 | Docs mencionam 18 módulos frontend; existem 19 diretórios (`landing/` separado de `public/landing/`) | `src/features/landing/` | Baixo | ⏳ Pendente |
| D2 | `src/features/settings/` existe sem feature page confirmada | `src/features/settings/` | Baixo | ⏳ Pendente |
| D3 | Módulos stub vazios (`appointments/`, `clients/`, `notifications/`, `services/`) | `backend/src/modules/` | Médio | ✅ Removidos (PR #8) |
| D4 | `app.legacy.js` coexistindo com `app.multitenant.js` | `backend/src/app.legacy.js` | Baixo | ✅ Removido (PR #8) |
| D5 | 13 controllers legados inativos em `backend/src/controllers/` | `backend/src/controllers/` | Baixo | ⏳ Refatoração progressiva |
| D6 | `bruteForceProtection` criado mas não montado nas rotas de auth | `app.multitenant.js:203` | **Alto** | ✅ Corrigido (PR #6) |
| D7 | Pagar.me documentado mas não implementado | `docs/` | Médio | ⏳ Roadmap |
| D8 | LGPD documentada mas sem módulo implementado | `backend/src/modules/` | Médio | ✅ Implementado (PR #10) |
| D9 | `login_attempts` sem migration dedicada | `backend/src/migrations/` | Alto | ✅ Migration 032 (PR #7) |
| D10 | `'canceled'` (1L) em código de runtime vs `'cancelled'` (2L) na constante | `requireActiveSubscription.js:81` | Alto | ✅ Corrigido (PR #10) |

---

## 4. VULNERABILIDADES E RISCOS

### 4.1 ✅ RESOLVIDO — Secrets JWT com Fallback Inseguros (era Crítico)

**Arquivo:** `backend/src/config/env.js` — **Corrigido em PR #6**

```javascript
// Enforce required secrets in production
if (nodeEnv === 'production') {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`[env] Missing required production environment variables: ${missing.join(', ')}`);
  }
}
```
O backend agora falha no startup com mensagem explícita se variáveis críticas estiverem ausentes em produção.

---

### 4.2 ✅ RESOLVIDO — Interpolação de String em SQL

**Corrigido em PR #7:**
- `app.multitenant.js`: schema health check usa `bind: [table]`
- `bruteForceProtection.js`: cleanup usa `bind: [days]` com `parseInt` sanitizado

---

### 4.3 ✅ RESOLVIDO — `bruteForceProtection` Não Montado

**Corrigido em PR #6:**
```javascript
app.use('/api/auth/login', bruteForceProtection.checkLoginAllowed());
app.use('/api/auth', authRoutes);
```
Proteção anti-brute-force agora ativa em `/api/auth/login`.

---

### 4.4 ✅ RESOLVIDO — `requireActiveSubscription` Acoplado ao Legacy

**Corrigido em PR #7:** Middleware agora aceita `models` como segundo parâmetro:
```javascript
function requireActiveSubscription(options = {}, models = null) {
  const { Subscription } = models || require('../../models'); // fallback retrocompatível
}
```

---

### 4.5 ⚠️ ABERTO — Cache de Tenant em Memória

**Arquivo:** `backend/src/shared/middleware/tenantResolver.js:12-13`

```javascript
const tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minute
```

**Impacto:** Médio — tenant suspenso pode continuar com acesso em instâncias com cache válido  
**Probabilidade:** Média (escala horizontal no Fly.io)  
**Mitigação pendente:** Redis compartilhado ou TTL reduzido para 10s

---

### 4.6 ✅ RESOLVIDO — tenant_id Nullable + Sem Backfill

**Corrigido em PRs #7 e #10:**
- Migration 033: backfill via `establishment_id → establishments.tenant_id`
- Migration 034: aplica `NOT NULL` nas 7 tabelas legadas

---

### 4.7 ✅ RESOLVIDO — Tabela `login_attempts` Sem Migration

**Corrigido em PR #7:** Migration 032 cria a tabela com índices em `(identifier, type, created_at)` e `(created_at)`.

---

### 4.8 ✅ RESOLVIDO — DB Password Default no Repositório

**Corrigido em PR #8:** `docker-compose.yml` agora usa `:?` em vez de `:-`:
```yaml
DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD is required}
```

---

### 4.9 ✅ RESOLVIDO — Endpoints de Billing Sem Error Handling

**Corrigido em PR #8:** Ambos os endpoints `GET /api/billing/plans*` envolvidos em `asyncHandler()`.

---

### 4.10 ✅ RESOLVIDO — Bug `cancelled` vs `canceled`

**Corrigido em PR #10:** `requireActiveSubscription.js` usava `'canceled'` (1L) enquanto a constante e o banco usam `'cancelled'` (2L). Corrigido para `includes(['suspended', 'canceled', 'cancelled', 'expired'])`.

---

### 4.11 ⚠️ ABERTO — Tokens JWT em `localStorage`

Suscetível a XSS. Content Security Policy (`contentSecurityPolicy: false` no Helmet) está desativada para o SPA.  
**Impacto:** Médio — CSP desativada expõe localStorage a scripts injetados  
**Mitigação:** Habilitar CSP com nonce-based para scripts, ou migrar tokens para `httpOnly cookies`

---

### 4.12 ⚠️ ABERTO — Módulos `owner-*` Sem BaseRepository

Os 5 módulos `owner-*` acessam diretamente `Sequelize.findAll()` sem passar pelo `BaseRepository._scopedWhere()`. O escopo por `tenant_id` está implementado manualmente no service, o que é correto mas não garante uniformidade.

**Impacto:** Baixo (funcional) / Médio (manutenibilidade)  
**Mitigação:** Refatoração progressiva para estender `BaseRepository`

---

## 5. MATRIZ DE RISCO — ESTADO ATUAL

| # | Risco | Impacto | Probabilidade | Status | PR |
|---|-------|---------|---------------|--------|----|
| R1 | JWT secrets sem validação de produção | **Alto** | Baixa | ✅ Resolvido | #6 |
| R2 | bruteForceProtection não montado | **Alto** | Atual | ✅ Resolvido | #6 |
| R3 | Interpolação SQL (template literals) | **Alto** | Baixa | ✅ Resolvido | #7 |
| R4 | requireActiveSubscription acoplado ao legacy | **Médio** | Atual | ✅ Resolvido | #7 |
| R5 | Cache tenant in-memory (multi-instância) | **Médio** | Média | ⚠️ Aberto | Infra Redis |
| R6 | tenant_id nullable (isolamento parcial) | **Médio** | Alta | ✅ Resolvido | #7+#10 |
| R7 | Tabela login_attempts sem migration | **Médio** | Média | ✅ Resolvido | #7 |
| R8 | Endpoints billing sem error handling | **Baixo** | Baixa | ✅ Resolvido | #8 |
| R9 | DB password default no repositório | **Baixo** | Alta | ✅ Resolvido | #8 |
| R10 | Módulos stubs vazios + app.legacy.js | **Baixo** | Atual | ✅ Resolvido | #8 |
| R11 | Bug cancelled vs canceled | **Médio** | Atual | ✅ Resolvido | #10 |
| R12 | localStorage sem CSP (tokens expostos a XSS) | **Médio** | Baixa | ⚠️ Aberto | Roadmap |
| R13 | Módulos owner-* sem BaseRepository | **Baixo** | Baixa | ⚠️ Aberto | Refatoração |
| R14 | Pagar.me não implementado | **Médio** | Atual | ⚠️ Aberto | Roadmap |
| R15 | Webhook resilience/DLQ ausente | **Médio** | Média | ⚠️ Aberto | Roadmap |

---

## 6. RECOMENDAÇÕES ATUAIS (ESTADO PÓS-CORREÇÕES)

### ✅ COMPLETAS — Implementadas nas Fases P1/P2/P3

| Item | Implementação | PR |
|------|--------------|----|
| JWT obrigatório em produção | `env.js` throw em startup | #6 |
| bruteForce montado em login | `checkLoginAllowed()` antes de `authRoutes` | #6 |
| SQL parametrizado | `bind: [table]` e `bind: [days]` | #7 |
| requireSubscription desacoplado | `models` injetável via segundo parâmetro | #7 |
| Migration login_attempts | 032 com índices | #7 |
| Backfill tenant_id | 033 via establishment_id | #7 |
| NOT NULL tenant_id | 034 após backfill | #10 |
| asyncHandler billing endpoints | `asyncHandler()` em ambos `GET /billing/plans*` | #8 |
| DB_PASSWORD obrigatório | `:?` no docker-compose | #8 |
| app.legacy.js removido | `git rm` | #8 |
| Módulo LGPD completo | service/controller/routes + migration 035 | #10 |
| Módulo Notifications completo | service/controller/routes (substituiu stub vazio) | #10 |
| Bug cancelled/canceled | `includes()` com ambas as formas | #10 |
| Testes Jest (24 testes) | BaseRepo, RBAC, JWT, tenantResolver, subscription | #10 |

### ⚠️ PRÓXIMAS ETAPAS RECOMENDADAS

#### Alta Prioridade
- **Fazer merge do PR #10** e rodar `npm run migrate` em produção para aplicar migrations 032-035
- **Verificar tabela `login_attempts` no Supabase** — pode precisar de `GRANT` de permissões

#### Média Prioridade
- **Redis para tenant cache** — avaliar após confirmação de escala horizontal no Fly.io
- **CSP habilitada** — configurar Helmet CSP com `nonce` para scripts inline do SPA
- **Refatorar módulos `owner-*`** para estender `BaseRepository`

#### Baixo — Roadmap
- Integração real Pagar.me (webhook + events)
- Webhook resilience com DLQ e retry exponencial
- Testes de integração com banco de dados real
- Testes E2E com Playwright

---

## 7. EXEMPLOS DE CÓDIGO — PONTOS POSITIVOS

### BaseRepository — Escopo Automático de Tenant ✅
```javascript
// backend/src/shared/database/baseRepository.js:29-37
_scopedWhere(tenantId, additionalWhere = {}) {
  if (!tenantId) {
    throw new TenantMismatchError();
  }
  return {
    tenant_id: tenantId,
    ...additionalWhere,
  };
}
```
Qualquer query via BaseRepository é automaticamente scoped ao tenant. A ausência de `tenantId` lança erro explícito — não silencia nem ignora.

### HTTP Client com Auto-Refresh e Event Bus ✅
```javascript
// src/shared/utils/http.js:161-183
if (response.status === 401 && !skipAuth && !retry) {
  if (!isRefreshing) {
    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    onRefreshed(newToken);
    return request(endpoint, { ...options, retry: true });
  } else {
    return new Promise((resolve) => {
      addRefreshSubscriber((newToken) => {
        resolve(request(endpoint, { ...options, retry: true }));
      });
    });
  }
}
```
Implementação correta de fila de refresh — múltiplas requisições simultâneas com token expirado aguardam um único refresh ao invés de disparar N refreshes em paralelo.

### Tratamento de Erros Tipados ✅
```javascript
// backend/src/shared/middleware/errorHandler.js
if (err instanceof AppError) { ... }         // Erros operacionais
if (err.name === 'SequelizeValidationError') { ... } // ORM
if (err.isJoi) { ... }                       // Validação
if (err.name === 'JsonWebTokenError') { ... } // Auth
// Default: oculta detalhes em produção
```

### Rate Limiting Diferenciado por Tenant+IP ✅
```javascript
// backend/src/app.multitenant.js:116-119
keyGenerator: (req) => {
  const tenantKey = req.headers['x-tenant-slug'] || 'global';
  return `${tenantKey}:${req.ip}`;
}
```

---

## 8. PLANO DE AÇÃO ATUALIZADO PÓS-CORREÇÕES

### Fase 1 ✅ — Correções Críticas (COMPLETO)
- [x] R1: Validação obrigatória de JWT_SECRET em produção
- [x] R2: Montar bruteForceProtection.checkLoginAllowed() em `/api/auth/login`
- [x] R3: SQL parametrizado com bind parameters

### Fase 2 ✅ — Hardening (COMPLETO)
- [x] R4: Desacoplar requireActiveSubscription do legacy models
- [x] R5: Migration 032 para `login_attempts`
- [x] R6: Migration 033 backfill tenant_id; Migration 034 NOT NULL

### Fase 3 ✅ — Limpeza (COMPLETO)
- [x] R7: asyncHandler nos endpoints inline de billing
- [x] R9: Remover fallback de senhas do docker-compose.yml
- [x] R10: Limpar app.legacy.js e diretórios stub vazios

### Fase 4 🔄 — Funcionalidades (PR #10 — Revisão)
- [x] Módulo LGPD implementado (export + deletion request + anonimização)
- [x] Módulo Notifications implementado (CRUD + broadcast)
- [x] Migration 035 para lgpd_deletion_requests
- [x] Suite de testes Jest com 24 testes passando
- [x] Bug cancelled/canceled corrigido
- [ ] **Fazer merge do PR #10 e rodar migrations em produção**

### Fase 5 🗓️ — Roadmap (Futuro)
- [ ] Redis para tenant cache compartilhado
- [ ] CSP habilitada no Helmet
- [ ] Integração real com Pagar.me
- [ ] Webhook resilience com DLQ e retry exponencial
- [ ] Testes de integração com BD real (coverage ≥ 70%)
- [ ] Refatorar módulos `owner-*` para estender `BaseRepository`

### Estratégia de Deploy Seguro
1. **Merge PR #10** → `git pull` no servidor de staging
2. **Rodar migrations:** `NODE_ENV=production npm run migrate`
3. **Verificar tabela `login_attempts`** no Supabase: `\dt login_attempts`
4. **Monitorar pós-deploy** via Winston logs + UptimeRobot por 2h
5. **Rollback:** `fly releases list && fly deploy --image <previous>`

---

## 9. CHECKLIST DE VERIFICAÇÃO FINAL

### Segurança
- [x] Helmet configurado
- [x] CORS multi-tenant com whitelist
- [x] Rate limiting global + auth
- [x] JWT com expiração curta (1h access, 7d refresh)
- [x] bcrypt para senhas
- [x] Error messages não vazam detalhes em produção
- [x] **bruteForceProtection montado** em `/api/auth/login` (PR #6)
- [x] **JWT_SECRET obrigatório em produção** (PR #6)
- [x] **Tabela `login_attempts` com migration 032** (PR #7)
- [ ] CSP desativada (tokens expostos a XSS) ← ROADMAP

### Multi-Tenancy
- [x] BaseRepository com escopo automático
- [x] tenantResolver por subdomain/header
- [x] validateTenantConsistency JWT vs request
- [x] MASTER bypass controlado
- [x] **tenant_id backfill + NOT NULL** migrations 033/034 (PR #7+#10)
- [ ] Cache em memória ← Redis quando necessário

### Qualidade de Código
- [x] Módulos bem separados (tenants, billing, users, lgpd, notifications)
- [x] Constants centralizadas
- [x] Error classes tipadas
- [x] Logging estruturado com contexto
- [x] **app.legacy.js removido** (PR #8)
- [x] **Diretórios stub vazios removidos** (PR #8)
- [x] **24 testes Jest passando** (PR #10)
- [ ] Módulos `owner-*` sem BaseRepository ← Refatoração progressiva

### Compliance LGPD
- [x] `GET /api/lgpd/export` — exportação de dados pessoais (Art. 18 II)
- [x] `POST /api/lgpd/delete-request` — solicitação de exclusão (Art. 18 VI)
- [x] `processDeletionRequest` — anonimização dos dados do usuário
- [x] Migration 035 para `lgpd_deletion_requests`

---

*Auditoria inicial: 16/03/2026 — Atualizada: 16/03/2026 pós PRs #6, #7, #8, #10*  
*BeautyHub SaaS Auditoria v2.0 — Próxima revisão: após merge PR #10 e deploy em produção*

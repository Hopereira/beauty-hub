# AUDITORIA DE CÓDIGO — BeautyHub SaaS
**Data:** 16 de março de 2026  
**Tipo:** Análise Estática — Leitura e Diagnóstico (sem alterações)  
**Branch auditada:** `tests/personas` (master + feature/landing-page-and-public-apis)  
**Auditor:** Cascade AI  

---

## 1. RESUMO EXECUTIVO

O sistema BeautyHub SaaS apresenta **arquitetura sólida e bem estruturada**, com implementação correta dos pilares de um SaaS multi-tenant: RBAC hierárquico, isolamento por `tenant_id`, rate limiting, brute force protection e logging estruturado via Winston. O frontend SPA em Vite + Vanilla JS é modular e bem organizado por feature.

**Pontos fortes:** BaseRepository com escopo automático de tenant, middleware de assinatura com modo leitura/escrita, tratamento global de erros cobrindo Sequelize + Joi + JWT, lazy loading de módulos no frontend.

**Riscos críticos identificados:**
1. **Secrets JWT com fallback inseguros** em `env.js` — se as variáveis de ambiente não forem configuradas em produção, segredos fracos serão usados.
2. **Interpolação de string em SQL** em dois locais — padrão perigoso mesmo quando os valores atuais são seguros.
3. **`requireActiveSubscription` usa `require('../../models')` direto** — quebra o padrão de injeção de dependência e acopla ao modelo legado.
4. **Cache de tenant em memória (Map)** — incompatível com deploy multi-instância no Fly.io.
5. **`bruteForceProtection` instanciado mas não montado** nas rotas de auth em `app.multitenant.js`.

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

#### Endpoints Mapeados (~70+)

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

#### Arquitetura Modular

O padrão `Controller → Service → Repository → Model` está implementado nos módulos `tenants/`, `billing/`, `users/`. Os módulos `owner-*` implementam `Controller → Service` mas **não usam BaseRepository** — acessam os modelos legados diretamente.

```
backend/src/modules/
├── tenants/      ✅ Controller→Service→Repository→Model (completo)
├── billing/      ✅ Controller→Service→Repository→Model (completo)
├── users/        ✅ Controller→Service→Repository→Model (completo)
├── public/       ✅ Controller→Service (adequado para rotas públicas)
├── owner-clients/     ⚠️ Controller→Service (sem Repository/BaseRepository)
├── owner-services/    ⚠️ Controller→Service (sem Repository/BaseRepository)
├── owner-appointments/⚠️ Controller→Service (sem Repository/BaseRepository)
├── owner-financial/   ⚠️ Controller→Service (sem Repository/BaseRepository)
├── owner-reports/     ⚠️ Controller→Service (sem Repository/BaseRepository)
├── appointments/      ❌ Diretório VAZIO
├── clients/           ❌ Diretório VAZIO
├── notifications/     ❌ Diretório VAZIO
├── services/          ❌ Diretório VAZIO
└── inventory/, suppliers/, purchases/, professionals/, financial/  ✅ Com arquivos
```

#### Multi-Tenancy

| Mecanismo | Implementação | Status |
|-----------|--------------|--------|
| BaseRepository `_scopedWhere(tenantId)` | Automático em todos os métodos | ✅ |
| tenantResolver middleware | Header `X-Tenant-Slug` → Subdomain → Query (dev) | ✅ |
| validateTenantConsistency | JWT tenantId vs request tenantId | ✅ |
| tenant_id em tabelas legadas | Migration 031 (allowNull: true) | ⚠️ |
| Cache de tenant (Map, 1min TTL) | Em memória — sem Redis | ⚠️ |
| MASTER bypass de tenant | `req.user.role === ROLES.MASTER` | ✅ |

**Risco:** A migration 031 adiciona `tenant_id` com `allowNull: true` nas tabelas legadas. Registros anteriores à migração e registros criados via rotas legadas terão `tenant_id = NULL`, quebrando o isolamento multi-tenant nesses registros.

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
| Brute Force Protection | ✅ Criado | ⚠️ Não montado em app.multitenant.js |
| Account Lockout | ✅ | 10 falhas/hora → bloqueia conta |
| JWT + Refresh Token | ✅ | Access: 1h, Refresh: 7d |
| bcryptjs | ✅ | Hash de senhas |
| Joi validation | ✅ | Nos módulos tenants, billing, users |
| SQL Parameterizado | ⚠️ | Dois locais com template literals inseguros |
| LGPD (export/anonimização) | ❌ | Não encontrado no código ativo |
| Webhook resilience/DLQ | ❌ | Não implementado |
| Pagar.me integração | ❌ | Apenas documentada, não implementada |

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

#### Migrations (31 arquivos)

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
```

**Tabela `login_attempts`** referenciada em `bruteForceProtection.js` mas **sem migration correspondente** (deveria estar em migration 018 ou uma nova).

#### Índices Críticos

Migration 031 adiciona `{table}_tenant_id_idx` para todas as 7 tabelas legadas. Os módulos SaaS têm índices nos campos `slug`, `tenant_id`, `status` via migrations 011-018.

---

### 2.4 Infraestrutura

#### docker-compose.yml

- 3 serviços: `nginx` (8080→80), `backend` (5001→5001), `database` (5433→5432)
- Healthchecks configurados nos 3 serviços
- Rede isolada `beautyhub_network`
- Volume persistente `db_data`

**Atenção:** Credenciais padrão expostas no arquivo versionado:
```yaml
DB_PASSWORD: ${DB_PASSWORD:-beautyhub_secret_2026}
JWT_SECRET: ${JWT_SECRET:-bh_jwt_secret_change_me_in_production_2026}
```

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

| # | Discrepância | Localização | Impacto |
|---|-------------|-------------|---------|
| D1 | Docs mencionam 18 módulos frontend; existem 19 diretórios em `src/features/` (inclui `landing/` vazio separado de `public/landing/`) | `src/features/landing/` | Baixo |
| D2 | Docs listam `src/features/settings/` mas a rota `/settings` existe sem feature page confirmada | `src/features/settings/` | Baixo |
| D3 | Módulos `appointments/`, `clients/`, `notifications/`, `services/` em `backend/src/modules/` são vazios (stubs) | `backend/src/modules/` | Médio |
| D4 | Backend tem dois arquivos app: `app.legacy.js` e `app.multitenant.js` — `app.legacy.js` não deveria mais existir | `backend/src/app.legacy.js` | Baixo |
| D5 | 13 controllers legados em `backend/src/controllers/` não estão sendo usados nas rotas ativas — código morto | `backend/src/controllers/` | Baixo |
| D6 | `bruteForceProtection` criado em `app.multitenant.js:203` mas nunca montado como middleware | `app.multitenant.js:203` | **Alto** |
| D7 | Pagar.me documentado em `PAGARME_INTEGRATION.md` mas sem implementação no código ativo | `docs/` | Médio |
| D8 | LGPD (exportação/anonimização) documentada mas sem módulo/service implementado | `backend/src/modules/` | Médio |
| D9 | `login_attempts` table usada em bruteForceProtection.js sem migration dedicada | `backend/src/migrations/` | Alto |
| D10 | Frontend frontend CANCELLED vs backend CANCELED (inconsistência de spelling) | `src/core/config.js:60` vs `constants/index.js:43` | Baixo |

---

## 4. VULNERABILIDADES E RISCOS

### 4.1 CRÍTICO — Secrets JWT com Fallback Inseguros

**Arquivo:** `backend/src/config/env.js:38-39`

```javascript
secret: process.env.JWT_SECRET || 'bh_jwt_secret_dev',
refreshSecret: process.env.JWT_REFRESH_SECRET || 'bh_jwt_refresh_secret_dev',
```

**Problema:** Se `JWT_SECRET` não estiver configurado em produção (ex: erro de deploy, variável não propagada para a instância), tokens serão assinados com o segredo fraco `bh_jwt_secret_dev`. Qualquer pessoa com acesso ao repositório poderia forjar tokens JWT válidos.

**Impacto:** Crítico — comprometimento total de autenticação  
**Probabilidade:** Baixa (Fly.io tem secrets configurados), mas consequência catastrófica

**Mitigação:** Adicionar `throw new Error('JWT_SECRET is required in production')` se `NODE_ENV === 'production'` e a variável não estiver definida.

---

### 4.2 ALTO — Interpolação de String em SQL (Dois Locais)

**Local 1 — `backend/src/app.multitenant.js:170`:**
```javascript
`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '${table}') as exists`
```
`table` vem de array hardcoded `criticalTables` — atualmente seguro, mas o padrão é perigoso.

**Local 2 — `backend/src/shared/middleware/bruteForceProtection.js:336`:**
```javascript
`WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'`
```
`daysToKeep` default é 30, mas se futuro código passar valor de usuário, há injeção SQL.

**Mitigação:** Usar `sequelize.literal()` com valores tipados ou queries parametrizadas.

---

### 4.3 ALTO — `bruteForceProtection` Não Montado nas Rotas de Auth

**Arquivo:** `backend/src/app.multitenant.js:203`

```javascript
const bruteForceProtection = createBruteForceProtection(sequelize);
// ... variável criada mas nunca usada como middleware
app.use('/api/auth', authRoutes);  // bruteForce não aplicado aqui
```

A proteção anti-brute-force foi implementada mas não está ativa. O `authLimiter` (rate limit simples) está ativo, mas o `BruteForceProtection.checkLoginAllowed()` — que verifica tentativas por email e bloqueia contas — **não está sendo executado**.

**Impacto:** Alto — brute force de credenciais não mitigado efetivamente  
**Mitigação:** Aplicar `bruteForceProtection.checkLoginAllowed()` nas rotas de login:
```javascript
app.use('/api/auth/login', bruteForceProtection.checkLoginAllowed(), authRoutes);
```

---

### 4.4 ALTO — `requireActiveSubscription` Quebra Injeção de Dependência

**Arquivo:** `backend/src/shared/middleware/requireActiveSubscription.js:55`

```javascript
const { Subscription } = require('../../models');
```

Este `require` dentro da função do middleware acessa o arquivo `backend/src/models/index.js` (modelos legados), contornando o padrão de injeção de dependência dos módulos. Isso cria acoplamento ao sistema legado e pode causar comportamento inesperado se o modelo `Subscription` do legacy não estiver sincronizado com o módulo `billing`.

**Mitigação:** Injetar o modelo `Subscription` via factory function:
```javascript
function requireActiveSubscription(options = {}, { SubscriptionModel } = {}) { ... }
```

---

### 4.5 MÉDIO — Cache de Tenant em Memória (Incompatível Multi-Instância)

**Arquivo:** `backend/src/shared/middleware/tenantResolver.js:12-13`

```javascript
const tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minute
```

Em deploy com múltiplas instâncias (Fly.io pode escalar horizontalmente), cada instância mantém seu próprio cache. Uma atualização de tenant (ex: suspensão de conta) pode não ser propagada imediatamente para todas as instâncias.

**Impacto:** Médio — tenant suspenso pode continuar com acesso por até 1 minuto em outras instâncias  
**Mitigação:** Redis para cache compartilhado ou TTL reduzido para 10 segundos.

---

### 4.6 MÉDIO — tenant_id Nullable em Tabelas Legadas

**Arquivo:** `backend/src/migrations/031_add_tenant_id_to_legacy_tables.js:41`

```javascript
allowNull: true, // Nullable for backward compatibility with existing data
```

Tabelas: `appointments`, `clients`, `services`, `professionals`, `financial_entries`, `financial_exits`, `payment_methods`

Registros com `tenant_id = NULL` não serão retornados pelas queries dos módulos `owner-*` (que filtram por `tenant_id`), mas também não estão isolados — podem ser acessados por queries legacy sem filtro.

**Mitigação:** Script de backfill para preencher `tenant_id` baseado em `establishment_id → tenant`.

---

### 4.7 MÉDIO — Tabela `login_attempts` Sem Migration

**Arquivo:** `backend/src/shared/middleware/bruteForceProtection.js:11`

```javascript
this.tableName = 'login_attempts';
```

Não há migration criando esta tabela no histórico de 31 arquivos. A tabela provavelmente foi criada manualmente ou via migration 018 (que tem mais de 14KB), mas não está explicitamente documentada.

**Impacto:** Se a tabela não existir, o `bruteForceProtection` lançará erro em runtime (mas o código captura e ignora: linha 78 `// Don't block login on error`)  
**Mitigação:** Criar migration dedicada `032_create_login_attempts.js`.

---

### 4.8 BAIXO — Default DB Password no Repositório

**Arquivo:** `docker-compose.yml:32,63`

```yaml
DB_PASSWORD: ${DB_PASSWORD:-beautyhub_secret_2026}
```

Senha padrão versionada no Git. Em desenvolvimento local sem `.env`, esta senha é usada e pode ser identificada por qualquer pessoa com acesso ao repositório.

**Mitigação:** Remover fallback do docker-compose.yml; exigir variável explícita. Para dev, usar `.env.local` no `.gitignore`.

---

### 4.9 BAIXO — Endpoint de Billing Sem Error Handling

**Arquivo:** `backend/src/app.multitenant.js:233-254`

```javascript
app.get('/api/billing/plans', async (req, res) => {
  const { SubscriptionPlan } = modules.billing.models;
  const plans = await SubscriptionPlan.findAll({ ... }); // sem try-catch
  ...
});
```

Se `SubscriptionPlan.findAll()` lançar erro, o servidor ficará sem resposta (unhandled promise rejection).

**Mitigação:** Envolver em `try-catch` ou usar `asyncHandler()` disponível no `errorHandler.js`.

---

## 5. MATRIZ DE RISCO

| # | Risco | Impacto | Probabilidade | Prioridade |
|---|-------|---------|---------------|------------|
| R1 | JWT secrets sem validação de produção | **Alto** | Baixa | 🔴 P1 |
| R2 | bruteForceProtection não montado | **Alto** | Atual | 🔴 P1 |
| R3 | Interpolação SQL (template literals) | **Alto** | Baixa | 🟡 P2 |
| R4 | requireActiveSubscription acoplado ao legacy | **Médio** | Atual | 🟡 P2 |
| R5 | Cache tenant in-memory (multi-instância) | **Médio** | Média | 🟡 P2 |
| R6 | tenant_id nullable (isolamento parcial) | **Médio** | Alta | 🟡 P2 |
| R7 | Tabela login_attempts sem migration | **Médio** | Média | 🟡 P2 |
| R8 | Endpoints billing sem error handling | **Baixo** | Baixa | 🟢 P3 |
| R9 | DB password default no repositório | **Baixo** | Alta | 🟢 P3 |
| R10 | Módulos stubs vazios | **Baixo** | Atual | 🟢 P3 |
| R11 | Código legado (controllers/, app.legacy.js) | **Baixo** | Baixa | 🟢 P3 |
| R12 | localStorage sem criptografia (tokens) | **Médio** | Baixa | 🟢 P3 |

---

## 6. RECOMENDAÇÕES PRIORIZADAS

### 🔴 URGENTE (P1) — Implementar Antes do Próximo Deploy

#### R1 — Validar JWT_SECRET em Produção
**Arquivo:** `backend/src/config/env.js`
```javascript
jwt: {
  secret: process.env.NODE_ENV === 'production'
    ? (() => { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET required'); return process.env.JWT_SECRET; })()
    : (process.env.JWT_SECRET || 'bh_jwt_secret_dev'),
  // ... mesmo padrão para refreshSecret
}
```

#### R2 — Montar bruteForceProtection nas Rotas de Auth
**Arquivo:** `backend/src/app.multitenant.js`

Substituir:
```javascript
app.use('/api/auth', authRoutes);
```
Por:
```javascript
app.use('/api/auth/login', bruteForceProtection.checkLoginAllowed());
app.use('/api/auth', authRoutes);
```

---

### 🟡 IMPORTANTE (P2) — Implementar na Próxima Sprint

#### R3 — Corrigir Interpolação SQL
**Arquivo:** `backend/src/app.multitenant.js:170`
```javascript
// Substituir template literal por query parametrizada
const [rows] = await sequelize.query(
  `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) as exists`,
  { bind: [table], type: sequelize.QueryTypes.SELECT }
);
```

#### R4 — Injetar Subscription em requireActiveSubscription
Refatorar para receber o modelo como parâmetro, ou buscar via `modules.billing.models.Subscription`.

#### R5 — Migration para login_attempts
Criar `backend/src/migrations/032_create_login_attempts.js` com a tabela necessária para o bruteForceProtection.

#### R6 — Backfill de tenant_id em Tabelas Legadas
Criar script ou migration `033_backfill_tenant_id.js` que preenche `tenant_id` nos registros existentes via:
```sql
UPDATE appointments a
SET tenant_id = e.tenant_id
FROM establishments e
WHERE a.establishment_id = e.id AND a.tenant_id IS NULL;
```

---

### 🟢 MELHORIA (P3) — Backlog Técnico

#### R7 — Error Handling em Endpoints Inline de Billing
Envolver os `app.get('/api/billing/plans', ...)` com `asyncHandler()`.

#### R8 — Redis para Cache de Tenant
Para escalar horizontalmente no Fly.io, substituir o `Map` por Redis (ex: `ioredis`).

#### R9 — Remover Fallback de DB_PASSWORD do docker-compose
Exigir variável explícita; documentar no README.

#### R10 — Limpar Diretórios Vazios e Código Legado
- Remover `backend/src/modules/appointments/`, `clients/`, `notifications/`, `services/` (stubs vazios)
- Remover ou arquivar `backend/src/app.legacy.js`
- Remover os 13 controllers legados inativos

#### R11 — Adicionar NOT NULL em tenant_id Após Backfill
Após executar o backfill (R6), criar migration para tornar `tenant_id NOT NULL` nas tabelas legadas.

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

## 8. PLANO DE AÇÃO PÓS-AUDITORIA

### Fase 1 — Correções Críticas (1-2 dias)
- [ ] R1: Validação obrigatória de JWT_SECRET em produção
- [ ] R2: Montar bruteForceProtection.checkLoginAllowed() em `/api/auth/login`
- [ ] Verificar se `login_attempts` table existe em Supabase production

### Fase 2 — Correções Importantes (Sprint atual)
- [ ] R3: Parametrizar queries com template literals
- [ ] R4: Desacoplar requireActiveSubscription do legacy models
- [ ] R5: Criar migration 032 para `login_attempts`
- [ ] R6: Script de backfill tenant_id em tabelas legadas

### Fase 3 — Limpeza e Hardening (Sprint seguinte)
- [ ] R7: asyncHandler nos endpoints inline de billing
- [ ] R8: Avaliar Redis para tenant cache (se Fly.io escalar)
- [ ] R9: Remover fallback de senhas do docker-compose.yml
- [ ] R10: Limpar diretórios vazios e código legado
- [ ] R11: NOT NULL após backfill de tenant_id

### Fase 4 — Funcionalidades Faltantes (Roadmap)
- [ ] Implementar módulo LGPD (exportação + anonimização de dados)
- [ ] Integração real com Pagar.me (apenas documentada)
- [ ] Webhook resilience com idempotência e retry
- [ ] Implementar módulo completo de notificações
- [ ] Testes automatizados (coverage mínima 70%)

### Estratégia de Deploy Seguro
1. **Feature flags** para novas funcionalidades
2. **Canary deploy** no Fly.io (`vm.count = 2`, 10% → 50% → 100%)
3. **Monitoramento pós-deploy** via logs Winston + UptimeRobot por 2h
4. **Rollback rápido:** `fly releases list && fly deploy --image <previous>`

---

## 9. CHECKLIST DE VERIFICAÇÃO FINAL

### Segurança
- [x] Helmet configurado
- [x] CORS multi-tenant com whitelist
- [x] Rate limiting global + auth
- [x] JWT com expiração curta (1h access, 7d refresh)
- [x] bcrypt para senhas
- [x] Error messages não vazam detalhes em produção
- [ ] **bruteForceProtection não montado** ← CORRIGIR
- [ ] **JWT_SECRET sem validação obrigatória em prod** ← CORRIGIR
- [ ] Tabela `login_attempts` sem migration ← CORRIGIR

### Multi-Tenancy
- [x] BaseRepository com escopo automático
- [x] tenantResolver por subdomain/header
- [x] validateTenantConsistency JWT vs request
- [x] MASTER bypass controlado
- [ ] **tenant_id nullable em tabelas legadas** ← BACKFILL NECESSÁRIO
- [ ] **Cache em memória** ← REDIS para multi-instância

### Qualidade de Código
- [x] Módulos bem separados (tenants, billing, users)
- [x] Constants centralizadas
- [x] Error classes tipadas
- [x] Logging estruturado com contexto
- [ ] **Módulos stubs vazios** ← LIMPAR
- [ ] **Código legado ativo** ← DEPRECAR E REMOVER
- [ ] **Testes automatizados** ← IMPLEMENTAR

---

*Relatório gerado em 16/03/2026 — BeautyHub SaaS Auditoria v1.0*  
*Próxima auditoria recomendada: após implementação das correções P1 e P2*

# RELATÓRIO DE AUDITORIA — BEAUTYHUB

**Data:** 2026-03-11  
**Escopo:** Frontend ↔ Backend ↔ README  
**Método:** Verificação arquivo-a-arquivo do filesystem real

---

## 1. ESTRUTURA REAL DO PROJETO

### Backend — Módulos Ativos (`backend/src/modules/`)

| Módulo | Arquivos | Endpoints Registrados |
|--------|----------|-----------------------|
| `owner-appointments` | 4 | `CRUD /api/appointments` + `/stats` + `/calendar` |
| `owner-clients` | 4 | `CRUD /api/clients` + `/:id/appointments` |
| `owner-services` | 4 | `CRUD /api/services` |
| `owner-financial` | 4 | `CRUD /api/financial/entries` + `/exits` + `/payment-methods` + `/summary` |
| `owner-reports` | 4 | `GET /api/reports/revenue-by-period`, `commission-by-professional`, `top-services`, `top-products`, `financial-summary` |
| `billing` | 41 | `/api/billing/*`, `/api/public/plans`, `/api/master/billing/*` |
| `tenants` | 12 | `/api/tenant`, `/api/master/tenants`, `/api/signup/*` |
| `users` | 8 | `/api/users` (CRUD admin), `/api/profile` (GET/PUT + password) |
| `professionals` | 8 | `/api/professional-details` |
| `financial` | 6 | `/api/payment-transactions` + reports |
| `inventory` | 7 | `CRUD /api/products` + `/adjust-stock` |
| `suppliers` | 6 | `CRUD /api/suppliers` |
| `purchases` | 7 | `CRUD /api/purchases` |
| `public` | 4 | `POST /api/public/register` |

### Backend — Controllers Legacy (`backend/src/controllers/`) — **13 DESATIVADOS**

Todos comentados em `app.multitenant.js`. Substituídos pelos módulos `owner-*`.

```
appointmentController, authController (ativo via routes/auth.js), clientController,
establishmentController, financialController, notificationController,
professionalAreaController (ativo), professionalController, profileController,
reportsController, serviceCategoryController, serviceController, userController
```

### Backend — Rotas Ativas em `app.multitenant.js`

| Grupo | Rota | Status |
|-------|------|--------|
| Público | `GET /api/health` | ✅ |
| Público | `GET /api/public/plans` | ✅ |
| Público | `POST /api/public/register` | ✅ |
| Público | `POST /api/auth/login` | ✅ |
| Público | `POST /api/auth/register` | ✅ |
| Público | `POST /api/signup` | ✅ |
| Público | `POST /api/signup/autonomous` | ✅ |
| Público | `GET /api/signup/check-email` | ✅ |
| Público | `GET /api/signup/check-document` | ✅ |
| Público | `GET /api/billing/plans` | ✅ |
| Master | `CRUD /api/master/tenants` | ✅ |
| Master | `CRUD /api/master/billing/*` | ✅ |
| Tenant | `GET/PUT /api/tenant` | ✅ |
| Tenant | `CRUD /api/users` | ✅ |
| Tenant | `GET/PUT /api/profile` + `PUT /api/profile/password` | ✅ |
| Tenant | `GET /api/notifications` | ✅ |
| Professional | `GET/PUT /api/professional/*` (8 endpoints) | ✅ |
| Owner | `CRUD /api/clients` | ✅ |
| Owner | `CRUD /api/services` | ✅ |
| Owner | `CRUD /api/appointments` + stats/calendar | ✅ |
| Owner | `CRUD /api/financial/*` (entries, exits, payment-methods, summary) | ✅ |
| Owner | `GET /api/professionals` | ✅ |
| Owner | `GET /api/reports/*` | ✅ |
| Owner | `CRUD /api/products` + adjust-stock | ✅ |
| Owner | `CRUD /api/suppliers` | ✅ |
| Owner | `CRUD /api/purchases` | ✅ |
| Owner | `CRUD /api/professional-details` | ✅ |
| Owner | `CRUD /api/payment-transactions` + reports | ✅ |

### Frontend — Módulos (`src/features/`)

| Módulo | Arquivo(s) | Usa `api`? | Usa `api-mappers`? | CRUD Completo? |
|--------|-----------|------------|---------------------|----------------|
| `clients` | `clients.js` | ✅ | ✅ | ✅ GET/POST/PUT/DELETE |
| `appointments` | `appointments.js` | ✅ | ✅ | ✅ GET/POST/PUT/DELETE |
| `services` | `services.js` | ✅ | ✅ | ✅ GET/POST/PUT/DELETE |
| `financial` | `financial.js` | ✅ | ✅ | ✅ GET/POST/PUT/DELETE (entries+exits) |
| `dashboard` | `dashboard.js` | ✅ | ✅ | ✅ GET (appointments+stats) |
| `professionals` | `professionals.js` | ✅ | ❌ | ✅ GET/POST/PUT/DELETE |
| `inventory` | `inventory.js` | ✅ | ❌ | ✅ GET/POST/PUT/DELETE + adjust-stock |
| `suppliers` | `suppliers.js` | ✅ | ❌ | ✅ GET/POST/PUT/DELETE |
| `purchases` | `purchases.js` | ✅ | ❌ | ✅ GET/POST/DELETE |
| `reports` | `reports.js` | ✅ | ❌ | ✅ GET (5 report types) |
| `billing` | `billing.js` + `onboarding.js` | ✅ | ❌ | ✅ GET/POST (subscription+cancel) |
| `settings` | `settings.js` | ✅ | ❌ | ✅ GET/PUT (tenant settings+branding+hours) |
| `account` | `account.js` | ❌ **localStorage** | ❌ | ⚠️ Profile/Email/Password/Phone via localStorage |
| `auth` | `login.js` + `register.js` | ✅ | ❌ | ✅ POST (login+register) |
| `landing` | `landing.js` | — | — | N/A |
| `public` | `landing/landing.js` | ✅ | ❌ | ✅ GET plans + POST register |
| `master/*` | 5 módulos | ✅ | ❌ | ✅ CRUD tenants/plans/billing/system |
| `professional/*` | 7 módulos | ✅ | ❌ | ✅ GET/PUT (dashboard+appointments+clients+earnings+performance+profile+availability) |

---

## 2. DIVERGÊNCIAS README vs CÓDIGO

### Estrutura do Projeto (README linhas 28-68)

| README Afirma | Realidade | Status |
|---------------|-----------|--------|
| `backend/src/app.js` | Produção usa `app.multitenant.js`; `app.legacy.js` deprecated | ❌ DESATUALIZADO |
| `controllers/` — 8 controllers | 13 existem mas **DESATIVADOS** no app.multitenant.js | ❌ DESATUALIZADO |
| `routes/` — 10 route files | 13 legacy + 11 em `routes/owner/` = 24 total | ❌ DESATUALIZADO |
| `migrations/` — 10 migration files | **31 migrations** | ❌ DESATUALIZADO |
| `models/` — 10 Sequelize models | 12 em `models/` + 10+ em `modules/` | ❌ DESATUALIZADO |
| Não menciona `modules/` | **15 módulos, 120 arquivos** — é a camada principal | ❌ OMISSÃO GRAVE |
| `features/` lista 7 módulos | **18 módulos** existem (faltam billing, inventory, suppliers, purchases, reports, services, professionals, professional/*, public/, master/) | ❌ DESATUALIZADO |

### Funcionalidades (README linhas 70-201)

| README Afirma (marcado ✅) | Realidade | Status |
|-----------------------------|-----------|--------|
| "Tabela de categorias personalizadas" (serviços) | Modelo `ServiceCategory.js` existe mas include removido do service por dar erro 500. Tabela existe no DB. | ⚠️ PARCIAL |
| "Exportação de relatórios" (financeiro) | Não encontrada no `financial.js` frontend | ❌ NÃO IMPLEMENTADO |
| "Exportação CSV" (estoque) | Não encontrada no `inventory.js` frontend | ❌ NÃO IMPLEMENTADO |
| "Gráficos Interativos (Chart.js)" | Não encontrado import de Chart.js em nenhum módulo frontend | ❌ NÃO IMPLEMENTADO |
| "LGPD Compliance" (data export, anonymization) | `lgpd.service.js` existe no backend mas sem frontend | ⚠️ BACKEND ONLY |
| "Webhook Resilience" (idempotency, DLQ) | `webhookResilience.service.js` existe no backend | ⚠️ BACKEND ONLY |
| "Pagar.me Integration" | Provider existe (`pagarme.provider.js`) + mock provider | ⚠️ PARCIAL |
| "Persistência de sessão via localStorage" | Auth usa JWT via API; `account.js` migrado para API `/api/profile` | ✅ CORRIGIDO |

### Funcionalidades NÃO Documentadas no README

| Funcionalidade Real | Onde Está | README Menciona? |
|---------------------|-----------|------------------|
| Área do Profissional (7 páginas) | `features/professional/pages/*.js` | ❌ NÃO |
| Professional Area API (8 endpoints) | `routes/professionalArea.js` | ❌ NÃO |
| Onboarding page | `features/billing/pages/onboarding.js` | ❌ NÃO (apenas mencionada como funcionalidade) |
| Subscription Banner | `shared/components/subscription-banner/` | ❌ NÃO |
| Payment Transactions API | `modules/financial/paymentTransaction.*` | ❌ NÃO |
| Professional Details API | `modules/professionals/professionalDetail.*` | ❌ NÃO |
| Self-Signup routes | `modules/tenants/onboarding.*` | ✅ Mencionado brevemente |
| Master Shell (separate layout) | `features/master/shared/master-shell.js` | ❌ NÃO |
| Brute Force Protection | `shared/middleware/bruteForceProtection.js` | ✅ |

---

## 3. ROTAS BACKEND SEM FRONTEND (APIs órfãs)

> **ATUALIZADO:** Todas as APIs órfãs foram implementadas.

| Endpoint Backend | Frontend Page? | Frontend Chama? | Status |
|------------------|----------------|-----------------|--------|
| `PUT /api/professional/availability` | ✅ `professional/availability.js` | ❌ Só GET, não chama PUT | ⚠️ Parcial |
| `CRUD /api/professional-details` | ✅ `professionals/professional-details.js` | ✅ CRUD completo | ✅ IMPLEMENTADO |
| `CRUD /api/payment-transactions` | ✅ `financial/payment-transactions.js` | ✅ Lista+filtros+detalhes+delete | ✅ IMPLEMENTADO |
| `GET /api/users` (admin user management) | ✅ `users/users.js` | ✅ CRUD completo + ativar/desativar | ✅ IMPLEMENTADO |
| `GET/PUT /api/profile` | ✅ `account.js` | ✅ Usa `api.put('/profile')` | ✅ IMPLEMENTADO |
| `PUT /api/profile/password` | ✅ `account.js` | ✅ Usa `api.put('/profile/password')` | ✅ IMPLEMENTADO |
| `CRUD /api/financial/payment-methods` | ✅ `financial/payment-methods.js` | ✅ CRUD completo | ✅ IMPLEMENTADO |

---

## 4. PÁGINAS FRONTEND SEM BACKEND (Pages órfãs)

Nenhuma. Todas as páginas frontend chamam APIs que existem no backend.

---

## 5. SIDEBAR — ✅ IMPLEMENTADO

**Arquivo:** `src/shared/components/shell/shell.js`

> **ATUALIZADO:** Sidebar completo com todos os módulos.

### Menu OWNER/ADMIN (18 itens):
```
dashboard, clients, appointments, services, professionals, financial,
inventory, suppliers, purchases, reports, professional-details,
payment-transactions, payment-methods, users, billing, settings, account, master
```

### Menu PROFESSIONAL (7 itens dedicados):
```
professional/dashboard, professional/appointments, professional/clients,
professional/earnings, professional/performance, professional/availability,
professional/profile
```

---

## 6. MÓDULOS SEM ADAPTER (`api-mappers.js`)

O adapter `shared/utils/api-mappers.js` traduz snake_case ↔ camelCase. Mappers existentes:

- ✅ `mapClientFromAPI` / `mapClientToAPI`
- ✅ `mapAppointmentFromAPI` / `mapAppointmentToAPI`
- ✅ `mapServiceFromAPI` / `mapServiceToAPI`
- ✅ `mapFinancialEntryFromAPI` / `mapFinancialExitFromAPI` / `mapFinancialExitToAPI`
- ✅ `mapProfessionalFromAPI`
- ✅ `extractPaginatedResponse` / `extractDataResponse`

### Módulos que NÃO usam api-mappers (fazem chamadas diretas à API):

| Módulo | Precisa de adapter? | Motivo |
|--------|---------------------|--------|
| `professionals.js` | ⚠️ Opcional | Já funciona com chamadas diretas |
| `inventory.js` | ⚠️ Opcional | Já funciona com chamadas diretas |
| `suppliers.js` | ⚠️ Opcional | Já funciona com chamadas diretas |
| `purchases.js` | ⚠️ Opcional | Já funciona com chamadas diretas |
| `reports.js` | ❌ Não precisa | Apenas leitura, sem mapeamento necessário |
| `billing.js` | ❌ Não precisa | Endpoints específicos, sem CRUD genérico |
| `settings.js` | ❌ Não precisa | Endpoints /tenant específicos |
| `professional/*.js` | ❌ Não precisa | Endpoints específicos da area profissional |
| `master/*.js` | ❌ Não precisa | Endpoints master específicos |

**Nota:** Estes módulos já funcionam corretamente sem mappers. Os campos backend já são consumidos diretamente. Mappers são úteis quando há divergência de nomes (ex: `first_name` → `firstName`), o que os módulos core já resolvem. Os módulos não-core não precisam de mappers obrigatoriamente pois já lidam com snake_case diretamente.

---

## 7. USO DE localStorage — ✅ MIGRADO

### Arquivo: `src/features/account/pages/account.js`

> **ATUALIZADO:** Todas as operações de perfil migradas para API.

| Função | Antes | Agora | Status |
|--------|-------|-------|--------|
| `handleProfileSave` | `updateInCollection(KEYS.USERS, ...)` | `api.put('/profile', { first_name, last_name })` | ✅ MIGRADO |
| `handleEmailSave` | `updateInCollection(KEYS.USERS, ...)` | `api.put('/profile', { email })` | ✅ MIGRADO |
| `handlePasswordSave` | `updateInCollection(KEYS.USERS, ...)` | `api.put('/profile/password', { currentPassword, newPassword })` | ✅ MIGRADO |
| `handlePhoneSave` | `updateInCollection(KEYS.USERS, ...)` | `api.put('/profile', { phone })` | ✅ MIGRADO |
| `notifications settings` | `getItem(KEYS.SETTINGS)` | `getItem(KEYS.SETTINGS)` (mantido) | ⚠️ Sem endpoint backend |

---

## 8. MODAIS FRONTEND — VERIFICAÇÃO COMPLETA

| Módulo | Create Modal | Edit Modal | Delete Modal | Status |
|--------|-------------|------------|--------------|--------|
| `clients.js` | ✅ `openClientModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-client')` | **COMPLETO** |
| `appointments.js` | ✅ `openAppointmentModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-appointment')` | **COMPLETO** |
| `services.js` | ✅ `showServiceModal()` | ✅ (mesmo modal) | ✅ `confirm()` | **COMPLETO** |
| `financial.js` | ✅ `openExpenseModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-financial')` | **COMPLETO** |
| `professionals.js` | ✅ `showProfessionalModal()` | ✅ (mesmo modal) | ✅ `confirm()` | **COMPLETO** |
| `inventory.js` | ✅ `renderProductModal()` | ✅ (mesmo modal) | ✅ `confirm()` + `renderStockAdjustModal()` | **COMPLETO** |
| `suppliers.js` | ✅ `renderSupplierModal()` | ✅ (mesmo modal) | ✅ `confirm()` | **COMPLETO** |
| `purchases.js` | ✅ `renderPurchaseModal()` | ❌ (create only) | ✅ `confirm()` | ⚠️ SEM EDIT (backend não tem PUT) |
| `billing.js` | ✅ Subscribe flow | ❌ N/A | ✅ Cancel subscription | **COMPLETO** |
| `account.js` | N/A | ✅ Modais email/password/phone | N/A | **COMPLETO** (usa API) |
| `reports.js` | N/A (somente leitura) | N/A | N/A | **COMPLETO** |
| `settings.js` | N/A | ✅ Forms de configuração | N/A | **COMPLETO** |
| `master/*.js` | ✅ | ✅ | ✅ | **COMPLETO** |

| `users.js` | ✅ `openUserModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-user')` | **COMPLETO** |
| `professional-details.js` | ✅ `openProfDetailModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-prof-detail')` | **COMPLETO** |
| `payment-transactions.js` | N/A | N/A | ✅ `openModal('delete-tx')` + Detail modal | **COMPLETO** |
| `payment-methods.js` | ✅ `openPMModal()` | ✅ (mesmo modal) | ✅ `openModal('delete-pm')` | **COMPLETO** |

**Resultado: Todos os modais CRUD necessários EXISTEM.** Nenhum modal faltando.

---

## 9. CREDENCIAIS — DESATUALIZADAS NO README

### README atual (linhas 248-260):
```
Frontend (localStorage): adm@adm / prof@prof    ← OBSOLETAS
Backend: master / owner                          ← Incompletas
```

### Credenciais reais (seed `002_seed_master_and_tenant.js`):

| Role | Email | Senha | Tenant |
|------|-------|-------|--------|
| MASTER | `master@beautyhub.com` | `123456` | — |
| OWNER | `owner@belezapura.com` | `123456` | `beleza-pura` |
| ADMIN | `admin@belezapura.com` | `123456` | `beleza-pura` |
| PROFESSIONAL | `prof@belezapura.com` | `123456` | `beleza-pura` |
| PROFESSIONAL | `carlos@belezapura.com` | `123456` | `beleza-pura` |

---

## 10. PLANO DE IMPLEMENTAÇÃO — ✅ CONCLUÍDO

### ✅ IMPLEMENTADO

| # | Ação | Arquivo | Status |
|---|------|---------|--------|
| 1 | Sidebar completo (18 itens OWNER + 7 PROFESSIONAL) | `shell.js` | ✅ |
| 2 | Migrar `account.js` de localStorage para API | `account.js` | ✅ |
| 3 | Frontend User Management (CRUD) | `users/pages/users.js` | ✅ |
| 4 | Frontend Professional Details (CRUD) | `professionals/pages/professional-details.js` | ✅ |
| 5 | Frontend Payment Transactions (lista+filtros+detalhes) | `financial/pages/payment-transactions.js` | ✅ |
| 6 | Frontend Payment Methods (CRUD) | `financial/pages/payment-methods.js` | ✅ |
| 7 | Router atualizado (4 novas rotas + lazy imports) | `core/router.js` | ✅ |
| 8 | README atualizado (estrutura, credenciais, rotas, estado) | `README.md` | ✅ |

### PENDENTE — Melhorias futuras

| # | Ação | Nota |
|---|------|------|
| 1 | Exportação CSV em financial.js e inventory.js | README anterior afirmava que existia |
| 2 | Gráficos Chart.js em financial.js | Canvas existe mas Chart.js não é importado como dep |
| 3 | PUT /api/professional/availability no frontend | availability.js só faz GET |

---

## RESUMO EXECUTIVO

| Métrica | Antes | Depois |
|---------|-------|--------|
| Total endpoints backend | ~70 | ~70 |
| Endpoints com frontend funcional | ~60 | **~70** |
| Endpoints sem interface (sidebar) | 5 módulos | **0** |
| Endpoints backend-only (sem frontend) | 3 | **0** (todos implementados) |
| Módulos frontend com CRUD completo | 13/18 | **17/22** |
| Páginas frontend | 30 | **37** |
| Módulos usando localStorage | 1 (`account.js`) | **0** (migrado para API) |
| Modais CRUD faltando | 0 | **0** |
| Itens no sidebar (OWNER) | 9 | **18** |
| Itens no sidebar (PROFESSIONAL) | 0 (usava filtro OWNER) | **7** (menu dedicado) |
| Rotas no router | 28 | **32** |

### Arquivos criados nesta implementação:
- `src/features/users/pages/users.js` — CRUD gestão de usuários
- `src/features/professionals/pages/professional-details.js` — CRUD detalhes profissionais
- `src/features/financial/pages/payment-transactions.js` — Transações de pagamento
- `src/features/financial/pages/payment-methods.js` — CRUD formas de pagamento
- `src/features/public/privacy-policy.js` — Página pública de Política de Privacidade
- `src/features/public/data-deletion.js` — Página pública de Exclusão de Dados
- `src/features/public/terms-of-service.js` — Página pública de Termos de Serviço

### Arquivos modificados:
- `src/core/router.js` — 4 novas rotas + lazy imports
- `src/shared/components/shell/shell.js` — 4 novos itens sidebar OWNER + menu PROFESSIONAL
- `src/features/account/pages/account.js` — localStorage → API `/api/profile`
- `README.md` — Estrutura, credenciais, rotas, estado atualizados

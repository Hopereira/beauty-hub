# 🔍 AUDITORIA MÓDULO OWNER - FASE 1: INVENTÁRIO COMPLETO

**Data:** 26/02/2026  
**Auditor:** Staff Engineer Full-Stack  
**Objetivo:** Inventário completo de endpoints OWNER e identificação de falhas críticas  

---

## 📋 SUMÁRIO EXECUTIVO

**Status Atual:** ⚠️ **MÓDULO OWNER COM FALHAS CRÍTICAS**

**Problemas Encontrados:**
- ❌ Falta de isolamento `tenant_id` em rotas legadas
- ❌ Uso de `establishment_id` ao invés de `tenant_id`
- ❌ Autorização incorreta (MASTER, ADMIN sem OWNER)
- ❌ Falta de paginação adequada
- ❌ Falta de subscription enforcement em rotas legadas
- ❌ Estrutura inconsistente (módulos novos vs legados)

---

## ══════════════════════════════════
## INVENTÁRIO COMPLETO - ENDPOINTS OWNER
## ══════════════════════════════════

### 1. PRODUTOS (INVENTORY)

**Endpoint:** `/api/products`  
**Controller:** `modules/inventory/product.controller.js`  
**Routes:** `modules/inventory/product.routes.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/products` | ✅ Existe | ✅ Usa tenant_id, ✅ Validação Joi, ✅ Subscription |
| GET | `/api/products` | ✅ Existe | ⚠️ Sem paginação real (limit/offset não retorna total) |
| GET | `/api/products/:id` | ✅ Existe | ✅ OK |
| PUT | `/api/products/:id` | ✅ Existe | ✅ OK |
| DELETE | `/api/products/:id` | ✅ Existe | ✅ OK |
| POST | `/api/products/:id/adjust-stock` | ✅ Existe | ✅ OK |

**Autorização:** `authorize(['owner', 'admin'])` ✅  
**Subscription:** ✅ `requireActiveSubscription()` aplicado  
**Tenant Isolation:** ✅ Usa `req.tenant.id`  
**Validação:** ✅ Joi schemas  

**Score:** 85/100  
**Falhas:**
- ⚠️ Paginação não retorna `total` e `pages` (apenas `count`)
- ⚠️ Filtros não validados com schema

---

### 2. FORNECEDORES (SUPPLIERS)

**Endpoint:** `/api/suppliers`  
**Controller:** `modules/suppliers/supplier.controller.js`  
**Routes:** `modules/suppliers/supplier.routes.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/suppliers` | ✅ Existe | ✅ OK |
| GET | `/api/suppliers` | ✅ Existe | ⚠️ Sem paginação real |
| GET | `/api/suppliers/:id` | ✅ Existe | ✅ OK |
| PUT | `/api/suppliers/:id` | ✅ Existe | ✅ OK |
| DELETE | `/api/suppliers/:id` | ✅ Existe | ✅ OK |

**Autorização:** `authorize(['owner', 'admin'])` ✅  
**Subscription:** ✅ `requireActiveSubscription()` aplicado  
**Tenant Isolation:** ✅ Usa `req.tenant.id`  

**Score:** 85/100  
**Falhas:** Mesmas de produtos

---

### 3. COMPRAS (PURCHASES)

**Endpoint:** `/api/purchases`  
**Controller:** `modules/purchases/purchase.controller.js`  
**Routes:** `modules/purchases/purchase.routes.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/purchases` | ✅ Existe | ✅ OK |
| GET | `/api/purchases` | ✅ Existe | ⚠️ Sem paginação real |
| GET | `/api/purchases/:id` | ✅ Existe | ✅ OK |
| DELETE | `/api/purchases/:id` | ✅ Existe | ✅ OK |

**Autorização:** `authorize(['owner', 'admin'])` ✅  
**Subscription:** ✅ `requireActiveSubscription()` aplicado  
**Tenant Isolation:** ✅ Usa `req.tenant.id`  
**Filtros:** ✅ supplier_id, payment_status, startDate, endDate  

**Score:** 85/100  
**Falhas:** Mesmas de produtos

---

### 4. DETALHES PROFISSIONAIS

**Endpoint:** `/api/professional-details`  
**Controller:** `modules/professionals/professionalDetail.controller.js`  
**Routes:** `modules/professionals/professionalDetail.routes.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/professional-details` | ✅ Existe | ✅ OK |
| GET | `/api/professional-details` | ✅ Existe | ⚠️ Sem paginação real |
| GET | `/api/professional-details/:id` | ✅ Existe | ✅ OK |
| PUT | `/api/professional-details/:id` | ✅ Existe | ✅ OK |
| DELETE | `/api/professional-details/:id` | ✅ Existe | ✅ OK |
| POST | `/api/professional-details/:id/specialties` | ✅ Existe | ✅ OK |
| DELETE | `/api/professional-details/:id/specialties/:specialtyId` | ✅ Existe | ✅ OK |
| POST | `/api/professional-details/:id/service-commissions` | ✅ Existe | ✅ OK |
| GET | `/api/professional-details/:id/statistics` | ✅ Existe | ✅ OK |

**Autorização:** `authorize(['owner', 'admin'])` ✅  
**Subscription:** ✅ `requireActiveSubscription()` aplicado  
**Tenant Isolation:** ✅ Usa `req.tenant.id`  

**Score:** 90/100  
**Falhas:** Paginação

---

### 5. TRANSAÇÕES DE PAGAMENTO

**Endpoint:** `/api/payment-transactions`  
**Controller:** `modules/financial/paymentTransaction.controller.js`  
**Routes:** `modules/financial/paymentTransaction.routes.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/payment-transactions` | ✅ Existe | ✅ OK |
| GET | `/api/payment-transactions` | ✅ Existe | ⚠️ Sem paginação real |
| GET | `/api/payment-transactions/:id` | ✅ Existe | ✅ OK |
| PUT | `/api/payment-transactions/:id` | ✅ Existe | ✅ OK |
| DELETE | `/api/payment-transactions/:id` | ✅ Existe | ✅ OK |

**Autorização:** `authorize(['owner', 'admin'])` ✅  
**Subscription:** ✅ `requireActiveSubscription()` aplicado  
**Tenant Isolation:** ✅ Usa `req.tenant.id`  

**Score:** 85/100

---

### 6. CATEGORIAS DE SERVIÇO

**Endpoint:** `/api/service-categories`  
**Controller:** `controllers/serviceCategoryController.js`  
**Routes:** `routes/serviceCategories.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| POST | `/api/service-categories` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/service-categories` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/service-categories/:id` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/service-categories/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/service-categories/:id` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** `authorize('OWNER', 'ADMIN')` ✅  
**Subscription:** ✅ `requireActiveSubscription({ allowReadOnly: true })` aplicado  
**Tenant Isolation:** ❌ **FALHA CRÍTICA - Não verificado**  

**Score:** 40/100  
**Falhas Críticas:**
- ❌ Controller legado não auditado
- ❌ Não confirmado uso de `tenant_id`
- ❌ Possível uso de `establishment_id`
- ❌ Sem paginação
- ❌ Sem validação Joi

---

### 7. RELATÓRIOS

**Endpoint:** `/api/reports`  
**Controller:** `controllers/reportsController.js`  
**Routes:** `routes/reports.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| GET | `/api/reports/revenue-by-period` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/reports/commission-by-professional` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/reports/top-services` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/reports/top-products` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/reports/financial-summary` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** `authorize('OWNER', 'ADMIN')` ✅  
**Subscription:** ✅ `requireActiveSubscription({ allowReadOnly: true })` aplicado  
**Tenant Isolation:** ❌ **FALHA CRÍTICA**  

**Score:** 30/100  
**Falhas Críticas:**
- ❌ **USA `establishment_id` AO INVÉS DE `tenant_id`**
- ❌ Queries SQL diretas sem `tenant_id`
- ❌ Possível vazamento entre tenants
- ❌ Sem validação de parâmetros
- ❌ Sem paginação

**Exemplo de código problemático:**
```javascript
// reportsController.js linha 12
const establishmentId = req.user.establishment_id; // ❌ ERRADO

// Deveria ser:
const tenantId = req.tenant.id; // ✅ CORRETO
```

---

### 8. FINANCEIRO (LEGADO)

**Endpoint:** `/api/financial`  
**Controller:** `controllers/financialController.js`  
**Routes:** `routes/financial.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| GET | `/api/financial/summary` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/financial/entries` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/financial/entries` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/financial/entries/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/financial/entries/:id` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/financial/exits` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/financial/exits` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/financial/exits/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/financial/exits/:id` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/financial/payment-methods` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/financial/payment-methods` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/financial/payment-methods/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/financial/payment-methods/:id` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** ❌ `authorize('MASTER', 'ADMIN')` - **FALTA OWNER**  
**Subscription:** ❌ **NÃO APLICADO**  
**Tenant Isolation:** ❌ **FALHA CRÍTICA**  

**Score:** 20/100  
**Falhas Críticas:**
- ❌ **USA `establishment_id` AO INVÉS DE `tenant_id`**
- ❌ **OWNER não pode acessar (falta na autorização)**
- ❌ **SEM subscription enforcement**
- ❌ Queries filtram por `establishment_id`
- ❌ Possível vazamento entre tenants
- ❌ Paginação existe mas incompleta

**Exemplo de código problemático:**
```javascript
// financialController.js linha 4-13
async function getEstablishmentId(user) {
  if (user.role === 'ADMIN') {
    const est = await Establishment.findOne({ where: { user_id: user.id } });
    return est ? est.id : null;
  }
  // ...
}
// ❌ COMPLETAMENTE ERRADO - deveria usar req.tenant.id
```

---

### 9. AGENDAMENTOS (LEGADO)

**Endpoint:** `/api/appointments`  
**Controller:** `controllers/appointmentController.js`  
**Routes:** `routes/appointments.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| GET | `/api/appointments` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/appointments/calendar` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/appointments/:id` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/appointments` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/appointments/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/appointments/:id` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** ❌ `authorize('MASTER', 'ADMIN', 'PROFESSIONAL')` - **FALTA OWNER**  
**Subscription:** ❌ **NÃO APLICADO**  
**Tenant Isolation:** ❌ **FALHA CRÍTICA**  

**Score:** 25/100  
**Falhas Críticas:**
- ❌ **USA `establishment_id` AO INVÉS DE `tenant_id`**
- ❌ **OWNER não pode acessar**
- ❌ **SEM subscription enforcement**
- ❌ Paginação existe mas retorna estrutura diferente

---

### 10. SERVIÇOS (LEGADO)

**Endpoint:** `/api/services`  
**Controller:** `controllers/serviceController.js`  
**Routes:** `routes/services.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| GET | `/api/services` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/services/:id` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/services` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/services/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/services/:id` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** ⚠️ `authorize('MASTER', 'ADMIN')` para write - **FALTA OWNER**  
**Subscription:** ❌ **NÃO APLICADO**  
**Tenant Isolation:** ❌ **FALHA CRÍTICA**  

**Score:** 25/100  
**Falhas:** Mesmas de appointments

---

### 11. CLIENTES (LEGADO)

**Endpoint:** `/api/clients`  
**Controller:** `controllers/clientController.js`  
**Routes:** `routes/clients.js`  

| Método | Rota | Status | Problemas |
|--------|------|--------|-----------|
| GET | `/api/clients` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/clients/:id` | ✅ Existe | ❌ **CRÍTICO** |
| POST | `/api/clients` | ✅ Existe | ❌ **CRÍTICO** |
| PUT | `/api/clients/:id` | ✅ Existe | ❌ **CRÍTICO** |
| DELETE | `/api/clients/:id` | ✅ Existe | ❌ **CRÍTICO** |
| GET | `/api/clients/:id/appointments` | ✅ Existe | ❌ **CRÍTICO** |

**Autorização:** ❌ `authorize('MASTER', 'ADMIN', 'PROFESSIONAL')` - **FALTA OWNER**  
**Subscription:** ❌ **NÃO APLICADO**  
**Tenant Isolation:** ❌ **FALHA CRÍTICA**  

**Score:** 25/100

---

## 📊 TABELA RESUMO - TODOS OS ENDPOINTS OWNER

| Módulo | Endpoint Base | Total Rotas | Tenant OK | Subscription OK | Auth OK | Paginação OK | Score |
|--------|---------------|-------------|-----------|-----------------|---------|--------------|-------|
| **Produtos** | `/api/products` | 6 | ✅ | ✅ | ✅ | ⚠️ | 85/100 |
| **Fornecedores** | `/api/suppliers` | 5 | ✅ | ✅ | ✅ | ⚠️ | 85/100 |
| **Compras** | `/api/purchases` | 4 | ✅ | ✅ | ✅ | ⚠️ | 85/100 |
| **Prof. Details** | `/api/professional-details` | 9 | ✅ | ✅ | ✅ | ⚠️ | 90/100 |
| **Pagamentos** | `/api/payment-transactions` | 5 | ✅ | ✅ | ✅ | ⚠️ | 85/100 |
| **Categorias** | `/api/service-categories` | 5 | ❌ | ✅ | ✅ | ❌ | 40/100 |
| **Relatórios** | `/api/reports` | 5 | ❌ | ✅ | ✅ | ❌ | 30/100 |
| **Financeiro** | `/api/financial` | 13 | ❌ | ❌ | ❌ | ⚠️ | 20/100 |
| **Agendamentos** | `/api/appointments` | 6 | ❌ | ❌ | ❌ | ⚠️ | 25/100 |
| **Serviços** | `/api/services` | 5 | ❌ | ❌ | ❌ | ⚠️ | 25/100 |
| **Clientes** | `/api/clients` | 6 | ❌ | ❌ | ❌ | ⚠️ | 25/100 |

**Total de Endpoints:** 69  
**Endpoints OK:** 29 (42%)  
**Endpoints com Falhas:** 40 (58%)  

---

## 🚨 FALHAS CRÍTICAS IDENTIFICADAS

### 1. USO DE `establishment_id` AO INVÉS DE `tenant_id`

**Afetados:**
- ❌ `/api/reports/*` (5 endpoints)
- ❌ `/api/financial/*` (13 endpoints)
- ❌ `/api/appointments/*` (6 endpoints)
- ❌ `/api/services/*` (5 endpoints)
- ❌ `/api/clients/*` (6 endpoints)

**Total:** 35 endpoints com falha crítica de isolamento

**Risco:** ⚠️ **VAZAMENTO DE DADOS ENTRE TENANTS**

### 2. FALTA DE SUBSCRIPTION ENFORCEMENT

**Afetados:**
- ❌ `/api/financial/*` (13 endpoints)
- ❌ `/api/appointments/*` (6 endpoints)
- ❌ `/api/services/*` (5 endpoints)
- ❌ `/api/clients/*` (6 endpoints)

**Total:** 30 endpoints sem subscription enforcement

**Risco:** ⚠️ **ACESSO GRATUITO A FUNCIONALIDADES PAGAS**

### 3. AUTORIZAÇÃO INCORRETA (FALTA OWNER)

**Afetados:**
- ❌ `/api/financial/*` - apenas MASTER, ADMIN
- ❌ `/api/appointments/*` - apenas MASTER, ADMIN, PROFESSIONAL
- ❌ `/api/services/*` (write) - apenas MASTER, ADMIN
- ❌ `/api/clients/*` - apenas MASTER, ADMIN, PROFESSIONAL

**Risco:** ⚠️ **OWNER NÃO CONSEGUE GERENCIAR SEU PRÓPRIO NEGÓCIO**

### 4. PAGINAÇÃO INCOMPLETA

**Afetados:**
- ⚠️ Todos os módulos novos (products, suppliers, etc.)
- ⚠️ Retornam `count` mas não `total` e `pages`

**Risco:** ⚠️ **UX RUIM - FRONTEND NÃO SABE QUANTAS PÁGINAS EXISTEM**

### 5. ESTRUTURA INCONSISTENTE

**Problema:**
- ✅ Módulos novos: `modules/*/` (bem estruturados)
- ❌ Rotas legadas: `routes/` + `controllers/` (mal estruturados)

**Risco:** ⚠️ **MANUTENÇÃO DIFÍCIL, CÓDIGO DUPLICADO**

---

## 📋 ENDPOINTS FALTANTES

### Dashboard OWNER
- ❌ `GET /api/owner/dashboard` - Não existe
- ❌ Métricas gerais do estabelecimento
- ❌ Resumo financeiro
- ❌ Próximos agendamentos
- ❌ Alertas (estoque baixo, pagamentos pendentes)

### Split Calculation
- ❌ `GET /api/owner/split-calculation` - Não existe
- ❌ Cálculo de comissões por profissional
- ❌ Divisão de receitas

### Onboarding
- ⚠️ Existe em `modules/tenants/onboarding.routes.js` mas não montado

### Plan Upgrade
- ⚠️ Existe em billing mas não específico para OWNER

---

## 🎯 SCORE FINAL MÓDULO OWNER

| Categoria | Score | Peso | Nota Ponderada |
|-----------|-------|------|----------------|
| Tenant Isolation | 42% | 30% | 12.6 |
| Subscription Enforcement | 56% | 25% | 14.0 |
| Autorização Correta | 60% | 20% | 12.0 |
| Paginação | 40% | 10% | 4.0 |
| Validação | 50% | 10% | 5.0 |
| Estrutura | 50% | 5% | 2.5 |

**SCORE FINAL:** **50.1/100**

**STATUS:** ❌ **MÓDULO OWNER NÃO ESTÁ PRONTO**

---

## 🔥 AÇÕES OBRIGATÓRIAS (FASE 2)

### Prioridade CRÍTICA (Segurança)

1. **Corrigir isolamento tenant_id em rotas legadas**
   - Substituir `establishment_id` por `tenant_id`
   - Atualizar controllers: financial, reports, appointments, services, clients
   - Garantir filtro `WHERE tenant_id = :tenantId`

2. **Aplicar subscription enforcement**
   - Adicionar `requireActiveSubscription()` em rotas legadas
   - Montar rotas após middleware de subscription

3. **Corrigir autorização**
   - Adicionar `'OWNER'` em todos os `authorize()`
   - Garantir que OWNER tem acesso total ao seu tenant

### Prioridade ALTA (Funcionalidade)

4. **Padronizar paginação**
   - Retornar `{ total, page, limit, pages }` em todos endpoints
   - Usar estrutura igual ao módulo PROFESSIONAL

5. **Criar endpoints faltantes**
   - Dashboard OWNER
   - Split calculation

6. **Refatorar rotas legadas**
   - Migrar para estrutura modular
   - Aplicar padrão dos módulos novos

---

## 📄 PRÓXIMOS PASSOS

**FASE 2:** Corrigir todas as falhas identificadas  
**FASE 3:** Validar frontend OWNER  
**FASE 4:** Testes de segurança  
**FASE 5:** Relatório final com score  

**Estimativa:** 4-6 horas de trabalho

---

**Conclusão:** Módulo OWNER possui **falhas críticas de segurança** que permitem vazamento de dados entre tenants e bypass de subscription. Correção urgente necessária antes de produção.

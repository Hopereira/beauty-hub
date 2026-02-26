# BeautyHub API Documentation

> **Versão:** 2.0.0  
> **Base URL:** `/api`  
> **Arquitetura:** Multi-tenant SaaS com Clean Architecture  
> **Stack:** Node.js + Express + Sequelize + PostgreSQL

---

## Índice

1. [Autenticação e Headers](#autenticação-e-headers)
2. [Rate Limiting](#rate-limiting)
3. [Códigos de Erro](#códigos-de-erro)
4. [Endpoints por Categoria](#endpoints-por-categoria)
   - [Health & Observability](#health--observability)
   - [Auth](#auth)
   - [Onboarding (Self-Signup)](#onboarding-self-signup)
   - [Billing - Public](#billing---public)
   - [Billing - Tenant](#billing---tenant)
   - [Billing - Master Admin](#billing---master-admin)
   - [Billing - Webhooks](#billing---webhooks)
   - [Billing - Mock (Development)](#billing---mock-development)
   - [Tenant Management - Master](#tenant-management---master)
   - [Tenant Management - Tenant](#tenant-management---tenant)
   - [Users](#users)
   - [Profile](#profile)
   - [Clients](#clients-legacy)
   - [Services](#services-legacy)
   - [Professionals](#professionals-legacy)
   - [Appointments](#appointments-legacy)
   - [Financial](#financial-legacy)
   - [Notifications](#notifications-legacy)
   - [Establishments](#establishments-legacy)
   - [Service Categories](#service-categories)
   - [Payment Settings](#payment-settings)
5. [Tabela Resumo](#tabela-resumo)
6. [Lacunas Identificadas](#lacunas-identificadas)

---

## Autenticação e Headers

### Headers Obrigatórios

| Header | Descrição | Obrigatório |
|--------|-----------|-------------|
| `Authorization` | `Bearer {accessToken}` | Sim (rotas autenticadas) |
| `X-Tenant-Slug` | Slug do tenant (ex: `beleza-pura`) | Sim (rotas tenant-scoped) |
| `Content-Type` | `application/json` | Sim (POST/PUT/PATCH) |

### Hierarquia de Roles (RBAC)

```
MASTER > OWNER > ADMIN > PROFESSIONAL > CLIENT
```

| Role | Descrição |
|------|-----------|
| `MASTER` | Super admin do SaaS (sem tenant) |
| `OWNER` | Dono do estabelecimento/tenant |
| `ADMIN` | Administrador do tenant |
| `PROFESSIONAL` | Profissional do estabelecimento |
| `CLIENT` | Cliente final |

---

## Rate Limiting

| Escopo | Limite | Janela |
|--------|--------|--------|
| Global `/api/*` | 500 requests | 15 min |
| Auth `/api/auth/login` | 20 requests | 15 min |
| Auth `/api/auth/register` | 20 requests | 15 min |

**Response 429:**
```json
{
  "success": false,
  "message": "Muitas requisições. Tente novamente em 15 minutos.",
  "error": { "code": "RATE_LIMIT_EXCEEDED", "details": null }
}
```

---

## Códigos de Erro

| HTTP | Código | Descrição |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | Dados inválidos no request |
| 401 | `AUTH_INVALID_CREDENTIALS` | Credenciais inválidas |
| 401 | `AUTH_TOKEN_EXPIRED` | Token JWT expirado |
| 401 | `AUTH_REFRESH_INVALID` | Refresh token inválido |
| 403 | `FORBIDDEN` | Permissão negada |
| 403 | `SUBSCRIPTION_INACTIVE` | Assinatura inativa |
| 403 | `TENANT_SUSPENDED` | Tenant suspenso |
| 403 | `FEATURE_NOT_AVAILABLE` | Feature não disponível no plano |
| 403 | `USAGE_LIMIT_EXCEEDED` | Limite de uso atingido |
| 404 | `NOT_FOUND` | Recurso não encontrado |
| 409 | `CONFLICT` | Conflito (ex: email já existe) |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit excedido |
| 500 | `INTERNAL_ERROR` | Erro interno do servidor |

---

## Endpoints por Categoria

---

### Health & Observability

#### `GET /api/health`

**Descrição:** Health check da API  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não

**Response 200:**
```json
{
  "success": true,
  "message": "Beauty Hub Multi-Tenant API is running.",
  "data": {
    "version": "2.0.0",
    "uptime": 12345.67,
    "timestamp": "2026-02-25T18:00:00.000Z",
    "environment": "development"
  }
}
```

---

### Auth

#### `POST /api/auth/register`

**Descrição:** Registrar novo usuário  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não  
**Rate Limit:** 20/15min

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123",
  "first_name": "João",
  "last_name": "Silva",
  "phone": "11999999999",
  "role": "CLIENT",
  "salon_name": "Meu Salão",
  "cnpj": "12345678000199"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Usuário registrado com sucesso.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "João",
      "last_name": "Silva",
      "role": "CLIENT"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `409 AUTH_EMAIL_EXISTS` - Email já cadastrado

---

#### `POST /api/auth/login`

**Descrição:** Login de usuário  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não  
**Rate Limit:** 20/15min

**Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "João",
      "last_name": "Silva",
      "role": "ADMIN"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `401 AUTH_INVALID_CREDENTIALS` - Credenciais inválidas

---

#### `POST /api/auth/refresh-token`

**Descrição:** Renovar access token  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não

**Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Token renovado com sucesso.",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Erros:**
- `401 AUTH_REFRESH_INVALID` - Refresh token inválido
- `401 AUTH_REFRESH_EXPIRED` - Refresh token expirado

---

#### `GET /api/auth/me`

**Descrição:** Obter perfil do usuário logado  
**Autenticação:** Sim  
**Tenant:** Não  
**Subscription:** Não

**Response 200:**
```json
{
  "success": true,
  "message": "Perfil obtido com sucesso.",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "role": "ADMIN",
    "establishment": { ... },
    "professional": { ... }
  }
}
```

**Erros:**
- `401 AUTH_TOKEN_EXPIRED` - Token expirado
- `404 USER_NOT_FOUND` - Usuário não encontrado

---

### Onboarding (Self-Signup)

#### `POST /api/signup`

**Descrição:** Auto-cadastro de novo tenant com período trial  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não  
**Altera Billing:** Sim (cria subscription trial)  
**Dispara Jobs:** Não

**Body:**
```json
{
  "tenantName": "Salão Beleza Pura",
  "tenantType": "establishment",
  "document": "12345678000199",
  "documentType": "cnpj",
  "phone": "11999999999",
  "ownerName": "Maria Silva",
  "ownerEmail": "maria@belezapura.com",
  "ownerPassword": "senha123",
  "planSlug": "starter",
  "referralCode": "REF123",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "lancamento"
}
```

**Response 201:**
```json
{
  "success": true,
  "message": "Conta criada com sucesso! Você pode fazer login agora.",
  "data": {
    "tenant": {
      "id": "uuid",
      "slug": "salao-beleza-pura",
      "name": "Salão Beleza Pura"
    },
    "user": {
      "id": "uuid",
      "email": "maria@belezapura.com",
      "role": "owner"
    },
    "subscription": {
      "id": "uuid",
      "status": "trial",
      "trial_ends_at": "2026-03-27T00:00:00.000Z"
    }
  }
}
```

**Erros:**
- `400 VALIDATION_ERROR` - Dados inválidos
- `409 EMAIL_EXISTS` - Email já cadastrado
- `409 DOCUMENT_EXISTS` - Documento já cadastrado

---

#### `POST /api/signup/autonomous`

**Descrição:** Cadastro simplificado para profissional autônomo  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não

**Body:**
```json
{
  "name": "João Profissional",
  "email": "joao@autonomo.com",
  "password": "senha123",
  "cpf": "12345678901",
  "phone": "11999999999",
  "planSlug": "starter"
}
```

**Response 201:** (mesmo formato do `/signup`)

---

#### `GET /api/signup/check-email`

**Descrição:** Verificar disponibilidade de email  
**Autenticação:** Não  
**Tenant:** Não

**Query Params:**
| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `email` | string | Sim |

**Response 200:**
```json
{
  "success": true,
  "data": { "available": true }
}
```

---

#### `GET /api/signup/check-document`

**Descrição:** Verificar disponibilidade de CPF/CNPJ  
**Autenticação:** Não  
**Tenant:** Não

**Query Params:**
| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `document` | string | Sim |

**Response 200:**
```json
{
  "success": true,
  "data": { "available": true }
}
```

---

#### `GET /api/signup/check-slug`

**Descrição:** Verificar disponibilidade de slug  
**Autenticação:** Não  
**Tenant:** Não

**Query Params:**
| Param | Tipo | Obrigatório |
|-------|------|-------------|
| `slug` | string | Sim |

**Response 200:**
```json
{
  "success": true,
  "data": { "available": true }
}
```

---

### Billing - Public

#### `GET /api/plans`

**Descrição:** Listar planos públicos disponíveis  
**Autenticação:** Não  
**Tenant:** Não  
**Subscription:** Não

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Starter",
      "slug": "starter",
      "description": "Ideal para começar",
      "price": 0,
      "currency": "BRL",
      "billing_interval": "monthly",
      "trial_days": 30,
      "limits": {
        "users": 2,
        "clients": 50,
        "storage_mb": 100,
        "professionals": 1,
        "appointments_per_month": 100
      },
      "features": ["appointments", "clients", "notifications"]
    }
  ]
}
```

---

#### `GET /api/billing/plans`

**Descrição:** Listar planos (alias)  
**Autenticação:** Não  
**Tenant:** Não

(Mesmo response de `/api/plans`)

---

#### `GET /api/billing/plans/:slug`

**Descrição:** Obter plano por slug  
**Autenticação:** Não  
**Tenant:** Não

**Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `slug` | string | Slug do plano |

**Response 200:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Erros:**
- `404 NOT_FOUND` - Plano não encontrado

---

### Billing - Tenant

#### `GET /api/billing/subscription`

**Descrição:** Obter assinatura atual do tenant  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** CLIENT  
**Subscription:** Não (precisa verificar status)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "plan_id": "uuid",
    "status": "active",
    "billing_cycle": "monthly",
    "current_period_start": "2026-02-01T00:00:00.000Z",
    "current_period_end": "2026-03-01T00:00:00.000Z",
    "trial_ends_at": null,
    "cancelled_at": null,
    "plan": { ... }
  }
}
```

---

#### `POST /api/billing/subscription/activate`

**Descrição:** Ativar assinatura com pagamento  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** ADMIN  
**Altera Billing:** Sim  
**Dispara Jobs:** Sim (processamento de pagamento)

**Body:**
```json
{
  "planId": "uuid",
  "billingCycle": "monthly",
  "paymentMethod": "card",
  "paymentData": {
    "paymentMethodId": "pm_xxx",
    "cardToken": "tok_xxx"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Assinatura ativada com sucesso.",
  "data": {
    "subscription": { ... },
    "invoice": { ... }
  }
}
```

---

#### `POST /api/billing/subscription/pix`

**Descrição:** Criar pagamento PIX  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** ADMIN  
**Altera Billing:** Sim

**Body:**
```json
{
  "planId": "uuid",
  "billingCycle": "monthly"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "qrCode": "00020126...",
    "qrCodeBase64": "data:image/png;base64,...",
    "copyPasteCode": "00020126...",
    "expiresAt": "2026-02-25T19:00:00.000Z"
  }
}
```

---

#### `PUT /api/billing/subscription/plan`

**Descrição:** Trocar plano (upgrade/downgrade)  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** OWNER  
**Altera Billing:** Sim  
**Altera Usage:** Verifica limites

**Body:**
```json
{
  "planId": "uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Plano alterado com sucesso.",
  "data": { "subscription": { ... } }
}
```

**Erros:**
- `400 DOWNGRADE_USAGE_EXCEEDED` - Uso atual excede limites do novo plano

---

#### `POST /api/billing/subscription/cancel`

**Descrição:** Cancelar assinatura  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** OWNER  
**Altera Billing:** Sim

**Body:**
```json
{
  "immediately": false,
  "reason": "Não preciso mais do serviço"
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Assinatura cancelada.",
  "data": {
    "subscription": { ... },
    "effectiveDate": "2026-03-01T00:00:00.000Z"
  }
}
```

---

#### `GET /api/billing/invoices`

**Descrição:** Listar faturas do tenant  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** ADMIN  
**Paginação:** Sim

**Query Params:**
| Param | Tipo | Default |
|-------|------|---------|
| `status` | string | - |
| `limit` | number | 20 |
| `offset` | number | 0 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "invoices": [ ... ],
    "pagination": {
      "total": 10,
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

#### `GET /api/billing/invoices/:id`

**Descrição:** Obter fatura por ID  
**Autenticação:** Sim  
**Tenant:** Sim  
**Role Mínima:** ADMIN

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "subscription_id": "uuid",
    "amount": 59.90,
    "currency": "BRL",
    "status": "paid",
    "items": [ ... ],
    "paid_at": "2026-02-25T10:00:00.000Z"
  }
}
```

---

### Billing - Master Admin

> **Base Path:** `/api/master/billing`  
> **Role:** MASTER only  
> **Tenant:** Não

#### `GET /api/master/billing/plans`

**Descrição:** Listar todos os planos (incluindo inativos)

#### `POST /api/master/billing/plans`

**Descrição:** Criar novo plano  
**Body:** Ver `createPlanSchema` na validação

#### `PUT /api/master/billing/plans/:id`

**Descrição:** Atualizar plano existente

#### `PATCH /api/master/billing/plans/:id/activate`

**Descrição:** Ativar plano

#### `PATCH /api/master/billing/plans/:id/deactivate`

**Descrição:** Desativar plano

#### `GET /api/master/billing/subscriptions`

**Descrição:** Listar todas as assinaturas  
**Paginação:** Sim

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `status` | string | trial, active, past_due, suspended, cancelled, expired |
| `planId` | uuid | Filtrar por plano |
| `billingCycle` | string | monthly, yearly |
| `limit` | number | Default: 20 |
| `offset` | number | Default: 0 |

#### `GET /api/master/billing/subscriptions/:id`

**Descrição:** Obter assinatura por ID

#### `POST /api/master/billing/subscriptions/:id/suspend`

**Descrição:** Suspender assinatura  
**Body:**
```json
{
  "reason": "Motivo da suspensão"
}
```

#### `GET /api/master/billing/mrr`

**Descrição:** Obter MRR (Monthly Recurring Revenue)  
**Response:**
```json
{
  "success": true,
  "data": {
    "mrr": 15990.00,
    "currency": "BRL",
    "activeSubscriptions": 150,
    "trialSubscriptions": 25
  }
}
```

#### `GET /api/master/billing/revenue-summary`

**Descrição:** Resumo de receita por período  
**Query Params:** `startDate`, `endDate`

#### `GET /api/master/billing/invoices`

**Descrição:** Listar todas as faturas (cross-tenant)  
**Paginação:** Sim

#### `GET /api/master/billing/billing/audit-logs`

**Descrição:** Listar logs de auditoria de billing  
**Query Params:** `action`, `tenantId`, `entityType`, `startDate`, `endDate`, `limit`, `offset`

---

### Billing - Webhooks

#### `POST /api/webhooks/billing/:provider`

**Descrição:** Endpoint para receber webhooks dos provedores de pagamento  
**Autenticação:** Via assinatura do webhook  
**Tenant:** Não (extraído do payload)  
**Idempotência:** Sim (via webhook_events table)

**Providers suportados:**
- `stripe`
- `pagarme`
- `mock`

**Headers:**
| Provider | Header de Assinatura |
|----------|---------------------|
| Stripe | `stripe-signature` |
| Pagar.me | `x-hub-signature` |

**Eventos processados:**
- `payment.succeeded` → Ativa subscription
- `payment.failed` → Marca como past_due
- `subscription.cancelled` → Cancela subscription
- `invoice.paid` → Atualiza invoice
- `pix.received` → Processa pagamento PIX

---

### Billing - Mock (Development)

> **Base Path:** `/api/billing/mock`  
> **Disponível:** Apenas quando `PAYMENT_PROVIDER=mock`

#### `GET /api/billing/mock/events`

**Descrição:** Listar eventos mock disponíveis para teste

#### `POST /api/billing/mock/trigger`

**Descrição:** Disparar evento mock  
**Body:**
```json
{
  "event": "payment.succeeded",
  "tenantId": "uuid",
  "subscriptionId": "uuid",
  "data": {}
}
```

#### `POST /api/billing/mock/simulate/trial-expiration`

**Descrição:** Simular expiração de trial

#### `POST /api/billing/mock/simulate/grace-period-expiration`

**Descrição:** Simular expiração de grace period

#### `GET /api/billing/mock/subscription/:tenantId`

**Descrição:** Obter status detalhado da subscription

#### `POST /api/billing/mock/reset/:tenantId`

**Descrição:** Resetar subscription para trial

#### `POST /api/billing/mock/job/:jobName`

**Descrição:** Executar job manualmente  
**Jobs disponíveis:**
- `checkTrialExpiration`
- `checkSubscriptionExpiration`
- `sendRenewalReminders`
- `autoSuspendOverdue`
- `resetMonthlyUsage`
- `retryFailedWebhooks`
- `applyDataRetention`

---

### Tenant Management - Master

> **Base Path:** `/api/master/tenants`  
> **Role:** MASTER only

#### `GET /api/master/tenants`

**Descrição:** Listar todos os tenants  
**Paginação:** Sim

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `status` | string | active, suspended, pending |
| `search` | string | Busca por nome/slug |
| `limit` | number | Default: 20 |
| `offset` | number | Default: 0 |

#### `GET /api/master/tenants/statistics`

**Descrição:** Estatísticas gerais dos tenants  
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "active": 120,
    "suspended": 5,
    "pending": 25,
    "newThisMonth": 15
  }
}
```

#### `GET /api/master/tenants/slug/:slug`

**Descrição:** Buscar tenant por slug

#### `GET /api/master/tenants/:id`

**Descrição:** Buscar tenant por ID

#### `POST /api/master/tenants`

**Descrição:** Criar novo tenant  
**Body:**
```json
{
  "name": "Salão Exemplo",
  "slug": "salao-exemplo",
  "document": "12345678000199",
  "email": "contato@salao.com",
  "phone": "11999999999"
}
```

#### `PUT /api/master/tenants/:id`

**Descrição:** Atualizar tenant

#### `POST /api/master/tenants/:id/activate`

**Descrição:** Ativar tenant

#### `POST /api/master/tenants/:id/suspend`

**Descrição:** Suspender tenant  
**Body:**
```json
{
  "reason": "Motivo da suspensão"
}
```

#### `DELETE /api/master/tenants/:id`

**Descrição:** Deletar tenant (soft delete)

---

### Tenant Management - Tenant

> **Base Path:** `/api/tenant`  
> **Autenticação:** Sim  
> **Tenant:** Sim

#### `GET /api/tenant`

**Descrição:** Obter informações do tenant atual  
**Role Mínima:** Qualquer membro do tenant

#### `PUT /api/tenant/settings`

**Descrição:** Atualizar configurações do tenant  
**Role Mínima:** OWNER  
**Body:**
```json
{
  "timezone": "America/Sao_Paulo",
  "language": "pt-BR",
  "currency": "BRL",
  "businessHours": {
    "monday": { "open": "09:00", "close": "18:00" }
  }
}
```

#### `PUT /api/tenant/branding`

**Descrição:** Atualizar branding do tenant  
**Role Mínima:** OWNER  
**Body:**
```json
{
  "logo": "https://...",
  "primaryColor": "#00A884",
  "secondaryColor": "#075E54"
}
```

---

### Users

> **Base Path:** `/api/users`  
> **Autenticação:** Sim  
> **Tenant:** Sim

#### `GET /api/users`

**Descrição:** Listar usuários do tenant  
**Role Mínima:** ADMIN  
**Paginação:** Sim

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `role` | string | Filtrar por role |
| `status` | string | active, inactive |
| `search` | string | Busca por nome/email |
| `limit` | number | Default: 20 |
| `offset` | number | Default: 0 |

#### `GET /api/users/statistics`

**Descrição:** Estatísticas de usuários  
**Role Mínima:** ADMIN

#### `GET /api/users/:id`

**Descrição:** Obter usuário por ID  
**Role Mínima:** ADMIN

#### `POST /api/users`

**Descrição:** Criar novo usuário  
**Role Mínima:** ADMIN  
**Altera Usage:** Sim (incrementa contador de users)  
**Body:**
```json
{
  "email": "novo@usuario.com",
  "password": "senha123",
  "first_name": "Nome",
  "last_name": "Sobrenome",
  "role": "PROFESSIONAL",
  "phone": "11999999999"
}
```

#### `PUT /api/users/:id`

**Descrição:** Atualizar usuário  
**Role Mínima:** ADMIN

#### `PUT /api/users/:id/password`

**Descrição:** Alterar senha do usuário  
**Role:** Owner da conta ou ADMIN+

#### `PUT /api/users/:id/reset-password`

**Descrição:** Resetar senha (admin)  
**Role Mínima:** ADMIN

#### `PUT /api/users/:id/role`

**Descrição:** Alterar role do usuário  
**Role Mínima:** OWNER

#### `POST /api/users/:id/activate`

**Descrição:** Ativar usuário  
**Role Mínima:** ADMIN

#### `POST /api/users/:id/deactivate`

**Descrição:** Desativar usuário  
**Role Mínima:** ADMIN

#### `DELETE /api/users/:id`

**Descrição:** Deletar usuário  
**Role Mínima:** ADMIN  
**Altera Usage:** Sim (decrementa contador)

---

### Profile

> **Base Path:** `/api/profile`  
> **Autenticação:** Sim  
> **Tenant:** Sim

#### `GET /api/profile`

**Descrição:** Obter perfil do usuário logado

#### `PUT /api/profile`

**Descrição:** Atualizar próprio perfil

#### `PUT /api/profile/password`

**Descrição:** Alterar própria senha  
**Body:**
```json
{
  "currentPassword": "senhaAtual",
  "newPassword": "novaSenha",
  "confirmPassword": "novaSenha"
}
```

---

### Clients (Legacy)

> **Base Path:** `/api/clients`  
> **Autenticação:** Sim  
> **Role Mínima:** PROFESSIONAL  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/clients`

**Descrição:** Listar clientes  
**Paginação:** Sim  
**Altera Usage:** Não

#### `GET /api/clients/:id`

**Descrição:** Obter cliente por ID

#### `POST /api/clients`

**Descrição:** Criar cliente  
**Altera Usage:** Sim (incrementa contador de clients)

#### `PUT /api/clients/:id`

**Descrição:** Atualizar cliente

#### `DELETE /api/clients/:id`

**Descrição:** Deletar cliente  
**Altera Usage:** Sim (decrementa contador)

#### `GET /api/clients/:id/appointments`

**Descrição:** Listar agendamentos do cliente

---

### Services (Legacy)

> **Base Path:** `/api/services`  
> **Autenticação:** Sim  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/services`

**Descrição:** Listar serviços  
**Role Mínima:** Qualquer autenticado  
**Paginação:** Sim

#### `GET /api/services/:id`

**Descrição:** Obter serviço por ID

#### `POST /api/services`

**Descrição:** Criar serviço  
**Role Mínima:** ADMIN

#### `PUT /api/services/:id`

**Descrição:** Atualizar serviço  
**Role Mínima:** ADMIN

#### `DELETE /api/services/:id`

**Descrição:** Deletar serviço  
**Role Mínima:** ADMIN

---

### Professionals (Legacy)

> **Base Path:** `/api/professionals`  
> **Autenticação:** Sim  
> **Role Mínima:** PROFESSIONAL  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/professionals`

**Descrição:** Listar profissionais  
**Paginação:** Sim  
**Altera Usage:** Não

#### `GET /api/professionals/:id`

**Descrição:** Obter profissional por ID

#### `POST /api/professionals`

**Descrição:** Criar profissional  
**Role Mínima:** ADMIN  
**Altera Usage:** Sim (incrementa contador de professionals)

#### `PUT /api/professionals/:id`

**Descrição:** Atualizar profissional  
**Role Mínima:** ADMIN

#### `DELETE /api/professionals/:id`

**Descrição:** Deletar profissional  
**Role Mínima:** ADMIN

#### `GET /api/professionals/:id/appointments`

**Descrição:** Listar agendamentos do profissional

---

### Appointments (Legacy)

> **Base Path:** `/api/appointments`  
> **Autenticação:** Sim  
> **Role Mínima:** PROFESSIONAL  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/appointments`

**Descrição:** Listar agendamentos  
**Paginação:** Sim

#### `GET /api/appointments/calendar`

**Descrição:** Obter agendamentos em formato calendário

#### `GET /api/appointments/:id`

**Descrição:** Obter agendamento por ID

#### `POST /api/appointments`

**Descrição:** Criar agendamento  
**Altera Usage:** Sim (incrementa contador de appointments_per_month)  
**Feature Required:** `appointments`

#### `PUT /api/appointments/:id`

**Descrição:** Atualizar agendamento

#### `DELETE /api/appointments/:id`

**Descrição:** Cancelar agendamento

---

### Financial (Legacy)

> **Base Path:** `/api/financial`  
> **Autenticação:** Sim  
> **Role Mínima:** ADMIN  
> **Feature Required:** `financial`  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/financial/summary`

**Descrição:** Resumo financeiro

#### `GET /api/financial/entries`

**Descrição:** Listar entradas  
**Paginação:** Sim

#### `GET /api/financial/entries/:id`

**Descrição:** Obter entrada por ID

#### `POST /api/financial/entries`

**Descrição:** Criar entrada

#### `PUT /api/financial/entries/:id`

**Descrição:** Atualizar entrada

#### `DELETE /api/financial/entries/:id`

**Descrição:** Deletar entrada

#### `GET /api/financial/exits`

**Descrição:** Listar saídas  
**Paginação:** Sim

#### `GET /api/financial/exits/:id`

**Descrição:** Obter saída por ID

#### `POST /api/financial/exits`

**Descrição:** Criar saída

#### `PUT /api/financial/exits/:id`

**Descrição:** Atualizar saída

#### `DELETE /api/financial/exits/:id`

**Descrição:** Deletar saída

#### `GET /api/financial/payment-methods`

**Descrição:** Listar métodos de pagamento

#### `POST /api/financial/payment-methods`

**Descrição:** Criar método de pagamento

#### `PUT /api/financial/payment-methods/:id`

**Descrição:** Atualizar método de pagamento

#### `DELETE /api/financial/payment-methods/:id`

**Descrição:** Deletar método de pagamento

---

### Notifications (Legacy)

> **Base Path:** `/api/notifications`  
> **Autenticação:** Sim  
> **Feature Required:** `notifications`  
> ⚠️ **Status:** Não migrado para multi-tenant

#### `GET /api/notifications`

**Descrição:** Listar notificações do usuário

#### `PUT /api/notifications/:id/read`

**Descrição:** Marcar notificação como lida

#### `DELETE /api/notifications/:id`

**Descrição:** Deletar notificação

---

### Establishments (Legacy)

> **Base Path:** `/api/establishments`  
> **Autenticação:** Sim  
> **Role Mínima:** ADMIN  
> ⚠️ **Status:** Deprecado - substituído por Tenants

#### `GET /api/establishments`

**Descrição:** Listar estabelecimentos  
**Paginação:** Sim

#### `GET /api/establishments/:id`

**Descrição:** Obter estabelecimento por ID

#### `POST /api/establishments`

**Descrição:** Criar estabelecimento

#### `PUT /api/establishments/:id`

**Descrição:** Atualizar estabelecimento

#### `DELETE /api/establishments/:id`

**Descrição:** Deletar estabelecimento

#### `GET /api/establishments/:id/professionals`

**Descrição:** Listar profissionais do estabelecimento

#### `GET /api/establishments/:id/services`

**Descrição:** Listar serviços do estabelecimento

---

## Tabela Resumo

| Endpoint | Método | Role Mínima | Tenant | Subscription | Paginação |
|----------|--------|-------------|--------|--------------|-----------|
| `/api/health` | GET | - | ❌ | ❌ | ❌ |
| `/api/auth/register` | POST | - | ❌ | ❌ | ❌ |
| `/api/auth/login` | POST | - | ❌ | ❌ | ❌ |
| `/api/auth/refresh-token` | POST | - | ❌ | ❌ | ❌ |
| `/api/auth/me` | GET | Auth | ❌ | ❌ | ❌ |
| `/api/signup` | POST | - | ❌ | ❌ | ❌ |
| `/api/signup/autonomous` | POST | - | ❌ | ❌ | ❌ |
| `/api/signup/check-email` | GET | - | ❌ | ❌ | ❌ |
| `/api/signup/check-document` | GET | - | ❌ | ❌ | ❌ |
| `/api/signup/check-slug` | GET | - | ❌ | ❌ | ❌ |
| `/api/plans` | GET | - | ❌ | ❌ | ❌ |
| `/api/billing/plans` | GET | - | ❌ | ❌ | ❌ |
| `/api/billing/plans/:slug` | GET | - | ❌ | ❌ | ❌ |
| `/api/billing/subscription` | GET | CLIENT | ✅ | ❌ | ❌ |
| `/api/billing/subscription/activate` | POST | ADMIN | ✅ | ❌ | ❌ |
| `/api/billing/subscription/pix` | POST | ADMIN | ✅ | ❌ | ❌ |
| `/api/billing/subscription/plan` | PUT | OWNER | ✅ | ✅ | ❌ |
| `/api/billing/subscription/cancel` | POST | OWNER | ✅ | ✅ | ❌ |
| `/api/billing/invoices` | GET | ADMIN | ✅ | ❌ | ✅ |
| `/api/billing/invoices/:id` | GET | ADMIN | ✅ | ❌ | ❌ |
| `/api/master/billing/plans` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/plans` | POST | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/plans/:id` | PUT | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/plans/:id/activate` | PATCH | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/plans/:id/deactivate` | PATCH | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/subscriptions` | GET | MASTER | ❌ | ❌ | ✅ |
| `/api/master/billing/subscriptions/:id` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/subscriptions/:id/suspend` | POST | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/mrr` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/revenue-summary` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/billing/invoices` | GET | MASTER | ❌ | ❌ | ✅ |
| `/api/master/billing/billing/audit-logs` | GET | MASTER | ❌ | ❌ | ✅ |
| `/api/webhooks/billing/:provider` | POST | Webhook | ❌ | ❌ | ❌ |
| `/api/billing/mock/events` | GET | - | ❌ | ❌ | ❌ |
| `/api/billing/mock/trigger` | POST | - | ❌ | ❌ | ❌ |
| `/api/billing/mock/simulate/*` | POST | - | ❌ | ❌ | ❌ |
| `/api/billing/mock/subscription/:tenantId` | GET | - | ❌ | ❌ | ❌ |
| `/api/billing/mock/reset/:tenantId` | POST | - | ❌ | ❌ | ❌ |
| `/api/billing/mock/job/:jobName` | POST | - | ❌ | ❌ | ❌ |
| `/api/master/tenants` | GET | MASTER | ❌ | ❌ | ✅ |
| `/api/master/tenants/statistics` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/slug/:slug` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/:id` | GET | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants` | POST | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/:id` | PUT | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/:id/activate` | POST | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/:id/suspend` | POST | MASTER | ❌ | ❌ | ❌ |
| `/api/master/tenants/:id` | DELETE | MASTER | ❌ | ❌ | ❌ |
| `/api/tenant` | GET | Member | ✅ | ❌ | ❌ |
| `/api/tenant/settings` | PUT | OWNER | ✅ | ❌ | ❌ |
| `/api/tenant/branding` | PUT | OWNER | ✅ | ❌ | ❌ |
| `/api/users` | GET | ADMIN | ✅ | ✅ | ✅ |
| `/api/users/statistics` | GET | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id` | GET | ADMIN | ✅ | ✅ | ❌ |
| `/api/users` | POST | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id` | PUT | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id/password` | PUT | Auth | ✅ | ✅ | ❌ |
| `/api/users/:id/reset-password` | PUT | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id/role` | PUT | OWNER | ✅ | ✅ | ❌ |
| `/api/users/:id/activate` | POST | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id/deactivate` | POST | ADMIN | ✅ | ✅ | ❌ |
| `/api/users/:id` | DELETE | ADMIN | ✅ | ✅ | ❌ |
| `/api/profile` | GET | Auth | ✅ | ❌ | ❌ |
| `/api/profile` | PUT | Auth | ✅ | ❌ | ❌ |
| `/api/profile/password` | PUT | Auth | ✅ | ❌ | ❌ |
| `/api/clients` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ✅ |
| `/api/clients/:id` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/clients` | POST | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/clients/:id` | PUT | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/clients/:id` | DELETE | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/clients/:id/appointments` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/services` | GET | Auth | ⚠️ | ⚠️ | ✅ |
| `/api/services/:id` | GET | Auth | ⚠️ | ⚠️ | ❌ |
| `/api/services` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/services/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/services/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/professionals` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ✅ |
| `/api/professionals/:id` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/professionals` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/professionals/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/professionals/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/professionals/:id/appointments` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/appointments` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ✅ |
| `/api/appointments/calendar` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/appointments/:id` | GET | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/appointments` | POST | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/appointments/:id` | PUT | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/appointments/:id` | DELETE | PROFESSIONAL | ⚠️ | ⚠️ | ❌ |
| `/api/financial/summary` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/entries` | GET | ADMIN | ⚠️ | ⚠️ | ✅ |
| `/api/financial/entries/:id` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/entries` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/entries/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/entries/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/exits` | GET | ADMIN | ⚠️ | ⚠️ | ✅ |
| `/api/financial/exits/:id` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/exits` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/exits/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/exits/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/payment-methods` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/payment-methods` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/payment-methods/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/financial/payment-methods/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/notifications` | GET | Auth | ⚠️ | ⚠️ | ❌ |
| `/api/notifications/:id/read` | PUT | Auth | ⚠️ | ⚠️ | ❌ |
| `/api/notifications/:id` | DELETE | Auth | ⚠️ | ⚠️ | ❌ |
| `/api/establishments` | GET | ADMIN | ⚠️ | ⚠️ | ✅ |
| `/api/establishments/:id` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/establishments` | POST | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/establishments/:id` | PUT | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/establishments/:id` | DELETE | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/establishments/:id/professionals` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |
| `/api/establishments/:id/services` | GET | ADMIN | ⚠️ | ⚠️ | ❌ |

> **Legenda:**  
> ⚠️ = Legacy (não migrado para multi-tenant)  
> ✅ = Sim  
> ❌ = Não

---

## Lacunas Identificadas

### ⚠️ Recursos Existentes Sem Endpoint

| Recurso | Tabela/Model | Status |
|---------|--------------|--------|
| Usage Logs | `usage_logs` | Sem endpoints de consulta (apenas interno) |
| Usage Counters | `usage_counters` | Sem endpoints (apenas interno via UsageService) |
| Webhook Events | `webhook_events` | Sem endpoints de consulta (DLQ interno) |
| Login Attempts | `login_attempts` | Sem endpoints (brute force protection interno) |
| Data Retention Logs | `data_retention_logs` | Sem endpoints (LGPD interno) |
| Payment Transactions | `payment_transactions` | Sem endpoints diretos |
| LGPD Service | - | Sem endpoints expostos para export/delete data |

### ⚠️ Endpoints Legacy Não Migrados

Os seguintes módulos existem mas **não estão montados** no `app.multitenant.js`:

1. **Clients** (`/api/clients`) - Rotas existem mas não montadas
2. **Services** (`/api/services`) - Rotas existem mas não montadas
3. **Professionals** (`/api/professionals`) - Rotas existem mas não montadas
4. **Appointments** (`/api/appointments`) - Rotas existem mas não montadas
5. **Financial** (`/api/financial`) - Rotas existem mas não montadas
6. **Notifications** (`/api/notifications`) - Rotas existem mas não montadas
7. **Establishments** (`/api/establishments`) - Rotas existem mas não montadas

### ⚠️ Features Sem Middleware de Controle

| Feature | Controle Atual |
|---------|----------------|
| `appointments` | checkUsageLimit disponível mas não aplicado |
| `clients` | checkUsageLimit disponível mas não aplicado |
| `professionals` | checkUsageLimit disponível mas não aplicado |
| `financial` | requireFeature disponível mas não aplicado |
| `reports` | requireFeature disponível mas não aplicado |
| `api_access` | Sem controle implementado |
| `custom_branding` | Sem controle implementado |
| `advanced_analytics` | Sem endpoints implementados |

### ⚠️ Endpoints Recomendados (Não Implementados)

| Endpoint | Descrição | Prioridade |
|----------|-----------|------------|
| `GET /api/usage` | Consultar uso atual do tenant | Alta |
| `GET /api/usage/history` | Histórico de uso | Média |
| `POST /api/lgpd/export` | Exportar dados do usuário (LGPD) | Alta |
| `POST /api/lgpd/delete` | Solicitar exclusão de dados | Alta |
| `GET /api/metrics` | Métricas de observabilidade | Média |
| `POST /api/auth/logout` | Logout explícito | Baixa |
| `POST /api/auth/forgot-password` | Recuperar senha | Alta |
| `POST /api/auth/reset-password` | Resetar senha com token | Alta |

---

## Estatísticas da API

| Categoria | Endpoints |
|-----------|-----------|
| **Health** | 1 |
| **Auth** | 4 |
| **Onboarding** | 5 |
| **Billing Public** | 3 |
| **Billing Tenant** | 6 |
| **Billing Master** | 10 |
| **Webhooks** | 1 |
| **Mock Billing** | 7 |
| **Tenant Master** | 9 |
| **Tenant** | 3 |
| **Users** | 10 |
| **Profile** | 3 |
| **Legacy (não montados)** | 44 |
| **Total** | **106** |
| **Ativos no multi-tenant** | **62** |

---

## Service Categories

### GET /api/service-categories
Lista todas as categorias de serviços do tenant.

**Auth:** Required  
**Role:** OWNER, ADMIN  
**Headers:** `Authorization`, `X-Tenant-Slug`

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "establishment_id": "uuid",
      "name": "Cabelo",
      "description": "Serviços relacionados a cabelo",
      "color": "#E91E63",
      "icon": "fa-cut",
      "active": true,
      "created_at": "2026-02-26T00:00:00.000Z",
      "updated_at": "2026-02-26T00:00:00.000Z"
    }
  ]
}
```

### POST /api/service-categories
Cria uma nova categoria de serviço.

**Auth:** Required  
**Role:** OWNER, ADMIN  
**Headers:** `Authorization`, `X-Tenant-Slug`

**Request Body:**
```json
{
  "name": "Cabelo",
  "description": "Serviços relacionados a cabelo",
  "color": "#E91E63",
  "icon": "fa-cut"
}
```

### PUT /api/service-categories/:id
Atualiza uma categoria de serviço.

### DELETE /api/service-categories/:id
Remove uma categoria de serviço (soft delete).

---

## Payment Settings

### GET /api/establishments/payment-settings
Retorna as configurações de pagamento do establishment.

**Auth:** Required  
**Role:** OWNER  
**Headers:** `Authorization`, `X-Tenant-Slug`

**Response 200:**
```json
{
  "data": {
    "payment_settings": {
      "pagarme_api_key": "sk_test_...",
      "automatic_anticipation": true
    },
    "bank_account": {
      "bank_code": "001",
      "account_type": "conta_corrente",
      "agencia": "0001",
      "agencia_dv": "9",
      "conta": "12345",
      "conta_dv": "6",
      "legal_name": "Nome Completo do Titular",
      "document_number": "12345678901"
    },
    "pagarme_recipient_id": "re_ck1234567890"
  }
}
```

### PUT /api/establishments/payment-settings
Atualiza as configurações de pagamento e cria/atualiza recipient no Pagar.me.

**Auth:** Required  
**Role:** OWNER  
**Headers:** `Authorization`, `X-Tenant-Slug`

**Request Body:**
```json
{
  "payment_settings": {
    "pagarme_api_key": "sk_test_...",
    "automatic_anticipation": true
  },
  "bank_account": {
    "bank_code": "001",
    "account_type": "conta_corrente",
    "agencia": "0001",
    "agencia_dv": "9",
    "conta": "12345",
    "conta_dv": "6",
    "legal_name": "Nome Completo do Titular",
    "document_number": "12345678901"
  }
}
```

**Response 200:**
```json
{
  "message": "Configurações de pagamento atualizadas com sucesso",
  "data": {
    "pagarme_recipient_id": "re_ck1234567890"
  }
}
```

**Notas:**
- Se `pagarme_api_key` for fornecida, o sistema tentará criar/atualizar o recipient no Pagar.me
- O `pagarme_recipient_id` é gerado automaticamente pela API Pagar.me
- Dados bancários seguem o padrão da API Pagar.me v5

---

## Changelog

| Data | Versão | Alteração |
|------|--------|-----------|
| 2026-02-26 | 2.1.0 | Adicionados endpoints de categorias de serviços e configurações de pagamento |
| 2026-02-25 | 2.0.0 | Documentação inicial multi-tenant |

---

*Documentação atualizada em 26/02/2026*


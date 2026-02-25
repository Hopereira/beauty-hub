# Sistema de Billing - BeautyHub SaaS

> **Versão**: 1.0  
> **Data**: Fevereiro 2026

---

## Sumário

1. [Arquitetura](#1-arquitetura)
2. [Planos Oficiais](#2-planos-oficiais)
3. [Fluxos de Pagamento](#3-fluxos-de-pagamento)
4. [Endpoints API](#4-endpoints-api)
5. [Middleware de Bloqueio](#5-middleware-de-bloqueio)
6. [Jobs Automáticos](#6-jobs-automáticos)
7. [Webhook Strategy](#7-webhook-strategy)
8. [Checklist de Produção](#8-checklist-de-produção)

---

## 1. Arquitetura

### Estrutura de Pastas

```
modules/billing/
├── index.js                    # Entry point do módulo
├── BILLING_SYSTEM.md           # Esta documentação
│
├── controllers/
│   ├── index.js
│   ├── billing.controller.js   # Endpoints tenant
│   ├── master.controller.js    # Endpoints MASTER
│   └── webhook.controller.js   # Webhooks
│
├── services/
│   ├── index.js
│   ├── plan.service.js         # Gerenciamento de planos
│   ├── subscription.service.js # Assinaturas
│   ├── invoice.service.js      # Faturas
│   └── audit.service.js        # Audit logs
│
├── providers/
│   ├── index.js
│   ├── paymentProvider.interface.js  # Interface abstrata
│   ├── mock.provider.js              # Mock para dev/testes
│   └── stripe.provider.js            # Implementação Stripe
│
├── middleware/
│   └── requireActiveSubscription.js  # Bloqueio por inadimplência
│
├── routes/
│   ├── index.js
│   ├── billing.routes.js       # Rotas tenant
│   ├── master.routes.js        # Rotas MASTER
│   └── webhook.routes.js       # Rotas webhook
│
├── validation/
│   └── billing.validation.js   # Schemas Joi
│
├── jobs/
│   ├── index.js
│   └── billing.jobs.js         # Jobs automatizados
│
├── seeders/
│   └── 003_seed_official_plans.js
│
└── models (existentes)
    ├── subscriptionPlan.model.js
    ├── subscription.model.js
    ├── invoice.model.js
    └── usageLog.model.js
```

### PaymentProvider Interface

```javascript
// Abstração para trocar gateways sem alterar lógica de negócio
const provider = getPaymentProvider('stripe'); // ou 'mock', 'mercadopago'

// Métodos disponíveis:
await provider.createCustomer(data);
await provider.createSubscription(data);
await provider.cancelSubscription(subscriptionId);
await provider.createPixCharge(data);
await provider.createCheckoutSession(data);
await provider.handleWebhook(payload, signature);
```

---

## 2. Planos Oficiais

| Plano | Mensal | Anual (-15%) | Trial | Usuários | Profissionais | Agendamentos/mês |
|-------|--------|--------------|-------|----------|---------------|------------------|
| **Starter** | R$ 0 | R$ 0 | 30 dias | 2 | 1 | 100 |
| **Growth** | R$ 29,90 | R$ 305,00 | 7 dias | 5 | 3 | 500 |
| **Professional** | R$ 59,90 | R$ 611,00 | 7 dias | 15 | 10 | 2.000 |
| **Enterprise** | R$ 99,90 | R$ 1.019,00 | 14 dias | ∞ | ∞ | ∞ |

### Features por Plano

```
Starter:      appointments, clients, notifications
Growth:       + financial, reports
Professional: + professionals, custom_branding
Enterprise:   + multi_location, advanced_analytics, api_access
```

---

## 3. Fluxos de Pagamento

### 3.1 Fluxo Cartão (Recorrente)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────▶│   Backend   │────▶│   Gateway   │
│  (Frontend) │     │             │     │  (Stripe)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ 1. Seleciona      │                   │
      │    plano/ciclo    │                   │
      │──────────────────▶│                   │
      │                   │ 2. Cria customer  │
      │                   │    + subscription │
      │                   │──────────────────▶│
      │                   │                   │
      │                   │ 3. Retorna        │
      │                   │    client_secret  │
      │                   │◀──────────────────│
      │ 4. Confirma       │                   │
      │    pagamento      │                   │
      │◀──────────────────│                   │
      │                   │ 5. Webhook        │
      │                   │    payment_success│
      │                   │◀──────────────────│
      │                   │                   │
      │                   │ 6. Atualiza       │
      │                   │    subscription   │
      │                   │    status=ACTIVE  │
```

### 3.2 Fluxo PIX

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tenant    │────▶│   Backend   │────▶│   Gateway   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │ 1. POST /pix      │                   │
      │    {planId,cycle} │                   │
      │──────────────────▶│                   │
      │                   │ 2. Cria cobrança  │
      │                   │    PIX            │
      │                   │──────────────────▶│
      │                   │                   │
      │ 3. Retorna QR     │ ◀─────────────────│
      │    Code + copy    │                   │
      │◀──────────────────│                   │
      │                   │                   │
      │ [Usuário paga]    │                   │
      │                   │                   │
      │                   │ 4. Webhook        │
      │                   │    pix.received   │
      │                   │◀──────────────────│
      │                   │                   │
      │                   │ 5. Ativa          │
      │                   │    subscription   │
      │ 6. Notifica       │                   │
      │◀──────────────────│                   │
```

### 3.3 Regras de Bloqueio

```
Trial Expira
    │
    ▼
PAST_DUE (grace period 7 dias)
    │
    ├── Pagamento OK ──▶ ACTIVE
    │
    └── 7 dias sem pagar
            │
            ▼
        SUSPENDED (permite apenas leitura)
            │
            ├── Pagamento OK ──▶ ACTIVE
            │
            └── 30 dias sem pagar
                    │
                    ▼
                CANCELLED (dados retidos)
```

---

## 4. Endpoints API

### 4.1 Endpoints Públicos

```
GET  /api/billing/plans           # Lista planos públicos
GET  /api/billing/plans/:slug     # Detalhes do plano
```

### 4.2 Endpoints Tenant (auth required)

```
GET  /api/billing/subscription              # Assinatura atual
POST /api/billing/subscription/activate     # Ativar com cartão
POST /api/billing/subscription/pix          # Gerar PIX
PUT  /api/billing/subscription/plan         # Trocar plano
POST /api/billing/subscription/cancel       # Cancelar
GET  /api/billing/invoices                  # Listar faturas
GET  /api/billing/invoices/:id              # Detalhes fatura
```

### 4.3 Endpoints MASTER

```
# Planos
GET    /api/master/plans                    # Listar todos
POST   /api/master/plans                    # Criar plano
PUT    /api/master/plans/:id                # Atualizar plano
PATCH  /api/master/plans/:id/activate       # Ativar plano
PATCH  /api/master/plans/:id/deactivate     # Desativar plano

# Assinaturas
GET    /api/master/subscriptions            # Listar todas
GET    /api/master/subscriptions/:id        # Detalhes
POST   /api/master/subscriptions/:id/suspend # Suspender

# Revenue
GET    /api/master/mrr                      # MRR atual
GET    /api/master/revenue-summary          # Resumo receita

# Invoices
GET    /api/master/invoices                 # Todas faturas

# Audit
GET    /api/master/billing/audit-logs       # Logs de auditoria
```

### 4.4 Webhooks

```
POST /api/webhooks/billing/:provider        # Stripe, MercadoPago, etc.
```

---

## 5. Middleware de Bloqueio

### Uso

```javascript
const { requireActiveSubscription } = require('./modules/billing');

// Bloqueia write operations para assinaturas inativas
app.use('/api/appointments', requireActiveSubscription(), appointmentRoutes);

// Permite leitura, bloqueia escrita
app.use('/api/clients', requireActiveSubscription({ allowRead: true }), clientRoutes);

// Requer feature específica
app.use('/api/reports', requireFeature('reports'), reportRoutes);

// Verifica limite de uso
app.use('/api/professionals', checkUsageLimit('professionals', getProfessionalCount));
```

### Comportamento

| Status | GET/HEAD | POST/PUT/DELETE |
|--------|----------|-----------------|
| ACTIVE | ✅ | ✅ |
| TRIAL | ✅ | ✅ (se não expirou) |
| PAST_DUE | ✅ | ✅ (grace period) |
| SUSPENDED | ✅ | ❌ `SubscriptionInactiveError` |
| CANCELLED | ❌ | ❌ |

### Resposta de Erro

```json
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_EXPIRED",
    "message": "Your subscription is inactive. Please renew to continue.",
    "subscriptionStatus": "suspended"
  }
}
```

---

## 6. Jobs Automáticos

### Definições

| Job | Cron | Descrição |
|-----|------|-----------|
| `check-trial-expiration` | `0 0 * * *` | Expira trials vencidos |
| `check-subscription-expiration` | `0 */6 * * *` | Verifica grace period |
| `send-renewal-reminders` | `0 9 * * *` | Notifica 3 dias antes |
| `auto-suspend` | `0 1 * * *` | Suspende após 30 dias |
| `process-overdue-invoices` | `0 */4 * * *` | Marca faturas vencidas |
| `cleanup-expired-pix` | `0 */2 * * *` | Limpa PIX expirados |

### Execução Manual

```javascript
const { createJobRunner } = require('./modules/billing');

const runner = createJobRunner(models, services);

// Executar job específico
await runner.runJob('billing:check-trial-expiration');

// Executar todos
await runner.runAllJobs();
```

### Integração BullMQ (futuro)

```javascript
const { BULLMQ_CONFIG, JOB_DEFINITIONS } = require('./modules/billing');

const queue = new Queue(BULLMQ_CONFIG.queueName, { connection: redis });

// Adicionar jobs com cron
for (const job of Object.values(JOB_DEFINITIONS)) {
  await queue.add(job.name, {}, { repeat: { cron: job.cron } });
}
```

---

## 7. Webhook Strategy

### Eventos Suportados

```javascript
const WEBHOOK_EVENTS = {
  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  PIX_RECEIVED: 'pix.received',
  PIX_EXPIRED: 'pix.expired',
};
```

### Processamento

```
1. Recebe webhook
2. Verifica assinatura
3. Parseia evento (provider-specific → interno)
4. Processa baseado no tipo
5. Atualiza subscription/invoice
6. Dispara notificações
7. Retorna 200 OK
```

### Retry Policy

- Sempre retorna 200 para evitar re-tentativas infinitas
- Loga erros para análise
- Implementar idempotency keys para evitar duplicatas

---

## 8. Checklist de Produção

### 8.1 Ambiente

```
□ PAYMENT_PROVIDER=stripe (ou outro)
□ STRIPE_SECRET_KEY configurada
□ STRIPE_WEBHOOK_SECRET configurada
□ STRIPE_PUBLISHABLE_KEY no frontend
```

### 8.2 Database

```
□ Migration 017_enhance_billing_tables executada
□ Seeder 003_seed_official_plans executado
□ Índices criados (verificar performance)
□ Backup automático configurado
```

### 8.3 Gateway de Pagamento

```
□ Conta Stripe/MercadoPago ativada
□ Modo produção habilitado
□ Produtos/Prices criados no Stripe
□ Webhook endpoint configurado
□ Testar webhook com Stripe CLI
□ Domínio verificado (se necessário)
```

### 8.4 Webhooks

```
□ URL pública acessível: POST /api/webhooks/billing/:provider
□ SSL/TLS configurado
□ Assinatura de webhook verificada
□ Logs de webhook implementados
□ Retry handling configurado
□ Idempotency keys implementadas
```

### 8.5 Jobs

```
□ Cron configurado (ou BullMQ)
□ check-trial-expiration rodando diariamente
□ send-renewal-reminders rodando às 9h
□ auto-suspend rodando diariamente
□ Monitoramento de jobs (falhas, duração)
```

### 8.6 Segurança

```
□ Rate limiting em endpoints de billing
□ Validação de tenant ↔ subscription
□ Audit logs habilitados
□ Não expor dados sensíveis de pagamento
□ Compliance PCI-DSS (via Stripe Elements)
```

### 8.7 Notificações

```
□ Email de boas-vindas (trial iniciado)
□ Email de trial expirando (3 dias antes)
□ Email de pagamento confirmado
□ Email de pagamento falhou
□ Email de assinatura suspensa
□ Templates de email criados
```

### 8.8 Frontend

```
□ Página de pricing com planos
□ Checkout com Stripe Elements
□ Exibição de QR Code PIX
□ Página de gerenciamento de assinatura
□ Histórico de faturas
□ Mensagens de erro claras
□ Banner de assinatura expirando
```

### 8.9 Testes

```
□ Testes unitários dos services
□ Testes de integração com Mock provider
□ Teste de fluxo completo (cartão)
□ Teste de fluxo PIX
□ Teste de webhook com assinatura
□ Teste de bloqueio por inadimplência
□ Teste de troca de plano
□ Teste de cancelamento
```

### 8.10 Monitoramento

```
□ Alertas para payment_failed
□ Alertas para webhook errors
□ Dashboard de MRR
□ Dashboard de churn
□ Métricas de conversão trial → paid
□ Logs estruturados com correlationId
```

---

## Variáveis de Ambiente

```env
# Payment Provider
PAYMENT_PROVIDER=stripe

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Billing defaults
BILLING_GRACE_PERIOD_DAYS=7
BILLING_SUSPENSION_DAYS=30
BILLING_DEFAULT_TRIAL_DAYS=30
BILLING_PIX_EXPIRATION_HOURS=24
BILLING_REMINDER_DAYS_BEFORE=3
```

---

## Comandos Úteis

```bash
# Executar migration
npx sequelize-cli db:migrate

# Executar seeder de planos
npx sequelize-cli db:seed --seed 003_seed_official_plans.js

# Testar webhook localmente (Stripe CLI)
stripe listen --forward-to localhost:5001/api/webhooks/billing/stripe

# Simular evento de webhook
stripe trigger payment_intent.succeeded
```

---

*Documentação atualizada em Fevereiro 2026*

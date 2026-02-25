# Mock Billing API

Endpoints para testar fluxos de billing em desenvolvimento. **Disponível apenas quando `PAYMENT_PROVIDER=mock`**.

## Base URL
```
POST /api/billing/mock/...
```

---

## Endpoints

### 1. Listar Eventos Suportados
```http
GET /api/billing/mock/events
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "events": ["payment_success", "payment_failed", "subscription_expired", ...],
    "description": { ... }
  }
}
```

---

### 2. Trigger de Evento Mock
```http
POST /api/billing/mock/trigger
Content-Type: application/json

{
  "event": "payment_success",
  "tenantId": "uuid-or-slug",
  "data": {
    "billingCycle": "monthly",
    "paymentMethod": "card"
  }
}
```

#### Eventos Disponíveis

| Evento | Descrição | Transição de Status |
|--------|-----------|---------------------|
| `payment_success` | Pagamento aprovado | `trial/suspended/past_due → active` |
| `payment_failed` | Pagamento recusado | `active → past_due` |
| `subscription_expired` | Assinatura expirada | `any → expired` |
| `invoice_overdue` | Fatura em atraso | `any → past_due` + cria invoice |
| `trial_expired` | Trial expirado | `trial → expired` |
| `subscription_suspended` | Suspensão por inadimplência | `past_due → suspended` |
| `pix_received` | Pagamento PIX confirmado | `any → active` |
| `subscription_renewed` | Renovação automática | `active → active` (novo período) |

**Exemplo de Resposta:**
```json
{
  "success": true,
  "message": "Event 'payment_success' processed successfully",
  "data": {
    "event": "payment_success",
    "subscriptionId": "uuid",
    "tenantId": "uuid",
    "statusTransition": {
      "from": "trial",
      "to": "active"
    },
    "subscription": {
      "id": "uuid",
      "status": "active",
      "currentPeriodEnd": "2026-03-25T16:25:55.201Z"
    }
  }
}
```

---

### 3. Simular Expiração de Trial
```http
POST /api/billing/mock/simulate/trial-expiration
Content-Type: application/json

{
  "tenantId": "uuid-or-slug"
}
```

Força a expiração imediata do trial, definindo `trial_ends_at` no passado e status `expired`.

---

### 4. Simular Expiração de Grace Period
```http
POST /api/billing/mock/simulate/grace-period-expiration
Content-Type: application/json

{
  "tenantId": "uuid-or-slug"
}
```

Suspende a assinatura como se o grace period tivesse expirado.

---

### 5. Status Detalhado da Assinatura
```http
GET /api/billing/mock/subscription/:tenantIdOrSlug
```

**Exemplo:** `/api/billing/mock/subscription/beleza-pura`

**Resposta:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "uuid",
      "status": "active",
      "plan": { "id": "uuid", "name": "Professional", "slug": "professional" }
    },
    "dates": {
      "trialEndsAt": "2026-03-10T...",
      "currentPeriodEnd": "2026-03-25T..."
    },
    "statusChecks": {
      "isTrialExpired": false,
      "isPeriodExpired": false,
      "shouldBlock": false
    },
    "tenant": { "id": "uuid", "name": "Salão Beleza Pura", "status": "active" }
  }
}
```

---

### 6. Reset de Assinatura (Volta ao Trial)
```http
POST /api/billing/mock/reset/:tenantId
Content-Type: application/json

{
  "planSlug": "starter",
  "trialDays": 30
}
```

Útil para testar fluxos do zero novamente.

---

### 7. Executar Job de Billing Manualmente
```http
POST /api/billing/mock/job/:jobName
Content-Type: application/json

{
  "dryRun": true
}
```

#### Jobs Disponíveis

| Job | Descrição |
|-----|-----------|
| `check_trial_expirations` | Expira trials vencidos |
| `check_subscription_expirations` | Define `past_due` para assinaturas vencidas |
| `auto_suspend_subscriptions` | Suspende após grace period |
| `send_renewal_reminders` | Lista assinaturas próximas de renovar |

**Exemplo:** `POST /api/billing/mock/job/auto_suspend_subscriptions`

---

## Fluxo de Status

```
┌──────────┐    pagamento    ┌────────┐
│  TRIAL   │ ──────────────► │ ACTIVE │
└────┬─────┘                 └───┬────┘
     │                           │
     │ expiração                 │ falha pagamento
     ▼                           ▼
┌──────────┐                ┌──────────┐
│ EXPIRED  │                │ PAST_DUE │
└──────────┘                └────┬─────┘
                                 │
                                 │ grace period expirado
                                 ▼
                            ┌───────────┐
                            │ SUSPENDED │
                            └─────┬─────┘
                                  │
                                  │ pagamento recebido
                                  ▼
                            ┌────────┐
                            │ ACTIVE │
                            └────────┘
```

---

## Script de Teste

Execute o script completo de validação:

```bash
node backend/scripts/test-billing-flow.js beleza-pura
```

---

## Exemplos com cURL

```bash
# Listar eventos
curl http://localhost:8080/api/billing/mock/events

# Status da assinatura
curl http://localhost:8080/api/billing/mock/subscription/beleza-pura

# Simular pagamento aprovado
curl -X POST http://localhost:8080/api/billing/mock/trigger \
  -H "Content-Type: application/json" \
  -d '{"event":"payment_success","tenantId":"beleza-pura"}'

# Simular falha de pagamento
curl -X POST http://localhost:8080/api/billing/mock/trigger \
  -H "Content-Type: application/json" \
  -d '{"event":"payment_failed","tenantId":"beleza-pura"}'

# Simular suspensão
curl -X POST http://localhost:8080/api/billing/mock/trigger \
  -H "Content-Type: application/json" \
  -d '{"event":"subscription_suspended","tenantId":"beleza-pura"}'

# Reset para trial
curl -X POST http://localhost:8080/api/billing/mock/reset/beleza-pura \
  -H "Content-Type: application/json" \
  -d '{"planSlug":"starter","trialDays":30}'

# Executar job (dry-run)
curl -X POST http://localhost:8080/api/billing/mock/job/check_trial_expirations \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true}'
```

---

## Segurança

⚠️ **Estes endpoints só funcionam quando `PAYMENT_PROVIDER=mock`**

Em produção com Stripe/outro provider, estes endpoints retornam 403 Forbidden.

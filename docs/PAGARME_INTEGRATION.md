# Pagar.me Integration Guide

Integração completa com Pagar.me para processamento de pagamentos no BeautyHub.

## Índice

1. [Configuração](#configuração)
2. [Webhooks](#webhooks)
3. [Fluxos de Pagamento](#fluxos-de-pagamento)
4. [Testes](#testes)
5. [Go-Live Checklist](#go-live-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Configuração

### Variáveis de Ambiente

```env
# Provider selection
PAYMENT_PROVIDER=pagarme

# Pagar.me Credentials
# Obtenha em: https://dash.pagar.me/
PAGARME_API_KEY=ak_test_xxxxx           # API Key (pública)
PAGARME_SECRET_KEY=sk_test_xxxxx        # Secret Key (privada)
PAGARME_WEBHOOK_SECRET=whsec_xxxxx      # Webhook Secret
PAGARME_ENVIRONMENT=sandbox             # sandbox ou production
```

### Ambientes

| Ambiente | Base URL | Chaves |
|----------|----------|--------|
| **Sandbox** | `api.pagar.me/core/v5` | `sk_test_*`, `ak_test_*` |
| **Production** | `api.pagar.me/core/v5` | `sk_live_*`, `ak_live_*` |

### Obter Credenciais

1. Acesse [dash.pagar.me](https://dash.pagar.me/)
2. Vá em **Configurações → Chaves de API**
3. Copie a **Secret Key** (começando com `sk_`)
4. Para webhooks, vá em **Configurações → Webhooks**

---

## Webhooks

### Endpoint

```
POST /api/billing/webhooks/pagarme
```

### Configuração no Painel Pagar.me

1. Acesse **Configurações → Webhooks**
2. Clique em **Adicionar Webhook**
3. Configure:
   - **URL**: `https://seu-dominio.com/api/billing/webhooks/pagarme`
   - **Eventos**: Selecione todos os eventos relevantes
   - **Secret**: Anote o secret gerado

### Eventos Suportados

| Evento Pagar.me | Evento Interno | Ação |
|-----------------|----------------|------|
| `charge.paid` | `payment.succeeded` | Ativa subscription, atualiza `current_period_end` |
| `charge.payment_failed` | `payment.failed` | Define status `past_due`, inicia grace period |
| `charge.refunded` | `payment.refunded` | Processa reembolso |
| `subscription.created` | `subscription.created` | Cria registro de subscription |
| `subscription.canceled` | `subscription.cancelled` | Cancela subscription |
| `subscription.renewed` | `subscription.renewed` | Renova período, atualiza datas |
| `order.paid` | `invoice.paid` | Marca invoice como paga |
| `order.payment_failed` | `invoice.payment_failed` | Marca falha de pagamento |

### Validação de Assinatura

O webhook é validado usando HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Idempotência

O provider implementa cache de idempotência para evitar processamento duplicado:

- **TTL**: 24 horas
- **Chave**: Combinação de `customerId + planId + amount`
- Em produção, usar Redis para persistência

### Exemplo de Payload (charge.paid)

```json
{
  "id": "hook_xxxxx",
  "type": "charge.paid",
  "created_at": "2026-02-25T14:30:00Z",
  "data": {
    "id": "ch_xxxxx",
    "code": "12345",
    "amount": 9900,
    "status": "paid",
    "paid_at": "2026-02-25T14:30:00Z",
    "payment_method": "credit_card",
    "customer": {
      "id": "cus_xxxxx",
      "email": "cliente@email.com"
    },
    "subscription": {
      "id": "sub_xxxxx",
      "current_cycle": {
        "start_at": "2026-02-25",
        "end_at": "2026-03-25"
      }
    },
    "metadata": {
      "tenant_id": "uuid-do-tenant",
      "subscription_id": "uuid-interno"
    }
  }
}
```

---

## Fluxos de Pagamento

### 1. Assinatura com Cartão (Mensal)

```
Cliente → Checkout → createSubscription() → Pagar.me
                                              ↓
                                    charge.paid webhook
                                              ↓
                          Subscription.status = 'active'
                          current_period_end = +30 dias
```

**Código:**
```javascript
const result = await provider.createSubscription({
  customerId: 'cus_xxxxx',
  planId: 'internal-plan-id',
  priceId: 'pagarme-plan-id',
  billingCycle: 'monthly',
  paymentMethod: 'card',
  paymentMethodData: {
    cardToken: 'token_from_frontend',
  },
  metadata: {
    tenant_id: tenantId,
    subscription_id: subscriptionId,
  },
});
```

### 2. Assinatura com Cartão (Anual)

```javascript
const result = await provider.createSubscription({
  customerId: 'cus_xxxxx',
  planId: 'internal-plan-id',
  priceId: 'pagarme-yearly-plan-id',
  billingCycle: 'yearly',
  paymentMethod: 'card',
  paymentMethodData: {
    cardToken: 'token_from_frontend',
  },
});
// current_period_end = +365 dias
```

### 3. Pagamento via PIX

```
Cliente → createPixCharge() → QR Code gerado
              ↓
Cliente paga via app banco
              ↓
Pagar.me envia webhook charge.paid
              ↓
Subscription ativada
```

**Código:**
```javascript
const pixCharge = await provider.createPixCharge({
  customerId: 'cus_xxxxx',
  amount: 9900, // R$ 99,00 em centavos
  description: 'Assinatura BeautyHub - Plano Professional',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  metadata: {
    tenant_id: tenantId,
    subscription_id: subscriptionId,
  },
});

// Retorna:
// {
//   chargeId: 'ch_xxxxx',
//   qrCode: 'codigo-pix-copia-cola',
//   qrCodeBase64: 'base64-da-imagem',
//   copyPaste: 'codigo-pix-copia-cola',
//   expiresAt: Date,
// }
```

### 4. Pagamento Falhado

```
Cobrança automática falha
        ↓
Webhook charge.payment_failed
        ↓
Subscription.status = 'past_due'
grace_period_ends_at = +7 dias
        ↓
[Se não pagar em 7 dias]
        ↓
Subscription.status = 'suspended'
Tenant.status = 'suspended'
```

### 5. Cancelamento

```javascript
// Cancelar ao fim do período
await provider.cancelSubscription(subscriptionId, { 
  immediately: false 
});

// Cancelar imediatamente
await provider.cancelSubscription(subscriptionId, { 
  immediately: true 
});
```

---

## Testes

### Cartões de Teste (Sandbox)

| Número | Resultado |
|--------|-----------|
| `4000000000000010` | Aprovado |
| `4000000000000028` | Recusado |
| `4000000000000036` | Timeout |
| `4000000000000044` | CVV Inválido |

### Testar Fluxo Completo

```bash
# 1. Criar customer
curl -X POST http://localhost:8080/api/billing/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Cliente Teste",
    "email": "teste@email.com",
    "document": "12345678900"
  }'

# 2. Criar subscription com cartão
curl -X POST http://localhost:8080/api/billing/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "professional",
    "billingCycle": "monthly",
    "paymentMethod": "card",
    "cardToken": "tok_test_xxxxx"
  }'

# 3. Criar cobrança PIX
curl -X POST http://localhost:8080/api/billing/pix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "professional",
    "billingCycle": "monthly"
  }'
```

### Simular Webhook (Sandbox)

No painel Pagar.me, use a funcionalidade de **Reenviar Webhook** ou teste localmente:

```bash
# Simular pagamento bem-sucedido
curl -X POST http://localhost:8080/api/billing/webhooks/pagarme \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha256=SIGNATURE" \
  -d '{
    "type": "charge.paid",
    "data": {
      "id": "ch_test",
      "status": "paid",
      "amount": 9900,
      "subscription": {
        "id": "sub_test",
        "current_cycle": {
          "end_at": "2026-03-25T00:00:00Z"
        }
      },
      "metadata": {
        "subscription_id": "uuid-interno"
      }
    }
  }'
```

---

## Go-Live Checklist

### Antes do Go-Live

- [ ] **Credenciais de Produção**
  - [ ] Obter `sk_live_*` no painel Pagar.me
  - [ ] Configurar `PAGARME_ENVIRONMENT=production`
  - [ ] Atualizar `PAGARME_SECRET_KEY` com chave de produção

- [ ] **Webhook**
  - [ ] Configurar URL de produção no painel Pagar.me
  - [ ] Configurar `PAGARME_WEBHOOK_SECRET` com secret de produção
  - [ ] Testar recebimento de webhook

- [ ] **Planos**
  - [ ] Criar planos no Pagar.me produção
  - [ ] Atualizar `pagarme_price_id` na tabela `subscription_plans`
  - [ ] Verificar valores e intervalos de cobrança

- [ ] **Segurança**
  - [ ] Validação de assinatura do webhook ativa
  - [ ] HTTPS obrigatório
  - [ ] Logs de transação configurados
  - [ ] Alertas de falha de pagamento configurados

- [ ] **Testes em Produção**
  - [ ] Transação de R$ 1,00 com cartão real
  - [ ] Transação PIX real
  - [ ] Webhook processado corretamente
  - [ ] Status de subscription atualizado

### Configuração de Produção

```env
# .env.production
PAYMENT_PROVIDER=pagarme
PAGARME_SECRET_KEY=sk_live_xxxxx
PAGARME_WEBHOOK_SECRET=whsec_live_xxxxx
PAGARME_ENVIRONMENT=production
```

### Monitoramento

- [ ] Configurar alertas para falhas de pagamento
- [ ] Monitorar taxa de conversão
- [ ] Acompanhar churn por falha de pagamento
- [ ] Logs de webhook com retenção de 90 dias

---

## Troubleshooting

### Erro: "Invalid API Key"

```
Causa: Chave secreta inválida ou ambiente incorreto
Solução: Verificar PAGARME_SECRET_KEY e PAGARME_ENVIRONMENT
```

### Erro: "Webhook signature invalid"

```
Causa: Secret do webhook incorreto
Solução: Atualizar PAGARME_WEBHOOK_SECRET com valor do painel
```

### Erro: "Customer not found"

```
Causa: Customer ID inválido ou de outro ambiente
Solução: Verificar se customer foi criado no mesmo ambiente (sandbox/prod)
```

### PIX não gera QR Code

```
Causa: Dados do customer incompletos (CPF/CNPJ)
Solução: Garantir que customer tem document válido
```

### Cobrança não ativa subscription

```
Causa: Webhook não processado ou metadata incorreto
Solução: 
1. Verificar logs do webhook
2. Confirmar que metadata.subscription_id está presente
3. Verificar se subscription existe no banco
```

### Duplicação de cobranças

```
Causa: Idempotência não aplicada
Solução: 
1. Verificar se idempotencyKey está sendo enviada
2. Em produção, usar Redis para cache de idempotência
```

---

## Referências

- [Documentação Pagar.me API v5](https://docs.pagar.me/reference)
- [Guia de Integração](https://docs.pagar.me/docs)
- [Painel Pagar.me](https://dash.pagar.me/)
- [Status Pagar.me](https://status.pagar.me/)

---

## Suporte

- **Pagar.me**: suporte@pagar.me
- **Documentação Técnica**: https://docs.pagar.me/reference

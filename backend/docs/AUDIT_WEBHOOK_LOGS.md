# Audit & Webhook Logs - Documentação Técnica

## Visão Geral

Sistema de auditoria e logs de webhooks para rastreamento completo de operações de billing e eventos externos.

## Tabelas do Banco de Dados

### 1. billing_audit_logs

Registra todas as ações relacionadas a billing (planos, subscriptions, invoices).

```sql
CREATE TABLE billing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_audit_logs_tenant ON billing_audit_logs(tenant_id);
CREATE INDEX idx_billing_audit_logs_action ON billing_audit_logs(action);
CREATE INDEX idx_billing_audit_logs_entity ON billing_audit_logs(entity_type, entity_id);
CREATE INDEX idx_billing_audit_logs_created ON billing_audit_logs(created_at);
```

**Campos:**
- `id`: Identificador único do log
- `tenant_id`: Tenant relacionado (null para ações master)
- `user_id`: Usuário que executou a ação
- `action`: Tipo de ação (ex: `plan_created`, `subscription_updated`)
- `entity_type`: Tipo de entidade (ex: `subscription_plan`, `invoice`)
- `entity_id`: ID da entidade afetada
- `old_values`: Valores anteriores (para updates)
- `new_values`: Novos valores
- `metadata`: Dados adicionais contextuais
- `ip_address`: IP de origem
- `user_agent`: User agent do cliente
- `created_at`: Timestamp da ação

**Ações Comuns:**
- `plan_created`, `plan_updated`, `plan_activated`, `plan_deactivated`
- `subscription_created`, `subscription_updated`, `subscription_suspended`, `subscription_cancelled`
- `invoice_created`, `invoice_paid`, `invoice_failed`

### 2. webhook_logs

Registra todos os eventos de webhook recebidos de provedores de pagamento.

```sql
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'received',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_logs_provider ON webhook_logs(provider);
CREATE INDEX idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_tenant ON webhook_logs(tenant_id);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at);
```

**Campos:**
- `id`: Identificador único do log
- `provider`: Provedor do webhook (`stripe`, `pagarme`)
- `event_type`: Tipo do evento (ex: `payment_intent.succeeded`)
- `event_id`: ID do evento no provedor
- `tenant_id`: Tenant relacionado
- `payload`: Payload completo do webhook (JSONB)
- `status`: Status do processamento
  - `received`: Recebido, aguardando processamento
  - `processing`: Em processamento
  - `processed`: Processado com sucesso
  - `failed`: Falhou no processamento
  - `ignored`: Ignorado (evento não relevante)
- `error_message`: Mensagem de erro (se falhou)
- `retry_count`: Número de tentativas de reprocessamento
- `processed_at`: Timestamp do processamento
- `created_at`: Timestamp de recebimento

**Event Types Comuns (Stripe):**
- `payment_intent.succeeded`
- `payment_intent.failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Event Types Comuns (Pagar.me):**
- `charge.paid`
- `charge.refunded`
- `subscription.created`
- `subscription.updated`

## API Endpoints

### GET /api/master/billing/audit-logs

Retorna logs de auditoria de billing (apenas MASTER).

**Query Parameters:**
- `action` (string): Filtrar por ação
- `tenantId` (UUID): Filtrar por tenant
- `entityType` (string): Filtrar por tipo de entidade
- `startDate` (ISO date): Data inicial
- `endDate` (ISO date): Data final
- `limit` (number): Limite de resultados (default: 100)
- `offset` (number): Offset para paginação (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "action": "plan_created",
      "entity_type": "subscription_plan",
      "entity_id": "uuid",
      "old_values": null,
      "new_values": {"name": "Starter", "price": 49.90},
      "metadata": {"plan_name": "Starter"},
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-02-26T10:00:00Z"
    }
  ]
}
```

### GET /api/master/billing/webhook-logs

Retorna logs de webhooks (apenas MASTER).

**Query Parameters:**
- `provider` (string): Filtrar por provedor (`stripe`, `pagarme`)
- `eventType` (string): Filtrar por tipo de evento
- `status` (string): Filtrar por status
- `tenantId` (UUID): Filtrar por tenant
- `startDate` (ISO date): Data inicial
- `endDate` (ISO date): Data final
- `limit` (number): Limite de resultados (default: 100)
- `offset` (number): Offset para paginação (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": "uuid",
        "provider": "stripe",
        "event_type": "payment_intent.succeeded",
        "event_id": "evt_123",
        "tenant_id": "uuid",
        "status": "processed",
        "error_message": null,
        "retry_count": 0,
        "processed_at": "2026-02-26T10:05:00Z",
        "created_at": "2026-02-26T10:00:00Z"
      }
    ],
    "count": 1
  }
}
```

## Uso no Código

### Registrar Audit Log

```javascript
const { auditService } = require('./modules/billing/services');

await auditService.log({
  action: 'plan_created',
  tenantId: null, // null para ações master
  userId: req.user.id,
  entityType: 'subscription_plan',
  entityId: plan.id,
  oldValues: null,
  newValues: plan.toJSON(),
  metadata: { plan_name: plan.name },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### Registrar Webhook Log

```javascript
// Webhook logs são criados automaticamente pelo WebhookController
// Mas podem ser criados manualmente se necessário:

await sequelize.query(`
  INSERT INTO webhook_logs (provider, event_type, event_id, payload, status)
  VALUES ($1, $2, $3, $4, $5)
`, {
  bind: ['stripe', 'payment_intent.succeeded', 'evt_123', payload, 'received']
});
```

## Criação Automática das Tabelas

As tabelas serão criadas automaticamente quando:

1. **Via Migration:** Execute `npx sequelize-cli db:migrate` (recomendado)
2. **Via Script:** Execute `node backend/scripts/create-tables-direct.js`
3. **Manualmente:** Execute o SQL em `backend/scripts/create-audit-tables.sql`

## Monitoramento e Alertas

### Métricas Importantes

1. **Audit Logs:**
   - Volume de ações por hora
   - Ações falhadas
   - Ações por usuário/tenant

2. **Webhook Logs:**
   - Taxa de sucesso de webhooks (> 95%)
   - Eventos em retry (< 10)
   - Eventos falhados (alertar se > 5/hora)

### Queries Úteis

```sql
-- Webhooks falhados nas últimas 24h
SELECT COUNT(*) 
FROM webhook_logs 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '24 hours';

-- Top 10 ações de audit
SELECT action, COUNT(*) as count
FROM billing_audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC
LIMIT 10;

-- Taxa de sucesso de webhooks por provedor
SELECT 
  provider,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) as success,
  ROUND(100.0 * SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;
```

## Retenção de Dados

- **Audit Logs:** Manter por 2 anos (compliance)
- **Webhook Logs:** Manter por 90 dias (debug)

Configurar job de limpeza:
```javascript
// Job: billing:cleanup-old-logs
// Frequência: Diária (2:00 AM)
DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM billing_audit_logs WHERE created_at < NOW() - INTERVAL '2 years';
```

## Segurança

- ✅ Apenas usuários MASTER podem acessar os logs
- ✅ Logs são append-only (sem UPDATE/DELETE via API)
- ✅ Dados sensíveis em `payload` devem ser sanitizados
- ✅ IP e User Agent registrados para auditoria

## Troubleshooting

### Problema: Tabelas não existem

**Solução:**
```bash
cd backend
node scripts/create-tables-direct.js
```

### Problema: Permissões de banco

**Solução:**
```sql
GRANT ALL PRIVILEGES ON TABLE billing_audit_logs TO beautyhub_user;
GRANT ALL PRIVILEGES ON TABLE webhook_logs TO beautyhub_user;
```

### Problema: Logs não aparecem no frontend

**Verificar:**
1. Backend rodando com rotas `/api/master/billing/*` montadas
2. Usuário logado tem role `master`
3. Tabelas criadas no banco
4. Verificar console do navegador para erros de API

# 🗺️ ROADMAP DE CORREÇÕES — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Versão:** 1.0 — Pós-Auditoria Completa

---

## 🎯 VISÃO GERAL

Este documento consolida TODAS as vulnerabilidades e dívidas técnicas encontradas nas 7 auditorias (Security, Database, Frontend, Backend, Infrastructure, LGPD, Testes) em um roadmap executável com prioridades P0/P1/P2/P3.

**Status Geral do Sistema:**
- 🔴 **5 vulnerabilidades P0** (críticas — corrigir imediatamente)
- 🟡 **12 itens P1** (altos — corrigir em 2-4 semanas)
- 🟢 **18 itens P2** (médios — corrigir em 1-3 meses)
- ⚪ **10 itens P3** (baixos — backlog)

---

## 🔴 P0 — CRÍTICO (Corrigir em 1-3 dias)

### [P0-001] Content Security Policy DESATIVADA
**Categoria:** Segurança  
**Arquivo:** `backend/src/app.multitenant.js:47`  
**Severidade:** 🔴 CRÍTICO (XSS)

```javascript
// CÓDIGO ATUAL (VULNERÁVEL)
app.use(helmet({
  contentSecurityPolicy: false, // ⚠️ DESATIVADA
}));

// CORREÇÃO SEGURA
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Passo 1
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.biaxavier.com.br"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

**Rollback:** Alterar para `contentSecurityPolicy: false` se quebrar funcionalidade.  
**Teste:** Verificar no DevTools → Network → Response Headers por `Content-Security-Policy`.

---

### [P0-002] Senha Padrão "123456" nos Seeders
**Categoria:** Segurança  
**Arquivo:** `backend/src/seeders/002_seed_master_and_tenant.js:14`  
**Severidade:** 🔴 CRÍTICO

```javascript
// CÓDIGO ATUAL (VULNERÁVEL)
const passwordHash = await bcrypt.hash('123456', 10);

// CORREÇÃO SEGURA
const crypto = require('crypto');

const generateSecurePassword = () => {
  return crypto.randomBytes(16).toString('base64'); // 22 chars
};

const masterPassword = process.env.MASTER_SEED_PASSWORD || generateSecurePassword();
const passwordHash = await bcrypt.hash(masterPassword, 12); // Aumentar rounds

if (process.env.NODE_ENV === 'development') {
  console.log(`[SEED] Master password: ${masterPassword}`);
  console.log(`[SEED] Owner password: ${masterPassword}`);
}
```

**Ação Imediata:**
1. Verificar se `master@beautyhub.com` existe em produção
2. Se sim, forçar reset de senha imediatamente
3. Alterar senha via admin ou direto no banco

```sql
-- EMERGÊNCIA: Resetar senha do master em produção
UPDATE users 
SET password = '$2a$12$...' -- bcrypt de senha forte
WHERE email = 'master@beautyhub.com';
```

---

### [P0-003] CI/CD — Tests com `continue-on-error: true`
**Categoria:** Infraestrutura/Processo  
**Arquivo:** `.github/workflows/deploy.yml:20`  
**Severidade:** 🔴 CRÍTICO

```yaml
# CÓDIGO ATUAL (PERIGOSO)
test:
  continue-on-error: true  # ⚠️ Deploy continua mesmo com falhas

# CORREÇÃO
jobs:
  test:
    runs-on: ubuntu-latest
    continue-on-error: false  # ⬅️ QUEBRAR BUILD SE TESTES FALHAREM
    
  deploy-frontend:
    needs: test
    if: needs.test.result == 'success'  # ⬅️ Só deployar se testes passarem
    
  deploy-backend:
    needs: test
    if: needs.test.result == 'success'
```

**Impacto:** Sem isso, código quebrado pode ir para produção.

---

### [P0-004] Webhook Controller — Helpers Retornam null
**Categoria:** Backend/Billing  
**Arquivo:** `backend/src/modules/billing/controllers/webhook.controller.js:345-354`  
**Severidade:** 🔴 CRÍTICO (Financeiro)

```javascript
// CÓDIGO ATUAL (QUEBRADO)
async _findSubscriptionByGatewayId(gatewayId) {
  return null; // NÃO IMPLEMENTADO
}

// CORREÇÃO
casync _findSubscriptionByGatewayId(gatewayId) {
  return this.models.Subscription.findOne({
    where: { gateway_subscription_id: gatewayId }
  });
}

async _findInvoiceByGatewayId(gatewayId) {
  return this.models.Invoice.findOne({
    where: { gateway_invoice_id: gatewayId }
  });
}
```

**Impacto:** Pagamentos processados mas não refletidos no sistema. Perda de receita.

---

### [P0-005] Trust Proxy sem Configuração Estrita
**Categoria:** Segurança  
**Arquivo:** `backend/src/app.multitenant.js:36`  
**Severidade:** 🔴 CRÍTICO (IP Spoofing)

```javascript
// CÓDIGO ATUAL
app.set('trust proxy', 1); // Aceita qualquer proxy

// CORREÇÃO
app.set('trust proxy', [
  'loopback',
  'linklocal',
  'uniquelocal',
  // Adicionar IPs do Fly.io se necessário
]);
```

---

## 🟡 P1 — ALTO (Corrigir em 2-4 semanas)

### [P1-001] Tokens JWT em localStorage (XSS)
**Categoria:** Segurança/Frontend  
**Complexidade:** 🔴 Alta (muda backend e frontend)  
**Estratégia:** Dividir em 2 fases

#### Fase 1 (Imediato) — Mitigação
```javascript
// Adicionar monitoramento de acesso ao localStorage
// Detectar acesso suspeito
window.addEventListener('storage', (e) => {
  if (e.key === TOKEN_KEY) {
    console.warn('Token access detected from another tab');
  }
});
```

#### Fase 2 (2-4 semanas) — Solução Definitiva
Migrar para httpOnly cookies:
```javascript
// Backend: Login endpoint
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000, // 1h
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 3600000, // 7d
});

// Frontend: Remover localStorage
// Usar credentials: 'include' em todos os requests
fetch('/api/protected', {
  credentials: 'include', // Envia cookies automaticamente
});
```

**Rollback:** Reverter para localStorage se necessário.

---

### [P1-002] Testes de Integração — Multi-Tenant Isolation
**Categoria:** Testes  
**Prioridade:** 🔴 Máxima (é um SaaS multi-tenant!)

```javascript
// Criar: backend/tests/integration/tenant-isolation.test.js
describe('CRITICAL: Tenant Isolation', () => {
  test('Tenant A cannot access data from Tenant B', async () => {
    // Setup
    const tenantA = await createTenant();
    const tenantB = await createTenant();
    const userA = await createUser(tenantA.id);
    const tokenA = generateToken(userA);
    
    // Criar dado em B
    const clientB = await createClient(tenantB.id);
    
    // Tentar acessar como A
    const response = await request(app)
      .get(`/api/clients/${clientB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('X-Tenant-Slug', tenantA.slug);
    
    expect(response.status).toBe(404);
  });
});
```

---

### [P1-003] BaseRepository — tenant_id Pode Ser Sobrescrito
**Categoria:** Backend/Segurança  
**Arquivo:** `backend/src/shared/database/BaseRepository.js:33-36`

```javascript
// CÓDIGO ATUAL
_scopedWhere(tenantId, additionalWhere = {}) {
  return {
    tenant_id: tenantId,
    ...additionalWhere, // ⚠️ Pode sobrescrever
  };
}

// CORREÇÃO
_scopedWhere(tenantId, additionalWhere = {}) {
  const { tenant_id: _, ...safeWhere } = additionalWhere;
  return {
    tenant_id: tenantId,
    ...safeWhere,
  };
}
```

---

### [P1-004] Índices Ausentes no Banco
**Categoria:** Database/Performance  
**Prioridade:** 🔴 Alta (queries lentas em produção)

```sql
-- Criar migration: 037_add_performance_indexes.js
CREATE INDEX CONCURRENTLY idx_appointments_tenant_start 
  ON appointments (tenant_id, start_time DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_financial_entries_tenant_date 
  ON financial_entries (tenant_id, date DESC);

CREATE INDEX CONCURRENTLY idx_invoices_tenant_status_due 
  ON invoices (tenant_id, status, due_date) 
  WHERE status IN ('pending', 'past_due');

CREATE INDEX CONCURRENTLY idx_login_attempts_identifier_created 
  ON login_attempts (identifier, created_at);
```

---

### [P1-005] LGPD — Consentimento Não Registrado
**Categoria:** LGPD/Legal  
**Arquivos:** `src/features/auth/pages/register.js`, `backend/src/routes/auth.js`

```javascript
// Frontend: Adicionar checkbox
<label class="lgpd-consent">
  <input type="checkbox" name="lgpd_consent" required>
  Concordo com a <a href="/privacy-policy">Política de Privacidade</a> 
  e <a href="/terms-of-service">Termos de Serviço</a>
</label>

// Backend: Salvar consentimento
await User.create({
  // ... dados
  lgpd_consent_at: new Date(),
  lgpd_consent_version: '1.0.0',
});
```

```sql
-- Migration
ALTER TABLE users 
ADD COLUMN lgpd_consent_at TIMESTAMP,
ADD COLUMN lgpd_consent_version VARCHAR(10);
```

---

### [P1-006] Foreign Keys sem onDelete
**Categoria:** Database/Integridade  
**Exemplo:** `appointments.client_id`

```javascript
// appointments.model.js
clientId: {
  type: DataTypes.UUID,
  references: { model: 'clients', key: 'id' },
  onDelete: 'SET NULL',  // ⬅️ ADICIONAR
  allowNull: true,
}
```

**Risco:** Agendamentos ficam com referências órfãs quando cliente é deletado.

---

### [P1-007] Migration 017 — Grande e Sem Rollback
**Categoria:** Database/DevEx  
**Arquivo:** `backend/src/migrations/017_enhance_billing_tables.js`

**Estratégia:**
1. Não alterar migration já aplicada
2. Criar migrations menores para alterações futuras
3. Documentar que esta migration é "grandona"

---

### [P1-008] Controllers Legacy vs Módulos
**Categoria:** Backend/Arquitetura  
**Ação:** Criar plano de migração

```
Fase 1: Documentar endpoints legacy
Fase 2: Criar testes para endpoints legacy (proteger)
Fase 3: Migrar um controller por sprint
Fase 4: Deprecar e remover
```

---

### [P1-009] Error Handler — Stack Trace Vazamento
**Categoria:** Segurança  
**Arquivo:** `backend/src/shared/middleware/errorHandler.js:119-128`

```javascript
// CÓDIGO ATUAL
const message = process.env.NODE_ENV === 'production'
  ? 'Erro interno do servidor.'
  : err.message;

// CORREÇÃO (garantir que nunca vaza em prod)
const message = 'Erro interno do servidor.';
const details = process.env.NODE_ENV === 'development' ? err.stack : null;
```

---

### [P1-010] JWT Secrets com Fallbacks Inseguros
**Categoria:** Segurança  
**Arquivo:** `backend/src/config/env.js:48-52`

```javascript
// CÓDIGO ATUAL
secret: process.env.JWT_SECRET || 'bh_jwt_secret_dev', // fallback inseguro

// CORREÇÃO
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET are required');
}
```

---

### [P1-011] Brute Force — Timing Attack
**Categoria:** Segurança  
**Arquivo:** `backend/src/shared/middleware/bruteForceProtection.js`

```javascript
// Adicionar delay constante para evitar timing attack
async checkLoginAllowed() {
  const startTime = Date.now();
  
  // ... verificações
  
  // Delay para tornar tempo constante
  const elapsed = Date.now() - startTime;
  if (elapsed < 100) {
    await sleep(100 - elapsed);
  }
}
```

---

### [P1-012] Monitoramento/Alerting
**Categoria:** Infraestrutura/Observabilidade  
**Ação:** Configurar UptimeRobot ou similar

```bash
# Verificar a cada 5 minutos:
# - https://api.biaxavier.com.br/api/health
# - https://app.biaxavier.com.br
# - https://biaxavier.com.br

# Alertar se:
# - Status > 499
# - Response time > 2000ms
# - SSL expirando
```

---

## 🟢 P2 — MÉDIO (Corrigir em 1-3 meses)

### [P2-001] Sanitização de Inputs (XSS Prevention)
**Categoria:** Frontend/Segurança  
**Arquivo:** `src/shared/utils/validation.js`

```javascript
export function sanitizeHtml(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Usar em todos os innerHTML:
element.textContent = userInput; // ✅ Safe
// element.innerHTML = userInput; // ❌ NUNCA
```

---

### [P2-002] ARIA Labels e Acessibilidade
**Categoria:** Frontend/UX  
**Ação:** Adicionar atributos ARIA em todos os componentes

```html
<button aria-label="Fechar modal">×</button>
<nav aria-label="Menu principal">...</nav>
<form aria-labelledby="form-title">...</form>
```

---

### [P2-003] LGPD — Processamento Automático de Exclusão
**Categoria:** LGPD  
**Arquivo:** `backend/src/modules/lgpd/lgpd.service.js`

```javascript
// Criar job para processar deleções pendentes
async processPendingDeletions() {
  const requests = await this.getPendingDeletions();
  
  for (const request of requests) {
    // 1. Anonimizar dados fiscais (manter, mas anonimizar)
    await this.anonymizeFinancialData(request.userId);
    
    // 2. Deletar dados pessoais
    await this.deletePersonalData(request.userId);
    
    // 3. Notificar usuário
    await this.sendDeletionConfirmation(request.email);
    
    // 4. Atualizar status
    await this.markAsCompleted(request.id);
  }
}
```

---

### [P2-004] Audit Logs
**Categoria:** LGPD/Segurança  
**Criar:** `backend/src/shared/audit/audit.service.js`

```javascript
// Tabela audit_logs
async logAccess({ userId, action, resource, resourceId, metadata, req }) {
  await AuditLog.create({
    user_id: userId,
    action,  // 'read', 'update', 'delete', 'export'
    resource, // 'user', 'client', 'appointment'
    resource_id: resourceId,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    tenant_id: req.tenantId,
    metadata,
  });
}
```

---

### [P2-005] Anonimização de Dados Retidos
**Categoria:** LGPD  
**Quando excluir usuário, manter dados fiscais anonimizados:**

```javascript
async anonymizeFinancialData(userId) {
  // Manter valores, remover identificação pessoal
  await FinancialEntry.update(
    { 
      client_name: 'CLIENTE_REMOVIDO',
      client_id: null,
      notes: null 
    },
    { where: { client_id: userId } }
  );
}
```

---

### [P2-006] DPO e Canal de Contato LGPD
**Categoria:** LGPD/Legal  
**Ações:**
- Criar email dpo@biaxavier.com.br
- Adicionar à política de privacidade
- Criar formulário de contato

---

### [P2-007] Plano de Resposta a Incidentes
**Categoria:** LGPD/Segurança  
**Criar documento com:**
1. Procedimento de detecção
2. Contenção
3. Comunicação à ANPD (template)
4. Comunicação aos titulares (template)
5. Post-mortem

---

### [P2-008] Dockerfile Multi-Stage
**Categoria:** Infraestrutura  
**Otimizar:**

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5001
CMD ["node", "server.js"]
```

---

### [P2-009] CORS Específico (Nginx)
**Categoria:** Segurança  
**Arquivo:** `nginx/nginx.conf:36`

```nginx
# Trocar wildcard por origins específicos
add_header 'Access-Control-Allow-Origin' 'https://app.biaxavier.com.br' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

---

### [P2-010] Métricas Prometheus
**Categoria:** Observabilidade  
**Criar endpoint:**

```javascript
// middleware/metrics.js
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

app.get('/api/metrics', authorize(ROLES.MASTER), (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

---

### [P2-011] Log Aggregation
**Categoria:** Observabilidade  
**Considerar:** Logtail, Datadog, ou CloudWatch Logs

---

### [P2-012] Testes E2E (Frontend)
**Categoria:** Testes  
**Ferramenta:** Playwright ou Cypress

```javascript
// tests/e2e/auth.spec.js
test('user can login and access dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'owner@belezapura.com');
  await page.fill('[name="password"]', '123456');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
```

---

### [P2-013] Preferências de Usuário (GDPR/LGPD)
**Categoria:** LGPD  
**Criar:**
- Consentimento granular (marketing, analytics)
- Centro de preferências
- Cookie banner

---

### [P2-014] RIPD (Relatório de Impacto)
**Categoria:** LGPD  
**Criar documento básico:**
- Fluxo de dados
- Riscos identificados
- Mitigações

---

### [P2-015] Service Worker (Cache/Offline)
**Categoria:** Frontend/Performance  
**Benefícios:**
- Cache de assets
- Offline fallback
- Push notifications

---

### [P2-016] Lazy Loading de Imagens
**Categoria:** Frontend/Performance  
```html
<img loading="lazy" src="...">
```

---

### [P2-017] Prefetch de Rotas
**Categoria:** Frontend/Performance  
```javascript
// Pré-carregar rotas comuns após login
if (isAuthenticated()) {
  import('./features/dashboard/pages/dashboard.js');
  import('./features/appointments/pages/appointments.js');
}
```

---

### [P2-018] Redução de Bundle Size
**Categoria:** Frontend/Performance  
- Analisar com `vite-bundle-analyzer`
- Code splitting
- Tree shaking

---

## ⚪ P3 — BAIXO (Backlog)

- [P3-001] Workers/Filas (Bull/BullMQ)
- [P3-002] WebSocket (Socket.io)
- [P3-003] Redis para cache distribuído
- [P3-004] Read replicas para relatórios
- [P3-005] Feature flags
- [P3-006] A/B testing framework
- [P3-007] Mobile app (React Native)
- [P3-008] PWA completo
- [P3-009] i18n (internacionalização)
- [P3-010] Webhook retries e DLQ

---

## 📊 MATRIZ DE RISCO CONSOLIDADA

| ID | Item | Categoria | P | I | Risco | Status |
|----|------|-----------|---|---|-------|--------|
| P0-001 | CSP Desativada | Segurança | P0 | 🔴 | 9.1 | 🔴 Aberto |
| P0-002 | Senha Default | Segurança | P0 | 🔴 | 9.8 | 🔴 Aberto |
| P0-003 | CI continue-on-error | Infra | P0 | 🔴 | 8.5 | 🔴 Aberto |
| P0-004 | Webhooks Null | Backend | P0 | 🔴 | 8.0 | 🔴 Aberto |
| P0-005 | Trust Proxy | Segurança | P0 | 🟡 | 6.5 | 🔴 Aberto |
| P1-001 | Tokens localStorage | Segurança | P1 | 🔴 | 6.8 | 🔴 Aberto |
| P1-002 | Testes Integração | Testes | P1 | 🔴 | 7.5 | 🔴 Aberto |
| P1-003 | tenant_id Override | Backend | P1 | 🟡 | 6.7 | 🔴 Aberto |
| P1-004 | Índices Ausentes | Database | P1 | 🟡 | 5.5 | 🔴 Aberto |
| P1-005 | LGPD Consentimento | LGPD | P1 | 🟡 | 6.0 | 🔴 Aberto |
| P1-006 | FK onDelete | Database | P1 | 🟢 | 4.5 | 🔴 Aberto |
| P1-007 | Migration Grande | DevEx | P1 | 🟢 | 3.0 | 🔴 Aberto |
| P1-008 | Controllers Legacy | Backend | P1 | 🟢 | 4.0 | 🔴 Aberto |
| P1-009 | Stack Trace Leak | Segurança | P1 | 🟡 | 5.0 | 🔴 Aberto |
| P1-010 | JWT Fallbacks | Segurança | P1 | 🟡 | 5.9 | 🔴 Aberto |
| P1-011 | Timing Attack | Segurança | P1 | 🟢 | 4.0 | 🔴 Aberto |
| P1-012 | Monitoramento | Infra | P1 | 🟡 | 5.5 | 🔴 Aberto |

**Legenda:**
- **P**: Prioridade (P0/P1/P2/P3)
- **I**: Impacto (🔴 Alto / 🟡 Médio / 🟢 Baixo)
- **Risco**: Score CVSS estimado

---

## 📅 CRONOGRAMA SUGERIDO

### Semana 1 (P0)
- [ ] P0-001: CSP Header
- [ ] P0-002: Senha seeder + reset master
- [ ] P0-003: CI/CD fix
- [ ] P0-004: Webhook helpers
- [ ] P0-005: Trust proxy

### Semana 2-3 (P1 Segurança)
- [ ] P1-001: httpOnly cookies (fase 1)
- [ ] P1-003: BaseRepository fix
- [ ] P1-009: Error handler fix
- [ ] P1-010: JWT secrets
- [ ] P1-011: Timing attack mitigation

### Semana 4-5 (P1 Testes)
- [ ] P1-002: Tenant isolation tests
- [ ] P1-002: Auth flow tests
- [ ] P1-002: RBAC tests
- [ ] P1-012: Uptime monitoring

### Semana 6-8 (P1 Database/LGPD)
- [ ] P1-004: Índices
- [ ] P1-006: FK onDelete
- [ ] P1-005: LGPD consentimento
- [ ] P1-007: Documentar migration

### Mês 2 (P2)
- [ ] P2-001 a P2-006: LGPD completo
- [ ] P2-008: Dockerfile multi-stage
- [ ] P2-009: CORS específico
- [ ] P2-010: Métricas Prometheus
- [ ] P2-012: Testes E2E

### Mês 3 (P2 Continuação)
- [ ] P2-002: Acessibilidade
- [ ] P2-015: Service Worker
- [ ] P2-017: Prefetch
- [ ] P2-018: Bundle analysis

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [ ] Criar branch `security/roadmap-2026-05`
- [ ] Configurar ambiente de staging
- [ ] Backup completo do banco
- [ ] Notificar equipe sobre mudanças

### Durante Implementação
- [ ] Cada P0 deve ter teste de regressão
- [ ] Code review obrigatório
- [ ] Testar em staging antes de prod
- [ ] Documentar mudanças

### Após Deploy
- [ ] Verificar logs por erros
- [ ] Monitorar métricas
- [ ] Validar funcionamento
- [ ] Atualizar documentação

---

*Roadmap criado em 08/05/2026. Revisar mensalmente.*

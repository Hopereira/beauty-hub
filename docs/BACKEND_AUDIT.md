# ⚙️ BACKEND AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** 🟡 BOM — Arquitetura sólida, dívidas técnicas em módulos legacy  
**Stack:** Node.js 20 + Express + Sequelize 6 + PostgreSQL 15

---

## 📊 RESUMO EXECUTIVO

| Aspecto | Status | Notas |
|---------|--------|-------|
| **Arquitetura** | 🟢 Excelente | Modular, multi-tenant, clean architecture |
| **API Design** | 🟢 Bom | RESTful, consistente, versionada |
| **Autenticação** | 🟢 Bom | JWT + refresh token rotation |
| **Autorização** | 🟢 Excelente | RBAC com hierarquia implementada |
| **Multi-Tenant** | 🟢 Excelente | Isolamento por tenant_id |
| **Validação** | 🟢 Bom | Joi schemas em todas as rotas |
| **Error Handling** | 🟢 Bom | Middleware global, tipos de erro |
| **Logging** | 🟢 Bom | Winston estruturado com contexto |
| **Testes** | 🔴 Crítico | Apenas 14 testes unitários, 0 integração |
| **Módulos Legacy** | 🟡 Regular | Controllers antigos ainda existem |
| **Workers/Filas** | ⚠️ Ausente | Não implementado |
| **Websocket** | ⚠️ Ausente | Não implementado |
| **Uploads** | ✅ N/A | Não há upload de arquivos |

**Conclusão:** Backend bem arquiteturado com separação de concerns e boas práticas de segurança. Principais problemas: falta de testes de integração e coexistência de código legacy com módulos novos.

---

## 🏗️ ARQUITETURA

### Estrutura de Módulos

```
backend/src/
├── app.multitenant.js      # Entry point Express
├── config/                 # Configurações
│   ├── env.js              # Environment variables
│   └── database.js         # Sequelize config
├── models/                 # 12 models legacy
├── controllers/            # 13 controllers legacy (⚠️)
├── routes/                 # 14 route files (mix legacy + novo)
├── modules/                # 17 módulos (clean architecture) ✅
│   ├── billing/            # 41 arquivos — completo
│   ├── tenants/            # Onboarding + tenant mgmt
│   ├── users/              # CRUD users + profile
│   ├── professionals/      # Professional details
│   ├── inventory/          # Produtos + estoque
│   ├── suppliers/          # Fornecedores
│   ├── purchases/          # Compras
│   ├── financial/          # Payment transactions
│   ├── owner-clients/      # CRUD clientes (owner)
│   ├── owner-services/     # CRUD serviços
│   ├── owner-appointments/ # CRUD agendamentos
│   ├── owner-financial/    # Financeiro owner
│   ├── owner-reports/      # Relatórios
│   ├── public/             # Registro público
│   ├── lgpd/               # LGPD compliance
│   └── notifications/      # Sistema de notificações
├── shared/                 # Código compartilhado
│   ├── middleware/         # Auth, errorHandler, tenant, validation
│   ├── database/           # BaseRepository
│   ├── errors/             # Classes de erro
│   └── utils/              # JWT, logger, constants
├── migrations/             # 36 migrations
├── seeders/                # 3 seeders
└── tests/                  # 1 arquivo de teste (⚠️)
```

### Module Pattern (Clean Architecture)

**Exemplo: Billing Module**
```
billing/
├── index.js                # Module entry point
├── subscriptionPlan.model.js
├── subscription.model.js
├── invoice.model.js
├── usageLog.model.js
├── providers/              # Payment provider interface + impl
│   ├── index.js
│   ├── paymentProvider.interface.js
│   ├── mock.provider.js
│   ├── stripe.provider.js
│   └── pagarme.provider.js (stub)
├── services/               # Business logic
│   ├── plan.service.js
│   ├── subscription.service.js
│   ├── invoice.service.js
│   └── billingAudit.service.js
├── controllers/            # HTTP layer
│   ├── billing.controller.js
│   ├── master.controller.js
│   ├── public.controller.js
│   └── webhook.controller.js
├── routes/                 # Route definitions
│   ├── billing.routes.js
│   ├── master.routes.js
│   ├── public.routes.js
│   └── webhook.routes.js
├── middleware/             # Billing-specific middleware
│   └── requireActiveSubscription.js
├── jobs/                   # Background jobs (stubs)
│   └── billing.jobs.js
├── validation/             # Joi schemas
│   └── billing.validation.js
├── migrations/             # Module-specific migrations
└── seeders/                # Module-specific seeders
```

**Avaliação:**
- ✅ Separação clara: providers → services → controllers → routes
- ✅ Inversão de dependência via constructor injection
- ✅ Interface para payment providers (substituível)
- ⚠️ Alguns controllers tem stubs (retornam null)

---

## 🔐 AUTENTICAÇÃO E AUTORIZAÇÃO

### JWT Implementation

**Arquivo:** `backend/src/shared/utils/jwt.js`

```javascript
function generateAccessToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId || null,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpiry || '1h' }
  );
}

function generateRefreshToken(payload) {
  return jwt.sign(
    { id: payload.id, type: 'refresh' },
    env.jwt.refreshSecret || env.jwt.secret,
    { expiresIn: env.jwt.refreshExpiry || '7d' }
  );
}
```

**Features:**
- ✅ Access token: 1h expiration
- ✅ Refresh token: 7d expiration
- ✅ Refresh token rotation (novo refresh a cada uso)
- ✅ Tenant context no token
- ✅ Separate secrets para access/refresh

**Vulnerabilidade:**
```javascript
// env.js:48-52
secret: process.env.JWT_SECRET || 'bh_jwt_secret_dev', // ⚠️ fallback
refreshSecret: process.env.JWT_REFRESH_SECRET || 'bh_jwt_refresh_secret_dev',
```

### RBAC (Role-Based Access Control)

**Arquivo:** `backend/src/shared/middleware/auth.js`

```javascript
const ROLE_HIERARCHY = ['client', 'professional', 'admin', 'owner', 'master'];

function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);

    // Direct access
    const hasDirectAccess = allowedRoles.includes(userRole);

    // Hierarchy access (MASTER > OWNER > ADMIN > PROFESSIONAL > CLIENT)
    const hasHierarchyAccess = allowedRoles.some(role => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(role);
      return userRoleIndex > requiredIndex;
    });

    if (!hasDirectAccess && !hasHierarchyAccess) {
      return next(new ForbiddenError());
    }
    next();
  };
}
```

**Usage:**
```javascript
// routes/users.js
router.get('/', authorize(ROLES.ADMIN), controller.list);
router.put('/:id/role', authorize(ROLES.OWNER), controller.changeRole);
```

### Tenant Isolation

**Arquivo:** `backend/src/shared/middleware/tenantResolver.js`

```javascript
function createTenantResolver(getTenantBySlug) {
  return async (req, res, next) => {
    // Skip for master routes
    if (req.path.startsWith('/api/master')) return next();

    // Extract from header, subdomain, or query
    const tenantSlug = extractTenantSlug(req);
    
    // Cache lookup (Map — em memória)
    const tenant = await resolveTenant(slug, getTenantBySlug);
    
    // Validate status
    if (tenant.status === TENANT_STATUS.SUSPENDED) {
      throw new TenantSuspendedError();
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    next();
  };
}
```

**Avaliação:**
- ✅ Cache em memória (1 min TTL)
- ✅ Subdomain detection (.com.br suporte)
- ✅ Header override (X-Tenant-Slug)
- ⚠️ Cache não distribuído (problema se múltiplas instâncias)

### BaseRepository (Tenant Scoping)

**Arquivo:** `backend/src/shared/database/BaseRepository.js`

```javascript
class BaseRepository {
  _scopedWhere(tenantId, additionalWhere = {}) {
    if (!tenantId) throw new TenantMismatchError();
    return {
      tenant_id: tenantId,
      ...additionalWhere, // ⚠️ additionalWhere pode sobrescrever
    };
  }

  async findAll(tenantId, options = {}) {
    return this.model.findAndCountAll({
      where: this._scopedWhere(tenantId, options.where),
      paranoid: true, // soft delete
      ...
    });
  }

  async create(tenantId, data, options = {}) {
    return this.model.create({
      ...data,
      tenant_id: tenantId, // imposto automaticamente
    }, options);
  }
}
```

**Avaliação:**
- ✅ Toda query automaticamente scoped por tenant
- ✅ Soft delete (paranoid) em todas as queries
- ⚠️ tenant_id pode ser sobrescrito por additionalWhere
- ⚠️ Módulos owner-* não usam BaseRepository (ainda)

---

## 🛡️ SEGURANÇA

### Rate Limiting

**Arquivo:** `backend/src/app.multitenant.js:114-143`

```javascript
// Global rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    const tenantKey = req.headers['x-tenant-slug'] || 'global';
    return `${tenantKey}:${req.ip}`; // por tenant + IP
  },
});

// Auth rate limit (mais restritivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
app.use('/api/auth/login', authLimiter);
```

**Avaliação:**
- ✅ Rate limit por tenant (evita que um tenant afete outro)
- ✅ Limites diferentes para auth vs API geral
- ⚠️ Não há rate limit por user ID (apenas por IP)

### Brute Force Protection

**Arquivo:** `backend/src/shared/middleware/bruteForceProtection.js`

```javascript
class BruteForceProtection {
  constructor(sequelize) {
    this.MAX_ATTEMPTS_PER_EMAIL = 5;
    this.MAX_ATTEMPTS_PER_IP = 20;
    this.LOCKOUT_DURATION_MINUTES = 15;
    this.ACCOUNT_LOCKOUT_ATTEMPTS = 10;
  }

  async isAccountLocked(email, tenantSlug) {
    // Verifica se conta está bloqueada
    // Auto-unlock após 15 min
  }
}
```

**Features:**
- ✅ Tracking por email e por IP
- ✅ Lockout de conta após 10 falhas
- ✅ Reset automático após sucesso
- ✅ Cleanup de logs antigos (30 dias)

### CORS Configuration

```javascript
app.use(cors({
  origin: (origin, callback) => {
    // Allow *.biaxavier.com.br subdomains
    if (url.hostname.endsWith('.biaxavier.com.br')) {
      return callback(null, true);
    }
    // Allow Cloudflare Pages
    if (url.hostname.endsWith('.beauty-hub.pages.dev')) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
}));
```

---

## 📡 API ENDPOINTS

### Endpoints Públicos (sem auth)
```
GET  /api/health
GET  /api/health/schema
GET  /api/public/plans           # Planos de assinatura
GET  /api/billing/plans          # Alias
GET  /api/billing/plans/:slug    # Plano específico
POST /api/onboarding/register    # Criar tenant + owner
POST /api/auth/register          # Registro
POST /api/auth/login             # Login
POST /api/auth/refresh-token     # Refresh JWT
POST /api/auth/forgot-password   # Recuperação de senha
POST /api/auth/reset-password    # Reset de senha
POST /api/webhooks/billing/:provider  # Webhooks de pagamento
```

### Endpoints Autenticados
```
GET    /api/auth/me              # Perfil
POST   /api/auth/logout          # Logout
GET    /api/profile              # Meu perfil
PUT    /api/profile              # Atualizar perfil
GET    /api/tenant               # Config do tenant
PUT    /api/tenant               # Atualizar tenant
GET    /api/dashboard            # Dados dashboard

# Owner CRUDs (requer subscription ativa)
GET/POST/PUT/DELETE /api/clients
GET/POST/PUT/DELETE /api/services
GET/POST/PUT/DELETE /api/appointments
GET/POST/PUT/DELETE /api/financial
GET/POST/PUT/DELETE /api/professionals
GET/POST/PUT/DELETE /api/products
GET/POST/PUT/DELETE /api/suppliers
GET/POST/PUT/DELETE /api/purchases
GET/POST/PUT/DELETE /api/users

# Professional routes
GET /api/professional/dashboard
GET /api/professional/appointments
...

# Master routes (role=master)
GET/POST/PUT/DELETE /api/master/tenants
GET/POST/PUT/DELETE /api/master/billing/plans
GET/POST/PUT/DELETE /api/master/billing/subscriptions
GET/POST/PUT/DELETE /api/master/lgpd/requests

# LGPD
GET  /api/lgpd/export            # Exportar meus dados
POST /api/lgpd/delete-request  # Solicitar exclusão

# Notifications
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
```

**Total estimado:** ~80 endpoints

---

## ⚠️ CÓDIGO LEGACY

### Controllers Legados

**Localização:** `backend/src/controllers/`

```
appointmentController.js      # ⚠️ Usado por routes/appointments.js
authController.js            # ✅ Ainda ativo (routes/auth.js)
clientController.js          # ⚠️ Legacy — owner-clients/ é o novo
establishmentController.js   # ⚠️ Legacy
financialController.js       # ⚠️ Usado por routes/financial.js
notificationController.js    # ⚠️ Usado
professionalAreaController.js # ⚠️ Usado
professionalController.js   # ⚠️ Usado
profileController.js         # ⚠️ Usado
reportsController.js         # ⚠️ Usado
serviceCategoryController.js # ⚠️ Usado
serviceController.js         # ⚠️ Usado
userController.js            # ⚠️ Usado
```

**Problema:**
- Código duplicado entre controllers legacy e módulos
- Manutenção em dois lugares
- Inconsistência de patterns

**Exemplo de Divergência:**
```javascript
// Legacy: clientController.js
exports.create = async (req, res) => {
  const client = await Client.create({
    ...req.body,
    tenant_id: req.tenantId // manual
  });
  res.json(client);
};

// Novo: owner-clients/client.service.js
async create(tenantId, data) {
  return this.repository.create(tenantId, data); // via BaseRepository
}
```

**Recomendação:**
Criar plano de migração para mover todos os endpoints para módulos.

---

## 🔧 MIDDLEWARES

### Error Handler

**Arquivo:** `backend/src/shared/middleware/errorHandler.js`

```javascript
function errorHandler(err, req, res, next) {
  // AppError (operacional)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Sequelize errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({...});
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({...});
  }

  // Unexpected errors (não vazam stack em produção)
  logger.error('Unexpected error', { stack: err.stack });
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor.' 
      : err.message,
  });
}
```

**Avaliação:**
- ✅ Não vaza stack trace em produção
- ✅ Tratamento específico por tipo de erro
- ✅ Logging estruturado
- ⚠️ Error codes poderiam ser mais específicos

### Validation Middleware

**Arquivo:** `backend/src/shared/middleware/validation.js`

```javascript
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source]);
    if (error) {
      return next(new ValidationError(error.details));
    }
    req[source] = value; // sanitized value
    next();
  };
}
```

**Schemas Joi:**
```javascript
// user.validation.js
const createUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'professional', 'client').required(),
});
```

---

## 📝 LOGGING

### Winston Configuration

**Arquivo:** `backend/src/shared/utils/logger.js`

```javascript
const logger = winston.createLogger({
  level: env.log.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    // File transport em produção
  ],
});
```

**Uso com Contexto:**
```javascript
// app.multitenant.js:106-109
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// errorHandler.js:15-21
const logContext = {
  method: req.method,
  path: req.path,
  tenantId: req.tenantId,
  userId: req.user?.id,
  ip: req.ip,
};
logger.error(err.message, { ...logContext, stack: err.stack });
```

**Avaliação:**
- ✅ Estruturado (JSON)
- ✅ Contexto rich (tenant, user, IP)
- ⚠️ Não há correlation ID para tracing
- ⚠️ Não há log levels dinâmicos

---

## 🧪 TESTES

### Estado Atual

**Arquivo:** `backend/tests/multi-tenant-isolation.test.js`

```javascript
// Total: 14 testes unitários (não 24 como documentado)

describe('BaseRepository._scopedWhere', () => {
  test('returns where clause with tenant_id', () => {...});           // ✅
  test('throws TenantMismatchError when tenantId is null', () => {...}); // ✅
  test('does not allow override of tenant_id', () => {...});           // ⚠️ Documenta risco
});

describe('RBAC Role Hierarchy', () => {
  test('MASTER has highest index', () => {...});                       // ✅
  test('hierarchy is ordered correctly', () => {...});                 // ✅
});

describe('JWT Token Generation', () => {
  test('generates a valid access token', () => {...});                 // ✅
  test('verifies a valid access token', () => {...});                  // ✅
});

describe('Multi-Tenant Isolation (integration)', () => {
  describe('Product Isolation', () => {
    test.todo('Tenant A cannot access Tenant B products');               // ❌ Não implementado
    test.todo('Tenant B cannot modify Tenant A products');               // ❌ Não implementado
  });
});
```

**Problemas:**
1. Apenas 1 arquivo de teste
2. 14 testes reais + 3 stubs `.todo()`
3. 0 testes de integração (todos `.todo()`)
4. Não há testes para:
   - Controllers
   - Services
   - Routes
   - Webhooks
   - Brute force protection

### CI/CD

**Arquivo:** `.github/workflows/deploy.yml`

```yaml
test:
  runs-on: ubuntu-latest
  continue-on-error: true  # ⚠️ Testes não bloqueiam deploy
  steps:
    - run: npm test --if-present
```

**Problema:** `continue-on-error: true` significa que deploy acontece mesmo se testes falharem.

---

## 🔌 INTEGRAÇÕES

### Payment Providers

**Arquivo:** `backend/src/modules/billing/providers/`

```javascript
// Interface
class PaymentProviderInterface {
  async createSubscription(plan, customer) { throw new Error('Not implemented'); }
  async cancelSubscription(subscriptionId) { throw new Error('Not implemented'); }
  async verifyWebhookSignature(payload, signature) { return false; }
}

// Implementações:
// - MockPaymentProvider (dev/test)
// - StripePaymentProvider (produção)
// - PagarMePaymentProvider (stub — não implementado)
```

**Status:**
- ✅ Interface definida
- ✅ Mock provider funcional
- ✅ Stripe provider (não verificado se completo)
- ❌ Pagar.me não implementado

### Webhooks

**Arquivo:** `backend/src/modules/billing/controllers/webhook.controller.js`

```javascript
async handleWebhook(req, res, next) {
  // Verifica assinatura
  if (!this.paymentProvider.verifyWebhookSignature(...)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  
  // Processa evento
  await this._processEvent(event);
  res.json({ received: true });
}

// ⚠️ Problema: Helpers retornam null
async _findSubscriptionByGatewayId(gatewayId) {
  return null; // NÃO IMPLEMENTADO
}
```

---

## 📊 MÉTRICAS

| Métrica | Valor |
|---------|-------|
| Linhas de Código (est.) | ~15.000 |
| Módulos | 17 |
| Models | 12 (legacy) + 4 (billing) = 16 |
| Controllers | 13 (legacy) + 6 (billing) + 4 (outros) = 23 |
| Services | ~15 |
| Routes | ~25 |
| Middlewares | 7 |
| Testes | 14 unitários, 0 integração |
| Endpoints | ~80 |

---

## 🛠️ RECOMENDAÇÕES

### 🔴 P0 — CRÍTICO

**[B-001] Implementar Testes de Integração**
```javascript
// Criar tests/integration/tenant-isolation.test.js
describe('Tenant Isolation Integration', () => {
  test('Tenant A cannot read data from Tenant B', async () => {
    // Criar tenant A com dados
    // Criar tenant B com usuário
    // Tentar acessar dados de A como B
    // Esperar: 403 Forbidden
  });
});
```

**[B-002] Corrigir Webhook Controller**
```javascript
// Implementar helpers
async _findSubscriptionByGatewayId(gatewayId) {
  return this.models.Subscription.findOne({
    where: { gateway_subscription_id: gatewayId }
  });
}
```

### 🟡 P1 — ALTO

**[B-003] Remover `continue-on-error` do CI**
```yaml
# .github/workflows/deploy.yml
test:
  continue-on-error: false  # Quebrar build se testes falharem
```

**[B-004] Migrar Controllers Legacy**
Criar plano de migração para mover endpoints para módulos.

**[B-005] Adicionar Correlation ID**
```javascript
// middleware/requestContext.js
app.use((req, res, next) => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
});
```

### 🟢 P2 — MÉDIO

**[B-006] Implementar Workers/Filas**
```javascript
// Para jobs assíncronos:
// - Envio de emails
// - Geração de relatórios
// - Processamento de webhooks
```

**[B-007] Implementar Health Check Detalhado**
```javascript
// /api/health/deep
// Verifica: DB, Redis (se houver), fila, pagamento provider
```

---

## 🧪 COMANDOS DE VERIFICAÇÃO

```bash
# Verificar dependências vulneráveis
npm audit

# Verificar cobertura de testes
npm test -- --coverage

# Verificar complexidade de código
npx complexity-report src/

# Verificar endpoints sem testes
# (Comparar routes/ com tests/)

# Verificar imports não usados
npx depcheck
```

---

*Auditoria concluída em 08/05/2026. Análise de ~280 arquivos JavaScript.*

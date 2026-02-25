# Arquitetura Enterprise — Beauty Hub SaaS

> **Versão**: 2.0  
> **Data**: Fevereiro 2026  
> **Autor**: Staff Engineer  
> **Status**: RFC (Request for Comments)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Estrutura de Diretórios Enterprise](#2-estrutura-de-diretórios-enterprise)
3. [Clean Architecture](#3-clean-architecture)
4. [Contexto de Request](#4-contexto-de-request)
5. [Abstrações de Infraestrutura](#5-abstrações-de-infraestrutura)
6. [Segurança Multi-Tenant](#6-segurança-multi-tenant)
7. [Estratégia de Banco de Dados](#7-estratégia-de-banco-de-dados)
8. [Observabilidade](#8-observabilidade)
9. [Versionamento de API](#9-versionamento-de-api)
10. [Escalabilidade até 10k Tenants](#10-escalabilidade-até-10k-tenants)
11. [Migração para Microsserviços](#11-migração-para-microsserviços)
12. [Billing com Stripe Connect](#12-billing-com-stripe-connect)
13. [Split Payment](#13-split-payment)
14. [Integração Frontend ↔ Backend](#14-integração-frontend--backend)
15. [Checklist de Produção](#15-checklist-de-produção)

---

## 1. Visão Geral

### Estado Atual vs. Target

| Aspecto | Atual | Target Enterprise |
|---------|-------|-------------------|
| Arquitetura | Modular (modules/shared) | Clean Architecture + DDD lite |
| Contexto | req.tenant, req.user | RequestContext global + CorrelationId |
| Logging | Winston básico | Structured logging + tracing |
| Cache | In-memory Map | Redis com TTL por tenant |
| Queue | Nenhum | BullMQ + Redis |
| Storage | Local | S3-compatible abstraction |
| Payment | Modelos prontos | Stripe Connect + Split |
| Observability | Health check básico | Prometheus + Grafana ready |
| Security | JWT + RBAC | + Rate limit/tenant + Audit log |

### Princípios Arquiteturais

1. **Backward Compatibility** — Não quebrar APIs existentes
2. **Incremental Migration** — Refatorar módulo por módulo
3. **Infrastructure Abstraction** — Trocar implementação sem mudar domínio
4. **Tenant Isolation** — Dados nunca vazam entre tenants
5. **Observability First** — Logs, métricas, traces em tudo
6. **Fail Fast, Recover Gracefully** — Circuit breakers, retries

---

## 2. Estrutura de Diretórios Enterprise

```
backend/src/
├── server.js                           # Bootstrap: DB → Redis → Queue → HTTP
├── app.js                              # Express app factory
│
├── config/                             # Configuração centralizada
│   ├── index.js                        # Barrel export
│   ├── env.js                          # Validação de env vars (Joi)
│   ├── database.js                     # Sequelize config
│   ├── redis.js                        # Redis config
│   ├── queue.js                        # BullMQ config
│   ├── storage.js                      # S3 config
│   ├── stripe.js                       # Stripe config
│   └── cors.js                         # CORS config por ambiente
│
├── core/                               # ★ NÚCLEO DA APLICAÇÃO ★
│   ├── context/
│   │   ├── RequestContext.js           # Contexto global por request
│   │   ├── TenantContext.js            # Dados do tenant atual
│   │   └── index.js
│   │
│   ├── errors/
│   │   ├── AppError.js                 # Base error class
│   │   ├── DomainErrors.js             # Errors de domínio
│   │   ├── InfraErrors.js              # Errors de infra
│   │   └── index.js
│   │
│   ├── responses/
│   │   ├── ApiResponse.js              # Padronização de responses
│   │   ├── PaginatedResponse.js        # Response com paginação
│   │   └── index.js
│   │
│   ├── decorators/                     # Decorators para controllers
│   │   ├── audit.js                    # @Audit('action')
│   │   ├── rateLimit.js                # @RateLimit(100, '1m')
│   │   └── index.js
│   │
│   └── interfaces/                     # Contratos (ports)
│       ├── IRepository.js              # Interface base repository
│       ├── IPaymentGateway.js          # Interface payment
│       ├── IStorageProvider.js         # Interface storage
│       ├── IQueueProvider.js           # Interface queue
│       ├── ICacheProvider.js           # Interface cache
│       └── index.js
│
├── infrastructure/                     # ★ IMPLEMENTAÇÕES DE INFRA ★
│   ├── database/
│   │   ├── connection.js               # Sequelize instance
│   │   ├── BaseRepository.js           # Repository base com tenant scope
│   │   ├── TransactionManager.js       # Gerenciador de transactions
│   │   └── index.js
│   │
│   ├── cache/
│   │   ├── CacheProvider.js            # Interface abstrata
│   │   ├── RedisCacheProvider.js       # Implementação Redis
│   │   ├── InMemoryCacheProvider.js    # Implementação fallback
│   │   └── index.js
│   │
│   ├── queue/
│   │   ├── QueueProvider.js            # Interface abstrata
│   │   ├── BullMQProvider.js           # Implementação BullMQ
│   │   ├── InMemoryQueueProvider.js    # Implementação fallback
│   │   └── index.js
│   │
│   ├── storage/
│   │   ├── StorageProvider.js          # Interface abstrata
│   │   ├── S3StorageProvider.js        # Implementação S3
│   │   ├── LocalStorageProvider.js     # Implementação local
│   │   └── index.js
│   │
│   ├── payment/
│   │   ├── PaymentGateway.js           # Interface abstrata
│   │   ├── StripeGateway.js            # Implementação Stripe
│   │   ├── StripeConnectService.js     # Stripe Connect (marketplace)
│   │   └── index.js
│   │
│   └── observability/
│       ├── Logger.js                   # Winston estruturado
│       ├── Metrics.js                  # Prometheus client
│       ├── Tracer.js                   # OpenTelemetry ready
│       └── index.js
│
├── shared/                             # ★ CÓDIGO COMPARTILHADO ★
│   ├── constants/
│   │   ├── roles.js
│   │   ├── statuses.js
│   │   ├── errorCodes.js
│   │   └── index.js
│   │
│   ├── middleware/
│   │   ├── requestContext.js           # Injeta RequestContext
│   │   ├── tenantResolver.js           # Resolve tenant
│   │   ├── auth.js                     # JWT + RBAC
│   │   ├── rateLimiter.js              # Rate limit por tenant
│   │   ├── correlationId.js            # Gera/propaga correlation ID
│   │   ├── errorHandler.js             # Global error handler
│   │   ├── requestLogger.js            # Log de requests
│   │   └── index.js
│   │
│   ├── validators/
│   │   ├── joi.extensions.js           # CPF, CNPJ, phone
│   │   ├── commonSchemas.js            # UUID, pagination, etc
│   │   └── index.js
│   │
│   └── utils/
│       ├── jwt.js
│       ├── hash.js
│       ├── slug.js
│       ├── date.js
│       └── index.js
│
├── modules/                            # ★ MÓDULOS DE DOMÍNIO ★
│   ├── index.js                        # Inicializador de módulos
│   │
│   ├── tenants/
│   │   ├── domain/
│   │   │   ├── Tenant.entity.js        # Entidade de domínio
│   │   │   ├── Tenant.events.js        # Domain events
│   │   │   └── Tenant.errors.js        # Errors específicos
│   │   │
│   │   ├── application/
│   │   │   ├── TenantService.js        # Casos de uso
│   │   │   ├── dto/
│   │   │   │   ├── CreateTenantDTO.js
│   │   │   │   ├── UpdateTenantDTO.js
│   │   │   │   └── TenantResponseDTO.js
│   │   │   └── mappers/
│   │   │       └── TenantMapper.js     # Entity ↔ DTO
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── TenantRepository.js     # Implementação Sequelize
│   │   │   ├── TenantModel.js          # Sequelize model
│   │   │   └── TenantCache.js          # Cache de tenants
│   │   │
│   │   ├── interface/
│   │   │   ├── TenantController.js     # HTTP handlers
│   │   │   ├── TenantRoutes.js         # Express routes
│   │   │   └── TenantValidation.js     # Joi schemas
│   │   │
│   │   ├── jobs/                       # Background jobs
│   │   │   ├── SyncTenantMetrics.job.js
│   │   │   └── CleanupInactiveTenants.job.js
│   │   │
│   │   └── index.js                    # Barrel export + init
│   │
│   ├── billing/
│   │   ├── domain/
│   │   │   ├── Subscription.entity.js
│   │   │   ├── Invoice.entity.js
│   │   │   ├── Plan.entity.js
│   │   │   └── Billing.events.js
│   │   │
│   │   ├── application/
│   │   │   ├── SubscriptionService.js
│   │   │   ├── InvoiceService.js
│   │   │   ├── StripeWebhookHandler.js
│   │   │   └── dto/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── SubscriptionRepository.js
│   │   │   ├── InvoiceRepository.js
│   │   │   └── models/
│   │   │
│   │   ├── interface/
│   │   │   ├── BillingController.js
│   │   │   ├── WebhookController.js
│   │   │   └── BillingRoutes.js
│   │   │
│   │   └── index.js
│   │
│   ├── users/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── interface/
│   │   └── index.js
│   │
│   ├── appointments/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   ├── interface/
│   │   └── index.js
│   │
│   ├── clients/
│   │   └── ...
│   │
│   ├── services/
│   │   └── ...
│   │
│   ├── financial/
│   │   └── ...
│   │
│   └── notifications/
│       ├── domain/
│       ├── application/
│       │   ├── NotificationService.js
│       │   └── channels/
│       │       ├── EmailChannel.js
│       │       ├── SMSChannel.js
│       │       ├── PushChannel.js
│       │       └── WhatsAppChannel.js
│       ├── infrastructure/
│       │   ├── NotificationRepository.js
│       │   └── providers/
│       │       ├── SendGridProvider.js
│       │       ├── TwilioProvider.js
│       │       └── FirebaseProvider.js
│       ├── interface/
│       └── jobs/
│           ├── SendEmail.job.js
│           └── SendSMS.job.js
│
├── api/                                # ★ VERSIONAMENTO DE API ★
│   ├── v1/
│   │   ├── index.js                    # Router v1
│   │   └── routes.js                   # Mapeamento de rotas v1
│   │
│   └── v2/                             # Futura versão
│       └── ...
│
├── jobs/                               # ★ WORKERS DE BACKGROUND ★
│   ├── worker.js                       # Entry point dos workers
│   ├── queues.js                       # Definição das filas
│   └── processors/
│       ├── billing.processor.js
│       ├── notification.processor.js
│       └── analytics.processor.js
│
├── migrations/                         # Sequelize migrations
│
├── seeders/                            # Sequelize seeders
│
└── tests/                              # ★ TESTES ★
    ├── unit/
    ├── integration/
    ├── e2e/
    └── fixtures/
```

---

## 3. Clean Architecture

### Fluxo de Request

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE CHAIN                          │
│  correlationId → requestContext → tenantResolver → auth     │
│  → rateLimiter → requestLogger → validation                 │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                     INTERFACE LAYER                          │
│  Controller                                                  │
│  - Extrai dados do request                                   │
│  - Chama Service                                             │
│  - Formata response via ApiResponse                          │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  Service                                                     │
│  - Orquestra casos de uso                                    │
│  - Usa DTOs para input/output                                │
│  - Chama Repository                                          │
│  - Dispara eventos de domínio                                │
│  - Enfileira jobs                                            │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER                             │
│  Entity                                                      │
│  - Regras de negócio                                         │
│  - Validações de domínio                                     │
│  - Imutabilidade onde aplicável                              │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                         │
│  Repository (Sequelize), Cache (Redis), Queue (BullMQ)       │
│  Payment (Stripe), Storage (S3), Notification (SendGrid)     │
└─────────────────────────────────────────────────────────────┘
```

### Exemplo: Criar Agendamento

```javascript
// interface/AppointmentController.js
async create(req, res) {
  const dto = CreateAppointmentDTO.fromRequest(req.body);
  const result = await this.appointmentService.create(dto, req.context);
  return ApiResponse.created(res, AppointmentMapper.toResponse(result));
}

// application/AppointmentService.js
async create(dto, context) {
  // 1. Validar disponibilidade
  const isAvailable = await this.checkAvailability(dto);
  if (!isAvailable) throw new SlotUnavailableError();
  
  // 2. Criar entidade de domínio
  const appointment = Appointment.create({
    ...dto,
    tenantId: context.tenant.id,
    createdBy: context.user.id,
  });
  
  // 3. Persistir
  const saved = await this.repository.save(appointment);
  
  // 4. Disparar eventos
  await this.eventBus.publish(new AppointmentCreatedEvent(saved));
  
  // 5. Enfileirar notificações
  await this.queue.add('send-confirmation', { appointmentId: saved.id });
  
  // 6. Audit log
  await this.auditLog.record('appointment.created', saved, context);
  
  return saved;
}
```

### DTOs

```javascript
// application/dto/CreateAppointmentDTO.js
class CreateAppointmentDTO {
  constructor({ clientId, professionalId, serviceId, dateTime, notes }) {
    this.clientId = clientId;
    this.professionalId = professionalId;
    this.serviceId = serviceId;
    this.dateTime = new Date(dateTime);
    this.notes = notes || null;
  }
  
  static fromRequest(body) {
    return new CreateAppointmentDTO(body);
  }
  
  validate() {
    if (!this.clientId) throw new ValidationError('clientId is required');
    if (!this.dateTime || isNaN(this.dateTime)) throw new ValidationError('Invalid dateTime');
    return true;
  }
}
```

### Mappers

```javascript
// application/mappers/AppointmentMapper.js
class AppointmentMapper {
  static toResponse(entity) {
    return {
      id: entity.id,
      client: entity.client ? ClientMapper.toSummary(entity.client) : null,
      professional: entity.professional ? ProfessionalMapper.toSummary(entity.professional) : null,
      service: entity.service ? ServiceMapper.toSummary(entity.service) : null,
      dateTime: entity.dateTime.toISOString(),
      status: entity.status,
      totalPrice: entity.totalPrice,
      notes: entity.notes,
      createdAt: entity.createdAt.toISOString(),
    };
  }
  
  static toList(entities) {
    return entities.map(e => this.toResponse(e));
  }
}
```

### ApiResponse Padronizado

```javascript
// core/responses/ApiResponse.js
class ApiResponse {
  static success(res, data, meta = {}) {
    return res.status(200).json({
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    });
  }
  
  static created(res, data) {
    return res.status(201).json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  }
  
  static paginated(res, data, pagination) {
    return res.status(200).json({
      success: true,
      data,
      meta: {
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.limit),
          hasMore: pagination.page * pagination.limit < pagination.total,
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  static error(res, error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        details: error.details || null,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## 4. Contexto de Request

### RequestContext

```javascript
// core/context/RequestContext.js
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

class RequestContext {
  constructor() {
    this.correlationId = null;
    this.tenant = null;
    this.user = null;
    this.startTime = Date.now();
    this.metadata = {};
  }
  
  static create(correlationId) {
    const ctx = new RequestContext();
    ctx.correlationId = correlationId;
    return ctx;
  }
  
  static current() {
    return asyncLocalStorage.getStore() || new RequestContext();
  }
  
  static run(context, callback) {
    return asyncLocalStorage.run(context, callback);
  }
  
  setTenant(tenant) {
    this.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      planId: tenant.subscription?.planId,
      features: tenant.subscription?.plan?.features || [],
    };
  }
  
  setUser(user) {
    this.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
  }
  
  get duration() {
    return Date.now() - this.startTime;
  }
  
  toLogContext() {
    return {
      correlationId: this.correlationId,
      tenantId: this.tenant?.id,
      tenantSlug: this.tenant?.slug,
      userId: this.user?.id,
      userRole: this.user?.role,
    };
  }
}

module.exports = { RequestContext, asyncLocalStorage };
```

### Middleware de Contexto

```javascript
// shared/middleware/requestContext.js
const { v4: uuidv4 } = require('uuid');
const { RequestContext } = require('../../core/context');

function requestContextMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const context = RequestContext.create(correlationId);
  
  // Propagar correlation ID no response
  res.setHeader('x-correlation-id', correlationId);
  
  // Anexar ao request para acesso fácil
  req.context = context;
  
  // Executar resto da chain dentro do contexto
  RequestContext.run(context, () => next());
}

module.exports = requestContextMiddleware;
```

### Uso no Service

```javascript
// Qualquer lugar no código
const { RequestContext } = require('../../core/context');

async function someOperation() {
  const ctx = RequestContext.current();
  
  logger.info('Processing', ctx.toLogContext());
  
  if (!ctx.tenant) {
    throw new TenantRequiredError();
  }
  
  // Acessar dados do contexto
  const tenantId = ctx.tenant.id;
  const userId = ctx.user?.id;
}
```

---

## 5. Abstrações de Infraestrutura

### Interface de Cache

```javascript
// core/interfaces/ICacheProvider.js
class ICacheProvider {
  async get(key) { throw new Error('Not implemented'); }
  async set(key, value, ttlSeconds) { throw new Error('Not implemented'); }
  async del(key) { throw new Error('Not implemented'); }
  async exists(key) { throw new Error('Not implemented'); }
  async getOrSet(key, factory, ttlSeconds) { throw new Error('Not implemented'); }
  async invalidatePattern(pattern) { throw new Error('Not implemented'); }
}
```

### Implementação Redis

```javascript
// infrastructure/cache/RedisCacheProvider.js
const Redis = require('ioredis');
const { ICacheProvider } = require('../../core/interfaces');
const config = require('../../config/redis');

class RedisCacheProvider extends ICacheProvider {
  constructor() {
    super();
    this.client = new Redis(config.redis);
    this.defaultTTL = 300; // 5 minutos
  }
  
  _tenantKey(key) {
    const ctx = RequestContext.current();
    if (ctx.tenant) {
      return `tenant:${ctx.tenant.id}:${key}`;
    }
    return `global:${key}`;
  }
  
  async get(key) {
    const data = await this.client.get(this._tenantKey(key));
    return data ? JSON.parse(data) : null;
  }
  
  async set(key, value, ttlSeconds = this.defaultTTL) {
    const fullKey = this._tenantKey(key);
    await this.client.setex(fullKey, ttlSeconds, JSON.stringify(value));
  }
  
  async getOrSet(key, factory, ttlSeconds = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached) return cached;
    
    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }
  
  async invalidatePattern(pattern) {
    const ctx = RequestContext.current();
    const fullPattern = ctx.tenant 
      ? `tenant:${ctx.tenant.id}:${pattern}*`
      : `global:${pattern}*`;
    
    const keys = await this.client.keys(fullPattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }
}
```

### Interface de Queue

```javascript
// core/interfaces/IQueueProvider.js
class IQueueProvider {
  async add(queueName, jobData, options) { throw new Error('Not implemented'); }
  async addBulk(queueName, jobs) { throw new Error('Not implemented'); }
  async process(queueName, processor) { throw new Error('Not implemented'); }
  async getJob(queueName, jobId) { throw new Error('Not implemented'); }
  async getQueueStatus(queueName) { throw new Error('Not implemented'); }
}
```

### Implementação BullMQ

```javascript
// infrastructure/queue/BullMQProvider.js
const { Queue, Worker } = require('bullmq');
const { IQueueProvider } = require('../../core/interfaces');
const config = require('../../config/redis');

class BullMQProvider extends IQueueProvider {
  constructor() {
    super();
    this.queues = new Map();
    this.workers = new Map();
    this.connection = config.redis;
  }
  
  getQueue(name) {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: this.connection }));
    }
    return this.queues.get(name);
  }
  
  async add(queueName, jobData, options = {}) {
    const queue = this.getQueue(queueName);
    const ctx = RequestContext.current();
    
    // Incluir contexto no job
    const enrichedData = {
      ...jobData,
      _context: {
        correlationId: ctx.correlationId,
        tenantId: ctx.tenant?.id,
        userId: ctx.user?.id,
      },
    };
    
    return queue.add(queueName, enrichedData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      ...options,
    });
  }
  
  async process(queueName, processor) {
    const worker = new Worker(queueName, async (job) => {
      // Restaurar contexto
      const ctx = RequestContext.create(job.data._context?.correlationId);
      if (job.data._context?.tenantId) {
        ctx.tenant = { id: job.data._context.tenantId };
      }
      
      return RequestContext.run(ctx, () => processor(job));
    }, { connection: this.connection });
    
    this.workers.set(queueName, worker);
    return worker;
  }
}
```

### Interface de Storage

```javascript
// infrastructure/storage/S3StorageProvider.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { IStorageProvider } = require('../../core/interfaces');
const config = require('../../config/storage');

class S3StorageProvider extends IStorageProvider {
  constructor() {
    super();
    this.client = new S3Client(config.s3);
    this.bucket = config.s3.bucket;
  }
  
  _tenantPath(path) {
    const ctx = RequestContext.current();
    if (!ctx.tenant) throw new TenantRequiredError();
    return `tenants/${ctx.tenant.id}/${path}`;
  }
  
  async upload(path, buffer, contentType) {
    const key = this._tenantPath(path);
    
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    
    return { key, url: `https://${this.bucket}.s3.amazonaws.com/${key}` };
  }
  
  async getSignedUrl(path, expiresIn = 3600) {
    const key = this._tenantPath(path);
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
  
  async delete(path) {
    const key = this._tenantPath(path);
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }
}
```

### Dependency Injection Container

```javascript
// infrastructure/container.js
const { RedisCacheProvider, InMemoryCacheProvider } = require('./cache');
const { BullMQProvider, InMemoryQueueProvider } = require('./queue');
const { S3StorageProvider, LocalStorageProvider } = require('./storage');
const { StripeGateway } = require('./payment');

class Container {
  constructor() {
    this.services = new Map();
  }
  
  register(name, factory) {
    this.services.set(name, { factory, instance: null });
  }
  
  get(name) {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service ${name} not registered`);
    
    if (!service.instance) {
      service.instance = service.factory();
    }
    return service.instance;
  }
}

const container = new Container();

// Registrar implementações baseado no ambiente
const isProduction = process.env.NODE_ENV === 'production';

container.register('cache', () => 
  isProduction ? new RedisCacheProvider() : new InMemoryCacheProvider()
);

container.register('queue', () => 
  isProduction ? new BullMQProvider() : new InMemoryQueueProvider()
);

container.register('storage', () => 
  isProduction ? new S3StorageProvider() : new LocalStorageProvider()
);

container.register('payment', () => new StripeGateway());

module.exports = container;
```

---

## 6. Segurança Multi-Tenant

### Matriz de Ameaças e Mitigações

| Ameaça | Impacto | Mitigação |
|--------|---------|-----------|
| Tenant enumeration | Alto | Respostas genéricas, rate limit agressivo em auth |
| Cross-tenant data leak | Crítico | BaseRepository com escopo obrigatório, testes automatizados |
| JWT tampering | Crítico | Validação de tenant_id no JWT vs. header |
| Privilege escalation | Alto | RBAC hierárquico com verificação em cada endpoint |
| Brute force | Médio | Rate limit por IP + tenant, lockout após 5 tentativas |
| API abuse | Médio | Rate limit por plano, throttling por endpoint |

### Rate Limiting por Tenant

```javascript
// shared/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { RequestContext } = require('../../core/context');

const PLAN_LIMITS = {
  STARTER:      { requests: 1000,  window: 60 },  // 1k/min
  PROFESSIONAL: { requests: 5000,  window: 60 },  // 5k/min
  BUSINESS:     { requests: 10000, window: 60 },  // 10k/min
  ENTERPRISE:   { requests: 50000, window: 60 },  // 50k/min
};

function tenantRateLimiter(redis) {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    
    keyGenerator: (req) => {
      const ctx = RequestContext.current();
      // Chave única por tenant + IP
      return ctx.tenant 
        ? `rl:${ctx.tenant.id}:${req.ip}`
        : `rl:anon:${req.ip}`;
    },
    
    max: (req) => {
      const ctx = RequestContext.current();
      const planId = ctx.tenant?.planId || 'STARTER';
      return PLAN_LIMITS[planId]?.requests || 1000;
    },
    
    windowMs: 60 * 1000, // 1 minuto
    
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retryAfter: res.getHeader('Retry-After'),
        },
      });
    },
    
    skip: (req) => {
      // Skip health checks
      return req.path === '/health' || req.path === '/ready';
    },
  });
}
```

### Validação Hard de Tenant

```javascript
// shared/middleware/auth.js
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    const decoded = jwt.verify(token);
    
    // CRÍTICO: Validar que tenant do JWT === tenant resolvido
    const ctx = RequestContext.current();
    
    if (decoded.role !== 'MASTER') {
      if (!ctx.tenant) {
        throw new TenantRequiredError();
      }
      
      if (decoded.tenantId !== ctx.tenant.id) {
        // Log de segurança - possível ataque
        logger.warn('Tenant mismatch detected', {
          jwtTenantId: decoded.tenantId,
          resolvedTenantId: ctx.tenant.id,
          userId: decoded.sub,
          ip: req.ip,
        });
        
        throw new UnauthorizedError('Invalid token for this tenant');
      }
    }
    
    ctx.setUser({
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId,
    });
    
    req.user = ctx.user;
    next();
  } catch (error) {
    next(error);
  }
}
```

### Audit Log

```javascript
// infrastructure/observability/AuditLog.js
class AuditLog {
  constructor(repository, queue) {
    this.repository = repository;
    this.queue = queue;
  }
  
  async record(action, data, context = null) {
    const ctx = context || RequestContext.current();
    
    const entry = {
      id: uuidv4(),
      action,
      tenantId: ctx.tenant?.id,
      userId: ctx.user?.id,
      userEmail: ctx.user?.email,
      userRole: ctx.user?.role,
      correlationId: ctx.correlationId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      resourceType: data.constructor?.name || 'unknown',
      resourceId: data.id,
      changes: this._extractChanges(data),
      timestamp: new Date(),
    };
    
    // Async - não bloqueia request
    await this.queue.add('audit-log', entry, { 
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  }
  
  _extractChanges(data) {
    if (data._previousDataValues) {
      // Sequelize model - captura mudanças
      const changes = {};
      for (const [key, value] of Object.entries(data.dataValues)) {
        if (data._previousDataValues[key] !== value) {
          changes[key] = {
            from: data._previousDataValues[key],
            to: value,
          };
        }
      }
      return changes;
    }
    return null;
  }
}

// Ações auditadas
const AUDITED_ACTIONS = [
  'user.created', 'user.updated', 'user.deleted', 'user.role_changed',
  'tenant.created', 'tenant.suspended', 'tenant.settings_changed',
  'subscription.created', 'subscription.upgraded', 'subscription.cancelled',
  'appointment.cancelled', 'appointment.refunded',
  'financial.entry_created', 'financial.exit_created',
  'auth.login', 'auth.logout', 'auth.password_changed', 'auth.failed_attempt',
];
```

### Proteção contra Enumeração

```javascript
// modules/tenants/interface/TenantController.js
async checkSlug(req, res) {
  const { slug } = req.params;
  
  // SEMPRE retornar resposta genérica
  // Mesmo que o tenant exista, não revelar informação
  const exists = await this.tenantService.existsBySlug(slug);
  
  // Adicionar delay aleatório para evitar timing attacks
  await this._randomDelay(50, 150);
  
  return ApiResponse.success(res, { 
    available: !exists 
  });
}

async _randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Login - mensagem genérica
async login(req, res) {
  try {
    const result = await this.authService.login(req.body);
    return ApiResponse.success(res, result);
  } catch (error) {
    // NUNCA revelar se email existe ou não
    return ApiResponse.error(res, new UnauthorizedError('Invalid credentials'));
  }
}
```

---

## 7. Estratégia de Banco de Dados

### Índices Estratégicos

```sql
-- Índices para queries frequentes por tenant
CREATE INDEX CONCURRENTLY idx_appointments_tenant_date 
  ON appointments(tenant_id, date_time DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_appointments_tenant_professional_date 
  ON appointments(tenant_id, professional_id, date_time) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_appointments_tenant_client 
  ON appointments(tenant_id, client_id, date_time DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_appointments_tenant_status 
  ON appointments(tenant_id, status) 
  WHERE deleted_at IS NULL;

-- Índices para financeiro
CREATE INDEX CONCURRENTLY idx_financial_entries_tenant_date 
  ON financial_entries(tenant_id, transaction_date DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_financial_exits_tenant_date 
  ON financial_exits(tenant_id, transaction_date DESC) 
  WHERE deleted_at IS NULL;

-- Índice para busca de clientes
CREATE INDEX CONCURRENTLY idx_clients_tenant_search 
  ON clients(tenant_id, LOWER(name), LOWER(email)) 
  WHERE deleted_at IS NULL;

-- Índice para busca de serviços
CREATE INDEX CONCURRENTLY idx_services_tenant_active 
  ON services(tenant_id, is_active, name) 
  WHERE deleted_at IS NULL;

-- Índices para billing
CREATE INDEX CONCURRENTLY idx_subscriptions_tenant_status 
  ON subscriptions(tenant_id, status);

CREATE INDEX CONCURRENTLY idx_invoices_tenant_due 
  ON invoices(tenant_id, due_date, status) 
  WHERE status IN ('pending', 'overdue');

-- Índice parcial para appointments futuros (hot data)
CREATE INDEX CONCURRENTLY idx_appointments_future 
  ON appointments(tenant_id, date_time) 
  WHERE date_time > NOW() AND deleted_at IS NULL;
```

### Particionamento (>1M appointments)

```sql
-- Particionamento por range de data
-- Implementar quando appointments > 1M rows

-- 1. Criar tabela particionada
CREATE TABLE appointments_partitioned (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  date_time TIMESTAMPTZ NOT NULL,
  -- ... outras colunas
  PRIMARY KEY (id, date_time)
) PARTITION BY RANGE (date_time);

-- 2. Criar partições por mês
CREATE TABLE appointments_2026_01 PARTITION OF appointments_partitioned
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE appointments_2026_02 PARTITION OF appointments_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 3. Criar partição default para dados antigos/futuros
CREATE TABLE appointments_default PARTITION OF appointments_partitioned DEFAULT;

-- 4. Automatizar criação de partições
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Próximo mês
  partition_date := DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
  partition_name := 'appointments_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date := partition_date;
  end_date := partition_date + INTERVAL '1 month';
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF appointments_partitioned
     FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Executar via pg_cron mensalmente
SELECT cron.schedule('create-appointment-partition', '0 0 25 * *', 
  'SELECT create_monthly_partition()');
```

### Estratégia de Sharding Futura

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ESTRATÉGIA DE SHARDING                          │
│                 (Implementar quando > 5k tenants)                   │
└─────────────────────────────────────────────────────────────────────┘

FASE 1: Read Replicas (atual → 5k tenants)
┌─────────────┐     ┌─────────────┐
│   Primary   │────▶│  Replica 1  │ ← Reads
│   (Writes)  │────▶│  Replica 2  │ ← Reads
└─────────────┘     └─────────────┘

FASE 2: Functional Sharding (5k → 10k tenants)
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Shard 1   │  │   Shard 2   │  │   Shard 3   │
│   Tenants   │  │  Appoint-   │  │  Financial  │
│   Users     │  │    ments    │  │   Billing   │
│   Billing   │  │   Clients   │  │   Reports   │
└─────────────┘  └─────────────┘  └─────────────┘

FASE 3: Horizontal Sharding por Tenant (>10k tenants)
┌─────────────────────────────────────────────────────────────────────┐
│                        ROUTER (Vitess/Citus)                         │
│                   tenant_id % 4 → shard assignment                   │
└───────────────────────────┬─────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│  Shard 0  │ │  Shard 1  │ │  Shard 2  │ │  Shard 3  │
│  25% tnt  │ │  25% tnt  │ │  25% tnt  │ │  25% tnt  │
└───────────┘ └───────────┘ └───────────┘ └───────────┘

Decisão de Sharding Key:
- PRIMARY: tenant_id (todas as queries são scoped por tenant)
- Garante que dados de um tenant estão sempre no mesmo shard
- Cross-shard queries apenas para MASTER role (reports globais)
```

### Connection Pooling

```javascript
// config/database.js
module.exports = {
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    
    pool: {
      max: 50,        // Máximo de conexões
      min: 10,        // Mínimo mantido aberto
      acquire: 30000, // Tempo máximo para adquirir conexão
      idle: 10000,    // Tempo antes de liberar conexão ociosa
      evict: 1000,    // Intervalo de verificação de conexões ociosas
    },
    
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      // Statement timeout para evitar queries longas
      statement_timeout: 30000,
      // Idle transaction timeout
      idle_in_transaction_session_timeout: 60000,
    },
    
    // Read replicas
    replication: {
      read: [
        { host: process.env.DB_READ_HOST_1 },
        { host: process.env.DB_READ_HOST_2 },
      ],
      write: { host: process.env.DB_HOST },
    },
    
    logging: (sql, timing) => {
      if (timing > 1000) {
        logger.warn('Slow query', { sql, timing });
      }
    },
  },
};
```

---

## 8. Observabilidade

### Logger Estruturado

```javascript
// infrastructure/observability/Logger.js
const winston = require('winston');
const { RequestContext } = require('../../core/context');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'beautyhub-api',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json(),
    }),
  ],
});

// Wrapper que adiciona contexto automaticamente
const contextLogger = {
  _enrich(meta) {
    const ctx = RequestContext.current();
    return {
      ...meta,
      correlationId: ctx.correlationId,
      tenantId: ctx.tenant?.id,
      tenantSlug: ctx.tenant?.slug,
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
    };
  },
  
  info(message, meta = {}) {
    logger.info(message, this._enrich(meta));
  },
  
  warn(message, meta = {}) {
    logger.warn(message, this._enrich(meta));
  },
  
  error(message, meta = {}) {
    logger.error(message, this._enrich(meta));
  },
  
  debug(message, meta = {}) {
    logger.debug(message, this._enrich(meta));
  },
};

module.exports = contextLogger;
```

### Métricas (Prometheus-ready)

```javascript
// infrastructure/observability/Metrics.js
const promClient = require('prom-client');

// Coletar métricas padrão (CPU, memory, etc)
promClient.collectDefaultMetrics({ prefix: 'beautyhub_' });

// Métricas customizadas
const httpRequestDuration = new promClient.Histogram({
  name: 'beautyhub_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'beautyhub_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
});

const activeConnections = new promClient.Gauge({
  name: 'beautyhub_active_connections',
  help: 'Number of active connections',
});

const dbQueryDuration = new promClient.Histogram({
  name: 'beautyhub_db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
});

const queueJobDuration = new promClient.Histogram({
  name: 'beautyhub_queue_job_duration_seconds',
  help: 'Duration of background jobs',
  labelNames: ['queue', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30],
});

const tenantAppointments = new promClient.Gauge({
  name: 'beautyhub_tenant_appointments_total',
  help: 'Total appointments per tenant',
  labelNames: ['tenant_id', 'status'],
});

// Middleware para métricas HTTP
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  const ctx = RequestContext.current();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      tenant_id: ctx.tenant?.id || 'none',
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
}

// Endpoint /metrics
async function metricsEndpoint(req, res) {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
}

module.exports = {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  dbQueryDuration,
  queueJobDuration,
  tenantAppointments,
  metricsMiddleware,
  metricsEndpoint,
};
```

### Health Checks Avançados

```javascript
// api/health.js
const { Router } = require('express');
const sequelize = require('../infrastructure/database/connection');
const redis = require('../infrastructure/cache').client;

const router = Router();

// Liveness - processo está rodando?
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness - pronto para receber tráfego?
router.get('/ready', async (req, res) => {
  const checks = {
    database: { status: 'unknown' },
    redis: { status: 'unknown' },
    memory: { status: 'unknown' },
  };
  
  let isReady = true;
  
  // Check database
  try {
    const start = Date.now();
    await sequelize.query('SELECT 1');
    checks.database = { 
      status: 'healthy', 
      latency: Date.now() - start 
    };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: error.message };
    isReady = false;
  }
  
  // Check Redis
  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { 
      status: 'healthy', 
      latency: Date.now() - start 
    };
  } catch (error) {
    checks.redis = { status: 'unhealthy', error: error.message };
    // Redis não é crítico - degraded mode
    checks.redis.degraded = true;
  }
  
  // Check memory
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((used.heapUsed / used.heapTotal) * 100);
  
  checks.memory = {
    status: heapPercent < 90 ? 'healthy' : 'warning',
    heapUsedMB,
    heapTotalMB,
    heapPercent,
  };
  
  if (heapPercent >= 95) {
    checks.memory.status = 'critical';
    isReady = false;
  }
  
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Detailed status (admin only)
router.get('/status', authenticate, authorize(['MASTER']), async (req, res) => {
  const dbPool = sequelize.connectionManager.pool;
  
  res.json({
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      pool: {
        size: dbPool.size,
        available: dbPool.available,
        pending: dbPool.pending,
      },
    },
    redis: await redis.info(),
    queues: await getQueueStats(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
```

---

## 9. Versionamento de API

### Estratégia: URL Path Versioning

```
/api/v1/appointments    ← Versão atual, estável
/api/v2/appointments    ← Próxima versão (quando necessário)
```

**Trade-offs:**

| Estratégia | Prós | Contras |
|------------|------|---------|
| URL Path (escolhida) | Explícito, fácil debug, cache-friendly | URLs mais longas |
| Header (Accept-Version) | URLs limpas | Invisível, difícil debug |
| Query param | Simples | Poluição de query string |

### Implementação

```javascript
// api/v1/index.js
const { Router } = require('express');
const tenantRoutes = require('../../modules/tenants/interface/TenantRoutes');
const userRoutes = require('../../modules/users/interface/UserRoutes');
const appointmentRoutes = require('../../modules/appointments/interface/AppointmentRoutes');

const router = Router();

router.use('/tenants', tenantRoutes);
router.use('/users', userRoutes);
router.use('/appointments', appointmentRoutes);
// ... outros módulos

module.exports = router;

// app.js
const v1Routes = require('./api/v1');
const v2Routes = require('./api/v2'); // futuro

app.use('/api/v1', v1Routes);
// app.use('/api/v2', v2Routes);

// Redirect sem versão para v1 (backward compat)
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/v1') && !req.path.startsWith('/v2')) {
    return res.redirect(307, `/api/v1${req.path}`);
  }
  next();
});
```

### Deprecation Policy

```javascript
// shared/middleware/deprecation.js
function deprecationWarning(version, sunsetDate) {
  return (req, res, next) => {
    res.setHeader('Deprecation', `version="${version}"`);
    res.setHeader('Sunset', sunsetDate.toUTCString());
    res.setHeader('Link', '</api/v2>; rel="successor-version"');
    
    logger.info('Deprecated API called', {
      version,
      path: req.path,
      sunsetDate,
    });
    
    next();
  };
}

// Uso em v1 quando v2 estiver disponível
router.use(deprecationWarning('v1', new Date('2027-01-01')));
```

---

## 10. Escalabilidade até 10k Tenants

### Projeções de Carga

| Métrica | 1k Tenants | 5k Tenants | 10k Tenants |
|---------|------------|------------|-------------|
| Usuários | ~10k | ~50k | ~100k |
| Appointments/dia | ~50k | ~250k | ~500k |
| Requests/min | ~5k | ~25k | ~50k |
| Storage | ~50GB | ~250GB | ~500GB |
| DB Connections | 50 | 100 | 200 |

### Arquitetura por Fase

```
FASE 1: Monolito Otimizado (atual → 1k tenants)
┌─────────────────────────────────────────────────────┐
│                    Load Balancer                     │
└───────────────────────┬─────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
      ┌──────────┐            ┌──────────┐
      │  API 1   │            │  API 2   │
      │ (Node)   │            │ (Node)   │
      └────┬─────┘            └────┬─────┘
           │                       │
           └───────────┬───────────┘
                       │
                 ┌─────┴─────┐
                 │ PostgreSQL │
                 │  (Single)  │
                 └───────────┘

FASE 2: Separação de Workers (1k → 5k tenants)
┌─────────────────────────────────────────────────────┐
│                    Load Balancer                     │
└───────────────────────┬─────────────────────────────┘
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│  API x3  │      │ Worker x2 │      │ Scheduler│
└────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │
     └────────┬────────┴────────┬────────┘
              │                 │
        ┌─────┴─────┐     ┌─────┴─────┐
        │   Redis   │     │ PostgreSQL │
        │  Cluster  │     │  Primary   │
        └───────────┘     │ + Replica  │
                          └───────────┘

FASE 3: Microsserviços Lite (5k → 10k tenants)
┌─────────────────────────────────────────────────────┐
│                    API Gateway                       │
│               (Rate Limit, Auth)                     │
└───────────────────────┬─────────────────────────────┘
                        │
    ┌───────────┬───────┼───────┬───────────┐
    ▼           ▼       ▼       ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Tenant │ │ Appoint│ │Billing │ │ Notif  │ │Reports │
│Service │ │Service │ │Service │ │Service │ │Service │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │          │
    └──────────┼──────────┼──────────┼──────────┘
               │          │          │
         ┌─────┴────┐ ┌───┴───┐ ┌───┴───┐
         │PostgreSQL│ │ Redis │ │  S3   │
         │ Cluster  │ │Cluster│ │       │
         └──────────┘ └───────┘ └───────┘
```

### Otimizações Chave

```javascript
// 1. Connection Pooling por Tenant (evitar connection starvation)
class TenantAwarePool {
  constructor(maxPerTenant = 5, globalMax = 100) {
    this.pools = new Map();
    this.maxPerTenant = maxPerTenant;
    this.globalMax = globalMax;
    this.currentTotal = 0;
  }
  
  async acquire(tenantId) {
    if (!this.pools.has(tenantId)) {
      this.pools.set(tenantId, { count: 0, queue: [] });
    }
    
    const pool = this.pools.get(tenantId);
    
    if (pool.count >= this.maxPerTenant) {
      // Tenant atingiu limite - enfileirar
      return new Promise((resolve) => {
        pool.queue.push(resolve);
      });
    }
    
    pool.count++;
    this.currentTotal++;
    return this._getConnection();
  }
}

// 2. Cache Agressivo de Tenant Data
async function getTenant(slugOrId) {
  return cache.getOrSet(`tenant:${slugOrId}`, async () => {
    const tenant = await Tenant.findOne({
      where: { [Op.or]: [{ id: slugOrId }, { slug: slugOrId }] },
      include: [{ model: Subscription, include: [Plan] }],
    });
    return tenant;
  }, 300); // 5 min cache
}

// 3. Bulk Operations para Jobs
async function processAppointmentReminders() {
  const appointments = await Appointment.findAll({
    where: {
      dateTime: {
        [Op.between]: [
          moment().add(23, 'hours').toDate(),
          moment().add(25, 'hours').toDate(),
        ],
      },
      reminderSent: false,
    },
    limit: 1000, // Processar em batches
  });
  
  // Agrupar por tenant para otimizar
  const byTenant = groupBy(appointments, 'tenantId');
  
  for (const [tenantId, tenantApps] of Object.entries(byTenant)) {
    await queue.addBulk('send-reminder', tenantApps.map(a => ({
      appointmentId: a.id,
      _context: { tenantId },
    })));
  }
}
```

---

## 11. Migração para Microsserviços

### Critérios de Extração

| Módulo | Prioridade | Justificativa |
|--------|------------|---------------|
| Notifications | Alta | Stateless, alta carga, independente |
| Billing | Alta | Isolamento de responsabilidade financeira |
| Reports | Média | Queries pesadas, pode ter DB separado |
| Appointments | Média | Core business, mas acoplado |
| Tenants | Baixa | Baixa carga, crítico para todos |

### Estratégia: Strangler Fig Pattern

```
FASE 1: Identificar Boundaries
┌──────────────────────────────────────────────────────────┐
│                      MONOLITO                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Tenants  │ │Appoint.  │ │ Billing  │ │  Notif   │    │
│  │          │◄┼─────────►│◄┼─────────►│◄┼─────────►│    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
└──────────────────────────────────────────────────────────┘

FASE 2: Extrair Notifications (primeiro candidato)
┌──────────────────────────────────────────────────────────┐
│                      MONOLITO                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ Tenants  │ │Appoint.  │ │ Billing  │───────┐         │
│  └──────────┘ └──────────┘ └──────────┘       │         │
└───────────────────────────────────────────────┼─────────┘
                                                │ (Queue)
                                                ▼
                                        ┌──────────────┐
                                        │ Notification │
                                        │   Service    │
                                        └──────────────┘
```

### Comunicação entre Serviços

```javascript
// infrastructure/messaging/EventBus.js
class EventBus {
  constructor(queue) {
    this.queue = queue;
    this.handlers = new Map();
  }
  
  async publish(event) {
    const ctx = RequestContext.current();
    
    await this.queue.add('events', {
      type: event.constructor.name,
      payload: event.toJSON(),
      metadata: {
        correlationId: ctx.correlationId,
        tenantId: ctx.tenant?.id,
        userId: ctx.user?.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Eventos de domínio
class AppointmentCreatedEvent {
  constructor(appointment) {
    this.id = uuidv4();
    this.appointmentId = appointment.id;
    this.tenantId = appointment.tenantId;
    this.clientId = appointment.clientId;
    this.dateTime = appointment.dateTime;
  }
}
```

---

## 12. Billing com Stripe Connect

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         BEAUTY HUB (Platform)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│   Tenant A    │     │   Tenant B    │     │   Tenant C    │
│  (Connected)  │     │  (Connected)  │     │  (Connected)  │
└───────────────┘     └───────────────┘     └───────────────┘

Fluxos:
1. Subscription → Platform recebe mensalidade
2. Appointment Payment → Split para tenant (destination charge)
3. Platform Fee → 5% retenção automática
```

### Implementação

```javascript
// infrastructure/payment/StripeConnectService.js
class StripeConnectService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  
  async createConnectedAccount(tenant, owner) {
    const account = await this.stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: owner.email,
      business_profile: {
        mcc: '7230', // Beauty shops
        url: `https://${tenant.slug}.beautyhub.com`,
      },
      metadata: { tenantId: tenant.id },
    });
    
    await Tenant.update(
      { stripeAccountId: account.id },
      { where: { id: tenant.id } }
    );
    
    return account;
  }
  
  async processAppointmentPayment(appointment, paymentMethodId) {
    const tenant = await Tenant.findByPk(appointment.tenantId);
    const amount = Math.round(appointment.totalPrice * 100);
    const platformFee = Math.round(amount * 0.05); // 5%
    
    return this.stripe.paymentIntents.create({
      amount,
      currency: 'brl',
      payment_method: paymentMethodId,
      confirm: true,
      application_fee_amount: platformFee,
      transfer_data: { destination: tenant.stripeAccountId },
      metadata: {
        appointmentId: appointment.id,
        tenantId: appointment.tenantId,
      },
    });
  }
}
```

---

## 13. Split Payment

### Cenários

```
CENÁRIO 1: Simples (Cliente → Tenant)
R$ 100 → Tenant R$ 95 (95%) + Platform R$ 5 (5%)

CENÁRIO 2: Com Profissional (comissão 50%)
R$ 100 → Professional R$ 50 + Tenant R$ 45 + Platform R$ 5
```

### Implementação

```javascript
// infrastructure/payment/SplitPaymentService.js
class SplitPaymentService {
  calculateSplits(appointment, tenant) {
    const total = Math.round(appointment.totalPrice * 100);
    const platformFee = Math.round(total * 0.05);
    
    let professionalAmount = 0;
    if (appointment.professional?.commissionRate) {
      professionalAmount = Math.round(
        (total - platformFee) * (appointment.professional.commissionRate / 100)
      );
    }
    
    const tenantAmount = total - platformFee - professionalAmount;
    
    return {
      total: total / 100,
      platform: platformFee / 100,
      professional: professionalAmount / 100,
      tenant: tenantAmount / 100,
    };
  }
}
```

---

## 14. Integração Frontend ↔ Backend

### HTTP Client

```javascript
// src/core/http.js
const API_BASE = '/api/v1';

class HttpClient {
  constructor() {
    this.token = localStorage.getItem('bh_token');
    this.tenantId = localStorage.getItem('bh_tenant_id');
  }
  
  async request(method, path, data = null) {
    const headers = { 'Content-Type': 'application/json' };
    
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.tenantId) headers['X-Tenant-ID'] = this.tenantId;
    
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : null,
    });
    
    if (response.status === 401) {
      this.clearAuth();
      window.location.href = '/login';
    }
    
    return response.json();
  }
  
  get(path) { return this.request('GET', path); }
  post(path, data) { return this.request('POST', path, data); }
  put(path, data) { return this.request('PUT', path, data); }
  delete(path) { return this.request('DELETE', path); }
}

export const http = new HttpClient();
```

---

## 15. Checklist de Produção

### Segurança
- [ ] JWT_SECRET com 256+ bits
- [ ] CORS para domínios específicos
- [ ] Rate limiting ativo
- [ ] Helmet + CSP configurado
- [ ] HTTPS forçado

### Database
- [ ] Backups automáticos
- [ ] Índices otimizados
- [ ] Connection pooling
- [ ] Statement timeout

### Observabilidade
- [ ] Logs JSON estruturados
- [ ] Métricas Prometheus
- [ ] Alertas configurados
- [ ] Health checks

### Billing/Stripe
- [ ] Webhooks verificados
- [ ] Idempotency keys
- [ ] Reconciliação automática

### Multi-Tenant
- [ ] Tenant isolation testada
- [ ] Rate limits por plano
- [ ] LGPD compliance

### SLOs

| Métrica | Target |
|---------|--------|
| Availability | 99.9% |
| Response p50 | < 100ms |
| Response p99 | < 500ms |
| Error Rate | < 0.1% |

---

## Apêndice: Estimativa de Esforço

| Item | Sprints |
|------|---------|
| Clean Architecture refactor | 3-4 |
| RequestContext + Correlation | 1 |
| DTOs + Mappers + ApiResponse | 2 |
| Redis + Cache | 1 |
| BullMQ + Queue | 1-2 |
| Stripe Connect | 2-3 |
| Split Payment | 2 |
| Observability | 1.5 |
| Frontend integration | 2 |
| **TOTAL** | **~18-20** |

---

## ADRs (Decisões Arquiteturais)

### ADR-001: Single DB + Shared Schema
**Decisão**: tenant_id em todas as tabelas  
**Justificativa**: Simples, escala até 10k tenants, fácil migrar para sharding

### ADR-002: Stripe Connect Express
**Decisão**: Connected accounts tipo Express  
**Justificativa**: Controle sobre UX, compliance PCI, split automático

### ADR-003: Monolito Modular
**Decisão**: Módulos com boundaries claros, event-driven interno  
**Justificativa**: Velocidade de dev, permite extração futura

---

*Documento: Fevereiro 2026*  
*Próxima revisão: Agosto 2026*

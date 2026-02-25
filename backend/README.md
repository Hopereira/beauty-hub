# Beauty Hub - Backend API

API RESTful para o sistema Beauty Hub, construída com Node.js, Express e PostgreSQL.

## Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **ORM**: Sequelize 6
- **Database**: PostgreSQL 15
- **Auth**: JWT (access + refresh tokens) + bcrypt
- **Validation**: Joi
- **Logging**: Winston

## Quick Start (Docker)

```bash
# Na raiz do projeto
cp .env.example .env
docker-compose up -d
```

Serviços:
- **Nginx** (frontend): http://localhost:8080
- **API**: http://localhost:5001
- **PostgreSQL**: localhost:5433

## Quick Start (Local)

```bash
cd backend
npm install
cp ../.env.example ../.env  # ajustar DB_HOST=localhost

# Rodar migrations e seeds
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# Iniciar servidor
npm run dev
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm start` | Inicia em produção |
| `npm run dev` | Inicia com hot-reload (--watch) |
| `npm run migrate` | Executa migrations |
| `npm run migrate:undo` | Reverte todas as migrations |
| `npm run seed` | Popula banco com dados de teste |
| `npm run seed:undo` | Remove dados de seed |
| `npm run reset` | Undo + migrate + seed |
| `npm test` | Executa testes |

## Credenciais de Teste

| Role | Email | Senha |
|------|-------|-------|
| MASTER | master@master.com | 123456 |
| ADMIN | admin@admin.com | 123456 |
| PROFESSIONAL | prof@prof.com | 123456 |

## Endpoints (50+)

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `GET /api/auth/me`

### Profile
- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/password`

### Users (MASTER/ADMIN)
- `GET /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `PUT /api/users/:id/password`
- `PUT /api/users/:id/role`

### Establishments (MASTER/ADMIN)
- `GET /api/establishments`
- `GET /api/establishments/:id`
- `POST /api/establishments`
- `PUT /api/establishments/:id`
- `DELETE /api/establishments/:id`
- `GET /api/establishments/:id/professionals`
- `GET /api/establishments/:id/services`

### Professionals
- `GET /api/professionals`
- `GET /api/professionals/:id`
- `POST /api/professionals`
- `PUT /api/professionals/:id`
- `DELETE /api/professionals/:id`
- `GET /api/professionals/:id/appointments`

### Services
- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

### Clients
- `GET /api/clients`
- `GET /api/clients/:id`
- `POST /api/clients`
- `PUT /api/clients/:id`
- `DELETE /api/clients/:id`
- `GET /api/clients/:id/appointments`

### Appointments
- `GET /api/appointments`
- `GET /api/appointments/calendar`
- `GET /api/appointments/:id`
- `POST /api/appointments`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`

### Financial
- `GET /api/financial/summary`
- `GET /api/financial/entries`
- `GET /api/financial/entries/:id`
- `POST /api/financial/entries`
- `PUT /api/financial/entries/:id`
- `DELETE /api/financial/entries/:id`
- `GET /api/financial/exits`
- `GET /api/financial/exits/:id`
- `POST /api/financial/exits`
- `PUT /api/financial/exits/:id`
- `DELETE /api/financial/exits/:id`
- `GET /api/financial/payment-methods`
- `POST /api/financial/payment-methods`
- `PUT /api/financial/payment-methods/:id`
- `DELETE /api/financial/payment-methods/:id`

### Notifications
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `DELETE /api/notifications/:id`

### Health
- `GET /api/health`

### Billing (SaaS)
- `GET /api/billing/plans` - Lista planos públicos
- `GET /api/billing/plans/:slug` - Detalhes do plano
- `GET /api/billing/subscription` - Assinatura atual do tenant
- `POST /api/billing/subscription/activate` - Ativar com cartão
- `POST /api/billing/subscription/pix` - Gerar pagamento PIX
- `PUT /api/billing/subscription/plan` - Trocar plano
- `POST /api/billing/subscription/cancel` - Cancelar assinatura
- `GET /api/billing/invoices` - Listar faturas
- `GET /api/billing/invoices/:id` - Detalhes da fatura

### Billing MASTER (Admin)
- `GET /api/master/plans` - Todos os planos
- `POST /api/master/plans` - Criar plano
- `PUT /api/master/plans/:id` - Atualizar plano
- `PATCH /api/master/plans/:id/activate` - Ativar plano
- `PATCH /api/master/plans/:id/deactivate` - Desativar plano
- `GET /api/master/subscriptions` - Todas assinaturas
- `GET /api/master/subscriptions/:id` - Detalhes assinatura
- `POST /api/master/subscriptions/:id/suspend` - Suspender
- `GET /api/master/mrr` - Monthly Recurring Revenue
- `GET /api/master/revenue-summary` - Resumo de receita
- `GET /api/master/invoices` - Todas faturas
- `GET /api/master/billing/audit-logs` - Logs de auditoria

### Webhooks
- `POST /api/webhooks/billing/:provider` - Stripe, MercadoPago, etc.

## Planos de Assinatura

| Plano | Mensal | Anual (-15%) | Trial | Profissionais |
|-------|--------|--------------|-------|---------------|
| **Starter** | R$ 0 | R$ 0 | 30 dias | 1 |
| **Growth** | R$ 29,90 | R$ 305 | 7 dias | 3 |
| **Professional** | R$ 59,90 | R$ 611 | 7 dias | 10 |
| **Enterprise** | R$ 99,90 | R$ 1.019 | 14 dias | ∞ |

## Variáveis de Ambiente (Billing)

```env
# Payment Provider (mock para dev, stripe para prod)
PAYMENT_PROVIDER=mock

# Stripe (produção)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Billing defaults
BILLING_GRACE_PERIOD_DAYS=7
BILLING_SUSPENSION_DAYS=30
BILLING_DEFAULT_TRIAL_DAYS=30
```

## Documentação

- [MULTI_TENANT_ARCHITECTURE.md](../docs/MULTI_TENANT_ARCHITECTURE.md) - Arquitetura multi-tenant
- [ENTERPRISE_ARCHITECTURE.md](../docs/ENTERPRISE_ARCHITECTURE.md) - Arquitetura enterprise
- [BILLING_SYSTEM.md](src/modules/billing/BILLING_SYSTEM.md) - Sistema de billing completo

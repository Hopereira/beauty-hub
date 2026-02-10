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

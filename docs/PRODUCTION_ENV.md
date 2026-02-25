# Ambiente de Produção - BeautyHub

> Guia completo para configurar e validar o ambiente production-like local.

---

## Sumário

1. [Arquivos de Configuração](#1-arquivos-de-configuração)
2. [Variáveis de Ambiente](#2-variáveis-de-ambiente)
3. [Comandos de Setup](#3-comandos-de-setup)
4. [Comandos de Validação](#4-comandos-de-validação)
5. [Checklist de Produção](#5-checklist-de-produção)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Arquivos de Configuração

### Estrutura

```
beautyhub/
├── docker-compose.yml          # Desenvolvimento
├── docker-compose.prod.yml     # Produção-like
├── .env                        # Variáveis (gitignored)
├── .env.example                # Template
│
├── nginx/
│   ├── nginx.conf              # Dev config
│   └── nginx.prod.conf         # Prod config (rate limit, security headers)
│
├── postgres/
│   ├── postgresql.conf         # Tuned for production
│   └── init/
│       └── 01_extensions.sql   # Extensions (uuid-ossp)
│
└── backend/
    ├── Dockerfile              # Dev (with nodemon)
    └── Dockerfile.prod         # Prod (multi-stage, non-root)
```

### Diferenças Dev vs Prod

| Aspecto | Development | Production |
|---------|-------------|------------|
| NODE_ENV | development | production |
| Dockerfile | Single stage | Multi-stage |
| User | root | nodejs (1001) |
| Volumes | Mounted source | Copied |
| Rate Limit | 200 req/15min | 100 req/15min |
| JWT Expiry | 1h | 15m |
| Logging | Console | JSON structured |
| Nginx | Basic proxy | Security headers, rate limit |
| PostgreSQL | Defaults | Tuned (pools, timeouts) |

---

## 2. Variáveis de Ambiente

### Obrigatórias (Produção)

```env
# ═══════════════════════════════════════════════════════════════════
# OBRIGATÓRIAS - Devem ser definidas para produção
# ═══════════════════════════════════════════════════════════════════

# Database
DB_NAME=beautyhub_db
DB_USER=beautyhub_user
DB_PASSWORD=<SENHA_FORTE_32_CHARS>

# JWT (gerar com: openssl rand -base64 64)
JWT_SECRET=<JWT_SECRET_64_CHARS>
JWT_REFRESH_SECRET=<JWT_REFRESH_SECRET_64_CHARS>

# CORS (domínio real)
CORS_ORIGIN=https://beautyhub.com

# Stripe (produção)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Opcionais com Defaults

```env
# ═══════════════════════════════════════════════════════════════════
# OPCIONAIS - Têm valores padrão seguros
# ═══════════════════════════════════════════════════════════════════

# Portas
NGINX_PORT=8080
BACKEND_PORT=5001
DB_PORT=5433

# JWT Expiração
JWT_ACCESS_TOKEN_EXPIRATION=15m      # Padrão prod: 15 minutos
JWT_REFRESH_TOKEN_EXPIRATION=7d      # Padrão: 7 dias

# Database Pool
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_POOL_ACQUIRE=60000
DB_POOL_IDLE=10000

# Rate Limit
RATE_LIMIT_WINDOW_MS=900000          # 15 minutos
RATE_LIMIT_MAX=100                   # 100 requests

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Billing
PAYMENT_PROVIDER=stripe              # mock para testes
```

### Geração de Secrets

```bash
# JWT Secret (64 bytes base64)
openssl rand -base64 64 | tr -d '\n'

# JWT Refresh Secret
openssl rand -base64 64 | tr -d '\n'

# Database Password (32 chars)
openssl rand -base64 32 | tr -d '\n'
```

---

## 3. Comandos de Setup

### 3.1 Setup Inicial

```bash
# 1. Copiar e configurar variáveis
cp .env.example .env
# Editar .env com valores de produção

# 2. Build da imagem de produção
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Subir serviços
docker-compose -f docker-compose.prod.yml up -d

# 4. Aguardar healthchecks
docker-compose -f docker-compose.prod.yml ps

# 5. Executar migrations
docker exec beautyhub_backend npx sequelize-cli db:migrate

# 6. Executar seeds (se necessário)
docker exec beautyhub_backend node -e "
const seeder = require('./src/modules/billing/seeders/003_seed_official_plans.js');
const { sequelize } = require('./src/shared/database');
seeder.up(sequelize.getQueryInterface(), sequelize.constructor)
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
"
```

### 3.2 Rebuild Completo

```bash
# Parar tudo
docker-compose -f docker-compose.prod.yml down

# Remover volumes (CUIDADO: perde dados!)
docker-compose -f docker-compose.prod.yml down -v

# Rebuild
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### 3.3 Atualização de Código

```bash
# Rebuild apenas backend
docker-compose -f docker-compose.prod.yml build backend --no-cache
docker-compose -f docker-compose.prod.yml up -d backend

# Executar novas migrations
docker exec beautyhub_backend npx sequelize-cli db:migrate
```

---

## 4. Comandos de Validação

### 4.1 Health Checks

```bash
# Verificar status dos containers
docker-compose -f docker-compose.prod.yml ps

# Health do backend via API
curl -s http://localhost:8080/api/health | jq

# Health do PostgreSQL
docker exec beautyhub_database pg_isready -U beautyhub_user -d beautyhub_db

# Conexões ativas no PostgreSQL
docker exec beautyhub_database psql -U beautyhub_user -d beautyhub_db -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### 4.2 Logs

```bash
# Logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs -f

# Logs apenas do backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Logs do Nginx
docker-compose -f docker-compose.prod.yml logs -f nginx

# Logs do PostgreSQL
docker-compose -f docker-compose.prod.yml logs -f database

# Últimas 100 linhas do backend
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 4.3 Testes de API

```bash
# Health
curl -s http://localhost:8080/api/health | jq

# Login (obter token)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@beautyhub.com","password":"123456"}' | jq -r '.data.accessToken')

echo $TOKEN

# Verificar autenticação
curl -s http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Listar planos de assinatura
curl -s http://localhost:8080/api/billing/plans | jq

# Testar rate limit (deve bloquear após 100 requests)
for i in {1..110}; do
  echo -n "$i: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health
  echo
done
```

### 4.4 Multi-Tenant

```bash
# Via header X-Tenant-Slug
curl -s http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: beleza-pura" \
  -d '{"email":"owner@belezapura.com","password":"123456"}' | jq

# Via subdomain (requer DNS/hosts config)
# Adicionar em /etc/hosts ou C:\Windows\System32\drivers\etc\hosts:
# 127.0.0.1 beleza-pura.beautyhub.local

curl -s http://beleza-pura.beautyhub.local:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@belezapura.com","password":"123456"}' | jq
```

### 4.5 Billing Flow

```bash
# 1. Login como OWNER do tenant
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Slug: beleza-pura" \
  -d '{"email":"owner@belezapura.com","password":"123456"}' | jq -r '.data.accessToken')

# 2. Ver assinatura atual
curl -s http://localhost:8080/api/billing/subscription \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Slug: beleza-pura" | jq

# 3. Ver planos disponíveis
curl -s http://localhost:8080/api/billing/plans | jq

# 4. Ver faturas
curl -s http://localhost:8080/api/billing/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Slug: beleza-pura" | jq
```

---

## 5. Checklist de Produção

### 5.1 Segurança

```
□ JWT_SECRET com 64+ caracteres aleatórios
□ JWT_REFRESH_SECRET diferente do JWT_SECRET
□ DB_PASSWORD com 32+ caracteres
□ CORS_ORIGIN restrito ao domínio real
□ STRIPE_SECRET_KEY é sk_live_ (não sk_test_)
□ Helmet habilitado (verificar headers)
□ Rate limiting funcionando
□ HTTPS configurado (em produção real)
```

### 5.2 Performance

```
□ NODE_ENV=production
□ Dockerfile.prod com multi-stage build
□ PostgreSQL com postgresql.conf otimizado
□ Connection pooling configurado (max=20, min=5)
□ Nginx com gzip habilitado
□ Static assets com cache de 1 ano
□ Logs em formato JSON
```

### 5.3 Resiliência

```
□ Healthchecks configurados em todos os serviços
□ restart: unless-stopped em todos os serviços
□ Volumes persistentes para database
□ Logging com rotação (max-size, max-file)
□ Resource limits configurados (memory)
□ Timeouts configurados (statement_timeout)
```

### 5.4 Observabilidade

```
□ Logs acessíveis via docker logs
□ Health endpoint retornando uptime
□ Nginx access logs em JSON
□ PostgreSQL slow query logging (>1s)
□ Request IDs propagados (X-Request-ID)
```

### 5.5 Database

```
□ Migration executada com sucesso
□ Seeds executados (planos oficiais)
□ Índices em tenant_id (verificar explain)
□ Backup automatizado configurado
□ pg_stat_statements habilitado
```

---

## 6. Troubleshooting

### Container não inicia

```bash
# Ver logs de erro
docker-compose -f docker-compose.prod.yml logs backend

# Verificar se porta está em uso
netstat -an | findstr 5001

# Forçar rebuild
docker-compose -f docker-compose.prod.yml build --no-cache backend
```

### Database connection refused

```bash
# Verificar se postgres está healthy
docker-compose -f docker-compose.prod.yml ps database

# Verificar logs do postgres
docker-compose -f docker-compose.prod.yml logs database

# Testar conexão manual
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db
```

### Migration falhou

```bash
# Ver status das migrations
docker exec beautyhub_backend npx sequelize-cli db:migrate:status

# Desfazer última migration
docker exec beautyhub_backend npx sequelize-cli db:migrate:undo

# Rodar novamente
docker exec beautyhub_backend npx sequelize-cli db:migrate
```

### Rate limit bloqueando

```bash
# Verificar headers de rate limit
curl -I http://localhost:8080/api/health

# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1234567890

# Aguardar window expirar (15 min) ou reiniciar backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Webhook não recebido

```bash
# Verificar se rota existe
curl -X POST http://localhost:8080/api/webhooks/billing/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs do backend
docker-compose -f docker-compose.prod.yml logs -f backend | grep webhook

# Testar com Stripe CLI
stripe listen --forward-to localhost:8080/api/webhooks/billing/stripe
```

### Reset completo do ambiente

```bash
# CUIDADO: Isso apaga todos os dados!

# 1. Parar e remover containers
docker-compose -f docker-compose.prod.yml down

# 2. Remover volumes
docker volume rm beautyhub_db_data beautyhub_nginx_logs

# 3. Remover imagens
docker rmi beautyhub_backend:latest

# 4. Rebuild e iniciar
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 5. Migrations e seeds
docker exec beautyhub_backend npx sequelize-cli db:migrate
docker exec beautyhub_backend npx sequelize-cli db:seed:all
```

---

## Quick Reference

```bash
# ═══════════════════════════════════════════════════════════════════
# COMANDOS RÁPIDOS
# ═══════════════════════════════════════════════════════════════════

# Subir ambiente
docker-compose -f docker-compose.prod.yml up -d

# Ver status
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Parar ambiente
docker-compose -f docker-compose.prod.yml down

# Health check
curl -s http://localhost:8080/api/health | jq

# Executar migration
docker exec beautyhub_backend npx sequelize-cli db:migrate

# Entrar no container
docker exec -it beautyhub_backend sh
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db
```

---

*Documentação atualizada em Fevereiro 2026*

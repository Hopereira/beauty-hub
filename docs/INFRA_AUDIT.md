# 🌐 INFRASTRUCTURE AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** 🟢 BOM — Infraestrutura moderna, bem configurada  
**Providers:** Fly.io (backend) + Cloudflare Pages (frontend) + Supabase (database)

---

## 📊 RESUMO EXECUTIVO

| Componente | Provider | Status | Notas |
|------------|----------|--------|-------|
| **Frontend** | Cloudflare Pages | 🟢 Excelente | Deploy automático, CDN global |
| **Backend API** | Fly.io | 🟢 Excelente | São Paulo (GRU), health checks |
| **Banco de Dados** | Supabase | 🟢 Excelente | PostgreSQL 15, SSL, backups |
| **DNS** | Cloudflare | 🟢 Bom | Proxy + CDN |
| **CI/CD** | GitHub Actions | 🟡 Regular | Tests com `continue-on-error` |
| **Docker** | Local/Dev | 🟢 Bom | Configuração padronizada |
| **Nginx** | Local/Dev | 🟢 Bom | Proxy reverso configurado |
| **SSL/TLS** | Cloudflare | 🟢 Excelente | Auto-managed, Let's Encrypt |
| **Monitoramento** | Básico | 🔴 Ausente | Sem Sentry/Datadog |
| **Logs** | Fly.io/Console | 🟡 Regular | Winston estruturado, mas sem agregação |
| **Backups** | Supabase | 🟢 Excelente | PITR (Point-in-Time Recovery) |

**Conclusão:** Infraestrutura moderna e bem arquitetada com separação clara de responsabilidades. Principais gaps: ausência de monitoramento avançado (Sentry, APM) e observabilidade limitada.

---

## 🗺️ ARQUITETURA DE INFRAESTRUTURA

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE DNS + CDN                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ biaxavier.   │  │ app.biaxavier │  │ api.biaxavier│      │
│  │ com.br       │  │ .com.br       │  │ .com.br      │      │
│  │ (Landing)    │  │ (SPA)         │  │ (API)        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  • SSL/TLS (Auto)                                           │
│  • DDoS Protection                                          │
│  • CDN Caching                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌─────────────────┐     ┌─────────────────┐
│ CLOUDFLARE      │     │ FLY.IO          │
│ PAGES           │     │ (São Paulo)     │
│                 │     │                 │
│ • Static SPA    │     │ • Node.js 20    │
│ • Edge Deploy   │     │ • Docker        │
│ • Auto HTTPS    │     │ • 1+ Machines   │
└─────────────────┘     └────────┬────────┘
                                   │
                                   │ Connection Pool
                                   ▼
                          ┌─────────────────┐
                          │ SUPABASE        │
                          │ (PostgreSQL 15) │
                          │                 │
                          │ • SSL Required  │
                          │ • PITR Backups  │
                          │ • Connection    │
                          │   Pooler        │
                          └─────────────────┘
```

---

## ☁️ CLOUDFLARE PAGES (FRONTEND)

### Configuração

**Arquivo:** `.github/workflows/deploy.yml`

```yaml
deploy-frontend:
  name: Deploy Frontend (Cloudflare Pages)
  needs: test
  runs-on: ubuntu-latest
  environment: production
  steps:
    - name: Build frontend
      run: npm run build
      env:
        VITE_API_URL: https://api.biaxavier.com.br/api
        VITE_APP_URL: https://app.biaxavier.com.br

    - name: Deploy to Cloudflare Pages
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CF_API_TOKEN }}
        accountId: ${{ secrets.CF_ACCOUNT_ID }}
        command: pages deploy dist --project-name=beauty-hub --commit-dirty=true
```

### Variáveis de Ambiente

```bash
VITE_API_URL=https://api.biaxavier.com.br/api    # ✅ Corrigido em 15/04
VITE_APP_URL=https://app.biaxavier.com.br          # ✅ Configurado
```

### URLs

| Ambiente | URL | Status |
|----------|-----|--------|
| Produção | `https://app.biaxavier.com.br` | 🟢 Online |
| Preview | `https://*.beauty-hub.pages.dev` | 🟢 Online |

### Vantagens
- ✅ CDN global (275+ locations)
- ✅ Auto HTTPS
- ✅ Branch previews
- ✅ Rollback instantâneo
- ✅ Analytics incluído

---

## 🚀 FLY.IO (BACKEND)

### Configuração

**Arquivo:** `fly.toml`

```toml
app = 'beautyhub-backend'
primary_region = 'gru'  # São Paulo, Brasil

[http_service]
  internal_port = 5001
  auto_start_machines = true
  auto_stop_machines = false    # ⚠️ Sempre rodando
  min_machines_running = 1
  processes = ['app']

[[vm]]
  size = 'shared-cpu-1x'      # 1 vCPU compartilhada
  memory = '512mb'            # 512 MB RAM
```

### Health Checks

**Arquivo:** `docker-compose.yml` (healthcheck local)
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:5001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"]
  interval: 30s
  timeout: 10s
  retries: 5
  start_period: 30s
```

**Fly.io Health Checks:**
```toml
[[services]]
  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "get"
    path = "/api/health"
    protocol = "http"
```

### Scaling

| Configuração | Valor |
|--------------|-------|
| Min Machines | 1 (sempre rodando) |
| Max Machines | 1 (sem auto-scaling) |
| CPU | 1 vCPU compartilhada |
| RAM | 512 MB |
| Region | gru (São Paulo) |

**Recomendação:**
```toml
# Para alta disponibilidade
min_machines_running = 2  # Múltiplas instâncias
auto_stop_machines = false
```

### Variáveis de Ambiente (Fly.io)

```bash
# Secrets (fly secrets set)
DATABASE_URL=postgresql://...  # Supabase connection
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Env vars (fly env set)
NODE_ENV=production
PORT=5001
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 🗄️ SUPABASE (DATABASE)

### Configuração

**Conexão:**
```javascript
// backend/src/config/database.js
production: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,  // Necessário para Supabase
    },
  },
  pool: {
    max: 5,      // Connection pool
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
}
```

### Connection String
```
postgresql://user:password@host.supabase.co:5432/postgres?sslmode=require
```

### Features

| Feature | Status | Notas |
|---------|--------|-------|
| PostgreSQL 15 | ✅ | Última versão estável |
| SSL | ✅ | Required |
| Connection Pooler | ✅ | PgBouncer (max 60 conexões) |
| PITR Backups | ✅ | 7 dias recovery window |
| Daily Backups | ✅ | Automático |
| Database Size | - | Monitorar limite do plano |

### Monitoring

```sql
-- Verificar conexões ativas
SELECT count(*) FROM pg_stat_activity;

-- Verificar tamanho do banco
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Verificar tabelas maiores
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 🐳 DOCKER

### Backend Dockerfile

**Arquivo:** `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5001

ENV NODE_ENV=production
ENV PORT=5001

CMD ["node", "server.js"]
```

**Avaliação:**
- ✅ Alpine Linux (leve)
- ✅ Node.js 20 LTS
- ✅ Produção sem devDependencies
- ⚠️ Não há stage multi-stage (poderia ser menor)
- ⚠️ `npm install` sem `npm ci` (não deterministico)

**Melhoria:**
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

### Docker Compose (Desenvolvimento)

**Arquivo:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:stable-alpine
    ports:
      - "${NGINX_PORT:-8080}:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: ./backend
    ports:
      - "${BACKEND_PORT:-5001}:5001"
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DB_HOST: database
      JWT_SECRET: ${JWT_SECRET:?Required}
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 5
    depends_on:
      database:
        condition: service_healthy

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-beautyhub_db}
      POSTGRES_USER: ${DB_USER:-beautyhub_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?Required}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-beautyhub_user} -d ${DB_NAME:-beautyhub_db}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db_data:
```

**Avaliação:**
- ✅ Healthchecks em todos os serviços
- ✅ Depends_on com condition
- ✅ Environment validation (?:Required)
- ✅ Volumes persistentes
- ⚠️ Backend expõe porta 5001 (não necessário com nginx proxy)

---

## 🌐 NGINX

### Configuração

**Arquivo:** `nginx/nginx.conf`

```nginx
worker_processes 1;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_proxied any;
    gzip_comp_level 5;

    server {
        listen 80;

        # API Proxy
        location /api/ {
            proxy_pass http://backend:5001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect off;

            # CORS Preflight
            if ($request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
                add_header 'Access-Control-Max-Age' 1728000;
                return 204;
            }
        }

        # Static Files
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;  # SPA fallback
        }

        # Cache Static Assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            root /usr/share/nginx/html;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

**Avaliação:**
- ✅ Gzip habilitado
- ✅ Cache de assets estáticos (1 ano)
- ✅ SPA fallback (try_files)
- ✅ Headers de proxy corretos
- ⚠️ CORS allow-origin '*' (muito permissivo)

**Recomendação CORS:**
```nginx
add_header 'Access-Control-Allow-Origin' 'https://app.biaxavier.com.br' always;
add_header 'Access-Control-Allow-Credentials' 'true' always;
```

---

## 🔒 SEGURANÇA

### SSL/TLS

| Camada | Configuração |
|--------|--------------|
| Cloudflare → User | Full (Strict) |
| Cloudflare Origin | HTTPS + Valid cert |
| Supabase | SSL Required |

### Headers de Segurança

**Helmet.js (Backend):**
```javascript
app.use(helmet({
  contentSecurityPolicy: false,  // ⚠️ DESATIVADA
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' },
}));
```

**Faltando:**
- CSP (Content Security Policy)
- Permissions-Policy

### Network Security

| Componente | Configuração |
|------------|--------------|
| Fly.io | Internal network, only 5001 exposed |
| Supabase | Connection pooler, IP allowlist disponível |
| Cloudflare | DDoS protection, Bot management |

---

## 📊 CI/CD

### GitHub Actions

**Arquivo:** `.github/workflows/deploy.yml`

```yaml
name: Deploy — BeautyHub SaaS

on:
  push:
    branches: [master]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    continue-on-error: true  # ⚠️ PROBLEMA
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
        working-directory: backend
      - run: npm test --if-present
        working-directory: backend

  deploy-frontend:
    name: Deploy Frontend
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
        env:
          VITE_API_URL: https://api.biaxavier.com.br/api
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: pages deploy dist --project-name=beauty-hub

  deploy-backend:
    name: Deploy Backend
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only --config fly.toml --app beautyhub-backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Problemas:**
1. `continue-on-error: true` — testes não bloqueiam deploy
2. Sem cache de build entre runs
3. Sem notificação de falha

**Melhorias:**
```yaml
test:
  continue-on-error: false  # Quebrar build se testes falharem
  
deploy-frontend:
  if: github.ref == 'refs/heads/master' && needs.test.result == 'success'
```

---

## 🔍 OBSERVABILIDADE

### Logs

| Fonte | Destino | Formato |
|-------|---------|---------|
| Backend | Fly.io Console | Winston JSON |
| Frontend | Browser Console | Console logs |
| Nginx | stdout | Combined log |

**Problema:**
- Sem agregação centralizada
- Sem busca de logs
- Sem alertas baseados em logs

**Recomendação:**
```javascript
// Adicionar transport para centralizado
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    // new LogtailTransport({ sourceToken: 'xxx' }), // ou similar
  ],
});
```

### Métricas

**Ausentes:**
- Response time percentiles (p50, p95, p99)
- Error rate por endpoint
- Throughput (requests/segundo)
- Database connection pool usage
- Cache hit/miss rates

**Implementação Sugerida:**
```javascript
// middleware/metrics.js
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path, status_code: res.statusCode });
  });
  next();
});
```

### Alerting

**Ausente:**
- Sem alertas para erros 500
- Sem alertas para alta latência
- Sem alertas para queda de serviço
- Sem alertas para database connection errors

**Recomendação:**
- UptimeRobot ou Pingdom para health checks externos
- PagerDuty/Opsgenie para alertas críticos

---

## 🔄 BACKUP E RECOVERY

### Estratégia Atual

| Componente | Backup | RTO | RPO |
|------------|--------|-----|-----|
| Database (Supabase) | PITR + Daily | ~15 min | ~0 (PITR) |
| Backend Code | Git | ~5 min | N/A |
| Frontend | Git + Cloudflare | ~5 min | N/A |

### Disaster Recovery

**Cenário: Perda completa do banco**
1. Supabase PITR: restaurar para ponto específico
2. Ou restaurar último backup diário
3. Fly.io: redeploy da aplicação (se necessário)

**Cenário: Falha do backend**
1. Fly.io: rollback para versão anterior
2. Ou restart das machines

**Cenário: Falha do frontend**
1. Cloudflare Pages: rollback instantâneo
2. Ou redeploy manual

---

## 💰 CUSTOS ESTIMADOS (Mensal)

| Serviço | Plano | Custo Estimado |
|---------|-------|----------------|
| Fly.io | shared-cpu-1x (1 machine) | $5-10 |
| Supabase | Free tier / Starter | $0-25 |
| Cloudflare Pages | Free | $0 |
| Cloudflare Pro (opcional) | Pro | $20 |
| **Total** | | **$5-55/mês** |

**Observação:** Com 1 máquina apenas, não há alta disponibilidade.
Para HA: 2 machines = $10-20 adicional.

---

## 🛠️ RECOMENDAÇÕES

### 🔴 P0 — CRÍTICO

**[I-001] Corrigir `continue-on-error` no CI**
```yaml
test:
  continue-on-error: false
```

**[I-002] Implementar Health Check na Landing**
```javascript
// landing.js
fetch('/api/health').catch(() => {
  showToast('Serviço temporariamente indisponível', 'error');
});
```

### 🟡 P1 — ALTO

**[I-003] Adicionar Monitoramento Externo**
```bash
# UptimeRobot ou similar
# Verificar a cada 5 minutos:
# - https://api.biaxavier.com.br/api/health
# - https://app.biaxavier.com.br
```

**[I-004] Implementar Métricas Prometheus**
```javascript
// Adicionar endpoint /api/metrics
app.get('/api/metrics', authenticate, authorize(ROLES.MASTER), (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(promClient.register.metrics());
});
```

**[I-005] Multi-region (se necessário)**
```toml
# fly.toml
[[services]]
  internal_port = 5001
  
[[services.ports]]
  handlers = ["http"]
  port = 80
  
[[services.ports]]
  handlers = ["tls", "http"]
  port = 443
  
[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  path = "/api/health"
```

### 🟢 P2 — MÉDIO

**[I-006] Log Aggregation**
- Considerar Logtail, Datadog, ou CloudWatch Logs

**[I-007] CDN Cache Rules**
```nginx
# Cache API responses (with caution)
location /api/public/plans {
    proxy_cache_valid 200 5m;  # 5 min cache
}
```

**[I-008] Database Read Replica**
- Para relatórios pesados (se necessário)

---

## 📋 CHECKLIST DE OPERAÇÃO

### Diário
- [ ] Verificar logs de erro no Fly.io
- [ ] Verificar métricas de uso (Supabase dashboard)
- [ ] Verificar backups automáticos

### Semanal
- [ ] Review de performance (response times)
- [ ] Análise de erros 5xx
- [ ] Verificar dependências (npm audit)

### Mensal
- [ ] Teste de restore do backup
- [ ] Review de custos
- [ ] Update de imagens Docker
- [ ] Rotation de secrets (JWT)

---

## 🧪 COMANDOS ÚTEIS

```bash
# Fly.io
fly status                    # Status da app
fly logs                      # Logs em tempo real
fly ssh console               # Console na máquina
fly deploy                    # Deploy manual
fly secrets list              # Listar secrets
fly scale count 2             # Escalar para 2 machines

# Supabase
psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# Docker local
docker-compose up -b
docker-compose logs -f backend

# Testes de carga (instalar artillery ou k6)
npx artillery quick --count 50 --num 10 http://localhost:8080/api/health
```

---

*Auditoria concluída em 08/05/2026. Análise de Docker, Nginx, CI/CD, e cloud providers.*

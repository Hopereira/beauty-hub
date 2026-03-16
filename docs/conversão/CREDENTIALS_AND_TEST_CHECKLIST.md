# 🔐 CREDENCIAIS E CHECKLIST DE TESTES - BEAUTYHUB

**Data:** 27/02/2026  
**Ambiente:** Desenvolvimento/Staging  
**Versão:** 2.0.0 (Multi-Tenant Refactored)

---

## 📋 CREDENCIAIS DO BANCO DE DADOS

### 🔑 Usuários de Teste (Senha padrão: `123456`)

| Tipo | Email | Senha | Role | Tenant | Descrição |
|------|-------|-------|------|--------|-----------|
| **MASTER** | `master@beautyhub.com` | `123456` | MASTER | - | Administrador da plataforma SaaS |
| **OWNER** | `owner@belezapura.com` | `123456` | OWNER | beleza-pura | Proprietário do salão |
| **ADMIN** | `admin@belezapura.com` | `123456` | ADMIN | beleza-pura | Administrador do salão |
| **PROFESSIONAL** | `prof@belezapura.com` | `123456` | PROFESSIONAL | beleza-pura | Profissional (Ana - Extensão de Cílios) |

### 🏢 Tenant Demo

| Campo | Valor |
|-------|-------|
| **Nome** | Salão Beleza Pura |
| **Slug** | `beleza-pura` |
| **Email** | contato@belezapura.com |
| **Telefone** | 11987654321 |
| **CNPJ** | 12345678000190 |
| **Status** | ACTIVE |
| **Subscription** | Professional (Trial - 14 dias) |

### 🎨 Branding

```json
{
  "primaryColor": "#20B2AA",
  "secondaryColor": "#E91E63"
}
```

---

## 🌐 CONFIGURAÇÃO DE PORTAS

### ✅ Portas Configuradas (Docker Compose)

| Serviço | Porta Externa | Porta Interna | Container | Status |
|---------|---------------|---------------|-----------|--------|
| **Nginx** | `8080` | `80` | beautyhub_nginx | ✅ Correto |
| **Backend** | `5001` | `5001` | beautyhub_backend | ✅ Correto |
| **PostgreSQL** | `5433` | `5432` | beautyhub_database | ✅ Correto |

### 📍 URLs de Acesso

```bash
# Frontend (Nginx)
http://localhost:8080

# Backend API
http://localhost:5001

# Health Check
http://localhost:5001/api/health

# PostgreSQL (conexão externa)
postgresql://beautyhub_user:beautyhub_secret_2026@localhost:5433/beautyhub_db
```

### ⚠️ VALIDAÇÃO DAS PORTAS

**Baseado na imagem fornecida:**
- ✅ **Nginx:** Porta `8080:80` → **CORRETO**
- ✅ **Backend:** Porta `5001:5001` → **CORRETO**
- ✅ **PostgreSQL:** Porta `5433:5432` → **CORRETO**

**Todas as portas estão configuradas corretamente!**

---

## ✅ CHECKLIST DE TESTES FRONTEND

### 1️⃣ AUTENTICAÇÃO E AUTORIZAÇÃO

#### 1.1 Login - MASTER
- [ ] Acessar `http://localhost:8080`
- [ ] Fazer login com `master@beautyhub.com` / `123456`
- [ ] Verificar redirecionamento para dashboard MASTER
- [ ] Verificar menu com opções de administração SaaS
- [ ] Verificar acesso a `/api/master/tenants`
- [ ] Verificar acesso a `/api/master/billing/subscriptions`
- [ ] Fazer logout

**Endpoints esperados:**
```
GET /api/master/tenants
GET /api/master/billing/subscriptions
GET /api/master/billing/plans
POST /api/master/tenants
```

---

#### 1.2 Login - OWNER
- [ ] Fazer login com `owner@belezapura.com` / `123456`
- [ ] Verificar redirecionamento para dashboard OWNER
- [ ] Verificar tenant_id no JWT (deve ser do tenant beleza-pura)
- [ ] Verificar menu com opções de gestão do salão
- [ ] Verificar acesso a módulos OWNER:
  - [ ] Serviços (`/api/services`)
  - [ ] Clientes (`/api/clients`)
  - [ ] Agendamentos (`/api/appointments`)
  - [ ] Financeiro (`/api/financial`)
  - [ ] Relatórios (`/api/reports`)
  - [ ] Produtos (`/api/products`)
  - [ ] Fornecedores (`/api/suppliers`)
  - [ ] Compras (`/api/purchases`)
- [ ] Fazer logout

**Endpoints esperados:**
```
GET /api/services
GET /api/clients
GET /api/appointments
GET /api/financial/summary
GET /api/reports/revenue-by-period
GET /api/products
```

---

#### 1.3 Login - ADMIN
- [ ] Fazer login com `admin@belezapura.com` / `123456`
- [ ] Verificar redirecionamento para dashboard ADMIN
- [ ] Verificar tenant_id no JWT (deve ser do tenant beleza-pura)
- [ ] Verificar acesso aos mesmos módulos do OWNER
- [ ] Verificar que NÃO tem acesso a:
  - [ ] Configurações de billing
  - [ ] Cancelamento de subscription
- [ ] Fazer logout

---

#### 1.4 Login - PROFESSIONAL
- [ ] Fazer login com `prof@belezapura.com` / `123456`
- [ ] Verificar redirecionamento para dashboard PROFESSIONAL
- [ ] Verificar tenant_id no JWT (deve ser do tenant beleza-pura)
- [ ] Verificar acesso limitado:
  - [ ] Pode ver clientes (`/api/clients`)
  - [ ] Pode ver agendamentos (`/api/appointments`)
  - [ ] NÃO pode acessar financeiro
  - [ ] NÃO pode acessar relatórios
- [ ] Fazer logout

---

### 2️⃣ ISOLAMENTO MULTI-TENANT

#### 2.1 Teste de Isolamento de Dados
- [ ] Login como OWNER (beleza-pura)
- [ ] Criar um serviço: `POST /api/services`
  ```json
  {
    "name": "Corte de Cabelo",
    "price": 50.00,
    "duration_minutes": 60
  }
  ```
- [ ] Verificar que o serviço foi criado
- [ ] Copiar o ID do serviço
- [ ] Fazer logout
- [ ] **Criar outro tenant via MASTER** (se possível)
- [ ] Login como OWNER do novo tenant
- [ ] Tentar acessar o serviço do primeiro tenant: `GET /api/services/{id}`
- [ ] **ESPERADO:** HTTP 404 (não encontrado)
- [ ] Listar serviços: `GET /api/services`
- [ ] **ESPERADO:** Lista vazia (não vê serviços de outros tenants)

---

#### 2.2 Teste de Isolamento em Queries
- [ ] Login como OWNER (beleza-pura)
- [ ] Criar 3 clientes
- [ ] Listar clientes: `GET /api/clients?page=1&limit=10`
- [ ] Verificar que retorna apenas os 3 clientes criados
- [ ] Verificar estrutura de paginação:
  ```json
  {
    "success": true,
    "data": [...],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
  ```

---

### 3️⃣ SUBSCRIPTION ENFORCEMENT

#### 3.1 Teste com Subscription ACTIVE
- [ ] Login como OWNER (beleza-pura)
- [ ] Verificar status da subscription: `GET /api/billing/subscription`
- [ ] **ESPERADO:** Status = TRIAL ou ACTIVE
- [ ] Criar produto: `POST /api/products`
- [ ] **ESPERADO:** HTTP 201 (sucesso)
- [ ] Listar produtos: `GET /api/products`
- [ ] **ESPERADO:** HTTP 200 (sucesso)

---

#### 3.2 Teste com Subscription SUSPENDED (Simulação)
**Nota:** Requer acesso MASTER para suspender subscription

- [ ] Login como MASTER
- [ ] Suspender subscription do tenant beleza-pura:
  ```
  PUT /api/master/billing/subscriptions/{id}
  { "status": "SUSPENDED" }
  ```
- [ ] Fazer logout
- [ ] Login como OWNER (beleza-pura)
- [ ] Tentar criar produto: `POST /api/products`
- [ ] **ESPERADO:** HTTP 402 Payment Required
- [ ] Tentar listar produtos: `GET /api/products`
- [ ] **ESPERADO:** HTTP 402 Payment Required
- [ ] **Restaurar subscription para ACTIVE via MASTER**

---

#### 3.3 Teste com Subscription PAST_DUE (Simulação)
- [ ] Login como MASTER
- [ ] Alterar subscription para PAST_DUE
- [ ] Login como OWNER (beleza-pura)
- [ ] Tentar criar produto: `POST /api/products`
- [ ] **ESPERADO:** HTTP 402 ou Read-only mode
- [ ] Listar produtos: `GET /api/products`
- [ ] **ESPERADO:** HTTP 200 (leitura permitida)
- [ ] **Restaurar subscription para ACTIVE via MASTER**

---

### 4️⃣ PAGINAÇÃO PADRONIZADA

#### 4.1 Teste de Paginação - Produtos
- [ ] Login como OWNER
- [ ] Criar 25 produtos (pode usar loop/script)
- [ ] Listar página 1: `GET /api/products?page=1&limit=10`
- [ ] Verificar resposta:
  ```json
  {
    "success": true,
    "data": [10 produtos],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "pages": 3
    }
  }
  ```
- [ ] Listar página 2: `GET /api/products?page=2&limit=10`
- [ ] Verificar que retorna produtos 11-20
- [ ] Listar página 3: `GET /api/products?page=3&limit=10`
- [ ] Verificar que retorna produtos 21-25

---

#### 4.2 Teste de Paginação - Clientes
- [ ] Criar 15 clientes
- [ ] Listar com limite 5: `GET /api/clients?page=1&limit=5`
- [ ] Verificar `pagination.pages = 3`
- [ ] Testar navegação entre páginas

---

#### 4.3 Teste de Paginação - Agendamentos
- [ ] Criar 20 agendamentos
- [ ] Listar: `GET /api/appointments?page=1&limit=10`
- [ ] Verificar paginação correta

---

### 5️⃣ VALIDAÇÃO JOI

#### 5.1 Teste de Validação - Criar Serviço
- [ ] Login como OWNER
- [ ] Tentar criar serviço SEM campos obrigatórios:
  ```json
  POST /api/services
  {}
  ```
- [ ] **ESPERADO:** HTTP 400 com erros de validação
- [ ] Tentar criar serviço com preço negativo:
  ```json
  {
    "name": "Teste",
    "price": -10,
    "duration_minutes": 60
  }
  ```
- [ ] **ESPERADO:** HTTP 400 (preço inválido)

---

#### 5.2 Teste de Validação - Criar Cliente
- [ ] Tentar criar cliente sem nome:
  ```json
  POST /api/clients
  {
    "email": "teste@teste.com"
  }
  ```
- [ ] **ESPERADO:** HTTP 400 (first_name e last_name obrigatórios)
- [ ] Tentar criar cliente com email inválido:
  ```json
  {
    "first_name": "João",
    "last_name": "Silva",
    "email": "email-invalido"
  }
  ```
- [ ] **ESPERADO:** HTTP 400 (email inválido)

---

#### 5.3 Teste de Validação - Criar Agendamento
- [ ] Tentar criar agendamento sem campos obrigatórios:
  ```json
  POST /api/appointments
  {}
  ```
- [ ] **ESPERADO:** HTTP 400
- [ ] Tentar criar com status inválido:
  ```json
  {
    "client_id": "uuid-valido",
    "professional_id": "uuid-valido",
    "service_id": "uuid-valido",
    "start_time": "2026-03-01T10:00:00Z",
    "status": "INVALID_STATUS"
  }
  ```
- [ ] **ESPERADO:** HTTP 400 (status deve ser PENDING, CONFIRMED, etc.)

---

### 6️⃣ FILTROS E BUSCAS

#### 6.1 Filtros de Produtos
- [ ] Criar produtos de diferentes categorias
- [ ] Filtrar por categoria: `GET /api/products?category=COSMETIC`
- [ ] Filtrar por busca: `GET /api/products?search=shampoo`
- [ ] Filtrar ativos: `GET /api/products?active=true`
- [ ] Filtrar estoque baixo: `GET /api/products?low_stock=true`

---

#### 6.2 Filtros de Clientes
- [ ] Buscar por nome: `GET /api/clients?search=Maria`
- [ ] Buscar por email: `GET /api/clients?search=maria@email.com`
- [ ] Buscar por telefone: `GET /api/clients?search=11999`

---

#### 6.3 Filtros de Agendamentos
- [ ] Filtrar por status: `GET /api/appointments?status=CONFIRMED`
- [ ] Filtrar por profissional: `GET /api/appointments?professional_id={id}`
- [ ] Filtrar por cliente: `GET /api/appointments?client_id={id}`
- [ ] Filtrar por data: `GET /api/appointments?date=2026-03-01`
- [ ] Filtrar por período: `GET /api/appointments?startDate=2026-03-01&endDate=2026-03-31`

---

### 7️⃣ RELATÓRIOS

#### 7.1 Receita por Período
- [ ] Login como OWNER
- [ ] Criar algumas entradas financeiras
- [ ] Acessar: `GET /api/reports/revenue-by-period?startDate=2026-03-01&endDate=2026-03-31`
- [ ] Verificar estrutura:
  ```json
  {
    "success": true,
    "data": [
      {
        "period": "2026-03-01",
        "total_revenue": 150.00,
        "transaction_count": 3
      }
    ],
    "meta": {
      "startDate": "2026-03-01",
      "endDate": "2026-03-31",
      "totalRevenue": 150.00,
      "totalTransactions": 3
    }
  }
  ```

---

#### 7.2 Comissão por Profissional
- [ ] Criar agendamentos com diferentes profissionais
- [ ] Acessar: `GET /api/reports/commission-by-professional?startDate=2026-03-01&endDate=2026-03-31`
- [ ] Verificar dados de comissão

---

#### 7.3 Top Serviços
- [ ] Acessar: `GET /api/reports/top-services?startDate=2026-03-01&endDate=2026-03-31&limit=10`
- [ ] Verificar ranking de serviços mais vendidos

---

#### 7.4 Resumo Financeiro
- [ ] Acessar: `GET /api/reports/financial-summary?startDate=2026-03-01&endDate=2026-03-31`
- [ ] Verificar:
  ```json
  {
    "success": true,
    "data": {
      "totalEntries": 500.00,
      "totalExits": 200.00,
      "netProfit": 300.00,
      "startDate": "2026-03-01",
      "endDate": "2026-03-31"
    }
  }
  ```

---

### 8️⃣ FINANCEIRO

#### 8.1 Resumo Financeiro
- [ ] Login como OWNER
- [ ] Acessar: `GET /api/financial/summary`
- [ ] Verificar estrutura com entradas, saídas e lucro

---

#### 8.2 Entradas Financeiras
- [ ] Criar entrada: `POST /api/financial/entries`
  ```json
  {
    "description": "Pagamento Cliente",
    "amount": 100.00,
    "entry_date": "2026-03-01",
    "status": "PAID",
    "payment_method_id": "{id}"
  }
  ```
- [ ] Listar entradas: `GET /api/financial/entries?page=1&limit=10`
- [ ] Filtrar por status: `GET /api/financial/entries?status=PAID`
- [ ] Filtrar por período: `GET /api/financial/entries?start_date=2026-03-01&end_date=2026-03-31`

---

#### 8.3 Saídas Financeiras
- [ ] Criar saída: `POST /api/financial/exits`
  ```json
  {
    "description": "Compra de Produtos",
    "amount": 50.00,
    "exit_date": "2026-03-01",
    "status": "PAID",
    "category": "SUPPLIES"
  }
  ```
- [ ] Listar saídas: `GET /api/financial/exits?page=1&limit=10`

---

#### 8.4 Métodos de Pagamento
- [ ] Criar método: `POST /api/financial/payment-methods`
  ```json
  {
    "name": "PIX",
    "active": true
  }
  ```
- [ ] Listar métodos: `GET /api/financial/payment-methods`
- [ ] Atualizar método: `PUT /api/financial/payment-methods/{id}`
- [ ] Deletar método: `DELETE /api/financial/payment-methods/{id}`

---

### 9️⃣ CRUD COMPLETO

#### 9.1 Serviços
- [ ] **CREATE:** `POST /api/services`
- [ ] **READ:** `GET /api/services/{id}`
- [ ] **UPDATE:** `PUT /api/services/{id}`
- [ ] **DELETE:** `DELETE /api/services/{id}`
- [ ] **LIST:** `GET /api/services?page=1&limit=10`

---

#### 9.2 Clientes
- [ ] **CREATE:** `POST /api/clients`
- [ ] **READ:** `GET /api/clients/{id}`
- [ ] **UPDATE:** `PUT /api/clients/{id}`
- [ ] **DELETE:** `DELETE /api/clients/{id}`
- [ ] **LIST:** `GET /api/clients?page=1&limit=10`
- [ ] **APPOINTMENTS:** `GET /api/clients/{id}/appointments`

---

#### 9.3 Agendamentos
- [ ] **CREATE:** `POST /api/appointments`
- [ ] **READ:** `GET /api/appointments/{id}`
- [ ] **UPDATE:** `PUT /api/appointments/{id}`
- [ ] **DELETE:** `DELETE /api/appointments/{id}`
- [ ] **LIST:** `GET /api/appointments?page=1&limit=10`
- [ ] **CALENDAR:** `GET /api/appointments/calendar?date=2026-03-01`

---

#### 9.4 Produtos
- [ ] **CREATE:** `POST /api/products`
- [ ] **READ:** `GET /api/products/{id}`
- [ ] **UPDATE:** `PUT /api/products/{id}`
- [ ] **DELETE:** `DELETE /api/products/{id}`
- [ ] **LIST:** `GET /api/products?page=1&limit=10`
- [ ] **ADJUST STOCK:** `POST /api/products/{id}/adjust-stock`

---

### 🔟 TESTES DE SEGURANÇA

#### 10.1 Tentativa de Acesso Sem Token
- [ ] Tentar acessar endpoint sem token JWT:
  ```
  GET /api/services
  ```
- [ ] **ESPERADO:** HTTP 401 Unauthorized

---

#### 10.2 Tentativa de Acesso com Token Inválido
- [ ] Usar token JWT inválido/expirado
- [ ] **ESPERADO:** HTTP 401 Unauthorized

---

#### 10.3 Tentativa de Acesso a Recurso de Outro Tenant
- [ ] Login como OWNER (tenant A)
- [ ] Criar serviço e copiar ID
- [ ] Login como OWNER (tenant B)
- [ ] Tentar acessar: `GET /api/services/{id-do-tenant-A}`
- [ ] **ESPERADO:** HTTP 404 Not Found

---

#### 10.4 Tentativa de Escalação de Privilégios
- [ ] Login como PROFESSIONAL
- [ ] Tentar acessar relatórios: `GET /api/reports/revenue-by-period`
- [ ] **ESPERADO:** HTTP 403 Forbidden
- [ ] Tentar acessar financeiro: `GET /api/financial/summary`
- [ ] **ESPERADO:** HTTP 403 Forbidden

---

## 📊 RESUMO DE ENDPOINTS POR MÓDULO

### OWNER Modules (Refatorados)

| Módulo | Endpoints | Paginação | Subscription | Isolamento |
|--------|-----------|-----------|--------------|------------|
| Services | 5 | ✅ | ✅ | ✅ tenant_id |
| Clients | 6 | ✅ | ✅ | ✅ tenant_id |
| Appointments | 6 | ✅ | ✅ | ✅ tenant_id |
| Financial | 15 | ✅ | ✅ | ✅ tenant_id |
| Reports | 5 | N/A | ✅ Read-only | ✅ tenant_id |
| Products | 6 | ✅ | ✅ | ✅ tenant_id |
| Suppliers | 5 | ✅ | ✅ | ✅ tenant_id |
| Purchases | 5 | ✅ | ✅ | ✅ tenant_id |

**Total:** 53 endpoints OWNER

---

## 🚀 COMANDOS ÚTEIS

### Iniciar Ambiente Docker

```bash
# Subir todos os containers
docker-compose up -d

# Verificar logs
docker-compose logs -f backend

# Verificar status
docker-compose ps

# Parar containers
docker-compose down
```

### Executar Seeds

```bash
# Entrar no container do backend
docker exec -it beautyhub_backend sh

# Executar migrations
npm run migrate

# Executar seeds
npm run seed

# Ou executar seed específico
npx sequelize-cli db:seed --seed 001_seed_subscription_plans.js
npx sequelize-cli db:seed --seed 002_seed_master_and_tenant.js
```

### Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db

# Listar usuários
SELECT email, role, tenant_id FROM users;

# Listar tenants
SELECT name, slug, status FROM tenants;

# Listar subscriptions
SELECT t.name, sp.name as plan, s.status 
FROM subscriptions s 
JOIN tenants t ON s.tenant_id = t.id 
JOIN subscription_plans sp ON s.plan_id = sp.id;
```

---

## ✅ CRITÉRIOS DE APROVAÇÃO

### Checklist de Validação Final

- [ ] **Autenticação:** Todos os 4 tipos de usuário conseguem fazer login
- [ ] **Isolamento:** Tenants não veem dados uns dos outros
- [ ] **Subscription:** Enforcement funcionando corretamente
- [ ] **Paginação:** Formato padronizado em todos endpoints
- [ ] **Validação:** Joi rejeitando dados inválidos
- [ ] **Autorização:** RBAC funcionando (OWNER, ADMIN, PROFESSIONAL)
- [ ] **Filtros:** Busca e filtros funcionando
- [ ] **Relatórios:** Dados corretos e agregados
- [ ] **CRUD:** Create, Read, Update, Delete funcionando
- [ ] **Segurança:** Sem vazamento de dados, sem escalação de privilégios

---

## 📝 NOTAS IMPORTANTES

1. **Senha Padrão:** Todos os usuários de teste usam senha `123456`
2. **Tenant Slug:** Use `beleza-pura` para testes
3. **JWT:** Token expira em 1 hora (configurável)
4. **Refresh Token:** Expira em 7 dias
5. **Trial:** Subscription demo tem 14 dias de trial
6. **Portas:** Nginx (8080), Backend (5001), PostgreSQL (5433)

---

## 🐛 TROUBLESHOOTING

### Erro de Conexão com Backend
```bash
# Verificar se backend está rodando
curl http://localhost:5001/api/health

# Verificar logs
docker-compose logs backend
```

### Erro de Autenticação
```bash
# Verificar se seeds foram executados
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db -c "SELECT COUNT(*) FROM users;"
```

### Erro de Subscription
```bash
# Verificar subscription do tenant
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db -c "SELECT * FROM subscriptions;"
```

---

**FIM DA CHECKLIST**

**Status:** ✅ Pronto para testes  
**Última Atualização:** 27/02/2026

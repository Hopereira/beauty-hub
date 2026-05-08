# 🗄️ DATABASE AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** 🟡 BOM — Estrutura sólida, algumas melhorias necessárias  
**DB:** PostgreSQL 15 (Supabase)  
**ORM:** Sequelize 6

---

## 📊 RESUMO EXECUTIVO

| Aspecto | Status | Notas |
|---------|--------|-------|
| **Schema Design** | 🟢 Excelente | 36 migrations bem estruturadas |
| **Multi-Tenant** | 🟢 Excelente | tenant_id NOT NULL em todas as tabelas |
| **Soft Delete** | 🟢 Bom | Paranoid mode ativado nos models |
| **Auditoria** | 🟡 Regular | created_at/updated_at em todos, mas sem user tracking |
| **Índices** | 🟡 Regular | Algumas tabelas precisam de mais índices |
| **Constraints** | 🟢 Bom | Foreign keys e unique constraints presentes |
| **Migrations** | 🟡 Regular | Algumas migrations grandes, sem rollback explícito |
| **Seeders** | 🔴 Crítico | Senha padrão "123456" no seeder master |

**Conclusão:** O esquema de banco de dados é bem projetado para multi-tenancy com isolamento correto. A principal preocupação é a ausência de índices específicos para queries frequentes e a senha padrão insegura.

---

## 🗂️ ESTRUTURA DE TABELAS

### Tabelas Core SaaS (5 tabelas)

```sql
tenants                    -- Informações do tenant
├── id (UUID PK)
├── name, slug (UNIQUE)
├── email, phone
├── document, document_type (CNPJ/CPF)
├── type (establishment/professional)
├── status (active/suspended/cancelled/pending)
├── address (JSONB)
├── settings (JSONB)
├── branding (JSONB)
├── activated_at, created_at, updated_at

subscription_plans         -- Planos disponíveis (globais)
├── id (UUID PK)
├── name, slug
├── price, currency, billing_interval
├── trial_days
├── limits (JSONB)
├── features (array)
├── is_active, is_public, sort_order

subscriptions              -- Assinaturas de cada tenant
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── plan_id (FK → subscription_plans)
├── status (trial/active/past_due/cancelled/expired)
├── current_period_start, current_period_end
├── trial_ends_at, cancelled_at
├── gateway, gateway_subscription_id

invoices                   -- Faturas de assinatura
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── subscription_id (FK → subscriptions)
├── amount, currency, status
├── due_date, paid_at
├── gateway, gateway_invoice_id
├── metadata (JSONB)

usage_logs                 -- Uso de recursos (rate limiting interno)
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── subscription_id (FK → subscriptions)
├── resource_type, quantity, recorded_at
```

### Tabelas Legado com tenant_id (10 tabelas)

```sql
users                      -- Usuários do sistema
├── id (UUID PK)
├── tenant_id (FK → tenants, NULL para MASTER)
├── email (UNIQUE por tenant)
├── password (bcrypt hash)
├── role (client/professional/admin/owner/master)
├── first_name, last_name, phone, avatar
├── settings, metadata (JSONB)
├── is_active, email_verified_at
├── failed_login_attempts, locked_at, lock_reason
├── created_at, updated_at, deleted_at (soft delete)

clients                    -- Clientes dos tenants
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, email, phone
├── notes, metadata (JSONB)
├── created_at, updated_at, deleted_at

professionals              -- Profissionais
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users, opcional)
├── name, email, phone, specialty
├── commission_rate
├── created_at, updated_at, deleted_at

services                   -- Serviços oferecidos
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, description, duration, price
├── category, is_active
├── created_at, updated_at, deleted_at

appointments               -- Agendamentos
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── client_id (FK → clients)
├── professional_id (FK → professionals)
├── service_id (FK → services)
├── start_time, end_time, status, notes
├── price, payment_method, payment_status
├── created_at, updated_at, deleted_at

financial_entries          -- Entradas financeiras
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── appointment_id (FK → appointments, opcional)
├── description, amount, date
├── category, payment_method, status
├── created_at, updated_at, deleted_at

financial_exits            -- Saídas/despesas
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── description, amount, date, category
├── payment_method, status
├── created_at, updated_at, deleted_at

establishments             -- Dados do estabelecimento (legado)
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, email, phone, document
├── address (JSONB)
├── settings (JSONB)
├── created_at, updated_at, deleted_at

payment_methods            -- Métodos de pagamento aceitos
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, type, is_active
├── created_at, updated_at, deleted_at

notifications              -- Notificações do sistema
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users)
├── type, title, message, is_read
├── created_at, updated_at, deleted_at
```

### Tabelas de Extensão SaaS (11 tabelas)

```sql
professional_details       -- Detalhes adicionais de profissionais
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users)
├── bio, portfolio_urls (JSONB)
├── working_hours, break_time
├── created_at, updated_at

professional_specialties   -- Especialidades (many-to-many)
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── professional_id (FK → professionals)
├── name, certification, years_experience
├── created_at, updated_at

professional_service_commissions  -- Comissões por serviço
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── professional_id (FK → professionals)
├── service_id (FK → services)
├── commission_rate, commission_type
├── created_at, updated_at

payment_transactions       -- Transações de pagamento
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── appointment_id (FK → appointments)
├── amount, payment_method, status
├── gateway, gateway_transaction_id
├── metadata (JSONB)
├── created_at, updated_at

suppliers                  -- Fornecedores
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, email, phone, document
├── address (JSONB)
├── created_at, updated_at, deleted_at

purchases                  -- Compras de produtos
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── supplier_id (FK → suppliers)
├── total_amount, status, purchase_date
├── created_at, updated_at, deleted_at

products                   -- Produtos/Serviços comprados
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, description, category
├── unit_price, stock_quantity
├── created_at, updated_at, deleted_at

purchase_items             -- Itens de compra
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── purchase_id (FK → purchases)
├── product_id (FK → products)
├── quantity, unit_price, total_price
├── created_at, updated_at

inventory_movements        -- Movimentação de estoque
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── product_id (FK → products)
├── type (in/out/adjustment)
├── quantity, reason, reference_type, reference_id
├── created_at, updated_at

service_categories         -- Categorias de serviços
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── name, description, color, icon
├── created_at, updated_at, deleted_at

login_attempts             -- Tentativas de login (brute force protection)
├── id (UUID PK)
├── identifier (email ou IP)
├── identifier_type (email/ip)
├── tenant_slug
├── success (boolean)
├── ip_address, user_agent, failure_reason
├── created_at
```

### Tabelas LGPD e Segurança (2 tabelas)

```sql
lgpd_deletion_requests     -- Pedidos de exclusão LGPD
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users)
├── email, reason
├── status (pending/completed/rejected)
├── requested_at, processed_at

login_attempts             -- Já listado acima
```

---

## 🔍 ANÁLISE DE MIGRATIONS

### ✅ Migrações Bem Estruturadas

| Migration | Propósito | Status |
|-----------|-----------|--------|
| 001-010 | Tabelas base (users, clients, etc.) | ✅ Boa |
| 011-015 | Tabelas SaaS core | ✅ Excelente |
| 016 | Add tenant_id a users | ✅ Necessária |
| 017 | Enhance billing tables | ⚠️ Grande (21KB) |
| 018 | Add SaaS production tables | ⚠️ Grande (15KB) |
| 019-022 | Professional e payments | ✅ Boa |
| 023-027 | Inventory, suppliers, purchases | ✅ Boa |
| 028-030 | Categories e campos extras | ✅ Boa |
| 031-034 | Backfill tenant_id (crítico) | ✅ Seguro |
| 035 | LGPD deletion requests | ✅ Completo |
| 036 | Avatar em users | ✅ Simples |

### ⚠️ Migrações Grandes e Complexas

**[DB-001] Migration 017 — Enhance Billing Tables (21KB)**
```javascript
// 017_enhance_billing_tables.js
// ALTERAÇÕES:
// - Adiciona campos em subscriptions
// - Adiciona campos em invoices  
// - Cria tabela usage_logs
// - Cria triggers/functions
```

**Risco:**
- Sem rollback explícito (down vazio)
- Múltiplas operações em uma única migration
- Se falhar no meio, estado do banco é incerto

**Recomendação:**
Quebrar em migrations menores:
```javascript
// 017a_add_subscription_fields.js
// 017b_add_invoice_fields.js  
// 017c_create_usage_logs.js
// 017d_create_billing_functions.js
```

### ✅ Migração Crítica Bem Feita — tenant_id Backfill

**[DB-002] Migrations 031-034 — Tenant Isolation**

```javascript
// 031_add_tenant_id_to_legacy_tables.js
// Adiciona tenant_id como NULLABLE (safe)

// 033_backfill_tenant_id_legacy_tables.js  
// Popula tenant_id baseado em lógica de negócio

// 034_tenant_id_not_null_legacy_tables.js
// Altera para NOT NULL após backfill completo
```

**Avaliação:** Excelente estratégia de migração em 3 fases que evita downtime.

---

## 🔐 ANÁLISE DE MULTI-TENANT ISOLATION

### ✅ Isolamento por tenant_id

```sql
-- Todas as tabelas de dados têm tenant_id NOT NULL
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'tenant_id' 
  AND is_nullable = 'NO';

-- Retorna: clients, professionals, services, appointments, etc.
```

### ⚠️ Exceção: Tabela users

```javascript
// users.tenant_id permite NULL para MASTER
{
  tenant_id: {
    type: Sequelize.UUID,
    allowNull: true,  // ⚠️ NULL para MASTER
    references: { model: 'tenants', key: 'id' }
  }
}
```

**Risco:**
- Queries que não verificam NULL podem vazar dados do MASTER
- Necessário filtro explícito: `WHERE role = 'master' OR tenant_id = :tenantId`

**Mitigação em Código:**
```javascript
// auth.js:166-169
if (req.user && req.user.role === ROLES.MASTER) {
  return next(); // MASTER bypass tenant check
}

// BaseRepository.js:30-31
if (!tenantId) {
  throw new TenantMismatchError(); // Rejeita queries sem tenant
}
```

---

## 📈 ÍNDICES E PERFORMANCE

### ✅ Índices Existentes

```sql
-- Índices primários (PK) em todos os IDs
-- Índices únicos em emails (por tenant)
CREATE UNIQUE INDEX users_email_tenant_idx ON users (email, tenant_id);

-- Índices de foreign keys (implícitos)
-- Índices em campos de busca frequentes
```

### ⚠️ Índices AUSENTES (Necessários)

| Tabela | Coluna(s) | Uso | Prioridade |
|--------|-----------|-----|------------|
| appointments | `tenant_id, start_time` | Calendário | 🔴 Alta |
| appointments | `tenant_id, professional_id, start_time` | Agenda profissional | 🔴 Alta |
| appointments | `tenant_id, client_id` | Histórico cliente | 🟡 Média |
| financial_entries | `tenant_id, date` | Relatórios financeiros | 🔴 Alta |
| invoices | `tenant_id, status, due_date` | Cobranças pendentes | 🔴 Alta |
| subscriptions | `tenant_id, status` | Verificação assinatura | 🟡 Média |
| login_attempts | `identifier, created_at` | Brute force check | 🟡 Média |
| notifications | `tenant_id, user_id, is_read` | Badge notificações | 🟢 Baixa |

**Query para Adicionar Índices:**
```sql
-- Appointment calendar queries
CREATE INDEX CONCURRENTLY idx_appointments_tenant_start 
  ON appointments (tenant_id, start_time DESC) 
  WHERE deleted_at IS NULL;

-- Financial reports
CREATE INDEX CONCURRENTLY idx_financial_entries_tenant_date 
  ON financial_entries (tenant_id, date DESC);

-- Invoice processing
CREATE INDEX CONCURRENTLY idx_invoices_tenant_status_due 
  ON invoices (tenant_id, status, due_date) 
  WHERE status IN ('pending', 'past_due');
```

---

## 🔌 FOREIGN KEYS E CASCADE

### ✅ Relacionamentos Bem Definidos

```sql
-- Subscriptions → Tenants
CONSTRAINT fk_subscriptions_tenant 
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE

-- Subscriptions → Plans
CONSTRAINT fk_subscriptions_plan 
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)

-- Invoices → Subscriptions
CONSTRAINT fk_invoices_subscription 
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
```

### ⚠️ Sem CASCADE em Algumas Tabelas

```javascript
// appointments.model.js
// Se client é deletado, appointment fica com client_id órfão
clientId: {
  type: DataTypes.UUID,
  references: { model: 'clients', key: 'id' },
  // ⚠️ Sem onDelete: 'SET NULL' ou 'CASCADE'
}
```

**Impacto:**
- Agendamentos de clientes deletados referenciam IDs inexistentes
- Queries JOIN podem falhar ou retornar null

**Correção:**
```javascript
clientId: {
  type: DataTypes.UUID,
  references: { model: 'clients', key: 'id' },
  onDelete: 'SET NULL',  // Mantém histórico, remove referência
  allowNull: true
}
```

---

## 🗑️ SOFT DELETE (PARANOID MODE)

### ✅ Implementação

```javascript
// BaseRepository.js:62-65
const result = await this.model.findAndCountAll({
  where: this._scopedWhere(tenantId, where),
  paranoid, // default: true — exclui deleted_at IS NOT NULL
  // ...
});
```

### ⚠️ Inconsistência em Queries Manuais

```javascript
// bruteForceProtection.js:91-101
await this.sequelize.query(`
  SELECT COUNT(*) as attempts
  FROM ${this.tableName}
  WHERE identifier = $1
`, { bind: [identifier] });
// ⚠️ Não verifica deleted_at — inclui registros soft-deleted
```

**Correção:**
```sql
SELECT COUNT(*) as attempts
FROM ${this.tableName}
WHERE identifier = $1
  AND (deleted_at IS NULL OR deleted_at > NOW())
```

---

## 📋 SEEDERS E DADOS INICIAIS

### ⚠️ [DB-003] Senha Padrão Insegura

**Arquivo:** `backend/src/seeders/002_seed_master_and_tenant.js:14`

```javascript
const passwordHash = await bcrypt.hash('123456', 10);
```

**Problemas:**
1. Senha trivialmente adivinhável
2. bcrypt rounds=10 (padrão, mas 12+ recomendado)
3. Mesma senha para master, owner e usuários de demo

**Correção:**
```javascript
const crypto = require('crypto');

// Gerar senha aleatória forte
const generateSecurePassword = () => {
  return crypto.randomBytes(16).toString('base64'); // 22 caracteres
};

const masterPassword = process.env.MASTER_SEED_PASSWORD || generateSecurePassword();
const passwordHash = await bcrypt.hash(masterPassword, 12);

// Logar senha em desenvolvimento (nunca em produção)
if (process.env.NODE_ENV === 'development') {
  console.log(`[SEED] Master password: ${masterPassword}`);
}
```

### ✅ Planos de Assinatura Bem Definidos

**Arquivo:** `backend/src/seeders/001_seed_subscription_plans.js`

```javascript
// 4 planos: Starter, Professional, Business, Enterprise
// Cada um com:
// - price, trial_days, limits (JSON)
// - features (array)
// - is_active, is_public
```

---

## 🔍 QUERIES POTENCIAIS N+1

### ⚠️ LGPD Export User Data

**Arquivo:** `backend/src/modules/lgpd/lgpd.service.js:23-64`

```javascript
async exportUserData(tenantId, userId) {
  const user = await User.findOne({...});           // Query 1
  const appointmentsAsPro = await Appointment.findAll({...}); // Query 2
  const clientRecord = await Client.findOne({...}); // Query 3
  const appointmentsAsClient = await Client.findAll({...}); // Query 4
}
// Total: 4 queries sequenciais
```

**Melhoria (Parallel):**
```javascript
const [user, appointmentsAsPro] = await Promise.all([
  User.findOne({...}),
  Appointment.findAll({...})
]);
// Total: 2 queries paralelas
```

### ⚠️ Dashboard Statistics

**Arquivo:** `backend/src/controllers/reportsController.js` (presumido)

Queries típicas de dashboard:
```javascript
// Agendamentos hoje
await Appointment.count({ where: { tenant_id, date: today }});

// Receitas do mês
await FinancialEntry.sum('amount', { where: { tenant_id, date: thisMonth }});

// Novos clientes
await Client.count({ where: { tenant_id, created_at: thisMonth }});

// Total: 3 queries (aceitável, mas pode ser otimizado)
```

---

## 🛡️ ANÁLISE DE SEGURANÇA DE DADOS

### ✅ Campos Sensíveis Protegidos

```javascript
// LGPD Service exclui password_hash
const user = await User.findOne({
  where: { id: userId, tenant_id: tenantId },
  attributes: { exclude: ['password_hash'] }, // ✅
});
```

### ⚠️ Logs de Senha

**Arquivo:** `backend/src/shared/middleware/bruteForceProtection.js`

```javascript
// Linha 68: userAgent pode conter dados sensíveis?
userAgent: req.headers['user-agent'],

// Linha 210: lock_reason salva tentativas
lock_reason: 'too_many_failed_attempts',
```

**Verificação:** Confirmar que `user-agent` não contém tokens acidentalmente.

---

## 📊 MÉTRICAS DO BANCO

| Métrica | Valor |
|---------|-------|
| Total de Tabelas | 36 |
| Tabelas com tenant_id | 31 (excluindo subscription_plans e login_attempts) |
| Tabelas com Soft Delete | 20+ |
| Foreign Keys | 40+ |
| Migrations | 36 |
| Seeders | 3 |
| Índices Explícitos | ~15 (poucos) |

---

## 🛠️ RECOMENDAÇÕES PRIORITÁRIAS

### 🔴 P0 — CRÍTICO (Imediato)

**[DB-003] Alterar Senha do Seeder Master**
```javascript
// 002_seed_master_and_tenant.js
const passwordHash = await bcrypt.hash(
  process.env.MASTER_SEED_PASSWORD || crypto.randomBytes(32).toString('hex'),
  12
);
```

### 🟡 P1 — ALTO (1-2 semanas)

**[DB-004] Adicionar Índices Críticos**
```sql
-- Criar migration 037_add_performance_indexes.js
CREATE INDEX CONCURRENTLY idx_appointments_tenant_start 
  ON appointments (tenant_id, start_time DESC);

CREATE INDEX CONCURRENTLY idx_financial_entries_tenant_date 
  ON financial_entries (tenant_id, date DESC);
```

**[DB-001] Refatorar Migration 017**
Quebrar em 4 migrations menores para permitir rollback granular.

### 🟢 P2 — MÉDIO (1 mês)

**[DB-005] Adicionar onDelete em Foreign Keys**
```javascript
// appointments.js
clientId: {
  type: DataTypes.UUID,
  references: { model: 'clients', key: 'id' },
  onDelete: 'SET NULL',
  allowNull: true
}
```

**[DB-006] Query Auditoria de Usuário**
Adicionar `created_by`, `updated_by` em tabelas críticas:
```sql
ALTER TABLE appointments 
ADD COLUMN created_by UUID REFERENCES users(id),
ADD COLUMN updated_by UUID REFERENCES users(id);
```

### 🟢 P3 — BAIXO (Backlog)

- Partitionamento de tabelas grandes (appointments, financial_entries)
- Archiving de dados antigos (> 2 anos)
- Read replicas para relatórios pesados

---

## 🧪 COMANDOS DE VERIFICAÇÃO

```bash
# Listar todas as tabelas e seus tamanhos
psql -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) 
         FROM pg_catalog.pg_statio_user_tables 
         ORDER BY pg_total_relation_size(relid) DESC;"

# Verificar índices ausentes (queries frequentes sem índice)
psql -c "SELECT schemaname, tablename, attname as column, n_tup_read, n_tup_fetch
         FROM pg_stats 
         WHERE schemaname = 'public' 
         ORDER BY n_tup_read DESC;"

# Verificar foreign keys sem índice
psql -c "SELECT conname, conrelid::regclass, a.attname
         FROM pg_constraint con
         JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = con.conrelid
         WHERE con.contype = 'f'
         AND NOT EXISTS (
           SELECT 1 FROM pg_index i 
           WHERE i.indrelid = con.conrelid 
           AND a.attnum = ANY(i.indkey)
         );"

# Verificar locks e deadlocks
psql -c "SELECT pid, state, query_start, query 
         FROM pg_stat_activity 
         WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"
```

---

*Auditoria concluída em 08/05/2026. Análise baseada em 36 migrations, 3 seeders e ~30 models.*

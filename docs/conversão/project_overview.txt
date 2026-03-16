# Beauty Hub — Visão Geral do Projeto

Este documento resume o estado atual, funcionalidades, modelos de dados e roadmap do Beauty Hub.

---

## Objetivo

O Beauty Hub é um **sistema de gestão completo para salões de beleza e estética**, composto por:

- **Frontend SPA** — Vanilla JavaScript (ES6 Modules) com Vite 5, design premium (paleta Teal), mobile-first
- **Backend API REST** — Node.js 20 + Express + Sequelize + PostgreSQL 15
- **Infraestrutura Docker** — Docker Compose com Nginx, Backend e PostgreSQL

Atualmente o frontend usa `localStorage` para persistência. O backend está implementado e rodando, mas a **integração frontend ↔ backend ainda não foi feita**.

---

## Hierarquia de Acesso (Roles)

| Perfil | Role Frontend | Role Backend | Visão | Permissões |
|--------|--------------|-------------|-------|------------|
| **Master** | - | `MASTER` | Tudo | Superadmin (apenas backend) |
| **Estabelecimento** | `admin` | `ADMIN` | Seu salão | Gerencia profissionais, clientes, financeiro, estoque |
| **Profissional** | `professional` | `PROFESSIONAL` | Seus agendamentos | Agenda, clientes, financeiro pessoal |
| **Cliente** | `client` | `CLIENT` | Agendamento online | Agendar horários, ver histórico (futuro) |

### Credenciais de Teste

**Frontend (localStorage):**

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | `adm@adm` | `123456` |
| Profissional | `prof@prof` | `123456` |

**Backend (PostgreSQL — seed data):**

| Perfil | Email | Senha |
|--------|-------|-------|
| Master | `master@master.com` | `123456` |
| Admin | `admin@admin.com` | `123456` |
| Profissional | `prof@prof.com` | `123456` |

> Novos usuários podem ser criados via `/register` (frontend) ou `POST /api/auth/register` (backend).

---

## Funcionalidades Implementadas

### 1. Infraestrutura SPA
- **SPA Router** com History API (navegação sem reload)
- **Lazy loading** de módulos de página via `import()` dinâmico
- **Auth guard** — rotas protegidas redirecionam para `/login`
- **State management** centralizado com event bus
- **Sistema de modais** padronizado (ESC, click-outside, stack)
- **Toast notifications** (success, error, warning, info)
- **Validação de formulários** com feedback visual
- **Seed data** automático na primeira execução

### 2. Autenticação (`/login`, `/register`)
- Login com validação e feedback via toast
- Registro multi-perfil (Estabelecimento, Profissional, Cliente)
- Campos dinâmicos por perfil (nome do salão, CNPJ, especialidade)
- Logout com limpeza de sessão
- Persistência de sessão via `localStorage`

### 3. Dashboard (`/dashboard`)
- **Calendário interativo** com navegação mês a mês
- Eventos de agendamentos exibidos nos dias do calendário
- **Cards de ganhos** com filtro: Hoje / Semana / Mês
- FAB (Floating Action Button) para agendar rapidamente
- Sidebar com navegação SPA e profile dropdown

### 4. Agendamentos (`/appointments`) — CRUD Completo
- Listagem de agendamentos com cards informativos
- **Filtros**: por data e por status (Agendado, Concluído, Pendente, Cancelado)
- **Criar** novo agendamento via modal (cliente, serviço, valor, data, hora, status, pagamento)
- **Editar** agendamento existente
- **Excluir** com modal de confirmação
- Empty state quando não há resultados

### 5. Financeiro (`/financial`) — CRUD Completo
- **3 Cards de Resumo**:
  - Forma de Pagamento (Dinheiro, Crédito, Débito, Pix) com totais
  - Financeiro Aberto (A receber + A pagar)
  - Financeiro Concluído (Entradas + Saídas)
- **Filtros de Data** (início/final) com botões Filtrar/Limpar
- **Tabela Entradas**: receitas com cliente, serviço, valor, status, data, ações
- **Tabela Saídas**: despesas com título, valor, status, data, ações
- **CRUD de saídas**: criar/editar via modal (título, descrição, categoria, data, valor, pagamento, status)
- Exclusão com confirmação
- Botão "Gerar Relatório" (placeholder)

### 6. Clientes (`/clients`) — CRUD Completo
- Tabela com nome, telefone, email, data de cadastro
- **Busca em tempo real** com debounce (300ms)
- **Paginação** (10 por página)
- Criar / Editar / Excluir clientes via modais

### 7. Minha Conta (`/account`)
- **4 Tabs**: Perfil, Segurança, Pagamentos, Notificações
- **Perfil**: edição de nome (salva em localStorage + sessão)
- **Segurança**: alteração de email (com confirmação), senha (com validação ≥ 6), telefone
- **Pagamentos**: visualização de cartão (placeholder para integração futura)
- **Notificações**: toggles persistidos (email, SMS, promoções)

### 8. Landing Page (`/`)
- Hero section com CTA para login

---

## Modelos de Dados (localStorage)

### User (`bh_users`)

```javascript
{
    id: 'u-prof-001',
    name: 'Ana Profissional',
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'prof@prof',
    password: '123456',
    role: 'professional',       // 'admin' | 'professional' | 'client'
    phone: '11999991111',
    specialty: 'Extensão de Cílios',
    avatar: 'https://...',
    salonName: '',              // Apenas para role 'admin'
    cnpj: '',                   // Apenas para role 'admin'
}
```

### Client (`bh_clients`)

```javascript
{
    id: 'c-001',
    name: 'Thaisa Oliveira',
    phone: '11988881111',
    email: 'thaisa@email.com',
    address: '',
    registrationDate: '2025-12-10',
}
```

### Appointment (`bh_appointments`)

```javascript
{
    id: 'a-001',
    clientId: 'c-006',             // Referência ao cliente
    professionalId: 'u-prof-001',  // Referência ao profissional
    service: 'Extensão de Cílios',
    date: '2026-02-02',            // ISO format
    startTime: '15:00',
    endTime: '16:30',
    value: 150,                    // Em reais (number)
    status: 'completed',           // 'scheduled' | 'completed' | 'pending' | 'cancelled'
    paymentMethod: 'pix',          // 'dinheiro' | 'credito' | 'debito' | 'pix' | ''
    notes: '',
}
```

### Financial Transaction (`bh_financial`)

```javascript
{
    id: 'f-001',
    type: 'income',                // 'income' | 'expense'
    description: 'Manutenção',
    clientName: 'Thaisa',          // Apenas para income
    value: 90,                     // Em reais (number)
    date: '2026-02-03',
    status: 'pending',             // 'pending' | 'completed'
    paymentMethod: 'dinheiro',     // 'dinheiro' | 'credito' | 'debito' | 'pix'
    category: 'Serviço',           // 'Serviço' | 'Material' | 'Alimentação' | 'Contas' | etc.
    relatedAppointmentId: 'a-002', // Opcional, referência ao agendamento
}
```

### Session (`bh_currentUser`)

```javascript
{
    id: 'u-prof-001',
    name: 'Ana Profissional',
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'prof@prof',
    role: 'professional',
    phone: '11999991111',
    avatar: 'https://...',
    specialty: 'Extensão de Cílios',
    token: 'bh-token-abc123',     // Token simulado
}
```

### Settings (`bh_settings`)

```javascript
{
    emailUpdates: true,
    smsReminders: false,
    promos: true,
}
```

---

## Seed Data (primeira execução)

| Coleção | Quantidade | Descrição |
|---------|-----------|-----------|
| Users | 2 | Admin + Profissional |
| Clients | 10 | Clientes de exemplo (Thaisa, Rafaela, Taís, etc.) |
| Appointments | 10 | Agendamentos variados (completed, pending, scheduled) |
| Financial | 8 | 5 entradas (serviços) + 3 saídas (material, padaria, luz) |

> Para resetar os dados ao estado inicial, execute no console do browser:
> ```javascript
> import('/src/shared/utils/localStorage.js').then(m => m.resetData())
> ```

---

## Rotas da Aplicação

| Rota | Feature / Módulo | Auth | Descrição |
|------|-----------------|------|-----------|
| `/` | `features/landing/pages/landing.js` | Não | Página inicial com CTA |
| `/login` | `features/auth/pages/login.js` | Não | Formulário de login |
| `/register` | `features/auth/pages/register.js` | Não | Cadastro multi-perfil |
| `/dashboard` | `features/dashboard/pages/dashboard.js` | Sim | Calendário + estatísticas |
| `/appointments` | `features/appointments/pages/appointments.js` | Sim | CRUD agendamentos |
| `/financial` | `features/financial/pages/financial.js` | Sim | CRUD financeiro |
| `/clients` | `features/clients/pages/clients.js` | Sim | CRUD clientes |
| `/account` | `features/account/pages/account.js` | Sim | Configurações da conta |

---

## Como Executar

### Opção 1: Docker Compose (recomendado)

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# Build do frontend
npm install
npm run build

# Subir todos os serviços
docker-compose up -d

# Rodar migrations e seeds (primeira vez)
docker exec beautyhub_backend npx sequelize-cli db:migrate
docker exec beautyhub_backend npx sequelize-cli db:seed:all
```

Acesse:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5001/api/health
- **PostgreSQL**: localhost:5433

### Opção 2: Frontend apenas (dev)

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

### Comandos Docker úteis

```bash
docker logs beautyhub_backend -f     # Logs do backend
docker logs beautyhub_nginx -f       # Logs do Nginx
docker-compose down                  # Parar tudo
docker-compose down -v               # Parar + apagar banco
docker exec beautyhub_backend npx sequelize-cli db:migrate:undo:all  # Reset migrations
```

---

## Estado Atual do Projeto

| Componente | Status | Detalhes |
|-----------|--------|----------|
| Frontend SPA | ✅ Completo | 8 páginas, CRUD completo, localStorage |
| Arquitetura Modular Frontend | ✅ Completo | core/ + shared/ + features/ com barrel exports |
| Backend API | ✅ Completo | 50+ endpoints, JWT, Joi, Winston |
| **Multi-Tenant SaaS** | ✅ Completo | tenants, billing, RBAC (MASTER/OWNER/ADMIN/PROF/CLIENT) |
| Docker Compose | ✅ Completo | Nginx + Backend + PostgreSQL |
| Migrations | ✅ Completo | 16 tabelas com soft delete |
| Seed Data | ✅ Completo | 4 planos, 1 tenant demo, 4 users (MASTER, OWNER, ADMIN, PROF) |
| HTTP Client | ✅ Pronto | `shared/utils/http.js` — fetch wrapper para integração |
| **Integração Frontend ↔ Backend** | ❌ Pendente | Frontend ainda usa localStorage |

> 📖 Documentação multi-tenant: [`MULTI_TENANT_ARCHITECTURE.md`](MULTI_TENANT_ARCHITECTURE.md)

---

## Roadmap (Próximos Passos)

| Prioridade | Feature | Status | Descrição |
|-----------|---------|--------|----------|
| ~~Alta~~ | ~~Backend API~~ | ✅ Feito | API REST Node.js/Express com 50+ endpoints |
| ~~Alta~~ | ~~Banco de dados~~ | ✅ Feito | PostgreSQL 15 com Sequelize ORM |
| ~~Alta~~ | ~~Docker~~ | ✅ Feito | Docker Compose com Nginx + Backend + PostgreSQL |
| ~~Alta~~ | ~~Multi-Tenant SaaS~~ | ✅ Feito | Tenants, billing, planos, RBAC hierárquico |
| **Alta** | **Integração Auth** | ❌ Pendente | Substituir localStorage auth por JWT do backend |
| ~~Alta~~ | ~~API Client (fetch)~~ | ✅ Feito | `shared/utils/http.js` com fetch wrapper + token management |
| **Alta** | **Integração CRUD** | ❌ Pendente | Substituir localStorage CRUD por chamadas REST |
| Média | Migrar módulos restantes | ❌ Pendente | clients, services, appointments, financial com tenant_id |
| Média | Upload de imagens | ❌ Pendente | Avatar do usuário e fotos de serviços |
| Média | Gráficos financeiros | ❌ Pendente | Chart.js para visualização de dados |
| Média | Relatórios PDF | ❌ Pendente | Exportação de relatórios financeiros |
| Média | Notificações push | ❌ Pendente | Web Push API |
| Baixa | PWA offline | ❌ Pendente | Service Worker completo |
| Baixa | Testes automatizados | ❌ Pendente | Vitest + Playwright |

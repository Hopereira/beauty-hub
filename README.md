# Beauty Hub 💅

Sistema de gestão completo para profissionais de beleza — **Full-Stack** com SPA frontend, API REST backend e infraestrutura Docker.

## 🚀 Tecnologias

### Frontend
- **Vite 5** — Build tool e dev server
- **Vanilla JavaScript** (ES6 Modules) — Zero frameworks
- **HTML5 & CSS3** — Design system moderno
- **Font Awesome 6** — Ícones

### Backend
- **Node.js 20 LTS** + **Express.js** — API REST
- **Sequelize 6** — ORM
- **PostgreSQL 15** — Banco de dados
- **JWT** + **bcrypt** — Autenticação
- **Joi** — Validação de dados
- **Winston** — Logging estruturado

### Infraestrutura
- **Docker Compose** — Orquestração
- **Nginx** — Reverse proxy + static files
- **PostgreSQL 15** — Banco persistente com volume

## 📁 Estrutura do Projeto

```
beatyhub/
├── index.html                    # SPA entry point
├── vite.config.js
├── docker-compose.yml            # Nginx + Backend + PostgreSQL
├── .env.example                  # Template de variáveis de ambiente
├── nginx/nginx.conf              # Reverse proxy config
│
├── src/                          # Frontend SPA (modular feature-based)
│   ├── main.js                   # Entry point da aplicação
│   ├── core/                     # Núcleo: router, state, auth, config
│   ├── shared/                   # Código compartilhado
│   │   ├── components/           # shell/, modal/ (UI reutilizável)
│   │   ├── styles/               # main.css, components.css
│   │   └── utils/                # localStorage, validation, toast, http
│   ├── features/                 # Módulos de negócio (por domínio)
│   │   ├── landing/              # Página inicial
│   │   ├── auth/                 # Login + Registro + styles
│   │   ├── dashboard/            # Dashboard + calendário + styles
│   │   ├── appointments/         # CRUD agendamentos
│   │   ├── financial/            # CRUD financeiro
│   │   ├── clients/              # CRUD clientes
│   │   └── account/              # Minha Conta
│   └── assets/logos/
│
├── backend/                      # API REST
│   ├── Dockerfile
│   ├── server.js                 # Entry point
│   └── src/
│       ├── app.js                # Express app (middleware + routes)
│       ├── config/               # env.js, database.js
│       ├── models/               # 10 Sequelize models
│       ├── controllers/          # 8 controllers
│       ├── routes/               # 10 route files
│       ├── middleware/            # auth, validation, errorHandler
│       ├── utils/                # jwt, logger, validators
│       ├── migrations/           # 10 migration files
│       └── seeders/              # Seed data
│
└── docs/                         # Documentação
```

## ✨ Funcionalidades

### 🔐 Autenticação
- [x] Login com validação e feedback (toast)
- [x] Registro multi-perfil (Estabelecimento, Profissional, Cliente)
- [x] Logout com limpeza de sessão
- [x] Guarda de rotas (redirect se não autenticado)
- [x] Persistência de sessão via `localStorage`

### 📊 Dashboard
- [x] Calendário interativo com navegação mês a mês
- [x] Eventos de agendamentos no calendário
- [x] Cards de ganhos (Hoje / Semana / Mês)
- [x] FAB para agendar rapidamente
- [x] Sidebar com navegação SPA

### 📅 Agendamentos (CRUD completo)
- [x] Listagem com filtro por data e status
- [x] Criar novo agendamento (modal)
- [x] Editar agendamento existente
- [x] Excluir com confirmação
- [x] Seleção de cliente, serviço, valor, horário, status, pagamento

### 💰 Financeiro (CRUD completo)
- [x] **3 Cards de Resumo**: Forma de Pagamento, Em Aberto, Concluído
- [x] Cálculos automáticos por método de pagamento
- [x] **Filtros de Data** (início/final)
- [x] **Tabela Entradas**: receitas com status e ações
- [x] **Tabela Saídas**: despesas com CRUD completo
- [x] Modal para adicionar/editar saídas
- [x] Exclusão com confirmação
- [x] **Gráficos Interativos** (Chart.js):
  - [x] Receitas vs Despesas (últimos 6 meses)
  - [x] Distribuição por Categoria (doughnut chart)
- [x] Exportação de relatórios

### 👥 Clientes (CRUD completo)
- [x] Tabela com nome, telefone, email, data de cadastro
- [x] Busca em tempo real (debounce)
- [x] Paginação
- [x] Criar / Editar / Excluir clientes

### 💼 Serviços
- [x] CRUD completo de serviços
- [x] **Categorias de Serviços** (campo category)
- [x] Tabela de categorias personalizadas
- [x] Filtros por categoria
- [x] Preço e duração

### 📦 Estoque/Inventário (OWNER)
- [x] CRUD completo de produtos
- [x] Controle de estoque (quantidade, mínimo)
- [x] Categorias de produtos
- [x] Fornecedores
- [x] Ajuste de estoque com histórico
- [x] Alertas de estoque baixo
- [x] Exportação CSV

### 🏪 Fornecedores (OWNER)
- [x] CRUD completo de fornecedores
- [x] Dados de contato
- [x] Histórico de compras

### 🛒 Compras (OWNER)
- [x] Registro de compras
- [x] Itens de compra
- [x] Movimentação automática de estoque
- [x] Vinculação com fornecedores

### ⚙️ Configurações
- [x] **Informações do Negócio**: nome, telefone, email, endereço, CNPJ
- [x] **Configurações Regionais**: fuso horário, idioma, moeda
- [x] **Identidade Visual**: logo, cores primária/secundária
- [x] **Horário de Funcionamento**: dias e horários por dia da semana
- [x] **Configurações de Pagamento (Pagar.me)**:
  - [x] API Key Pagar.me
  - [x] Dados bancários completos (banco, agência, conta)
  - [x] Dados do titular (nome, CPF/CNPJ)
  - [x] Tipo de conta e antecipação automática
  - [x] Recipient ID (gerado automaticamente)
- [x] **Notificações**: email de agendamentos, lembretes, relatórios

### ⚙️ Minha Conta
- [x] Tabs: Perfil, Segurança, Pagamentos, Notificações
- [x] Edição de nome (salva em localStorage + sessão)
- [x] Alteração de email com confirmação
- [x] Alteração de senha com validação
- [x] Alteração de telefone
- [x] Toggle de notificações (persistido)

### 💳 Assinatura SaaS
- [x] **Página de Onboarding**: escolha de plano para OWNER
- [x] Exibição de planos com recursos e limites
- [x] Destaque para plano mais popular
- [x] Período de teste gratuito (14 dias)
- [x] Assinatura com um clique
- [x] Integração com sistema de billing

### 🛠️ Infraestrutura SPA
- [x] Router com History API (sem reload de página)
- [x] Lazy loading de módulos de página
- [x] State management centralizado com event bus
- [x] Sistema de modais padronizado (ESC, click-outside, focus trap)
- [x] Toast notifications (success, error, warning, info)
- [x] Validação de formulários com feedback visual
- [x] Formatação de moeda (R$) e datas (dd/mm/yyyy)
- [x] Seed data automático na primeira execução

## 🎨 Design System

### Cores
- **Teal** `#20B2AA` — Primary (botões, links, destaques)
- **Blue** `#2196F3` — Informações
- **Pink** `#E91E63` — Alertas, saídas, exclusão
- **Green** `#4CAF50` — Sucesso, concluído
- **Orange** `#F57C00` — Pendente, avisos

### Componentes
- Cards com sombras suaves (`box-shadow`)
- Botões arredondados (8px / 50px pill)
- Modais com overlay e animação fadeIn
- Dropdowns animados
- Badges de status coloridos
- Toast notifications com slide-in
- Paginação estilizada
- Formulários com estados de erro/sucesso

## 🚀 Como Executar

### Docker Compose (recomendado)
```bash
cp .env.example .env
npm install && npm run build
docker-compose up -d
docker exec beautyhub_backend npx sequelize-cli db:migrate
docker exec beautyhub_backend npx sequelize-cli db:seed:all
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:5001/api/health |
| PostgreSQL | localhost:5433 |

### Frontend apenas (dev)
```bash
npm install
npm run dev
```
Acesse: `http://localhost:3000`

## 🔑 Credenciais de Teste

**Frontend (localStorage):**

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | `adm@adm` | `123456` |
| Profissional | `prof@prof` | `123456` |

**Backend Multi-Tenant (PostgreSQL):**

| Perfil | Email | Senha | Tenant |
|--------|-------|-------|--------|
| MASTER | `master@beautyhub.com` | `123456` | — |
| OWNER | `owner@belezapura.com` | `123456` | `beleza-pura` |

**Self-Signup (trial de 14 dias):**
```bash
curl -X POST http://localhost:8080/api/signup \
  -H "Content-Type: application/json" \
  -d '{"tenantName":"Meu Salão","ownerName":"Maria","ownerEmail":"maria@email.com","ownerPassword":"123456","document":"12345678901"}'
```

> Novos tenants podem ser criados via self-signup ou `POST /api/master/tenants`.

## 📱 Rotas SPA

| Página | Rota | Auth |
|--------|------|------|
| Landing | `/` | Não |
| Login | `/login` | Não |
| Registro | `/register` | Não |
| Dashboard | `/dashboard` | Sim |
| Agendamentos | `/appointments` | Sim |
| Financeiro | `/financial` | Sim |
| Clientes | `/clients` | Sim |
| Serviços | `/services` | Sim |
| Profissionais | `/professionals` | Sim |
| Estoque | `/inventory` | Sim (OWNER) |
| Fornecedores | `/suppliers` | Sim (OWNER) |
| Compras | `/purchases` | Sim (OWNER) |
| Relatórios | `/reports` | Sim (OWNER) |
| Assinatura | `/billing` | Sim |
| Configurações | `/settings` | Sim |
| Minha Conta | `/account` | Sim |

## 🏗️ Arquitetura

### Frontend
- **Feature-Based Modules** — Organizado por domínio (`core/`, `shared/`, `features/`)
- **SPA Router** — Navegação client-side com History API + lazy loading
- **Component Shell** — Layout dashboard reutilizável (sidebar + header)
- **HTTP Client** — `shared/utils/http.js` preparado para integração backend

### Backend (Multi-Tenant SaaS)
- **Arquitetura Modular** — `modules/` (tenants, billing, users) + `shared/`
- **Multi-Tenant** — Single DB, Shared Schema, `tenant_id` em todas as entidades
- **RBAC Hierárquico** — MASTER → OWNER → ADMIN → PROFESSIONAL → CLIENT
- **Billing Completo** — Planos, assinaturas, faturas, usage metering, Pagar.me integration
- **Self-Signup** — Onboarding com trial automático de 14 dias
- **Security** — Brute force protection, account lockout, rate limiting
- **LGPD Compliance** — Data export, anonymization, retention policies
- **Webhook Resilience** — Idempotency, DLQ, retry com backoff exponencial
- **BaseRepository** — Escopo automático por tenant
- **22 tabelas** — PostgreSQL com Sequelize ORM + soft delete

### Infraestrutura
- **Docker Compose** — Nginx + Backend + PostgreSQL
- **Zero Frontend Dependencies** — Vanilla JS puro

> 📖 Documentação completa: [`docs/MULTI_TENANT_ARCHITECTURE.md`](docs/MULTI_TENANT_ARCHITECTURE.md)

## � API Endpoints Principais

### Públicos (sem autenticação)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/plans` | Listar planos disponíveis |
| `POST` | `/api/signup` | Self-signup com trial |
| `POST` | `/api/signup/autonomous` | Signup profissional autônomo |
| `GET` | `/api/signup/check-email` | Verificar disponibilidade email |
| `GET` | `/api/signup/check-document` | Verificar CPF/CNPJ |

### Multi-Tenant SaaS (MASTER)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/master/tenants` | Listar todos os tenants |
| `POST` | `/api/master/tenants` | Criar tenant |
| `GET` | `/api/master/tenants/:id` | Detalhes do tenant |
| `PUT` | `/api/master/tenants/:id` | Atualizar tenant |
| `DELETE` | `/api/master/tenants/:id` | Excluir tenant |

## �� Estado & Próximos Passos

- [x] Frontend SPA completo (8 páginas, CRUD, localStorage)
- [x] Backend API REST (50+ endpoints, JWT, Joi, Winston)
- [x] Docker Compose (Nginx + Backend + PostgreSQL)
- [x] Migrations + Seed data
- [x] Refatoração modular frontend (core/ + shared/ + features/)
- [x] **Arquitetura Multi-Tenant SaaS** (tenants, billing, RBAC)
- [x] **Self-Signup & Onboarding** (trial automático)
- [x] **Brute Force Protection** (rate limiting + account lockout)
- [x] **LGPD Compliance** (data export, anonymization, retention)
- [x] **Webhook Resilience** (idempotency, DLQ, retry)
- [x] **Pagar.me Integration** (PIX, cartão, boleto, split payments)
- [x] **Gráficos Financeiros** (Chart.js - receitas vs despesas, categorias)
- [x] **Categorias de Serviços** (campo + tabela de gestão)
- [x] **Página de Onboarding SaaS** (escolha de plano para OWNER)
- [x] **Configurações de Pagamento** (dados bancários + Pagar.me)
- [x] **Módulos OWNER Completos** (estoque, fornecedores, compras)
- [ ] **Integração frontend ↔ backend** (substituir localStorage por API)
- [ ] Upload de imagens (avatar, logo)
- [ ] Notificações push
- [ ] Testes automatizados (Jest + Supertest)

## 📄 Licença

MIT

---

**Desenvolvido com 💙 para profissionais de beleza**

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

### 👥 Clientes (CRUD completo)
- [x] Tabela com nome, telefone, email, data de cadastro
- [x] Busca em tempo real (debounce)
- [x] Paginação
- [x] Criar / Editar / Excluir clientes

### ⚙️ Minha Conta
- [x] Tabs: Perfil, Segurança, Pagamentos, Notificações
- [x] Edição de nome (salva em localStorage + sessão)
- [x] Alteração de email com confirmação
- [x] Alteração de senha com validação
- [x] Alteração de telefone
- [x] Toggle de notificações (persistido)

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

**Backend (PostgreSQL):**

| Perfil | Email | Senha |
|--------|-------|-------|
| Master | `master@master.com` | `123456` |
| Admin | `admin@admin.com` | `123456` |
| Profissional | `prof@prof.com` | `123456` |

> Novos usuários podem ser criados via tela de Cadastro ou `POST /api/auth/register`.

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
| Minha Conta | `/account` | Sim |

## 🏗️ Arquitetura

- **Feature-Based Modules** — Frontend organizado por domínio (`core/`, `shared/`, `features/`)
- **SPA Router** — Navegação client-side com History API + lazy loading
- **Barrel Exports** — `index.js` em cada módulo para importações limpas
- **Component Shell** — Layout dashboard reutilizável (sidebar + header)
- **Event-driven State** — Estado centralizado com listeners
- **HTTP Client** — `shared/utils/http.js` preparado para integração backend
- **Backend API REST** — 50+ endpoints com JWT + role-based auth
- **PostgreSQL** — 10 tabelas com Sequelize ORM + soft delete
- **Docker Compose** — Nginx + Backend + PostgreSQL
- **Zero Frontend Dependencies** — Vanilla JS puro
- **Mobile-First** — Design responsivo

## 📝 Estado & Próximos Passos

- [x] Frontend SPA completo (8 páginas, CRUD, localStorage)
- [x] Backend API REST (50+ endpoints, JWT, Joi, Winston)
- [x] Docker Compose (Nginx + Backend + PostgreSQL)
- [x] Migrations + Seed data
- [x] Refatoração modular (core/ + shared/ + features/)
- [ ] **Integração frontend ↔ backend** (substituir localStorage por API)
- [ ] Upload de imagens (avatar)
- [ ] Gráficos financeiros (Chart.js)
- [ ] Relatórios em PDF
- [ ] Notificações push
- [ ] PWA offline completo
- [ ] Testes automatizados

## 📄 Licença

MIT

---

**Desenvolvido com 💙 para profissionais de beleza**

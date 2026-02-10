# Beauty Hub 💅

Sistema de gestão completo para profissionais de beleza — **SPA (Single Page Application)** com Vanilla JavaScript e persistência via `localStorage`.

## 🚀 Tecnologias

- **Vite 5** — Build tool e dev server
- **Vanilla JavaScript** (ES6 Modules) — Zero frameworks
- **HTML5 & CSS3** — Design system moderno
- **Font Awesome 6** — Ícones
- **localStorage** — Persistência de dados (simula backend)

## 📁 Estrutura do Projeto

```
beatyhub/
├── index.html                    # SPA entry point (único HTML)
├── vite.config.js
├── src/
│   ├── scripts/
│   │   ├── main.js               # Bootstrap da aplicação
│   │   ├── router.js             # SPA Router (History API)
│   │   ├── state.js              # State management + event bus
│   │   ├── auth.js               # Login / Registro / Logout
│   │   ├── components/
│   │   │   ├── shell.js          # Dashboard layout (sidebar + header)
│   │   │   ├── modal.js          # Sistema de modais (ESC, click-outside)
│   │   │   ├── sidebar.js        # Sidebar (legado)
│   │   │   └── header.js         # Header (legado)
│   │   ├── pages/
│   │   │   ├── landing.js        # Página inicial
│   │   │   ├── login.js          # Login
│   │   │   ├── register.js       # Cadastro multi-perfil
│   │   │   ├── dashboard.js      # Dashboard + calendário interativo
│   │   │   ├── appointments.js   # CRUD agendamentos
│   │   │   ├── financial.js      # CRUD financeiro + cálculos
│   │   │   ├── clients.js        # CRUD clientes + busca + paginação
│   │   │   └── account.js        # Minha Conta (perfil, segurança, notif.)
│   │   └── utils/
│   │       ├── localStorage.js   # CRUD helpers + seed data
│   │       ├── validation.js     # Validação de formulários + formatação
│   │       └── toast.js          # Notificações toast
│   ├── styles/
│   │   ├── main.css              # Design system (tokens, reset, utilities)
│   │   ├── auth.css              # Estilos de autenticação
│   │   ├── dashboard.css         # Layout do dashboard
│   │   └── components.css        # Componentes compartilhados
│   └── assets/
│       └── logos/
├── docs/
│   ├── architecture.md
│   ├── components.md
│   └── project_overview.md
└── src/pages/                    # HTML estáticos (legado, mantidos como ref.)
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

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```
Acesse: `http://localhost:3000`

### Build para Produção
```bash
npm run build
npm run preview
```

## 🔑 Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | `adm@adm` | `123456` |
| Profissional | `prof@prof` | `123456` |

> Novos usuários podem ser criados via tela de Cadastro.

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

- **SPA Router** — Navegação client-side com History API
- **Modular ES6** — Cada página é um módulo com `render()` e `init()`
- **Component Shell** — Layout dashboard reutilizável (sidebar + header)
- **Event-driven State** — Estado centralizado com listeners
- **localStorage CRUD** — Helpers genéricos para coleções
- **Zero Dependencies** — Vanilla JS puro (sem React, Vue, etc.)
- **Mobile-First** — Design responsivo

## 📝 Próximos Passos

- [ ] Backend integration (API REST)
- [ ] Autenticação real (JWT)
- [ ] Banco de dados (PostgreSQL / MongoDB)
- [ ] Upload de imagens (avatar)
- [ ] Notificações push
- [ ] Relatórios em PDF
- [ ] Gráficos financeiros (Chart.js)
- [ ] PWA offline completo
- [ ] Testes automatizados

## 📄 Licença

MIT

---

**Desenvolvido com 💙 para profissionais de beleza**

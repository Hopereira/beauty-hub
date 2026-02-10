# Arquitetura do Sistema

O Beauty Hub é uma **Single Page Application (SPA)** construída com Vanilla JavaScript e ES6 Modules, sem dependência de frameworks. A aplicação utiliza `localStorage` para persistência de dados, simulando um backend completo.

---

## Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Build Tool | Vite | 5.x |
| Linguagem | Vanilla JavaScript (ES6 Modules) | ES2020+ |
| Markup | HTML5 | - |
| Estilos | CSS3 (Custom Properties) | - |
| Ícones | Font Awesome | 6.4 |
| Fonte | Montserrat (Google Fonts) | 400–800 |
| Persistência | localStorage | Web API |
| PWA | manifest.json | - |

---

## Estrutura de Diretórios

```bash
beatyhub/
├── index.html                          # Único HTML — SPA entry point
├── vite.config.js                      # Vite config (SPA mode)
├── package.json
├── manifest.json                       # PWA manifest
│
├── src/
│   ├── scripts/
│   │   ├── main.js                     # Bootstrap: init data → init modals → init router
│   │   ├── router.js                   # SPA Router (History API)
│   │   ├── state.js                    # State management + event bus
│   │   ├── auth.js                     # Autenticação (login/register/logout)
│   │   │
│   │   ├── components/
│   │   │   ├── shell.js                # Layout dashboard (sidebar + header + content)
│   │   │   ├── modal.js                # Sistema de modais (ESC, click-outside)
│   │   │   ├── sidebar.js              # Sidebar (legado, mantido como referência)
│   │   │   └── header.js               # Header (legado, mantido como referência)
│   │   │
│   │   ├── pages/                      # Módulos de página (lazy-loaded)
│   │   │   ├── landing.js              # /
│   │   │   ├── login.js                # /login
│   │   │   ├── register.js             # /register
│   │   │   ├── dashboard.js            # /dashboard
│   │   │   ├── appointments.js         # /appointments
│   │   │   ├── financial.js            # /financial
│   │   │   ├── clients.js              # /clients
│   │   │   └── account.js              # /account
│   │   │
│   │   └── utils/
│   │       ├── localStorage.js         # CRUD helpers + seed data + constantes
│   │       ├── validation.js           # Validação de formulários + formatação
│   │       └── toast.js                # Notificações toast
│   │
│   ├── styles/
│   │   ├── main.css                    # Design system (tokens, reset, utilities)
│   │   ├── auth.css                    # Layout de autenticação (split screen)
│   │   ├── dashboard.css               # Layout do dashboard (sidebar + main)
│   │   └── components.css              # Componentes compartilhados (dropdown, modal, toggle)
│   │
│   ├── assets/
│   │   └── logos/
│   │
│   └── pages/                          # HTML estáticos (legado, mantidos como referência)
│       ├── auth/
│       └── dashboard/
│
└── docs/                               # Documentação
    ├── architecture.md                 # Este arquivo
    ├── components.md                   # Guia de componentes
    └── project_overview.md             # Visão geral do projeto
```

---

## Fluxo de Inicialização

```bash
index.html
  └─ <script type="module" src="/src/scripts/main.js">
       ├─ 1. initializeData()       → Seed localStorage se vazio
       ├─ 2. initModalSystem()      → Registra ESC + click-outside global
       └─ 3. initRouter()           → Lê URL → carrega módulo de página
                                       ├─ Registra popstate listener
                                       ├─ Intercepta clicks em <a>
                                       └─ loadRoute(path)
                                            ├─ Auth guard (redirect /login)
                                            ├─ import('./pages/xxx.js')  ← lazy
                                            ├─ mod.render()  → injeta HTML no #app
                                            └─ mod.init()    → bind eventos, retorna cleanup
```

---

## Padrão de Módulo de Página

Cada página é um módulo ES6 que exporta duas funções:

```javascript
// src/scripts/pages/exemplo.js

export function render() {
    // Injeta HTML no DOM
    // Para páginas autenticadas: renderShell('pageName') + setContent(html)
    // Para páginas públicas: document.getElementById('app').innerHTML = html
}

export function init() {
    // Bind de eventos, inicialização de estado local
    // Retorna função de cleanup (ou null)
    return () => {
        // Cleanup: remove listeners, reseta estado
    };
}
```

### Ciclo de Vida

1. **Router** detecta mudança de URL
2. Executa `cleanup()` da página anterior (se existir)
3. Importa módulo da nova página (lazy loading)
4. Chama `render()` → injeta HTML
5. Chama `init()` → bind eventos, retorna cleanup

---

## SPA Router (`router.js`)

### Rotas Definidas

| Rota | Página | Auth | Módulo |
|------|--------|------|--------|
| `/` | Landing | Não | `landing.js` |
| `/login` | Login | Não | `login.js` |
| `/register` | Cadastro | Não | `register.js` |
| `/dashboard` | Dashboard | Sim | `dashboard.js` |
| `/appointments` | Agendamentos | Sim | `appointments.js` |
| `/financial` | Financeiro | Sim | `financial.js` |
| `/clients` | Clientes | Sim | `clients.js` |
| `/account` | Minha Conta | Sim | `account.js` |

### Funcionalidades do Router

- **History API**: `pushState` / `popstate` para navegação sem reload
- **Auth Guard**: Rotas protegidas redirecionam para `/login` se não autenticado
- **Redirect Guard**: Usuário autenticado em `/login` ou `/register` é redirecionado para `/dashboard`
- **Link Interception**: Todos os `<a href>` internos são interceptados para navegação SPA
- **Lazy Loading**: Módulos de página são importados sob demanda via `import()` dinâmico
- **Cleanup**: Cada página pode retornar uma função de limpeza executada ao sair

---

## State Management (`state.js`)

Estado centralizado com event bus simples:

```javascript
// Leitura
getCurrentUser()      // Retorna objeto do usuário ou null
isAuthenticated()     // Boolean
getUserRole()         // 'admin' | 'professional' | 'client' | null
getCurrentPage()      // String da página atual

// Escrita
setCurrentUser(user)  // Salva em memória + localStorage
logout()              // Limpa sessão

// Eventos
on('userChanged', callback)    // Listener para mudança de usuário
on('pageChanged', callback)    // Listener para mudança de página
on('logout', callback)         // Listener para logout
off('userChanged', callback)   // Remove listener
```

---

## Persistência (`localStorage.js`)

### Storage Keys

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `bh_users` | Array | Usuários cadastrados |
| `bh_currentUser` | Object | Sessão do usuário logado |
| `bh_appointments` | Array | Agendamentos |
| `bh_financial` | Array | Transações financeiras |
| `bh_clients` | Array | Clientes cadastrados |
| `bh_settings` | Object | Preferências do usuário |

### Helpers CRUD

```javascript
// Operações básicas
saveItem(key, data)              // Salva qualquer valor
getItem(key)                     // Lê qualquer valor
removeItem(key)                  // Remove chave

// Operações em coleções (arrays)
getCollection(key)               // Retorna array (ou [])
addToCollection(key, item)       // Adiciona com ID gerado
updateInCollection(key, id, data)// Atualiza por ID
removeFromCollection(key, id)    // Remove por ID
findInCollection(key, id)        // Busca por ID
findByField(key, field, value)   // Busca por campo
filterCollection(key, filterFn)  // Filtra com função

// Utilitários
generateId()                     // Gera ID único (timestamp + random)
initializeData()                 // Seed data se vazio
resetData()                      // Reseta tudo para seed
```

### Seed Data (primeira execução)

| Coleção | Registros | Descrição |
|---------|-----------|-----------|
| Users | 2 | Admin (`adm@adm`) + Profissional (`prof@prof`) |
| Clients | 10 | Clientes de exemplo |
| Appointments | 10 | Agendamentos variados (completed, pending, scheduled) |
| Financial | 8 | 5 entradas + 3 saídas |

---

## Autenticação (`auth.js`)

### Fluxo de Login

```bash
Usuário submete form → handleLogin(email, password)
  ├─ Busca em bh_users por email + password
  ├─ Se encontrou → cria sessionUser com token simulado
  │   ├─ setCurrentUser(sessionUser) → salva em bh_currentUser
  │   └─ return { success: true, user }
  └─ Se não encontrou → return { success: false, message }
```

### Fluxo de Registro

```bash
Usuário submete form → handleRegister({ name, email, password, ... })
  ├─ Validações (campos obrigatórios, senha ≥ 6, email único)
  ├─ Mapeia role (estabelecimento→admin, profissional→professional, cliente→client)
  ├─ addToCollection(KEYS.USERS, newUser)
  └─ return { success: true, user }
```

---

## Shell Layout (`shell.js`)

O `shell.js` renderiza o layout padrão do dashboard:

```bash
┌─────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────┐ │
│ │          │ │ Header (greeting + avatar)      │ │
│ │ Sidebar  │ ├────────────────────────────────┤ │
│ │          │ │                                │ │
│ │ - Início │ │  #page-content                 │ │
│ │ - Client │ │  (conteúdo dinâmico da página) │ │
│ │ - Agenda │ │                                │ │
│ │ - Financ │ │                                │ │
│ │ - Estoqu │ │                                │ │
│ │ - Serviç │ │                                │ │
│ │          │ │                                │ │
│ │ [Sair]   │ │                                │ │
│ └──────────┘ └────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### API

```javascript
renderShell('dashboard')         // Renderiza shell completo no #app
getContentArea()                 // Retorna elemento #page-content
setContent(html)                 // Atualiza apenas o conteúdo interno
```

---

## Sistema de Modais (`modal.js`)

### API

```javascript
openModal('appointment')         // Abre #modal-appointment
closeModal('appointment')        // Fecha #modal-appointment
closeTopModal()                  // Fecha o modal mais recente
closeAllModals()                 // Fecha todos
initModalSystem()                // Registra handlers globais (ESC + click-outside)
```

### Convenção de IDs

Modais devem ter `id="modal-{tipo}"` e classe `modal-overlay`:

```html
<div id="modal-appointment" class="modal-overlay" style="display:none;">
    <div class="modal-content">...</div>
</div>
```

---

## Design System (`main.css`)

### CSS Custom Properties (Tokens)

```css
/* Cores */
--primary-color: #20B2AA;
--primary-dark: #008B8B;
--primary-light: rgba(32, 178, 170, 0.1);
--color-blue / --color-pink / --color-green / --color-orange / --color-red

/* Neutros */
--text-dark: #333333;
--text-muted: #666666;
--text-light: #999999;
--border-color: #e0e0e0;
--bg-light: #f5f7fa;

/* Sombras */
--shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
--shadow-sm / --shadow-lg

/* Espaçamento */
--space-xs (0.25rem) → --space-2xl (3rem)

/* Border Radius */
--radius-sm (4px) → --radius-full (50px)

/* Tipografia */
--font-family: 'Montserrat', sans-serif;
--font-size-xs (0.75rem) → --font-size-2xl (2rem)

/* Transições */
--transition-fast: 0.2s ease;
--transition-base: 0.3s ease;
```

### Utilitários CSS Incluídos

- **Toast Notifications**: `.toast-container`, `.toast`, `.toast-success/error/warning/info`
- **Loading Spinner**: `.spinner`, `.spinner-sm`
- **Form Validation**: `.input-error`, `.input-success`, `.error-message`
- **Pagination**: `.pagination`, `.pagination-btn`, `.pagination-info`
- **Helpers**: `.sr-only`, `.hidden`, `.visible`, `.text-center`, `.text-muted`

---

## Performance

- **Zero Frameworks**: Vanilla JS elimina overhead de React/Vue/Angular
- **Lazy Loading**: Módulos de página carregados sob demanda via `import()` dinâmico
- **Single Entry Point**: Apenas `index.html` — sem múltiplos HTML para o browser resolver
- **CSS Variables**: Tema centralizado, sem pré-processadores
- **Event Delegation**: Listeners no container pai em vez de em cada elemento
- **Debounce**: Busca de clientes com debounce de 300ms

---

## Diagrama de Dependências

```bash
main.js
├── utils/localStorage.js  ← initializeData()
├── components/modal.js    ← initModalSystem()
└── router.js              ← initRouter()
    ├── state.js           ← isAuthenticated(), setCurrentPage()
    └── pages/*.js         ← import() dinâmico
        ├── components/shell.js  ← renderShell()
        │   ├── state.js         ← getCurrentUser()
        │   ├── auth.js          ← handleLogout()
        │   ├── router.js        ← navigateTo()
        │   └── components/modal.js
        ├── utils/localStorage.js ← CRUD
        ├── utils/validation.js   ← formatação
        ├── utils/toast.js        ← feedback
        └── components/modal.js   ← openModal/closeModal

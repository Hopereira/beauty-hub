# Componentes e Utilitários — Guia de Uso

Este documento descreve todos os componentes JavaScript, utilitários e módulos de página do Beauty Hub SPA.

---

## 📁 Estrutura de Arquivos

```
src/                                # Frontend (modular feature-based)
├── main.js                         # Entry point da aplicação
│
├── core/                           # Núcleo da aplicação
│   ├── index.js                    # Barrel export
│   ├── config.js                   # Configurações globais (API_BASE_URL, ROLES)
│   ├── router.js                   # SPA Router (History API, Auth Guard)
│   ├── state.js                    # State management + event bus
│   └── auth.js                     # Autenticação (localStorage)
│
├── shared/                         # Código compartilhado
│   ├── components/
│   │   ├── index.js                # Barrel export
│   │   ├── shell/shell.js          # Layout dashboard (sidebar + header)
│   │   └── modal/modal.js          # Sistema de modais
│   ├── styles/
│   │   ├── main.css                # Design system (tokens, reset, utilities)
│   │   └── components.css          # Componentes CSS compartilhados
│   └── utils/
│       ├── index.js                # Barrel export
│       ├── localStorage.js         # Persistência + CRUD helpers
│       ├── validation.js           # Validação de formulários
│       ├── formatting.js           # Formatação (moeda, data)
│       ├── toast.js                # Notificações toast
│       └── http.js                 # Fetch wrapper (para integração backend)
│
├── features/                       # Módulos de negócio (por domínio)
│   ├── landing/pages/landing.js
│   ├── auth/pages/{login,register}.js + styles/auth.css
│   ├── dashboard/pages/dashboard.js + styles/dashboard.css
│   ├── appointments/pages/appointments.js
│   ├── financial/pages/financial.js
│   ├── clients/pages/clients.js
│   └── account/pages/account.js
│
└── assets/logos/

backend/src/                        # Backend API
├── app.js                      # Express app (middleware + routes)
├── config/                     # env.js, database.js
├── models/                     # 10 Sequelize models + index.js
├── controllers/                # 8 controllers (auth, user, profile, etc.)
├── routes/                     # 10 route files
├── middleware/                 # auth.js, validation.js, errorHandler.js
├── utils/                      # jwt.js, logger.js, validators.js
├── migrations/                 # 10 migration files
└── seeders/                    # 1 comprehensive seeder
```

---

## 🧩 Componentes (`shared/components/`)

### Shell (`shared/components/shell/shell.js`)

Layout padrão do dashboard — sidebar, header e área de conteúdo. Usado por todas as páginas autenticadas.

```javascript
import { renderShell, getContentArea, setContent } from '../../../shared/components/shell/shell.js';
// Ou via barrel: import { renderShell, getContentArea, setContent } from '../../../shared/components';

// Renderiza o shell completo no #app (sidebar + header + content vazio)
renderShell('dashboard');  // 'dashboard' = item ativo na sidebar

// Obtém o container de conteúdo
const content = getContentArea();  // retorna #page-content

// Atualiza apenas o conteúdo (mantém sidebar/header)
setContent('<h1>Olá</h1>');
```

**Itens do menu lateral:**

| ID | Ícone | Label | Rota |
|----|-------|-------|------|
| `dashboard` | `fa-home` | Início | `/dashboard` |
| `clients` | `fa-users` | Clientes | `/clients` |
| `appointments` | `fa-calendar-alt` | Agendamentos | `/appointments` |
| `financial` | `fa-dollar-sign` | Financeiro | `/financial` |
| `stock` | `fa-box` | Estoque | `#` |
| `services` | `fa-cut` | Serviços | `#` |

**Funcionalidades incluídas:**
- Profile dropdown (toggle ao clicar no avatar)
- Botão de logout (sidebar + dropdown)
- Navegação SPA (links interceptados pelo router)
- Nome e avatar do usuário logado

---

### Modal (`shared/components/modal/modal.js`)

Sistema padronizado de modais com suporte a ESC, click-outside e stack.

```javascript
import { openModal, closeModal, closeTopModal, closeAllModals, initModalSystem } from '../../../shared/components/modal/modal.js';
// Ou via barrel: import { openModal, closeModal } from '../../../shared/components';

// Inicializar (feito uma vez no main.js)
initModalSystem();

// Abrir modal — aceita ID completo, prefixo, ou elemento
openModal('appointment');        // abre #modal-appointment
openModal('modal-appointment');  // mesmo resultado
openModal(domElement);           // aceita elemento diretamente

// Fechar
closeModal('appointment');       // fecha #modal-appointment
closeTopModal();                 // fecha o mais recente (útil para ESC)
closeAllModals();                // fecha todos
```

**Convenção HTML para modais:**

```html
<div id="modal-{tipo}" class="modal-overlay" style="display:none;
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);z-index:2000;
    justify-content:center;align-items:center;">
    <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;
        width:100%;max-width:500px;">
        <!-- Conteúdo -->
    </div>
</div>
```

**Comportamentos automáticos:**
- `ESC` fecha o modal mais recente
- Click no overlay (`.modal-overlay`) fecha o modal
- Focus automático no primeiro input ao abrir

---

---

## 🚀 Backend Components (`backend/src/`)

### Controllers

| Controller | Endpoints | Descrição |
|------------|-----------|----------|
| `authController.js` | register, login, refresh-token, me | Autenticação JWT |
| `userController.js` | CRUD + changePassword + changeRole | Gestão de usuários (MASTER/ADMIN) |
| `profileController.js` | get, update, changePassword | Perfil do usuário logado |
| `establishmentController.js` | CRUD + professionals + services | Gestão de estabelecimentos |
| `professionalController.js` | CRUD + appointments | Gestão de profissionais |
| `serviceController.js` | CRUD | Catálogo de serviços |
| `clientController.js` | CRUD + search + appointments | Gestão de clientes |
| `appointmentController.js` | CRUD + calendar + overlap check | Agendamentos |
| `financialController.js` | Summary + Entries/Exits CRUD + Payment Methods | Financeiro |
| `notificationController.js` | list, markAsRead, remove | Notificações |

### Middleware

| Middleware | Descrição |
|------------|----------|
| `auth.js` | `authenticate` (JWT verify) + `authorize(...roles)` (role check) |
| `validation.js` | `validate(schema, source)` — valida body/query com Joi |
| `errorHandler.js` | Global error handler com tratamento de Sequelize errors |

### Models (Sequelize)

| Model | Tabela | Associações |
|-------|--------|-------------|
| User | users | hasOne Establishment, hasOne Professional, hasMany Notification |
| Establishment | establishments | belongsTo User, hasMany Professional/Service/Client/Appointment |
| Professional | professionals | belongsTo User + Establishment, hasMany Appointment |
| Service | services | belongsTo Establishment, hasMany Appointment |
| Client | clients | belongsTo Establishment, hasMany Appointment/FinancialEntry |
| Appointment | appointments | belongsTo Establishment/Client/Professional/Service |
| PaymentMethod | payment_methods | hasMany FinancialEntry |
| FinancialEntry | financial_entries | belongsTo Establishment/Appointment/Client/PaymentMethod |
| FinancialExit | financial_exits | belongsTo Establishment |
| Notification | notifications | belongsTo User |

---

## 🛠️ Utilitários (`shared/utils/`)

### localStorage (`shared/utils/localStorage.js`)

Camada de persistência com helpers CRUD genéricos.

```javascript
import {
    saveItem, getItem, removeItem,
    getCollection, addToCollection, updateInCollection,
    removeFromCollection, findInCollection, findByField,
    filterCollection, generateId,
    initializeData, resetData,
    KEYS
} from '../../../shared/utils/localStorage.js';
// Ou via barrel: import { getCollection, KEYS } from '../../../shared/utils';
```

**Constantes de chaves (`KEYS`):**

```javascript
KEYS.USERS          // 'bh_users'
KEYS.CURRENT_USER   // 'bh_currentUser'
KEYS.APPOINTMENTS   // 'bh_appointments'
KEYS.FINANCIAL      // 'bh_financial'
KEYS.CLIENTS        // 'bh_clients'
KEYS.SETTINGS       // 'bh_settings'
```

**Exemplos de uso:**

```javascript
// Adicionar cliente
const client = addToCollection(KEYS.CLIENTS, {
    name: 'Maria Silva',
    phone: '11999990000',
    email: 'maria@email.com',
    registrationDate: '2026-02-09',
});
// → { id: 'abc123', name: 'Maria Silva', ... }

// Atualizar
updateInCollection(KEYS.CLIENTS, client.id, { phone: '11888880000' });

// Buscar
const found = findByField(KEYS.CLIENTS, 'email', 'maria@email.com');

// Filtrar
const pending = filterCollection(KEYS.APPOINTMENTS, a => a.status === 'pending');

// Remover
removeFromCollection(KEYS.CLIENTS, client.id);

// Reset total (volta ao seed)
resetData();
```

---

### Validation (`shared/utils/validation.js`)

Validadores de formulário e funções de formatação.

```javascript
import {
    validateRequired, validateEmail, validatePassword,
    validatePasswordMatch, validateDate, validateFutureDate,
    validateTime, validateNumber, validatePhone,
    showValidationError, clearValidationError, showValidationSuccess,
    clearAllErrors, validateForm,
    parseCurrency, formatCurrency, formatDate, formatDateISO
} from '../../../shared/utils/validation.js';
// Formatação também disponível via: import { formatCurrency } from '../../../shared/utils/formatting.js';
```

**Validadores:**

| Função | Descrição | Exemplo |
|--------|-----------|---------|
| `validateRequired(v)` | Não vazio | `validateRequired('abc')` → `true` |
| `validateEmail(v)` | Formato email | `validateEmail('a@b.c')` → `true` |
| `validatePassword(v, min)` | Tamanho mínimo (default 6) | `validatePassword('123456')` → `true` |
| `validatePasswordMatch(a, b)` | Senhas iguais | `validatePasswordMatch('abc', 'abc')` → `true` |
| `validateDate(v)` | Data válida | `validateDate('2026-02-09')` → `true` |
| `validateFutureDate(v)` | Data ≥ hoje | `validateFutureDate('2030-01-01')` → `true` |
| `validateTime(v)` | Formato HH:MM | `validateTime('14:30')` → `true` |
| `validateNumber(v)` | Número ≥ 0 | `validateNumber('150')` → `true` |
| `validatePhone(v)` | 10–11 dígitos | `validatePhone('11999990000')` → `true` |

**Feedback visual:**

```javascript
// Mostrar erro em um input
showValidationError(inputElement, 'Campo obrigatório');

// Limpar erro
clearValidationError(inputElement);

// Mostrar sucesso
showValidationSuccess(inputElement);

// Limpar todos os erros de um form
clearAllErrors(formElement);
```

**Validação de formulário completo:**

```javascript
const { valid, errors } = validateForm(form, [
    {
        field: 'email',
        rules: [
            { test: validateRequired, message: 'Email obrigatório' },
            { test: validateEmail, message: 'Email inválido' },
        ]
    },
    {
        field: 'password',
        rules: [
            { test: v => validatePassword(v, 6), message: 'Mínimo 6 caracteres' },
        ]
    },
]);

if (!valid) {
    // errors = { email: 'Email inválido', password: 'Mínimo 6 caracteres' }
    // Inputs já estão com classe .input-error e mensagem visível
}
```

**Formatação:**

```javascript
formatCurrency(150)          // → 'R$ 150,00'
parseCurrency('R$ 150,00')   // → 150
formatDate('2026-02-09')     // → '09/02/2026'
formatDateISO('09/02/2026')  // → '2026-02-09'
```

---

### HTTP Client (`shared/utils/http.js`) — **NOVO**

Fetch wrapper preparado para integração com o backend API.

```javascript
import { api } from '../../../shared/utils/http.js';

// GET
const users = await api.get('/users');

// POST
const result = await api.post('/auth/login', { email, password });

// PUT
await api.put('/users/123', { name: 'Novo Nome' });

// DELETE
await api.delete('/users/123');
```

> **Nota**: Este módulo será usado quando a integração frontend ↔ backend for implementada.

---

### Toast (`shared/utils/toast.js`)

Notificações não-bloqueantes com auto-dismiss.

```javascript
import { showToast } from '../../../shared/utils/toast.js';

showToast('Salvo com sucesso!', 'success');          // Verde
showToast('Erro ao salvar.', 'error');               // Vermelho
showToast('Atenção: dados incompletos.', 'warning'); // Laranja
showToast('Dica: use filtros.', 'info');             // Azul
showToast('Custom duration', 'info', 5000);          // 5 segundos
```

**Comportamento:**
- Aparece no canto superior direito
- Auto-dismiss após 3s (configurável)
- Click para fechar imediatamente
- Animação slide-in / slide-out
- Múltiplos toasts empilham verticalmente

---

## 📄 Módulos de Página (`features/*/pages/`)

Cada módulo exporta `render()` e `init()`. O router chama ambos ao navegar.

### Padrão de implementação

```javascript
// Páginas autenticadas (ex: features/dashboard/pages/dashboard.js)
import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';

export function render() {
    renderShell('nomeDaPagina');  // Renderiza sidebar + header
}

export function init() {
    renderPageContent();          // Preenche #page-content
    bindEvents();                 // Adiciona listeners
    return () => { /* cleanup */ };
}
```

```javascript
// Páginas públicas (login, register, landing)
export function render() {
    document.getElementById('app').innerHTML = `...`;
}

export function init() {
    // Bind form submit, etc.
    return () => { /* cleanup */ };
}
```

### Resumo dos módulos

| Módulo | Rota | Tipo | Funcionalidades |
|--------|------|------|-----------------|
| `landing.js` | `/` | Público | Hero + CTA para login |
| `login.js` | `/login` | Público | Form login + validação + toast |
| `register.js` | `/register` | Público | Seleção de perfil + form dinâmico |
| `dashboard.js` | `/dashboard` | Auth | Calendário interativo + stats (hoje/semana/mês) |
| `appointments.js` | `/appointments` | Auth | CRUD completo + filtros data/status + modal |
| `financial.js` | `/financial` | Auth | CRUD + 3 cards resumo + tabelas entradas/saídas |
| `clients.js` | `/clients` | Auth | CRUD + busca debounce + paginação |
| `account.js` | `/account` | Auth | 4 tabs + modais email/senha/telefone + toggles |

---

## 🎨 CSS Components (`components.css`)

Classes CSS compartilhadas entre páginas:

| Componente | Classes | Descrição |
|------------|---------|-----------|
| Profile Dropdown | `.user-profile`, `.profile-dropdown`, `.profile-dropdown.show` | Menu do avatar |
| Modal | `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-field`, `.modal-actions` | Sistema de modais |
| Toggle Switch | `.switch`, `.slider` | Switch on/off estilo iOS |
| Botões | `.btn-cancel`, `.btn-update` | Ações de modal |

---

## 🎨 CSS Utilities (`main.css`)

Classes utilitárias globais:

| Classe | Descrição |
|--------|-----------|
| `.toast-container`, `.toast`, `.toast-{type}` | Notificações toast |
| `.spinner`, `.spinner-sm` | Loading spinner |
| `.input-error`, `.input-success`, `.error-message` | Estados de validação |
| `.pagination`, `.pagination-btn`, `.pagination-info` | Paginação |
| `.sr-only` | Acessibilidade (visually hidden) |
| `.hidden`, `.visible` | Display toggle |
| `.text-center`, `.text-muted`, `.text-primary` | Texto utilitário |

---

## 🔄 Como Criar uma Nova Feature

1. **Criar diretório** da feature:

```bash
mkdir -p src/features/novapagina/pages src/features/novapagina/styles
```

2. **Criar módulo** em `src/features/novapagina/pages/novapagina.js`:

```javascript
import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';

export function render() {
    renderShell('novapagina');
}

export function init() {
    const content = getContentArea();
    content.innerHTML = `<h2>Nova Página</h2>`;
    return null;
}
```

3. **Registrar rota** em `src/core/router.js`:

```javascript
// Em routes:
'/novapagina': { title: 'Nova Página - Beauty Hub', page: 'novapagina', auth: true },

// Em moduleMap dentro de loadPageModule():
'novapagina': () => import('../features/novapagina/pages/novapagina.js'),
```

4. **Adicionar ao menu** em `src/shared/components/shell/shell.js`:

```javascript
// Em menuItems:
{ id: 'novapagina', icon: 'fas fa-star', label: 'Nova Página', path: '/novapagina' },
```

Pronto — a página estará acessível via sidebar e URL direta.

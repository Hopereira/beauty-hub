# Componentes e Utilitários — Guia de Uso

Este documento descreve todos os componentes JavaScript, utilitários e módulos de página do Beauty Hub SPA.

---

## 📁 Estrutura de Arquivos

```
src/scripts/
├── main.js                     # Bootstrap da aplicação
├── router.js                   # SPA Router
├── state.js                    # State management
├── auth.js                     # Autenticação
│
├── components/
│   ├── shell.js                # Layout dashboard (sidebar + header)
│   ├── modal.js                # Sistema de modais
│   ├── sidebar.js              # Sidebar (legado)
│   └── header.js               # Header (legado)
│
├── pages/
│   ├── landing.js              # Página inicial
│   ├── login.js                # Login
│   ├── register.js             # Cadastro
│   ├── dashboard.js            # Dashboard + calendário
│   ├── appointments.js         # CRUD agendamentos
│   ├── financial.js            # CRUD financeiro
│   ├── clients.js              # CRUD clientes
│   └── account.js              # Minha Conta
│
└── utils/
    ├── localStorage.js         # Persistência + CRUD helpers
    ├── validation.js           # Validação + formatação
    └── toast.js                # Notificações toast
```

---

## 🧩 Componentes (`components/`)

### Shell (`shell.js`)

Layout padrão do dashboard — sidebar, header e área de conteúdo. Usado por todas as páginas autenticadas.

```javascript
import { renderShell, getContentArea, setContent } from '../components/shell.js';

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

### Modal (`modal.js`)

Sistema padronizado de modais com suporte a ESC, click-outside e stack.

```javascript
import { openModal, closeModal, closeTopModal, closeAllModals, initModalSystem } from '../components/modal.js';

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

### Sidebar e Header (legado)

Os arquivos `sidebar.js` e `header.js` são mantidos como referência do design original. Na SPA, o `shell.js` substitui ambos.

---

## 🛠️ Utilitários (`utils/`)

### localStorage (`localStorage.js`)

Camada de persistência com helpers CRUD genéricos.

```javascript
import {
    saveItem, getItem, removeItem,
    getCollection, addToCollection, updateInCollection,
    removeFromCollection, findInCollection, findByField,
    filterCollection, generateId,
    initializeData, resetData,
    KEYS
} from '../utils/localStorage.js';
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

### Validation (`validation.js`)

Validadores de formulário e funções de formatação.

```javascript
import {
    validateRequired, validateEmail, validatePassword,
    validatePasswordMatch, validateDate, validateFutureDate,
    validateTime, validateNumber, validatePhone,
    showValidationError, clearValidationError, showValidationSuccess,
    clearAllErrors, validateForm,
    parseCurrency, formatCurrency, formatDate, formatDateISO
} from '../utils/validation.js';
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

### Toast (`toast.js`)

Notificações não-bloqueantes com auto-dismiss.

```javascript
import { showToast } from '../utils/toast.js';

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

## 📄 Módulos de Página (`pages/`)

Cada módulo exporta `render()` e `init()`. O router chama ambos ao navegar.

### Padrão de implementação

```javascript
// Páginas autenticadas
import { renderShell, getContentArea } from '../components/shell.js';

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

## 🔄 Como Criar uma Nova Página

1. **Criar módulo** em `src/scripts/pages/novapagina.js`:

```javascript
import { renderShell, getContentArea } from '../components/shell.js';

export function render() {
    renderShell('novapagina');
}

export function init() {
    const content = getContentArea();
    content.innerHTML = `<h2>Nova Página</h2>`;
    return null;
}
```

2. **Registrar rota** em `src/scripts/router.js`:

```javascript
// Em routes:
'/novapagina': { title: 'Nova Página - Beauty Hub', page: 'novapagina', auth: true },

// Em moduleMap dentro de loadPageModule():
'novapagina': () => import('./pages/novapagina.js'),
```

3. **Adicionar ao menu** em `src/scripts/components/shell.js`:

```javascript
// Em menuItems:
{ id: 'novapagina', icon: 'fas fa-star', label: 'Nova Página', path: '/novapagina' },
```

Pronto — a página estará acessível via sidebar e URL direta.

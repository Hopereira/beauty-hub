# Componentes Compartilhados - Guia de Uso

Este documento explica como usar os componentes compartilhados do Beauty Hub.

## 📁 Estrutura de Arquivos

```
src/
├── styles/
│   └── components.css      # Estilos compartilhados
└── scripts/
    ├── components/
    │   ├── sidebar.js      # Componente de sidebar
    │   └── header.js       # Componente de header
    └── utils/
        └── ui.js           # Funções utilitárias
```

## 🎨 CSS Components (`components.css`)

### Profile Dropdown
Menu dropdown do perfil do usuário com links para "Minha conta" e "Sair".

**Classes:**
- `.user-profile` - Container do perfil
- `.profile-dropdown` - Menu dropdown
- `.profile-dropdown.show` - Estado aberto

### Modal System
Sistema de modais reutilizável para formulários e confirmações.

**Classes:**
- `.modal-overlay` - Overlay escuro de fundo
- `.modal-content` - Container do conteúdo
- `.modal-header` - Cabeçalho do modal
- `.modal-field` - Campo de formulário
- `.modal-actions` - Área de botões

### Toggle Switches
Switches estilo iOS para configurações on/off.

**Classes:**
- `.switch` - Container do switch
- `.slider` - Elemento visual do switch

### Buttons
Botões padronizados do sistema.

**Classes:**
- `.btn-cancel` - Botão de cancelar (branco)
- `.btn-update` - Botão de atualizar (teal)

## 🔧 JavaScript Utils (`ui.js`)

### Importação

```javascript
import { toggleProfileMenu, openModal, closeModal, switchTab, initUI } from '../../scripts/utils/ui.js';
```

### Funções Disponíveis

#### `toggleProfileMenu()`
Abre/fecha o dropdown do perfil do usuário.

**Uso:**
```html
<div class="user-profile" onclick="window.toggleProfileMenu()">
    <!-- Avatar -->
</div>
```

#### `openModal(type)`
Abre um modal específico.

**Parâmetros:**
- `type` (string): Identificador do modal (ex: 'email', 'password', 'phone')

**Uso:**
```html
<button onclick="window.openModal('email')">Editar Email</button>
```

#### `closeModal(type)`
Fecha um modal específico.

**Parâmetros:**
- `type` (string): Identificador do modal

**Uso:**
```html
<button onclick="window.closeModal('email')">Cancelar</button>
```

#### `switchTab(tabName)`
Troca entre abas na página de configurações.

**Parâmetros:**
- `tabName` (string): Nome da aba ('profile', 'security', 'payments', 'notifications')

**Uso:**
```html
<div onclick="window.switchTab('profile')">Meu Perfil</div>
```

#### `initUI()`
Inicializa todos os handlers de UI (click outside, etc).

**Uso:**
```javascript
// No final do HTML
<script type="module">
    import { initUI } from '../../scripts/utils/ui.js';
    initUI();
</script>
```

## 📝 Como Usar em uma Nova Página

### 1. Adicionar CSS

```html
<head>
    <link rel="stylesheet" href="../../styles/main.css">
    <link rel="stylesheet" href="../../styles/dashboard.css">
    <link rel="stylesheet" href="../../styles/components.css"> <!-- Adicionar -->
</head>
```

### 2. Importar JavaScript

```html
<script type="module">
    import { toggleProfileMenu, openModal, closeModal, initUI } from '../../scripts/utils/ui.js';
    
    // Tornar funções globais
    window.toggleProfileMenu = toggleProfileMenu;
    window.openModal = openModal;
    window.closeModal = closeModal;
    
    // Inicializar
    initUI();
</script>
```

### 3. Usar Componentes HTML

#### Profile Dropdown
```html
<div class="user-profile" onclick="window.toggleProfileMenu()">
    <div class="avatar">A</div>
    <div class="profile-dropdown" id="profileDropdown">
        <a href="account.html"><i class="far fa-user"></i> Minha conta</a>
        <a href="../auth/login.html"><i class="fas fa-sign-out-alt"></i> Sair</a>
    </div>
</div>
```

#### Modal
```html
<div id="modal-email" class="modal-overlay">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Título do Modal</h2>
        </div>
        <p class="modal-description">Descrição...</p>
        
        <div class="modal-field">
            <label class="modal-label">Campo</label>
            <input type="text" class="modal-input">
        </div>
        
        <div class="modal-actions">
            <button class="btn-cancel" onclick="window.closeModal('email')">Cancelar</button>
            <button class="btn-update">Salvar</button>
        </div>
    </div>
</div>
```

#### Toggle Switch
```html
<label class="switch">
    <input type="checkbox" checked>
    <span class="slider"></span>
</label>
```

## 🎯 Benefícios

- ✅ **Menos código**: ~350 linhas economizadas
- ✅ **Consistência**: Mesmo visual em todas as páginas
- ✅ **Manutenção fácil**: Mudança em um lugar afeta tudo
- ✅ **Performance**: Browser cacheia arquivos compartilhados

## 📊 Páginas que Usam

- ✅ `professional.html` - Dashboard profissional
- ✅ `account.html` - Página de configurações
- 🔜 Futuras páginas do dashboard

## 🔄 Atualizações Futuras

Componentes planejados:
- Card component
- Form validation utilities
- Toast notifications
- Loading spinners

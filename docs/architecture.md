# Arquitetura do Sistema

O Beauty Hub foi projetado para ser modular, escalável e fácil de manter.

## Front-end Stack
- **Build Engine**: Vite (v5+) for instant dev server and optimized production builds.
- **Languages**: HTML5, Vanilla JavaScript (ES6 Modules), CSS3 (Modern).
- **PWA**: Manifesto `manifest.json` configured for installability.

## Estrutura de Diretórios (Source)
Todo o código-fonte editável vive dentro de `src/`:

```
src/
├── pages/
│   ├── auth/           # Páginas de autenticação
│   │   ├── login.html
│   │   └── register.html
│   └── dashboard/      # Páginas do dashboard
│       ├── professional.html
│       ├── appointments.html
│       ├── financial.html
│       └── account.html
├── styles/
│   ├── main.css        # Variáveis globais e design system
│   ├── auth.css        # Estilos de autenticação
│   ├── dashboard.css   # Estilos do dashboard
│   └── components.css  # Componentes compartilhados (NEW)
├── scripts/
│   ├── components/     # Componentes reutilizáveis (NEW)
│   │   ├── sidebar.js
│   │   └── header.js
│   └── utils/          # Utilitários compartilhados (NEW)
│       └── ui.js
└── assets/             # Imagens e vetores
```

## Arquitetura de Componentes

### Componentes Compartilhados
O sistema utiliza uma arquitetura baseada em componentes reutilizáveis para reduzir duplicação de código:

#### CSS Components (`components.css`)
- **Profile Dropdown**: Menu dropdown do perfil do usuário
- **Modal System**: Overlays e modais reutilizáveis
- **Toggle Switches**: Switches de notificação
- **Form Elements**: Botões e inputs padronizados

#### JavaScript Modules (`scripts/utils/ui.js`)
Funções utilitárias exportadas como ES6 modules:
- `toggleProfileMenu()`: Controle do dropdown
- `openModal(type)` / `closeModal(type)`: Gerenciamento de modais
- `switchTab(tabName)`: Navegação entre abas
- `initUI()`: Inicialização de handlers

### Benefícios da Arquitetura
- ✅ **DRY (Don't Repeat Yourself)**: Código compartilhado entre páginas
- ✅ **Manutenibilidade**: Mudanças centralizadas
- ✅ **Performance**: Browser cache de arquivos compartilhados
- ✅ **Escalabilidade**: Fácil adicionar novas páginas

## Padrões de Estilo
- **main.css**: Variáveis globais (Design System Teal), resets e tipografia.
- **auth.css**: Layout específico de login/registro (Split Screen).
- **dashboard.css**: Estilos para o painel de controle.
- **components.css**: Componentes reutilizáveis (dropdowns, modais, toggles).

## Performance
- **Zero-Bundle-Bloat**: Uso de Vanilla JS para evitar peso desnecessário de frameworks.
- **Mobile-First**: CSS otimizado para celulares antes de desktops.
- **Code Splitting**: Componentes carregados apenas quando necessário.

## Dashboard Pages

### 1. Professional Dashboard (`professional.html`)
Página inicial do profissional com visão geral do negócio.
- **Features**:
  - Cards de estatísticas (Agendamentos, Clientes, Receita)
  - Calendário de agendamentos
  - Botão "Agendar" flutuante
  - Navegação lateral completa
  - Profile dropdown (Minha Conta, Sair)

### 2. Appointments Page (`appointments.html`)
Gerenciamento de agendamentos do profissional.
- **Features**:
  - Filtro de data centralizado
  - Botão "Adicionar" para novos agendamentos
  - Lista de agendamentos (em desenvolvimento)
  - Modal de novo agendamento
  - Empty state design

### 3. Financial Page (`financial.html`)
Controle financeiro completo com entradas e saídas.
- **Features**:
  - **3 Summary Cards**:
    - Forma de Pagamento (Dinheiro, Crédito, Débito, Pix)
    - Financeiro Aberto (A receber, A pagar)
    - Financeiro Concluído (Entradas, Saídas)
  - **Filtros de Data**: Data início e Data final com botões Filtrar/Limpar
  - **Seção Entradas**: Tabela com Cliente, Serviço, Valor, Status, Data
  - **Seção Saídas**: Tabela com Título, Data, Status, Valor
  - **Action Menus**: Dropdown com Editar/Cancelar em cada transação
  - **Modal Nova Saída**: Formulário completo (Título, Descrição, Categoria, Vencimento, Valor, Status)
  - **Botão Gerar Relatório**: Export de dados financeiros

### 4. Account Page (`account.html`)
Configurações da conta do usuário.
- **Features**:
  - Tabs: Perfil, Segurança, Notificações, Pagamentos
  - Edição de informações pessoais
  - Alteração de senha
  - Configurações de notificações
  - Métodos de pagamento

## Design System

### Color Palette
- **Primary (Teal)**: `#20B2AA` - Botões principais, links, ações
- **Blue**: `#2196F3` - Informações, pagamentos
- **Pink**: `#E91E63` - Alertas, financeiro aberto, saídas
- **Green**: `#4CAF50` - Sucesso, financeiro concluído
- **Orange**: `#F57C00` - Pendente, avisos
- **Gray Scale**: `#333`, `#666`, `#999`, `#ddd`, `#f0f0f0`

### Typography
- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto)
- **Headings**: Bold, varied sizes (1.5rem - 2rem)
- **Body**: 1rem, line-height 1.6

### Spacing
- **Base Unit**: 1rem (16px)
- **Card Padding**: 1.5rem
- **Section Margins**: 2rem
- **Gap**: 1rem (flexbox/grid)
- **ES6 Modules**: Imports nativos do navegador para melhor cache.

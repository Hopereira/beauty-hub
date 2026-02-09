# Beauty Hub 💅

Sistema de gestão para profissionais de beleza, com foco em agendamentos, controle financeiro e gestão de clientes.

## 🚀 Tecnologias

- **Vite** - Build tool e dev server
- **Vanilla JavaScript** (ES6 Modules)
- **HTML5 & CSS3** (Modern)
- **Font Awesome** - Ícones

## 📁 Estrutura do Projeto

```
beatyhub/
├── src/
│   ├── pages/
│   │   ├── auth/              # Autenticação
│   │   │   ├── login.html
│   │   │   └── register.html
│   │   └── dashboard/         # Dashboard
│   │       ├── professional.html
│   │       ├── appointments.html
│   │       ├── financial.html
│   │       └── account.html
│   ├── styles/
│   │   ├── main.css          # Design system
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   └── components.css
│   ├── scripts/
│   │   ├── components/       # Componentes JS
│   │   └── utils/            # Utilitários
│   └── assets/
├── docs/
│   └── architecture.md       # Documentação técnica
└── index.html                # Landing page
```

## ✨ Funcionalidades Implementadas

### 🔐 Autenticação
- [x] Login com validação
- [x] Registro multi-role (Master, Estabelecimento, Profissional)
- [x] Redirecionamento baseado em role

### 📊 Dashboard Profissional
- [x] Cards de estatísticas
- [x] Calendário de agendamentos
- [x] Navegação lateral
- [x] Profile dropdown

### 📅 Agendamentos
- [x] Filtro de data centralizado
- [x] Botão adicionar agendamento
- [x] Modal de novo agendamento
- [x] Empty state

### 💰 Financeiro
- [x] **3 Cards de Resumo**:
  - Forma de Pagamento (Dinheiro, Crédito, Débito, Pix)
  - Financeiro Aberto (A receber, A pagar)
  - Financeiro Concluído (Entradas, Saídas)
- [x] **Filtros de Data** (Data início/final)
- [x] **Seção Entradas**: Tabela com transações de clientes
- [x] **Seção Saídas**: Tabela com despesas
- [x] **Action Menus**: Dropdown Editar/Cancelar
- [x] **Modal Nova Saída**: Formulário completo
- [x] **Botão Gerar Relatório**

### ⚙️ Minha Conta
- [x] Tabs: Perfil, Segurança, Notificações, Pagamentos
- [x] Edição de informações
- [x] Alteração de senha
- [x] Configurações de notificações

## 🎨 Design System

### Cores
- **Teal** `#20B2AA` - Primary (botões, links)
- **Blue** `#2196F3` - Informações
- **Pink** `#E91E63` - Alertas, saídas
- **Green** `#4CAF50` - Sucesso
- **Orange** `#F57C00` - Pendente

### Componentes
- Cards com sombras suaves
- Botões arredondados (8px)
- Modais com overlay
- Dropdowns animados
- Badges de status coloridos

## 🚀 Como Executar

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```
Acesse: `http://localhost:5173`

### Build para Produção
```bash
npm run build
```

## 🔑 Credenciais de Teste

### Admin
- Email: `adm@adm`
- Senha: `123456`

### Profissional
- Email: `prof@prof`
- Senha: `123456`

## 📱 Páginas

| Página | Rota | Descrição |
|--------|------|-----------|
| Landing | `/` | Página inicial |
| Login | `/auth/login.html` | Autenticação |
| Registro | `/auth/register.html` | Cadastro |
| Dashboard | `/src/pages/dashboard/professional.html` | Visão geral |
| Agendamentos | `/src/pages/dashboard/appointments.html` | Gestão de agendamentos |
| Financeiro | `/src/pages/dashboard/financial.html` | Controle financeiro |
| Minha Conta | `/src/pages/dashboard/account.html` | Configurações |

## 🏗️ Arquitetura

- **Componentes Reutilizáveis**: CSS e JS modularizados
- **ES6 Modules**: Imports nativos do navegador
- **Mobile-First**: Design responsivo
- **Zero Dependencies**: Vanilla JS puro

## 📝 Próximos Passos

- [ ] Backend integration (API REST)
- [ ] Autenticação real (JWT)
- [ ] Banco de dados
- [ ] Upload de imagens
- [ ] Notificações push
- [ ] Relatórios em PDF
- [ ] Gráficos financeiros
- [ ] PWA offline

## 📄 Licença

MIT

---

**Desenvolvido com 💙 para profissionais de beleza**

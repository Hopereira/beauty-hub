# Beauty Hub — Visão Geral do Projeto

Este documento resume o estado atual, funcionalidades, modelos de dados e roadmap do Beauty Hub.

---

## Objetivo

O Beauty Hub é um **sistema de gestão completo para salões de beleza e estética**, construído como uma **Single Page Application (SPA)** com Vanilla JavaScript. Utiliza `localStorage` para persistência de dados, simulando um backend completo. Foco em alta performance (Vite 5), design premium (paleta Teal) e experiência mobile-first.

---

## Hierarquia de Acesso (Roles)

O sistema suporta 3 perfis de acesso no cadastro, com possibilidade de expansão:

| Perfil | Role (interno) | Visão | Permissões |
|--------|---------------|-------|------------|
| **Estabelecimento** | `admin` | Seu salão | Gerencia profissionais, clientes, financeiro, estoque |
| **Profissional** | `professional` | Seus agendamentos | Agenda, clientes, financeiro pessoal |
| **Cliente** | `client` | Agendamento online | Agendar horários, ver histórico (futuro) |

### Credenciais de Teste (Seed Data)

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | `adm@adm` | `123456` |
| Profissional | `prof@prof` | `123456` |

> Novos usuários podem ser criados via `/register`.

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
> import('/src/scripts/utils/localStorage.js').then(m => m.resetData())
> ```

---

## Rotas da Aplicação

| Rota | Módulo | Auth | Descrição |
|------|--------|------|-----------|
| `/` | `landing.js` | Não | Página inicial com CTA |
| `/login` | `login.js` | Não | Formulário de login |
| `/register` | `register.js` | Não | Cadastro multi-perfil |
| `/dashboard` | `dashboard.js` | Sim | Calendário + estatísticas |
| `/appointments` | `appointments.js` | Sim | CRUD agendamentos |
| `/financial` | `financial.js` | Sim | CRUD financeiro |
| `/clients` | `clients.js` | Sim | CRUD clientes |
| `/account` | `account.js` | Sim | Configurações da conta |

---

## Como Executar

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento (http://localhost:3000)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

## Roadmap (Próximos Passos)

| Prioridade | Feature | Descrição |
|-----------|---------|-----------|
| Alta | Backend API | API REST (Node.js/Express ou similar) |
| Alta | Autenticação JWT | Substituir localStorage por tokens reais |
| Alta | Banco de dados | PostgreSQL ou MongoDB |
| Média | Upload de imagens | Avatar do usuário e fotos de serviços |
| Média | Gráficos financeiros | Chart.js para visualização de dados |
| Média | Relatórios PDF | Exportação de relatórios financeiros |
| Média | Notificações push | Web Push API |
| Baixa | PWA offline | Service Worker completo |
| Baixa | Testes automatizados | Vitest + Playwright |
| Baixa | Estoque e Serviços | Páginas de gestão de estoque e catálogo de serviços |

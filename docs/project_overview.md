# Beauty Hub - Documentação do Projeto

Este documento resume o estado atual do projeto Beauty Hub e sua estrutura SaaS.

## Objetivo
O Beauty Hub é um sistema de gestão completa para salões de beleza e estética, focado em alta performance (Vite) e design premium (Teal).

## Hierarquia de Acesso (Roles)
O sistema é dividido em 4 perfis de acesso distintos, garantindo segurança e organização:

### 1. Master (Super Admin)
- **Visão**: Global.
- **Permissões**: Vê todos os estabelecimentos, todos os administradores e métricas globais da plataforma.
- **Função**: Auditoria e controle total do sistema SaaS.

### 2. Administrador do Estabelecimento
- **Visão**: Seu próprio estabelecimento.
- **Permissões**: Gerencia cabeleireiros/profissionais, clientes do salão, financeiro e estoque.
- **Função**: Gestão do negócio local.

### 3. Profissional (Cabeleireiro/Manicure)
- **Visão**: Seus agendamentos e carteira de clientes.
- **Permissões**: Visualizar agenda, registrar serviços realizados, ver comissões.
- **Função**: Operacional do dia-a-dia.

### 4. Cliente Final
- **Visão**: App de agendamento (Futuro).
- **Função**: Agendar horários, ver histórico.

---

## Estrutura de Pastas (Vite + SaaS)
A estrutura segue o padrão modular para escalabilidade:

- `/src`
  - `/pages`: Contém as páginas HTML
    - `/auth`: Login e registro (`login.html`, `register.html`)
    - `/dashboard`: Páginas do painel (`professional.html`, `account.html`)
  - `/styles`: CSS modular
    - `main.css`: Design system e variáveis globais
    - `auth.css`: Estilos de autenticação
    - `dashboard.css`: Estilos do dashboard
    - `components.css`: **Componentes compartilhados** (dropdowns, modais, toggles)
  - `/scripts`: Lógica JavaScript (ES6 Modules)
    - `/components`: Componentes reutilizáveis (`sidebar.js`, `header.js`)
    - `/utils`: Utilitários compartilhados (`ui.js`)
  - `/assets`: Recursos estáticos como logos
- `/public`: Arquivos da raiz (`manifest.json` para PWA)
- `/docs`: Documentação do projeto
- `index.html`: Landing Page (Ponto de entrada)
- `vite.config.js`: Configuração do servidor de desenvolvimento

## Funcionalidades Atuais
1.  **Landing Page**: Apresentação da marca.
2.  **Autenticação**:
    - **Login**: Acesso unificado.
    - **Cadastro Multi-Perfil**: Seleção de Master, Estabelecimento ou Profissional.
3.  **Dashboard Profissional**:
    - Painel responsivo com menu lateral
    - Calendário de agendamentos
    - Estatísticas de ganhos
    - Visual "Lash Book" adaptado
4.  **Minha Conta**:
    - Gerenciamento de perfil
    - Configurações de segurança (Email, Senha, Telefone)
    - Métodos de pagamento
    - Preferências de notificações
5.  **Arquitetura de Componentes**:
    - Sistema modular com componentes reutilizáveis
    - Redução de ~350 linhas de código duplicado
    - ES6 Modules para melhor organização
6.  **PWA**: Preparado para instalação.

## Como Rodar
```bash
npm install
npm run dev
```

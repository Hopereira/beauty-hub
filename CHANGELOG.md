# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Fixed - 13/03/2026

#### Frontend — UX & Navegação
- **Redirect Tenant → Login**
  - Quando um tenant é detectado via subdomínio, `/` redireciona para `/login` ao invés da landing page
  - Arquivo: `src/core/router.js`

- **Toggle Mostrar/Esconder Senha**
  - Adicionado botão com ícone de olho nos inputs de senha em login e registro
  - Arquivos: `src/features/auth/pages/login.js`, `src/features/auth/pages/register.js`

- **Menu Hamburger Mobile**
  - Corrigidos touch handlers que impediam o menu lateral de abrir/fechar no mobile
  - Arquivo: `src/shared/components/shell/shell.js`

- **Modal CSS (Overflow/Scroll)**
  - Modal de criar profissional agora tem scroll quando o conteúdo excede a tela
  - Arquivo: `src/shared/styles/components.css`

- **Redirect Profissional para Área Própria**
  - Profissionais que acessam `/dashboard`, `/appointments` ou `/clients` são redirecionados automaticamente para `/professional/dashboard`, `/professional/appointments`, `/professional/clients`
  - Garante que profissional veja apenas seus próprios dados
  - Arquivo: `src/core/router.js`

#### Frontend — Dados & Mappers
- **Fix snake_case/camelCase nos Campos de Nome**
  - `handleLogin` e `recoverSession` agora leem tanto `first_name`/`last_name` (backend) quanto `firstName`/`lastName` (frontend)
  - Arquivo: `src/core/auth.js`

- **Fix Dropdown de Profissionais no Modal de Agendamento**
  - `mapProfessionalFromAPI` agora aceita tanto formato aninhado (`apiProf.user.first_name`) quanto achatado (`apiProf.first_name`, `apiProf.name`)
  - Antes mostrava specialty ao invés do nome do profissional
  - Arquivo: `src/shared/utils/api-mappers.js`

- **Fix Registro de Profissional Autônomo**
  - Frontend agora envia `first_name`, `last_name`, `salon_name` em snake_case e role em UPPERCASE (`PROFESSIONAL`, `ADMIN`) para o backend
  - Arquivo: `src/core/auth.js`

#### Backend — API & Controllers
- **CRUD Completo para Profissionais (`/api/professionals`)**
  - Adicionados endpoints `POST`, `PUT`, `DELETE` além do `GET` existente
  - `POST` cria User (role=professional) + Professional com senha padrão
  - `PUT` atualiza dados do User e Professional
  - `DELETE` soft-delete do profissional + desativa user
  - Arquivo: `backend/src/routes/owner/professionals.js`

- **Fix Dashboard do Profissional — Colunas Erradas**
  - Corrigido `Client.name` → `Client.first_name`/`Client.last_name` com `CONCAT`
  - Corrigido `Service.duration` → `Service.duration_minutes`
  - Corrigidos filtros de busca de clientes para usar `first_name`/`last_name`
  - Arquivo: `backend/src/controllers/professionalAreaController.js`

- **Fix Role Normalização no Registro**
  - Backend normaliza role para lowercase antes de salvar no PostgreSQL ENUM (`master`, `owner`, `admin`, `professional`, `client`)
  - Arquivo: `backend/src/controllers/authController.js`

#### Arquivos Modificados - 13/03/2026
1. `src/core/router.js` — Redirect tenant→login, redirect profissional→área própria
2. `src/core/auth.js` — snake_case/camelCase fix, registro com campos corretos
3. `src/features/auth/pages/login.js` — Toggle senha
4. `src/features/auth/pages/register.js` — Toggle senha
5. `src/shared/styles/components.css` — Modal overflow/scroll
6. `src/shared/utils/api-mappers.js` — mapProfessionalFromAPI aceita formato flat
7. `backend/src/routes/owner/professionals.js` — POST/PUT/DELETE endpoints
8. `backend/src/controllers/professionalAreaController.js` — Fix colunas
9. `backend/src/controllers/authController.js` — Normalização role lowercase

---

### Added - 01/03/2026

#### Landing Page de Vendas
- **Nova Landing Page Pública**
  - Hero section com call-to-action
  - Seção de funcionalidades do sistema (8 cards)
  - Seção de planos dinâmica (busca do banco de dados)
  - Formulário completo de cadastro público
  - Design responsivo com gradientes modernos
  - Arquivo: `src/features/public/landing/landing.js`
  - Estilos: `src/features/public/landing/landing.css`

#### Modal de Planos Refatorado
- **Checkboxes de Funcionalidades**
  - Substituído textarea por checkboxes interativos
  - 13 funcionalidades disponíveis (Agendamentos, Clientes, Notificações, etc.)
  - Cada funcionalidade com label e descrição
  - Seleção visual com hover effects
  - Salvamento correto como array de strings
  - Arquivo: `src/features/master/plans/master-plans.js`

#### APIs Públicas (Sem Autenticação)
- **Endpoint de Planos Públicos**
  - `GET /api/public/plans` - Lista planos ativos e públicos
  - Retorna preços, features, limites e trial days
  - Controller: `backend/src/modules/billing/controllers/public.controller.js`
  - Routes: `backend/src/modules/billing/routes/public.routes.js`

- **Endpoint de Registro Público**
  - `POST /api/public/register` - Cria novo tenant automaticamente
  - Gera slug baseado no nome do negócio
  - Cria tenant com subdomain (ex: `beleza-pura.beautyhub.com`)
  - Cria usuário owner com senha criptografada
  - Associa plano selecionado com período trial
  - Validações completas de dados
  - Service: `backend/src/modules/public/services/registration.service.js`
  - Controller: `backend/src/modules/public/controllers/registration.controller.js`
  - Routes: `backend/src/modules/public/routes/registration.routes.js`

#### Módulo Público
- **Novo Módulo Backend**
  - Módulo `public` para endpoints sem autenticação
  - Integração com módulos Tenants, Users e Billing
  - Arquivo: `backend/src/modules/public/index.js`
  - Registrado em `backend/src/modules/index.js`

### Added - 26/02/2026

#### Backend
- **Categorias de Serviços**
  - Campo `category` (VARCHAR 100) adicionado à tabela `services`
  - Nova tabela `service_categories` para gestão de categorias personalizadas
  - Migration `028_add_category_to_services.js`
  - Migration `030_create_service_categories.js`
  - Modelo `Service.js` atualizado com campo category

- **Integração Pagar.me**
  - Campos de pagamento adicionados à tabela `establishments`:
    - `payment_settings` (JSONB) - Configurações Pagar.me e split
    - `bank_account` (JSONB) - Dados bancários completos
    - `pagarme_recipient_id` (VARCHAR 255) - ID do recebedor
  - Migration `029_add_payment_fields_to_establishments.js`
  - Modelo `Establishment.js` atualizado

#### Frontend
- **Página Financeira Completa**
  - Gráficos interativos com Chart.js 4.4.0:
    - Gráfico de linha: Receitas vs Despesas (últimos 6 meses)
    - Gráfico de rosca: Distribuição por Categoria
  - Renderização automática e responsiva
  - Tooltips formatados com valores em R$
  - Atualização dinâmica ao aplicar filtros

- **Página de Onboarding SaaS**
  - Nova página `/onboarding` para OWNER escolher plano
  - Arquivo: `src/features/billing/pages/onboarding.js`
  - Estilos: `src/features/billing/styles/onboarding.css`
  - Exibição de planos com recursos e limites
  - Destaque para plano mais popular
  - Período de teste gratuito (14 dias)
  - Assinatura com um clique
  - Redirecionamento automático após assinatura

- **Configurações de Pagamento**
  - Seção completa na página `/settings` para dados Pagar.me:
    - API Key Pagar.me
    - Dados bancários (banco, agência, conta, dígitos)
    - Dados do titular (nome completo, CPF/CNPJ)
    - Tipo de conta (corrente, poupança, conjunta)
    - Antecipação automática
    - Recipient ID (somente leitura)
  - Função `savePaymentSettings()` para salvar via API
  - Validação de formulário

- **Rotas OWNER**
  - Adicionadas rotas no router:
    - `/inventory` - Gestão de estoque
    - `/suppliers` - Fornecedores
    - `/purchases` - Compras
    - `/reports` - Relatórios
  - Loaders configurados para lazy loading

#### Infraestrutura
- Chart.js 4.4.0 adicionado ao `index.html` via CDN
- Migrations executadas com sucesso no banco de dados

### Changed - 01/03/2026
- `index.html`: Adicionado CSS da landing page
- `src/core/router.js`: Rota `/` atualizada para carregar landing page pública
- `backend/src/app.multitenant.js`: Rotas públicas registradas
- `backend/src/modules/index.js`: Módulo público inicializado
- `backend/src/modules/billing/index.js`: Controller público adicionado
- `src/features/master/plans/master-plans.js`: Modal refatorado com checkboxes

### Changed - 26/02/2026
- `index.html`: Adicionado script Chart.js
- `src/core/router.js`: Rotas OWNER adicionadas
- `src/features/settings/pages/settings.js`: Seção Pagar.me completa
- `src/features/financial/pages/financial.js`: Gráficos Chart.js implementados
- `README.md`: Documentação atualizada com todas as novas funcionalidades

### Database Migrations
```
✅ 028_add_category_to_services: migrated (0.041s)
✅ 029_add_payment_fields_to_establishments: migrated (0.027s)
✅ 030_create_service_categories: migrated (0.057s)
```

### Technical Details

#### Novos Arquivos - 01/03/2026
1. `src/features/public/landing/landing.js`
2. `src/features/public/landing/landing.css`
3. `backend/src/modules/public/index.js`
4. `backend/src/modules/public/services/registration.service.js`
5. `backend/src/modules/public/controllers/registration.controller.js`
6. `backend/src/modules/public/routes/registration.routes.js`
7. `backend/src/modules/billing/controllers/public.controller.js`
8. `backend/src/modules/billing/routes/public.routes.js`

#### Novos Arquivos - 26/02/2026
1. `backend/src/migrations/028_add_category_to_services.js`
2. `backend/src/migrations/029_add_payment_fields_to_establishments.js`
3. `backend/src/migrations/030_create_service_categories.js`
4. `src/features/billing/pages/onboarding.js`
5. `src/features/billing/styles/onboarding.css`

#### Arquivos Modificados - 01/03/2026
1. `src/features/master/plans/master-plans.js`
2. `src/core/router.js`
3. `index.html`
4. `backend/src/app.multitenant.js`
5. `backend/src/modules/index.js`
6. `backend/src/modules/billing/index.js`
7. `backend/src/modules/billing/services/plan.service.js`

#### Arquivos Modificados - 26/02/2026
1. `backend/src/models/Service.js`
2. `backend/src/models/Establishment.js`
3. `src/core/router.js`
4. `src/features/settings/pages/settings.js`
5. `src/features/financial/pages/financial.js`
6. `index.html`
7. `README.md`

### Integration Points

#### Landing Page e Registro Público
Estrutura do formulário de cadastro:
```json
{
  "accountType": "establishment",
  "business": {
    "name": "Salão Beleza Pura",
    "cnpj": "00.000.000/0000-00",
    "phone": "(11) 99999-9999",
    "email": "contato@salaobel ezapura.com.br"
  },
  "address": {
    "cep": "00000-000",
    "street": "Rua das Flores",
    "number": "123",
    "complement": "Sala 1",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP"
  },
  "owner": {
    "name": "João Silva",
    "cpf": "000.000.000-00",
    "email": "joao@email.com",
    "phone": "(11) 99999-9999",
    "password": "senha123"
  },
  "planId": "uuid-do-plano"
}
```

Funcionalidades disponíveis para checkboxes:
- Agendamentos
- Cadastro de Clientes
- Notificações
- Gestão Financeira
- Relatórios
- Gestão de Profissionais
- Controle de Estoque
- Gestão de Fornecedores
- Controle de Compras
- Marca Personalizada
- Múltiplas Unidades
- Analytics Avançado
- Acesso à API

#### Pagar.me Split Payments
A estrutura de dados bancários segue o padrão da API Pagar.me:
```json
{
  "bank_account": {
    "bank_code": "001",
    "account_type": "conta_corrente",
    "agencia": "0001",
    "agencia_dv": "9",
    "conta": "12345",
    "conta_dv": "6",
    "legal_name": "Nome Completo",
    "document_number": "12345678901"
  },
  "payment_settings": {
    "pagarme_api_key": "sk_test_...",
    "automatic_anticipation": true
  }
}
```

#### Chart.js Configuration
- Tipo de gráfico de receitas: `line` com `tension: 0.4`
- Tipo de gráfico de categorias: `doughnut`
- Cores personalizadas seguindo o design system
- Responsivo com `maintainAspectRatio: true`

### Next Steps
- [x] Landing page de vendas completa
- [x] API pública de planos
- [x] API de registro com criação automática de tenant
- [x] Modal de planos com checkboxes de funcionalidades
- [ ] Implementar envio de email de boas-vindas após registro
- [ ] Adicionar verificação de email
- [ ] Implementar endpoint backend para criar recipient no Pagar.me
- [ ] Implementar split de pagamentos em transações
- [ ] Adicionar validação de dados bancários
- [ ] Criar testes para novos endpoints
- [ ] Documentar API de configurações de pagamento

---

## [1.0.0] - 2026-02-25

### Added
- Arquitetura Multi-Tenant SaaS completa
- Sistema de billing com planos e assinaturas
- Self-signup com trial automático
- Integração Pagar.me (PIX, cartão, boleto)
- LGPD Compliance (data export, anonymization)
- Webhook resilience (idempotency, DLQ, retry)
- Brute force protection

### Changed
- Refatoração completa do backend para arquitetura modular
- Implementação de RBAC hierárquico
- BaseRepository com escopo automático por tenant

---

**Desenvolvido com 💙 para profissionais de beleza**

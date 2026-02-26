# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

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

### Changed
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

#### Novos Arquivos
1. `backend/src/migrations/028_add_category_to_services.js`
2. `backend/src/migrations/029_add_payment_fields_to_establishments.js`
3. `backend/src/migrations/030_create_service_categories.js`
4. `src/features/billing/pages/onboarding.js`
5. `src/features/billing/styles/onboarding.css`

#### Arquivos Modificados
1. `backend/src/models/Service.js`
2. `backend/src/models/Establishment.js`
3. `src/core/router.js`
4. `src/features/settings/pages/settings.js`
5. `src/features/financial/pages/financial.js`
6. `index.html`
7. `README.md`

### Integration Points

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

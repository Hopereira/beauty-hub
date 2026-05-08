# ⚖️ LGPD AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** 🟡 PARCIAL — Funcionalidades básicas implementadas, gaps em processos  
**Legislação:** Lei 13.709/2018 (LGPD)

---

## 📊 RESUMO EXECUTIVO

| Requisito LGPD | Status | Implementação |
|----------------|--------|---------------|
| **Transparência (Art. 6º)** | 🟢 Sim | Política de Privacidade existe |
| **Finalidade (Art. 7º)** | 🟡 Parcial | Consentimento não explícito |
| **Necessidade (Art. 7º, §3º)** | 🟢 Sim | Apenas dados necessários |
| **Qualidade (Art. 8º)** | 🟢 Sim | Atualização permitida |
| **Segurança (Art. 46)** | 🟡 Parcial | Falta criptografia em repouso |
| **Prevenção (Art. 46, §1º)** | 🟢 Sim | Brute force, rate limiting |
| **Acesso (Art. 18, II)** | 🟢 Sim | Exportação de dados implementada |
| **Retificação (Art. 18, III)** | 🟢 Sim | Perfil editável |
| **Exclusão (Art. 18, VI)** | 🟡 Parcial | Solicitação implementada, processamento manual |
| **Portabilidade (Art. 18, V)** | 🟡 Parcial | Export JSON, não padronizado |
| **Consentimento (Art. 7º)** | 🔴 Não | Checkbox ausente no registro |
| **Revogação (Art. 8º, §5º)** | 🔴 Não | Não implementado |
| **Encarregado (DPO)** | 🔴 Não | Contato não configurado |
| **Relatório de Impacto (RIPD)** | 🔴 Não | Não documentado |
| **Incidentes** | 🔴 Não | Sem plano de comunicação |

**Conclusão:** A infraestrutura técnica para LGPD está parcialmente implementada (exportação e exclusão de dados). Falta: consentimento explícito, DPO designado, e processos documentados para violações.

---

## 🗂️ ESTRUTURA LGPD NO SISTEMA

### Módulo LGPD

**Localização:** `backend/src/modules/lgpd/`

```
lgpd/
├── index.js              # Module initialization
├── lgpd.controller.js    # HTTP endpoints
├── lgpd.service.js       # Business logic
├── lgpd.routes.js        # Route definitions
└── lgpd.validation.js    # Joi schemas
```

### Endpoints LGPD

```
GET  /api/lgpd/export       # Exportar dados pessoais (Art. 18, II)
POST /api/lgpd/delete-request  # Solicitar exclusão (Art. 18, VI)
```

### Tabela de Deleção

**Migration:** `035_create_lgpd_deletion_requests.js`

```sql
lgpd_deletion_requests:
├── id (UUID PK)
├── tenant_id (FK → tenants)
├── user_id (FK → users)
├── email                  # Email do usuário
├── reason                 # Motivo da solicitação
├── status                 # pending/completed/rejected
├── requested_at           # Data da solicitação
└── processed_at           # Data do processamento
```

---

## 📋 ANÁLISE POR ARTIGO

### Art. 18 — Direitos do Titular

#### II — Confirmação e Acesso (Exportação)

**Implementação:**
```javascript
// lgpd.service.js:23-64
async exportUserData(tenantId, userId) {
  const user = await User.findOne({
    where: { id: userId, tenant_id: tenantId },
    attributes: { exclude: ['password_hash'] },  // ✅ Segurança
  });

  const appointmentsAsPro = await Appointment.findAll({
    where: { tenant_id: tenantId, professional_id: userId },
  });

  const clientRecord = await Client.findOne({
    where: { tenant_id: tenantId, email: user.email },
  });

  return {
    exportedAt: new Date().toISOString(),
    legalBasis: 'Art. 18 II - Lei 13.709/2018 (LGPD)',  // ✅
    data: {
      profile: user.toJSON(),
      appointmentsAsProfessional: appointmentsAsPro.map(a => a.toJSON()),
      appointmentsAsClient: appointmentsAsClient.map(a => a.toJSON()),
    },
  };
}
```

**Avaliação:**
- ✅ Exporta dados em formato legível (JSON)
- ✅ Exclui campos sensíveis (password_hash)
- ✅ Identifica base legal
- ✅ Inclui timestamp
- ⚠️ Não inclui: logs de acesso, dados de pagamento, histórico de notificações
- ⚠️ Formato não padronizado (não segue especificação ANPD)

#### VI — Exclusão dos Dados

**Implementação:**
```javascript
// lgpd.service.js:73-98
async requestDataDeletion(tenantId, userId, reason = '') {
  // Cria registro de solicitação
  const [request] = await this.sequelize.query(
    `INSERT INTO lgpd_deletion_requests
      (id, tenant_id, user_id, email, reason, status, requested_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET reason = EXCLUDED.reason,
           status = 'pending',
           requested_at = NOW()
     RETURNING *`,
    { bind: [tenantId, userId, user.email, reason] }
  );

  return request;
}
```

**Processo:**
1. Usuário solicita exclusão via endpoint
2. Sistema cria registro com status 'pending'
3. ⚠️ **Processamento é MANUAL** (não automatizado)
4. Admin (MASTER) deve executar deleção e atualizar status

**Problemas:**
- Sem automação do processo
- Sem SLA definido (prazo para exclusão)
- Sem confirmação de deleção ao usuário
- Sem verificação de obrigações legais (ex: notas fiscais devem ser retidas)

**Recomendação:**
```javascript
// Adicionar job para processamento automático
async processDataDeletion(requestId) {
  const request = await this.getDeletionRequest(requestId);
  
  // 1. Anonimizar dados que devem ser retidos (fiscal)
  await this.anonymizeFinancialData(request.userId);
  
  // 2. Deletar dados que podem ser removidos
  await this.deletePersonalData(request.userId);
  
  // 3. Notificar usuário
  await this.notifyUser(request.email, 'deletion_completed');
  
  // 4. Atualizar status
  await this.updateStatus(requestId, 'completed');
}
```

#### III — Retificação

**Implementação:** Indireta via Profile
```javascript
// users/user.controller.js
async updateProfile(req, res) {
  // Usuário pode atualizar: nome, telefone, avatar
  // Não pode atualizar: email (identificador único)
}
```

**Avaliação:**
- ✅ Campos pessoais editáveis
- ⚠️ Email não pode ser alterado (bloqueia retificação de email incorreto)

---

## 🛡️ BASE LEGAL E CONSENTIMENTO

### Art. 7º — Base Legal

**Situação Atual:**
```javascript
// Registro de usuário (auth.js)
// NÃO há checkbox de consentimento LGPD

handleRegister({
  name, email, password, role,
  // consent: true  // ❌ NÃO EXISTE
});
```

**Problema:**
- Não há evidência de consentimento do usuário
- Não há registro de quando/how o consentimento foi dado
- Não há versão dos termos aceitos

**Recomendação:**
```javascript
// Adicionar ao registro
const registerSchema = Joi.object({
  // ... campos existentes
  lgpd_consent: Joi.boolean().valid(true).required(),
  lgpd_consent_version: Joi.string().required(),  // ex: "2024-01-15"
});

// Salvar no banco
await User.create({
  // ... dados
  lgpd_consent_at: new Date(),
  lgpd_consent_version: data.lgpd_consent_version,
  lgpd_terms_accepted: true,
});
```

### Termos de Uso e Política de Privacidade

**Frontend:**
```
src/features/public/
├── privacy-policy.js       # ✅ Política de Privacidade
├── terms-of-service.js     # ✅ Termos de Serviço
├── data-deletion.js        # ✅ Formulário de exclusão
```

**Avaliação:**
- ✅ Páginas existem
- ⚠️ Não verificado se texto está atualizado
- ⚠️ Não há versionamento visível
- ⚠️ Não há data da última atualização

**Recomendação:**
```javascript
// Adicionar versão e data
const PRIVACY_POLICY_VERSION = '1.0.0';
const PRIVACY_POLICY_DATE = '2024-01-15';

// Mostrar no rodapé
footer.innerHTML = `
  <p>Política de Privacidade v${PRIVACY_POLICY_VERSION} 
     (atualizada em ${PRIVACY_POLICY_DATE})</p>
`;
```

---

## 🔒 SEGURANÇA E DADOS

### Criptografia

| Dado | Em Trânsito | Em Repouso |
|------|--------------|--------------|
| Senhas | HTTPS (TLS 1.3) | bcrypt (10 rounds) |
| Tokens JWT | HTTPS | N/A (stateless) |
| Dados pessoais | HTTPS | ⚠️ **Não criptografado** |
| Banco | SSL Required | PostgreSQL nativo |

**Problema:**
- Não há criptografia de campos sensíveis no banco (ex: CPF, telefone)
- Se database for comprometido, dados em texto claro são lidos

**Recomendação (para dados sensíveis):**
```javascript
// Usar criptografia de coluna
const { encrypt, decrypt } = require('../utils/encryption');

const User = sequelize.define('User', {
  cpf: {
    type: DataTypes.STRING,
    set(value) {
      this.setDataValue('cpf', encrypt(value));
    },
    get() {
      return decrypt(this.getDataValue('cpf'));
    },
  },
});
```

### Logs e Rastreabilidade

**Login Attempts:**
```sql
-- Tabela login_attempts já registra:
- identifier (email/IP)
- success/failure
- ip_address
- user_agent
- created_at
```

**Auditoria de Dados:**
```javascript
// ❌ NÃO IMPLEMENTADO
// Não há tabela de audit_logs para:
// - Quem acessou dados de qual usuário
// - Quando dados foram alterados
// - Quem exportou/deletou dados
```

**Recomendação:**
```javascript
// audit.service.js
async logAccess({ userId, action, resource, resourceId, metadata }) {
  await AuditLog.create({
    user_id: userId,
    action,  // 'read', 'update', 'delete', 'export'
    resource, // 'user', 'client', 'appointment'
    resource_id: resourceId,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    metadata,
    created_at: new Date(),
  });
}
```

---

## 📧 COMUNICAÇÃO

### Notificações aos Titulares

**Ausente:**
- Email de confirmação de registro (com link de verificação)
- Email de alteração de senha
- Email de exportação de dados concluída
- Email de confirmação de exclusão de dados

**Implementação Sugerida:**
```javascript
// Integração com Resend/SendGrid
class NotificationService {
  async sendDataExportComplete(email, downloadLink) {
    await this.sendEmail({
      to: email,
      subject: 'Seus dados estão prontos para download',
      template: 'data-export-complete',
      data: { downloadLink, expiresIn: '24h' },
    });
  }
}
```

### Encarregado (DPO)

**Ausente:**
- Não há email de contato do DPO
- Não há seção "Fale conosco" LGPD
- Não há canal específico para titulares

**Recomendação:**
```javascript
// Adicionar às páginas públicas
const DPO_CONTACT = {
  email: 'dpo@biaxavier.com.br',
  name: 'Data Protection Officer',
  address: 'Rua ..., São Paulo, SP',
};

// Mostrar em /privacy-policy
```

---

## 🚨 VIOLAÇÃO DE DADOS (INCIDENTES)

### Plano de Resposta

**Ausente:**
- Sem procedimento documentado para detecção
- Sem procedimento para contenção
- Sem comunicação à ANPD (autoridade)
- Sem comunicação aos titulares afetados

**Requisitos Legais:**
- Comunicar ANPD em até 72 horas (quando houver risco relevante)
- Comunicar titulares quando necessário

**Recomendação:**
```javascript
// incident-response.js
class IncidentResponseService {
  async reportIncident({ severity, affectedUsers, description }) {
    // 1. Log incident
    const incident = await Incident.create({
      severity,  // 'low', 'medium', 'high', 'critical'
      status: 'detected',
      affected_users: affectedUsers,
      description,
      detected_at: new Date(),
    });

    // 2. Alertar equipe
    await this.alertTeam(incident);

    // 3. Se alto risco, iniciar comunicação
    if (['high', 'critical'].includes(severity)) {
      await this.initiateANPDCommunication(incident);
      await this.initiateUserCommunication(affectedUsers);
    }

    return incident;
  }
}
```

---

## 📊 RELATÓRIO DE IMPACTO (RIPD)

**Ausente:**
- Não há documento de RIPD
- Não há análise de riscos
- Não há medidas de mitigação documentadas

**Recomendação:** Criar documento com:
1. Descrição do tratamento de dados
2. Necessidade e proporcionalidade
3. Análise de riscos
4. Medidas de mitigação
5. Consulta aos interessados (se aplicável)

---

## ✅ CHECKLIST DE CONFORMIDADE

### Implementado ✅
- [x] Exportação de dados (Art. 18, II)
- [x] Solicitação de exclusão (Art. 18, VI)
- [x] Retificação de dados (parcial)
- [x] Segurança da informação (parcial)
- [x] Política de Privacidade (página existe)
- [x] Termos de Serviço (página existe)
- [x] SSL/TLS em trânsito

### Parcial ⚠️
- [ ] Consentimento explícito (não registrado)
- [ ] Processamento automático de exclusão
- [ ] Anonimização de dados retidos
- [ ] Auditoria de acessos
- [ ] Notificações ao titular

### Ausente ❌
- [ ] Checkbox de consentimento LGPD no registro
- [ ] Versionamento de termos aceitos
- [ ] Designação de DPO
- [ ] Canal de comunicação LGPD
- [ ] Criptografia de dados sensíveis em repouso
- [ ] Logs de auditoria de acessos
- [ ] Plano de resposta a incidentes
- [ ] RIPD documentado
- [ ] Comunicação automática à ANPD (em caso de incidente)

---

## 🛠️ ROADMAP LGPD

### Sprint 1 — Consentimento (2 semanas)

**[LGPD-001] Checkbox de Consentimento**
```javascript
// Register page
<label>
  <input type="checkbox" name="lgpd_consent" required>
  Concordo com a <a href="/privacy-policy">Política de Privacidade</a>
  e <a href="/terms-of-service">Termos de Serviço</a> v1.0.0
</label>
```

**[LGPD-002] Salvar Versão dos Termos**
```sql
ALTER TABLE users 
ADD COLUMN lgpd_consent_at TIMESTAMP,
ADD COLUMN lgpd_consent_version VARCHAR(10);
```

### Sprint 2 — Processo de Exclusão (2 semanas)

**[LGPD-003] Job de Processamento Automático**
```javascript
// jobs/lgpdDeletion.job.js
// Processar diariamente requests pendentes
// Anonimizar dados fiscais
// Deletar dados pessoais
// Notificar usuário
```

**[LGPD-004] Anonimização de Dados Retidos**
```javascript
// Para notas fiscais/relatórios fiscais:
// Manter: valor, data, categoria
// Anonimizar: nome do cliente → "CLIENTE_REMOVIDO_[ID_HASH]"
```

### Sprint 3 — Auditoria (2 semanas)

**[LGPD-005] Tabela de Audit Logs**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50),  -- 'read', 'update', 'delete', 'export'
  resource VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**[LGPD-006] Log de Acessos em Serviços**
```javascript
// Adicionar em todos os services
await auditService.log({
  userId: req.user.id,
  action: 'read',
  resource: 'client',
  resourceId: client.id,
  ip: req.ip,
});
```

### Sprint 4 — Documentação (2 semanas)

**[LGPD-007] Designação de DPO**
- Criar email dpo@biaxavier.com.br
- Adicionar à política de privacidade
- Criar formulário de contato

**[LGPD-008] RIPD Básico**
- Documentar fluxo de dados
- Identificar riscos
- Descrever mitigações

**[LGPD-009] Plano de Resposta a Incidentes**
- Procedimento de detecção
- Escalonamento
- Comunicação à ANPD (template)
- Comunicação aos titulares (template)

---

## 📄 MODELOS DE DOCUMENTOS

### Notificação de Incidente à ANPD (Template)

```
PARA: [Autoridade Nacional de Proteção de Dados]
DE: [DPO BeautyHub]
DATA: [Data]
ASSUNTO: Notificação de Incidente de Segurança

1. DESCRIÇÃO DO INCIDENTE
   - Data/hora de detecção:
   - Tipo de incidente:
   - Sistemas afetados:

2. DADOS PESSOAIS ENVOLVIDOS
   - Categorias:
   - Quantidade estimada de titulares:

3. MEDIDAS ADOTADAS
   - Contenção:
   - Investigação:
   - Correção:

4. COMUNICAÇÃO AOS TITULARES
   - Será realizada em: [data]
   - Canal: [email/app]

5. CONTATO
   - DPO: dpo@biaxavier.com.br
   - Telefone: [número]
```

---

## 🧪 VERIFICAÇÃO DE CONFORMIDADE

```bash
# Verificar se há consentimento de usuários
SELECT COUNT(*) FROM users WHERE lgpd_consent_at IS NOT NULL;
# Esperado: 0 (atualmente)

# Verificar solicitações de exclusão pendentes
SELECT COUNT(*) FROM lgpd_deletion_requests WHERE status = 'pending';

# Verificar se há audit logs
SELECT COUNT(*) FROM audit_logs;
# Esperado: 0 (atualmente)

# Verificar criptografia de colunas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' 
AND data_type = 'bytea';  -- Colunas criptografadas
# Esperado: 0 (atualmente)
```

---

## 📞 CONTATOS E RECURSOS

### Autoridade Nacional de Proteção de Dados (ANPD)
- Site: https://www.gov.br/anpd/
- Email: atendimento@anpd.gov.br

### Recursos Úteis
- [Guia de Boas Práticas LGPD](https://www.gov.br/anpd/pt-br/documentos/guia-de-boas-praticas)
- [Relatório de Impacto (template ANPD)](https://www.gov.br/anpd/pt-br/documentos/ripd)

---

*Auditoria concluída em 08/05/2026. Análise baseada em código e legislação vigente.*

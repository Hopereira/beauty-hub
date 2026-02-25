# Frontend API Migration Guide

Migração do frontend de localStorage para API REST real com JWT.

## Arquivos Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/core/config.js` | + tenant slug, subscription status, USER_KEY |
| `src/core/auth.js` | Reescrito para usar API real |
| `src/core/state.js` | + subscription state management |
| `src/core/router.js` | + global HTTP event handlers |
| `src/core/index.js` | + novos exports |
| `src/shared/utils/http.js` | Reescrito com JWT refresh, tenant header |
| `src/features/auth/pages/login.js` | + async/await, loading state |

## Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `src/shared/components/subscription-banner/` | Banner de aviso de assinatura |

---

## Principais Mudanças

### 1. HTTP Client (`http.js`)

```javascript
// Antes
const response = await fetch(url, config);

// Depois - com auto-refresh, tenant header, error handling
import { api } from '../shared/utils/http.js';

const data = await api.get('/clients');
const data = await api.post('/clients', { name: 'João' });
```

**Features:**
- `Authorization: Bearer <token>` automático
- `X-Tenant-Slug` header automático
- Auto-refresh de token em 401
- Event bus para erros globais (unauthorized, subscriptionInactive, networkError)
- Classes de erro: `ApiError`, `AuthError`, `SubscriptionError`

### 2. Auth Module (`auth.js`)

```javascript
// Antes (síncrono, localStorage)
const result = handleLogin(email, password);

// Depois (assíncrono, API real)
const result = await handleLogin(email, password, tenantSlug);
```

**Novas funções:**
- `recoverSession()` - Recupera sessão de tokens salvos
- `requestPasswordReset(email)` - Solicita reset de senha
- `resetPassword(token, newPassword)` - Reset com token

### 3. State Module (`state.js`)

**Novas funções de subscription:**
```javascript
import { 
    getSubscriptionStatus,
    isSubscriptionActive,
    isSubscriptionBlocked,
    getSubscriptionMessage,
    shouldShowSubscriptionBanner,
} from './core/index.js';
```

### 4. Router (`router.js`)

**Global error handling:**
```javascript
// 401 → redirect para /login
// 403 (subscription) → toast de aviso
// Network error → toast de erro
```

---

## Tenant Multi-tenancy

O tenant é resolvido automaticamente:
1. **Subdomínio**: `beleza-pura.beautyhub.com` → `beleza-pura`
2. **Header**: `X-Tenant-Slug: beleza-pura`
3. **localStorage**: `bh_tenant_slug`

```javascript
import { getTenantSlug, setTenantSlug } from './core/config.js';

// Definir tenant (após seleção ou login)
setTenantSlug('beleza-pura');

// Obter tenant atual
const slug = getTenantSlug();
```

---

## Subscription Banner

Adicionar ao shell/layout:

```javascript
import { initSubscriptionBanner } from '../shared/components/subscription-banner/subscription-banner.js';
import '../shared/components/subscription-banner/subscription-banner.css';

// No init do shell
initSubscriptionBanner();
```

---

## Credenciais de Teste

```
# MASTER (sem tenant)
Email: master@beautyhub.com
Senha: 123456

# OWNER (tenant: beleza-pura)
Email: owner@belezapura.com
Senha: 123456
Tenant: beleza-pura
```

---

## Rollback Strategy

### Opção 1: Git Revert
```bash
git stash  # Salvar mudanças locais
git checkout HEAD~1 -- src/core/ src/shared/utils/http.js
git stash pop  # Restaurar mudanças locais se necessário
```

### Opção 2: Fallback Manual

1. Em `auth.js`, descomente a implementação localStorage:
```javascript
// Substituir handleLogin por versão localStorage
export function handleLogin(email, password) {
    const users = getCollection(KEYS.USERS);
    const user = users.find(u => u.email === email && u.password === password);
    // ... resto do código original
}
```

2. Em `http.js`, remover refresh logic e usar versão simples

### Opção 3: Feature Flag

```javascript
// config.js
export const USE_API = import.meta.env.VITE_USE_API === 'true';

// auth.js
import { handleLogin as apiLogin } from './auth-api.js';
import { handleLogin as localLogin } from './auth-local.js';

export const handleLogin = USE_API ? apiLogin : localLogin;
```

---

## Checklist de Migração

- [x] `config.js` - Tenant slug, subscription status
- [x] `http.js` - JWT refresh, tenant header, error classes
- [x] `auth.js` - Login/register/logout via API
- [x] `state.js` - Subscription state
- [x] `router.js` - Global error handlers
- [x] `login.js` - Async/await
- [x] Subscription banner component
- [ ] `register.js` - Async/await
- [ ] `clients/` - Migrar para API
- [ ] `appointments/` - Migrar para API
- [ ] `financial/` - Migrar para API
- [ ] `dashboard/` - Migrar para API

---

## Próximos Passos

### Migrar módulos CRUD

```javascript
// clients.js - Exemplo
import { api } from '../../../shared/utils/http.js';

// Antes (localStorage)
const clients = getCollection(KEYS.CLIENTS);

// Depois (API)
const response = await api.get('/clients');
const clients = response.data;
```

### Endpoints Backend

| Recurso | GET | POST | PUT | DELETE |
|---------|-----|------|-----|--------|
| /clients | ✓ | ✓ | ✓ | ✓ |
| /appointments | ✓ | ✓ | ✓ | ✓ |
| /financial | ✓ | ✓ | ✓ | ✓ |
| /services | ✓ | ✓ | ✓ | ✓ |
| /professionals | ✓ | ✓ | ✓ | ✓ |

---

## Troubleshooting

### CORS Error
```
Access to fetch at 'http://localhost:8080/api/...' has been blocked by CORS
```
**Solução:** Verificar `CORS_ORIGIN` no backend `.env`

### 401 Loop
```
Requisição → 401 → Refresh → 401 → Loop
```
**Solução:** Verificar se refresh token está válido, limpar localStorage

### Tenant Not Found
```
{ "error": { "code": "TENANT_NOT_FOUND" } }
```
**Solução:** Verificar `X-Tenant-Slug` header ou subdomínio

---

## Variáveis de Ambiente

```env
# Frontend (.env)
VITE_API_URL=/api

# Backend (.env)
CORS_ORIGIN=http://localhost:8080
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

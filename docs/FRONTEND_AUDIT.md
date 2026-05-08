# 💻 FRONTEND AUDIT — BeautyHub SaaS
**Data:** 08 de Maio de 2026  
**Auditor:** Cascade AI  
**Status:** 🟡 BOM — Funcional, com vulnerabilidades de segurança conhecidas  
**Stack:** Vite 5 + Vanilla JS (ES6 Modules), SPA arquitetura

---

## 📊 RESUMO EXECUTIVO

| Aspecto | Status | Notas |
|---------|--------|-------|
| **Arquitetura SPA** | 🟢 Excelente | Router próprio, lazy loading, modular |
| **Bundle Size** | 🟢 Bom | Vite com tree-shaking |
| **Autenticação** | 🟡 Regular | Tokens em localStorage (vulnerável a XSS) |
| **Multi-Tenant** | 🟢 Bom | Subdomain detection + localStorage fallback |
| **UX/UI** | 🟢 Bom | Toast notifications, loading states, modal system |
| **Acessibilidade** | 🟡 Regular | Aria labels ausentes em alguns componentes |
| **Responsividade** | 🟢 Bom | Mobile-first CSS, breakpoints bem definidos |
| **Tratamento de Erro** | 🟡 Regular | HTTP error handling global, mas falhas silenciosas |
| **Performance** | 🟡 Regular | Sem Service Worker, sem lazy loading de imagens |
| **Segurança** | 🔴 Crítico | CSP desativada, tokens expostos |

**Conclusão:** O frontend é bem estruturado como SPA modular, mas tem vulnerabilidades de segurança críticas (CSP desativada, tokens em localStorage) que precisam de atenção imediata.

---

## 🏗️ ARQUITETURA

### Estrutura de Diretórios

```
src/
├── main.js                 # Entry point, inicialização
├── index.html              # SPA shell
├── vite.config.js          # Build configuration
├── core/                   # Núcleo da aplicação
│   ├── router.js           # Client-side routing (36 rotas)
│   ├── state.js            # Global state management
│   ├── auth.js             # Authentication logic
│   └── config.js           # Constants, tenant slug detection
├── shared/                 # Componentes e utilidades compartilhadas
│   ├── components/         # Shell, Modal, Subscription Banner
│   ├── styles/             # CSS global, variáveis
│   └── utils/              # HTTP, validation, formatting, toast
└── features/               # Módulos de negócio (21 features)
    ├── auth/               # Login, register
    ├── dashboard/          # Dashboard com calendário
    ├── appointments/       # CRUD agendamentos
    ├── clients/            # CRUD clientes
    ├── services/           # CRUD serviços
    ├── professionals/      # CRUD profissionais
    ├── financial/          # Financeiro
    ├── billing/            # Assinatura
    ├── professional/       # Área do profissional (7 páginas)
    ├── master/             # Área master (5 páginas)
    ├── public/             # Landing page SaaS
    └── beatriz/            # Landing page Ana Beatriz Xavier
```

### Router Analysis

**Arquivo:** `src/core/router.js`

```javascript
// 36 rotas definidas
const routes = {
  '/': { title: 'Beauty Hub', page: 'landing', auth: false },
  '/login': { title: 'Entrar - Beauty Hub', page: 'login', auth: false },
  '/dashboard': { title: 'Dashboard - Beauty Hub', page: 'dashboard', auth: true },
  '/appointments': { title: 'Agendamentos - Beauty Hub', page: 'appointments', auth: true },
  // ... 33 rotas adicionais
};

// Lazy loading implementation
async function loadPageModule(page) {
  const moduleMap = {
    'landing': () => import('../features/public/landing/landing.js'),
    'login': () => import('../features/auth/pages/login.js'),
    // ... mapa completo
  };
}
```

**Avaliação:**
- ✅ Lazy loading por feature reduz bundle inicial
- ✅ Route guards (auth, role) implementados
- ⚠️ Não há prefetch de rotas comuns
- ⚠️ Não há code splitting por rota dinâmica

---

## 🔐 AUTENTICAÇÃO E SEGURANÇA

### Tokens em localStorage (Vulnerabilidade)

**Arquivo:** `src/core/config.js:20-23`

```javascript
// Auth token keys
export const TOKEN_KEY = 'bh_access_token';
export const REFRESH_TOKEN_KEY = 'bh_refresh_token';
export const USER_KEY = 'bh_user';
export const TENANT_KEY = 'bh_tenant_slug';
```

**Arquivo:** `src/shared/utils/http.js:58-82`

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY); // ⚠️ Vulnerável a XSS
  
  const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    throw new AuthError('Sessão expirada');
  }

  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, newToken); // ⚠️ Armazena novo token
}
```

**Risco:**
- Qualquer script pode acessar `localStorage.getItem('bh_access_token')`
- XSS permite roubo de tokens persistentes
- Refresh token também exposto

**Mitigações Existentes:**
- Token expira em 1h (access), 7d (refresh)
- Refresh token rotation (novo refresh token a cada uso)
- Auto-logout em 401

**Correção Recomendada:**
```javascript
// Migrar para cookies httpOnly (requer mudança backend)
// Backend deve setar:
// Set-Cookie: access_token=xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=3600

// Frontend usar credentials: 'include'
fetch('/api/protected', {
  credentials: 'include' // envia cookies automaticamente
});
```

### Tenant Detection

**Arquivo:** `src/core/config.js:29-44`

```javascript
export function getTenantSlug() {
  // Try subdomain first
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // For .com.br (2-part TLD) need >= 4 parts
  const isMultiPartTLD = parts.length >= 2 && ['com.br', 'org.br', 'net.br'].includes(
    parts.slice(-2).join('.')
  );
  const minParts = isMultiPartTLD ? 4 : 3;
  
  if (parts.length >= minParts) {
    const sub = parts[0].toLowerCase();
    if (!RESERVED_SLUGS.includes(sub)) {
      return sub;
    }
  }
  
  // Fallback to localStorage
  return localStorage.getItem(TENANT_KEY) || null;
}
```

**Avaliação:**
- ✅ Suporte a .com.br e domínios internacionais
- ✅ Reserved slugs protegidos
- ✅ Fallback para localStorage
- ⚠️ Tenant slug em localStorage pode ser manipulado

---

## 📡 HTTP CLIENT

### Implementação do HTTP Client

**Arquivo:** `src/shared/utils/http.js`

```javascript
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const { skipAuth, skipTenant, retry, ...fetchOptions } = options;

  const token = localStorage.getItem(TOKEN_KEY);
  const tenantSlug = getTenantSlug();

  const headers = {
    'Content-Type': 'application/json',
    ...(!skipAuth && token && { Authorization: `Bearer ${token}` }),
    ...(!skipTenant && tenantSlug && { 'X-Tenant-Slug': tenantSlug }),
    ...fetchOptions.headers,
  };
  // ...
}

// Token refresh queue
let isRefreshing = false;
let refreshSubscribers = [];

export async function apiRequest(endpoint, options = {}) {
  try {
    return await request(endpoint, options);
  } catch (error) {
    if (error.status === 401 && !options.retry) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);
      }
      // Queue request until token refreshed
      return new Promise((resolve) => {
        addRefreshSubscriber((token) => {
          resolve(request(endpoint, { ...options, retry: true }));
        });
      });
    }
    throw error;
  }
}
```

**Avaliação:**
- ✅ Refresh token automático
- ✅ Queue de requests durante refresh
- ✅ Tenant header automático
- ⚠️ Sem retry em network errors
- ⚠️ Sem timeout configurado

### Event Bus para Erros Globais

```javascript
const httpEventListeners = {
  unauthorized: [],
  subscriptionInactive: [],
  networkError: [],
};

export function onHttpEvent(event, callback) {
  if (httpEventListeners[event]) {
    httpEventListeners[event].push(callback);
  }
}
```

**Uso:**
```javascript
// router.js:262-284
onHttpEvent('unauthorized', () => {
  showToast('Sessão expirada. Faça login novamente.', 'warning');
  logout();
  navigateTo('/login', true);
});
```

---

## 🎨 UI/UX ANALYSIS

### Component System

#### Modal Component
**Arquivo:** `src/shared/components/modal/`
```javascript
// createModal({ title, content, onConfirm, onCancel })
// - Backdrop click para fechar
// - ESC key para fechar
// - Focus trap (não implementado)
// - ARIA labels (parcial)
```

#### Toast Notifications
**Arquivo:** `src/shared/utils/toast.js`
```javascript
export function showToast(message, type = 'info', duration = 3000) {
  // Toast container fixed position
  // Auto-dismiss após duration
  // 4 tipos: info, success, warning, error
}
```

### Loading States

```javascript
// patterns comuns encontrados:
// 1. Inline loading em botões
// 2. Skeleton screens (não implementado)
// 3. Full page loading (não implementado)
// 4. Spinner em tabelas (parcial)
```

### Acessibilidade (A11y)

**Problemas Encontrados:**
```html
<!-- Botões sem aria-label -->
<button onclick="closeModal()">X</button>

<!-- Inputs sem label associado -->
<input type="email" placeholder="Email">

<!-- Cores sem contraste suficiente -->
<!-- Primary color #20B2AA pode ter baixo contraste em fundos claros -->

<!-- Sem skip-to-content link -->
<!-- Sem ARIA live regions para notificações -->
```

**Recomendações:**
```html
<button aria-label="Fechar modal" onclick="closeModal()">X</button>

<label for="email">Email</label>
<input id="email" type="email" aria-required="true">

<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Notificações screen reader -->
</div>
```

---

## 📱 RESPONSIVIDADE

### Breakpoints Definidos

```css
/* Landing Beatriz */
@media (max-width: 900px) { /* Tablet */ }
@media (max-width: 600px) { /* Mobile */ }

/* Landing SaaS */
/* Mobile-first approach */
```

### Grid System

```javascript
// Landing Beatriz: 6 fotos
// Desktop: 3 colunas x 2 linhas
// Mobile: 2 colunas x 3 linhas

// Landing SaaS features
// Desktop: 4 colunas
// Tablet: 2 colunas
// Mobile: 1 coluna
```

**Avaliação:**
- ✅ Mobile-first CSS
- ✅ Breakpoints consistentes
- ⚠️ Não há container queries
- ⚠️ Não há suporte a prefers-reduced-motion

---

## 🎯 FEATURES ANALYSIS

### Landing Page SaaS (`src/features/public/landing/`)

```javascript
// landing.js
// - Carrega planos da API
// - Fallback para planos estáticos se API falhar
// - Animações CSS
// - Formulário de cadastro multi-etapa
```

**Problema:** Planos estáticos em código
```javascript
const STATIC_PLANS = [
  {
    name: 'Starter',
    price: 49.90,
    // ... dados hardcoded
  }
];
// ⚠️ Se planos mudam no banco, landing desatualizada
```

### Landing Beatriz (`src/features/beatriz/`)

```javascript
// landing.js
// - Galeria de 6 fotos
// - Grid responsivo
// - Instagram link
// - SEO básico (sem meta tags dinâmicas)
```

### Dashboard (`src/features/dashboard/`)

```javascript
// Calendário interativo
// Cards de resumo (ganhos hoje/semana/mês)
// FAB (Floating Action Button) para agendar
// Navegação por mês
```

### Área do Profissional (`src/features/professional/`)

```javascript
// 7 páginas:
// - dashboard.js
// - appointments.js
// - clients.js
// - earnings.js
// - performance.js
// - profile.js
// - availability.js
```

---

## 🔧 BUILD E PERFORMANCE

### Vite Configuration

**Arquivo:** `vite.config.js` (presumido)
```javascript
export default {
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: true,
  }
}
```

### Bundle Analysis

**Estimativas:**
```
Vendor (vendors): ~150KB (sem gzip)
  - date-fns (se usado)
  - chart.js (se usado)
  
App code: ~200KB
  - 21 features lazy loaded
  - Core: ~30KB
  
Total inicial: ~150KB (apenas core + landing)
Total com dashboard: ~300KB
```

### Otimizações Pendentes

```javascript
// 1. Prefetch de rotas comuns
const prefetchRoutes = () => {
  if (isAuthenticated()) {
    import('./features/dashboard/pages/dashboard.js');
    import('./features/appointments/pages/appointments.js');
  }
};

// 2. Lazy loading de imagens
<img loading="lazy" src="...">

// 3. Service Worker para offline
// Não implementado

// 4. Preload de fontes
<link rel="preload" href="/fonts/inter.woff2" as="font">
```

---

## 🐛 TRATAMENTO DE ERROS

### HTTP Error Handling

```javascript
// http.js
function emitHttpEvent(event, data) {
  if (httpEventListeners[event]) {
    httpEventListeners[event].forEach(cb => cb(data));
  }
}

// Eventos emitidos:
// - unauthorized (401)
// - subscriptionInactive (403 com código específico)
// - networkError (fetch falhou)
```

### Problemas

```javascript
// 1. Erros silenciosos em alguns lugares
loadPlans().catch(() => {
  // Não mostra erro ao usuário
  renderPlans(STATIC_PLANS); // Fallback silencioso
});

// 2. Sem retry automático
fetch('/api/data').catch(() => {
  // Falha imediatamente, sem retry
});

// 3. Mensagens genéricas
catch (error) {
  showToast('Erro ao carregar dados', 'error');
  // Não mostra detalhes úteis
}
```

---

## 🛡️ SEGURANÇA FRONTEND

### Content Security Policy

**Backend (Helmet):**
```javascript
// backend/src/app.multitenant.js:46-48
app.use(helmet({
  contentSecurityPolicy: false, // ⚠️ DESATIVADA
}));
```

**Impacto:**
- Frontend vulnerável a XSS
- Scripts inline executam sem restrição
- Data exfiltration possível

**Recomendação CSP para Frontend:**
```javascript
// Se backend adicionar CSP:
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.biaxavier.com.br;
```

### Sanitização de Input

**Arquivo:** `src/shared/utils/validation.js`

```javascript
// Validações básicas encontradas:
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ⚠️ Sem sanitização de HTML
// ⚠️ Sem proteção contra XSS em inputs
```

**Exemplo de risco:**
```javascript
// Se usuário digita em campo de nome:
// <img src=x onerror=alert('xss')>

// E código renderiza:
element.innerHTML = userInput; // ⚠️ XSS

// Deveria ser:
element.textContent = userInput; // ✅ Safe
```

### Dependências Vulneráveis

```bash
# npm audit (estimado)
esbuild ≤ 0.24.2 (via vite) - moderate severity
# Requer upgrade para Vite 6
```

---

## 📊 MATRIZ DE RISCO FRONTEND

| ID | Problema | Severidade | Arquivo | Linha |
|----|----------|------------|---------|-------|
| F001 | CSP Desativada | 🔴 | backend/app.multitenant.js | 47 |
| F002 | Tokens localStorage | 🔴 | core/config.js | 20-23 |
| F003 | XSS Input Sanitization | 🟡 | shared/utils/validation.js | - |
| F004 | ARIA Labels Ausentes | 🟢 | shared/components/ | - |
| F005 | Service Worker Ausente | 🟢 | - | - |
| F006 | Lazy Images Ausente | 🟢 | features/ | - |
| F007 | Prefer Reduced Motion | 🟢 | styles/ | - |

---

## 🛠️ ROADMAP DE CORREÇÃO

### Sprint 0 (Imediato)

**[F001] CSP Header**
```javascript
// Backend adiciona CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // passo 1
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    }
  }
}));
```

### Sprint 1 (1-2 semanas)

**[F003] Sanitização de Inputs**
```javascript
// validation.js
export function sanitizeHtml(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Uso em todos os innerHTML
userElement.innerHTML = sanitizeHtml(user.name);
```

**[F004] ARIA Labels**
```html
<!-- Adicionar em componentes -->
<button aria-label="Fechar">×</button>
<nav aria-label="Menu principal">
<form aria-labelledby="form-title">
```

### Sprint 2 (2-4 semanas)

**[F002] httpOnly Cookies (Complexo)**
- Backend: Adicionar suporte a cookies
- Frontend: Remover localStorage
- Testes: Verificar CSRF protection

### Sprint 3 (Backlog)

- Service Worker para cache/offline
- Lazy loading de imagens
- Prefetch de rotas comuns
- Análise de bundle (vite-bundle-analyzer)

---

## 🧪 TESTES RECOMENDADOS

```javascript
// Testes de segurança:

// 1. XSS Test
document.getElementById('input').value = '<script>alert(1)</script>';
// Verificar se script executa

// 2. Token Extraction Test
// Abrir console e executar:
localStorage.getItem('bh_access_token');
// Deve retornar token (confirma vulnerabilidade)

// 3. CSP Test
// DevTools → Network → Response Headers
// Verificar ausência de Content-Security-Policy

// 4. Mobile Responsiveness
// Chrome DevTools → Device Toolbar
// Testar iPhone SE, iPhone 12, iPad, Desktop

// 5. Accessibility
// Lighthouse → Accessibility audit
// Target: 90+ score
```

---

## 📈 MÉTRICAS

| Métrica | Valor |
|---------|-------|
| Total de Features | 21 |
| Total de Rotas | 36 |
| Linhas de Código (est.) | ~8.000 |
| Tamanho Bundle (est.) | ~300KB (com dashboard) |
| Tamanho Vendor (est.) | ~150KB |
| Imagens em public/ | ~15 |
| Componentes Shared | 3 |

---

*Auditoria concluída em 08/05/2026. Análise baseada em ~50 arquivos JavaScript/CSS.*

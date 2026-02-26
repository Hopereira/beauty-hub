/**
 * SPA Router
 * Manages client-side navigation and dynamic page loading
 */

import { isAuthenticated, getCurrentUser, setCurrentPage, isSubscriptionBlocked, logout } from './state.js';
import { onHttpEvent } from '../shared/utils/http.js';
import { showToast } from '../shared/utils/toast.js';

// ============================================
// ROUTE DEFINITIONS
// ============================================

const routes = {
    '/': { title: 'Beauty Hub', page: 'landing', auth: false },
    '/login': { title: 'Entrar - Beauty Hub', page: 'login', auth: false },
    '/register': { title: 'Cadastro - Beauty Hub', page: 'register', auth: false },
    '/dashboard': { title: 'Dashboard - Beauty Hub', page: 'dashboard', auth: true },
    '/appointments': { title: 'Agendamentos - Beauty Hub', page: 'appointments', auth: true },
    '/financial': { title: 'Financeiro - Beauty Hub', page: 'financial', auth: true },
    '/clients': { title: 'Clientes - Beauty Hub', page: 'clients', auth: true },
    '/services': { title: 'Serviços - Beauty Hub', page: 'services', auth: true },
    '/professionals': { title: 'Profissionais - Beauty Hub', page: 'professionals', auth: true },
    '/billing': { title: 'Assinatura - Beauty Hub', page: 'billing', auth: true },
    '/settings': { title: 'Configurações - Beauty Hub', page: 'settings', auth: true },
    '/account': { title: 'Minha Conta - Beauty Hub', page: 'account', auth: true },
    // Owner routes
    '/inventory': { title: 'Estoque - Beauty Hub', page: 'inventory', auth: true },
    '/suppliers': { title: 'Fornecedores - Beauty Hub', page: 'suppliers', auth: true },
    '/purchases': { title: 'Compras - Beauty Hub', page: 'purchases', auth: true },
    '/reports': { title: 'Relatórios - Beauty Hub', page: 'reports', auth: true },
    // Professional routes (PROFESSIONAL role)
    '/professional/dashboard': { title: 'Meu Dashboard - Beauty Hub', page: 'professional-dashboard', auth: true, role: 'professional' },
    '/professional/appointments': { title: 'Meus Agendamentos - Beauty Hub', page: 'professional-appointments', auth: true, role: 'professional' },
    '/professional/clients': { title: 'Meus Clientes - Beauty Hub', page: 'professional-clients', auth: true, role: 'professional' },
    '/professional/earnings': { title: 'Meus Ganhos - Beauty Hub', page: 'professional-earnings', auth: true, role: 'professional' },
    '/professional/performance': { title: 'Minha Performance - Beauty Hub', page: 'professional-performance', auth: true, role: 'professional' },
    '/professional/profile': { title: 'Meu Perfil - Beauty Hub', page: 'professional-profile', auth: true, role: 'professional' },
    '/professional/availability': { title: 'Disponibilidade - Beauty Hub', page: 'professional-availability', auth: true, role: 'professional' },
    // Master routes (MASTER role only)
    '/master': { title: 'Master Dashboard - Beauty Hub', page: 'master-dashboard', auth: true, role: 'master' },
    '/master/tenants': { title: 'Tenants - Beauty Hub', page: 'master-tenants', auth: true, role: 'master' },
    '/master/plans': { title: 'Planos - Beauty Hub', page: 'master-plans', auth: true, role: 'master' },
    '/master/billing': { title: 'Billing - Beauty Hub', page: 'master-billing', auth: true, role: 'master' },
    '/master/system': { title: 'Sistema - Beauty Hub', page: 'master-system', auth: true, role: 'master' },
};

// Page module loaders (lazy)
const pageModules = {};

let currentCleanup = null;

// ============================================
// NAVIGATION
// ============================================

export function navigateTo(path, pushState = true) {
    if (pushState) {
        history.pushState(null, '', path);
    }
    loadRoute(path);
}

export function getRoutes() {
    return routes;
}

// ============================================
// ROUTE LOADING
// ============================================

async function loadRoute(path) {
    const route = routes[path];

    if (!route) {
        navigateTo('/dashboard', true);
        return;
    }

    // Auth guard
    if (route.auth && !isAuthenticated()) {
        navigateTo('/login', true);
        return;
    }

    // If authenticated and trying to access login/register, redirect to dashboard
    if (!route.auth && route.page !== 'landing' && isAuthenticated()) {
        navigateTo('/dashboard', true);
        return;
    }

    // Role guard (for master routes)
    if (route.role) {
        const user = getCurrentUser();
        const userRole = (user?.role || '').toLowerCase();
        if (userRole !== route.role) {
            showToast('Acesso não autorizado', 'error');
            navigateTo('/dashboard', true);
            return;
        }
    }

    document.title = route.title;
    setCurrentPage(route.page);

    // Cleanup previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
        currentCleanup();
        currentCleanup = null;
    }

    // Load page module
    try {
        const mod = await loadPageModule(route.page);
        if (mod && typeof mod.render === 'function') {
            await mod.render();
        }
        if (mod && typeof mod.init === 'function') {
            currentCleanup = await mod.init();
        }
    } catch (err) {
        console.error(`[Router] Error loading page "${route.page}":`, err);
    }
}

async function loadPageModule(page) {
    if (pageModules[page]) return pageModules[page];

    const moduleMap = {
        'landing': () => import('../features/landing/pages/landing.js'),
        'login': () => import('../features/auth/pages/login.js'),
        'register': () => import('../features/auth/pages/register.js'),
        'dashboard': () => import('../features/dashboard/pages/dashboard.js'),
        'appointments': () => import('../features/appointments/pages/appointments.js'),
        'financial': () => import('../features/financial/pages/financial.js'),
        'clients': () => import('../features/clients/pages/clients.js'),
        'services': () => import('../features/services/pages/services.js'),
        'professionals': () => import('../features/professionals/pages/professionals.js'),
        'billing': () => import('../features/billing/pages/billing.js'),
        'settings': () => import('../features/settings/pages/settings.js'),
        'account': () => import('../features/account/pages/account.js'),
        // Owner pages
        'inventory': () => import('../features/inventory/pages/inventory.js'),
        'suppliers': () => import('../features/suppliers/pages/suppliers.js'),
        'purchases': () => import('../features/purchases/pages/purchases.js'),
        'reports': () => import('../features/reports/pages/reports.js'),
        // Professional pages
        'professional-dashboard': () => import('../features/professional/pages/dashboard.js'),
        'professional-appointments': () => import('../features/professional/pages/appointments.js'),
        'professional-clients': () => import('../features/professional/pages/clients.js'),
        'professional-earnings': () => import('../features/professional/pages/earnings.js'),
        'professional-performance': () => import('../features/professional/pages/performance.js'),
        'professional-profile': () => import('../features/professional/pages/profile.js'),
        'professional-availability': () => import('../features/professional/pages/availability.js'),
        // Master pages
        'master-dashboard': () => import('../features/master/dashboard/master-dashboard.js'),
        'master-tenants': () => import('../features/master/tenants/master-tenants.js'),
        'master-plans': () => import('../features/master/plans/master-plans.js'),
        'master-billing': () => import('../features/master/billing/master-billing.js'),
        'master-system': () => import('../features/master/system/master-system.js'),
    };

    const loader = moduleMap[page];
    if (!loader) return null;

    const mod = await loader();
    pageModules[page] = mod;
    return mod;
}

// ============================================
// INITIALIZATION
// ============================================

export function initRouter() {
    // Handle browser back/forward
    window.addEventListener('popstate', () => {
        loadRoute(window.location.pathname);
    });

    // Intercept all link clicks for SPA navigation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');

        // Skip external links, anchors, and javascript: links
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        // Skip links with data-external attribute
        if (link.hasAttribute('data-external')) return;

        e.preventDefault();
        navigateTo(href);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Global HTTP event handlers
    // ─────────────────────────────────────────────────────────────────────────

    // Handle 401 Unauthorized - redirect to login
    onHttpEvent('unauthorized', () => {
        // Only show toast if not already on login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register') {
            showToast('Sessão expirada. Faça login novamente.', 'warning');
        }
        logout();
        if (currentPath !== '/login') {
            navigateTo('/login', true);
        }
    });

    // Handle subscription inactive
    onHttpEvent('subscriptionInactive', ({ code, message }) => {
        showToast(message || 'Assinatura inativa', 'error');
        // Optionally redirect to billing page
        // navigateTo('/billing', true);
    });

    // Handle network errors
    onHttpEvent('networkError', () => {
        showToast('Erro de conexão. Verifique sua internet.', 'error');
    });

    // Load initial route
    const path = window.location.pathname;
    loadRoute(path);
}

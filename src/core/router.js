/**
 * SPA Router
 * Manages client-side navigation and dynamic page loading
 */

import { isAuthenticated, getCurrentUser, setCurrentPage } from './state.js';

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
    '/account': { title: 'Minha Conta - Beauty Hub', page: 'account', auth: true },
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
        'account': () => import('../features/account/pages/account.js'),
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

    // Load initial route
    const path = window.location.pathname;
    loadRoute(path);
}

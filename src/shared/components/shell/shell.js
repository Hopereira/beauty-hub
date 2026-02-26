/**
 * App Shell - Dashboard layout wrapper
 * Renders sidebar + header + content area for authenticated pages
 */

import { getCurrentUser, isSubscriptionBlocked, getSubscriptionStatus } from '../../../core/state.js';
import { handleLogout } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';
import { openModal, closeModal } from '../modal/modal.js';
import { initSubscriptionBanner } from '../subscription-banner/subscription-banner.js';
import { SUBSCRIPTION_STATUS } from '../../../core/config.js';

/**
 * Render the full dashboard shell into #app
 * @param {string} activePage - Current page identifier for sidebar highlight
 * @param {string} contentHTML - Inner HTML for the main content area
 */
export function renderShell(activePage, contentHTML = '') {
    const user = getCurrentUser();
    const userName = user ? (user.first_name || user.firstName || user.name || 'Usuário') : 'Usuário';
    const avatar = user ? user.avatar || '' : '';
    const avatarInitial = userName.charAt(0).toUpperCase();
    const userRole = (user?.role || 'client').toLowerCase();

    const app = document.getElementById('app');
    if (!app) return;

    // Menu items with role-based visibility
    const menuItems = [
        { id: 'dashboard', icon: 'fas fa-home', label: 'Início', path: '/dashboard', roles: ['master', 'owner', 'admin', 'professional', 'client'] },
        { id: 'clients', icon: 'fas fa-users', label: 'Clientes', path: '/clients', roles: ['master', 'owner', 'admin', 'professional'] },
        { id: 'appointments', icon: 'fas fa-calendar-alt', label: 'Agendamentos', path: '/appointments', roles: ['master', 'owner', 'admin', 'professional', 'client'] },
        { id: 'services', icon: 'fas fa-cut', label: 'Serviços', path: '/services', roles: ['master', 'owner', 'admin'] },
        { id: 'professionals', icon: 'fas fa-user-tie', label: 'Profissionais', path: '/professionals', roles: ['master', 'owner', 'admin'] },
        { id: 'financial', icon: 'fas fa-dollar-sign', label: 'Financeiro', path: '/financial', roles: ['master', 'owner', 'admin'] },
        { id: 'billing', icon: 'fas fa-credit-card', label: 'Assinatura', path: '/billing', roles: ['master', 'owner', 'admin'] },
        { id: 'settings', icon: 'fas fa-cog', label: 'Configurações', path: '/settings', roles: ['master', 'owner'] },
        { id: 'master', icon: 'fas fa-crown', label: 'Master Admin', path: '/master', roles: ['master'] },
    ];

    // Filter menu items by role
    const visibleMenuItems = menuItems.filter(item => item.roles.includes(userRole));

    const sidebarMenuHTML = visibleMenuItems.map(item => `
        <a href="${item.path}" class="menu-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    const avatarStyle = avatar
        ? `background-image: url('${avatar}'); background-size: cover; text-indent: -9999px;`
        : '';

    // Subscription blocked banner (inline for critical status)
    const subscription = getSubscriptionStatus();
    const isBlocked = isSubscriptionBlocked();
    const blockBannerHTML = isBlocked ? `
        <div class="subscription-block-banner">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Sua assinatura está ${subscription?.status === 'suspended' ? 'suspensa' : 'inativa'}. 
            Funcionalidades de criação estão bloqueadas.</span>
            <a href="/billing" class="btn-sm btn-primary">Regularizar</a>
        </div>
    ` : '';

    app.innerHTML = `
        <div class="dashboard-container">
            <!-- Mobile Sidebar Overlay -->
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="logo-text">
                        <span style="color: var(--primary-color);">BEAUTY</span> HUB
                    </div>
                </div>

                <nav class="sidebar-menu">
                    ${sidebarMenuHTML}
                </nav>

                <div class="sidebar-footer">
                    <a href="#" class="logout-link" id="btn-logout">
                        <i class="fas fa-sign-out-alt"></i> Sair
                    </a>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="main-content">
                <header class="top-bar">
                    <div style="display:flex;align-items:center;gap:1rem;">
                        <button class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Abrir menu">
                            <i class="fas fa-bars"></i>
                        </button>
                        <div class="greeting">
                            Olá, <span class="user-name">${userName}</span>
                        </div>
                    </div>
                    <div class="user-profile" id="userProfileBtn">
                        <div class="avatar" style="${avatarStyle}">${avatarInitial}</div>
                        <div class="profile-dropdown" id="profileDropdown">
                            <a href="/account"><i class="far fa-user"></i> Minha conta</a>
                            <a href="/billing"><i class="fas fa-credit-card"></i> Assinatura</a>
                            <a href="#" id="dropdown-logout"><i class="fas fa-sign-out-alt"></i> Sair</a>
                        </div>
                    </div>
                </header>

                ${blockBannerHTML}

                <div class="content-wrapper" id="page-content">
                    ${contentHTML}
                </div>
            </main>
        </div>
    `;

    // Bind shell events
    bindShellEvents();
    
    // Initialize subscription banner
    initSubscriptionBanner();
}

/**
 * Get the page content container
 */
export function getContentArea() {
    return document.getElementById('page-content');
}

/**
 * Set inner HTML of the content area only (keeps shell intact)
 */
export function setContent(html) {
    const area = getContentArea();
    if (area) area.innerHTML = html;
}

// ============================================
// SHELL EVENT BINDINGS
// ============================================

function bindShellEvents() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const toggleMobileMenu = () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('show');
    };

    const closeMobileMenu = () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('show');
    };

    mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    overlay?.addEventListener('click', closeMobileMenu);

    // Close mobile menu on navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', closeMobileMenu);
    });

    // Profile dropdown toggle
    const profileBtn = document.getElementById('userProfileBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#userProfileBtn')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
    });

    // Logout buttons
    const logoutBtn = document.getElementById('btn-logout');
    const dropdownLogout = document.getElementById('dropdown-logout');

    const doLogout = async (e) => {
        e.preventDefault();
        await handleLogout();
        navigateTo('/login');
    };

    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (dropdownLogout) dropdownLogout.addEventListener('click', doLogout);

    // Make modal functions available globally for inline onclick handlers
    window.openModal = openModal;
    window.closeModal = closeModal;
}

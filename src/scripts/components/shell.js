/**
 * App Shell - Dashboard layout wrapper
 * Renders sidebar + header + content area for authenticated pages
 */

import { getCurrentUser } from '../state.js';
import { handleLogout } from '../auth.js';
import { navigateTo } from '../router.js';
import { openModal, closeModal } from './modal.js';

/**
 * Render the full dashboard shell into #app
 * @param {string} activePage - Current page identifier for sidebar highlight
 * @param {string} contentHTML - Inner HTML for the main content area
 */
export function renderShell(activePage, contentHTML = '') {
    const user = getCurrentUser();
    const userName = user ? user.firstName || user.name : 'Usuário';
    const avatar = user ? user.avatar || '' : '';
    const avatarInitial = userName.charAt(0).toUpperCase();

    const app = document.getElementById('app');
    if (!app) return;

    const menuItems = [
        { id: 'dashboard', icon: 'fas fa-home', label: 'Início', path: '/dashboard' },
        { id: 'clients', icon: 'fas fa-users', label: 'Clientes', path: '/clients' },
        { id: 'appointments', icon: 'fas fa-calendar-alt', label: 'Agendamentos', path: '/appointments' },
        { id: 'financial', icon: 'fas fa-dollar-sign', label: 'Financeiro', path: '/financial' },
        { id: 'stock', icon: 'fas fa-box', label: 'Estoque', path: '#' },
        { id: 'services', icon: 'fas fa-cut', label: 'Serviços', path: '#' },
    ];

    const sidebarMenuHTML = menuItems.map(item => `
        <a href="${item.path}" class="menu-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    const avatarStyle = avatar
        ? `background-image: url('${avatar}'); background-size: cover; text-indent: -9999px;`
        : '';

    app.innerHTML = `
        <div class="dashboard-container">
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <div class="logo-text">
                        <span style="color: var(--primary-color); font-size: 1.8rem;">BEAUTY</span> HUB
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
                    <div class="greeting">
                        Olá, <span class="user-name">${userName}</span>
                    </div>
                    <div class="user-profile" id="userProfileBtn">
                        <div class="avatar" style="${avatarStyle}">${avatarInitial}</div>
                        <div class="profile-dropdown" id="profileDropdown">
                            <a href="/account"><i class="far fa-user"></i> Minha conta</a>
                            <a href="#" id="dropdown-logout"><i class="fas fa-sign-out-alt"></i> Sair</a>
                        </div>
                    </div>
                </header>

                <div class="content-wrapper" id="page-content">
                    ${contentHTML}
                </div>
            </main>
        </div>
    `;

    // Bind shell events
    bindShellEvents();
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

    const doLogout = (e) => {
        e.preventDefault();
        handleLogout();
        navigateTo('/login');
    };

    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if (dropdownLogout) dropdownLogout.addEventListener('click', doLogout);

    // Make modal functions available globally for inline onclick handlers
    window.openModal = openModal;
    window.closeModal = closeModal;
}

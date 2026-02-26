/**
 * Master Shell - Layout exclusivo para área MASTER
 * Sidebar própria, menu administrativo do SaaS
 */

import { getCurrentUser } from '../../../core/state.js';
import { handleLogout } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';

/**
 * Render Master Shell
 * @param {string} activePage - Current page identifier
 * @param {string} contentHTML - Inner content
 */
export function renderMasterShell(activePage, contentHTML = '') {
    const user = getCurrentUser();
    const userName = user ? (user.first_name || user.firstName || 'Master') : 'Master';
    const avatarInitial = userName.charAt(0).toUpperCase();

    const app = document.getElementById('app');
    if (!app) return;

    const menuItems = [
        { id: 'master-dashboard', icon: 'fas fa-chart-line', label: 'Dashboard', path: '/master' },
        { id: 'master-tenants', icon: 'fas fa-building', label: 'Tenants', path: '/master/tenants' },
        { id: 'master-plans', icon: 'fas fa-tags', label: 'Planos', path: '/master/plans' },
        { id: 'master-billing', icon: 'fas fa-file-invoice-dollar', label: 'Billing', path: '/master/billing' },
        { id: 'master-system', icon: 'fas fa-server', label: 'Sistema', path: '/master/system' },
    ];

    const sidebarMenuHTML = menuItems.map(item => `
        <a href="${item.path}" class="master-menu-item ${activePage === item.id ? 'active' : ''}" data-page="${item.id}">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
        </a>
    `).join('');

    app.innerHTML = `
        <div class="master-container">
            <!-- Mobile Sidebar Overlay -->
            <div class="master-sidebar-overlay" id="masterSidebarOverlay"></div>
            
            <!-- Sidebar -->
            <aside class="master-sidebar" id="masterSidebar">
                <div class="master-sidebar-header">
                    <div class="master-logo">
                        <i class="fas fa-crown"></i>
                        <span>MASTER <small>Admin</small></span>
                    </div>
                </div>

                <nav class="master-sidebar-menu">
                    ${sidebarMenuHTML}
                </nav>

                <div class="master-sidebar-footer">
                    <a href="/dashboard" class="master-menu-item">
                        <i class="fas fa-arrow-left"></i>
                        <span>Voltar ao App</span>
                    </a>
                    <button class="master-menu-item" id="masterLogoutBtn">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="master-main">
                <header class="master-header">
                    <button class="master-menu-toggle" id="masterMenuToggle">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="master-header-title">
                        <h1>BeautyHub</h1>
                        <span class="master-badge">SaaS Admin</span>
                    </div>
                    <div class="master-header-user">
                        <div class="master-avatar">${avatarInitial}</div>
                        <span>${userName}</span>
                    </div>
                </header>

                <div class="master-content" id="masterContent">
                    ${contentHTML}
                </div>
            </main>
        </div>
    `;

    bindMasterShellEvents();
}

export function getMasterContentArea() {
    return document.getElementById('masterContent');
}

function bindMasterShellEvents() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('masterMenuToggle');
    const sidebar = document.getElementById('masterSidebar');
    const overlay = document.getElementById('masterSidebarOverlay');

    menuToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        overlay?.classList.toggle('active');
    });

    overlay?.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        overlay?.classList.remove('active');
    });

    // Logout
    document.getElementById('masterLogoutBtn')?.addEventListener('click', async () => {
        await handleLogout();
        navigateTo('/login');
    });

    // Menu navigation
    document.querySelectorAll('.master-menu-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const path = item.getAttribute('href');
            if (path) {
                sidebar?.classList.remove('open');
                overlay?.classList.remove('active');
                navigateTo(path);
            }
        });
    });
}

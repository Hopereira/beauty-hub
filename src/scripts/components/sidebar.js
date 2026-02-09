/**
 * Sidebar Component - Shared navigation sidebar for dashboard pages
 */

/**
 * Render sidebar HTML
 * @param {string} activePage - Current active page identifier
 * @returns {string} HTML string for sidebar
 */
export function renderSidebar(activePage = '') {
    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo-text">
                    <span style="color: var(--primary-color); font-size: 1.8rem;">BEAUTY</span> HUB
                </div>
            </div>

            <nav class="sidebar-menu">
                <a href="professional.html" class="menu-item ${activePage === 'professional' ? 'active' : ''}">
                    <i class="fas fa-home"></i> Início
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-users"></i> Clientes
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-calendar-alt"></i> Agendamentos
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-dollar-sign"></i> Financeiro
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-eye"></i> Consult ProLash
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-box"></i> Estoque
                </a>
                <a href="#" class="menu-item">
                    <i class="fas fa-cut"></i> Serviços
                </a>
            </nav>

            <div class="sidebar-footer">
                <a href="#" class="btn-whatsapp-sidebar" style="margin-bottom: 10px;">
                    <i class="fab fa-whatsapp"></i> Suporte Whatsapp
                </a>
                <a href="../auth/login.html" class="logout-link">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </a>
            </div>
        </aside>
    `;
}

/**
 * Initialize sidebar in the page
 * @param {string} containerId - ID of container element
 * @param {string} activePage - Current active page
 */
export function initSidebar(containerId, activePage = '') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = renderSidebar(activePage);
    }
}

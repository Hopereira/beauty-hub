/**
 * Header Component - Shared top bar with user greeting and profile dropdown
 */

/**
 * Render header HTML
 * @param {string} userName - User's display name
 * @returns {string} HTML string for header
 */
export function renderHeader(userName = 'Usuário') {
    return `
        <header class="top-bar">
            <div class="greeting">
                Olá, <span class="user-name">${userName}</span>
            </div>

            <div class="user-profile" onclick="window.toggleProfileMenu()">
                <div class="avatar"
                    style="background-image: url('https://i.pravatar.cc/150?img=5'); background-size: cover; text-indent: -9999px;">
                    A</div>

                <!-- Dropdown Menu -->
                <div class="profile-dropdown" id="profileDropdown">
                    <a href="account.html"><i class="far fa-user"></i> Minha conta</a>
                    <a href="../auth/login.html"><i class="fas fa-sign-out-alt"></i> Sair</a>
                </div>
            </div>
        </header>
    `;
}

/**
 * Initialize header in the page
 * @param {string} containerId - ID of container element
 * @param {string} userName - User's display name
 */
export function initHeader(containerId, userName = 'Usuário') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = renderHeader(userName);
    }
}

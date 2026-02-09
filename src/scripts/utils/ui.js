/**
 * UI Utilities - Shared JavaScript functions for dashboard pages
 */

/**
 * Toggle profile dropdown menu
 */
export function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

/**
 * Close dropdown when clicking outside
 */
export function initClickOutsideHandler() {
    window.onclick = function (event) {
        if (!event.target.closest('.user-profile')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        }
        // Close modal if clicked outside
        if (event.target.classList.contains('modal-overlay')) {
            event.target.style.display = 'none';
        }
    };
}

/**
 * Open a modal by type
 * @param {string} type - Modal type identifier (email, password, phone, etc)
 */
export function openModal(type) {
    const modal = document.getElementById('modal-' + type);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Close a modal by type
 * @param {string} type - Modal type identifier
 */
export function closeModal(type) {
    const modal = document.getElementById('modal-' + type);
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Switch between tabs in account settings
 * @param {string} tabName - Tab identifier (profile, security, payments, notifications)
 */
export function switchTab(tabName) {
    // Remove active class from all links
    document.querySelectorAll('.settings-link').forEach(link => {
        link.classList.remove('active');
    });

    // Hide all content sections
    const contentSections = ['profile', 'security', 'payments', 'notifications'];
    contentSections.forEach(section => {
        const element = document.getElementById('content-' + section);
        if (element) {
            element.style.display = 'none';
        }
    });

    // Activate specific tab
    const linkElement = document.getElementById('link-' + tabName);
    const contentElement = document.getElementById('content-' + tabName);

    if (linkElement) {
        linkElement.classList.add('active');
    }
    if (contentElement) {
        contentElement.style.display = 'block';
    }
}

/**
 * Initialize all UI handlers
 */
export function initUI() {
    initClickOutsideHandler();
}

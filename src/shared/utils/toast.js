/**
 * Toast Notification Utility
 * Provides non-blocking feedback messages to the user
 */

let container = null;

function ensureContainer() {
    if (!container || !document.body.contains(container)) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Show a toast notification
 * @param {string} message - Text to display
 * @param {'success'|'error'|'warning'|'info'} type - Toast type
 * @param {number} duration - Duration in ms (default 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
    const parent = ensureContainer();

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-times-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${message}</span>`;

    parent.appendChild(toast);

    const timer = setTimeout(() => removeToast(toast), duration);

    toast.addEventListener('click', () => {
        clearTimeout(timer);
        removeToast(toast);
    });
}

function removeToast(toast) {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
        toast.remove();
    });
}

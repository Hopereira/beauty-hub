/**
 * Modal Component
 * Standardized modal open/close with ESC, click-outside, and focus trap
 */

let activeModals = [];

/**
 * Open a modal by its ID prefix (e.g., 'appointment' opens #modal-appointment)
 * Also supports passing the full element ID or the element itself
 */
export function openModal(idOrType) {
    const modal = resolveModal(idOrType);
    if (!modal) return;

    modal.style.display = 'flex';
    modal.classList.add('active');
    activeModals.push(modal);

    // Focus first input if available
    requestAnimationFrame(() => {
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    });
}

/**
 * Close a modal by its ID prefix, full ID, or element
 */
export function closeModal(idOrType) {
    const modal = resolveModal(idOrType);
    if (!modal) return;

    modal.style.display = 'none';
    modal.classList.remove('active');
    activeModals = activeModals.filter(m => m !== modal);
}

/**
 * Close the topmost open modal
 */
export function closeTopModal() {
    if (activeModals.length === 0) return;
    const top = activeModals[activeModals.length - 1];
    closeModal(top);
}

/**
 * Close all open modals
 */
export function closeAllModals() {
    [...activeModals].forEach(m => closeModal(m));
}

// ============================================
// HELPERS
// ============================================

function resolveModal(idOrType) {
    if (idOrType instanceof HTMLElement) return idOrType;

    // Try direct ID
    let modal = document.getElementById(idOrType);
    if (modal) return modal;

    // Try with modal- prefix
    modal = document.getElementById('modal-' + idOrType);
    if (modal) return modal;

    return null;
}

// ============================================
// GLOBAL EVENT HANDLERS
// ============================================

export function initModalSystem() {
    // ESC key closes topmost modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeTopModal();
        }
    });

    // Click on overlay closes modal
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('expense-modal-overlay')) {
            closeModal(e.target);
        }
    });
}

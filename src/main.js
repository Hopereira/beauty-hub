/**
 * Beauty Hub - Main Application Entry Point
 * Initializes data, modal system, and SPA router
 */

import { initializeData } from './shared/utils/localStorage.js';
import { initModalSystem } from './shared/components/modal/modal.js';
import { initRouter } from './core/router.js';
import { recoverSession } from './core/auth.js';
import { hasValidToken } from './shared/utils/http.js';

// Show loading screen while initializing
document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg-light);">
        <div style="text-align:center;">
            <div class="spinner" style="margin:0 auto 1rem;"></div>
            <p style="color:var(--text-muted);">Carregando...</p>
        </div>
    </div>
`;

// Initialize application
async function initApp() {
    // Initialize seed data if first run
    initializeData();

    // Initialize global modal handlers (ESC, click-outside)
    initModalSystem();

    // Try to recover session if token exists
    if (hasValidToken()) {
        try {
            await recoverSession();
        } catch (e) {
            console.warn('[App] Session recovery failed:', e);
        }
    }

    // Start SPA router
    initRouter();
}

initApp();

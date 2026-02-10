/**
 * Beauty Hub - Main Application Entry Point
 * Initializes data, modal system, and SPA router
 */

import { initializeData } from './shared/utils/localStorage.js';
import { initModalSystem } from './shared/components/modal/modal.js';
import { initRouter } from './core/router.js';

// Initialize seed data if first run
initializeData();

// Initialize global modal handlers (ESC, click-outside)
initModalSystem();

// Start SPA router
initRouter();

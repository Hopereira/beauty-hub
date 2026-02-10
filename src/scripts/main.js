/**
 * Beauty Hub - Main Application Entry Point
 * Initializes data, modal system, and SPA router
 */

import { initializeData } from './utils/localStorage.js';
import { initModalSystem } from './components/modal.js';
import { initRouter } from './router.js';

// Initialize seed data if first run
initializeData();

// Initialize global modal handlers (ESC, click-outside)
initModalSystem();

// Start SPA router
initRouter();

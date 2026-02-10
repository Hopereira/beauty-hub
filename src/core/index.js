/**
 * Core Module Barrel Export
 */

export { navigateTo, initRouter, getRoutes } from './router.js';
export { getCurrentUser, setCurrentUser, isAuthenticated, getUserRole, logout, setCurrentPage, getCurrentPage, on, off } from './state.js';
export { handleLogin, handleRegister, handleLogout } from './auth.js';
export { APP_NAME, APP_VERSION, API_BASE_URL, ROLES, TOKEN_KEY, REFRESH_TOKEN_KEY } from './config.js';

/**
 * Core Module Barrel Export
 */

export { navigateTo, initRouter, getRoutes } from './router.js';
export { 
    getCurrentUser, 
    setCurrentUser, 
    isAuthenticated, 
    getUserRole, 
    logout, 
    setCurrentPage, 
    getCurrentPage, 
    on, 
    off,
    // Subscription state
    getSubscriptionStatus,
    setSubscriptionStatus,
    isSubscriptionActive,
    isSubscriptionBlocked,
    getSubscriptionMessage,
    shouldShowSubscriptionBanner,
    dismissSubscriptionBanner,
} from './state.js';
export { 
    handleLogin, 
    handleRegister, 
    handleLogout,
    recoverSession,
    requestPasswordReset,
    resetPassword,
} from './auth.js';
export { 
    APP_NAME, 
    APP_VERSION, 
    API_BASE_URL, 
    ROLES, 
    TOKEN_KEY, 
    REFRESH_TOKEN_KEY,
    USER_KEY,
    TENANT_KEY,
    getTenantSlug,
    setTenantSlug,
    SUBSCRIPTION_STATUS,
} from './config.js';

/**
 * Global Configuration
 * Centralized app settings and constants
 */

export const APP_NAME = 'Beauty Hub';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ROLES = {
    MASTER: 'master',
    OWNER: 'owner',
    ADMIN: 'admin',
    PROFESSIONAL: 'professional',
    CLIENT: 'client',
};

// Auth token keys
export const TOKEN_KEY = 'bh_access_token';
export const REFRESH_TOKEN_KEY = 'bh_refresh_token';
export const USER_KEY = 'bh_user';
export const TENANT_KEY = 'bh_tenant_slug';

// Get tenant slug from subdomain or localStorage
export function getTenantSlug() {
    // Try subdomain first (e.g., beleza-pura.beautyhub.com)
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'app') {
        return parts[0];
    }
    // Fallback to localStorage
    return localStorage.getItem(TENANT_KEY) || null;
}

export function setTenantSlug(slug) {
    if (slug) {
        localStorage.setItem(TENANT_KEY, slug);
    } else {
        localStorage.removeItem(TENANT_KEY);
    }
}

// Subscription status constants
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    TRIAL: 'trial',
    PAST_DUE: 'past_due',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
};

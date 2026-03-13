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

// Slugs that must never be resolved as tenant (mirrors backend RESERVED_SLUGS)
const RESERVED_SLUGS = ['www', 'api', 'app', 'adm', 'admin', 'mail', 'ftp', 'smtp', 'cdn', 'static', 'assets'];

// Get tenant slug from subdomain or localStorage
export function getTenantSlug() {
    // Try subdomain first (e.g., salonmaria.biaxavier.com.br)
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    // For .com.br (2-part TLD) need >= 4 parts; for .com (1-part TLD) need >= 3
    const isMultiPartTLD = parts.length >= 2 && ['com.br', 'org.br', 'net.br'].includes(parts.slice(-2).join('.'));
    const minParts = isMultiPartTLD ? 4 : 3;
    if (parts.length >= minParts) {
        const sub = parts[0].toLowerCase();
        if (!RESERVED_SLUGS.includes(sub)) {
            return sub;
        }
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

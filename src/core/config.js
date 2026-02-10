/**
 * Global Configuration
 * Centralized app settings and constants
 */

export const APP_NAME = 'Beauty Hub';
export const APP_VERSION = '1.0.0';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const ROLES = {
    MASTER: 'master',
    ADMIN: 'admin',
    PROFESSIONAL: 'professional',
    CLIENT: 'client',
};

export const TOKEN_KEY = 'bh_access_token';
export const REFRESH_TOKEN_KEY = 'bh_refresh_token';

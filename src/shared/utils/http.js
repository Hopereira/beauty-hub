/**
 * HTTP Client Utility
 * Fetch wrapper with JWT auth, tenant header, and auto-refresh
 */

import { 
    API_BASE_URL, 
    TOKEN_KEY, 
    REFRESH_TOKEN_KEY,
    getTenantSlug 
} from '../../core/config.js';

// ============================================
// ERROR CLASSES
// ============================================

export class ApiError extends Error {
    constructor(message, status, code, details = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export class AuthError extends ApiError {
    constructor(message = 'Sessão expirada', code = 'UNAUTHORIZED') {
        super(message, 401, code);
        this.name = 'AuthError';
    }
}

export class SubscriptionError extends ApiError {
    constructor(message = 'Assinatura inativa', code = 'SUBSCRIPTION_INACTIVE') {
        super(message, 403, code);
        this.name = 'SubscriptionError';
    }
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(token) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
    refreshSubscribers.push(callback);
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
        throw new AuthError('Refresh token não encontrado');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        throw new AuthError('Sessão expirada, faça login novamente');
    }

    const data = await response.json();
    const newToken = data.data?.accessToken || data.accessToken;
    
    if (newToken) {
        localStorage.setItem(TOKEN_KEY, newToken);
        if (data.data?.refreshToken || data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.data?.refreshToken || data.refreshToken);
        }
    }

    return newToken;
}

// ============================================
// EVENT BUS FOR GLOBAL ERROR HANDLING
// ============================================

const httpEventListeners = {
    unauthorized: [],
    subscriptionInactive: [],
    networkError: [],
};

export function onHttpEvent(event, callback) {
    if (httpEventListeners[event]) {
        httpEventListeners[event].push(callback);
    }
}

export function offHttpEvent(event, callback) {
    if (httpEventListeners[event]) {
        httpEventListeners[event] = httpEventListeners[event].filter(cb => cb !== callback);
    }
}

function emitHttpEvent(event, data) {
    if (httpEventListeners[event]) {
        httpEventListeners[event].forEach(cb => cb(data));
    }
}

// ============================================
// MAIN REQUEST FUNCTION
// ============================================

/**
 * Make an authenticated HTTP request
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {Object} options - Fetch options
 * @param {boolean} options.skipAuth - Skip authentication header
 * @param {boolean} options.skipTenant - Skip tenant header
 * @param {boolean} options.retry - Internal flag for retry after refresh
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const { skipAuth, skipTenant, retry, ...fetchOptions } = options;

    const token = localStorage.getItem(TOKEN_KEY);
    const tenantSlug = getTenantSlug();

    const headers = {
        'Content-Type': 'application/json',
        ...(!skipAuth && token && { Authorization: `Bearer ${token}` }),
        ...(!skipTenant && tenantSlug && { 'X-Tenant-Slug': tenantSlug }),
        ...fetchOptions.headers,
    };

    const config = {
        ...fetchOptions,
        headers,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    let response;
    try {
        response = await fetch(url, config);
    } catch (networkError) {
        emitHttpEvent('networkError', { endpoint, error: networkError });
        throw new ApiError('Erro de conexão com o servidor', 0, 'NETWORK_ERROR');
    }

    // Handle 401 - Try token refresh
    if (response.status === 401 && !skipAuth && !retry) {
        if (!isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await refreshAccessToken();
                isRefreshing = false;
                onRefreshed(newToken);
                // Retry original request
                return request(endpoint, { ...options, retry: true });
            } catch (refreshError) {
                isRefreshing = false;
                emitHttpEvent('unauthorized', { endpoint });
                throw new AuthError();
            }
        } else {
            // Wait for refresh to complete
            return new Promise((resolve, reject) => {
                addRefreshSubscriber((newToken) => {
                    resolve(request(endpoint, { ...options, retry: true }));
                });
            });
        }
    }

    // Parse response
    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = { message: 'Resposta inválida do servidor' };
    }

    if (!response.ok) {
        const errorMessage = data.message || `Erro ${response.status}`;
        const errorCode = data.error?.code || 'UNKNOWN_ERROR';

        // Handle subscription errors (403 with specific codes)
        if (response.status === 403) {
            if (['SUBSCRIPTION_INACTIVE', 'SUBSCRIPTION_EXPIRED', 'TENANT_SUSPENDED'].includes(errorCode)) {
                emitHttpEvent('subscriptionInactive', { code: errorCode, message: errorMessage });
                throw new SubscriptionError(errorMessage, errorCode);
            }
        }

        // Handle 401 after retry (token refresh failed)
        if (response.status === 401) {
            emitHttpEvent('unauthorized', { endpoint });
            throw new AuthError(errorMessage, errorCode);
        }

        throw new ApiError(errorMessage, response.status, errorCode, data.error?.details);
    }

    return data;
}

// ============================================
// API HELPER METHODS
// ============================================

export const api = {
    get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
    post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
    put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
    patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
    delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};

// ============================================
// AUTH HELPERS
// ============================================

export function clearAuthTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function hasValidToken() {
    return !!localStorage.getItem(TOKEN_KEY);
}

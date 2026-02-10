/**
 * HTTP Client Utility
 * Fetch wrapper for future backend API integration
 */

import { API_BASE_URL, TOKEN_KEY } from '../../core/config.js';

/**
 * Make an authenticated HTTP request
 * @param {string} endpoint - API endpoint (e.g., '/auth/login')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const token = localStorage.getItem(TOKEN_KEY);

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro de rede' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

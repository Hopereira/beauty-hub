/**
 * Authentication Module
 * Handles login, register, logout with real API backend
 */

import { api, setAuthTokens, clearAuthTokens, AuthError } from '../shared/utils/http.js';
import { setCurrentUser, logout as stateLogout, setSubscriptionStatus } from './state.js';
import { setTenantSlug, USER_KEY } from './config.js';
import { showToast } from '../shared/utils/toast.js';

// ============================================
// LOGIN
// ============================================

/**
 * Login with email and password
 * @param {string} email 
 * @param {string} password 
 * @param {string} tenantSlug - Optional tenant slug for multi-tenant login
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export async function handleLogin(email, password, tenantSlug = null) {
    if (!email || !password) {
        return { success: false, message: 'Preencha todos os campos.' };
    }

    try {
        // Set tenant slug before login if provided
        if (tenantSlug) {
            setTenantSlug(tenantSlug);
        }

        const response = await api.post('/auth/login', { email, password });

        if (!response.success) {
            return { success: false, message: response.message || 'Erro ao fazer login' };
        }

        const { accessToken, refreshToken, user, tenant, subscription } = response.data;

        // Save tokens
        setAuthTokens(accessToken, refreshToken);

        // Save tenant slug from response
        if (tenant?.slug) {
            setTenantSlug(tenant.slug);
        }

        // Format user for frontend
        const sessionUser = {
            id: user.id,
            name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            firstName: user.firstName || user.name?.split(' ')[0] || '',
            lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            avatar: user.avatar || '',
            tenantId: user.tenantId || tenant?.id,
            tenant: tenant || null,
        };

        // Save user to localStorage and state
        localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
        setCurrentUser(sessionUser);

        // Save subscription status
        if (subscription) {
            setSubscriptionStatus(subscription);
        }

        return { success: true, user: sessionUser, tenant, subscription };

    } catch (error) {
        console.error('[Auth] Login error:', error);
        
        if (error instanceof AuthError) {
            return { success: false, message: error.message };
        }
        
        return { 
            success: false, 
            message: error.message || 'Erro ao conectar com o servidor' 
        };
    }
}

// ============================================
// REGISTER
// ============================================

/**
 * Register new user/tenant
 * @param {Object} data - Registration data
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export async function handleRegister({ 
    name, 
    email, 
    password, 
    confirmPassword, 
    role,
    salonName,
    cnpj,
    specialty,
    planSlug = 'starter'
}) {
    // Client-side validations
    if (!name || !email || !password || !confirmPassword || !role) {
        return { success: false, message: 'Preencha todos os campos obrigatórios.' };
    }

    if (password.length < 6) {
        return { success: false, message: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    if (password !== confirmPassword) {
        return { success: false, message: 'As senhas não coincidem.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, message: 'Formato de email inválido.' };
    }

    // Map role names
    const roleMap = {
        'estabelecimento': 'owner',
        'profissional': 'professional',
        'cliente': 'client',
    };

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        const response = await api.post('/auth/register', {
            firstName,
            lastName,
            email,
            password,
            role: roleMap[role] || role,
            salonName: salonName || name,
            cnpj: cnpj || undefined,
            specialty: specialty || undefined,
            planSlug,
        }, { skipAuth: true, skipTenant: true });

        if (!response.success) {
            return { success: false, message: response.message || 'Erro ao cadastrar' };
        }

        return { 
            success: true, 
            user: response.data.user,
            tenant: response.data.tenant,
            message: 'Cadastro realizado com sucesso! Faça login para continuar.'
        };

    } catch (error) {
        console.error('[Auth] Register error:', error);
        return { 
            success: false, 
            message: error.message || 'Erro ao cadastrar' 
        };
    }
}

// ============================================
// LOGOUT
// ============================================

/**
 * Logout current user
 */
export async function handleLogout() {
    try {
        // Call API to invalidate token (optional, may fail if already expired)
        await api.post('/auth/logout', {}).catch(() => {});
    } catch (e) {
        // Ignore logout API errors
    }

    // Clear local state
    clearAuthTokens();
    localStorage.removeItem(USER_KEY);
    setTenantSlug(null);
    stateLogout();
}

// ============================================
// SESSION RECOVERY
// ============================================

/**
 * Try to recover session from stored tokens
 * @returns {Promise<{success: boolean, user?: object}>}
 */
export async function recoverSession() {
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (!storedUser) {
        return { success: false };
    }

    try {
        // Validate token by calling profile endpoint
        const response = await api.get('/auth/me');
        
        if (response.success && response.data) {
            const user = response.data.user || response.data;
            const subscription = response.data.subscription;

            const sessionUser = {
                id: user.id,
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                avatar: user.avatar || '',
                tenantId: user.tenantId,
            };

            setCurrentUser(sessionUser);
            
            if (subscription) {
                setSubscriptionStatus(subscription);
            }

            return { success: true, user: sessionUser, subscription };
        }

        return { success: false };

    } catch (error) {
        console.warn('[Auth] Session recovery failed:', error.message);
        // Clear invalid session
        clearAuthTokens();
        localStorage.removeItem(USER_KEY);
        return { success: false };
    }
}

// ============================================
// PASSWORD RESET
// ============================================

/**
 * Request password reset email
 * @param {string} email 
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function requestPasswordReset(email) {
    if (!email) {
        return { success: false, message: 'Informe seu email' };
    }

    try {
        const response = await api.post('/auth/forgot-password', { email }, { skipAuth: true });
        return { 
            success: true, 
            message: response.message || 'Se o email existir, você receberá instruções de recuperação.' 
        };
    } catch (error) {
        // Don't reveal if email exists
        return { 
            success: true, 
            message: 'Se o email existir, você receberá instruções de recuperação.' 
        };
    }
}

/**
 * Reset password with token
 * @param {string} token 
 * @param {string} newPassword 
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function resetPassword(token, newPassword) {
    if (!token || !newPassword) {
        return { success: false, message: 'Dados inválidos' };
    }

    if (newPassword.length < 6) {
        return { success: false, message: 'A senha deve ter no mínimo 6 caracteres' };
    }

    try {
        const response = await api.post('/auth/reset-password', { 
            token, 
            password: newPassword 
        }, { skipAuth: true });
        
        return { 
            success: true, 
            message: response.message || 'Senha alterada com sucesso!' 
        };
    } catch (error) {
        return { 
            success: false, 
            message: error.message || 'Token inválido ou expirado' 
        };
    }
}


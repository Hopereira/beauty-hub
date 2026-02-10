/**
 * Authentication Module
 * Handles login, register, logout with localStorage-backed user store
 */

import { getCollection, addToCollection, findByField, KEYS } from './utils/localStorage.js';
import { setCurrentUser, logout as stateLogout } from './state.js';
import { showToast } from './utils/toast.js';

// ============================================
// LOGIN
// ============================================

export function handleLogin(email, password) {
    if (!email || !password) {
        return { success: false, message: 'Preencha todos os campos.' };
    }

    const users = getCollection(KEYS.USERS);
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return { success: false, message: 'Email ou senha incorretos.' };
    }

    // Create session (simulated token)
    const sessionUser = {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        avatar: user.avatar || '',
        specialty: user.specialty || '',
        token: 'bh-token-' + Date.now().toString(36),
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
}

// ============================================
// REGISTER
// ============================================

export function handleRegister({ name, email, password, confirmPassword, role, salonName, cnpj, specialty }) {
    // Validations
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

    // Check if email already exists
    const existing = findByField(KEYS.USERS, 'email', email);
    if (existing) {
        return { success: false, message: 'Este email já está cadastrado.' };
    }

    // Map role names
    const roleMap = {
        'estabelecimento': 'admin',
        'profissional': 'professional',
        'cliente': 'client',
    };

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = {
        name: name.trim(),
        firstName,
        lastName,
        email,
        password,
        role: roleMap[role] || role,
        phone: '',
        avatar: '',
        salonName: salonName || '',
        cnpj: cnpj || '',
        specialty: specialty || '',
    };

    const created = addToCollection(KEYS.USERS, newUser);

    return { success: true, user: created };
}

// ============================================
// LOGOUT
// ============================================

export function handleLogout() {
    stateLogout();
}


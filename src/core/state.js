/**
 * State Management Module
 * Centralized application state with event-driven updates
 */

import { getItem, saveItem, removeItem, KEYS } from '../shared/utils/localStorage.js';

// ============================================
// APP STATE
// ============================================

const appState = {
    currentUser: null,
    currentPage: '',
};

// Simple event bus for state changes
const listeners = {};

export function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
}

export function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
}

function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => cb(data));
}

// ============================================
// USER STATE
// ============================================

export function getCurrentUser() {
    if (!appState.currentUser) {
        appState.currentUser = getItem(KEYS.CURRENT_USER);
    }
    return appState.currentUser;
}

export function setCurrentUser(user) {
    appState.currentUser = user;
    saveItem(KEYS.CURRENT_USER, user);
    emit('userChanged', user);
}

export function isAuthenticated() {
    return getCurrentUser() !== null;
}

export function getUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

export function logout() {
    appState.currentUser = null;
    removeItem(KEYS.CURRENT_USER);
    emit('userChanged', null);
    emit('logout');
}

// ============================================
// PAGE STATE
// ============================================

export function setCurrentPage(page) {
    appState.currentPage = page;
    emit('pageChanged', page);
}

export function getCurrentPage() {
    return appState.currentPage;
}

// ============================================
// EXPORTS
// ============================================

export default appState;

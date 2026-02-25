/**
 * State Management Module
 * Centralized application state with event-driven updates
 */

import { getItem, saveItem, removeItem, KEYS } from '../shared/utils/localStorage.js';
import { USER_KEY, SUBSCRIPTION_STATUS } from './config.js';

// ============================================
// APP STATE
// ============================================

const appState = {
    currentUser: null,
    currentPage: '',
    subscription: null,
    subscriptionBannerDismissed: false,
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
    appState.subscription = null;
    removeItem(KEYS.CURRENT_USER);
    emit('userChanged', null);
    emit('subscriptionChanged', null);
    emit('logout');
}

// ============================================
// SUBSCRIPTION STATE
// ============================================

export function getSubscriptionStatus() {
    return appState.subscription;
}

export function setSubscriptionStatus(subscription) {
    appState.subscription = subscription;
    emit('subscriptionChanged', subscription);
}

export function isSubscriptionActive() {
    const sub = appState.subscription;
    if (!sub) return true; // No subscription info = allow (for backwards compat)
    return [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL].includes(sub.status);
}

export function isSubscriptionBlocked() {
    const sub = appState.subscription;
    if (!sub) return false;
    return [
        SUBSCRIPTION_STATUS.SUSPENDED, 
        SUBSCRIPTION_STATUS.CANCELLED, 
        SUBSCRIPTION_STATUS.EXPIRED
    ].includes(sub.status);
}

export function getSubscriptionMessage() {
    const sub = appState.subscription;
    if (!sub) return null;

    switch (sub.status) {
        case SUBSCRIPTION_STATUS.TRIAL:
            const daysLeft = sub.daysRemaining || 0;
            return daysLeft <= 7 
                ? `Seu período de teste termina em ${daysLeft} dias. Assine agora!`
                : null;
        case SUBSCRIPTION_STATUS.PAST_DUE:
            return 'Pagamento pendente. Regularize para evitar suspensão.';
        case SUBSCRIPTION_STATUS.SUSPENDED:
            return 'Conta suspensa por falta de pagamento.';
        case SUBSCRIPTION_STATUS.EXPIRED:
            return 'Seu período de teste expirou. Assine para continuar.';
        case SUBSCRIPTION_STATUS.CANCELLED:
            return 'Assinatura cancelada.';
        default:
            return null;
    }
}

export function dismissSubscriptionBanner() {
    appState.subscriptionBannerDismissed = true;
    emit('subscriptionBannerDismissed');
}

export function shouldShowSubscriptionBanner() {
    if (appState.subscriptionBannerDismissed) return false;
    return !!getSubscriptionMessage();
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

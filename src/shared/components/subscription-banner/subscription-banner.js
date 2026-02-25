/**
 * Subscription Banner Component
 * Shows warnings for trial expiration, payment issues, suspended accounts
 */

import { 
    getSubscriptionMessage, 
    shouldShowSubscriptionBanner, 
    dismissSubscriptionBanner,
    getSubscriptionStatus,
    on,
} from '../../../core/state.js';
import { SUBSCRIPTION_STATUS } from '../../../core/config.js';

let bannerElement = null;

export function renderSubscriptionBanner() {
    // Remove existing banner if any
    if (bannerElement) {
        bannerElement.remove();
        bannerElement = null;
    }

    if (!shouldShowSubscriptionBanner()) return;

    const message = getSubscriptionMessage();
    if (!message) return;

    const subscription = getSubscriptionStatus();
    const severity = getBannerSeverity(subscription?.status);

    bannerElement = document.createElement('div');
    bannerElement.id = 'subscription-banner';
    bannerElement.className = `subscription-banner subscription-banner--${severity}`;
    bannerElement.innerHTML = `
        <div class="subscription-banner__content">
            <span class="subscription-banner__icon">${getIcon(severity)}</span>
            <span class="subscription-banner__message">${message}</span>
            ${getActionButton(subscription?.status)}
        </div>
        <button class="subscription-banner__close" aria-label="Fechar">&times;</button>
    `;

    // Insert at top of main content
    const mainContent = document.querySelector('#app') || document.body;
    mainContent.insertBefore(bannerElement, mainContent.firstChild);

    // Add event listeners
    const closeBtn = bannerElement.querySelector('.subscription-banner__close');
    closeBtn?.addEventListener('click', () => {
        dismissSubscriptionBanner();
        bannerElement?.remove();
        bannerElement = null;
    });

    const actionBtn = bannerElement.querySelector('.subscription-banner__action');
    actionBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        // Navigate to billing/payment page
        window.location.href = '/billing';
    });
}

function getBannerSeverity(status) {
    switch (status) {
        case SUBSCRIPTION_STATUS.SUSPENDED:
        case SUBSCRIPTION_STATUS.EXPIRED:
        case SUBSCRIPTION_STATUS.CANCELLED:
            return 'error';
        case SUBSCRIPTION_STATUS.PAST_DUE:
            return 'warning';
        case SUBSCRIPTION_STATUS.TRIAL:
            return 'info';
        default:
            return 'info';
    }
}

function getIcon(severity) {
    switch (severity) {
        case 'error':
            return '🚫';
        case 'warning':
            return '⚠️';
        default:
            return 'ℹ️';
    }
}

function getActionButton(status) {
    switch (status) {
        case SUBSCRIPTION_STATUS.SUSPENDED:
        case SUBSCRIPTION_STATUS.EXPIRED:
        case SUBSCRIPTION_STATUS.PAST_DUE:
            return '<a href="/billing" class="subscription-banner__action">Regularizar</a>';
        case SUBSCRIPTION_STATUS.TRIAL:
            return '<a href="/billing" class="subscription-banner__action">Assinar agora</a>';
        default:
            return '';
    }
}

export function initSubscriptionBanner() {
    // Listen for subscription changes
    on('subscriptionChanged', () => {
        renderSubscriptionBanner();
    });

    // Initial render
    renderSubscriptionBanner();
}

export function removeSubscriptionBanner() {
    if (bannerElement) {
        bannerElement.remove();
        bannerElement = null;
    }
}

/**
 * Form Validation Utility
 * Provides reusable validation functions with visual feedback
 */

// ============================================
// VALIDATORS
// ============================================

export function validateRequired(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

export function validateEmail(email) {
    if (!validateRequired(email)) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password, minLength = 6) {
    if (!validateRequired(password)) return false;
    return password.length >= minLength;
}

export function validatePasswordMatch(password, confirmPassword) {
    return password === confirmPassword;
}

export function validateDate(dateStr) {
    if (!validateRequired(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

export function validateFutureDate(dateStr) {
    if (!validateDate(dateStr)) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

export function validateTime(timeStr) {
    if (!validateRequired(timeStr)) return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
}

export function validateNumber(value) {
    if (!validateRequired(value)) return false;
    const num = parseFloat(String(value).replace(',', '.').replace(/[R$\s]/g, ''));
    return !isNaN(num) && num >= 0;
}

export function validatePhone(phone) {
    if (!validateRequired(phone)) return false;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
}

// ============================================
// UI FEEDBACK
// ============================================

export function showValidationError(inputElement, message) {
    clearValidationError(inputElement);
    inputElement.classList.add('input-error');
    inputElement.classList.remove('input-success');

    const errorEl = document.createElement('span');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.setAttribute('data-validation-error', 'true');

    inputElement.parentNode.appendChild(errorEl);
}

export function clearValidationError(inputElement) {
    inputElement.classList.remove('input-error');
    const existing = inputElement.parentNode.querySelector('[data-validation-error]');
    if (existing) existing.remove();
}

export function showValidationSuccess(inputElement) {
    clearValidationError(inputElement);
    inputElement.classList.add('input-success');
}

export function clearAllErrors(formElement) {
    formElement.querySelectorAll('.input-error').forEach(el => {
        el.classList.remove('input-error');
    });
    formElement.querySelectorAll('.input-success').forEach(el => {
        el.classList.remove('input-success');
    });
    formElement.querySelectorAll('[data-validation-error]').forEach(el => {
        el.remove();
    });
}

// ============================================
// FORM VALIDATION RUNNER
// ============================================

/**
 * Validate a form using a rules config
 * @param {HTMLFormElement} form
 * @param {Array<{field: string, rules: Array<{test: Function, message: string}>}>} config
 * @returns {{valid: boolean, errors: Object}}
 */
export function validateForm(form, config) {
    clearAllErrors(form);
    const errors = {};
    let valid = true;

    for (const { field, rules } of config) {
        const input = form.querySelector(`[name="${field}"], #${field}`);
        if (!input) continue;

        const value = input.value;

        for (const rule of rules) {
            if (!rule.test(value)) {
                valid = false;
                errors[field] = rule.message;
                showValidationError(input, rule.message);
                break;
            }
        }
    }

    return { valid, errors };
}

// ============================================
// CURRENCY HELPERS
// ============================================

export function parseCurrency(value) {
    if (typeof value === 'number') return value;
    return parseFloat(String(value).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

export function formatCurrency(value) {
    return 'R$ ' + Number(value).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

export function formatDateISO(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('-')) return dateStr;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

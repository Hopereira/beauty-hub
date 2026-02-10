/**
 * Shared Utils Barrel Export
 */

export { saveItem, getItem, removeItem, getCollection, addToCollection, updateInCollection, removeFromCollection, findInCollection, findByField, filterCollection, generateId, initializeData, resetData, KEYS } from './localStorage.js';
export { validateRequired, validateEmail, validatePassword, validatePasswordMatch, validateDate, validateFutureDate, validateTime, validateNumber, validatePhone, showValidationError, clearValidationError, showValidationSuccess, clearAllErrors, validateForm } from './validation.js';
export { parseCurrency, formatCurrency, formatDate, formatDateISO } from './formatting.js';
export { showToast } from './toast.js';
export { request, api } from './http.js';

/**
 * LocalStorage Utility Module
 * Provides CRUD helpers and seed data initialization for Beauty Hub
 */

// ============================================
// CORE HELPERS
// ============================================

export function saveItem(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`[localStorage] Error saving "${key}":`, e);
    }
}

export function getItem(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error(`[localStorage] Error reading "${key}":`, e);
        return null;
    }
}

export function removeItem(key) {
    localStorage.removeItem(key);
}

// ============================================
// UNIQUE ID GENERATOR
// ============================================

export function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
}

// ============================================
// COLLECTION HELPERS (array-based CRUD)
// ============================================

export function getCollection(key) {
    return getItem(key) || [];
}

export function addToCollection(key, item) {
    const collection = getCollection(key);
    const newItem = { id: generateId(), ...item };
    collection.push(newItem);
    saveItem(key, collection);
    return newItem;
}

export function updateInCollection(key, id, updatedData) {
    let collection = getCollection(key);
    const index = collection.findIndex(item => item.id === id);
    if (index === -1) return null;
    collection[index] = { ...collection[index], ...updatedData };
    saveItem(key, collection);
    return collection[index];
}

export function removeFromCollection(key, id) {
    let collection = getCollection(key);
    const filtered = collection.filter(item => item.id !== id);
    if (filtered.length === collection.length) return false;
    saveItem(key, filtered);
    return true;
}

export function findInCollection(key, id) {
    const collection = getCollection(key);
    return collection.find(item => item.id === id) || null;
}

export function findByField(key, field, value) {
    const collection = getCollection(key);
    return collection.find(item => item[field] === value) || null;
}

export function filterCollection(key, filterFn) {
    const collection = getCollection(key);
    return collection.filter(filterFn);
}

// ============================================
// STORAGE KEYS (constants)
// ============================================

export const KEYS = {
    USERS: 'bh_users',
    CURRENT_USER: 'bh_currentUser',
    APPOINTMENTS: 'bh_appointments',
    FINANCIAL: 'bh_financial',
    CLIENTS: 'bh_clients',
    SETTINGS: 'bh_settings',
};

// ============================================
// SEED DATA
// ============================================

const SEED_USERS = [
    {
        id: 'u-admin-001',
        name: 'Administrador',
        firstName: 'Admin',
        lastName: 'Beauty Hub',
        email: 'adm@adm',
        password: '123456',
        role: 'admin',
        phone: '11999990000',
        avatar: 'https://i.pravatar.cc/150?img=12',
    },
    {
        id: 'u-prof-001',
        name: 'Ana Profissional',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'prof@prof',
        password: '123456',
        role: 'professional',
        phone: '11999991111',
        specialty: 'Extensão de Cílios',
        avatar: 'https://i.pravatar.cc/150?img=5',
    },
];

const SEED_CLIENTS = [
    { id: 'c-001', name: 'Thaisa Oliveira', phone: '11988881111', email: 'thaisa@email.com', registrationDate: '2025-12-10' },
    { id: 'c-002', name: 'Rafaela Costa', phone: '11988882222', email: 'rafaela@email.com', registrationDate: '2025-12-15' },
    { id: 'c-003', name: 'Taís Mendes', phone: '11988883333', email: 'tais@email.com', registrationDate: '2026-01-05' },
    { id: 'c-004', name: 'Monique Santos', phone: '11988884444', email: 'monique@email.com', registrationDate: '2026-01-10' },
    { id: 'c-005', name: 'Lauryn Ribeiro', phone: '11988885555', email: 'lauryn@email.com', registrationDate: '2026-01-12' },
    { id: 'c-006', name: 'Ana Paula', phone: '11988886666', email: 'anapaula@email.com', registrationDate: '2026-01-20' },
    { id: 'c-007', name: 'Claudia Ferreira', phone: '11988887777', email: 'claudia@email.com', registrationDate: '2026-01-22' },
    { id: 'c-008', name: 'Sueli Martins', phone: '11988888888', email: 'sueli@email.com', registrationDate: '2026-01-25' },
    { id: 'c-009', name: 'Sonia Almeida', phone: '11988889999', email: 'sonia@email.com', registrationDate: '2026-01-28' },
    { id: 'c-010', name: 'Monica Lima', phone: '11988880000', email: 'monica@email.com', registrationDate: '2026-02-01' },
];

const SEED_APPOINTMENTS = [
    { id: 'a-001', clientId: 'c-006', professionalId: 'u-prof-001', service: 'Extensão de Cílios', date: '2026-02-02', startTime: '15:00', endTime: '16:30', value: 150, status: 'completed', paymentMethod: 'pix', notes: '' },
    { id: 'a-002', clientId: 'c-005', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-03', startTime: '10:00', endTime: '11:00', value: 90, status: 'completed', paymentMethod: 'dinheiro', notes: '' },
    { id: 'a-003', clientId: 'c-006', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-03', startTime: '11:30', endTime: '12:30', value: 90, status: 'completed', paymentMethod: 'credito', notes: '' },
    { id: 'a-004', clientId: 'c-007', professionalId: 'u-prof-001', service: 'Extensão de Cílios', date: '2026-02-03', startTime: '13:30', endTime: '15:00', value: 150, status: 'completed', paymentMethod: 'debito', notes: '' },
    { id: 'a-005', clientId: 'c-008', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-03', startTime: '14:30', endTime: '15:30', value: 100, status: 'pending', paymentMethod: '', notes: '' },
    { id: 'a-006', clientId: 'c-009', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-04', startTime: '10:30', endTime: '11:30', value: 100, status: 'completed', paymentMethod: 'pix', notes: '' },
    { id: 'a-007', clientId: 'c-010', professionalId: 'u-prof-001', service: 'Extensão de Cílios', date: '2026-02-04', startTime: '12:00', endTime: '13:30', value: 130, status: 'completed', paymentMethod: 'credito', notes: '' },
    { id: 'a-008', clientId: 'c-002', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-04', startTime: '15:00', endTime: '16:00', value: 100, status: 'pending', paymentMethod: '', notes: '' },
    { id: 'a-009', clientId: 'c-001', professionalId: 'u-prof-001', service: 'Manutenção', date: '2026-02-10', startTime: '09:00', endTime: '10:00', value: 90, status: 'scheduled', paymentMethod: '', notes: '' },
    { id: 'a-010', clientId: 'c-003', professionalId: 'u-prof-001', service: 'Extensão de Cílios', date: '2026-02-12', startTime: '14:00', endTime: '15:30', value: 150, status: 'scheduled', paymentMethod: '', notes: '' },
];

const SEED_FINANCIAL = [
    // Incomes (from appointments)
    { id: 'f-001', type: 'income', description: 'Manutenção', clientName: 'Thaisa', value: 90, date: '2026-02-03', status: 'pending', paymentMethod: 'dinheiro', category: 'Serviço', relatedAppointmentId: 'a-002' },
    { id: 'f-002', type: 'income', description: 'Manutenção', clientName: 'Rafaela', value: 100, date: '2026-02-03', status: 'completed', paymentMethod: 'credito', category: 'Serviço', relatedAppointmentId: 'a-003' },
    { id: 'f-003', type: 'income', description: 'Manutenção', clientName: 'Taís', value: 100, date: '2026-02-03', status: 'pending', paymentMethod: 'pix', category: 'Serviço', relatedAppointmentId: 'a-005' },
    { id: 'f-004', type: 'income', description: 'Manutenção', clientName: 'Rafa', value: 100, date: '2026-02-03', status: 'pending', paymentMethod: 'debito', category: 'Serviço', relatedAppointmentId: '' },
    { id: 'f-005', type: 'income', description: 'Manutenção', clientName: 'Monique', value: 130, date: '2026-02-03', status: 'completed', paymentMethod: 'pix', category: 'Serviço', relatedAppointmentId: 'a-007' },
    // Expenses
    { id: 'f-006', type: 'expense', description: 'Material cílios (pix)', clientName: '', value: 559.76, date: '2026-02-03', status: 'completed', paymentMethod: 'pix', category: 'Material' },
    { id: 'f-007', type: 'expense', description: 'Padaria', clientName: '', value: 59.50, date: '2026-02-03', status: 'completed', paymentMethod: 'dinheiro', category: 'Alimentação' },
    { id: 'f-008', type: 'expense', description: 'Luz', clientName: '', value: 90.00, date: '2026-02-03', status: 'completed', paymentMethod: 'pix', category: 'Contas' },
];

// ============================================
// INITIALIZATION
// ============================================

export function initializeData() {
    if (!getItem(KEYS.USERS)) {
        saveItem(KEYS.USERS, SEED_USERS);
    }
    if (!getItem(KEYS.CLIENTS)) {
        saveItem(KEYS.CLIENTS, SEED_CLIENTS);
    }
    if (!getItem(KEYS.APPOINTMENTS)) {
        saveItem(KEYS.APPOINTMENTS, SEED_APPOINTMENTS);
    }
    if (!getItem(KEYS.FINANCIAL)) {
        saveItem(KEYS.FINANCIAL, SEED_FINANCIAL);
    }
}

/**
 * Reset all data to seed defaults (useful for dev/testing)
 */
export function resetData() {
    removeItem(KEYS.USERS);
    removeItem(KEYS.CLIENTS);
    removeItem(KEYS.APPOINTMENTS);
    removeItem(KEYS.FINANCIAL);
    removeItem(KEYS.CURRENT_USER);
    removeItem(KEYS.SETTINGS);
    initializeData();
}

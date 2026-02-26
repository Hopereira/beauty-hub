/**
 * Services Page Module
 * CRUD for services with categories and professional assignment
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let services = [];
let professionals = [];
let filters = { search: '', category: '', status: '' };
let pagination = { page: 1, limit: 10, total: 0 };
let isLoading = false;

const CATEGORIES = [
    { value: 'hair', label: 'Cabelo' },
    { value: 'nails', label: 'Unhas' },
    { value: 'makeup', label: 'Maquiagem' },
    { value: 'skin', label: 'Estética' },
    { value: 'massage', label: 'Massagem' },
    { value: 'other', label: 'Outros' },
];

export function render() {
    renderShell('services');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        services = [];
        professionals = [];
        filters = { search: '', category: '', status: '' };
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const [servicesRes, professionalsRes] = await Promise.all([
            api.get('/services'),
            api.get('/professionals').catch(() => ({ data: [] })),
        ]);

        services = servicesRes.data || [];
        professionals = professionalsRes.data || [];
    } catch (error) {
        console.error('[Services] Error loading data:', error);
        showToast('Erro ao carregar serviços', 'error');
        services = [];
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    const blocked = isSubscriptionBlocked();
    const filteredServices = applyFilters(services);

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Serviços</h1>
            <button class="btn-primary" id="btnNewService" ${blocked ? 'disabled title="Assinatura inativa"' : ''}>
                <i class="fas fa-plus"></i> Novo Serviço
            </button>
        </div>

        <div class="filter-bar">
            <input type="text" class="filter-input" id="searchInput" placeholder="Buscar serviço..." value="${filters.search}">
            <select class="filter-select" id="categoryFilter">
                <option value="">Todas categorias</option>
                ${CATEGORIES.map(c => `<option value="${c.value}" ${filters.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
            </select>
            <select class="filter-select" id="statusFilter">
                <option value="">Todos status</option>
                <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Ativos</option>
                <option value="inactive" ${filters.status === 'inactive' ? 'selected' : ''}>Inativos</option>
            </select>
        </div>

        <div class="data-table-container">
            ${filteredServices.length ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Serviço</th>
                            <th>Categoria</th>
                            <th>Duração</th>
                            <th>Preço</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredServices.map(service => `
                            <tr>
                                <td>
                                    <div style="font-weight:600;">${service.name}</div>
                                    <div style="font-size:0.85rem;color:var(--text-muted);">${service.description || ''}</div>
                                </td>
                                <td>${getCategoryLabel(service.category)}</td>
                                <td>${service.duration || 30} min</td>
                                <td>${formatCurrency(service.price || 0)}</td>
                                <td>
                                    <span class="status-badge status-badge--${service.is_active !== false ? 'success' : 'default'}">
                                        ${service.is_active !== false ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="edit-btn" data-id="${service.id}" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-btn" data-id="${service.id}" title="Excluir" ${blocked ? 'disabled' : ''}>
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <i class="fas fa-cut"></i>
                    <h3>Nenhum serviço encontrado</h3>
                    <p>Cadastre seu primeiro serviço para começar</p>
                </div>
            `}
        </div>

        ${renderPagination(filteredServices.length)}
    `;

    bindEvents();
}

function applyFilters(data) {
    return data.filter(item => {
        if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.status === 'active' && item.is_active === false) return false;
        if (filters.status === 'inactive' && item.is_active !== false) return false;
        return true;
    });
}

function renderPagination(total) {
    if (total <= pagination.limit) return '';
    
    const totalPages = Math.ceil(total / pagination.limit);
    
    return `
        <div class="pagination">
            <button class="pagination-btn" ${pagination.page <= 1 ? 'disabled' : ''} data-page="${pagination.page - 1}">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="pagination-info">Página ${pagination.page} de ${totalPages}</span>
            <button class="pagination-btn" ${pagination.page >= totalPages ? 'disabled' : ''} data-page="${pagination.page + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function bindEvents() {
    // New service button
    document.getElementById('btnNewService')?.addEventListener('click', () => showServiceModal());

    // Search input
    document.getElementById('searchInput')?.addEventListener('input', debounce((e) => {
        filters.search = e.target.value;
        renderContent();
    }, 300));

    // Category filter
    document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
        filters.category = e.target.value;
        renderContent();
    });

    // Status filter
    document.getElementById('statusFilter')?.addEventListener('change', (e) => {
        filters.status = e.target.value;
        renderContent();
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = services.find(s => s.id === btn.dataset.id);
            if (service) showServiceModal(service);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
}

function showServiceModal(service = null) {
    const isEdit = !!service;
    
    const modalHTML = `
        <div class="modal-overlay" id="serviceModal" style="display:flex;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                </div>
                <form id="serviceForm">
                    <div class="modal-field">
                        <label class="modal-label">Nome do Serviço *</label>
                        <input type="text" class="modal-input" id="serviceName" value="${service?.name || ''}" required>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Descrição</label>
                        <textarea class="modal-input" id="serviceDescription" rows="2">${service?.description || ''}</textarea>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Categoria *</label>
                            <select class="modal-input" id="serviceCategory" required>
                                <option value="">Selecione</option>
                                ${CATEGORIES.map(c => `<option value="${c.value}" ${service?.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Duração (min) *</label>
                            <input type="number" class="modal-input" id="serviceDuration" value="${service?.duration || 30}" min="5" step="5" required>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Preço *</label>
                            <input type="number" class="modal-input" id="servicePrice" value="${service?.price || ''}" min="0" step="0.01" required>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Comissão (%)</label>
                            <input type="number" class="modal-input" id="serviceCommission" value="${service?.commission || 0}" min="0" max="100">
                        </div>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Profissionais que realizam</label>
                        <div class="checkbox-group" style="max-height:150px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.5rem;">
                            ${professionals.map(p => `
                                <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;cursor:pointer;">
                                    <input type="checkbox" name="professionals" value="${p.id}" ${service?.professional_ids?.includes(p.id) ? 'checked' : ''}>
                                    ${p.name || `${p.first_name} ${p.last_name}`}
                                </label>
                            `).join('') || '<p class="text-muted" style="padding:0.5rem;">Nenhum profissional cadastrado</p>'}
                        </div>
                    </div>
                    <div class="modal-field">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                            <input type="checkbox" id="serviceActive" ${service?.is_active !== false ? 'checked' : ''}>
                            Serviço ativo
                        </label>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('serviceModal').remove()">Cancelar</button>
                        <button type="submit" class="btn-primary" id="btnSaveService">
                            ${isEdit ? 'Salvar' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(service?.id);
    });
}

async function handleSave(serviceId = null) {
    const btn = document.getElementById('btnSaveService');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    const selectedProfessionals = Array.from(document.querySelectorAll('input[name="professionals"]:checked'))
        .map(cb => cb.value);

    const data = {
        name: document.getElementById('serviceName').value,
        description: document.getElementById('serviceDescription').value,
        category: document.getElementById('serviceCategory').value,
        duration: parseInt(document.getElementById('serviceDuration').value),
        price: parseFloat(document.getElementById('servicePrice').value),
        commission: parseFloat(document.getElementById('serviceCommission').value) || 0,
        professional_ids: selectedProfessionals,
        is_active: document.getElementById('serviceActive').checked,
    };

    try {
        if (serviceId) {
            await api.put(`/services/${serviceId}`, data);
            showToast('Serviço atualizado com sucesso!', 'success');
        } else {
            await api.post('/services', data);
            showToast('Serviço criado com sucesso!', 'success');
        }

        document.getElementById('serviceModal')?.remove();
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Services] Save error:', error);
        showToast(error.message || 'Erro ao salvar serviço', 'error');
        btn.disabled = false;
        btn.innerHTML = serviceId ? 'Salvar' : 'Criar';
    }
}

async function handleDelete(serviceId) {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
        await api.delete(`/services/${serviceId}`);
        showToast('Serviço excluído com sucesso!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Services] Delete error:', error);
        showToast(error.message || 'Erro ao excluir serviço', 'error');
    }
}

function getCategoryLabel(value) {
    return CATEGORIES.find(c => c.value === value)?.label || value || '-';
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

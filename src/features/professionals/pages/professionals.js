/**
 * Professionals Page Module
 * CRUD for professionals with specialties, commission, and schedules
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let professionals = [];
let services = [];
let filters = { search: '', specialty: '', status: '' };
let isLoading = false;

const SPECIALTIES = [
    { value: 'hair', label: 'Cabelereiro(a)' },
    { value: 'nails', label: 'Manicure/Pedicure' },
    { value: 'makeup', label: 'Maquiador(a)' },
    { value: 'skin', label: 'Esteticista' },
    { value: 'massage', label: 'Massagista' },
    { value: 'barber', label: 'Barbeiro' },
    { value: 'other', label: 'Outros' },
];

export function render() {
    renderShell('professionals');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        professionals = [];
        services = [];
        filters = { search: '', specialty: '', status: '' };
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
        const [profRes, servicesRes] = await Promise.all([
            api.get('/professionals'),
            api.get('/services').catch(() => ({ data: [] })),
        ]);

        professionals = profRes.data || [];
        services = servicesRes.data || [];
    } catch (error) {
        console.error('[Professionals] Error loading data:', error);
        showToast('Erro ao carregar profissionais', 'error');
        professionals = [];
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    const blocked = isSubscriptionBlocked();
    const filteredProfessionals = applyFilters(professionals);

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Profissionais</h1>
            <button class="btn-primary" id="btnNewProfessional" ${blocked ? 'disabled title="Assinatura inativa"' : ''}>
                <i class="fas fa-plus"></i> Novo Profissional
            </button>
        </div>

        <div class="filter-bar">
            <input type="text" class="filter-input" id="searchInput" placeholder="Buscar profissional..." value="${filters.search}">
            <select class="filter-select" id="specialtyFilter">
                <option value="">Todas especialidades</option>
                ${SPECIALTIES.map(s => `<option value="${s.value}" ${filters.specialty === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <select class="filter-select" id="statusFilter">
                <option value="">Todos status</option>
                <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Ativos</option>
                <option value="inactive" ${filters.status === 'inactive' ? 'selected' : ''}>Inativos</option>
            </select>
        </div>

        <div class="data-table-container">
            ${filteredProfessionals.length ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Profissional</th>
                            <th>Especialidade</th>
                            <th>Comissão</th>
                            <th>Serviços</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredProfessionals.map(prof => `
                            <tr>
                                <td>
                                    <div style="display:flex;align-items:center;gap:0.75rem;">
                                        <div class="avatar" style="width:36px;height:36px;font-size:0.85rem;">
                                            ${getInitials(prof)}
                                        </div>
                                        <div>
                                            <div style="font-weight:600;">${prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim()}</div>
                                            <div style="font-size:0.85rem;color:var(--text-muted);">${prof.email || prof.phone || ''}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>${getSpecialtyLabel(prof.specialty)}</td>
                                <td>${prof.commission || 0}%</td>
                                <td>${prof.services_count || prof.service_ids?.length || 0}</td>
                                <td>
                                    <span class="status-badge status-badge--${prof.is_active !== false ? 'success' : 'default'}">
                                        ${prof.is_active !== false ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="edit-btn" data-id="${prof.id}" title="Editar">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-btn" data-id="${prof.id}" title="Excluir" ${blocked ? 'disabled' : ''}>
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
                    <i class="fas fa-user-tie"></i>
                    <h3>Nenhum profissional encontrado</h3>
                    <p>Cadastre seu primeiro profissional para começar</p>
                </div>
            `}
        </div>
    `;

    bindEvents();
}

function applyFilters(data) {
    return data.filter(item => {
        const name = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
        if (filters.search && !name.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.specialty && item.specialty !== filters.specialty) return false;
        if (filters.status === 'active' && item.is_active === false) return false;
        if (filters.status === 'inactive' && item.is_active !== false) return false;
        return true;
    });
}

function bindEvents() {
    // New professional button
    document.getElementById('btnNewProfessional')?.addEventListener('click', () => showProfessionalModal());

    // Search input
    document.getElementById('searchInput')?.addEventListener('input', debounce((e) => {
        filters.search = e.target.value;
        renderContent();
    }, 300));

    // Specialty filter
    document.getElementById('specialtyFilter')?.addEventListener('change', (e) => {
        filters.specialty = e.target.value;
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
            const prof = professionals.find(p => p.id === btn.dataset.id);
            if (prof) showProfessionalModal(prof);
        });
    });

    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id));
    });
}

function showProfessionalModal(professional = null) {
    const isEdit = !!professional;
    const name = professional?.name || `${professional?.first_name || ''} ${professional?.last_name || ''}`.trim();
    
    const modalHTML = `
        <div class="modal-overlay" id="professionalModal" style="display:flex;">
            <div class="modal-content" style="max-width:550px;">
                <div class="modal-header">
                    <h2>${isEdit ? 'Editar Profissional' : 'Novo Profissional'}</h2>
                </div>
                <form id="professionalForm">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Nome *</label>
                            <input type="text" class="modal-input" id="profFirstName" value="${professional?.first_name || professional?.name?.split(' ')[0] || ''}" required>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Sobrenome</label>
                            <input type="text" class="modal-input" id="profLastName" value="${professional?.last_name || professional?.name?.split(' ').slice(1).join(' ') || ''}">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Email</label>
                            <input type="email" class="modal-input" id="profEmail" value="${professional?.email || ''}">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Telefone</label>
                            <input type="tel" class="modal-input" id="profPhone" value="${professional?.phone || ''}">
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Especialidade *</label>
                            <select class="modal-input" id="profSpecialty" required>
                                <option value="">Selecione</option>
                                ${SPECIALTIES.map(s => `<option value="${s.value}" ${professional?.specialty === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Comissão (%)</label>
                            <input type="number" class="modal-input" id="profCommission" value="${professional?.commission || 30}" min="0" max="100">
                        </div>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Serviços que realiza</label>
                        <div class="checkbox-group" style="max-height:150px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.5rem;">
                            ${services.map(s => `
                                <label style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem;cursor:pointer;">
                                    <input type="checkbox" name="services" value="${s.id}" ${professional?.service_ids?.includes(s.id) ? 'checked' : ''}>
                                    ${s.name}
                                </label>
                            `).join('') || '<p class="text-muted" style="padding:0.5rem;">Nenhum serviço cadastrado</p>'}
                        </div>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Horário de Trabalho</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                            <div>
                                <label style="font-size:0.85rem;color:var(--text-muted);">Início</label>
                                <input type="time" class="modal-input" id="profWorkStart" value="${professional?.work_start || '09:00'}">
                            </div>
                            <div>
                                <label style="font-size:0.85rem;color:var(--text-muted);">Fim</label>
                                <input type="time" class="modal-input" id="profWorkEnd" value="${professional?.work_end || '18:00'}">
                            </div>
                        </div>
                    </div>
                    <div class="modal-field">
                        <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
                            <input type="checkbox" id="profActive" ${professional?.is_active !== false ? 'checked' : ''}>
                            Profissional ativo
                        </label>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('professionalModal').remove()">Cancelar</button>
                        <button type="submit" class="btn-primary" id="btnSaveProfessional">
                            ${isEdit ? 'Salvar' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('professionalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSave(professional?.id);
    });
}

async function handleSave(professionalId = null) {
    const btn = document.getElementById('btnSaveProfessional');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    const selectedServices = Array.from(document.querySelectorAll('input[name="services"]:checked'))
        .map(cb => cb.value);

    const data = {
        first_name: document.getElementById('profFirstName').value,
        last_name: document.getElementById('profLastName').value,
        name: `${document.getElementById('profFirstName').value} ${document.getElementById('profLastName').value}`.trim(),
        email: document.getElementById('profEmail').value || undefined,
        phone: document.getElementById('profPhone').value || undefined,
        specialty: document.getElementById('profSpecialty').value,
        commission: parseFloat(document.getElementById('profCommission').value) || 0,
        service_ids: selectedServices,
        work_start: document.getElementById('profWorkStart').value,
        work_end: document.getElementById('profWorkEnd').value,
        is_active: document.getElementById('profActive').checked,
    };

    try {
        if (professionalId) {
            await api.put(`/professionals/${professionalId}`, data);
            showToast('Profissional atualizado com sucesso!', 'success');
        } else {
            await api.post('/professionals', data);
            showToast('Profissional criado com sucesso!', 'success');
        }

        document.getElementById('professionalModal')?.remove();
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Professionals] Save error:', error);
        showToast(error.message || 'Erro ao salvar profissional', 'error');
        btn.disabled = false;
        btn.innerHTML = professionalId ? 'Salvar' : 'Criar';
    }
}

async function handleDelete(professionalId) {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    try {
        await api.delete(`/professionals/${professionalId}`);
        showToast('Profissional excluído com sucesso!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        console.error('[Professionals] Delete error:', error);
        showToast(error.message || 'Erro ao excluir profissional', 'error');
    }
}

function getInitials(prof) {
    const name = prof.name || `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
    const parts = name.split(' ');
    return parts.length > 1 
        ? `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase()
        : name.substring(0, 2).toUpperCase();
}

function getSpecialtyLabel(value) {
    return SPECIALTIES.find(s => s.value === value)?.label || value || '-';
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

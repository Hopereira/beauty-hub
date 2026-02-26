/**
 * Professional Appointments Page
 * Meus agendamentos com filtros
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate, formatTime } from '../../../shared/utils/validation.js';

let appointments = [];
let pagination = { page: 1, limit: 20, total: 0 };
let filters = { status: '', startDate: '', endDate: '' };
let isLoading = false;

const STATUS_LABELS = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Não Compareceu',
};

const STATUS_COLORS = {
    PENDING: '#FF9800',
    CONFIRMED: '#2196F3',
    COMPLETED: '#4CAF50',
    CANCELLED: '#F44336',
    NO_SHOW: '#9E9E9E',
};

export function render() {
    renderShell('professional-appointments');
}

export async function init() {
    await loadAppointments();
    renderContent();
    attachEventListeners();
    
    return () => {
        appointments = [];
        pagination = { page: 1, limit: 20, total: 0 };
        filters = { status: '', startDate: '', endDate: '' };
    };
}

async function loadAppointments() {
    isLoading = true;
    renderContent();

    try {
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.limit,
            ...(filters.status && { status: filters.status }),
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
        });

        const response = await api.get(`/professional/appointments?${params}`);
        appointments = response.data || [];
        pagination = response.pagination || pagination;
    } catch (error) {
        console.error('[Professional Appointments] Error loading:', error);
        showToast('Erro ao carregar agendamentos', 'error');
        appointments = [];
    } finally {
        isLoading = false;
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    if (isLoading) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Meus Agendamentos</h1>
        </div>

        <div class="filter-bar">
            <select class="filter-select" id="statusFilter">
                <option value="">Todos os status</option>
                <option value="PENDING" ${filters.status === 'PENDING' ? 'selected' : ''}>Pendente</option>
                <option value="CONFIRMED" ${filters.status === 'CONFIRMED' ? 'selected' : ''}>Confirmado</option>
                <option value="COMPLETED" ${filters.status === 'COMPLETED' ? 'selected' : ''}>Concluído</option>
                <option value="CANCELLED" ${filters.status === 'CANCELLED' ? 'selected' : ''}>Cancelado</option>
                <option value="NO_SHOW" ${filters.status === 'NO_SHOW' ? 'selected' : ''}>Não Compareceu</option>
            </select>
            <input type="date" class="filter-input" id="startDateFilter" value="${filters.startDate}" placeholder="Data início">
            <input type="date" class="filter-input" id="endDateFilter" value="${filters.endDate}" placeholder="Data fim">
            <button class="btn-secondary" id="btnClearFilters">Limpar Filtros</button>
        </div>

        <div class="data-table-container">
            ${appointments.length ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Cliente</th>
                            <th>Serviço</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Contato</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appointments.map(apt => `
                            <tr>
                                <td>
                                    <div style="display:flex;flex-direction:column;gap:0.25rem;">
                                        <strong>${formatDate(apt.start_time)}</strong>
                                        <span style="color:#666;font-size:0.9rem;">${formatTime(apt.start_time)}</span>
                                    </div>
                                </td>
                                <td>${apt.client?.name || 'N/A'}</td>
                                <td>
                                    <div style="display:flex;flex-direction:column;gap:0.25rem;">
                                        <strong>${apt.service?.name || 'N/A'}</strong>
                                        <span style="color:#666;font-size:0.9rem;">${apt.service?.duration || 0} min</span>
                                    </div>
                                </td>
                                <td>${formatCurrency(apt.price_charged || apt.service?.price || 0)}</td>
                                <td>
                                    <span class="status-badge" style="background:${STATUS_COLORS[apt.status]};">
                                        ${STATUS_LABELS[apt.status] || apt.status}
                                    </span>
                                </td>
                                <td>
                                    ${apt.client?.phone ? `
                                        <a href="tel:${apt.client.phone}" style="color:#2196F3;text-decoration:none;">
                                            <i class="fas fa-phone"></i> ${apt.client.phone}
                                        </a>
                                    ` : 'N/A'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${pagination.pages > 1 ? `
                    <div class="pagination">
                        <button class="btn-secondary" id="btnPrevPage" ${pagination.page === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left"></i> Anterior
                        </button>
                        <span>Página ${pagination.page} de ${pagination.pages}</span>
                        <button class="btn-secondary" id="btnNextPage" ${pagination.page === pagination.pages ? 'disabled' : ''}>
                            Próxima <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                ` : ''}
            ` : `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>Nenhum agendamento encontrado</p>
                </div>
            `}
        </div>

        <style>
            .status-badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                color: white;
                font-size: 0.85rem;
                font-weight: 500;
            }

            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 1rem;
                margin-top: 1.5rem;
                padding: 1rem;
            }

            .pagination span {
                color: #666;
            }
        </style>
    `;
}

function attachEventListeners() {
    const statusFilter = document.getElementById('statusFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const btnClearFilters = document.getElementById('btnClearFilters');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');

    if (statusFilter) {
        statusFilter.addEventListener('change', async (e) => {
            filters.status = e.target.value;
            pagination.page = 1;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }

    if (startDateFilter) {
        startDateFilter.addEventListener('change', async (e) => {
            filters.startDate = e.target.value;
            pagination.page = 1;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }

    if (endDateFilter) {
        endDateFilter.addEventListener('change', async (e) => {
            filters.endDate = e.target.value;
            pagination.page = 1;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', async () => {
            filters = { status: '', startDate: '', endDate: '' };
            pagination.page = 1;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', async () => {
            pagination.page--;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', async () => {
            pagination.page++;
            await loadAppointments();
            renderContent();
            attachEventListeners();
        });
    }
}

/**
 * Professional Clients Page
 * Meus clientes (apenas clientes atendidos por mim)
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatDate } from '../../../shared/utils/validation.js';

let clients = [];
let pagination = { page: 1, limit: 20, total: 0 };
let searchTerm = '';
let isLoading = false;

export function render() {
    renderShell('professional-clients');
}

export async function init() {
    await loadClients();
    renderContent();
    attachEventListeners();
    
    return () => {
        clients = [];
        pagination = { page: 1, limit: 20, total: 0 };
        searchTerm = '';
    };
}

async function loadClients() {
    isLoading = true;
    renderContent();

    try {
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.limit,
            ...(searchTerm && { search: searchTerm }),
        });

        const response = await api.get(`/professional/clients?${params}`);
        clients = response.data || [];
        pagination = response.pagination || pagination;
    } catch (error) {
        console.error('[Professional Clients] Error loading:', error);
        showToast('Erro ao carregar clientes', 'error');
        clients = [];
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
            <h1 class="page-title">Meus Clientes</h1>
        </div>

        <div class="filter-bar">
            <input type="text" class="filter-input" id="searchInput" placeholder="Buscar cliente..." value="${searchTerm}">
        </div>

        <div class="data-table-container">
            ${clients.length ? `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Telefone</th>
                            <th>Email</th>
                            <th>Total Atendimentos</th>
                            <th>Último Atendimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map(client => `
                            <tr>
                                <td><strong>${client.name}</strong></td>
                                <td>
                                    ${client.phone ? `
                                        <a href="tel:${client.phone}" style="color:#2196F3;text-decoration:none;">
                                            <i class="fas fa-phone"></i> ${client.phone}
                                        </a>
                                    ` : 'N/A'}
                                </td>
                                <td>
                                    ${client.email ? `
                                        <a href="mailto:${client.email}" style="color:#2196F3;text-decoration:none;">
                                            ${client.email}
                                        </a>
                                    ` : 'N/A'}
                                </td>
                                <td>
                                    <span class="badge-info">${client.total_appointments || 0} atendimentos</span>
                                </td>
                                <td>${client.last_appointment ? formatDate(client.last_appointment) : 'N/A'}</td>
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
                    <i class="fas fa-users"></i>
                    <p>Nenhum cliente encontrado</p>
                </div>
            `}
        </div>

        <style>
            .badge-info {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border-radius: 12px;
                background: #E3F2FD;
                color: #1976D2;
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
    const searchInput = document.getElementById('searchInput');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');

    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                searchTerm = e.target.value;
                pagination.page = 1;
                await loadClients();
                renderContent();
                attachEventListeners();
            }, 500);
        });
    }

    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', async () => {
            pagination.page--;
            await loadClients();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', async () => {
            pagination.page++;
            await loadClients();
            renderContent();
            attachEventListeners();
        });
    }
}

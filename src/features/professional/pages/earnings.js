/**
 * Professional Earnings Page
 * Meus ganhos/comissão
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate, formatTime } from '../../../shared/utils/validation.js';

let earningsData = null;
let pagination = { page: 1, limit: 20, total: 0 };
let filters = { startDate: '', endDate: '' };
let isLoading = false;

export function render() {
    renderShell('professional-earnings');
}

export async function init() {
    // Período padrão: mês atual
    const now = new Date();
    filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    filters.endDate = now.toISOString().split('T')[0];

    await loadEarnings();
    renderContent();
    attachEventListeners();
    
    return () => {
        earningsData = null;
        pagination = { page: 1, limit: 20, total: 0 };
        filters = { startDate: '', endDate: '' };
    };
}

async function loadEarnings() {
    isLoading = true;
    renderContent();

    try {
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.limit,
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
        });

        const response = await api.get(`/professional/earnings?${params}`);
        earningsData = response.data;
        pagination = response.pagination || pagination;
    } catch (error) {
        console.error('[Professional Earnings] Error loading:', error);
        showToast('Erro ao carregar ganhos', 'error');
        earningsData = null;
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

    if (!earningsData) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar ganhos</p>
            </div>
        `;
        return;
    }

    const { summary, transactions } = earningsData;

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Meus Ganhos</h1>
        </div>

        <div class="filter-bar">
            <input type="date" class="filter-input" id="startDateFilter" value="${filters.startDate}">
            <input type="date" class="filter-input" id="endDateFilter" value="${filters.endDate}">
            <button class="btn-secondary" id="btnApplyFilters">Aplicar</button>
        </div>

        <!-- Cards de resumo -->
        <div class="earnings-summary">
            <div class="summary-card">
                <div class="summary-icon" style="background:#4CAF50;">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="summary-content">
                    <h3>${formatCurrency(summary.total_commission || 0)}</h3>
                    <p>Total Comissão</p>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon" style="background:#2196F3;">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.total_appointments || 0}</h3>
                    <p>Atendimentos Concluídos</p>
                </div>
            </div>

            <div class="summary-card">
                <div class="summary-icon" style="background:#FF9800;">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="summary-content">
                    <h3>${summary.total_appointments > 0 ? formatCurrency(summary.total_commission / summary.total_appointments) : formatCurrency(0)}</h3>
                    <p>Comissão Média</p>
                </div>
            </div>
        </div>

        <!-- Tabela de transações -->
        <div class="card" style="margin-top:1.5rem;">
            <div class="card-header">
                <h2>Histórico de Comissões</h2>
            </div>
            <div class="card-body">
                ${transactions && transactions.length ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Valor Serviço</th>
                                <th>% Comissão</th>
                                <th>Comissão</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions.map(txn => `
                                <tr>
                                    <td>
                                        <div style="display:flex;flex-direction:column;gap:0.25rem;">
                                            <strong>${formatDate(txn.start_time)}</strong>
                                            <span style="color:#666;font-size:0.9rem;">${formatTime(txn.start_time)}</span>
                                        </div>
                                    </td>
                                    <td>${txn.client_name || 'N/A'}</td>
                                    <td>${txn.service_name || 'N/A'}</td>
                                    <td>${formatCurrency(txn.price_charged || 0)}</td>
                                    <td>${parseFloat(txn.commission_rate || 0).toFixed(1)}%</td>
                                    <td><strong style="color:#4CAF50;">${formatCurrency(txn.commission || 0)}</strong></td>
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
                    <div class="empty-state-small">
                        <i class="fas fa-receipt"></i>
                        <p>Nenhuma comissão no período selecionado</p>
                    </div>
                `}
            </div>
        </div>

        <style>
            .earnings-summary {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }

            .summary-card {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .summary-icon {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
            }

            .summary-content h3 {
                margin: 0;
                font-size: 1.75rem;
                color: #333;
            }

            .summary-content p {
                margin: 0.25rem 0 0;
                color: #666;
                font-size: 0.9rem;
            }

            .pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 1rem;
                margin-top: 1.5rem;
                padding: 1rem;
            }

            .empty-state-small {
                text-align: center;
                padding: 3rem;
                color: #999;
            }

            .empty-state-small i {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
        </style>
    `;
}

function attachEventListeners() {
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');

    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', async () => {
            filters.startDate = startDateFilter?.value || '';
            filters.endDate = endDateFilter?.value || '';
            pagination.page = 1;
            await loadEarnings();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', async () => {
            pagination.page--;
            await loadEarnings();
            renderContent();
            attachEventListeners();
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', async () => {
            pagination.page++;
            await loadEarnings();
            renderContent();
            attachEventListeners();
        });
    }
}

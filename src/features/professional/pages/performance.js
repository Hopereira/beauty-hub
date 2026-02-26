/**
 * Professional Performance Page
 * Minha performance/estatísticas
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency } from '../../../shared/utils/validation.js';

let performanceData = null;
let filters = { startDate: '', endDate: '' };
let isLoading = false;

export function render() {
    renderShell('professional-performance');
}

export async function init() {
    // Período padrão: últimos 30 dias
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filters.startDate = thirtyDaysAgo.toISOString().split('T')[0];
    filters.endDate = now.toISOString().split('T')[0];

    await loadPerformance();
    renderContent();
    attachEventListeners();
    
    return () => {
        performanceData = null;
        filters = { startDate: '', endDate: '' };
    };
}

async function loadPerformance() {
    isLoading = true;
    renderContent();

    try {
        const params = new URLSearchParams({
            ...(filters.startDate && { startDate: filters.startDate }),
            ...(filters.endDate && { endDate: filters.endDate }),
        });

        const response = await api.get(`/professional/performance?${params}`);
        performanceData = response.data;
    } catch (error) {
        console.error('[Professional Performance] Error loading:', error);
        showToast('Erro ao carregar performance', 'error');
        performanceData = null;
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

    if (!performanceData) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar performance</p>
            </div>
        `;
        return;
    }

    const { summary, top_services } = performanceData;

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Minha Performance</h1>
        </div>

        <div class="filter-bar">
            <input type="date" class="filter-input" id="startDateFilter" value="${filters.startDate}">
            <input type="date" class="filter-input" id="endDateFilter" value="${filters.endDate}">
            <button class="btn-secondary" id="btnApplyFilters">Aplicar</button>
        </div>

        <!-- Métricas principais -->
        <div class="performance-grid">
            <div class="metric-card">
                <div class="metric-icon" style="background:#2196F3;">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="metric-content">
                    <h3>${summary.total_appointments || 0}</h3>
                    <p>Total Agendamentos</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#4CAF50;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="metric-content">
                    <h3>${summary.completed_appointments || 0}</h3>
                    <p>Concluídos</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#F44336;">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="metric-content">
                    <h3>${summary.cancelled_appointments || 0}</h3>
                    <p>Cancelados</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#9E9E9E;">
                    <i class="fas fa-user-times"></i>
                </div>
                <div class="metric-content">
                    <h3>${summary.no_show_appointments || 0}</h3>
                    <p>Não Compareceram</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#FF9800;">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="metric-content">
                    <h3>${formatCurrency(summary.average_ticket || 0)}</h3>
                    <p>Ticket Médio</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#9C27B0;">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="metric-content">
                    <h3>${formatCurrency(summary.total_revenue || 0)}</h3>
                    <p>Receita Total</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#00BCD4;">
                    <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="metric-content">
                    <h3>${formatCurrency(summary.total_commission || 0)}</h3>
                    <p>Comissão Total</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background:#8BC34A;">
                    <i class="fas fa-percentage"></i>
                </div>
                <div class="metric-content">
                    <h3>${summary.total_appointments > 0 ? ((summary.completed_appointments / summary.total_appointments) * 100).toFixed(1) : 0}%</h3>
                    <p>Taxa de Conclusão</p>
                </div>
            </div>
        </div>

        <!-- Top serviços -->
        <div class="card" style="margin-top:1.5rem;">
            <div class="card-header">
                <h2>Serviços Mais Executados</h2>
            </div>
            <div class="card-body">
                ${top_services && top_services.length ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Serviço</th>
                                <th>Quantidade</th>
                                <th>Receita Gerada</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${top_services.map((service, index) => `
                                <tr>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:0.5rem;">
                                            <span class="rank-badge">#${index + 1}</span>
                                            <strong>${service.name}</strong>
                                        </div>
                                    </td>
                                    <td>${service.total} atendimentos</td>
                                    <td><strong style="color:#4CAF50;">${formatCurrency(service.revenue || 0)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state-small">
                        <i class="fas fa-chart-bar"></i>
                        <p>Nenhum serviço executado no período</p>
                    </div>
                `}
            </div>
        </div>

        <style>
            .performance-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }

            .metric-card {
                background: white;
                border-radius: 8px;
                padding: 1.5rem;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .metric-icon {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
                flex-shrink: 0;
            }

            .metric-content h3 {
                margin: 0;
                font-size: 1.75rem;
                color: #333;
            }

            .metric-content p {
                margin: 0.25rem 0 0;
                color: #666;
                font-size: 0.85rem;
            }

            .rank-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: #2196F3;
                color: white;
                font-size: 0.85rem;
                font-weight: 600;
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

    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', async () => {
            filters.startDate = startDateFilter?.value || '';
            filters.endDate = endDateFilter?.value || '';
            await loadPerformance();
            renderContent();
            attachEventListeners();
        });
    }
}

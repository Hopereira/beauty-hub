/**
 * Professional Dashboard Page
 * Dashboard específico para role PROFESSIONAL
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate, formatTime } from '../../../shared/utils/validation.js';

let dashboardData = null;
let isLoading = false;

export function render() {
    renderShell('professional-dashboard');
}

export async function init() {
    await loadDashboard();
    renderContent();
    
    return () => {
        dashboardData = null;
    };
}

async function loadDashboard() {
    isLoading = true;
    const content = getContentArea();
    if (content) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const response = await api.get('/professional/dashboard');
        dashboardData = response.data;
    } catch (error) {
        console.error('[Professional Dashboard] Error loading:', error);
        showToast('Erro ao carregar dashboard', 'error');
        dashboardData = null;
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

    if (!dashboardData) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar dashboard</p>
                <button class="btn-primary" onclick="location.reload()">Tentar novamente</button>
            </div>
        `;
        return;
    }

    const { today, month, nextAppointment } = dashboardData;

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Meu Dashboard</h1>
            <button class="btn-secondary" onclick="location.reload()">
                <i class="fas fa-sync-alt"></i> Atualizar
            </button>
        </div>

        <div class="dashboard-grid">
            <!-- Cards de métricas -->
            <div class="metric-card">
                <div class="metric-icon" style="background: #4CAF50;">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="metric-content">
                    <h3>${today.appointments || 0}</h3>
                    <p>Atendimentos Hoje</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background: #2196F3;">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="metric-content">
                    <h3>${month.appointments || 0}</h3>
                    <p>Atendimentos Este Mês</p>
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-icon" style="background: #FF9800;">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="metric-content">
                    <h3>${formatCurrency(month.commission || 0)}</h3>
                    <p>Comissão Este Mês</p>
                </div>
            </div>

            <!-- Próximo atendimento -->
            <div class="card" style="grid-column: 1 / -1;">
                <div class="card-header">
                    <h2>Próximo Atendimento</h2>
                </div>
                <div class="card-body">
                    ${nextAppointment ? `
                        <div class="next-appointment">
                            <div class="appointment-time">
                                <i class="fas fa-clock"></i>
                                <span>${formatDate(nextAppointment.start_time)} às ${formatTime(nextAppointment.start_time)}</span>
                            </div>
                            <div class="appointment-details">
                                <div class="detail-row">
                                    <i class="fas fa-user"></i>
                                    <span><strong>Cliente:</strong> ${nextAppointment.client?.name || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <i class="fas fa-cut"></i>
                                    <span><strong>Serviço:</strong> ${nextAppointment.service?.name || 'N/A'}</span>
                                </div>
                                <div class="detail-row">
                                    <i class="fas fa-phone"></i>
                                    <span><strong>Telefone:</strong> ${nextAppointment.client?.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="empty-state-small">
                            <i class="fas fa-calendar-times"></i>
                            <p>Nenhum atendimento agendado</p>
                        </div>
                    `}
                </div>
            </div>

            <!-- Links rápidos -->
            <div class="card">
                <div class="card-header">
                    <h2>Acesso Rápido</h2>
                </div>
                <div class="card-body">
                    <div class="quick-links">
                        <a href="#/professional/appointments" class="quick-link">
                            <i class="fas fa-calendar"></i>
                            <span>Meus Agendamentos</span>
                        </a>
                        <a href="#/professional/clients" class="quick-link">
                            <i class="fas fa-users"></i>
                            <span>Meus Clientes</span>
                        </a>
                        <a href="#/professional/earnings" class="quick-link">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>Meus Ganhos</span>
                        </a>
                        <a href="#/professional/performance" class="quick-link">
                            <i class="fas fa-chart-line"></i>
                            <span>Performance</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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
            }

            .metric-content h3 {
                margin: 0;
                font-size: 2rem;
                color: #333;
            }

            .metric-content p {
                margin: 0.25rem 0 0;
                color: #666;
                font-size: 0.9rem;
            }

            .next-appointment {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .appointment-time {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 1.1rem;
                font-weight: 600;
                color: #2196F3;
            }

            .appointment-details {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .detail-row {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                color: #555;
            }

            .detail-row i {
                width: 20px;
                color: #999;
            }

            .quick-links {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 1rem;
            }

            .quick-link {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: #f5f5f5;
                border-radius: 8px;
                text-decoration: none;
                color: #333;
                transition: all 0.2s;
            }

            .quick-link:hover {
                background: #e0e0e0;
                transform: translateY(-2px);
            }

            .quick-link i {
                font-size: 1.5rem;
                color: #2196F3;
            }

            .empty-state-small {
                text-align: center;
                padding: 2rem;
                color: #999;
            }

            .empty-state-small i {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
        </style>
    `;
}

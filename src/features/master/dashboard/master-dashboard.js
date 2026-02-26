/**
 * Master Dashboard - SaaS Overview
 * MRR, tenant stats, revenue charts
 */

import { renderMasterShell, getMasterContentArea } from '../shared/master-shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';

let stats = null;
let mrr = null;
let revenue = null;
let isLoading = false;

export function render() {
    renderMasterShell('master-dashboard');
}

export async function init() {
    await loadData();
    renderPage();
    return () => {
        stats = null;
        mrr = null;
        revenue = null;
    };
}

async function loadData() {
    isLoading = true;
    const content = getMasterContentArea();
    if (content) {
        content.innerHTML = `
            <div class="master-loading">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const [statsRes, mrrRes, revenueRes] = await Promise.all([
            api.get('/master/tenants/statistics').catch(() => ({ data: null })),
            api.get('/master/billing/mrr').catch(() => ({ data: null })),
            api.get('/master/billing/revenue-summary').catch(() => ({ data: null })),
        ]);

        stats = statsRes.data || {};
        mrr = mrrRes.data || {};
        revenue = revenueRes.data || {};
    } catch (error) {
        console.error('[MasterDashboard] Error:', error);
        showToast('Erro ao carregar dados', 'error');
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getMasterContentArea();
    if (!content) return;

    const totalTenants = stats?.total || 0;
    const activeTenants = stats?.active || 0;
    const trialTenants = stats?.trial || 0;
    const suspendedTenants = stats?.suspended || 0;
    const currentMRR = mrr?.current || 0;
    const previousMRR = mrr?.previous || 0;
    const mrrGrowth = previousMRR > 0 ? (((currentMRR - previousMRR) / previousMRR) * 100).toFixed(1) : 0;
    const totalRevenue = revenue?.total || 0;
    const monthlyRevenue = revenue?.monthly || 0;

    content.innerHTML = `
        <div class="master-page-header" style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">Dashboard</h2>
            <p style="color: #64748b; margin: 0.5rem 0 0;">Visão geral do seu SaaS</p>
        </div>

        <!-- Stats Grid -->
        <div class="master-stats-grid">
            <div class="master-stat-card">
                <div class="master-stat-icon blue">
                    <i class="fas fa-building"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Total Tenants</div>
                    <div class="master-stat-value">${totalTenants}</div>
                </div>
            </div>

            <div class="master-stat-card">
                <div class="master-stat-icon green">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Ativos</div>
                    <div class="master-stat-value">${activeTenants}</div>
                </div>
            </div>

            <div class="master-stat-card">
                <div class="master-stat-icon yellow">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Em Trial</div>
                    <div class="master-stat-value">${trialTenants}</div>
                </div>
            </div>

            <div class="master-stat-card">
                <div class="master-stat-icon red">
                    <i class="fas fa-pause-circle"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Suspensos</div>
                    <div class="master-stat-value">${suspendedTenants}</div>
                </div>
            </div>

            <div class="master-stat-card">
                <div class="master-stat-icon purple">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">MRR</div>
                    <div class="master-stat-value">${formatCurrency(currentMRR)}</div>
                    <div class="master-stat-change ${mrrGrowth >= 0 ? 'positive' : 'negative'}">
                        <i class="fas fa-arrow-${mrrGrowth >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(mrrGrowth)}% vs mês anterior
                    </div>
                </div>
            </div>

            <div class="master-stat-card">
                <div class="master-stat-icon green">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Receita Mensal</div>
                    <div class="master-stat-value">${formatCurrency(monthlyRevenue)}</div>
                </div>
            </div>
        </div>

        <!-- Charts Row -->
        <div class="master-grid master-grid-2">
            <div class="master-card">
                <div class="master-card-header">
                    <h3 class="master-card-title">
                        <i class="fas fa-chart-area"></i>
                        Receita Últimos 12 Meses
                    </h3>
                </div>
                <div class="master-card-body">
                    <div class="master-chart" id="revenueChart">
                        <div style="text-align: center;">
                            <i class="fas fa-chart-area" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                            <p>Gráfico de receita</p>
                            <small>Integração com Chart.js pendente</small>
                        </div>
                    </div>
                </div>
            </div>

            <div class="master-card">
                <div class="master-card-header">
                    <h3 class="master-card-title">
                        <i class="fas fa-chart-pie"></i>
                        Distribuição por Plano
                    </h3>
                </div>
                <div class="master-card-body">
                    <div class="master-chart" id="planChart">
                        <div style="text-align: center;">
                            <i class="fas fa-chart-pie" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                            <p>Distribuição de planos</p>
                            <small>Integração com Chart.js pendente</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="master-card">
            <div class="master-card-header">
                <h3 class="master-card-title">
                    <i class="fas fa-history"></i>
                    Atividade Recente
                </h3>
                <a href="/master/tenants" class="master-btn master-btn-secondary master-btn-sm">
                    Ver todos <i class="fas fa-arrow-right"></i>
                </a>
            </div>
            <div class="master-card-body">
                <div class="master-empty">
                    <i class="fas fa-inbox"></i>
                    <p>Dados de atividade serão exibidos aqui</p>
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

function bindEvents() {
    // Future: Chart.js integration, refresh button, etc.
}

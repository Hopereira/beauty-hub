/**
 * Reports Page Module
 * Administrative reports for OWNER
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';

let activeReport = 'revenue';
let dateRange = { startDate: '', endDate: '' };
let reportData = null;

export function render() {
    renderShell('reports');
}

export async function init() {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    dateRange.startDate = startDate.toISOString().split('T')[0];
    dateRange.endDate = endDate.toISOString().split('T')[0];

    renderContent();
    await loadReport();
    
    return () => {
        reportData = null;
    };
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Relatórios</h1>
                <p>Análises e estatísticas do negócio</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="filters">
                    <input type="date" id="filterStartDate" value="${dateRange.startDate}">
                    <input type="date" id="filterEndDate" value="${dateRange.endDate}">
                    <button class="btn btn-secondary" id="btnApplyFilters">
                        <i class="fas fa-search"></i> Atualizar
                    </button>
                </div>
            </div>

            <div class="tabs">
                <button class="tab ${activeReport === 'revenue' ? 'active' : ''}" data-report="revenue">
                    <i class="fas fa-dollar-sign"></i> Receita
                </button>
                <button class="tab ${activeReport === 'professionals' ? 'active' : ''}" data-report="professionals">
                    <i class="fas fa-users"></i> Por Profissional
                </button>
                <button class="tab ${activeReport === 'services' ? 'active' : ''}" data-report="services">
                    <i class="fas fa-cut"></i> Serviços Mais Vendidos
                </button>
                <button class="tab ${activeReport === 'products' ? 'active' : ''}" data-report="products">
                    <i class="fas fa-box"></i> Produtos
                </button>
                <button class="tab ${activeReport === 'commissions' ? 'active' : ''}" data-report="commissions">
                    <i class="fas fa-percentage"></i> Comissões
                </button>
            </div>

            <div class="card-body" id="reportContent">
                <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                    <div class="spinner"></div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

function bindEvents() {
    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        dateRange.startDate = document.getElementById('filterStartDate').value;
        dateRange.endDate = document.getElementById('filterEndDate').value;
        await loadReport();
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', async () => {
            activeReport = tab.dataset.report;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            await loadReport();
        });
    });
}

async function loadReport() {
    const container = document.getElementById('reportContent');
    if (!container) return;

    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
        });

        switch (activeReport) {
            case 'revenue':
                await loadRevenueReport(params);
                break;
            case 'professionals':
                await loadProfessionalsReport(params);
                break;
            case 'services':
                await loadServicesReport(params);
                break;
            case 'products':
                await loadProductsReport(params);
                break;
            case 'commissions':
                await loadCommissionsReport(params);
                break;
        }
    } catch (error) {
        console.error('Error loading report:', error);
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Erro ao carregar relatório</div>';
        showToast('Erro ao carregar relatório', 'error');
    }
}

async function loadRevenueReport(params) {
    const res = await api.get(`/payment-transactions/reports/revenue-stats?${params}`);
    const data = res.data || {};

    const container = document.getElementById('reportContent');
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:#10b981;">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Receita Total</div>
                    <div class="stat-value">${formatCurrency(data.total_revenue || 0)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#3b82f6;">
                    <i class="fas fa-store"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Receita do Salão</div>
                    <div class="stat-value">${formatCurrency(data.salon_revenue || 0)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#f59e0b;">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Comissões Pagas</div>
                    <div class="stat-value">${formatCurrency(data.professional_commission || 0)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:#8b5cf6;">
                    <i class="fas fa-receipt"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Total de Transações</div>
                    <div class="stat-value">${data.total_transactions || 0}</div>
                </div>
            </div>
        </div>

        <div style="margin-top:2rem;text-align:right;">
            <button class="btn btn-secondary" onclick="window.exportRevenueCSV()">
                <i class="fas fa-download"></i> Exportar CSV
            </button>
        </div>
    `;

    window.exportRevenueCSV = () => {
        const headers = ['Métrica', 'Valor'];
        const rows = [
            ['Receita Total', data.total_revenue || 0],
            ['Receita do Salão', data.salon_revenue || 0],
            ['Comissões Pagas', data.professional_commission || 0],
            ['Total de Transações', data.total_transactions || 0],
        ];

        exportCSV('receita', headers, rows);
    };
}

async function loadProfessionalsReport(params) {
    const res = await api.get(`/payment-transactions/reports/revenue-by-professional?${params}`);
    const data = res.data || [];

    const container = document.getElementById('reportContent');
    
    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Nenhum dado encontrado</div>';
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Profissional</th>
                        <th>Serviços Realizados</th>
                        <th>Receita Gerada</th>
                        <th>Comissão Total</th>
                        <th>% Comissão Média</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const avgCommission = item.total_revenue > 0 
                            ? ((item.total_commission / item.total_revenue) * 100).toFixed(1)
                            : 0;
                        
                        return `
                            <tr>
                                <td><strong>${item.professional?.user?.first_name} ${item.professional?.user?.last_name}</strong></td>
                                <td>${item.total_services}</td>
                                <td>${formatCurrency(item.total_revenue)}</td>
                                <td>${formatCurrency(item.total_commission)}</td>
                                <td>${avgCommission}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:2rem;text-align:right;">
            <button class="btn btn-secondary" onclick="window.exportProfessionalsCSV()">
                <i class="fas fa-download"></i> Exportar CSV
            </button>
        </div>
    `;

    window.exportProfessionalsCSV = () => {
        const headers = ['Profissional', 'Serviços', 'Receita', 'Comissão'];
        const rows = data.map(item => [
            `${item.professional?.user?.first_name} ${item.professional?.user?.last_name}`,
            item.total_services,
            item.total_revenue,
            item.total_commission,
        ]);

        exportCSV('profissionais', headers, rows);
    };
}

async function loadServicesReport(params) {
    const res = await api.get(`/payment-transactions/reports/top-services?${params}`);
    const data = res.data || [];

    const container = document.getElementById('reportContent');
    
    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Nenhum dado encontrado</div>';
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Posição</th>
                        <th>Serviço</th>
                        <th>Quantidade Vendida</th>
                        <th>Receita Total</th>
                        <th>Ticket Médio</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map((item, index) => {
                        const avgTicket = item.total_count > 0 
                            ? item.total_revenue / item.total_count
                            : 0;
                        
                        return `
                            <tr>
                                <td><strong>#${index + 1}</strong></td>
                                <td>${item.service?.name}</td>
                                <td>${item.total_count}</td>
                                <td>${formatCurrency(item.total_revenue)}</td>
                                <td>${formatCurrency(avgTicket)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:2rem;text-align:right;">
            <button class="btn btn-secondary" onclick="window.exportServicesCSV()">
                <i class="fas fa-download"></i> Exportar CSV
            </button>
        </div>
    `;

    window.exportServicesCSV = () => {
        const headers = ['Posição', 'Serviço', 'Quantidade', 'Receita'];
        const rows = data.map((item, index) => [
            index + 1,
            item.service?.name,
            item.total_count,
            item.total_revenue,
        ]);

        exportCSV('servicos', headers, rows);
    };
}

async function loadProductsReport(params) {
    const res = await api.get(`/products?low_stock=true`);
    const data = res.data || [];

    const container = document.getElementById('reportContent');
    
    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Nenhum produto com estoque baixo</div>';
        return;
    }

    container.innerHTML = `
        <h3 style="margin-bottom:1rem;">Produtos com Estoque Baixo</h3>
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Categoria</th>
                        <th>Estoque Atual</th>
                        <th>Estoque Mínimo</th>
                        <th>Diferença</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(product => {
                        const diff = product.minimum_stock - product.stock_quantity;
                        return `
                            <tr>
                                <td><strong>${product.name}</strong></td>
                                <td>${product.category || '-'}</td>
                                <td><span class="badge badge-danger">${product.stock_quantity}</span></td>
                                <td>${product.minimum_stock}</td>
                                <td><span class="badge badge-warning">-${diff}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:2rem;text-align:right;">
            <button class="btn btn-secondary" onclick="window.exportProductsCSV()">
                <i class="fas fa-download"></i> Exportar CSV
            </button>
        </div>
    `;

    window.exportProductsCSV = () => {
        const headers = ['Produto', 'Categoria', 'Estoque Atual', 'Estoque Mínimo'];
        const rows = data.map(p => [
            p.name,
            p.category || '',
            p.stock_quantity,
            p.minimum_stock,
        ]);

        exportCSV('produtos_estoque_baixo', headers, rows);
    };
}

async function loadCommissionsReport(params) {
    const res = await api.get(`/payment-transactions/reports/revenue-by-professional?${params}`);
    const data = res.data || [];

    const container = document.getElementById('reportContent');
    
    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;">Nenhum dado encontrado</div>';
        return;
    }

    const totalCommissions = data.reduce((sum, item) => sum + parseFloat(item.total_commission || 0), 0);

    container.innerHTML = `
        <div class="stat-card" style="margin-bottom:2rem;">
            <div class="stat-icon" style="background:#f59e0b;">
                <i class="fas fa-percentage"></i>
            </div>
            <div class="stat-info">
                <div class="stat-label">Total de Comissões a Pagar</div>
                <div class="stat-value">${formatCurrency(totalCommissions)}</div>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Profissional</th>
                        <th>Serviços</th>
                        <th>Receita Gerada</th>
                        <th>Comissão Acumulada</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td><strong>${item.professional?.user?.first_name} ${item.professional?.user?.last_name}</strong></td>
                            <td>${item.total_services}</td>
                            <td>${formatCurrency(item.total_revenue)}</td>
                            <td><strong>${formatCurrency(item.total_commission)}</strong></td>
                            <td><span class="badge badge-warning">A Pagar</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top:2rem;text-align:right;">
            <button class="btn btn-secondary" onclick="window.exportCommissionsCSV()">
                <i class="fas fa-download"></i> Exportar CSV
            </button>
        </div>
    `;

    window.exportCommissionsCSV = () => {
        const headers = ['Profissional', 'Serviços', 'Receita Gerada', 'Comissão'];
        const rows = data.map(item => [
            `${item.professional?.user?.first_name} ${item.professional?.user?.last_name}`,
            item.total_services,
            item.total_revenue,
            item.total_commission,
        ]);

        exportCSV('comissoes', headers, rows);
    };
}

function exportCSV(reportName, headers, rows) {
    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_${reportName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

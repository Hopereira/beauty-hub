/**
 * Master Billing Management
 * Subscriptions, invoices, revenue
 */

import { renderMasterShell, getMasterContentArea } from '../shared/master-shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';

let subscriptions = [];
let invoices = [];
let mrr = null;
let revenue = null;
let plans = [];
let activeTab = 'subscriptions';
let pagination = { page: 1, limit: 10, total: 0 };
let filters = { status: '', plan: '', period: '' };

export function render() {
    renderMasterShell('master-billing');
}

export async function init() {
    await loadData();
    renderPage();
    return () => {
        subscriptions = [];
        invoices = [];
        mrr = null;
        revenue = null;
    };
}

async function loadData() {
    const content = getMasterContentArea();
    if (content) {
        content.innerHTML = `<div class="master-loading"><div class="spinner"></div></div>`;
    }

    try {
        const [subsRes, invoicesRes, mrrRes, revenueRes, plansRes] = await Promise.all([
            api.get('/master/billing/subscriptions').catch(() => ({ data: [] })),
            api.get('/master/billing/invoices').catch(() => ({ data: [] })),
            api.get('/master/billing/mrr').catch(() => ({ data: null })),
            api.get('/master/billing/revenue-summary').catch(() => ({ data: null })),
            api.get('/master/billing/plans').catch(() => ({ data: [] })),
        ]);

        subscriptions = subsRes.data?.rows || subsRes.data || [];
        invoices = invoicesRes.data?.rows || invoicesRes.data || [];
        mrr = mrrRes.data || {};
        revenue = revenueRes.data || {};
        plans = plansRes.data || [];
        pagination.total = subsRes.data?.count || subscriptions.length;
    } catch (error) {
        console.error('[MasterBilling] Error:', error);
        showToast('Erro ao carregar dados', 'error');
    }
}

function renderPage() {
    const content = getMasterContentArea();
    if (!content) return;

    const currentMRR = mrr?.current || 0;
    const totalRevenue = revenue?.total || 0;
    const activeCount = subscriptions.filter(s => s.status === 'active').length;
    const pastDueCount = subscriptions.filter(s => s.status === 'past_due').length;

    const planOptions = plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    content.innerHTML = `
        <div class="master-page-header" style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">Billing</h2>
            <p style="color: #64748b; margin: 0.5rem 0 0;">Assinaturas, faturas e receita</p>
        </div>

        <!-- Stats -->
        <div class="master-stats-grid" style="margin-bottom: 2rem;">
            <div class="master-stat-card">
                <div class="master-stat-icon purple"><i class="fas fa-chart-line"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">MRR</div>
                    <div class="master-stat-value">${formatCurrency(currentMRR)}</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon green"><i class="fas fa-dollar-sign"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Receita Total</div>
                    <div class="master-stat-value">${formatCurrency(totalRevenue)}</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon blue"><i class="fas fa-check-circle"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Assinaturas Ativas</div>
                    <div class="master-stat-value">${activeCount}</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Inadimplentes</div>
                    <div class="master-stat-value">${pastDueCount}</div>
                </div>
            </div>
        </div>

        <!-- Tabs -->
        <div class="master-card">
            <div class="master-card-header" style="border-bottom: none;">
                <div style="display: flex; gap: 1rem;">
                    <button class="master-btn ${activeTab === 'subscriptions' ? 'master-btn-primary' : 'master-btn-secondary'}" data-tab="subscriptions">
                        <i class="fas fa-sync-alt"></i> Assinaturas
                    </button>
                    <button class="master-btn ${activeTab === 'invoices' ? 'master-btn-primary' : 'master-btn-secondary'}" data-tab="invoices">
                        <i class="fas fa-file-invoice"></i> Faturas
                    </button>
                </div>
                <button class="master-btn master-btn-secondary" id="btnExportBilling">
                    <i class="fas fa-download"></i> Export CSV
                </button>
            </div>

            <!-- Filters -->
            <div class="master-card-header" style="padding-top: 0;">
                <div class="master-filters">
                    <div class="master-filter-group">
                        <label>Status</label>
                        <select id="filterStatus">
                            <option value="">Todos</option>
                            <option value="active">Ativo</option>
                            <option value="trial">Trial</option>
                            <option value="past_due">Inadimplente</option>
                            <option value="suspended">Suspenso</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                    <div class="master-filter-group">
                        <label>Plano</label>
                        <select id="filterPlan">
                            <option value="">Todos</option>
                            ${planOptions}
                        </select>
                    </div>
                    <div class="master-filter-group" style="align-self: flex-end;">
                        <button class="master-btn master-btn-primary master-btn-sm" id="btnApplyFilters">
                            <i class="fas fa-search"></i> Filtrar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div id="billingTabContent">
                ${activeTab === 'subscriptions' ? renderSubscriptionsTable() : renderInvoicesTable()}
            </div>
        </div>
    `;

    bindEvents();
}

function renderSubscriptionsTable() {
    const filtered = filterData(subscriptions);
    
    if (filtered.length === 0) {
        return `<div class="master-empty"><i class="fas fa-sync-alt"></i><p>Nenhuma assinatura encontrada</p></div>`;
    }

    return `
        <div class="master-table-wrapper">
            <table class="master-table">
                <thead>
                    <tr>
                        <th>Tenant</th>
                        <th>Plano</th>
                        <th>Status</th>
                        <th>Ciclo</th>
                        <th>Valor</th>
                        <th>Próx. Vencimento</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(sub => `
                        <tr>
                            <td><strong>${sub.tenant?.name || sub.tenant_name || '-'}</strong></td>
                            <td>${sub.plan?.name || sub.plan_name || '-'}</td>
                            <td><span class="master-badge-status ${sub.status}">${formatStatus(sub.status)}</span></td>
                            <td>${sub.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</td>
                            <td>${formatCurrency(sub.price || 0)}</td>
                            <td>${formatDate(sub.current_period_end) || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="master-pagination">
            <span>${filtered.length} registros</span>
        </div>
    `;
}

function renderInvoicesTable() {
    if (invoices.length === 0) {
        return `<div class="master-empty"><i class="fas fa-file-invoice"></i><p>Nenhuma fatura encontrada</p></div>`;
    }

    return `
        <div class="master-table-wrapper">
            <table class="master-table">
                <thead>
                    <tr>
                        <th>Tenant</th>
                        <th>Fatura</th>
                        <th>Status</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Pago em</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoices.map(inv => `
                        <tr>
                            <td><strong>${inv.tenant?.name || inv.tenant_name || '-'}</strong></td>
                            <td><code>${inv.invoice_number || inv.id?.slice(0, 8) || '-'}</code></td>
                            <td><span class="master-badge-status ${inv.status === 'paid' ? 'active' : inv.status === 'pending' ? 'trial' : 'suspended'}">${formatInvoiceStatus(inv.status)}</span></td>
                            <td>${formatCurrency(inv.amount || 0)}</td>
                            <td>${formatDate(inv.due_date) || '-'}</td>
                            <td>${inv.paid_at ? formatDate(inv.paid_at) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="master-pagination">
            <span>${invoices.length} registros</span>
        </div>
    `;
}

function filterData(data) {
    let filtered = [...data];
    
    if (filters.status) {
        filtered = filtered.filter(item => item.status === filters.status);
    }
    if (filters.plan) {
        filtered = filtered.filter(item => (item.plan?.id || item.plan_id) === filters.plan);
    }
    
    return filtered;
}

function formatStatus(status) {
    const map = {
        active: 'Ativo',
        trial: 'Trial',
        suspended: 'Suspenso',
        cancelled: 'Cancelado',
        past_due: 'Inadimplente',
        expired: 'Expirado',
    };
    return map[status] || status;
}

function formatInvoiceStatus(status) {
    const map = {
        paid: 'Pago',
        pending: 'Pendente',
        overdue: 'Vencido',
        cancelled: 'Cancelado',
    };
    return map[status] || status;
}

function bindEvents() {
    // Tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTab = btn.dataset.tab;
            renderPage();
        });
    });

    // Filters
    document.getElementById('btnApplyFilters')?.addEventListener('click', () => {
        filters.status = document.getElementById('filterStatus')?.value || '';
        filters.plan = document.getElementById('filterPlan')?.value || '';
        document.getElementById('billingTabContent').innerHTML = 
            activeTab === 'subscriptions' ? renderSubscriptionsTable() : renderInvoicesTable();
    });

    // Export
    document.getElementById('btnExportBilling')?.addEventListener('click', exportBilling);
}

function exportBilling() {
    const data = activeTab === 'subscriptions' ? filterData(subscriptions) : invoices;
    
    if (data.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    let headers, rows;
    
    if (activeTab === 'subscriptions') {
        headers = ['Tenant', 'Plano', 'Status', 'Ciclo', 'Valor', 'Próx. Vencimento'];
        rows = data.map(s => [
            s.tenant?.name || s.tenant_name || '',
            s.plan?.name || s.plan_name || '',
            s.status || '',
            s.billing_cycle || '',
            s.price || 0,
            s.current_period_end || '',
        ]);
    } else {
        headers = ['Tenant', 'Fatura', 'Status', 'Valor', 'Vencimento', 'Pago em'];
        rows = data.map(i => [
            i.tenant?.name || i.tenant_name || '',
            i.invoice_number || i.id || '',
            i.status || '',
            i.amount || 0,
            i.due_date || '',
            i.paid_at || '',
        ]);
    }

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado com sucesso', 'success');
}

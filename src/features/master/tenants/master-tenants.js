/**
 * Master Tenants Management
 * List, filter, suspend, activate tenants
 */

import { renderMasterShell, getMasterContentArea } from '../shared/master-shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatDate } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let tenants = [];
let plans = [];
let pagination = { page: 1, limit: 10, total: 0 };
let filters = { status: '', plan: '', search: '' };
let isLoading = false;

export function render() {
    renderMasterShell('master-tenants');
}

export async function init() {
    await loadPlans();
    await loadTenants();
    renderPage();
    return () => {
        tenants = [];
        plans = [];
    };
}

async function loadPlans() {
    try {
        const res = await api.get('/master/billing/plans');
        plans = res.data || [];
    } catch (error) {
        console.error('[MasterTenants] Error loading plans:', error);
    }
}

async function loadTenants() {
    isLoading = true;
    const content = getMasterContentArea();
    
    const tableBody = document.getElementById('tenantsTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;"><div class="spinner"></div></td></tr>`;
    }

    try {
        const params = new URLSearchParams({
            page: pagination.page,
            limit: pagination.limit,
        });
        if (filters.status) params.append('status', filters.status);
        if (filters.plan) params.append('plan_id', filters.plan);
        if (filters.search) params.append('search', filters.search);

        const res = await api.get(`/master/tenants?${params}`);
        tenants = res.data?.rows || res.data || [];
        pagination.total = res.data?.count || tenants.length;
    } catch (error) {
        console.error('[MasterTenants] Error:', error);
        showToast('Erro ao carregar tenants', 'error');
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getMasterContentArea();
    if (!content) return;

    const planOptions = plans.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    content.innerHTML = `
        <div class="master-page-header" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">Tenants</h2>
                <p style="color: #64748b; margin: 0.5rem 0 0;">Gerencie os estabelecimentos cadastrados</p>
            </div>
            <button class="master-btn master-btn-secondary" id="btnExportCSV">
                <i class="fas fa-download"></i> Export CSV
            </button>
        </div>

        <!-- Filters -->
        <div class="master-card">
            <div class="master-card-header">
                <div class="master-filters">
                    <div class="master-filter-group">
                        <label>Buscar</label>
                        <input type="text" id="filterSearch" placeholder="Nome ou slug..." value="${filters.search}">
                    </div>
                    <div class="master-filter-group">
                        <label>Status</label>
                        <select id="filterStatus">
                            <option value="">Todos</option>
                            <option value="active" ${filters.status === 'active' ? 'selected' : ''}>Ativo</option>
                            <option value="trial" ${filters.status === 'trial' ? 'selected' : ''}>Trial</option>
                            <option value="suspended" ${filters.status === 'suspended' ? 'selected' : ''}>Suspenso</option>
                            <option value="cancelled" ${filters.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
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
                        <button class="master-btn master-btn-primary" id="btnApplyFilters">
                            <i class="fas fa-search"></i> Filtrar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Table -->
            <div class="master-table-wrapper">
                <table class="master-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Slug</th>
                            <th>Plano</th>
                            <th>Status</th>
                            <th>Criado em</th>
                            <th>Próx. Vencimento</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tenantsTableBody">
                        ${renderTableRows()}
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="master-pagination">
                <span>Mostrando ${tenants.length} de ${pagination.total} registros</span>
                <div class="master-pagination-btns">
                    <button class="master-btn master-btn-secondary master-btn-sm" id="btnPrevPage" ${pagination.page <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left"></i> Anterior
                    </button>
                    <button class="master-btn master-btn-secondary master-btn-sm" id="btnNextPage" ${pagination.page * pagination.limit >= pagination.total ? 'disabled' : ''}>
                        Próximo <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Tenant Detail Modal -->
        <div class="modal-overlay" id="modal-tenant-detail">
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 id="tenantDetailTitle">Detalhes do Tenant</h3>
                    <button class="modal-close" data-modal="tenant-detail">&times;</button>
                </div>
                <div class="modal-body" id="tenantDetailBody">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="btnCloseTenantDetail">Fechar</button>
                </div>
            </div>
        </div>

        <!-- Confirm Action Modal -->
        <div class="modal-overlay" id="modal-confirm-action">
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 id="confirmActionTitle">Confirmar Ação</h3>
                    <button class="modal-close" data-modal="confirm-action">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirmActionMessage">Tem certeza que deseja realizar esta ação?</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="btnCancelAction">Cancelar</button>
                    <button class="btn btn-danger" id="btnConfirmAction">Confirmar</button>
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

function renderTableRows() {
    if (tenants.length === 0) {
        return `<tr><td colspan="7" class="master-empty"><i class="fas fa-building"></i><p>Nenhum tenant encontrado</p></td></tr>`;
    }

    return tenants.map(tenant => {
        const status = tenant.subscription?.status || tenant.status || 'unknown';
        const planName = tenant.subscription?.plan?.name || tenant.plan_name || '-';
        const nextBilling = tenant.subscription?.current_period_end || tenant.next_billing;
        
        return `
            <tr>
                <td><strong>${tenant.name || '-'}</strong></td>
                <td><code>${tenant.slug || '-'}</code></td>
                <td>${planName}</td>
                <td><span class="master-badge-status ${status}">${formatStatus(status)}</span></td>
                <td>${formatDate(tenant.created_at) || '-'}</td>
                <td>${nextBilling ? formatDate(nextBilling) : '-'}</td>
                <td>
                    <div class="master-actions">
                        <button class="master-action-btn btn-view-tenant" data-id="${tenant.id}" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${status === 'active' || status === 'trial' ? `
                            <button class="master-action-btn danger btn-suspend-tenant" data-id="${tenant.id}" title="Suspender">
                                <i class="fas fa-pause"></i>
                            </button>
                        ` : ''}
                        ${status === 'suspended' ? `
                            <button class="master-action-btn btn-activate-tenant" data-id="${tenant.id}" title="Reativar">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
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

function bindEvents() {
    // Filters
    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.search = document.getElementById('filterSearch')?.value || '';
        filters.status = document.getElementById('filterStatus')?.value || '';
        filters.plan = document.getElementById('filterPlan')?.value || '';
        pagination.page = 1;
        await loadTenants();
        document.getElementById('tenantsTableBody').innerHTML = renderTableRows();
        updatePaginationUI();
    });

    // Pagination
    document.getElementById('btnPrevPage')?.addEventListener('click', async () => {
        if (pagination.page > 1) {
            pagination.page--;
            await loadTenants();
            document.getElementById('tenantsTableBody').innerHTML = renderTableRows();
            updatePaginationUI();
        }
    });

    document.getElementById('btnNextPage')?.addEventListener('click', async () => {
        if (pagination.page * pagination.limit < pagination.total) {
            pagination.page++;
            await loadTenants();
            document.getElementById('tenantsTableBody').innerHTML = renderTableRows();
            updatePaginationUI();
        }
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    // Table actions delegation
    document.getElementById('tenantsTableBody')?.addEventListener('click', handleTableActions);

    // Modal close
    document.getElementById('btnCloseTenantDetail')?.addEventListener('click', () => closeModal('tenant-detail'));
    document.getElementById('btnCancelAction')?.addEventListener('click', () => closeModal('confirm-action'));
}

function updatePaginationUI() {
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    if (prevBtn) prevBtn.disabled = pagination.page <= 1;
    if (nextBtn) nextBtn.disabled = pagination.page * pagination.limit >= pagination.total;
}

let pendingAction = null;

async function handleTableActions(e) {
    const viewBtn = e.target.closest('.btn-view-tenant');
    const suspendBtn = e.target.closest('.btn-suspend-tenant');
    const activateBtn = e.target.closest('.btn-activate-tenant');

    if (viewBtn) {
        const id = viewBtn.dataset.id;
        const tenant = tenants.find(t => t.id === id);
        if (tenant) {
            showTenantDetail(tenant);
        }
    }

    if (suspendBtn) {
        const id = suspendBtn.dataset.id;
        pendingAction = { type: 'suspend', id };
        document.getElementById('confirmActionTitle').textContent = 'Suspender Tenant';
        document.getElementById('confirmActionMessage').textContent = 'Tem certeza que deseja suspender este tenant? Ele perderá acesso ao sistema.';
        document.getElementById('btnConfirmAction').className = 'btn btn-danger';
        document.getElementById('btnConfirmAction').onclick = executeAction;
        openModal('confirm-action');
    }

    if (activateBtn) {
        const id = activateBtn.dataset.id;
        pendingAction = { type: 'activate', id };
        document.getElementById('confirmActionTitle').textContent = 'Reativar Tenant';
        document.getElementById('confirmActionMessage').textContent = 'Tem certeza que deseja reativar este tenant?';
        document.getElementById('btnConfirmAction').className = 'btn btn-primary';
        document.getElementById('btnConfirmAction').onclick = executeAction;
        openModal('confirm-action');
    }
}

async function executeAction() {
    if (!pendingAction) return;

    const btn = document.getElementById('btnConfirmAction');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></div>Processando...';

    try {
        if (pendingAction.type === 'suspend') {
            await api.post(`/master/tenants/${pendingAction.id}/suspend`);
            showToast('Tenant suspenso com sucesso', 'success');
        } else if (pendingAction.type === 'activate') {
            await api.post(`/master/tenants/${pendingAction.id}/activate`);
            showToast('Tenant reativado com sucesso', 'success');
        }
        closeModal('confirm-action');
        await loadTenants();
        document.getElementById('tenantsTableBody').innerHTML = renderTableRows();
    } catch (error) {
        console.error('[MasterTenants] Action error:', error);
        showToast(error.message || 'Erro ao executar ação', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirmar';
        pendingAction = null;
    }
}

function showTenantDetail(tenant) {
    const body = document.getElementById('tenantDetailBody');
    const status = tenant.subscription?.status || tenant.status || 'unknown';
    const planName = tenant.subscription?.plan?.name || tenant.plan_name || '-';

    body.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            <div><strong>Nome:</strong> ${tenant.name}</div>
            <div><strong>Slug:</strong> <code>${tenant.slug}</code></div>
            <div><strong>Email:</strong> ${tenant.email || '-'}</div>
            <div><strong>Plano:</strong> ${planName}</div>
            <div><strong>Status:</strong> <span class="master-badge-status ${status}">${formatStatus(status)}</span></div>
            <div><strong>Criado em:</strong> ${formatDate(tenant.created_at)}</div>
            <div><strong>Documento:</strong> ${tenant.document || '-'}</div>
        </div>
    `;
    openModal('tenant-detail');
}

function exportCSV() {
    if (tenants.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Slug', 'Plano', 'Status', 'Criado em', 'Email'];
    const rows = tenants.map(t => [
        t.name || '',
        t.slug || '',
        t.subscription?.plan?.name || t.plan_name || '',
        t.subscription?.status || t.status || '',
        t.created_at || '',
        t.email || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tenants_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado com sucesso', 'success');
}

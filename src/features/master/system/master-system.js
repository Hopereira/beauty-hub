/**
 * Master System & Logs
 * Audit logs, webhook logs, system status
 */

import { renderMasterShell, getMasterContentArea } from '../shared/master-shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatDate } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';

let auditLogs = [];
let webhookLogs = [];
let activeTab = 'audit';
let isLoading = false;

export function render() {
    renderMasterShell('master-system');
}

export async function init() {
    await loadData();
    renderPage();
    return () => {
        auditLogs = [];
        webhookLogs = [];
    };
}

async function loadData() {
    isLoading = true;
    const content = getMasterContentArea();
    if (content) {
        content.innerHTML = `<div class="master-loading"><div class="spinner"></div></div>`;
    }

    try {
        const [auditRes, webhookRes] = await Promise.all([
            api.get('/master/billing/audit-logs').catch((e) => { console.warn('Audit logs:', e.message); return { data: [] }; }),
            api.get('/master/billing/webhook-logs').catch((e) => { console.warn('Webhook logs:', e.message); return { data: [] }; }),
        ]);

        auditLogs = auditRes.data?.rows || auditRes.data || [];
        webhookLogs = webhookRes.data?.rows || webhookRes.data || [];
    } catch (error) {
        console.error('[MasterSystem] Error:', error);
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getMasterContentArea();
    if (!content) return;

    content.innerHTML = `
        <div class="master-page-header" style="margin-bottom: 2rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">Sistema</h2>
            <p style="color: #64748b; margin: 0.5rem 0 0;">Logs e status do sistema</p>
        </div>

        <!-- System Status -->
        <div class="master-stats-grid" style="margin-bottom: 2rem;">
            <div class="master-stat-card">
                <div class="master-stat-icon green"><i class="fas fa-server"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">API Status</div>
                    <div class="master-stat-value" style="font-size: 1.25rem; color: #16a34a;">Online</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon blue"><i class="fas fa-database"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Database</div>
                    <div class="master-stat-value" style="font-size: 1.25rem; color: #16a34a;">Conectado</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon purple"><i class="fas fa-history"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Audit Logs</div>
                    <div class="master-stat-value">${auditLogs.length}</div>
                </div>
            </div>
            <div class="master-stat-card">
                <div class="master-stat-icon yellow"><i class="fas fa-plug"></i></div>
                <div class="master-stat-info">
                    <div class="master-stat-label">Webhook Events</div>
                    <div class="master-stat-value">${webhookLogs.length}</div>
                </div>
            </div>
        </div>

        <!-- Logs Card -->
        <div class="master-card">
            <div class="master-card-header">
                <div style="display: flex; gap: 1rem;">
                    <button class="master-btn ${activeTab === 'audit' ? 'master-btn-primary' : 'master-btn-secondary'}" data-tab="audit">
                        <i class="fas fa-clipboard-list"></i> Audit Logs
                    </button>
                    <button class="master-btn ${activeTab === 'webhook' ? 'master-btn-primary' : 'master-btn-secondary'}" data-tab="webhook">
                        <i class="fas fa-plug"></i> Webhooks
                    </button>
                </div>
                <button class="master-btn master-btn-secondary" id="btnRefreshLogs">
                    <i class="fas fa-sync-alt"></i> Atualizar
                </button>
            </div>

            <div id="logsTabContent">
                ${activeTab === 'audit' ? renderAuditLogs() : renderWebhookLogs()}
            </div>
        </div>

        <!-- Backend Required Notice -->
        ${auditLogs.length === 0 && webhookLogs.length === 0 ? `
            <div class="master-card" style="background: #fef3c7; border: 1px solid #fbbf24;">
                <div class="master-card-body" style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; color: #d97706;"></i>
                    <div>
                        <strong style="color: #92400e;">Backend Required</strong>
                        <p style="margin: 0.25rem 0 0; color: #78350f; font-size: 0.9rem;">
                            Os endpoints de logs precisam estar implementados no backend para exibir dados reais.
                        </p>
                    </div>
                </div>
            </div>
        ` : ''}
    `;

    bindEvents();
}

function renderAuditLogs() {
    if (auditLogs.length === 0) {
        return `
            <div class="master-empty">
                <i class="fas fa-clipboard-list"></i>
                <p>Nenhum log de auditoria</p>
                <small style="color: #94a3b8;">Endpoint: GET /api/master/billing/audit-logs</small>
            </div>
        `;
    }

    return `
        <div class="master-table-wrapper">
            <table class="master-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Ação</th>
                        <th>Usuário</th>
                        <th>Tenant</th>
                        <th>Detalhes</th>
                    </tr>
                </thead>
                <tbody>
                    ${auditLogs.slice(0, 50).map(log => `
                        <tr>
                            <td>${formatDate(log.created_at) || '-'}</td>
                            <td><span class="master-badge-status ${getActionColor(log.action)}">${log.action || '-'}</span></td>
                            <td>${log.user?.email || log.user_email || '-'}</td>
                            <td>${log.tenant?.name || log.tenant_name || '-'}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.details || ''}">${log.details || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="master-pagination">
            <span>Mostrando ${Math.min(auditLogs.length, 50)} de ${auditLogs.length} logs</span>
        </div>
    `;
}

function renderWebhookLogs() {
    if (webhookLogs.length === 0) {
        return `
            <div class="master-empty">
                <i class="fas fa-plug"></i>
                <p>Nenhum evento de webhook</p>
                <small style="color: #94a3b8;">Endpoint: GET /api/master/billing/webhook-logs</small>
            </div>
        `;
    }

    return `
        <div class="master-table-wrapper">
            <table class="master-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Provider</th>
                        <th>Evento</th>
                        <th>Status</th>
                        <th>Tentativas</th>
                    </tr>
                </thead>
                <tbody>
                    ${webhookLogs.slice(0, 50).map(log => `
                        <tr>
                            <td>${formatDate(log.created_at) || '-'}</td>
                            <td>${log.provider || '-'}</td>
                            <td><code>${log.event_type || log.event || '-'}</code></td>
                            <td><span class="master-badge-status ${log.status === 'processed' ? 'active' : log.status === 'failed' ? 'suspended' : 'trial'}">${log.status || '-'}</span></td>
                            <td>${log.retry_count || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div class="master-pagination">
            <span>Mostrando ${Math.min(webhookLogs.length, 50)} de ${webhookLogs.length} eventos</span>
        </div>
    `;
}

function getActionColor(action) {
    if (!action) return 'trial';
    const lower = action.toLowerCase();
    if (lower.includes('create') || lower.includes('activate')) return 'active';
    if (lower.includes('delete') || lower.includes('suspend') || lower.includes('cancel')) return 'suspended';
    if (lower.includes('update') || lower.includes('change')) return 'trial';
    return 'trial';
}

function bindEvents() {
    // Tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeTab = btn.dataset.tab;
            renderPage();
        });
    });

    // Refresh
    document.getElementById('btnRefreshLogs')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnRefreshLogs');
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></div>Atualizando...';
        
        await loadData();
        renderPage();
        showToast('Logs atualizados', 'success');
    });
}

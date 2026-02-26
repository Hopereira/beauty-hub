/**
 * Master Plans Management
 * CRUD for subscription plans
 */

import { renderMasterShell, getMasterContentArea } from '../shared/master-shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let plans = [];
let editingPlan = null;
let isLoading = false;

export function render() {
    renderMasterShell('master-plans');
}

export async function init() {
    await loadPlans();
    renderPage();
    return () => {
        plans = [];
        editingPlan = null;
    };
}

async function loadPlans() {
    isLoading = true;
    try {
        const res = await api.get('/master/billing/plans');
        plans = res.data || [];
    } catch (error) {
        console.error('[MasterPlans] Error:', error);
        showToast('Erro ao carregar planos', 'error');
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getMasterContentArea();
    if (!content) return;

    content.innerHTML = `
        <div class="master-page-header" style="margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <div>
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0;">Planos</h2>
                <p style="color: #64748b; margin: 0.5rem 0 0;">Gerencie os planos de assinatura</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="master-btn master-btn-secondary" id="btnExportPlans">
                    <i class="fas fa-download"></i> Export
                </button>
                <button class="master-btn master-btn-primary" id="btnAddPlan">
                    <i class="fas fa-plus"></i> Novo Plano
                </button>
            </div>
        </div>

        <!-- Plans Grid -->
        <div class="master-stats-grid" id="plansGrid">
            ${renderPlanCards()}
        </div>

        <!-- Plan Modal -->
        <div class="modal-overlay" id="modal-plan">
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <h3 id="planModalTitle">Novo Plano</h3>
                    <button class="modal-close" data-modal="plan">&times;</button>
                </div>
                <form id="planForm">
                    <div class="modal-body">
                        <div class="form-grid" style="display: grid; gap: 1rem;">
                            <div class="form-group">
                                <label>Nome do Plano *</label>
                                <input type="text" id="planName" required placeholder="Ex: Profissional">
                            </div>
                            <div class="form-group">
                                <label>Descrição</label>
                                <textarea id="planDescription" rows="2" placeholder="Descrição do plano"></textarea>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="form-group">
                                    <label>Preço Mensal (R$) *</label>
                                    <input type="number" id="planPriceMonthly" step="0.01" required placeholder="99.90">
                                </div>
                                <div class="form-group">
                                    <label>Preço Anual (R$)</label>
                                    <input type="number" id="planPriceYearly" step="0.01" placeholder="999.00">
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div class="form-group">
                                    <label>Dias de Trial</label>
                                    <input type="number" id="planTrialDays" value="7" min="0">
                                </div>
                                <div class="form-group">
                                    <label>Desconto Anual (%)</label>
                                    <input type="number" id="planDiscount" value="0" min="0" max="100">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Limites (JSON)</label>
                                <textarea id="planLimits" rows="3" placeholder='{"max_professionals": 5, "max_clients": 100}'></textarea>
                            </div>
                            <div class="form-group">
                                <label>Features (uma por linha)</label>
                                <textarea id="planFeatures" rows="4" placeholder="Agendamentos ilimitados&#10;Relatórios básicos&#10;Suporte por email"></textarea>
                            </div>
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="checkbox" id="planActive" checked>
                                    Plano ativo
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="btnCancelPlan">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    bindEvents();
}

function renderPlanCards() {
    if (plans.length === 0) {
        return `<div class="master-empty" style="grid-column: 1/-1;"><i class="fas fa-tags"></i><p>Nenhum plano cadastrado</p></div>`;
    }

    return plans.map(plan => {
        const features = plan.features || [];
        const limits = plan.limits || {};
        const isActive = plan.is_active !== false;

        return `
            <div class="master-card" style="margin-bottom: 0;">
                <div class="master-card-header" style="border-bottom: none; padding-bottom: 0;">
                    <div>
                        <h3 class="master-card-title" style="font-size: 1.1rem;">
                            ${plan.name}
                            ${!isActive ? '<span class="master-badge-status cancelled" style="margin-left: 0.5rem;">Inativo</span>' : ''}
                        </h3>
                    </div>
                    <div class="master-actions">
                        <button class="master-action-btn btn-edit-plan" data-id="${plan.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="master-action-btn ${isActive ? 'danger' : ''} btn-toggle-plan" data-id="${plan.id}" data-active="${isActive}" title="${isActive ? 'Desativar' : 'Ativar'}">
                            <i class="fas fa-${isActive ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </div>
                <div class="master-card-body" style="padding-top: 0.5rem;">
                    <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 1rem;">${plan.description || 'Sem descrição'}</p>
                    
                    <div style="margin-bottom: 1rem;">
                        <div style="font-size: 2rem; font-weight: 700; color: #1e293b;">
                            ${formatCurrency(plan.price_monthly || 0)}
                            <span style="font-size: 0.9rem; font-weight: 400; color: #64748b;">/mês</span>
                        </div>
                        ${plan.price_yearly ? `<div style="font-size: 0.85rem; color: #64748b;">${formatCurrency(plan.price_yearly)} /ano</div>` : ''}
                    </div>

                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">
                        <i class="fas fa-clock"></i> ${plan.trial_days || 0} dias de trial
                    </div>

                    ${features.length > 0 ? `
                        <ul style="list-style: none; padding: 0; margin: 1rem 0 0; font-size: 0.85rem;">
                            ${features.slice(0, 4).map(f => `<li style="padding: 0.25rem 0;"><i class="fas fa-check" style="color: #16a34a; margin-right: 0.5rem;"></i>${f}</li>`).join('')}
                            ${features.length > 4 ? `<li style="color: #64748b;">+${features.length - 4} mais...</li>` : ''}
                        </ul>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function bindEvents() {
    // Add plan
    document.getElementById('btnAddPlan')?.addEventListener('click', () => {
        editingPlan = null;
        document.getElementById('planModalTitle').textContent = 'Novo Plano';
        document.getElementById('planForm').reset();
        document.getElementById('planActive').checked = true;
        openModal('plan');
    });

    // Cancel
    document.getElementById('btnCancelPlan')?.addEventListener('click', () => closeModal('plan'));

    // Form submit
    document.getElementById('planForm')?.addEventListener('submit', handleSavePlan);

    // Export
    document.getElementById('btnExportPlans')?.addEventListener('click', exportPlans);

    // Card actions delegation
    document.getElementById('plansGrid')?.addEventListener('click', handleCardActions);
}

async function handleCardActions(e) {
    const editBtn = e.target.closest('.btn-edit-plan');
    const toggleBtn = e.target.closest('.btn-toggle-plan');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const plan = plans.find(p => p.id === id);
        if (plan) {
            editingPlan = plan;
            document.getElementById('planModalTitle').textContent = 'Editar Plano';
            document.getElementById('planName').value = plan.name || '';
            document.getElementById('planDescription').value = plan.description || '';
            document.getElementById('planPriceMonthly').value = plan.price_monthly || '';
            document.getElementById('planPriceYearly').value = plan.price_yearly || '';
            document.getElementById('planTrialDays').value = plan.trial_days || 0;
            document.getElementById('planDiscount').value = plan.discount_yearly || 0;
            document.getElementById('planLimits').value = plan.limits ? JSON.stringify(plan.limits, null, 2) : '';
            document.getElementById('planFeatures').value = (plan.features || []).join('\n');
            document.getElementById('planActive').checked = plan.is_active !== false;
            openModal('plan');
        }
    }

    if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const isActive = toggleBtn.dataset.active === 'true';
        
        try {
            if (isActive) {
                await api.patch(`/master/billing/plans/${id}/deactivate`);
                showToast('Plano desativado', 'success');
            } else {
                await api.patch(`/master/billing/plans/${id}/activate`);
                showToast('Plano ativado', 'success');
            }
            await loadPlans();
            document.getElementById('plansGrid').innerHTML = renderPlanCards();
            bindCardEvents();
        } catch (error) {
            showToast(error.message || 'Erro ao alterar plano', 'error');
        }
    }
}

function bindCardEvents() {
    document.getElementById('plansGrid')?.addEventListener('click', handleCardActions);
}

async function handleSavePlan(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></div>Salvando...';

    let limits = {};
    try {
        const limitsStr = document.getElementById('planLimits').value.trim();
        if (limitsStr) limits = JSON.parse(limitsStr);
    } catch {
        showToast('JSON de limites inválido', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
        return;
    }

    const featuresStr = document.getElementById('planFeatures').value.trim();
    const features = featuresStr ? featuresStr.split('\n').filter(f => f.trim()) : [];

    const data = {
        name: document.getElementById('planName').value.trim(),
        description: document.getElementById('planDescription').value.trim(),
        price_monthly: parseFloat(document.getElementById('planPriceMonthly').value) || 0,
        price_yearly: parseFloat(document.getElementById('planPriceYearly').value) || null,
        trial_days: parseInt(document.getElementById('planTrialDays').value) || 0,
        discount_yearly: parseInt(document.getElementById('planDiscount').value) || 0,
        limits,
        features,
        is_active: document.getElementById('planActive').checked,
    };

    try {
        if (editingPlan) {
            await api.put(`/master/billing/plans/${editingPlan.id}`, data);
            showToast('Plano atualizado!', 'success');
        } else {
            await api.post('/master/billing/plans', data);
            showToast('Plano criado!', 'success');
        }
        closeModal('plan');
        editingPlan = null;
        await loadPlans();
        document.getElementById('plansGrid').innerHTML = renderPlanCards();
        bindCardEvents();
    } catch (error) {
        showToast(error.message || 'Erro ao salvar plano', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
    }
}

function exportPlans() {
    if (plans.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Preço Mensal', 'Preço Anual', 'Trial (dias)', 'Ativo'];
    const rows = plans.map(p => [
        p.name || '',
        p.price_monthly || 0,
        p.price_yearly || '',
        p.trial_days || 0,
        p.is_active !== false ? 'Sim' : 'Não',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plans_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado com sucesso', 'success');
}

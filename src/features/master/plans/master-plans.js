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

// Funcionalidades disponíveis no sistema
const AVAILABLE_FEATURES = [
    { id: 'Agendamentos', label: 'Agendamentos', description: 'Gestão completa de agendamentos' },
    { id: 'Cadastro de Clientes', label: 'Cadastro de Clientes', description: 'Cadastro e gestão de clientes' },
    { id: 'Notificações', label: 'Notificações', description: 'Notificações por email e SMS' },
    { id: 'Gestão Financeira', label: 'Gestão Financeira', description: 'Controle financeiro completo' },
    { id: 'Relatórios', label: 'Relatórios', description: 'Relatórios e dashboards' },
    { id: 'Gestão de Profissionais', label: 'Gestão de Profissionais', description: 'Cadastro de profissionais' },
    { id: 'Controle de Estoque', label: 'Controle de Estoque', description: 'Gestão de produtos e estoque' },
    { id: 'Gestão de Fornecedores', label: 'Gestão de Fornecedores', description: 'Cadastro de fornecedores' },
    { id: 'Controle de Compras', label: 'Controle de Compras', description: 'Gestão de compras' },
    { id: 'Marca Personalizada', label: 'Marca Personalizada', description: 'Logo e cores personalizadas' },
    { id: 'Múltiplas Unidades', label: 'Múltiplas Unidades', description: 'Gestão de várias unidades' },
    { id: 'Analytics Avançado', label: 'Analytics Avançado', description: 'Analytics e métricas avançadas' },
    { id: 'Acesso à API', label: 'Acesso à API', description: 'API para integrações' },
];

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
        console.log('[MasterPlans] Loaded plans:', plans);
        plans.forEach(p => console.log(`${p.name}: R$ ${p.price}`));
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
            <div class="modal" style="max-width: 700px;">
                <div class="modal-header">
                    <h3 id="planModalTitle">Novo Plano</h3>
                    <button class="modal-close" data-modal="plan">&times;</button>
                </div>
                <form id="planForm">
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <div class="form-grid" style="display: grid; gap: 1rem;">
                            <!-- Basic Info -->
                            <div class="form-group">
                                <label>Nome do Plano *</label>
                                <input type="text" id="planName" required placeholder="Ex: Profissional">
                            </div>
                            
                            <div class="form-group">
                                <label>Slug *</label>
                                <input type="text" id="planSlug" required placeholder="profissional" pattern="[a-z0-9-]+">
                                <small style="color: #64748b;">Apenas letras minúsculas, números e hífens</small>
                            </div>
                            
                            <div class="form-group">
                                <label>Descrição</label>
                                <textarea id="planDescription" rows="2" placeholder="Descrição do plano"></textarea>
                            </div>

                            <!-- Pricing -->
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                                <div class="form-group">
                                    <label>Preço (R$) *</label>
                                    <input type="number" id="planPrice" step="0.01" required placeholder="99.90">
                                </div>
                                <div class="form-group">
                                    <label>Dias de Trial</label>
                                    <input type="number" id="planTrialDays" value="14" min="0">
                                </div>
                            </div>

                            <!-- Limits Section -->
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem; margin-top: 0.5rem;">
                                <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: #1e293b;">Limites do Plano</h4>
                                
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    <div class="form-group">
                                        <label>Usuários *</label>
                                        <input type="number" id="limitUsers" required min="1" value="2" placeholder="2">
                                    </div>
                                    <div class="form-group">
                                        <label>Profissionais *</label>
                                        <input type="number" id="limitProfessionals" required min="1" value="1" placeholder="1">
                                    </div>
                                    <div class="form-group">
                                        <label>Clientes *</label>
                                        <input type="number" id="limitClients" required min="1" value="50" placeholder="50">
                                    </div>
                                    <div class="form-group">
                                        <label>Agendamentos/mês *</label>
                                        <input type="number" id="limitAppointments" required min="1" value="100" placeholder="100">
                                    </div>
                                    <div class="form-group">
                                        <label>Armazenamento (MB) *</label>
                                        <input type="number" id="limitStorage" required min="1" value="500" placeholder="500">
                                    </div>
                                </div>
                            </div>

                            <!-- Features -->
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 1rem; margin-top: 0.5rem;">
                                <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: #1e293b;">Funcionalidades do Plano</h4>
                                <div id="planFeaturesCheckboxes" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <!-- Checkboxes serão inseridos aqui -->
                                </div>
                            </div>

                            <!-- Status -->
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
        const price = plan.pricing?.monthly || plan.price || 0;

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
                            ${formatCurrency(price)}
                            <span style="font-size: 0.9rem; font-weight: 400; color: #64748b;">/mês</span>
                        </div>
                    </div>

                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">
                        <i class="fas fa-clock"></i> ${plan.trial_days || 0} dias de trial
                    </div>

                    ${features.length > 0 ? `
                        <ul style="list-style: none; padding: 0; margin: 1rem 0 0; font-size: 0.85rem;">
                            ${features.map(f => `<li style="padding: 0.25rem 0;"><i class="fas fa-check" style="color: #16a34a; margin-right: 0.5rem;"></i>${f}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderFeaturesCheckboxes(selectedFeatures = []) {
    const container = document.getElementById('planFeaturesCheckboxes');
    if (!container) return;

    container.innerHTML = AVAILABLE_FEATURES.map(feature => `
        <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; padding: 0.5rem; border-radius: 0.375rem; transition: background 0.2s;" 
               onmouseover="this.style.background='#f1f5f9'" 
               onmouseout="this.style.background='transparent'">
            <input type="checkbox" 
                   name="feature" 
                   value="${feature.id}" 
                   ${selectedFeatures.includes(feature.id) ? 'checked' : ''}
                   style="margin-top: 0.25rem;">
            <div>
                <div style="font-weight: 500; color: #1e293b; font-size: 0.875rem;">${feature.label}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${feature.description}</div>
            </div>
        </label>
    `).join('');
}

function getSelectedFeatures() {
    const checkboxes = document.querySelectorAll('input[name="feature"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function bindEvents() {
    // Add plan
    document.getElementById('btnAddPlan')?.addEventListener('click', () => {
        editingPlan = null;
        document.getElementById('planModalTitle').textContent = 'Novo Plano';
        document.getElementById('planForm').reset();
        document.getElementById('planActive').checked = true;
        document.getElementById('planTrialDays').value = 14;
        document.getElementById('limitUsers').value = 2;
        document.getElementById('limitProfessionals').value = 1;
        document.getElementById('limitClients').value = 50;
        document.getElementById('limitAppointments').value = 100;
        document.getElementById('limitStorage').value = 500;
        renderFeaturesCheckboxes([]);
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
            document.getElementById('planSlug').value = plan.slug || '';
            document.getElementById('planDescription').value = plan.description || '';
            document.getElementById('planPrice').value = plan.pricing?.monthly || plan.price || '';
            document.getElementById('planTrialDays').value = plan.trial_days || 0;
            
            // Preencher limites individuais
            const limits = plan.limits || {};
            document.getElementById('limitUsers').value = limits.users || 2;
            document.getElementById('limitProfessionals').value = limits.professionals || 1;
            document.getElementById('limitClients').value = limits.clients || 50;
            document.getElementById('limitAppointments').value = limits.appointments_per_month || 100;
            document.getElementById('limitStorage').value = limits.storage_mb || 500;
            
            renderFeaturesCheckboxes(plan.features || []);
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

    // Coletar limites dos campos individuais
    const limits = {
        users: parseInt(document.getElementById('limitUsers').value) || 2,
        professionals: parseInt(document.getElementById('limitProfessionals').value) || 1,
        clients: parseInt(document.getElementById('limitClients').value) || 50,
        appointments_per_month: parseInt(document.getElementById('limitAppointments').value) || 100,
        storage_mb: parseInt(document.getElementById('limitStorage').value) || 500,
    };

    // Coletar features dos checkboxes
    const features = getSelectedFeatures();

    const data = {
        name: document.getElementById('planName').value.trim(),
        description: document.getElementById('planDescription').value.trim(),
        price: parseFloat(document.getElementById('planPrice').value) || 0,
        currency: 'BRL',
        billing_interval: 'monthly',
        trial_days: parseInt(document.getElementById('planTrialDays').value) || 0,
        limits,
        features,
        is_active: document.getElementById('planActive').checked,
    };

    // Adicionar slug apenas na criação
    if (!editingPlan) {
        data.slug = document.getElementById('planSlug').value.trim();
    }

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
        p.pricing?.monthly || p.price || 0,
        p.pricing?.yearly || 0,
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

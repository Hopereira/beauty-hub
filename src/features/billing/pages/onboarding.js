/**
 * SaaS Onboarding Page
 * Owner subscription to SaaS plans
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { navigateTo } from '../../../core/router.js';

let plans = [];
let selectedPlan = null;

export function render() {
    renderShell('billing');
}

export async function init() {
    await loadPlans();
    renderContent();
    
    return () => {
        plans = [];
        selectedPlan = null;
    };
}

async function loadPlans() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const response = await api.get('/billing/plans');
        plans = response.data || [];
    } catch (error) {
        console.error('Error loading plans:', error);
        showToast('Erro ao carregar planos', 'error');
        plans = [];
    }
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div class="onboarding-container">
            <div class="onboarding-header">
                <h1>Bem-vindo ao BeautyHub! 🎉</h1>
                <p>Escolha o plano ideal para o seu salão e comece a gerenciar seu negócio de forma profissional.</p>
            </div>

            <div class="plans-grid">
                ${renderPlans()}
            </div>

            <div class="onboarding-features">
                <h3>Todos os planos incluem:</h3>
                <div class="features-grid">
                    <div class="feature-item">
                        <i class="fas fa-calendar-check"></i>
                        <span>Agendamento Online</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-users"></i>
                        <span>Gestão de Clientes</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-chart-line"></i>
                        <span>Relatórios Financeiros</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-mobile-alt"></i>
                        <span>App Mobile</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-headset"></i>
                        <span>Suporte Dedicado</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-lock"></i>
                        <span>Segurança de Dados</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    bindEvents();
}

function renderPlans() {
    if (plans.length === 0) {
        return '<div style="text-align:center;padding:2rem;">Nenhum plano disponível no momento.</div>';
    }

    return plans.map(plan => {
        const limits = plan.limits || {};
        const features = plan.features || [];
        const isPopular = plan.name === 'Professional';

        return `
            <div class="plan-card ${isPopular ? 'plan-card--popular' : ''}" data-plan-id="${plan.id}">
                ${isPopular ? '<div class="plan-badge">Mais Popular</div>' : ''}
                
                <div class="plan-header">
                    <h3 class="plan-name">${plan.name}</h3>
                    <div class="plan-price">
                        <span class="price-currency">R$</span>
                        <span class="price-amount">${parseFloat(plan.price).toFixed(0)}</span>
                        <span class="price-period">/mês</span>
                    </div>
                    ${plan.description ? `<p class="plan-description">${plan.description}</p>` : ''}
                </div>

                <div class="plan-body">
                    <h4>Recursos:</h4>
                    <ul class="plan-features">
                        ${limits.professionals ? `<li><i class="fas fa-check"></i> Até ${limits.professionals} profissionais</li>` : ''}
                        ${limits.appointments ? `<li><i class="fas fa-check"></i> ${limits.appointments} agendamentos/mês</li>` : ''}
                        ${limits.clients ? `<li><i class="fas fa-check"></i> Até ${limits.clients} clientes</li>` : ''}
                        ${limits.storage ? `<li><i class="fas fa-check"></i> ${limits.storage}GB de armazenamento</li>` : ''}
                        ${features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                    </ul>
                </div>

                <div class="plan-footer">
                    <button class="btn btn-primary btn-select-plan" data-plan-id="${plan.id}">
                        Escolher ${plan.name}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function bindEvents() {
    document.querySelectorAll('.btn-select-plan').forEach(btn => {
        btn.addEventListener('click', () => selectPlan(btn.dataset.planId));
    });
}

async function selectPlan(planId) {
    selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    const confirmed = confirm(
        `Confirma a assinatura do plano ${selectedPlan.name} por ${formatCurrency(selectedPlan.price)}/mês?\n\n` +
        `Você terá ${selectedPlan.trial_days || 14} dias de teste grátis!`
    );

    if (!confirmed) return;

    try {
        const btn = event.target;
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner spinner-sm"></div>';

        await api.post('/billing/subscriptions', {
            plan_id: planId,
        });

        showToast('Assinatura criada com sucesso! Bem-vindo ao BeautyHub! 🎉', 'success');
        
        setTimeout(() => {
            navigateTo('/dashboard');
        }, 2000);
    } catch (error) {
        console.error('Error creating subscription:', error);
        showToast(error.message || 'Erro ao criar assinatura', 'error');
        event.target.disabled = false;
        event.target.innerHTML = originalText;
    }
}

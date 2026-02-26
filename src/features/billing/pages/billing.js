/**
 * Billing Page Module
 * Subscription management, plan selection, and payment
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { getSubscriptionStatus, setSubscriptionStatus } from '../../../core/state.js';
import { formatCurrency } from '../../../shared/utils/validation.js';

let currentSubscription = null;
let availablePlans = [];
let invoices = [];
let isLoading = false;

export function render() {
    renderShell('billing');
}

export async function init() {
    await loadBillingData();
    renderBillingContent();
    
    return () => {
        currentSubscription = null;
        availablePlans = [];
        invoices = [];
    };
}

async function loadBillingData() {
    const content = getContentArea();
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const [subRes, plansRes, invoicesRes] = await Promise.all([
            api.get('/billing/subscription').catch(() => ({ data: null })),
            api.get('/plans'),
            api.get('/billing/invoices').catch(() => ({ data: { invoices: [] } })),
        ]);

        currentSubscription = subRes.data;
        availablePlans = plansRes.data || [];
        invoices = invoicesRes.data?.invoices || [];

        // Update global state
        if (currentSubscription) {
            setSubscriptionStatus(currentSubscription);
        }
    } catch (error) {
        console.error('[Billing] Error loading data:', error);
        showToast('Erro ao carregar dados de assinatura', 'error');
    }
}

function renderBillingContent() {
    const content = getContentArea();
    if (!content) return;

    const sub = currentSubscription;
    const plan = sub?.plan || availablePlans.find(p => p.id === sub?.plan_id);

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Assinatura</h1>
        </div>

        <!-- Current Subscription Status -->
        <div class="billing-card">
            <div class="billing-card__header">
                <h2>Plano Atual</h2>
                ${sub ? `<span class="status-badge status-badge--${getStatusColor(sub.status)}">${getStatusLabel(sub.status)}</span>` : ''}
            </div>
            <div class="billing-card__body">
                ${sub ? `
                    <div class="current-plan">
                        <div class="current-plan__info">
                            <h3>${plan?.name || 'Plano'}</h3>
                            <p class="current-plan__price">${formatCurrency(plan?.price || 0)}<span>/mês</span></p>
                            ${sub.status === 'trial' ? `
                                <p class="trial-info">
                                    <i class="fas fa-clock"></i>
                                    Trial termina em ${formatDate(sub.trial_ends_at)}
                                </p>
                            ` : ''}
                        </div>
                        <div class="current-plan__limits">
                            <h4>Limites do Plano</h4>
                            <ul>
                                <li><i class="fas fa-users"></i> ${plan?.limits?.users || '∞'} usuários</li>
                                <li><i class="fas fa-user-friends"></i> ${plan?.limits?.clients || '∞'} clientes</li>
                                <li><i class="fas fa-user-tie"></i> ${plan?.limits?.professionals || '∞'} profissionais</li>
                                <li><i class="fas fa-calendar"></i> ${plan?.limits?.appointments_per_month || '∞'} agendamentos/mês</li>
                            </ul>
                        </div>
                    </div>
                    ${sub.status === 'trial' || sub.status === 'expired' ? `
                        <div class="upgrade-cta">
                            <p>Faça upgrade para continuar usando todas as funcionalidades!</p>
                            <button class="btn-primary" id="btnUpgrade">
                                <i class="fas fa-rocket"></i> Fazer Upgrade
                            </button>
                        </div>
                    ` : ''}
                ` : `
                    <div class="no-subscription">
                        <i class="fas fa-credit-card"></i>
                        <h3>Nenhuma assinatura ativa</h3>
                        <p>Escolha um plano abaixo para começar</p>
                    </div>
                `}
            </div>
        </div>

        <!-- Available Plans -->
        <div class="billing-section">
            <h2>Planos Disponíveis</h2>
            <div class="billing-toggle">
                <button class="billing-toggle__btn active" data-cycle="monthly">Mensal</button>
                <button class="billing-toggle__btn" data-cycle="yearly">
                    Anual <span class="discount-badge">-20%</span>
                </button>
            </div>
            <div class="plans-grid" id="plansGrid">
                ${renderPlansGrid('monthly')}
            </div>
        </div>

        <!-- Invoices -->
        <div class="billing-section">
            <h2>Histórico de Faturas</h2>
            <div class="invoices-list" id="invoicesList">
                ${renderInvoicesList()}
            </div>
        </div>

        <!-- Cancel Subscription -->
        ${sub && ['active', 'trial'].includes(sub.status) ? `
            <div class="billing-section danger-zone">
                <h2>Zona de Perigo</h2>
                <div class="danger-zone__content">
                    <div>
                        <h4>Cancelar Assinatura</h4>
                        <p>Você perderá acesso às funcionalidades premium ao final do período atual.</p>
                    </div>
                    <button class="btn-danger btn-sm" id="btnCancel">Cancelar Assinatura</button>
                </div>
            </div>
        ` : ''}
    `;

    bindBillingEvents();
}

function renderPlansGrid(cycle = 'monthly') {
    const multiplier = cycle === 'yearly' ? 0.8 : 1;
    const periodLabel = cycle === 'yearly' ? '/ano' : '/mês';

    return availablePlans.map(plan => {
        const price = (plan.price || 0) * multiplier * (cycle === 'yearly' ? 12 : 1);
        const isCurrentPlan = currentSubscription?.plan_id === plan.id;
        const isPopular = plan.slug === 'professional';

        return `
            <div class="plan-card ${isCurrentPlan ? 'plan-card--current' : ''} ${isPopular ? 'plan-card--popular' : ''}">
                ${isPopular ? '<div class="plan-card__badge">Mais Popular</div>' : ''}
                ${isCurrentPlan ? '<div class="plan-card__badge plan-card__badge--current">Plano Atual</div>' : ''}
                <div class="plan-card__header">
                    <h3>${plan.name}</h3>
                    <p class="plan-card__description">${plan.description || ''}</p>
                </div>
                <div class="plan-card__price">
                    <span class="price-value">${formatCurrency(price)}</span>
                    <span class="price-period">${periodLabel}</span>
                </div>
                <ul class="plan-card__features">
                    <li><i class="fas fa-check"></i> ${plan.limits?.users || '∞'} usuários</li>
                    <li><i class="fas fa-check"></i> ${plan.limits?.clients || '∞'} clientes</li>
                    <li><i class="fas fa-check"></i> ${plan.limits?.professionals || '∞'} profissionais</li>
                    <li><i class="fas fa-check"></i> ${plan.limits?.appointments_per_month || '∞'} agendamentos/mês</li>
                    ${(plan.features || []).slice(0, 3).map(f => `<li><i class="fas fa-check"></i> ${formatFeature(f)}</li>`).join('')}
                </ul>
                <button class="btn-primary plan-card__btn ${isCurrentPlan ? 'btn-disabled' : ''}" 
                    data-plan-id="${plan.id}" 
                    data-cycle="${cycle}"
                    ${isCurrentPlan ? 'disabled' : ''}>
                    ${isCurrentPlan ? 'Plano Atual' : 'Selecionar'}
                </button>
            </div>
        `;
    }).join('');
}

function renderInvoicesList() {
    if (!invoices.length) {
        return `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h3>Nenhuma fatura</h3>
                <p>Suas faturas aparecerão aqui</p>
            </div>
        `;
    }

    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${invoices.map(inv => `
                    <tr>
                        <td>${formatDate(inv.created_at)}</td>
                        <td>${inv.description || 'Assinatura'}</td>
                        <td>${formatCurrency(inv.amount)}</td>
                        <td><span class="status-badge status-badge--${inv.status === 'paid' ? 'success' : 'warning'}">${inv.status === 'paid' ? 'Pago' : 'Pendente'}</span></td>
                        <td>
                            ${inv.invoice_url ? `<a href="${inv.invoice_url}" target="_blank" class="btn-sm btn-secondary">Ver</a>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function bindBillingEvents() {
    // Billing cycle toggle
    document.querySelectorAll('.billing-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.billing-toggle__btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cycle = btn.dataset.cycle;
            document.getElementById('plansGrid').innerHTML = renderPlansGrid(cycle);
            bindPlanButtons();
        });
    });

    bindPlanButtons();

    // Upgrade button
    document.getElementById('btnUpgrade')?.addEventListener('click', () => {
        document.querySelector('.billing-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Cancel button
    document.getElementById('btnCancel')?.addEventListener('click', handleCancelSubscription);
}

function bindPlanButtons() {
    document.querySelectorAll('.plan-card__btn:not(.btn-disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const planId = btn.dataset.planId;
            const cycle = btn.dataset.cycle;
            handleSelectPlan(planId, cycle);
        });
    });
}

async function handleSelectPlan(planId, cycle) {
    const plan = availablePlans.find(p => p.id === planId);
    if (!plan) return;

    // Show payment modal
    showPaymentModal(plan, cycle);
}

function showPaymentModal(plan, cycle) {
    const multiplier = cycle === 'yearly' ? 0.8 : 1;
    const price = (plan.price || 0) * multiplier * (cycle === 'yearly' ? 12 : 1);

    const modalHTML = `
        <div class="modal-overlay" id="paymentModal" style="display:flex;">
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <h2>Confirmar Assinatura</h2>
                </div>
                <div class="modal-body">
                    <div class="payment-summary">
                        <div class="payment-summary__plan">
                            <h3>${plan.name}</h3>
                            <p>${cycle === 'yearly' ? 'Anual' : 'Mensal'}</p>
                        </div>
                        <div class="payment-summary__price">
                            <span class="price-value">${formatCurrency(price)}</span>
                            <span class="price-period">/${cycle === 'yearly' ? 'ano' : 'mês'}</span>
                        </div>
                    </div>

                    <div class="payment-methods">
                        <h4>Método de Pagamento</h4>
                        <div class="payment-method-options">
                            <label class="payment-method-option">
                                <input type="radio" name="paymentMethod" value="card" checked>
                                <span><i class="fas fa-credit-card"></i> Cartão de Crédito</span>
                            </label>
                            <label class="payment-method-option">
                                <input type="radio" name="paymentMethod" value="pix">
                                <span><i class="fas fa-qrcode"></i> PIX</span>
                            </label>
                        </div>
                    </div>

                    <div id="cardForm" class="card-form">
                        <div class="modal-field">
                            <label class="modal-label">Número do Cartão</label>
                            <input type="text" class="modal-input" id="cardNumber" placeholder="0000 0000 0000 0000" maxlength="19">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                            <div class="modal-field">
                                <label class="modal-label">Validade</label>
                                <input type="text" class="modal-input" id="cardExpiry" placeholder="MM/AA" maxlength="5">
                            </div>
                            <div class="modal-field">
                                <label class="modal-label">CVV</label>
                                <input type="text" class="modal-input" id="cardCvv" placeholder="123" maxlength="4">
                            </div>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Nome no Cartão</label>
                            <input type="text" class="modal-input" id="cardName" placeholder="NOME COMPLETO">
                        </div>
                    </div>

                    <div id="pixForm" class="pix-form" style="display:none;">
                        <p class="text-muted">Ao confirmar, você receberá um QR Code PIX para pagamento.</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeModal('paymentModal')">Cancelar</button>
                    <button class="btn-primary" id="btnConfirmPayment" data-plan-id="${plan.id}" data-cycle="${cycle}">
                        <i class="fas fa-lock"></i> Confirmar Pagamento
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Payment method toggle
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('cardForm').style.display = e.target.value === 'card' ? 'block' : 'none';
            document.getElementById('pixForm').style.display = e.target.value === 'pix' ? 'block' : 'none';
        });
    });

    // Card number formatting
    document.getElementById('cardNumber')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim();
    });

    // Expiry formatting
    document.getElementById('cardExpiry')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
    });

    // Confirm payment
    document.getElementById('btnConfirmPayment')?.addEventListener('click', async () => {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
        await processPayment(plan, cycle, paymentMethod);
    });
}

async function processPayment(plan, cycle, paymentMethod) {
    const btn = document.getElementById('btnConfirmPayment');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> Processando...';

    try {
        if (paymentMethod === 'pix') {
            const response = await api.post('/billing/subscription/pix', {
                planId: plan.id,
                billingCycle: cycle,
            });

            // Show PIX QR Code
            showPixQrCode(response.data);
        } else {
            const cardData = {
                number: document.getElementById('cardNumber')?.value.replace(/\s/g, ''),
                expiry: document.getElementById('cardExpiry')?.value,
                cvv: document.getElementById('cardCvv')?.value,
                name: document.getElementById('cardName')?.value,
            };

            const response = await api.post('/billing/subscription/activate', {
                planId: plan.id,
                billingCycle: cycle,
                paymentMethod: 'card',
                paymentData: cardData,
            });

            showToast('Assinatura ativada com sucesso!', 'success');
            closeModal('paymentModal');
            await loadBillingData();
            renderBillingContent();
        }
    } catch (error) {
        console.error('[Billing] Payment error:', error);
        showToast(error.message || 'Erro ao processar pagamento', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-lock"></i> Confirmar Pagamento';
    }
}

function showPixQrCode(pixData) {
    const modal = document.getElementById('paymentModal');
    if (!modal) return;

    modal.querySelector('.modal-content').innerHTML = `
        <div class="modal-header">
            <h2>Pagamento via PIX</h2>
        </div>
        <div class="modal-body" style="text-align:center;">
            <div class="pix-qrcode">
                ${pixData.qrCodeBase64 ? `<img src="${pixData.qrCodeBase64}" alt="QR Code PIX" style="max-width:200px;">` : ''}
            </div>
            <p style="margin:1rem 0;">Escaneie o QR Code ou copie o código abaixo:</p>
            <div class="pix-copy-code">
                <input type="text" value="${pixData.copyPasteCode || pixData.qrCode}" readonly class="modal-input" id="pixCode">
                <button class="btn-primary btn-sm" onclick="navigator.clipboard.writeText(document.getElementById('pixCode').value);showToast('Código copiado!','success');">
                    <i class="fas fa-copy"></i> Copiar
                </button>
            </div>
            <p class="text-muted" style="margin-top:1rem;font-size:0.85rem;">
                <i class="fas fa-clock"></i> Expira em ${pixData.expiresAt ? formatDate(pixData.expiresAt) : '30 minutos'}
            </p>
        </div>
        <div class="modal-actions">
            <button class="btn-secondary" onclick="closeModal('paymentModal');location.reload();">Fechar</button>
        </div>
    `;
}

async function handleCancelSubscription() {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você perderá acesso às funcionalidades premium.')) {
        return;
    }

    try {
        await api.post('/billing/subscription/cancel', {
            immediately: false,
            reason: 'Cancelado pelo usuário',
        });

        showToast('Assinatura cancelada. Você terá acesso até o fim do período.', 'info');
        await loadBillingData();
        renderBillingContent();
    } catch (error) {
        console.error('[Billing] Cancel error:', error);
        showToast(error.message || 'Erro ao cancelar assinatura', 'error');
    }
}

// Helper functions
function getStatusColor(status) {
    const colors = {
        active: 'success',
        trial: 'info',
        past_due: 'warning',
        suspended: 'error',
        cancelled: 'error',
        expired: 'error',
    };
    return colors[status] || 'default';
}

function getStatusLabel(status) {
    const labels = {
        active: 'Ativo',
        trial: 'Trial',
        past_due: 'Pagamento Pendente',
        suspended: 'Suspenso',
        cancelled: 'Cancelado',
        expired: 'Expirado',
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatFeature(feature) {
    const labels = {
        appointments: 'Agendamentos',
        clients: 'Gestão de Clientes',
        notifications: 'Notificações',
        financial: 'Módulo Financeiro',
        reports: 'Relatórios',
        api_access: 'Acesso à API',
        custom_branding: 'Marca Personalizada',
        advanced_analytics: 'Analytics Avançado',
        priority_support: 'Suporte Prioritário',
    };
    return labels[feature] || feature;
}

function closeModal(id) {
    document.getElementById(id)?.remove();
}

// Make closeModal available globally
window.closeModal = closeModal;

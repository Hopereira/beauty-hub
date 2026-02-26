/**
 * Settings Page Module
 * Tenant settings, branding, and business configuration
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { getCurrentUser } from '../../../core/state.js';

let tenantSettings = null;
let isLoading = false;

const TIMEZONES = [
    { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
    { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
    { value: 'America/Recife', label: 'Recife (GMT-3)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (GMT-3)' },
];

const WEEKDAYS = [
    { key: 'monday', label: 'Segunda' },
    { key: 'tuesday', label: 'Terça' },
    { key: 'wednesday', label: 'Quarta' },
    { key: 'thursday', label: 'Quinta' },
    { key: 'friday', label: 'Sexta' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
];

export function render() {
    renderShell('settings');
}

export async function init() {
    await loadSettings();
    renderContent();
    
    return () => {
        tenantSettings = null;
    };
}

async function loadSettings() {
    const content = getContentArea();
    content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
            <div class="spinner"></div>
        </div>
    `;

    try {
        const response = await api.get('/tenant');
        tenantSettings = response.data || {};
    } catch (error) {
        console.error('[Settings] Error loading settings:', error);
        showToast('Erro ao carregar configurações', 'error');
        tenantSettings = {};
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    const user = getCurrentUser();
    const settings = tenantSettings.settings || {};
    const branding = tenantSettings.branding || {};
    const businessHours = settings.businessHours || {};

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Configurações</h1>
        </div>

        <div class="settings-grid">
            <!-- Business Info -->
            <div class="settings-card">
                <div class="settings-card__header">
                    <i class="fas fa-building"></i>
                    <h3>Informações do Negócio</h3>
                </div>
                <form id="businessInfoForm" class="settings-card__body">
                    <div class="modal-field">
                        <label class="modal-label">Nome do Estabelecimento</label>
                        <input type="text" class="modal-input" id="tenantName" value="${tenantSettings.name || ''}">
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Telefone</label>
                        <input type="tel" class="modal-input" id="tenantPhone" value="${tenantSettings.phone || ''}">
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Email de Contato</label>
                        <input type="email" class="modal-input" id="tenantEmail" value="${tenantSettings.email || ''}">
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Endereço</label>
                        <textarea class="modal-input" id="tenantAddress" rows="2">${tenantSettings.address || ''}</textarea>
                    </div>
                    <button type="submit" class="btn-primary btn-sm">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </form>
            </div>

            <!-- Regional Settings -->
            <div class="settings-card">
                <div class="settings-card__header">
                    <i class="fas fa-globe"></i>
                    <h3>Configurações Regionais</h3>
                </div>
                <form id="regionalForm" class="settings-card__body">
                    <div class="modal-field">
                        <label class="modal-label">Fuso Horário</label>
                        <select class="modal-input" id="settingsTimezone">
                            ${TIMEZONES.map(tz => `
                                <option value="${tz.value}" ${settings.timezone === tz.value ? 'selected' : ''}>${tz.label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Idioma</label>
                        <select class="modal-input" id="settingsLanguage">
                            <option value="pt-BR" ${settings.language === 'pt-BR' ? 'selected' : ''}>Português (Brasil)</option>
                            <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                            <option value="es" ${settings.language === 'es' ? 'selected' : ''}>Español</option>
                        </select>
                    </div>
                    <div class="modal-field">
                        <label class="modal-label">Moeda</label>
                        <select class="modal-input" id="settingsCurrency">
                            <option value="BRL" ${settings.currency === 'BRL' ? 'selected' : ''}>Real (R$)</option>
                            <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>Dólar (US$)</option>
                            <option value="EUR" ${settings.currency === 'EUR' ? 'selected' : ''}>Euro (€)</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-primary btn-sm">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </form>
            </div>

            <!-- Branding -->
            <div class="settings-card">
                <div class="settings-card__header">
                    <i class="fas fa-palette"></i>
                    <h3>Identidade Visual</h3>
                </div>
                <form id="brandingForm" class="settings-card__body">
                    <div class="modal-field">
                        <label class="modal-label">Logo (URL)</label>
                        <input type="url" class="modal-input" id="brandingLogo" value="${branding.logo || ''}" placeholder="https://...">
                        ${branding.logo ? `<img src="${branding.logo}" alt="Logo" style="max-width:100px;margin-top:0.5rem;border-radius:var(--radius-md);">` : ''}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Cor Primária</label>
                            <div style="display:flex;gap:0.5rem;align-items:center;">
                                <input type="color" id="brandingPrimary" value="${branding.primaryColor || '#20B2AA'}" style="width:50px;height:36px;border:none;cursor:pointer;">
                                <input type="text" class="modal-input" id="brandingPrimaryText" value="${branding.primaryColor || '#20B2AA'}" style="flex:1;">
                            </div>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Cor Secundária</label>
                            <div style="display:flex;gap:0.5rem;align-items:center;">
                                <input type="color" id="brandingSecondary" value="${branding.secondaryColor || '#008B8B'}" style="width:50px;height:36px;border:none;cursor:pointer;">
                                <input type="text" class="modal-input" id="brandingSecondaryText" value="${branding.secondaryColor || '#008B8B'}" style="flex:1;">
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="btn-primary btn-sm">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </form>
            </div>

            <!-- Business Hours -->
            <div class="settings-card settings-card--wide">
                <div class="settings-card__header">
                    <i class="fas fa-clock"></i>
                    <h3>Horário de Funcionamento</h3>
                </div>
                <form id="businessHoursForm" class="settings-card__body">
                    <div class="business-hours-grid">
                        ${WEEKDAYS.map(day => `
                            <div class="business-hours-row">
                                <label class="business-hours-day">
                                    <input type="checkbox" id="${day.key}Open" ${businessHours[day.key]?.open ? 'checked' : ''}>
                                    ${day.label}
                                </label>
                                <div class="business-hours-times">
                                    <input type="time" class="modal-input" id="${day.key}Start" value="${businessHours[day.key]?.open || '09:00'}" ${!businessHours[day.key]?.open ? 'disabled' : ''}>
                                    <span>às</span>
                                    <input type="time" class="modal-input" id="${day.key}End" value="${businessHours[day.key]?.close || '18:00'}" ${!businessHours[day.key]?.open ? 'disabled' : ''}>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button type="submit" class="btn-primary btn-sm" style="margin-top:1rem;">
                        <i class="fas fa-save"></i> Salvar Horários
                    </button>
                </form>
            </div>

            <!-- Payment Settings (Pagar.me) -->
            <div class="settings-card settings-card--wide">
                <div class="settings-card__header">
                    <i class="fas fa-credit-card"></i>
                    <h3>Configurações de Pagamento (Pagar.me)</h3>
                </div>
                <form id="paymentSettingsForm" class="settings-card__body">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">API Key Pagar.me</label>
                            <input type="text" class="modal-input" id="pagarmeApiKey" value="${tenantSettings.payment_settings?.pagarme_api_key || ''}" placeholder="sk_test_...">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Recipient ID</label>
                            <input type="text" class="modal-input" id="pagarmeRecipientId" value="${tenantSettings.pagarme_recipient_id || ''}" placeholder="re_..." readonly>
                        </div>
                    </div>
                    
                    <h4 style="margin:1.5rem 0 1rem;font-size:1rem;font-weight:600;">Dados Bancários</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Banco</label>
                            <input type="text" class="modal-input" id="bankCode" value="${tenantSettings.bank_account?.bank_code || ''}" placeholder="Ex: 001 (Banco do Brasil)">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Tipo de Conta</label>
                            <select class="modal-input" id="accountType">
                                <option value="">Selecione</option>
                                <option value="conta_corrente" ${tenantSettings.bank_account?.account_type === 'conta_corrente' ? 'selected' : ''}>Conta Corrente</option>
                                <option value="conta_poupanca" ${tenantSettings.bank_account?.account_type === 'conta_poupanca' ? 'selected' : ''}>Conta Poupança</option>
                                <option value="conta_corrente_conjunta" ${tenantSettings.bank_account?.account_type === 'conta_corrente_conjunta' ? 'selected' : ''}>Conta Corrente Conjunta</option>
                                <option value="conta_poupanca_conjunta" ${tenantSettings.bank_account?.account_type === 'conta_poupanca_conjunta' ? 'selected' : ''}>Conta Poupança Conjunta</option>
                            </select>
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Agência</label>
                            <input type="text" class="modal-input" id="bankAgency" value="${tenantSettings.bank_account?.agencia || ''}" placeholder="0000">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Dígito Agência</label>
                            <input type="text" class="modal-input" id="bankAgencyDv" value="${tenantSettings.bank_account?.agencia_dv || ''}" placeholder="0" maxlength="1">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Conta</label>
                            <input type="text" class="modal-input" id="bankAccount" value="${tenantSettings.bank_account?.conta || ''}" placeholder="00000">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">Dígito Conta</label>
                            <input type="text" class="modal-input" id="bankAccountDv" value="${tenantSettings.bank_account?.conta_dv || ''}" placeholder="0" maxlength="2">
                        </div>
                    </div>
                    
                    <h4 style="margin:1.5rem 0 1rem;font-size:1rem;font-weight:600;">Dados do Titular</h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                        <div class="modal-field">
                            <label class="modal-label">Nome Completo</label>
                            <input type="text" class="modal-input" id="holderName" value="${tenantSettings.bank_account?.legal_name || ''}" placeholder="Nome completo do titular">
                        </div>
                        <div class="modal-field">
                            <label class="modal-label">CPF/CNPJ</label>
                            <input type="text" class="modal-input" id="holderDocument" value="${tenantSettings.bank_account?.document_number || tenantSettings.cnpj || ''}" placeholder="000.000.000-00">
                        </div>
                    </div>
                    
                    <div class="modal-field">
                        <label class="modal-label">
                            <input type="checkbox" id="automaticAnticipation" ${tenantSettings.payment_settings?.automatic_anticipation ? 'checked' : ''}>
                            Habilitar antecipação automática
                        </label>
                    </div>
                    
                    <button type="submit" class="btn-primary btn-sm" style="margin-top:1rem;">
                        <i class="fas fa-save"></i> Salvar Configurações de Pagamento
                    </button>
                </form>
            </div>

            <!-- Notifications -->
            <div class="settings-card">
                <div class="settings-card__header">
                    <i class="fas fa-bell"></i>
                    <h3>Notificações</h3>
                </div>
                <form id="notificationsForm" class="settings-card__body">
                    <div class="settings-toggle">
                        <label>
                            <span>Email de novos agendamentos</span>
                            <label class="switch">
                                <input type="checkbox" id="notifyNewAppointments" ${settings.notifications?.newAppointments !== false ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label>
                            <span>Lembrete de agendamentos</span>
                            <label class="switch">
                                <input type="checkbox" id="notifyReminders" ${settings.notifications?.reminders !== false ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </label>
                    </div>
                    <div class="settings-toggle">
                        <label>
                            <span>Relatórios semanais</span>
                            <label class="switch">
                                <input type="checkbox" id="notifyWeeklyReports" ${settings.notifications?.weeklyReports ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </label>
                    </div>
                    <button type="submit" class="btn-primary btn-sm" style="margin-top:1rem;">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                </form>
            </div>
        </div>
    `;

    bindEvents();
}

function bindEvents() {
    // Business Info form
    document.getElementById('businessInfoForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings('info');
    });

    // Regional form
    document.getElementById('regionalForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings('regional');
    });

    // Branding form
    document.getElementById('brandingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBranding();
    });

    // Color picker sync
    document.getElementById('brandingPrimary')?.addEventListener('input', (e) => {
        document.getElementById('brandingPrimaryText').value = e.target.value;
    });
    document.getElementById('brandingPrimaryText')?.addEventListener('input', (e) => {
        document.getElementById('brandingPrimary').value = e.target.value;
    });
    document.getElementById('brandingSecondary')?.addEventListener('input', (e) => {
        document.getElementById('brandingSecondaryText').value = e.target.value;
    });
    document.getElementById('brandingSecondaryText')?.addEventListener('input', (e) => {
        document.getElementById('brandingSecondary').value = e.target.value;
    });

    // Business hours checkboxes
    WEEKDAYS.forEach(day => {
        document.getElementById(`${day.key}Open`)?.addEventListener('change', (e) => {
            document.getElementById(`${day.key}Start`).disabled = !e.target.checked;
            document.getElementById(`${day.key}End`).disabled = !e.target.checked;
        });
    });

    // Business Hours form
    document.getElementById('businessHoursForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBusinessHours();
    });

    // Payment Settings form
    document.getElementById('paymentSettingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePaymentSettings();
    });

    // Notifications form
    document.getElementById('notificationsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings('notifications');
    });
}

async function saveSettings(section) {
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        let data = {};

        if (section === 'info') {
            // This would typically be a different endpoint
            data = {
                name: document.getElementById('tenantName').value,
                phone: document.getElementById('tenantPhone').value,
                email: document.getElementById('tenantEmail').value,
                address: document.getElementById('tenantAddress').value,
            };
        } else if (section === 'regional') {
            data = {
                timezone: document.getElementById('settingsTimezone').value,
                language: document.getElementById('settingsLanguage').value,
                currency: document.getElementById('settingsCurrency').value,
            };
        } else if (section === 'notifications') {
            data = {
                notifications: {
                    newAppointments: document.getElementById('notifyNewAppointments').checked,
                    reminders: document.getElementById('notifyReminders').checked,
                    weeklyReports: document.getElementById('notifyWeeklyReports').checked,
                },
            };
        }

        await api.put('/tenant/settings', data);
        showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
        console.error('[Settings] Save error:', error);
        showToast(error.message || 'Erro ao salvar configurações', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function saveBranding() {
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        const data = {
            logo: document.getElementById('brandingLogo').value,
            primaryColor: document.getElementById('brandingPrimaryText').value,
            secondaryColor: document.getElementById('brandingSecondaryText').value,
        };

        await api.put('/tenant/branding', data);
        showToast('Identidade visual atualizada!', 'success');
        
        // Update CSS variables
        document.documentElement.style.setProperty('--primary-color', data.primaryColor);
        document.documentElement.style.setProperty('--primary-dark', data.secondaryColor);
    } catch (error) {
        console.error('[Settings] Branding save error:', error);
        showToast(error.message || 'Erro ao salvar identidade visual', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function saveBusinessHours() {
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        const businessHours = {};
        
        WEEKDAYS.forEach(day => {
            const isOpen = document.getElementById(`${day.key}Open`).checked;
            if (isOpen) {
                businessHours[day.key] = {
                    open: document.getElementById(`${day.key}Start`).value,
                    close: document.getElementById(`${day.key}End`).value,
                };
            } else {
                businessHours[day.key] = null;
            }
        });

        await api.put('/tenant/settings', { businessHours });
        showToast('Horário de funcionamento salvo!', 'success');
    } catch (error) {
        console.error('[Settings] Business hours save error:', error);
        showToast(error.message || 'Erro ao salvar horários', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function savePaymentSettings() {
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        const data = {
            payment_settings: {
                pagarme_api_key: document.getElementById('pagarmeApiKey').value,
                automatic_anticipation: document.getElementById('automaticAnticipation').checked,
            },
            bank_account: {
                bank_code: document.getElementById('bankCode').value,
                account_type: document.getElementById('accountType').value,
                agencia: document.getElementById('bankAgency').value,
                agencia_dv: document.getElementById('bankAgencyDv').value,
                conta: document.getElementById('bankAccount').value,
                conta_dv: document.getElementById('bankAccountDv').value,
                legal_name: document.getElementById('holderName').value,
                document_number: document.getElementById('holderDocument').value,
            },
        };

        await api.put('/establishments/payment-settings', data);
        showToast('Configurações de pagamento salvas com sucesso!', 'success');
        
        // Reload to get updated recipient_id if created
        await loadSettings();
        renderContent();
    } catch (error) {
        console.error('[Settings] Payment settings save error:', error);
        showToast(error.message || 'Erro ao salvar configurações de pagamento', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

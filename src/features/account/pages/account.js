/**
 * Account Page Module
 * Profile editing, security (email/password/phone), payments, notifications
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCurrentUser, setCurrentUser } from '../../../core/state.js';
import { getCollection, updateInCollection, KEYS, getItem, saveItem } from '../../../shared/utils/localStorage.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { navigateTo } from '../../../core/router.js';

let activeTab = 'profile';

export function render() {
    renderShell('account');
}

export function init() {
    activeTab = 'profile';
    renderPage();
    return () => { activeTab = 'profile'; };
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    const user = getCurrentUser();
    if (!user) return;

    const settings = getItem(KEYS.SETTINGS) || { emailUpdates: true, smsReminders: false, promos: true };

    content.innerHTML = `
        <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin-bottom:2rem;">Minha conta</h1>

        <div style="display:flex;gap:2rem;align-items:flex-start;" id="accountLayout">
            <!-- Left Menu -->
            <div style="background:white;border-radius:12px;padding:1rem 0;width:280px;box-shadow:var(--shadow);flex-shrink:0;" id="settingsMenu">
                <div class="settings-tab active" data-tab="profile" style="display:flex;align-items:center;gap:12px;padding:15px 2rem;color:var(--text-dark);font-weight:500;cursor:pointer;transition:0.2s;">
                    <i class="far fa-user" style="width:20px;text-align:center;"></i> Meu perfil
                </div>
                <div class="settings-tab" data-tab="security" style="display:flex;align-items:center;gap:12px;padding:15px 2rem;color:var(--text-dark);font-weight:500;cursor:pointer;transition:0.2s;">
                    <i class="fas fa-shield-alt" style="width:20px;text-align:center;"></i> Segurança
                </div>
                <div class="settings-tab" data-tab="payments" style="display:flex;align-items:center;gap:12px;padding:15px 2rem;color:var(--text-dark);font-weight:500;cursor:pointer;transition:0.2s;">
                    <i class="far fa-credit-card" style="width:20px;text-align:center;"></i> Pagamentos
                </div>
                <div class="settings-tab" data-tab="notifications" style="display:flex;align-items:center;gap:12px;padding:15px 2rem;color:var(--text-dark);font-weight:500;cursor:pointer;transition:0.2s;">
                    <i class="far fa-bell" style="width:20px;text-align:center;"></i> Notificações
                </div>
                <a href="/dashboard" style="display:flex;align-items:center;gap:12px;padding:15px 2rem;color:var(--text-dark);font-weight:500;cursor:pointer;margin-top:1rem;border-top:1px solid #eee;text-decoration:none;">
                    <i class="fas fa-arrow-left" style="width:20px;text-align:center;"></i> Voltar
                </a>
            </div>

            <!-- Right Content -->
            <div style="flex:1;background:white;border-radius:12px;padding:3rem;box-shadow:var(--shadow);min-height:500px;" id="tabContent"></div>
        </div>

        <!-- Email Modal -->
        <div id="modal-email" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;">
                <h2 style="margin:0 0 1rem 0;color:var(--text-dark);font-size:1.5rem;">Atualizar e-mail</h2>
                <p style="color:var(--text-muted);margin-bottom:1.5rem;">Para alterar seu e-mail atual, preencha os campos abaixo.</p>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Email atual</label>
                    <span id="currentEmailDisplay" style="font-weight:500;color:var(--text-dark);display:block;margin-bottom:0.5rem;">${user.email}</span>
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Novo email</label>
                    <input type="email" id="newEmail" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Confirme o novo email</label>
                    <input type="email" id="confirmNewEmail" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                    <button id="btnCancelEmail" style="background:white;border:1px solid #ddd;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Cancelar</button>
                    <button id="btnSaveEmail" style="background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Atualizar</button>
                </div>
            </div>
        </div>

        <!-- Password Modal -->
        <div id="modal-password" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;">
                <h2 style="margin:0 0 1rem 0;color:var(--text-dark);font-size:1.5rem;">Atualizar senha</h2>
                <p style="color:var(--text-muted);margin-bottom:1.5rem;">Defina uma nova senha para sua conta.</p>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Nova senha</label>
                    <input type="password" id="newPassword" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Confirmar nova senha</label>
                    <input type="password" id="confirmNewPassword" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                    <button id="btnCancelPassword" style="background:white;border:1px solid #ddd;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Cancelar</button>
                    <button id="btnSavePassword" style="background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Atualizar</button>
                </div>
            </div>
        </div>

        <!-- Phone Modal -->
        <div id="modal-phone" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;">
                <h2 style="margin:0 0 1rem 0;color:var(--text-dark);font-size:1.5rem;">Atualizar telefone</h2>
                <p style="color:var(--text-muted);margin-bottom:1.5rem;">Mantenha seu contato atualizado.</p>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Telefone atual</label>
                    <span id="currentPhoneDisplay" style="font-weight:500;color:var(--text-dark);display:block;margin-bottom:0.5rem;">${user.phone || 'Não informado'}</span>
                </div>
                <div style="margin-bottom:1.5rem;">
                    <label style="display:block;font-weight:600;color:var(--text-dark);margin-bottom:0.5rem;font-size:0.9rem;">Novo telefone</label>
                    <input type="tel" id="newPhone" placeholder="11999990000" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;box-sizing:border-box;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:1rem;margin-top:2rem;">
                    <button id="btnCancelPhone" style="background:white;border:1px solid #ddd;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Cancelar</button>
                    <button id="btnSavePhone" style="background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;">Atualizar</button>
                </div>
            </div>
        </div>
    `;

    renderTab('profile');
    bindEvents();
}

function renderTab(tab) {
    activeTab = tab;
    const tabContent = document.getElementById('tabContent');
    if (!tabContent) return;

    // Update menu active state
    document.querySelectorAll('.settings-tab').forEach(el => {
        el.style.backgroundColor = '';
        el.style.color = 'var(--text-dark)';
        el.style.borderLeft = 'none';
        el.classList.remove('active');
    });
    const activeEl = document.querySelector(`.settings-tab[data-tab="${tab}"]`);
    if (activeEl) {
        activeEl.style.backgroundColor = 'rgba(32, 178, 170, 0.08)';
        activeEl.style.color = 'var(--primary-color)';
        activeEl.style.borderLeft = '3px solid var(--primary-color)';
        activeEl.classList.add('active');
    }

    const user = getCurrentUser();
    const settings = getItem(KEYS.SETTINGS) || { emailUpdates: true, smsReminders: false, promos: true };

    switch (tab) {
        case 'profile':
            tabContent.innerHTML = `
                <div><h2 style="font-size:1.5rem;color:var(--text-dark);margin:0 0 0.5rem 0;">Perfil</h2><p style="color:var(--text-muted);margin-bottom:2rem;">Atualize as informações da sua conta</p></div>
                <div style="margin-bottom:2rem;">
                    <div style="width:120px;height:120px;border-radius:50%;${user.avatar ? `background-image:url('${user.avatar}');background-size:cover;` : 'background:var(--primary-color);display:flex;align-items:center;justify-content:center;color:white;font-size:2.5rem;font-weight:700;'}border:4px solid #f5f5f5;">
                        ${user.avatar ? '' : (user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                </div>
                <form id="profileForm">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;margin-bottom:1.5rem;">
                        <div>
                            <label style="display:block;margin-bottom:0.5rem;color:var(--text-muted);font-size:0.9rem;">Primeiro nome</label>
                            <input type="text" id="profileFirstName" value="${user.firstName || ''}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;color:var(--text-dark);box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:0.5rem;color:var(--text-muted);font-size:0.9rem;">Sobrenome</label>
                            <input type="text" id="profileLastName" value="${user.lastName || ''}" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:6px;font-size:1rem;color:var(--text-dark);box-sizing:border-box;">
                        </div>
                    </div>
                    <button type="submit" style="background:var(--primary-color);color:white;border:none;padding:12px 40px;border-radius:6px;font-weight:600;cursor:pointer;font-size:1rem;float:right;">Salvar</button>
                </form>
            `;
            document.getElementById('profileForm')?.addEventListener('submit', handleProfileSave);
            break;

        case 'security':
            tabContent.innerHTML = `
                <div><h2 style="font-size:1.5rem;color:var(--text-dark);margin:0 0 0.5rem 0;">Segurança</h2><p style="color:var(--text-muted);margin-bottom:2rem;">Gerencie os detalhes da sua conta abaixo</p></div>
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <span style="width:150px;font-weight:600;color:var(--text-dark);">Email</span>
                        <span style="flex:1;color:var(--text-dark);font-weight:500;">${user.email}</span>
                        <i class="fas fa-pencil-alt" id="btnEditEmail" style="color:#ccc;cursor:pointer;transition:color 0.2s;"></i>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <span style="width:150px;font-weight:600;color:var(--text-dark);">Senha</span>
                        <span style="flex:1;color:var(--text-dark);font-weight:500;">•••••••••••</span>
                        <i class="fas fa-pencil-alt" id="btnEditPassword" style="color:#ccc;cursor:pointer;transition:color 0.2s;"></i>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <span style="width:150px;font-weight:600;color:var(--text-dark);">Telefone</span>
                        <span style="flex:1;color:var(--text-dark);font-weight:500;">${user.phone || 'Não informado'}</span>
                        <i class="fas fa-pencil-alt" id="btnEditPhone" style="color:#ccc;cursor:pointer;transition:color 0.2s;"></i>
                    </div>
                </div>
                <a href="#" id="btnDeleteAccount" style="display:block;margin-top:2rem;color:#20B2AA;font-weight:500;font-size:0.9rem;">Deletar minha conta</a>
            `;
            document.getElementById('btnEditEmail')?.addEventListener('click', () => openModal('email'));
            document.getElementById('btnEditPassword')?.addEventListener('click', () => openModal('password'));
            document.getElementById('btnEditPhone')?.addEventListener('click', () => openModal('phone'));
            document.getElementById('btnDeleteAccount')?.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('Funcionalidade de exclusão de conta será implementada com backend.', 'info');
            });
            break;

        case 'payments':
            tabContent.innerHTML = `
                <div><h2 style="font-size:1.5rem;color:var(--text-dark);margin:0 0 0.5rem 0;">Pagamentos</h2><p style="color:var(--text-muted);margin-bottom:2rem;">Gerencie seus métodos de pagamento</p></div>
                <div style="border:1px solid #eee;border-radius:8px;padding:20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
                    <div style="display:flex;align-items:center;gap:15px;">
                        <i class="fab fa-cc-visa" style="font-size:2rem;color:#1a237e;"></i>
                        <div>
                            <h4 style="margin:0;color:var(--text-dark);">Visa terminando em 4242</h4>
                            <p style="margin:4px 0 0 0;color:var(--text-muted);font-size:0.9rem;">Expira em 12/28</p>
                        </div>
                    </div>
                    <i class="fas fa-ellipsis-v" style="color:#ccc;cursor:pointer;"></i>
                </div>
                <button id="btnAddCard" style="background:transparent;border:1px dashed #ccc;color:var(--text-muted);width:100%;padding:20px;border-radius:8px;cursor:pointer;font-weight:500;display:flex;align-items:center;justify-content:center;gap:10px;transition:0.2s;">
                    <i class="fas fa-plus"></i> Adicionar novo método de pagamento
                </button>
            `;
            document.getElementById('btnAddCard')?.addEventListener('click', () => {
                showToast('Integração de pagamento será implementada com backend.', 'info');
            });
            break;

        case 'notifications':
            tabContent.innerHTML = `
                <div><h2 style="font-size:1.5rem;color:var(--text-dark);margin:0 0 0.5rem 0;">Notificações</h2><p style="color:var(--text-muted);margin-bottom:2rem;">Gerencie como você recebe atualizações</p></div>
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <div><h4 style="margin:0 0 5px 0;color:var(--text-dark);">Atualizações por E-mail</h4><p style="margin:0;color:var(--text-muted);font-size:0.9rem;">Receba novidades e atualizações sobre sua conta.</p></div>
                        <label style="position:relative;display:inline-block;width:48px;height:24px;">
                            <input type="checkbox" class="notification-toggle" data-key="emailUpdates" ${settings.emailUpdates ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                            <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${settings.emailUpdates ? 'var(--primary-color)' : '#ccc'};transition:.4s;border-radius:24px;"></span>
                            <span style="position:absolute;content:'';height:18px;width:18px;left:${settings.emailUpdates ? '27px' : '3px'};bottom:3px;background:white;transition:.4s;border-radius:50%;"></span>
                        </label>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <div><h4 style="margin:0 0 5px 0;color:var(--text-dark);">Lembretes SMS</h4><p style="margin:0;color:var(--text-muted);font-size:0.9rem;">Seja notificado sobre agendamentos via SMS.</p></div>
                        <label style="position:relative;display:inline-block;width:48px;height:24px;">
                            <input type="checkbox" class="notification-toggle" data-key="smsReminders" ${settings.smsReminders ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                            <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${settings.smsReminders ? 'var(--primary-color)' : '#ccc'};transition:.4s;border-radius:24px;"></span>
                            <span style="position:absolute;content:'';height:18px;width:18px;left:${settings.smsReminders ? '27px' : '3px'};bottom:3px;background:white;transition:.4s;border-radius:50%;"></span>
                        </label>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0;border-bottom:1px solid #eee;">
                        <div><h4 style="margin:0 0 5px 0;color:var(--text-dark);">Promoções e Ofertas</h4><p style="margin:0;color:var(--text-muted);font-size:0.9rem;">Receba ofertas exclusivas de parceiros.</p></div>
                        <label style="position:relative;display:inline-block;width:48px;height:24px;">
                            <input type="checkbox" class="notification-toggle" data-key="promos" ${settings.promos ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                            <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:${settings.promos ? 'var(--primary-color)' : '#ccc'};transition:.4s;border-radius:24px;"></span>
                            <span style="position:absolute;content:'';height:18px;width:18px;left:${settings.promos ? '27px' : '3px'};bottom:3px;background:white;transition:.4s;border-radius:50%;"></span>
                        </label>
                    </div>
                </div>
            `;
            document.querySelectorAll('.notification-toggle').forEach(toggle => {
                toggle.addEventListener('change', (e) => {
                    const key = e.target.dataset.key;
                    const current = getItem(KEYS.SETTINGS) || { emailUpdates: true, smsReminders: false, promos: true };
                    current[key] = e.target.checked;
                    saveItem(KEYS.SETTINGS, current);
                    showToast('Preferência salva.', 'success');
                    renderTab('notifications');
                });
            });
            break;
    }
}

function bindEvents() {
    // Tab navigation
    document.getElementById('settingsMenu')?.addEventListener('click', (e) => {
        const tab = e.target.closest('.settings-tab');
        if (tab && tab.dataset.tab) {
            renderTab(tab.dataset.tab);
        }
    });

    // Email modal
    document.getElementById('btnCancelEmail')?.addEventListener('click', () => closeModal('email'));
    document.getElementById('btnSaveEmail')?.addEventListener('click', handleEmailSave);

    // Password modal
    document.getElementById('btnCancelPassword')?.addEventListener('click', () => closeModal('password'));
    document.getElementById('btnSavePassword')?.addEventListener('click', handlePasswordSave);

    // Phone modal
    document.getElementById('btnCancelPhone')?.addEventListener('click', () => closeModal('phone'));
    document.getElementById('btnSavePhone')?.addEventListener('click', handlePhoneSave);
}

function handleProfileSave(e) {
    e.preventDefault();
    const firstName = document.getElementById('profileFirstName').value.trim();
    const lastName = document.getElementById('profileLastName').value.trim();

    if (!firstName) {
        showToast('Informe o primeiro nome.', 'error');
        return;
    }

    const user = getCurrentUser();
    const updated = { ...user, firstName, lastName, name: `${firstName} ${lastName}`.trim() };

    // Update in users collection
    updateInCollection(KEYS.USERS, user.id, { firstName, lastName, name: updated.name });

    // Update session
    setCurrentUser(updated);
    showToast('Perfil atualizado!', 'success');
}

function handleEmailSave() {
    const newEmail = document.getElementById('newEmail').value.trim();
    const confirmEmail = document.getElementById('confirmNewEmail').value.trim();

    if (!newEmail || !confirmEmail) {
        showToast('Preencha ambos os campos.', 'error');
        return;
    }
    if (newEmail !== confirmEmail) {
        showToast('Os emails não coincidem.', 'error');
        return;
    }

    const user = getCurrentUser();
    updateInCollection(KEYS.USERS, user.id, { email: newEmail });
    setCurrentUser({ ...user, email: newEmail });

    closeModal('email');
    showToast('Email atualizado!', 'success');
    renderTab('security');
}

function handlePasswordSave() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewPassword').value;

    if (!newPass || newPass.length < 6) {
        showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
        return;
    }
    if (newPass !== confirmPass) {
        showToast('As senhas não coincidem.', 'error');
        return;
    }

    const user = getCurrentUser();
    updateInCollection(KEYS.USERS, user.id, { password: newPass });

    closeModal('password');
    showToast('Senha atualizada!', 'success');
}

function handlePhoneSave() {
    const newPhone = document.getElementById('newPhone').value.trim();

    if (!newPhone || newPhone.replace(/\D/g, '').length < 10) {
        showToast('Informe um telefone válido.', 'error');
        return;
    }

    const user = getCurrentUser();
    updateInCollection(KEYS.USERS, user.id, { phone: newPhone });
    setCurrentUser({ ...user, phone: newPhone });

    closeModal('phone');
    showToast('Telefone atualizado!', 'success');
    renderTab('security');
}

/**
 * Professional Profile Page
 * Meu perfil
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';

let profile = null;
let isLoading = false;
let isSaving = false;

export function render() {
    renderShell('professional-profile');
}

export async function init() {
    await loadProfile();
    renderContent();
    attachEventListeners();
    
    return () => {
        profile = null;
    };
}

async function loadProfile() {
    isLoading = true;
    renderContent();

    try {
        const response = await api.get('/professional/profile');
        profile = response.data;
    } catch (error) {
        console.error('[Professional Profile] Error loading:', error);
        showToast('Erro ao carregar perfil', 'error');
        profile = null;
    } finally {
        isLoading = false;
    }
}

async function saveProfile(event) {
    event.preventDefault();
    
    if (isSaving) return;
    isSaving = true;

    const formData = {
        phone: document.getElementById('phone')?.value || '',
        avatar: document.getElementById('avatar')?.value || '',
    };

    try {
        const response = await api.put('/professional/profile', formData);
        profile = response.data;
        showToast('Perfil atualizado com sucesso!', 'success');
        renderContent();
        attachEventListeners();
    } catch (error) {
        console.error('[Professional Profile] Error saving:', error);
        showToast(error.message || 'Erro ao atualizar perfil', 'error');
    } finally {
        isSaving = false;
    }
}

function renderContent() {
    const content = getContentArea();
    if (!content) return;

    if (isLoading) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
        return;
    }

    if (!profile) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar perfil</p>
            </div>
        `;
        return;
    }

    const user = profile.user || {};
    const establishment = profile.establishment || {};

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Meu Perfil</h1>
        </div>

        <div class="profile-container">
            <!-- Informações pessoais -->
            <div class="card">
                <div class="card-header">
                    <h2>Informações Pessoais</h2>
                </div>
                <div class="card-body">
                    <div class="profile-avatar">
                        ${user.avatar ? `
                            <img src="${user.avatar}" alt="${user.first_name}" class="avatar-image">
                        ` : `
                            <div class="avatar-placeholder">
                                <i class="fas fa-user"></i>
                            </div>
                        `}
                    </div>

                    <form id="profileForm" class="profile-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Nome</label>
                                <input type="text" class="form-input" value="${user.first_name || ''} ${user.last_name || ''}" disabled>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Email</label>
                                <input type="email" class="form-input" value="${user.email || ''}" disabled>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Telefone *</label>
                                <input type="tel" id="phone" class="form-input" value="${user.phone || ''}" placeholder="(00) 00000-0000">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>URL Avatar</label>
                                <input type="url" id="avatar" class="form-input" value="${user.avatar || ''}" placeholder="https://...">
                                <small style="color:#666;">Cole a URL de uma imagem para usar como avatar</small>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn-primary" ${isSaving ? 'disabled' : ''}>
                                ${isSaving ? '<div class="spinner spinner-sm"></div>' : '<i class="fas fa-save"></i> Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Informações profissionais -->
            <div class="card">
                <div class="card-header">
                    <h2>Informações Profissionais</h2>
                </div>
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Estabelecimento</label>
                            <p>${establishment.name || 'N/A'}</p>
                        </div>

                        <div class="info-item">
                            <label>Especialidade</label>
                            <p>${profile.specialty || 'Não definida'}</p>
                        </div>

                        <div class="info-item">
                            <label>Taxa de Comissão</label>
                            <p>${parseFloat(profile.commission_rate || 0).toFixed(1)}%</p>
                        </div>

                        <div class="info-item">
                            <label>Telefone Estabelecimento</label>
                            <p>${establishment.phone || 'N/A'}</p>
                        </div>

                        <div class="info-item" style="grid-column: 1 / -1;">
                            <label>Endereço Estabelecimento</label>
                            <p>${establishment.address || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="info-note">
                        <i class="fas fa-info-circle"></i>
                        <p>Para alterar informações profissionais (especialidade, comissão), entre em contato com o administrador.</p>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .profile-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 1.5rem;
                margin-top: 1.5rem;
            }

            .profile-avatar {
                display: flex;
                justify-content: center;
                margin-bottom: 2rem;
            }

            .avatar-image {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                object-fit: cover;
                border: 4px solid #f0f0f0;
            }

            .avatar-placeholder {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: #f0f0f0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 3rem;
                color: #999;
            }

            .profile-form {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            .form-row {
                display: grid;
                gap: 1rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .form-group label {
                font-weight: 500;
                color: #333;
            }

            .form-input {
                padding: 0.75rem;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 1rem;
            }

            .form-input:disabled {
                background: #f5f5f5;
                color: #666;
                cursor: not-allowed;
            }

            .form-actions {
                margin-top: 1rem;
            }

            .info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1.5rem;
            }

            .info-item label {
                display: block;
                font-weight: 500;
                color: #666;
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }

            .info-item p {
                margin: 0;
                color: #333;
                font-size: 1rem;
            }

            .info-note {
                margin-top: 1.5rem;
                padding: 1rem;
                background: #E3F2FD;
                border-left: 4px solid #2196F3;
                border-radius: 4px;
                display: flex;
                gap: 0.75rem;
                align-items: start;
            }

            .info-note i {
                color: #2196F3;
                margin-top: 0.25rem;
            }

            .info-note p {
                margin: 0;
                color: #1565C0;
                font-size: 0.9rem;
            }
        </style>
    `;
}

function attachEventListeners() {
    const profileForm = document.getElementById('profileForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
    }
}

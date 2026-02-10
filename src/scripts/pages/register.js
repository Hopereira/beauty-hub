/**
 * Register Page Module
 */

import { handleRegister } from '../auth.js';
import { navigateTo } from '../router.js';
import { showToast } from '../utils/toast.js';

let currentRole = '';

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container" style="display:flex;width:100%;height:100vh;">
            <main class="login-section" style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--white);padding:2rem;overflow-y:auto;">
                <div class="login-box" style="width:100%;max-width:650px;">
                    <header class="logo-container" style="display:flex;align-items:center;gap:10px;margin-bottom:3rem;color:var(--primary-color);">
                        <span class="brand-name" style="font-size:1.5rem;font-weight:700;letter-spacing:1px;">BEAUTY HUB</span>
                    </header>

                    <div id="roleSelectionStep">
                        <h1 style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-dark);">Selecione seu Perfil</h1>
                        <p style="color:var(--text-muted);margin-bottom:2rem;">Como você deseja usar o Beauty Hub?</p>

                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem;margin-bottom:2rem;" id="roleCards">
                            <div class="role-card" data-role="estabelecimento" style="background:white;border:2px solid #e0e0e0;border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.3s;">
                                <i class="fas fa-store" style="font-size:2rem;color:var(--primary-color);margin-bottom:1rem;display:block;"></i>
                                <h3 style="font-size:1rem;margin:0;color:var(--text-dark);">Estabelecimento</h3>
                                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:5px;">Dono de Salão</p>
                            </div>
                            <div class="role-card" data-role="profissional" style="background:white;border:2px solid #e0e0e0;border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.3s;">
                                <i class="fas fa-cut" style="font-size:2rem;color:var(--primary-color);margin-bottom:1rem;display:block;"></i>
                                <h3 style="font-size:1rem;margin:0;color:var(--text-dark);">Profissional</h3>
                                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:5px;">Especialista</p>
                            </div>
                            <div class="role-card" data-role="cliente" style="background:white;border:2px solid #e0e0e0;border-radius:12px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.3s;">
                                <i class="fas fa-user" style="font-size:2rem;color:var(--primary-color);margin-bottom:1rem;display:block;"></i>
                                <h3 style="font-size:1rem;margin:0;color:var(--text-dark);">Cliente</h3>
                                <p style="font-size:0.8rem;color:var(--text-muted);margin-top:5px;">Para Agendar</p>
                            </div>
                        </div>

                        <p style="text-align:center;font-size:0.9rem;color:var(--text-muted);">
                            Já tem uma conta? <a href="/login" style="color:var(--text-dark);font-weight:700;text-decoration:none;">Fazer Login</a>
                        </p>
                    </div>

                    <form id="registerForm" style="display:none;">
                        <h1 id="formTitle" style="font-size:2rem;font-weight:700;margin-bottom:0.5rem;color:var(--text-dark);">Cadastro</h1>
                        <a href="#" id="backToRoles" style="font-size:0.9rem;color:var(--text-muted);margin-bottom:1.5rem;display:block;">&larr; Voltar para seleção</a>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="reg-name" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Nome Completo</label>
                            <input type="text" id="reg-name" name="name" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                        </div>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="reg-email" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Email</label>
                            <input type="email" id="reg-email" name="email" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                        </div>

                        <div id="estabelecimentoFields" style="display:none;">
                            <div class="input-group" style="margin-bottom:1.5rem;">
                                <label for="salonName" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Nome do Salão</label>
                                <input type="text" id="salonName" placeholder="Ex: Studio Bella"
                                    style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                            </div>
                            <div class="input-group" style="margin-bottom:1.5rem;">
                                <label for="cnpj" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">CNPJ (Opcional)</label>
                                <input type="text" id="cnpj"
                                    style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                            </div>
                        </div>

                        <div id="profissionalFields" style="display:none;">
                            <div class="input-group" style="margin-bottom:1.5rem;">
                                <label for="specialty" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Especialidade</label>
                                <input type="text" id="specialty" placeholder="Ex: Cabelo, Manicure, Maquiagem"
                                    style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                            </div>
                        </div>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="reg-password" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Senha</label>
                            <input type="password" id="reg-password" name="password" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                        </div>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="reg-confirm" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Confirmar Senha</label>
                            <input type="password" id="reg-confirm" name="confirmPassword" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;">
                        </div>

                        <button type="submit" style="
                            width:100%;padding:14px;background:var(--primary-color);color:white;border:none;
                            border-radius:50px;font-size:0.9rem;font-weight:600;cursor:pointer;
                            transition:background 0.3s,transform 0.2s;margin-bottom:1.5rem;text-transform:uppercase;
                        ">Criar Conta</button>

                        <p style="text-align:center;font-size:0.9rem;color:var(--text-muted);">
                            Já tem uma conta? <a href="/login" style="color:var(--text-dark);font-weight:700;text-decoration:none;">Fazer Login</a>
                        </p>
                    </form>
                </div>
            </main>

            <aside class="brand-section" style="flex:1.2;background:var(--primary-color);display:flex;align-items:center;justify-content:center;">
                <div style="text-align:center;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:2rem;">
                        <div style="width:280px;height:280px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,0.15);">
                            <img src="/src/assets/logos/logo.png" alt="Beauty Hub Logo" style="width:200px;height:auto;" onerror="this.style.display='none'">
                        </div>
                        <div style="background:white;color:var(--primary-color);padding:12px 40px;border-radius:50px;font-weight:800;font-size:1.8rem;letter-spacing:2px;">
                            BEAUTY HUB
                        </div>
                        <div id="dynamicRoleText" style="color:white;font-weight:500;letter-spacing:1px;">
                            PLATAFORMA DE GESTÃO
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    `;
}

export function init() {
    currentRole = '';

    // Role card selection
    const roleCards = document.getElementById('roleCards');
    if (roleCards) {
        roleCards.addEventListener('click', (e) => {
            const card = e.target.closest('[data-role]');
            if (card) selectRole(card.dataset.role);
        });
    }

    // Back to roles
    const backBtn = document.getElementById('backToRoles');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            goBack();
        });
    }

    // Form submit
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    return () => {
        currentRole = '';
    };
}

function selectRole(role) {
    currentRole = role;

    document.getElementById('roleSelectionStep').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';

    document.getElementById('estabelecimentoFields').style.display = 'none';
    document.getElementById('profissionalFields').style.display = 'none';

    const title = document.getElementById('formTitle');
    const sideText = document.getElementById('dynamicRoleText');

    if (role === 'estabelecimento') {
        document.getElementById('estabelecimentoFields').style.display = 'block';
        title.innerText = 'Cadastro de Estabelecimento';
        if (sideText) sideText.innerText = 'GESTÃO PARA SEU SALÃO';
    } else if (role === 'profissional') {
        document.getElementById('profissionalFields').style.display = 'block';
        title.innerText = 'Cadastro de Profissional';
        if (sideText) sideText.innerText = 'ÁREA DO PROFISSIONAL';
    } else if (role === 'cliente') {
        title.innerText = 'Cadastro de Cliente';
        if (sideText) sideText.innerText = 'AGENDAMENTO ONLINE';
    }
}

function goBack() {
    document.getElementById('roleSelectionStep').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    const sideText = document.getElementById('dynamicRoleText');
    if (sideText) sideText.innerText = 'PLATAFORMA DE GESTÃO';
    currentRole = '';
}

function handleSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        confirmPassword: document.getElementById('reg-confirm').value,
        role: currentRole,
        salonName: document.getElementById('salonName')?.value.trim() || '',
        cnpj: document.getElementById('cnpj')?.value.trim() || '',
        specialty: document.getElementById('specialty')?.value.trim() || '',
    };

    const result = handleRegister(data);

    if (result.success) {
        showToast('Conta criada com sucesso! Faça login.', 'success');
        navigateTo('/login');
    } else {
        showToast(result.message, 'error');
    }
}

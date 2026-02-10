/**
 * Login Page Module
 */

import { handleLogin } from '../../../core/auth.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';
import { validateForm, validateRequired, validateEmail } from '../../../shared/utils/validation.js';

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container" style="display:flex;width:100%;height:100vh;">
            <main class="login-section" style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--white);padding:2rem;">
                <div class="login-box" style="width:100%;max-width:400px;">
                    <header class="logo-container" style="display:flex;align-items:center;gap:10px;margin-bottom:3rem;color:var(--primary-color);">
                        <span class="brand-name" style="font-size:1.5rem;font-weight:700;letter-spacing:1px;">BEAUTY HUB</span>
                    </header>

                    <form class="login-form" id="loginForm">
                        <h1 style="font-size:2rem;font-weight:700;margin-bottom:2rem;color:var(--text-dark);">Entrar</h1>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="email" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Email</label>
                            <input type="email" id="email" name="email" placeholder="seu@email.com" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;transition:border-color 0.3s,box-shadow 0.3s;">
                        </div>

                        <div class="input-group" style="margin-bottom:1.5rem;">
                            <label for="password" style="display:block;margin-bottom:0.5rem;font-size:0.85rem;font-weight:600;color:var(--text-dark);">Senha</label>
                            <input type="password" id="password" name="password" required
                                style="width:100%;padding:12px 16px;border:1px solid var(--input-border);border-radius:8px;background:var(--input-bg);font-size:0.95rem;transition:border-color 0.3s,box-shadow 0.3s;">
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;font-size:0.85rem;">
                            <label style="display:flex;align-items:center;cursor:pointer;font-weight:500;">
                                <input type="checkbox" checked style="margin-right:8px;">
                                Lembrar acesso
                            </label>
                            <a href="#" style="color:var(--text-dark);text-decoration:none;font-weight:500;">Esqueceu sua senha?</a>
                        </div>

                        <button type="submit" class="btn-primary" style="
                            width:100%;padding:14px;background:var(--primary-color);color:white;border:none;
                            border-radius:50px;font-size:0.9rem;font-weight:600;cursor:pointer;
                            transition:background 0.3s,transform 0.2s;margin-bottom:1.5rem;text-transform:uppercase;
                        ">Entrar</button>

                        <p style="text-align:center;font-size:0.9rem;color:var(--text-muted);">
                            Não tem uma conta? <a href="/register" style="color:var(--text-dark);font-weight:700;text-decoration:none;">Cadastre-se</a>
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
                        <div style="background:white;color:var(--primary-color);padding:12px 40px;border-radius:50px;font-weight:800;font-size:1.8rem;letter-spacing:2px;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
                            BEAUTY HUB
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    `;
}

export function init() {
    const form = document.getElementById('loginForm');
    if (!form) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        const result = handleLogin(email, password);

        if (result.success) {
            showToast('Login realizado com sucesso!', 'success');
            const role = result.user.role;
            navigateTo('/dashboard');
        } else {
            showToast(result.message, 'error');
        }
    };

    form.addEventListener('submit', handleSubmit);

    return () => {
        form.removeEventListener('submit', handleSubmit);
    };
}

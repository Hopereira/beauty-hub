/**
 * Landing Page - BeautyHub
 * Página de vendas pública com planos dinâmicos e cadastro de clientes
 */

import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { showToast } from '../../../shared/utils/toast.js';

let plans = [];
let selectedPlan = null;

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
        <div class="landing-page">
            <!-- Hero Section -->
            <section class="hero-section">
                <div class="hero-content">
                    <div class="hero-text">
                        <h1 class="hero-title">
                            Transforme seu Salão de Beleza com Tecnologia
                        </h1>
                        <p class="hero-subtitle">
                            Sistema completo de gestão para salões, clínicas de estética e profissionais da beleza. 
                            Agende, gerencie e cresça seu negócio com facilidade.
                        </p>
                        <div class="hero-cta">
                            <button class="btn-primary-large" onclick="document.getElementById('pricing').scrollIntoView({behavior: 'smooth'})">
                                Ver Planos e Preços
                            </button>
                            <button class="btn-secondary-large" onclick="document.getElementById('features').scrollIntoView({behavior: 'smooth'})">
                                Conhecer Funcionalidades
                            </button>
                        </div>
                    </div>
                    <div class="hero-image">
                        <div class="hero-mockup">
                            <i class="fas fa-calendar-check" style="font-size: 8rem; color: #14b8a6;"></i>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Features Section -->
            <section id="features" class="features-section">
                <div class="section-header">
                    <h2>Tudo que você precisa em um só lugar</h2>
                    <p>Funcionalidades completas para gerenciar seu negócio de beleza</p>
                </div>
                <div class="features-grid">
                    ${renderFeatures()}
                </div>
            </section>

            <!-- Pricing Section -->
            <section id="pricing" class="pricing-section">
                <div class="section-header">
                    <h2>Planos que cabem no seu bolso</h2>
                    <p>Escolha o plano ideal para o seu negócio</p>
                </div>
                <div id="plansContainer" class="plans-grid">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i> Carregando planos...
                    </div>
                </div>
            </section>

            <!-- CTA Section -->
            <section class="cta-section">
                <div class="cta-content">
                    <h2>Pronto para começar?</h2>
                    <p>Crie sua conta agora e comece a transformar seu negócio</p>
                    <button class="btn-primary-large" id="btnStartNow">
                        Começar Agora - Grátis
                    </button>
                </div>
            </section>

            <!-- Registration Modal -->
            <div class="modal-overlay" id="modal-register" style="display: none;">
                <div class="modal" style="max-width: 900px;">
                    <div class="modal-header">
                        <h3>Criar Minha Conta</h3>
                        <button class="modal-close" onclick="closeRegistrationModal()">&times;</button>
                    </div>
                    <form id="registrationForm">
                        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                            ${renderRegistrationForm()}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" onclick="closeRegistrationModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Criar Conta e Começar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

export async function init() {
    await loadPlans();
    renderPlansSection();
    bindEvents();
    
    return () => {
        plans = [];
        selectedPlan = null;
    };
}

async function loadPlans() {
    try {
        // Buscar planos públicos (sem autenticação)
        const res = await fetch('http://localhost:5001/api/public/plans');
        const data = await res.json();
        plans = data.data || [];
    } catch (error) {
        console.error('[Landing] Error loading plans:', error);
        plans = [];
    }
}

function renderFeatures() {
    const features = [
        {
            icon: 'fa-calendar-check',
            title: 'Agendamentos Inteligentes',
            description: 'Sistema completo de agendamento online com confirmações automáticas e lembretes'
        },
        {
            icon: 'fa-users',
            title: 'Gestão de Clientes',
            description: 'Cadastro completo, histórico de atendimentos e preferências dos clientes'
        },
        {
            icon: 'fa-money-bill-wave',
            title: 'Controle Financeiro',
            description: 'Gestão de receitas, despesas, comissões e relatórios financeiros'
        },
        {
            icon: 'fa-chart-line',
            title: 'Relatórios e Analytics',
            description: 'Dashboards intuitivos com métricas do seu negócio em tempo real'
        },
        {
            icon: 'fa-user-tie',
            title: 'Gestão de Profissionais',
            description: 'Controle de agenda, comissões e desempenho de cada profissional'
        },
        {
            icon: 'fa-box',
            title: 'Controle de Estoque',
            description: 'Gerencie produtos, fornecedores e compras em um só lugar'
        },
        {
            icon: 'fa-bell',
            title: 'Notificações Automáticas',
            description: 'Lembretes por WhatsApp, SMS e email para você e seus clientes'
        },
        {
            icon: 'fa-mobile-alt',
            title: 'Acesso Mobile',
            description: 'Gerencie seu negócio de qualquer lugar, a qualquer hora'
        }
    ];

    return features.map(f => `
        <div class="feature-card">
            <div class="feature-icon">
                <i class="fas ${f.icon}"></i>
            </div>
            <h3>${f.title}</h3>
            <p>${f.description}</p>
        </div>
    `).join('');
}

function renderPlansSection() {
    const container = document.getElementById('plansContainer');
    if (!container) return;

    if (plans.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>Não foi possível carregar os planos. Tente novamente mais tarde.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = plans.map(plan => {
        const price = plan.pricing?.monthly || 0;
        const features = plan.features || [];
        const isPopular = plan.metadata?.popular || false;

        return `
            <div class="plan-card ${isPopular ? 'popular' : ''}">
                ${isPopular ? '<div class="plan-badge">Mais Popular</div>' : ''}
                <div class="plan-header">
                    <h3>${plan.name}</h3>
                    <p class="plan-description">${plan.description || ''}</p>
                    <div class="plan-price">
                        <span class="price-value">${formatCurrency(price)}</span>
                        <span class="price-period">/mês</span>
                    </div>
                    ${plan.trial_days > 0 ? `<p class="plan-trial">${plan.trial_days} dias grátis</p>` : ''}
                </div>
                <div class="plan-features">
                    <ul>
                        ${features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                    </ul>
                </div>
                <button class="btn-plan-select" data-plan-id="${plan.id}">
                    Escolher ${plan.name}
                </button>
            </div>
        `;
    }).join('');

    // Bind click events to plan buttons
    document.querySelectorAll('.btn-plan-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planId = e.target.dataset.planId;
            selectedPlan = plans.find(p => p.id === planId);
            openRegistrationModal();
        });
    });
}

function renderRegistrationForm() {
    return `
        <div class="registration-steps">
            <!-- Step 1: Tipo de Cadastro -->
            <div class="form-section">
                <h4>Tipo de Cadastro</h4>
                <div class="radio-group">
                    <label class="radio-card">
                        <input type="radio" name="accountType" value="establishment" checked>
                        <div class="radio-content">
                            <i class="fas fa-store"></i>
                            <div>
                                <strong>Estabelecimento</strong>
                                <p>Salão, clínica ou spa</p>
                            </div>
                        </div>
                    </label>
                    <label class="radio-card">
                        <input type="radio" name="accountType" value="professional">
                        <div class="radio-content">
                            <i class="fas fa-user-tie"></i>
                            <div>
                                <strong>Profissional Autônomo</strong>
                                <p>Trabalho individual</p>
                            </div>
                        </div>
                    </label>
                </div>
            </div>

            <!-- Step 2: Dados do Negócio -->
            <div class="form-section" id="establishmentFields">
                <h4>Dados do Estabelecimento</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome do Estabelecimento *</label>
                        <input type="text" id="businessName" required placeholder="Salão Beleza Pura">
                    </div>
                    <div class="form-group">
                        <label>CNPJ *</label>
                        <input type="text" id="cnpj" required placeholder="00.000.000/0000-00">
                    </div>
                    <div class="form-group">
                        <label>Telefone *</label>
                        <input type="tel" id="businessPhone" required placeholder="(11) 99999-9999">
                    </div>
                    <div class="form-group">
                        <label>Email do Negócio *</label>
                        <input type="email" id="businessEmail" required placeholder="contato@salaobel ezapura.com.br">
                    </div>
                </div>
            </div>

            <!-- Step 3: Endereço -->
            <div class="form-section">
                <h4>Endereço</h4>
                <div class="form-grid">
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>CEP *</label>
                        <input type="text" id="cep" required placeholder="00000-000">
                    </div>
                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label>Rua *</label>
                        <input type="text" id="street" required placeholder="Rua das Flores">
                    </div>
                    <div class="form-group">
                        <label>Número *</label>
                        <input type="text" id="number" required placeholder="123">
                    </div>
                    <div class="form-group">
                        <label>Complemento</label>
                        <input type="text" id="complement" placeholder="Sala 1">
                    </div>
                    <div class="form-group">
                        <label>Bairro *</label>
                        <input type="text" id="neighborhood" required placeholder="Centro">
                    </div>
                    <div class="form-group">
                        <label>Cidade *</label>
                        <input type="text" id="city" required placeholder="São Paulo">
                    </div>
                    <div class="form-group">
                        <label>Estado *</label>
                        <select id="state" required>
                            <option value="">Selecione</option>
                            <option value="SP">São Paulo</option>
                            <option value="RJ">Rio de Janeiro</option>
                            <option value="MG">Minas Gerais</option>
                            <!-- Adicionar outros estados -->
                        </select>
                    </div>
                </div>
            </div>

            <!-- Step 4: Dados do Responsável -->
            <div class="form-section">
                <h4>Dados do Responsável</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome Completo *</label>
                        <input type="text" id="ownerName" required placeholder="João Silva">
                    </div>
                    <div class="form-group">
                        <label>CPF *</label>
                        <input type="text" id="cpf" required placeholder="000.000.000-00">
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="ownerEmail" required placeholder="joao@email.com">
                    </div>
                    <div class="form-group">
                        <label>Telefone *</label>
                        <input type="tel" id="ownerPhone" required placeholder="(11) 99999-9999">
                    </div>
                    <div class="form-group">
                        <label>Senha *</label>
                        <input type="password" id="password" required placeholder="Mínimo 6 caracteres">
                    </div>
                    <div class="form-group">
                        <label>Confirmar Senha *</label>
                        <input type="password" id="confirmPassword" required placeholder="Digite a senha novamente">
                    </div>
                </div>
            </div>

            <!-- Step 5: Plano Selecionado -->
            <div class="form-section">
                <h4>Plano Selecionado</h4>
                <div id="selectedPlanInfo" class="selected-plan-info">
                    ${selectedPlan ? `
                        <div class="plan-summary">
                            <div>
                                <strong>${selectedPlan.name}</strong>
                                <p>${selectedPlan.description}</p>
                            </div>
                            <div class="plan-summary-price">
                                ${formatCurrency(selectedPlan.pricing?.monthly || 0)}/mês
                            </div>
                        </div>
                    ` : '<p>Nenhum plano selecionado</p>'}
                </div>
            </div>

            <!-- Terms -->
            <div class="form-section">
                <label class="checkbox-label">
                    <input type="checkbox" id="acceptTerms" required>
                    Aceito os <a href="#" target="_blank">Termos de Uso</a> e a <a href="#" target="_blank">Política de Privacidade</a>
                </label>
            </div>
        </div>
    `;
}

function bindEvents() {
    // Start Now button
    document.getElementById('btnStartNow')?.addEventListener('click', () => {
        if (plans.length > 0) {
            selectedPlan = plans[0]; // Default to first plan
        }
        openRegistrationModal();
    });

    // Account type change
    document.addEventListener('change', (e) => {
        if (e.target.name === 'accountType') {
            const establishmentFields = document.getElementById('establishmentFields');
            if (establishmentFields) {
                establishmentFields.style.display = e.target.value === 'establishment' ? 'block' : 'none';
            }
        }
    });

    // Registration form submit
    document.getElementById('registrationForm')?.addEventListener('submit', handleRegistration);
}

function openRegistrationModal() {
    const modal = document.getElementById('modal-register');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Re-render form with selected plan
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = renderRegistrationForm();
        }
    }
}

window.closeRegistrationModal = function() {
    const modal = document.getElementById('modal-register');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

async function handleRegistration(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando conta...';

    // Validar senha
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showToast('As senhas não coincidem', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta e Começar';
        return;
    }

    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    
    const data = {
        accountType,
        business: {
            name: document.getElementById('businessName')?.value,
            cnpj: document.getElementById('cnpj')?.value,
            phone: document.getElementById('businessPhone')?.value,
            email: document.getElementById('businessEmail')?.value,
        },
        address: {
            cep: document.getElementById('cep').value,
            street: document.getElementById('street').value,
            number: document.getElementById('number').value,
            complement: document.getElementById('complement')?.value || '',
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
        },
        owner: {
            name: document.getElementById('ownerName').value,
            cpf: document.getElementById('cpf').value,
            email: document.getElementById('ownerEmail').value,
            phone: document.getElementById('ownerPhone').value,
            password: password,
        },
        planId: selectedPlan?.id || null,
    };

    try {
        const response = await fetch('http://localhost:5001/api/public/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
            showToast('Conta criada com sucesso! Redirecionando...', 'success');
            
            // Redirecionar para login com o slug do tenant
            setTimeout(() => {
                window.location.href = `/${result.data.tenantSlug}/login`;
            }, 2000);
        } else {
            throw new Error(result.message || 'Erro ao criar conta');
        }
    } catch (error) {
        console.error('[Landing] Registration error:', error);
        showToast(error.message || 'Erro ao criar conta. Tente novamente.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta e Começar';
    }
}

/**
 * Professional Availability Page
 * Minha disponibilidade (placeholder)
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';

let availability = null;
let isLoading = false;

export function render() {
    renderShell('professional-availability');
}

export async function init() {
    await loadAvailability();
    renderContent();
    
    return () => {
        availability = null;
    };
}

async function loadAvailability() {
    isLoading = true;
    renderContent();

    try {
        const response = await api.get('/professional/availability');
        availability = response.data;
    } catch (error) {
        console.error('[Professional Availability] Error loading:', error);
        showToast('Erro ao carregar disponibilidade', 'error');
        availability = null;
    } finally {
        isLoading = false;
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

    content.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Minha Disponibilidade</h1>
        </div>

        <div class="card">
            <div class="card-body">
                <div class="coming-soon">
                    <i class="fas fa-calendar-alt"></i>
                    <h2>Funcionalidade em Desenvolvimento</h2>
                    <p>A gestão de disponibilidade estará disponível em breve.</p>
                    <p style="color:#666;margin-top:1rem;">
                        ${availability?.note || 'Entre em contato com o administrador para configurar seus horários.'}
                    </p>
                </div>
            </div>
        </div>

        <style>
            .coming-soon {
                text-align: center;
                padding: 4rem 2rem;
                color: #666;
            }

            .coming-soon i {
                font-size: 4rem;
                color: #2196F3;
                margin-bottom: 1.5rem;
            }

            .coming-soon h2 {
                margin: 0 0 1rem;
                color: #333;
            }

            .coming-soon p {
                margin: 0;
                font-size: 1.1rem;
            }
        </style>
    `;
}

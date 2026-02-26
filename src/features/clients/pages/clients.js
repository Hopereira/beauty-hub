/**
 * Clients Page Module
 * Full CRUD for client management with search and pagination
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';
import { isSubscriptionBlocked } from '../../../core/state.js';

let clients = [];
let editingId = null;
let searchTerm = '';
let currentPage = 1;
let isLoading = false;
const PAGE_SIZE = 10;

export function render() {
    renderShell('clients');
}

export async function init() {
    editingId = null;
    searchTerm = '';
    currentPage = 1;
    await loadClients();
    renderPage();
    return () => { 
        editingId = null; 
        clients = [];
    };
}

async function loadClients() {
    isLoading = true;
    const content = getContentArea();
    if (content) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const response = await api.get('/clients');
        clients = response.data || [];
        clients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error('[Clients] Error loading:', error);
        showToast('Erro ao carregar clientes', 'error');
        clients = [];
    } finally {
        isLoading = false;
    }
}

function getFilteredClients() {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').includes(term)
    );
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Clientes</h2>
            <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
                <div style="position:relative;">
                    <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);"></i>
                    <input type="text" id="clientSearch" placeholder="Buscar cliente..." style="padding:10px 12px 10px 36px;border:1px solid #ddd;border-radius:25px;font-size:0.9rem;width:250px;">
                </div>
                <button id="btnAddClient" style="
                    background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:8px;
                    font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;height:44px;white-space:nowrap;
                "><i class="fas fa-plus"></i> Novo cliente</button>
            </div>
        </div>

        <div id="clientsTableContainer" style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;"></div>

        <div id="paginationContainer" style="margin-top:1rem;"></div>

        <!-- Client Modal -->
        <div id="modal-client" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button id="modalCloseClient" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <h2 id="clientModalTitle" style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Novo cliente</h2>
                <form id="clientForm">
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Nome completo *</label>
                        <input type="text" id="clientName" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Telefone *</label>
                        <input type="tel" id="clientPhone" required placeholder="11999990000" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Email</label>
                        <input type="email" id="clientEmail" placeholder="email@exemplo.com" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Endereço</label>
                        <input type="text" id="clientAddress" placeholder="Rua, número, bairro" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelClient" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="flex:2;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:1rem;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-client" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir este cliente?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeleteClient" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeleteClient" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderClientsTable();
    bindEvents();
}

function renderClientsTable() {
    const container = document.getElementById('clientsTableContainer');
    if (!container) return;

    const clients = getFilteredClients();
    const totalPages = Math.ceil(clients.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageClients = clients.slice(start, start + PAGE_SIZE);

    if (clients.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:3rem 1rem;">
                <i class="fas fa-users" style="font-size:3rem;color:#e0e0e0;margin-bottom:1rem;display:block;"></i>
                <h3 style="color:var(--text-muted);margin-bottom:0.5rem;">Nenhum cliente encontrado</h3>
                <p style="color:var(--text-muted);font-size:0.9rem;">Clique em "Novo cliente" para adicionar</p>
            </div>
        `;
        renderPagination(0, 1);
        return;
    }

    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Nome</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Telefone</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Email</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Cadastro</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    pageClients.forEach(c => {
        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            <td style="padding:1rem;font-weight:600;color:var(--text-dark);">${c.name}</td>
            <td style="padding:1rem;color:var(--text-muted);">${c.phone}</td>
            <td style="padding:1rem;color:#2196F3;">${c.email || '-'}</td>
            <td style="padding:1rem;color:var(--text-muted);">${formatDate(c.registrationDate)}</td>
            <td style="padding:1rem;">
                <button class="btn-edit-client" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-delete-client" data-id="${c.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    renderPagination(clients.length, totalPages);
}

function renderPagination(total, totalPages) {
    const container = document.getElementById('paginationContainer');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = `<div style="text-align:center;font-size:0.85rem;color:var(--text-muted);">${total} cliente${total !== 1 ? 's' : ''}</div>`;
        return;
    }

    let html = `<div class="pagination">`;
    html += `<button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    html += `<span class="pagination-info">${total} cliente${total !== 1 ? 's' : ''}</span>`;
    html += `</div>`;

    container.innerHTML = html;

    // Pagination click
    container.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = parseInt(btn.dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderClientsTable();
            }
        });
    });
}

function openClientModal(client = null) {
    if (isSubscriptionBlocked() && !client) {
        showToast('Assinatura inativa. Não é possível criar novos clientes.', 'error');
        return;
    }

    editingId = client ? client.id : null;
    const title = document.getElementById('clientModalTitle');
    if (title) title.textContent = client ? 'Editar cliente' : 'Novo cliente';

    document.getElementById('clientName').value = client?.name || '';
    document.getElementById('clientPhone').value = client?.phone || '';
    document.getElementById('clientEmail').value = client?.email || '';
    document.getElementById('clientAddress').value = client?.address || '';

    openModal('client');
}

function bindEvents() {
    // Search
    let searchTimeout;
    document.getElementById('clientSearch')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchTerm = e.target.value.trim();
            currentPage = 1;
            renderClientsTable();
        }, 300);
    });

    // Add
    document.getElementById('btnAddClient')?.addEventListener('click', () => openClientModal());

    // Close modal
    document.getElementById('modalCloseClient')?.addEventListener('click', () => closeModal('client'));
    document.getElementById('btnCancelClient')?.addEventListener('click', () => closeModal('client'));

    // Form submit
    document.getElementById('clientForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveClient();
    });

    // Edit / Delete delegation
    document.getElementById('clientsTableContainer')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-client');
        const deleteBtn = e.target.closest('.btn-delete-client');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const client = clients.find(c => c.id === id);
            if (client) openClientModal(client);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa. Não é possível excluir clientes.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-client');
        }
    });

    // Delete confirmation
    document.getElementById('btnCancelDeleteClient')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-client');
    });
    document.getElementById('btnConfirmDeleteClient')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/clients/${editingId}`);
                showToast('Cliente excluído.', 'success');
                editingId = null;
                closeModal('delete-client');
                await loadClients();
                renderClientsTable();
            } catch (error) {
                console.error('[Clients] Delete error:', error);
                showToast(error.message || 'Erro ao excluir cliente', 'error');
            }
        }
    });
}

async function saveClient() {
    const submitBtn = document.querySelector('#clientForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Salvar';
    
    const data = {
        name: document.getElementById('clientName').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        email: document.getElementById('clientEmail').value.trim() || undefined,
        address: document.getElementById('clientAddress').value.trim() || undefined,
    };

    if (!data.name || !data.phone) {
        showToast('Preencha nome e telefone.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;margin-right:8px;"></div>Salvando...';
    }

    try {
        if (editingId) {
            await api.put(`/clients/${editingId}`, data);
            showToast('Cliente atualizado!', 'success');
        } else {
            await api.post('/clients', data);
            showToast('Cliente adicionado!', 'success');
        }

        editingId = null;
        closeModal('client');
        await loadClients();
        renderClientsTable();
    } catch (error) {
        console.error('[Clients] Save error:', error);
        showToast(error.message || 'Erro ao salvar cliente', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

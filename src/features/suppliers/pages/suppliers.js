/**
 * Suppliers Page Module
 * Supplier management
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let suppliers = [];
let filters = { search: '' };
let editingSupplier = null;

export function render() {
    renderShell('suppliers');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        suppliers = [];
        editingSupplier = null;
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);

        const res = await api.get(`/suppliers?${params}`);
        suppliers = res.data || [];
    } catch (error) {
        console.error('Error loading suppliers:', error);
        showToast('Erro ao carregar fornecedores', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Fornecedores</h1>
                <p>Gerencie seus fornecedores</p>
            </div>
            <button class="btn btn-primary" id="btnAddSupplier">
                <i class="fas fa-plus"></i> Novo Fornecedor
            </button>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="filters">
                    <input type="text" id="filterSearch" placeholder="Buscar fornecedor..." value="${filters.search}">
                    <button class="btn btn-secondary" id="btnApplyFilters">
                        <i class="fas fa-search"></i> Filtrar
                    </button>
                    <button class="btn btn-secondary" id="btnExportCSV">
                        <i class="fas fa-download"></i> Exportar
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Documento</th>
                            <th>Telefone</th>
                            <th>Email</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderTableRows()}
                    </tbody>
                </table>
            </div>
        </div>

        ${renderSupplierModal()}
    `;

    bindEvents();
}

function renderTableRows() {
    if (suppliers.length === 0) {
        return '<tr><td colspan="5" style="text-align:center;padding:2rem;">Nenhum fornecedor encontrado</td></tr>';
    }

    return suppliers.map(supplier => `
        <tr>
            <td><strong>${supplier.name}</strong></td>
            <td>${supplier.document || '-'}</td>
            <td>${supplier.phone || '-'}</td>
            <td>${supplier.email || '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-secondary btn-edit" data-id="${supplier.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-delete" data-id="${supplier.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderSupplierModal() {
    return `
        <div class="modal-overlay" id="modal-supplier">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="supplierModalTitle">Novo Fornecedor</h3>
                    <button class="modal-close" data-modal="supplier">&times;</button>
                </div>
                <form id="supplierForm">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" id="supplierName" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>CPF/CNPJ</label>
                                <input type="text" id="supplierDocument">
                            </div>
                            <div class="form-group">
                                <label>Telefone</label>
                                <input type="text" id="supplierPhone">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="supplierEmail">
                        </div>
                        <div class="form-group">
                            <label>Endereço</label>
                            <textarea id="supplierAddress" rows="2"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Observações</label>
                            <textarea id="supplierNotes" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-modal="supplier">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('btnAddSupplier')?.addEventListener('click', () => {
        editingSupplier = null;
        document.getElementById('supplierModalTitle').textContent = 'Novo Fornecedor';
        document.getElementById('supplierForm').reset();
        openModal('supplier');
    });

    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.search = document.getElementById('filterSearch').value;
        await loadData();
        renderContent();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editSupplier(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteSupplier(btn.dataset.id));
    });

    document.getElementById('supplierForm')?.addEventListener('submit', handleSupplierSubmit);

    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

async function editSupplier(id) {
    editingSupplier = suppliers.find(s => s.id === id);
    if (!editingSupplier) return;

    document.getElementById('supplierModalTitle').textContent = 'Editar Fornecedor';
    document.getElementById('supplierName').value = editingSupplier.name;
    document.getElementById('supplierDocument').value = editingSupplier.document || '';
    document.getElementById('supplierPhone').value = editingSupplier.phone || '';
    document.getElementById('supplierEmail').value = editingSupplier.email || '';
    document.getElementById('supplierAddress').value = editingSupplier.address || '';
    document.getElementById('supplierNotes').value = editingSupplier.notes || '';

    openModal('supplier');
}

async function handleSupplierSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('supplierName').value,
        document: document.getElementById('supplierDocument').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        address: document.getElementById('supplierAddress').value,
        notes: document.getElementById('supplierNotes').value,
    };

    try {
        if (editingSupplier) {
            await api.put(`/suppliers/${editingSupplier.id}`, data);
            showToast('Fornecedor atualizado!', 'success');
        } else {
            await api.post('/suppliers', data);
            showToast('Fornecedor criado!', 'success');
        }

        closeModal('supplier');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao salvar fornecedor', 'error');
    }
}

async function deleteSupplier(id) {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;

    try {
        await api.delete(`/suppliers/${id}`);
        showToast('Fornecedor excluído!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir fornecedor', 'error');
    }
}

function exportCSV() {
    if (suppliers.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Documento', 'Telefone', 'Email', 'Endereço'];
    const rows = suppliers.map(s => [
        s.name,
        s.document || '',
        s.phone || '',
        s.email || '',
        s.address || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fornecedores_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

/**
 * Purchases Page Module
 * Purchase management with automatic stock update
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let purchases = [];
let suppliers = [];
let products = [];
let filters = { supplier_id: '', payment_status: '' };
let purchaseItems = [];

export function render() {
    renderShell('purchases');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        purchases = [];
        suppliers = [];
        products = [];
        purchaseItems = [];
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
        if (filters.payment_status) params.append('payment_status', filters.payment_status);

        const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
            api.get(`/purchases?${params}`),
            api.get('/suppliers'),
            api.get('/products'),
        ]);

        purchases = purchasesRes.data || [];
        suppliers = suppliersRes.data || [];
        products = productsRes.data || [];
    } catch (error) {
        console.error('Error loading purchases:', error);
        showToast('Erro ao carregar compras', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Compras</h1>
                <p>Registre compras e atualize o estoque automaticamente</p>
            </div>
            <button class="btn btn-primary" id="btnAddPurchase">
                <i class="fas fa-plus"></i> Nova Compra
            </button>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="filters">
                    <select id="filterSupplier">
                        <option value="">Todos fornecedores</option>
                        ${suppliers.map(s => `<option value="${s.id}" ${filters.supplier_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                    <select id="filterStatus">
                        <option value="">Todos status</option>
                        <option value="PENDING" ${filters.payment_status === 'PENDING' ? 'selected' : ''}>Pendente</option>
                        <option value="PAID" ${filters.payment_status === 'PAID' ? 'selected' : ''}>Pago</option>
                        <option value="PARTIAL" ${filters.payment_status === 'PARTIAL' ? 'selected' : ''}>Parcial</option>
                        <option value="CANCELLED" ${filters.payment_status === 'CANCELLED' ? 'selected' : ''}>Cancelado</option>
                    </select>
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
                            <th>Data</th>
                            <th>Fornecedor</th>
                            <th>Itens</th>
                            <th>Total</th>
                            <th>Pagamento</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderTableRows()}
                    </tbody>
                </table>
            </div>
        </div>

        ${renderPurchaseModal()}
    `;

    bindEvents();
}

function renderTableRows() {
    if (purchases.length === 0) {
        return '<tr><td colspan="7" style="text-align:center;padding:2rem;">Nenhuma compra encontrada</td></tr>';
    }

    return purchases.map(purchase => {
        const statusClass = {
            PENDING: 'badge-warning',
            PAID: 'badge-success',
            PARTIAL: 'badge-info',
            CANCELLED: 'badge-danger',
        }[purchase.payment_status] || 'badge-secondary';

        return `
            <tr>
                <td>${formatDate(purchase.purchase_date)}</td>
                <td><strong>${purchase.supplier?.name || '-'}</strong></td>
                <td>${purchase.items?.length || 0} itens</td>
                <td>${formatCurrency(purchase.total_amount)}</td>
                <td>${purchase.payment_method}</td>
                <td><span class="badge ${statusClass}">${purchase.payment_status}</span></td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-secondary btn-view" data-id="${purchase.id}" title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${purchase.id}" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPurchaseModal() {
    return `
        <div class="modal-overlay" id="modal-purchase">
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Nova Compra</h3>
                    <button class="modal-close" data-modal="purchase">&times;</button>
                </div>
                <form id="purchaseForm">
                    <div class="modal-body">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Fornecedor *</label>
                                <select id="purchaseSupplier" required>
                                    <option value="">Selecione</option>
                                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Método de Pagamento *</label>
                                <select id="purchasePaymentMethod" required>
                                    <option value="DINHEIRO">Dinheiro</option>
                                    <option value="DEBITO">Débito</option>
                                    <option value="CREDITO">Crédito</option>
                                    <option value="PIX">PIX</option>
                                    <option value="TRANSFERENCIA">Transferência</option>
                                    <option value="BOLETO">Boleto</option>
                                    <option value="A_PRAZO">A Prazo</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Observações</label>
                            <textarea id="purchaseNotes" rows="2"></textarea>
                        </div>

                        <hr>
                        <h4>Itens da Compra</h4>
                        
                        <div class="form-row">
                            <div class="form-group" style="flex: 2;">
                                <label>Produto</label>
                                <select id="itemProduct">
                                    <option value="">Selecione</option>
                                    ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Quantidade</label>
                                <input type="number" id="itemQuantity" min="1" value="1">
                            </div>
                            <div class="form-group">
                                <label>Custo Unitário</label>
                                <input type="number" id="itemCost" step="0.01" min="0">
                            </div>
                            <div class="form-group" style="align-self: flex-end;">
                                <button type="button" class="btn btn-secondary" id="btnAddItem">
                                    <i class="fas fa-plus"></i> Adicionar
                                </button>
                            </div>
                        </div>

                        <div id="itemsList" style="margin-top: 1rem;">
                            <!-- Items will be rendered here -->
                        </div>

                        <div style="margin-top: 1rem; text-align: right;">
                            <strong>Total: <span id="purchaseTotal">R$ 0,00</span></strong>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-modal="purchase">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Compra</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    document.getElementById('btnAddPurchase')?.addEventListener('click', () => {
        purchaseItems = [];
        document.getElementById('purchaseForm').reset();
        updateItemsList();
        openModal('purchase');
    });

    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.supplier_id = document.getElementById('filterSupplier').value;
        filters.payment_status = document.getElementById('filterStatus').value;
        await loadData();
        renderContent();
    });

    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewPurchase(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deletePurchase(btn.dataset.id));
    });

    document.getElementById('btnAddItem')?.addEventListener('click', addItem);
    document.getElementById('purchaseForm')?.addEventListener('submit', handlePurchaseSubmit);

    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

function addItem() {
    const productId = document.getElementById('itemProduct').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const unitCost = parseFloat(document.getElementById('itemCost').value);

    if (!productId || !quantity || !unitCost) {
        showToast('Preencha todos os campos do item', 'warning');
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    purchaseItems.push({
        product_id: productId,
        product_name: product.name,
        quantity,
        unit_cost: unitCost,
        total_cost: quantity * unitCost,
    });

    document.getElementById('itemProduct').value = '';
    document.getElementById('itemQuantity').value = '1';
    document.getElementById('itemCost').value = '';

    updateItemsList();
}

function updateItemsList() {
    const container = document.getElementById('itemsList');
    if (!container) return;

    if (purchaseItems.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;">Nenhum item adicionado</p>';
        document.getElementById('purchaseTotal').textContent = 'R$ 0,00';
        return;
    }

    const total = purchaseItems.reduce((sum, item) => sum + item.total_cost, 0);

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Custo Unit.</th>
                    <th>Total</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${purchaseItems.map((item, index) => `
                    <tr>
                        <td>${item.product_name}</td>
                        <td>${item.quantity}</td>
                        <td>${formatCurrency(item.unit_cost)}</td>
                        <td>${formatCurrency(item.total_cost)}</td>
                        <td>
                            <button type="button" class="btn btn-sm btn-danger" onclick="window.removeItem(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('purchaseTotal').textContent = formatCurrency(total);
}

window.removeItem = (index) => {
    purchaseItems.splice(index, 1);
    updateItemsList();
};

async function handlePurchaseSubmit(e) {
    e.preventDefault();

    if (purchaseItems.length === 0) {
        showToast('Adicione pelo menos um item', 'warning');
        return;
    }

    const data = {
        supplier_id: document.getElementById('purchaseSupplier').value,
        payment_method: document.getElementById('purchasePaymentMethod').value,
        notes: document.getElementById('purchaseNotes').value,
        items: purchaseItems,
    };

    try {
        await api.post('/purchases', data);
        showToast('Compra registrada! Estoque atualizado.', 'success');
        closeModal('purchase');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao registrar compra', 'error');
    }
}

async function viewPurchase(id) {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;

    const itemsHtml = purchase.items?.map(item => `
        <tr>
            <td>${item.product?.name || '-'}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_cost)}</td>
            <td>${formatCurrency(item.total_cost)}</td>
        </tr>
    `).join('') || '';

    showToast(`
        <div style="text-align:left;">
            <h4>Compra #${purchase.id.slice(0, 8)}</h4>
            <p><strong>Fornecedor:</strong> ${purchase.supplier?.name}</p>
            <p><strong>Data:</strong> ${formatDate(purchase.purchase_date)}</p>
            <p><strong>Total:</strong> ${formatCurrency(purchase.total_amount)}</p>
            <table class="table" style="margin-top:1rem;">
                <thead><tr><th>Produto</th><th>Qtd</th><th>Unit.</th><th>Total</th></tr></thead>
                <tbody>${itemsHtml}</tbody>
            </table>
        </div>
    `, 'info');
}

async function deletePurchase(id) {
    if (!confirm('Deseja realmente excluir esta compra?')) return;

    try {
        await api.delete(`/purchases/${id}`);
        showToast('Compra excluída!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir compra', 'error');
    }
}

function exportCSV() {
    if (purchases.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Data', 'Fornecedor', 'Total', 'Pagamento', 'Status'];
    const rows = purchases.map(p => [
        formatDate(p.purchase_date),
        p.supplier?.name || '',
        p.total_amount,
        p.payment_method,
        p.payment_status,
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

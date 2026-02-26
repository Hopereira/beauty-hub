/**
 * Inventory Page Module
 * Product management with stock control
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { api } from '../../../shared/utils/http.js';
import { showToast } from '../../../shared/utils/toast.js';
import { formatCurrency, formatDate } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';

let products = [];
let suppliers = [];
let filters = { category: '', low_stock: false, search: '' };
let editingProduct = null;

export function render() {
    renderShell('inventory');
}

export async function init() {
    await loadData();
    renderContent();
    
    return () => {
        products = [];
        suppliers = [];
        editingProduct = null;
    };
}

async function loadData() {
    const content = getContentArea();
    content.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:300px;"><div class="spinner"></div></div>';

    try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.low_stock) params.append('low_stock', 'true');
        if (filters.search) params.append('search', filters.search);

        const [productsRes, suppliersRes] = await Promise.all([
            api.get(`/products?${params}`),
            api.get('/suppliers'),
        ]);

        products = productsRes.data || [];
        suppliers = suppliersRes.data || [];
    } catch (error) {
        console.error('Error loading inventory:', error);
        showToast('Erro ao carregar estoque', 'error');
    }
}

function renderContent() {
    const content = getContentArea();
    
    content.innerHTML = `
        <div class="page-header">
            <div>
                <h1>Estoque</h1>
                <p>Gerencie produtos e controle de estoque</p>
            </div>
            <button class="btn btn-primary" id="btnAddProduct">
                <i class="fas fa-plus"></i> Novo Produto
            </button>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="filters">
                    <input type="text" id="filterSearch" placeholder="Buscar produto..." value="${filters.search}">
                    <select id="filterCategory">
                        <option value="">Todas categorias</option>
                        <option value="Shampoo" ${filters.category === 'Shampoo' ? 'selected' : ''}>Shampoo</option>
                        <option value="Condicionador" ${filters.category === 'Condicionador' ? 'selected' : ''}>Condicionador</option>
                        <option value="Tintura" ${filters.category === 'Tintura' ? 'selected' : ''}>Tintura</option>
                        <option value="Esmalte" ${filters.category === 'Esmalte' ? 'selected' : ''}>Esmalte</option>
                        <option value="Outros" ${filters.category === 'Outros' ? 'selected' : ''}>Outros</option>
                    </select>
                    <label style="display:flex;align-items:center;gap:0.5rem;">
                        <input type="checkbox" id="filterLowStock" ${filters.low_stock ? 'checked' : ''}>
                        Estoque baixo
                    </label>
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
                            <th>Produto</th>
                            <th>Categoria</th>
                            <th>Fornecedor</th>
                            <th>Estoque</th>
                            <th>Mín.</th>
                            <th>Custo</th>
                            <th>Venda</th>
                            <th>Validade</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderTableRows()}
                    </tbody>
                </table>
            </div>
        </div>

        ${renderProductModal()}
        ${renderStockAdjustModal()}
    `;

    bindEvents();
}

function renderTableRows() {
    if (products.length === 0) {
        return '<tr><td colspan="9" style="text-align:center;padding:2rem;">Nenhum produto encontrado</td></tr>';
    }

    return products.map(product => {
        const lowStock = product.stock_quantity <= product.minimum_stock;
        const stockClass = lowStock ? 'badge badge-danger' : 'badge badge-success';
        
        return `
            <tr>
                <td><strong>${product.name}</strong></td>
                <td>${product.category || '-'}</td>
                <td>${product.supplier?.name || '-'}</td>
                <td><span class="${stockClass}">${product.stock_quantity}</span></td>
                <td>${product.minimum_stock}</td>
                <td>${formatCurrency(product.cost_price)}</td>
                <td>${formatCurrency(product.sale_price)}</td>
                <td>${product.expiration_date ? formatDate(product.expiration_date) : '-'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-secondary btn-edit" data-id="${product.id}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-primary btn-adjust-stock" data-id="${product.id}" title="Ajustar estoque">
                            <i class="fas fa-boxes"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-delete" data-id="${product.id}" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderProductModal() {
    return `
        <div class="modal-overlay" id="modal-product">
            <div class="modal">
                <div class="modal-header">
                    <h3 id="productModalTitle">Novo Produto</h3>
                    <button class="modal-close" data-modal="product">&times;</button>
                </div>
                <form id="productForm">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Nome do Produto *</label>
                            <input type="text" id="productName" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Categoria</label>
                                <select id="productCategory">
                                    <option value="">Selecione</option>
                                    <option value="Shampoo">Shampoo</option>
                                    <option value="Condicionador">Condicionador</option>
                                    <option value="Tintura">Tintura</option>
                                    <option value="Esmalte">Esmalte</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Fornecedor</label>
                                <select id="productSupplier">
                                    <option value="">Selecione</option>
                                    ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Código Interno</label>
                                <input type="text" id="productCode">
                            </div>
                            <div class="form-group">
                                <label>Código de Barras</label>
                                <input type="text" id="productBarcode">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Preço de Custo *</label>
                                <input type="number" id="productCost" step="0.01" required>
                            </div>
                            <div class="form-group">
                                <label>Preço de Venda *</label>
                                <input type="number" id="productPrice" step="0.01" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Estoque Inicial</label>
                                <input type="number" id="productStock" value="0" min="0">
                            </div>
                            <div class="form-group">
                                <label>Estoque Mínimo</label>
                                <input type="number" id="productMinStock" value="0" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Data de Validade</label>
                                <input type="date" id="productExpiration">
                            </div>
                            <div class="form-group">
                                <label>Lote</label>
                                <input type="text" id="productBatch">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-modal="product">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderStockAdjustModal() {
    return `
        <div class="modal-overlay" id="modal-adjust-stock">
            <div class="modal">
                <div class="modal-header">
                    <h3>Ajustar Estoque</h3>
                    <button class="modal-close" data-modal="adjust-stock">&times;</button>
                </div>
                <form id="adjustStockForm">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Quantidade (use - para reduzir)</label>
                            <input type="number" id="adjustQuantity" required>
                            <small>Ex: 10 para adicionar, -5 para remover</small>
                        </div>
                        <div class="form-group">
                            <label>Observações</label>
                            <textarea id="adjustNotes" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-modal="adjust-stock">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Ajustar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function bindEvents() {
    // Add product
    document.getElementById('btnAddProduct')?.addEventListener('click', () => {
        editingProduct = null;
        document.getElementById('productModalTitle').textContent = 'Novo Produto';
        document.getElementById('productForm').reset();
        openModal('product');
    });

    // Filters
    document.getElementById('btnApplyFilters')?.addEventListener('click', async () => {
        filters.search = document.getElementById('filterSearch').value;
        filters.category = document.getElementById('filterCategory').value;
        filters.low_stock = document.getElementById('filterLowStock').checked;
        await loadData();
        renderContent();
    });

    // Export CSV
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    // Table actions
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
    });

    document.querySelectorAll('.btn-adjust-stock').forEach(btn => {
        btn.addEventListener('click', () => adjustStock(btn.dataset.id));
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
    });

    // Product form submit
    document.getElementById('productForm')?.addEventListener('submit', handleProductSubmit);

    // Adjust stock form submit
    document.getElementById('adjustStockForm')?.addEventListener('submit', handleAdjustStockSubmit);

    // Modal close buttons
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
}

async function editProduct(id) {
    editingProduct = products.find(p => p.id === id);
    if (!editingProduct) return;

    document.getElementById('productModalTitle').textContent = 'Editar Produto';
    document.getElementById('productName').value = editingProduct.name;
    document.getElementById('productCategory').value = editingProduct.category || '';
    document.getElementById('productSupplier').value = editingProduct.supplier_id || '';
    document.getElementById('productCode').value = editingProduct.internal_code || '';
    document.getElementById('productBarcode').value = editingProduct.barcode || '';
    document.getElementById('productCost').value = editingProduct.cost_price;
    document.getElementById('productPrice').value = editingProduct.sale_price;
    document.getElementById('productStock').value = editingProduct.stock_quantity;
    document.getElementById('productMinStock').value = editingProduct.minimum_stock;
    document.getElementById('productExpiration').value = editingProduct.expiration_date ? editingProduct.expiration_date.split('T')[0] : '';
    document.getElementById('productBatch').value = editingProduct.batch_number || '';

    openModal('product');
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const data = {
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        supplier_id: document.getElementById('productSupplier').value || null,
        internal_code: document.getElementById('productCode').value,
        barcode: document.getElementById('productBarcode').value,
        cost_price: parseFloat(document.getElementById('productCost').value),
        sale_price: parseFloat(document.getElementById('productPrice').value),
        stock_quantity: parseInt(document.getElementById('productStock').value),
        minimum_stock: parseInt(document.getElementById('productMinStock').value),
        expiration_date: document.getElementById('productExpiration').value || null,
        batch_number: document.getElementById('productBatch').value,
    };

    try {
        if (editingProduct) {
            await api.put(`/products/${editingProduct.id}`, data);
            showToast('Produto atualizado!', 'success');
        } else {
            await api.post('/products', data);
            showToast('Produto criado!', 'success');
        }

        closeModal('product');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao salvar produto', 'error');
    }
}

let adjustingProductId = null;

function adjustStock(id) {
    adjustingProductId = id;
    document.getElementById('adjustStockForm').reset();
    openModal('adjust-stock');
}

async function handleAdjustStockSubmit(e) {
    e.preventDefault();

    const quantity = parseInt(document.getElementById('adjustQuantity').value);
    const notes = document.getElementById('adjustNotes').value;

    try {
        await api.post(`/products/${adjustingProductId}/adjust-stock`, { quantity, notes });
        showToast('Estoque ajustado!', 'success');
        closeModal('adjust-stock');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao ajustar estoque', 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
        await api.delete(`/products/${id}`);
        showToast('Produto excluído!', 'success');
        await loadData();
        renderContent();
    } catch (error) {
        showToast(error.message || 'Erro ao excluir produto', 'error');
    }
}

function exportCSV() {
    if (products.length === 0) {
        showToast('Nenhum dado para exportar', 'warning');
        return;
    }

    const headers = ['Nome', 'Categoria', 'Fornecedor', 'Estoque', 'Mín', 'Custo', 'Venda', 'Validade'];
    const rows = products.map(p => [
        p.name,
        p.category || '',
        p.supplier?.name || '',
        p.stock_quantity,
        p.minimum_stock,
        p.cost_price,
        p.sale_price,
        p.expiration_date || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `estoque_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('CSV exportado!', 'success');
}

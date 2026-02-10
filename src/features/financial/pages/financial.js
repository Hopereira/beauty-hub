/**
 * Financial Page Module
 * CRUD for income/expense transactions, summary cards, filters
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCollection, addToCollection, updateInCollection, removeFromCollection, KEYS } from '../../../shared/utils/localStorage.js';
import { formatCurrency, formatDate, parseCurrency } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';

let editingId = null;
let editingType = null; // 'income' or 'expense'

export function render() {
    renderShell('financial');
}

export function init() {
    editingId = null;
    editingType = null;
    renderPage();
    return () => { editingId = null; editingType = null; };
}

function getTransactions() {
    return getCollection(KEYS.FINANCIAL).sort((a, b) => b.date.localeCompare(a.date));
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    content.innerHTML = `
        <!-- Filters -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Financeiro</h2>
            <div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;">
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label style="font-size:0.85rem;color:var(--text-muted);font-weight:500;">Data início</label>
                    <input type="date" id="filterStartDate" value="" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                </div>
                <div style="display:flex;flex-direction:column;gap:0.25rem;">
                    <label style="font-size:0.85rem;color:var(--text-muted);font-weight:500;">Data final</label>
                    <input type="date" id="filterEndDate" value="" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                </div>
                <button id="btnFilter" style="padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;height:44px;border:none;background:#E91E63;color:white;">Filtrar</button>
                <button id="btnClearFilter" style="padding:10px 24px;border-radius:8px;font-weight:600;cursor:pointer;height:44px;border:none;background:#333;color:white;">Limpar</button>
            </div>
        </div>

        <!-- Summary Cards -->
        <div id="summaryCards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-bottom:2rem;"></div>

        <!-- Incomes Table -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;margin-bottom:2rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div style="font-size:1.2rem;font-weight:600;color:var(--text-dark);display:flex;align-items:center;gap:0.5rem;">
                    Entradas <span id="incomesCount" style="background:#f0f0f0;padding:4px 12px;border-radius:12px;font-size:0.85rem;color:var(--text-muted);"></span>
                </div>
                <button id="btnExport" style="background:var(--primary-color);color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-download"></i> Gerar relatório
                </button>
            </div>
            <div id="incomesTable"></div>
        </div>

        <!-- Expenses Table -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <div style="font-size:1.2rem;font-weight:600;color:#E91E63;display:flex;align-items:center;gap:0.5rem;">
                    Saídas <span id="expensesCount" style="background:#f0f0f0;padding:4px 12px;border-radius:12px;font-size:0.85rem;color:var(--text-muted);"></span>
                </div>
                <button id="btnAddExpense" style="background:#E91E63;color:white;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-plus"></i> Adicionar saída
                </button>
            </div>
            <div id="expensesTable"></div>
        </div>

        <!-- Expense Modal -->
        <div id="modal-expense" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:16px;width:90%;max-width:500px;max-height:90vh;overflow-y:auto;">
                <h2 id="expenseModalTitle" style="font-size:1.5rem;font-weight:600;margin-bottom:1.5rem;color:var(--text-dark);">Nova saída</h2>
                <form id="expenseForm">
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Título</label>
                        <input type="text" id="expTitle" required placeholder="Ex: Material" style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Descrição</label>
                        <textarea id="expDescription" rows="2" placeholder="Adicione uma descrição..." style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Categoria</label>
                        <select id="expCategory" style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;font-family:inherit;">
                            <option>Selecione</option>
                            <option>Material</option>
                            <option>Alimentação</option>
                            <option>Contas</option>
                            <option>Aluguel</option>
                            <option>Transporte</option>
                            <option>Outros</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Data</label>
                        <input type="date" id="expDate" style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Valor</label>
                        <input type="text" id="expValue" required placeholder="R$ 0,00" style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Forma de Pagamento</label>
                        <select id="expPayment" style="width:100%;padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;box-sizing:border-box;font-family:inherit;">
                            <option value="">Selecione</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="credito">Crédito</option>
                            <option value="debito">Débito</option>
                            <option value="pix">Pix</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.25rem;">
                        <label style="display:block;font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;font-weight:500;">Status</label>
                        <div style="display:flex;gap:1rem;">
                            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.95rem;">
                                <input type="radio" name="expStatus" value="pending" checked style="width:18px;height:18px;cursor:pointer;"> Aguardando
                            </label>
                            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;font-size:0.95rem;">
                                <input type="radio" name="expStatus" value="completed" style="width:18px;height:18px;cursor:pointer;"> Concluído
                            </label>
                        </div>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelExpense" style="flex:1;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;border:none;background:#f0f0f0;color:var(--text-dark);">Fechar</button>
                        <button type="submit" style="flex:1;padding:12px 24px;border-radius:8px;font-weight:600;cursor:pointer;border:none;background:#E91E63;color:white;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation -->
        <div id="modal-delete-financial" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir esta transação?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDeleteFin" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDeleteFin" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    refreshData();
    bindEvents();
}

function refreshData() {
    let transactions = getTransactions();

    // Apply date filters
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    if (startDate) transactions = transactions.filter(t => t.date >= startDate);
    if (endDate) transactions = transactions.filter(t => t.date <= endDate);

    const incomes = transactions.filter(t => t.type === 'income');
    const expenses = transactions.filter(t => t.type === 'expense');

    renderSummaryCards(incomes, expenses);
    renderIncomesTable(incomes);
    renderExpensesTable(expenses);
}

function renderSummaryCards(incomes, expenses) {
    const container = document.getElementById('summaryCards');
    if (!container) return;

    const totalByMethod = { dinheiro: 0, credito: 0, debito: 0, pix: 0 };
    incomes.forEach(i => {
        if (i.paymentMethod && totalByMethod[i.paymentMethod] !== undefined) {
            totalByMethod[i.paymentMethod] += i.value;
        }
    });
    const totalPayments = Object.values(totalByMethod).reduce((s, v) => s + v, 0);

    const openIncomes = incomes.filter(i => i.status === 'pending').reduce((s, i) => s + i.value, 0);
    const openExpenses = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.value, 0);
    const totalOpen = openIncomes + openExpenses;

    const closedIncomes = incomes.filter(i => i.status === 'completed').reduce((s, i) => s + i.value, 0);
    const closedExpenses = expenses.filter(e => e.status === 'completed').reduce((s, e) => s + e.value, 0);
    const totalClosed = closedIncomes + closedExpenses;

    container.innerHTML = `
        <!-- Payment Methods Card -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;position:relative;">
            <span style="position:absolute;top:1rem;right:1rem;padding:4px 12px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#E3F2FD;color:#2196F3;">Total</span>
            <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:#E3F2FD;color:#2196F3;margin-bottom:1rem;">
                <i class="fas fa-credit-card"></i>
            </div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;">Forma de pagamento</div>
            <div style="font-size:1.8rem;font-weight:700;color:var(--text-dark);">${formatCurrency(totalPayments)}</div>
            <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.9rem;"><span style="color:var(--text-muted);">Dinheiro:</span><span style="font-weight:600;">${formatCurrency(totalByMethod.dinheiro)}</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.9rem;"><span style="color:var(--text-muted);">Crédito:</span><span style="font-weight:600;">${formatCurrency(totalByMethod.credito)}</span></div>
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.9rem;"><span style="color:var(--text-muted);">Débito:</span><span style="font-weight:600;">${formatCurrency(totalByMethod.debito)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;"><span style="color:var(--text-muted);">Pix:</span><span style="font-weight:600;">${formatCurrency(totalByMethod.pix)}</span></div>
            </div>
        </div>

        <!-- Open Finances Card -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;position:relative;">
            <span style="position:absolute;top:1rem;right:1rem;padding:4px 12px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#FCE4EC;color:#E91E63;">Em aberto</span>
            <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:#FCE4EC;color:#E91E63;margin-bottom:1rem;">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;">Financeiro aberto</div>
            <div style="font-size:1.8rem;font-weight:700;color:var(--text-dark);">${formatCurrency(totalOpen)}</div>
            <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.9rem;"><span style="color:var(--text-muted);">A receber:</span><span style="font-weight:600;">${formatCurrency(openIncomes)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;"><span style="color:var(--text-muted);">A pagar:</span><span style="font-weight:600;">${formatCurrency(openExpenses)}</span></div>
            </div>
        </div>

        <!-- Completed Finances Card -->
        <div style="background:white;border-radius:12px;padding:1.5rem;border:1px solid #e0e0e0;position:relative;">
            <span style="position:absolute;top:1rem;right:1rem;padding:4px 12px;border-radius:12px;font-size:0.75rem;font-weight:600;background:#E8F5E9;color:#4CAF50;">Concluído</span>
            <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;background:#E8F5E9;color:#4CAF50;margin-bottom:1rem;">
                <i class="fas fa-check-circle"></i>
            </div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.5rem;">Financeiro concluído</div>
            <div style="font-size:1.8rem;font-weight:700;color:var(--text-dark);">${formatCurrency(totalClosed)}</div>
            <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #f0f0f0;">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;font-size:0.9rem;"><span style="color:var(--text-muted);">Entradas:</span><span style="font-weight:600;">${formatCurrency(closedIncomes)}</span></div>
                <div style="display:flex;justify-content:space-between;font-size:0.9rem;"><span style="color:var(--text-muted);">Saídas:</span><span style="font-weight:600;">${formatCurrency(closedExpenses)}</span></div>
            </div>
        </div>
    `;
}

function renderTransactionTable(items, type) {
    const statusLabels = { pending: 'Pendente', completed: 'Concluído' };
    const statusStyles = { pending: 'color:#F57C00;background:#FFF3E0;', completed: 'color:#4CAF50;background:#E8F5E9;' };

    if (items.length === 0) {
        return `<div style="text-align:center;padding:2rem;color:var(--text-muted);"><i class="far fa-file-alt" style="font-size:2rem;margin-bottom:0.5rem;display:block;color:#e0e0e0;"></i>Nenhuma transação encontrada</div>`;
    }

    const isIncome = type === 'income';
    let html = `<table style="width:100%;border-collapse:collapse;">
        <thead style="background:#f8f9fa;">
            <tr>
                ${isIncome ? '<th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Cliente</th>' : ''}
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">${isIncome ? 'Serviço' : 'Título'}</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Valor</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Status</th>
                <th style="padding:1rem;text-align:left;font-weight:600;font-size:0.9rem;color:var(--text-muted);border-bottom:2px solid #e0e0e0;">Data</th>
                <th style="padding:1rem;border-bottom:2px solid #e0e0e0;"></th>
            </tr>
        </thead>
        <tbody>`;

    items.forEach(item => {
        html += `<tr style="border-bottom:1px solid #f0f0f0;">
            ${isIncome ? `<td style="padding:1rem;font-weight:600;">${item.clientName || '-'}</td>` : ''}
            <td style="padding:1rem;color:#2196F3;">${item.description}</td>
            <td style="padding:1rem;font-weight:600;">${formatCurrency(item.value)}</td>
            <td style="padding:1rem;"><span style="padding:6px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${statusStyles[item.status] || ''}">${statusLabels[item.status] || item.status}</span></td>
            <td style="padding:1rem;color:var(--text-muted);">${formatDate(item.date)}</td>
            <td style="padding:1rem;">
                <div style="position:relative;">
                    <button class="btn-edit-fin" data-id="${item.id}" data-type="${type}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;margin-right:0.5rem;" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-fin" data-id="${item.id}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0.25rem;" title="Excluir"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    return html;
}

function renderIncomesTable(incomes) {
    const container = document.getElementById('incomesTable');
    const count = document.getElementById('incomesCount');
    if (container) container.innerHTML = renderTransactionTable(incomes, 'income');
    if (count) count.textContent = `${incomes.length} registro${incomes.length !== 1 ? 's' : ''}`;
}

function renderExpensesTable(expenses) {
    const container = document.getElementById('expensesTable');
    const count = document.getElementById('expensesCount');
    if (container) container.innerHTML = renderTransactionTable(expenses, 'expense');
    if (count) count.textContent = `${expenses.length} registro${expenses.length !== 1 ? 's' : ''}`;
}

function openExpenseModal(transaction = null) {
    editingId = transaction ? transaction.id : null;
    editingType = 'expense';

    const title = document.getElementById('expenseModalTitle');
    if (title) title.textContent = transaction ? 'Editar saída' : 'Nova saída';

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expTitle').value = transaction?.description || '';
    document.getElementById('expDescription').value = '';
    document.getElementById('expCategory').value = transaction?.category || 'Selecione';
    document.getElementById('expDate').value = transaction?.date || today;
    document.getElementById('expValue').value = transaction ? formatCurrency(transaction.value) : '';
    document.getElementById('expPayment').value = transaction?.paymentMethod || '';

    const statusRadios = document.querySelectorAll('input[name="expStatus"]');
    statusRadios.forEach(r => { r.checked = r.value === (transaction?.status || 'pending'); });

    openModal('expense');
}

function bindEvents() {
    // Filters
    document.getElementById('btnFilter')?.addEventListener('click', refreshData);
    document.getElementById('btnClearFilter')?.addEventListener('click', () => {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        refreshData();
    });

    // Add expense
    document.getElementById('btnAddExpense')?.addEventListener('click', () => openExpenseModal());
    document.getElementById('btnCancelExpense')?.addEventListener('click', () => closeModal('expense'));

    // Expense form submit
    document.getElementById('expenseForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const status = document.querySelector('input[name="expStatus"]:checked')?.value || 'pending';
        const data = {
            type: 'expense',
            description: document.getElementById('expTitle').value.trim(),
            value: parseCurrency(document.getElementById('expValue').value),
            date: document.getElementById('expDate').value,
            status,
            category: document.getElementById('expCategory').value,
            paymentMethod: document.getElementById('expPayment').value,
            clientName: '',
        };

        if (!data.description || !data.value) {
            showToast('Preencha título e valor.', 'error');
            return;
        }

        if (editingId) {
            updateInCollection(KEYS.FINANCIAL, editingId, data);
            showToast('Saída atualizada!', 'success');
        } else {
            addToCollection(KEYS.FINANCIAL, data);
            showToast('Saída adicionada!', 'success');
        }
        editingId = null;
        closeModal('expense');
        refreshData();
    });

    // Export
    document.getElementById('btnExport')?.addEventListener('click', () => {
        showToast('Relatório gerado com sucesso!', 'info');
    });

    // Edit/Delete delegation on tables
    document.addEventListener('click', handleTableActions);

    // Delete confirmation
    document.getElementById('btnCancelDeleteFin')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-financial');
    });
    document.getElementById('btnConfirmDeleteFin')?.addEventListener('click', () => {
        if (editingId) {
            removeFromCollection(KEYS.FINANCIAL, editingId);
            showToast('Transação excluída.', 'success');
            editingId = null;
            closeModal('delete-financial');
            refreshData();
        }
    });
}

function handleTableActions(e) {
    const editBtn = e.target.closest('.btn-edit-fin');
    const deleteBtn = e.target.closest('.btn-delete-fin');

    if (editBtn) {
        const id = editBtn.dataset.id;
        const transaction = getTransactions().find(t => t.id === id);
        if (transaction && transaction.type === 'expense') {
            openExpenseModal(transaction);
        } else if (transaction) {
            showToast('Edição de entradas será disponível em breve.', 'info');
        }
    }

    if (deleteBtn) {
        editingId = deleteBtn.dataset.id;
        openModal('delete-financial');
    }
}

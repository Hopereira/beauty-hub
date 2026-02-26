/**
 * Appointments Page Module
 * Full CRUD for appointments with calendar view and list view
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCurrentUser, isSubscriptionBlocked } from '../../../core/state.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency, formatDate, parseCurrency } from '../../../shared/utils/validation.js';
import { openModal, closeModal } from '../../../shared/components/modal/modal.js';
import { showToast } from '../../../shared/utils/toast.js';

let appointments = [];
let clients = [];
let services = [];
let professionals = [];
let editingId = null;
let isLoading = false;

export function render() {
    renderShell('appointments');
}

export async function init() {
    editingId = null;
    await loadData();
    renderPage();
    return () => { 
        editingId = null;
        appointments = [];
        clients = [];
        services = [];
    };
}

async function loadData() {
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
        const [appsRes, clientsRes, servicesRes, profsRes] = await Promise.all([
            api.get('/appointments'),
            api.get('/clients'),
            api.get('/services').catch(() => ({ data: [] })),
            api.get('/professionals').catch(() => ({ data: [] })),
        ]);

        appointments = (appsRes.data || []).sort((a, b) => {
            const da = (a.date || '') + (a.start_time || a.startTime || '');
            const db = (b.date || '') + (b.start_time || b.startTime || '');
            return da < db ? -1 : da > db ? 1 : 0;
        });
        clients = clientsRes.data || [];
        services = servicesRes.data || [];
        professionals = profsRes.data || [];
    } catch (error) {
        console.error('[Appointments] Error loading data:', error);
        showToast('Erro ao carregar agendamentos', 'error');
    } finally {
        isLoading = false;
    }
}

function renderPage() {
    const content = getContentArea();
    if (!content) return;

    const today = new Date().toISOString().split('T')[0];

    content.innerHTML = `
        <div class="appointments-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;gap:1rem;flex-wrap:wrap;">
            <h2 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin:0;">Agendamentos</h2>
            <div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap;">
                <input type="date" id="filterDate" value="${today}" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                <select id="filterStatus" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;font-size:0.95rem;height:44px;">
                    <option value="">Todos status</option>
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="pending">Pendente</option>
                    <option value="cancelled">Cancelado</option>
                </select>
                <button id="btnClearFilter" style="padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:white;cursor:pointer;font-weight:600;height:44px;">Limpar</button>
                <button id="btnAddAppointment" style="
                    background:var(--primary-color);color:white;border:none;padding:10px 24px;border-radius:8px;
                    font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;height:44px;white-space:nowrap;
                "><i class="fas fa-plus"></i> Adicionar</button>
            </div>
        </div>

        <div id="appointmentsList"></div>

        <!-- Appointment Modal -->
        <div id="modal-appointment" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:500px;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;max-height:90vh;overflow-y:auto;">
                <button class="modal-close" id="modalCloseBtn" style="position:absolute;top:1.5rem;right:1.5rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-muted);">
                    <i class="fas fa-times"></i>
                </button>
                <div class="modal-header">
                    <h2 id="modalTitle" style="margin:0 0 1.5rem 0;color:var(--text-dark);font-size:1.5rem;">Novo agendamento</h2>
                </div>
                <form id="appointmentForm">
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Cliente</label>
                        <select id="appClient" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;font-family:inherit;">
                            <option value="">Selecione o cliente</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Serviço</label>
                        <select id="appService" required style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;font-family:inherit;">
                            <option value="">Selecione o serviço</option>
                            <option value="Extensão de Cílios">Extensão de Cílios</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Manicure">Manicure</option>
                            <option value="Pedicure">Pedicure</option>
                            <option value="Corte de Cabelo">Corte de Cabelo</option>
                            <option value="Coloração">Coloração</option>
                            <option value="Maquiagem">Maquiagem</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Valor</label>
                        <input type="text" id="appValue" placeholder="R$ 00,00" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Data e Hora Início</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                            <input type="date" id="appDate" required style="padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
                            <input type="time" id="appStartTime" required value="12:00" style="padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
                        </div>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Hora Término</label>
                        <input type="time" id="appEndTime" required value="13:00" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;">
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Status</label>
                        <select id="appStatus" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;font-family:inherit;">
                            <option value="scheduled">Agendado</option>
                            <option value="completed">Concluído</option>
                            <option value="pending">Pendente</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Forma de Pagamento</label>
                        <select id="appPayment" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;font-family:inherit;">
                            <option value="">Nenhuma</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="credito">Crédito</option>
                            <option value="debito">Débito</option>
                            <option value="pix">Pix</option>
                        </select>
                    </div>
                    <div style="margin-bottom:1.5rem;">
                        <label style="display:block;margin-bottom:0.5rem;color:var(--text-dark);font-weight:500;font-size:0.9rem;">Observações</label>
                        <textarea id="appNotes" rows="2" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:1rem;font-family:inherit;resize:vertical;"></textarea>
                    </div>
                    <div style="display:flex;gap:1rem;margin-top:2rem;">
                        <button type="button" id="btnCancelModal" style="flex:1;padding:14px;background:white;border:1px solid #ddd;border-radius:25px;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button type="submit" style="flex:2;padding:14px;background:var(--primary-color);color:white;border:none;border-radius:25px;font-weight:600;cursor:pointer;font-size:1rem;">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div id="modal-delete-appointment" class="modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2000;justify-content:center;align-items:center;">
            <div class="modal-content" style="background:white;padding:2rem;border-radius:12px;width:100%;max-width:400px;text-align:center;">
                <h2 style="margin-bottom:1rem;color:var(--text-dark);">Confirmar exclusão</h2>
                <p style="color:var(--text-muted);margin-bottom:2rem;">Tem certeza que deseja excluir este agendamento?</p>
                <div style="display:flex;gap:1rem;">
                    <button id="btnCancelDelete" style="flex:1;padding:12px;background:white;border:1px solid #ddd;border-radius:8px;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="btnConfirmDelete" style="flex:1;padding:12px;background:#E91E63;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Excluir</button>
                </div>
            </div>
        </div>
    `;

    renderAppointmentsList();
    bindEvents();
}

function renderAppointmentsList() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;

    let filteredApps = [...appointments];

    // Apply filters
    const filterDate = document.getElementById('filterDate')?.value;
    const filterStatus = document.getElementById('filterStatus')?.value;

    if (filterDate) {
        filteredApps = filteredApps.filter(a => a.date === filterDate);
    }
    if (filterStatus) {
        filteredApps = filteredApps.filter(a => a.status === filterStatus);
    }

    if (filteredApps.length === 0) {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;">
                <div style="font-size:4rem;color:var(--text-muted);margin-bottom:1rem;">
                    <i class="far fa-file-alt"></i>
                </div>
                <h3 style="color:var(--text-dark);margin-bottom:0.5rem;font-size:1.25rem;">Nenhum agendamento encontrado</h3>
                <p style="color:var(--text-muted);font-size:0.95rem;">Clique em "Adicionar" para criar um novo agendamento</p>
            </div>
        `;
        return;
    }

    const statusLabels = { scheduled: 'Agendado', confirmed: 'Confirmado', completed: 'Concluído', pending: 'Pendente', cancelled: 'Cancelado', no_show: 'Não compareceu' };
    const statusClasses = { scheduled: 'color:#2196F3;background:#E3F2FD;', confirmed: 'color:#2196F3;background:#E3F2FD;', completed: 'color:#4CAF50;background:#E8F5E9;', pending: 'color:#F57C00;background:#FFF3E0;', cancelled: 'color:#F44336;background:#FFEBEE;', no_show: 'color:#9E9E9E;background:#F5F5F5;' };

    let html = '';
    filteredApps.forEach(app => {
        const client = clients.find(c => c.id === app.client_id || c.id === app.clientId);
        const clientName = client ? client.name : (app.client?.name || 'Cliente');
        const service = services.find(s => s.id === app.service_id) || { name: app.service || 'Serviço' };
        const startTime = app.start_time || app.startTime || '';
        const endTime = app.end_time || app.endTime || '';
        const value = app.price || app.value || 0;

        html += `
            <div class="appointment-card" style="background:white;border:1px solid #e5e5e5;border-radius:12px;padding:1.5rem;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;transition:box-shadow 0.3s;" data-id="${app.id}">
                <div>
                    <h4 style="color:var(--text-dark);margin:0 0 0.5rem 0;">${clientName}</h4>
                    <div style="display:flex;gap:1.5rem;color:var(--text-muted);font-size:0.9rem;flex-wrap:wrap;">
                        <span><i class="far fa-clock"></i> ${startTime} - ${endTime}</span>
                        <span><i class="fas fa-cut"></i> ${service.name || app.service}</span>
                        <span><i class="fas fa-dollar-sign"></i> ${formatCurrency(value)}</span>
                        <span><i class="far fa-calendar"></i> ${formatDate(app.date)}</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <span style="padding:6px 12px;border-radius:12px;font-size:0.85rem;font-weight:600;${statusClasses[app.status] || ''}">${statusLabels[app.status] || app.status}</span>
                    <button class="btn-edit-app" data-id="${app.id}" title="Editar" style="background:none;border:1px solid #ddd;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-app" data-id="${app.id}" title="Excluir" style="background:none;border:1px solid #ddd;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function populateSelects() {
    // Populate clients
    const clientSelect = document.getElementById('appClient');
    if (clientSelect) {
        clientSelect.innerHTML = '<option value="">Selecione o cliente</option>';
        clients.forEach(c => {
            clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    }

    // Populate services
    const serviceSelect = document.getElementById('appService');
    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Selecione o serviço</option>';
        if (services.length > 0) {
            services.forEach(s => {
                serviceSelect.innerHTML += `<option value="${s.id}" data-price="${s.price || 0}">${s.name} - ${formatCurrency(s.price || 0)}</option>`;
            });
        } else {
            // Fallback services if none from API
            const defaultServices = ['Extensão de Cílios', 'Manutenção', 'Manicure', 'Pedicure', 'Corte de Cabelo', 'Coloração', 'Maquiagem'];
            defaultServices.forEach(s => {
                serviceSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
        }
    }

    // Populate professionals
    const profSelect = document.getElementById('appProfessional');
    if (profSelect) {
        profSelect.innerHTML = '<option value="">Selecione o profissional</option>';
        professionals.forEach(p => {
            const name = p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim();
            profSelect.innerHTML += `<option value="${p.id}">${name}</option>`;
        });
    }
}

function openAppointmentModal(appointment = null) {
    if (isSubscriptionBlocked() && !appointment) {
        showToast('Assinatura inativa. Não é possível criar novos agendamentos.', 'error');
        return;
    }

    editingId = appointment ? appointment.id : null;
    const title = document.getElementById('modalTitle');
    if (title) title.textContent = appointment ? 'Editar agendamento' : 'Novo agendamento';

    populateSelects();

    const today = new Date().toISOString().split('T')[0];
    const value = appointment?.price || appointment?.value || 0;

    document.getElementById('appClient').value = appointment?.client_id || appointment?.clientId || '';
    document.getElementById('appService').value = appointment?.service_id || appointment?.service || '';
    document.getElementById('appValue').value = value ? formatCurrency(value) : '';
    document.getElementById('appDate').value = appointment?.date || today;
    document.getElementById('appStartTime').value = appointment?.start_time || appointment?.startTime || '12:00';
    document.getElementById('appEndTime').value = appointment?.end_time || appointment?.endTime || '13:00';
    document.getElementById('appStatus').value = appointment?.status || 'scheduled';
    document.getElementById('appPayment').value = appointment?.payment_method || appointment?.paymentMethod || '';
    document.getElementById('appNotes').value = appointment?.notes || '';

    openModal('appointment');
}

function bindEvents() {
    // Add button
    document.getElementById('btnAddAppointment')?.addEventListener('click', () => openAppointmentModal());

    // Close modal buttons
    document.getElementById('modalCloseBtn')?.addEventListener('click', () => closeModal('appointment'));
    document.getElementById('btnCancelModal')?.addEventListener('click', () => closeModal('appointment'));

    // Filter changes
    document.getElementById('filterDate')?.addEventListener('change', renderAppointmentsList);
    document.getElementById('filterStatus')?.addEventListener('change', renderAppointmentsList);
    document.getElementById('btnClearFilter')?.addEventListener('click', () => {
        document.getElementById('filterDate').value = '';
        document.getElementById('filterStatus').value = '';
        renderAppointmentsList();
    });

    // Form submit
    document.getElementById('appointmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveAppointment();
    });

    // Edit / Delete via delegation
    document.getElementById('appointmentsList')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-app');
        const deleteBtn = e.target.closest('.btn-delete-app');

        if (editBtn) {
            const id = editBtn.dataset.id;
            const app = appointments.find(a => a.id === id);
            if (app) openAppointmentModal(app);
        }

        if (deleteBtn) {
            if (isSubscriptionBlocked()) {
                showToast('Assinatura inativa. Não é possível excluir agendamentos.', 'error');
                return;
            }
            editingId = deleteBtn.dataset.id;
            openModal('delete-appointment');
        }
    });

    // Delete confirmation
    document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
        editingId = null;
        closeModal('delete-appointment');
    });

    document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
        if (editingId) {
            try {
                await api.delete(`/appointments/${editingId}`);
                showToast('Agendamento excluído.', 'success');
                editingId = null;
                closeModal('delete-appointment');
                await loadData();
                renderAppointmentsList();
            } catch (error) {
                console.error('[Appointments] Delete error:', error);
                showToast(error.message || 'Erro ao excluir agendamento', 'error');
            }
        }
    });
}

async function saveAppointment() {
    const submitBtn = document.querySelector('#appointmentForm button[type="submit"]');
    const originalText = submitBtn?.textContent || 'Confirmar';

    const user = getCurrentUser();
    const serviceId = document.getElementById('appService').value;
    
    const data = {
        client_id: document.getElementById('appClient').value,
        professional_id: user?.id || undefined,
        service_id: serviceId,
        service: services.find(s => s.id === serviceId)?.name || serviceId,
        price: parseCurrency(document.getElementById('appValue').value),
        date: document.getElementById('appDate').value,
        start_time: document.getElementById('appStartTime').value,
        end_time: document.getElementById('appEndTime').value,
        status: document.getElementById('appStatus').value,
        payment_method: document.getElementById('appPayment').value || undefined,
        notes: document.getElementById('appNotes').value || undefined,
    };

    if (!data.client_id || !data.date || !data.start_time) {
        showToast('Preencha os campos obrigatórios.', 'error');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;margin-right:8px;"></div>Salvando...';
    }

    try {
        if (editingId) {
            await api.put(`/appointments/${editingId}`, data);
            showToast('Agendamento atualizado!', 'success');
        } else {
            await api.post('/appointments', data);
            showToast('Agendamento criado!', 'success');
        }

        editingId = null;
        closeModal('appointment');
        await loadData();
        renderAppointmentsList();
    } catch (error) {
        console.error('[Appointments] Save error:', error);
        showToast(error.message || 'Erro ao salvar agendamento', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

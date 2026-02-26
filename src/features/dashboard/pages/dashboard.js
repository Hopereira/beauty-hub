/**
 * Dashboard (Professional) Page Module
 * Shows stats, calendar with appointments, and quick actions
 */

import { renderShell, getContentArea } from '../../../shared/components/shell/shell.js';
import { getCurrentUser, isSubscriptionBlocked } from '../../../core/state.js';
import { api } from '../../../shared/utils/http.js';
import { formatCurrency } from '../../../shared/utils/validation.js';
import { navigateTo } from '../../../core/router.js';
import { showToast } from '../../../shared/utils/toast.js';

let currentMonth = null;
let currentYear = null;
let appointments = [];
let clients = [];
let stats = { today: 0, week: 0, month: 0 };
let isLoading = false;

export function render() {
    renderShell('dashboard');
}

export async function init() {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();

    await loadDashboardData();
    renderDashboardContent();

    return () => {
        currentMonth = null;
        currentYear = null;
        appointments = [];
        clients = [];
    };
}

async function loadDashboardData() {
    isLoading = true;
    const content = getContentArea();
    if (content) {
        content.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:400px;">
                <div class="spinner"></div>
            </div>
        `;
    }

    try {
        const [appointmentsRes, clientsRes, statsRes] = await Promise.all([
            api.get('/appointments').catch(() => ({ data: [] })),
            api.get('/clients').catch(() => ({ data: [] })),
            api.get('/appointments/stats').catch(() => ({ data: null })),
        ]);

        appointments = appointmentsRes.data || [];
        clients = clientsRes.data || [];
        
        if (statsRes.data) {
            stats = statsRes.data;
        } else {
            calculateStats();
        }
    } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
        showToast('Erro ao carregar dados do dashboard', 'error');
    } finally {
        isLoading = false;
    }
}

function calculateStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(new Date());
    const weekEnd = getWeekEnd(new Date());
    
    const todayApps = appointments.filter(a => a.date === today && a.status === 'completed');
    const weekApps = appointments.filter(a => a.date >= weekStart && a.date <= weekEnd && a.status === 'completed');
    const monthApps = appointments.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && a.status === 'completed';
    });

    stats = {
        today: todayApps.reduce((s, a) => s + (a.value || a.price || 0), 0),
        week: weekApps.reduce((s, a) => s + (a.value || a.price || 0), 0),
        month: monthApps.reduce((s, a) => s + (a.value || a.price || 0), 0),
    };
}

function renderDashboardContent() {
    const content = getContentArea();
    if (!content) return;

    const user = getCurrentUser();
    const blocked = isSubscriptionBlocked();
    
    // Use stats from API or calculated
    const todayEarnings = stats.today || 0;
    const weekEarnings = stats.week || 0;
    const monthEarnings = stats.month || 0;

    const calendarHTML = renderCalendar(currentMonth, currentYear, appointments);

    content.innerHTML = `
        <!-- Stats Section -->
        <section class="stats-section" style="text-align:center;margin-bottom:2rem;">
            <div class="date-filter" style="display:inline-flex;background:white;padding:4px;border-radius:50px;margin-bottom:1.5rem;box-shadow:var(--shadow);">
                <button class="filter-btn active" data-period="today">Hoje</button>
                <button class="filter-btn" data-period="week">Semana</button>
                <button class="filter-btn" data-period="month">Mês</button>
            </div>

            <div class="total-earnings">
                <span class="label" style="display:block;color:var(--text-muted);font-size:0.9rem;margin-bottom:0.5rem;">Total de ganhos</span>
                <h2 class="amount" id="earningsAmount" style="font-size:2.5rem;color:var(--text-dark);margin:0;">${formatCurrency(todayEarnings)}</h2>
            </div>
        </section>

        <!-- Calendar Section -->
        <section class="calendar-section" style="background:white;border-radius:12px;padding:1.5rem;box-shadow:var(--shadow);">
            <div class="calendar-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">
                <button id="prevMonth" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted);padding:0.5rem;">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="current-date" id="calendarTitle" style="font-weight:600;color:var(--text-muted);text-transform:lowercase;">
                    ${getMonthName(currentMonth)} de ${currentYear}
                </div>
                <button id="nextMonth" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--text-muted);padding:0.5rem;">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>

            <div id="calendarGrid">
                ${calendarHTML}
            </div>
        </section>

        <!-- Floating Action Button -->
        <button class="fab-add" id="fabAdd" style="
            position:fixed;bottom:30px;right:30px;background:var(--primary-color);color:white;border:none;
            padding:15px 30px;border-radius:50px;font-weight:700;font-size:1rem;
            box-shadow:0 4px 15px rgba(32,178,170,0.4);display:flex;align-items:center;gap:10px;cursor:pointer;transition:transform 0.3s;
        " ${blocked ? 'disabled style="opacity:0.6;cursor:not-allowed;"' : ''}>
            <i class="fas fa-calendar-plus"></i> AGENDAR
        </button>
    `;

    bindDashboardEvents(todayEarnings, weekEarnings, monthEarnings);
}

function bindDashboardEvents(todayEarnings, weekEarnings, monthEarnings) {
    // Period filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    const earningsEl = document.getElementById('earningsAmount');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const period = btn.dataset.period;
            if (period === 'today') earningsEl.textContent = formatCurrency(todayEarnings);
            else if (period === 'week') earningsEl.textContent = formatCurrency(weekEarnings);
            else if (period === 'month') earningsEl.textContent = formatCurrency(monthEarnings);
        });
    });

    // Calendar navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        updateCalendar();
    });

    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        updateCalendar();
    });

    // Calendar day click
    document.getElementById('calendarGrid')?.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.day:not(.other-month)');
        if (dayEl && dayEl.dataset.date) {
            navigateTo('/appointments');
        }
    });

    // FAB
    document.getElementById('fabAdd')?.addEventListener('click', () => {
        if (isSubscriptionBlocked()) {
            showToast('Assinatura inativa. Não é possível criar novos agendamentos.', 'error');
            return;
        }
        navigateTo('/appointments');
    });
}

function updateCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    if (grid) grid.innerHTML = renderCalendar(currentMonth, currentYear, appointments);
    if (title) title.textContent = `${getMonthName(currentMonth)} de ${currentYear}`;
}

// ============================================
// CALENDAR RENDERER
// ============================================

function renderCalendar(month, year, appointments) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Previous month fill
    const prevMonthLast = new Date(year, month, 0).getDate();

    let html = `
        <div class="week-days" style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-weight:600;color:var(--text-muted);border-bottom:1px solid #eee;padding-bottom:10px;margin-bottom:10px;">
            <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div><div>Dom</div>
        </div>
        <div class="days-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#eee;">
    `;

    // Previous month days
    for (let i = startDow - 1; i >= 0; i--) {
        html += `<div class="day other-month" style="background:#fafafa;min-height:80px;padding:10px;font-size:0.9rem;color:#ddd;">${prevMonthLast - i}</div>`;
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayApps = appointments.filter(a => a.date === dateStr);
        const isToday = dateStr === todayStr;

        const todayStyle = isToday
            ? 'background:var(--primary-color);color:white;border-radius:8px;'
            : 'background:white;color:var(--text-muted);';

        let eventsHTML = '';
        const colors = ['#2196F3', '#00897B', '#9C27B0', '#E91E63'];
        dayApps.slice(0, 3).forEach((app, i) => {
            const clientName = getClientName(app.clientId);
            eventsHTML += `<div style="font-size:0.65rem;padding:2px 4px;border-radius:4px;margin-top:2px;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:${colors[i % colors.length]};">${app.startTime} ${clientName}</div>`;
        });
        if (dayApps.length > 3) {
            eventsHTML += `<div style="font-size:0.6rem;color:var(--text-muted);margin-top:2px;">+${dayApps.length - 3} mais</div>`;
        }

        html += `<div class="day" data-date="${dateStr}" style="${todayStyle}min-height:80px;padding:10px;font-size:0.9rem;cursor:pointer;">${d}${eventsHTML}</div>`;
    }

    // Next month fill
    const totalCells = startDow + daysInMonth;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        html += `<div class="day other-month" style="background:#fafafa;min-height:80px;padding:10px;font-size:0.9rem;color:#ddd;">${i}</div>`;
    }

    html += '</div>';
    return html;
}

function getClientName(clientId) {
    if (!clientId) return '';
    const client = clients.find(c => c.id === clientId);
    return client ? (client.name || '').split(' ')[0] : '';
}

function getMonthName(month) {
    const names = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return names[month];
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

function getWeekEnd(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

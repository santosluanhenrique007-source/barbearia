// ==========================================
// CLASSIC BARBERSHOP - SISTEMA DE AGENDAMENTO
// ==========================================

// CONFIGURAÇÃO - NÚMERO DO BARBEIRO (COM CÓDIGO DO PAÍS, SEM +)
// Exemplo: 5511999999999 para Brasil SP
const BARBER_WHATSAPP = '5511999999999'; // <-- ALTERE PARA O NÚMERO REAL

// Dados iniciais
const defaultServices = [
    { id: 1, name: 'Corte Clássico', price: 50, duration: '40 min', desc: 'Corte tradicional com acabamento na navalha' },
    { id: 2, name: 'Barba Premium', price: 40, duration: '30 min', desc: 'Modelagem completa com toalha quente e produtos' },
    { id: 3, name: 'Corte + Barba', price: 80, duration: '1h 10min', desc: 'Combo completo para o visual perfeito' },
    { id: 4, name: 'Tratamento VIP', price: 150, duration: '1h 30min', desc: 'Corte, barba, hidratação capilar e massagem' }
];

// Estado global
let services = [...defaultServices];
let schedules = [];
let bookings = [];
let currentStep = 1;
let bookingData = {
    service: null,
    date: null,
    time: null,
    clientName: '',
    clientPhone: '',
    notes: ''
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initDatePicker();
    renderServices();
    generateDefaultSchedules();
});

// ==========================================
// NAVEGAÇÃO
// ==========================================

function showSection(section) {
    // Esconde todas as seções
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
    });
    
    // Mostra a seção selecionada
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Se for admin, sempre começa com login limpo
    if (section === 'admin') {
        resetAdminView();
    }
}

function resetAdminView() {
    const loginDiv = document.getElementById('admin-login');
    const dashboardDiv = document.getElementById('admin-dashboard');
    const passwordInput = document.getElementById('admin-password');
    
    // Sempre resetar para estado inicial (login visível, dashboard escondido)
    loginDiv.classList.remove('hidden');
    dashboardDiv.classList.add('hidden');
    passwordInput.value = '';
    
    // Só mostrar dashboard se estiver autenticado
    const isAuthenticated = localStorage.getItem('barber_auth') === 'true';
    
    if (isAuthenticated) {
        loginDiv.classList.add('hidden');
        dashboardDiv.classList.remove('hidden');
        renderAdminServices();
        renderAdminSchedules();
        renderAdminBookings();
    }
}

// ==========================================
// FLUXO DE AGENDAMENTO (CLIENTE)
// ==========================================

function renderServices() {
    const container = document.getElementById('services-container');
    
    container.innerHTML = services.map(service => `
        <div class="service-card" onclick="selectService(${service.id})" id="service-${service.id}">
            <div class="service-name">${service.name}</div>
            <div class="service-price">R$ ${service.price.toFixed(2)}</div>
            <div class="service-duration">${service.duration}</div>
            <div class="service-desc">${service.desc}</div>
        </div>
    `).join('');
}

function selectService(serviceId) {
    bookingData.service = services.find(s => s.id === serviceId);
    
    // Atualiza UI
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(`service-${serviceId}`).classList.add('selected');
    
    // Vai para próximo passo
    setTimeout(() => {
        goToStep(2);
        renderTimeSlots();
    }, 300);
}

function initDatePicker() {
    const dateInput = document.getElementById('date-input');
    const today = new Date().toISOString().split('T')[0];
    
    // Define data mínima como hoje, mas deixa campo vazio
    dateInput.min = today;
    dateInput.value = '';
    bookingData.date = null;
    
    dateInput.addEventListener('change', (e) => {
        bookingData.date = e.target.value;
        renderTimeSlots();
    });
}

function renderTimeSlots() {
    const container = document.getElementById('time-container');
    
    // Se não tiver data selecionada, mostra mensagem
    if (!bookingData.date) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>Selecione uma data para ver os horários disponíveis.</p>
            </div>
        `;
        return;
    }
    
    const daySlots = schedules.filter(s => s.date === bookingData.date);
    daySlots.sort((a, b) => a.time.localeCompare(b.time));
    
    if (daySlots.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <p>Nenhum horário disponível para esta data.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = daySlots.map(slot => {
        const isOccupied = !slot.available;
        
        if (isOccupied) {
            return `<div class="time-slot disabled" title="Horário já agendado">${slot.time}</div>`;
        }
        
        return `
            <div class="time-slot" onclick="selectTime('${slot.time}')" id="time-${slot.time.replace(':', '-')}">
                ${slot.time}
            </div>
        `;
    }).join('');
}

function selectTime(time) {
    bookingData.time = time;
    
    // Atualiza UI
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    document.getElementById(`time-${time.replace(':', '-')}`).classList.add('selected');
    
    // Vai para confirmação
    setTimeout(() => {
        updateSummary();
        goToStep(3);
    }, 300);
}

function updateSummary() {
    document.getElementById('summary-service').textContent = bookingData.service.name;
    document.getElementById('summary-date').textContent = formatDate(bookingData.date);
    document.getElementById('summary-time').textContent = bookingData.time;
    document.getElementById('summary-price').textContent = `R$ ${bookingData.service.price.toFixed(2)}`;
}

function goToStep(step) {
    // Esconde passo atual
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    
    // Mostra novo passo
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    
    // Scroll para topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// ENVIO WHATSAPP
// ==========================================

function sendToWhatsApp() {
    // Validação
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const notes = document.getElementById('client-notes').value.trim();
    
    if (!name || !phone) {
        alert('Por favor, preencha seu nome e telefone.');
        return;
    }
    
    if (!bookingData.service || !bookingData.date || !bookingData.time) {
        alert('Erro: Dados do agendamento incompletos.');
        return;
    }
    
    // Salva dados do cliente
    bookingData.clientName = name;
    bookingData.clientPhone = phone;
    bookingData.notes = notes;
    
    // Marca horário como ocupado
    const schedule = schedules.find(s => 
        s.date === bookingData.date && s.time === bookingData.time
    );
    if (schedule) {
        schedule.available = false;
    }
    
    // Salva agendamento no histórico
    const booking = {
        id: Date.now(),
        ...bookingData,
        createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    
    // Monta mensagem
    const message = formatWhatsAppMessage(booking);
    
    // Codifica para URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${BARBER_WHATSAPP}?text=${encodedMessage}`;
    
    // Abre WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Reseta fluxo após 2 segundos
    setTimeout(() => {
        resetBookingFlow();
    }, 2000);
}

function formatWhatsAppMessage(booking) {
    return `*NOVO AGENDAMENTO - CLASSIC BARBERSHOP*

*Cliente:* ${booking.clientName}
*Telefone:* ${booking.clientPhone}

*Serviço:* ${booking.service.name}
*Data:* ${formatDate(booking.date)}
*Horário:* ${booking.time}
*Valor:* R$ ${booking.service.price.toFixed(2)}

${booking.notes ? `*Observações:* ${booking.notes}` : ''}

---
Agendamento realizado em ${new Date().toLocaleString('pt-BR')}`;
}

function resetBookingFlow() {
    // Reseta dados
    bookingData = {
        service: null,
        date: null,
        time: null,
        clientName: '',
        clientPhone: '',
        notes: ''
    };
    
    // Reseta UI
    document.getElementById('client-name').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('client-notes').value = '';
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    
    // Volta para passo 1
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = 1;
    document.getElementById('step-1').classList.add('active');
    
    // Recarrega horários
    renderTimeSlots();
}

// ==========================================
// ADMIN - AUTENTICAÇÃO
// ==========================================

const ADMIN_PASSWORD = 'barbearia2024';

function login() {
    const input = document.getElementById('admin-password');
    const password = input.value;
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('barber_auth', 'true');
        
        // Esconde login, mostra dashboard
        document.getElementById('admin-login').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        
        // Renderiza dados
        renderAdminServices();
        renderAdminSchedules();
        renderAdminBookings();
    } else {
        alert('Senha incorreta. Tente novamente.');
        input.value = '';
        input.focus();
    }
}

function logout() {
    localStorage.removeItem('barber_auth');
    resetAdminView();
}

// ==========================================
// ADMIN - TABS
// ==========================================

function switchTab(tabName, btnElement) {
    // Atualiza botões
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    
    // Atualiza painéis
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`panel-${tabName}`).classList.add('active');
}

// ==========================================
// ADMIN - SERVIÇOS
// ==========================================

function renderAdminServices() {
    const container = document.getElementById('admin-services-list');
    
    if (services.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado.</div>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <div class="data-item">
            <div class="data-item-info">
                <h4>${service.name}</h4>
                <p>${service.duration} • ${service.desc}</p>
            </div>
            <div class="data-item-price">R$ ${service.price.toFixed(2)}</div>
            <div class="data-item-actions">
                <button class="btn-icon" onclick="deleteService(${service.id})" title="Remover">×</button>
            </div>
        </div>
    `).join('');
}

function toggleServiceForm() {
    const form = document.getElementById('service-form');
    form.classList.toggle('hidden');
}

function addService() {
    const name = document.getElementById('new-service-name').value.trim();
    const price = parseFloat(document.getElementById('new-service-price').value);
    const duration = document.getElementById('new-service-duration').value.trim();
    const desc = document.getElementById('new-service-desc').value.trim();
    
    if (!name || !price || !duration) {
        alert('Preencha nome, preço e duração.');
        return;
    }
    
    services.push({
        id: Date.now(),
        name,
        price,
        duration,
        desc
    });
    
    // Limpa form
    document.getElementById('new-service-name').value = '';
    document.getElementById('new-service-price').value = '';
    document.getElementById('new-service-duration').value = '';
    document.getElementById('new-service-desc').value = '';
    
    toggleServiceForm();
    renderAdminServices();
    renderServices(); // Atualiza view do cliente também
}

function deleteService(id) {
    if (!confirm('Deseja remover este serviço?')) return;
    
    services = services.filter(s => s.id !== id);
    renderAdminServices();
    renderServices();
}

// ==========================================
// ADMIN - HORÁRIOS
// ==========================================

function generateDefaultSchedules() {
    // Gera horários para os próximos 7 dias
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
        
        times.forEach(time => {
            // Verifica se já existe
            const exists = schedules.some(s => s.date === dateStr && s.time === time);
            if (!exists) {
                schedules.push({
                    id: Date.now() + Math.random(),
                    date: dateStr,
                    time: time,
                    available: true
                });
            }
        });
    }
}

function renderAdminSchedules() {
    const container = document.getElementById('admin-schedules-list');
    
    // Agrupa por data
    const grouped = schedules.reduce((acc, schedule) => {
        if (!acc[schedule.date]) acc[schedule.date] = [];
        acc[schedule.date].push(schedule);
        return acc;
    }, {});
    
    // Ordena datas
    const sortedDates = Object.keys(grouped).sort();
    
    if (sortedDates.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum horário cadastrado.</div>';
        return;
    }
    
    container.innerHTML = sortedDates.map(date => {
        const slots = grouped[date].sort((a, b) => a.time.localeCompare(b.time));
        
        return `
            <div class="data-item" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
                <div style="font-weight: 600; color: var(--accent);">${formatDate(date)}</div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${slots.map(slot => `
                        <span class="time-badge ${slot.available ? 'available' : 'occupied'}" 
                              style="padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; border: 1px solid var(--gray-mid);">
                            ${slot.time} ${slot.available ? '✓' : '✗'}
                            <button onclick="deleteSchedule(${slot.id})" style="margin-left: 0.5rem; background: none; border: none; color: var(--gray-muted); cursor: pointer;">×</button>
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function toggleScheduleForm() {
    const form = document.getElementById('schedule-form');
    form.classList.toggle('hidden');
}

function addSchedule() {
    const date = document.getElementById('new-schedule-date').value;
    const time = document.getElementById('new-schedule-time').value;
    
    if (!date || !time) {
        alert('Selecione data e horário.');
        return;
    }
    
    // Verifica se já existe
    const exists = schedules.some(s => s.date === date && s.time === time);
    if (exists) {
        alert('Este horário já existe.');
        return;
    }
    
    schedules.push({
        id: Date.now(),
        date,
        time,
        available: true
    });
    
    document.getElementById('new-schedule-date').value = '';
    document.getElementById('new-schedule-time').value = '';
    
    toggleScheduleForm();
    renderAdminSchedules();
}

function deleteSchedule(id) {
    if (!confirm('Remover este horário?')) return;
    
    schedules = schedules.filter(s => s.id !== id);
    renderAdminSchedules();
}

// ==========================================
// ADMIN - AGENDAMENTOS
// ==========================================

function renderAdminBookings() {
    const container = document.getElementById('admin-bookings-list');
    
    if (bookings.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum agendamento realizado ainda.</div>';
        return;
    }
    
    // Ordena por data mais recente primeiro
    const sorted = [...bookings].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    container.innerHTML = sorted.map(booking => `
        <div class="data-item" style="border-left: 3px solid var(--accent);">
            <div class="data-item-info">
                <h4>${booking.clientName}</h4>
                <p>${booking.service.name} • ${formatDate(booking.date)} às ${booking.time}</p>
                <p style="font-size: 0.8rem; color: var(--gray-muted); margin-top: 0.25rem;">
                    Tel: ${booking.clientPhone}
                </p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--accent);">
                    R$ ${booking.service.price.toFixed(2)}
                </div>
                <div style="font-size: 0.75rem; color: var(--gray-muted); margin-top: 0.25rem;">
                    ${new Date(booking.createdAt).toLocaleString('pt-BR')}
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// UTILITÁRIOS
// ==========================================

function formatDate(dateString) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', options);
}
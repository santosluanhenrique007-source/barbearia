// ==========================================
// ADMIN SYSTEM - Classic Barbershop
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initAdminSystem();
    loadServicesFromStorage(); // Carrega serviços salvos
});

// Admin State
let adminState = {
    isLoggedIn: false,
    currentTab: 'appointments'
};

// Default credentials
const ADMIN_CREDENTIALS = {
    username: 'admin',
    passwordHash: btoa('barber2024')
};

// Carrega serviços do localStorage ou usa os padrões
function loadServicesFromStorage() {
    const savedServices = utils.storage.get('services', null);
    if (savedServices) {
        // Atualiza o array servicesData com os dados salvos
        servicesData.length = 0;
        savedServices.forEach(s => servicesData.push(s));
    }
}

function initAdminSystem() {
    const modal = document.getElementById('adminModal');
    const loginLink = document.querySelector('.admin-link');
    const closeBtn = document.getElementById('closeModal');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    loginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        openAdminModal();
    });
    
    closeBtn?.addEventListener('click', closeAdminModal);
    
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeAdminModal();
    });
    
    loginForm?.addEventListener('submit', handleLogin);
    logoutBtn?.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    checkSession();
}

function openAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (adminState.isLoggedIn) {
        showDashboard();
        loadAppointments();
    } else {
        showLogin();
    }
}

function closeAdminModal() {
    const modal = document.getElementById('adminModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function showLogin() {
    document.getElementById('adminLogin')?.classList.remove('hidden');
    document.getElementById('adminDashboard')?.classList.add('hidden');
}

function showDashboard() {
    document.getElementById('adminLogin')?.classList.add('hidden');
    document.getElementById('adminDashboard')?.classList.remove('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;
    
    if (username === ADMIN_CREDENTIALS.username && btoa(password) === ADMIN_CREDENTIALS.passwordHash) {
        adminState.isLoggedIn = true;
        
        const session = {
            username: username,
            token: utils.generateId(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        utils.storage.set('adminSession', session);
        
        toast.show('Login realizado com sucesso!', 'success');
        showDashboard();
        loadAppointments();
        
        e.target.reset();
    } else {
        toast.show('Credenciais inválidas', 'error');
        shakeElement(document.getElementById('adminLogin'));
    }
}

function handleLogout() {
    adminState.isLoggedIn = false;
    utils.storage.remove('adminSession');
    toast.show('Logout realizado', 'success');
    showLogin();
}

function checkSession() {
    const session = utils.storage.get('adminSession');
    if (session && new Date(session.expires) > new Date()) {
        adminState.isLoggedIn = true;
    }
}

function switchTab(tab) {
    adminState.currentTab = tab;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    
    if (tab === 'appointments') loadAppointments();
    if (tab === 'services') loadServicesManager();
    if (tab === 'schedule') loadScheduleManager();
}

// ==========================================
// APPOINTMENTS
// ==========================================

function loadAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    
    const appointments = utils.storage.get('appointments', [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (appointments.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum agendamento encontrado</p>';
        return;
    }
    
    container.innerHTML = appointments.map(apt => {
        const date = new Date(apt.date);
        const isPast = date < new Date();
        
        // Link do WhatsApp
        const whatsappLink = generateWhatsAppLink(apt);
        
        return `
            <div class="appointment-item ${isPast ? 'past' : ''}" data-id="${apt.id}">
                <div class="appointment-time">
                    <span class="day">${date.getDate()}</span>
                    <span class="month">${date.toLocaleDateString('pt-BR', { month: 'short' })}</span>
                </div>
                <div class="appointment-info">
                    <h4>${apt.client.name}</h4>
                    <p>
                        <i class="fas fa-cut"></i> ${apt.service.name} | 
                        <i class="far fa-clock"></i> ${apt.time} | 
                        <i class="fas fa-phone"></i> ${apt.client.phone}
                    </p>
                    ${apt.client.notes ? `<p class="notes"><i class="fas fa-comment"></i> ${apt.client.notes}</p>` : ''}
                </div>
                <div class="appointment-actions">
                    <span class="appointment-status status-${apt.status}">${apt.status}</span>
                    <a href="${whatsappLink}" target="_blank" class="btn-icon btn-sm whatsapp-btn" title="Enviar WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </a>
                    ${!isPast && apt.status !== 'cancelled' ? `
                        <button class="btn-icon btn-sm" onclick="cancelAppointment('${apt.id}')" title="Cancelar">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function generateWhatsAppLink(appointment) {
    const phone = appointment.client.phone.replace(/\D/g, '');
    const date = new Date(appointment.date).toLocaleDateString('pt-BR');
    
    const message = `Olá ${appointment.client.name}! 
Confirmamos seu agendamento na Classic Barbershop:

📅 Data: ${date}
⏰ Horário: ${appointment.time}
✂️ Serviço: ${appointment.service.name}
💰 Valor: ${utils.formatCurrency(appointment.service.price)}

Endereço: Rua dos Barbeiros, 123
Telefone: (11) 99999-9999

Aguardamos você! 💈`;

    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}

function cancelAppointment(id) {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    
    const appointments = utils.storage.get('appointments', []);
    const index = appointments.findIndex(a => a.id === id);
    
    if (index !== -1) {
        appointments[index].status = 'cancelled';
        utils.storage.set('appointments', appointments);
        loadAppointments();
        toast.show('Agendamento cancelado', 'warning');
    }
}

// ==========================================
// SERVICES MANAGER - CRUD Completo
// ==========================================

function loadServicesManager() {
    const container = document.getElementById('servicesManager');
    if (!container) return;
    
    container.innerHTML = `
        <div class="services-editor">
            <div class="services-header">
                <div>
                    <h3>Gerenciar Serviços</h3>
                    <p class="hint">Adicione, edite ou remova serviços</p>
                </div>
                <button class="btn btn-primary" onclick="openAddServiceModal()">
                    <i class="fas fa-plus"></i> Novo Serviço
                </button>
            </div>
            
            <div class="services-list-admin">
                ${servicesData.map((service, index) => `
                    <div class="service-edit-card" data-id="${service.id}">
                        <div class="service-edit-main">
                            <div class="service-icon-selector">
                                <i class="fas ${service.icon}"></i>
                                <select onchange="updateServiceIcon('${service.id}', this.value)">
                                    ${getIconOptions(service.icon)}
                                </select>
                            </div>
                            <div class="service-edit-fields">
                                <input type="text" value="${service.name}" 
                                       onchange="updateServiceField('${service.id}', 'name', this.value)"
                                       placeholder="Nome do serviço" class="service-name-input">
                                <textarea onchange="updateServiceField('${service.id}', 'description', this.value)"
                                          placeholder="Descrição" rows="2">${service.description}</textarea>
                            </div>
                        </div>
                        <div class="service-edit-details">
                            <div class="field-group">
                                <label>Preço (R$)</label>
                                <input type="number" value="${service.price}" step="0.01" min="0"
                                       onchange="updateServiceField('${service.id}', 'price', parseFloat(this.value))">
                            </div>
                            <div class="field-group">
                                <label>Duração (min)</label>
                                <input type="number" value="${service.duration}" step="5" min="15"
                                       onchange="updateServiceField('${service.id}', 'duration', parseInt(this.value))">
                            </div>
                            <button class="btn-icon btn-danger" onclick="deleteService('${service.id}')" title="Remover serviço">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="services-actions">
                <button class="btn btn-primary btn-lg" onclick="saveAllServices()">
                    <i class="fas fa-save"></i> Salvar Todas as Alterações
                </button>
            </div>
        </div>
    `;
}

function getIconOptions(selectedIcon) {
    const icons = [
        { value: 'fa-cut', label: 'Tesoura' },
        { value: 'fa-user-tie', label: 'Gravata' },
        { value: 'fa-star', label: 'Estrela' },
        { value: 'fa-crown', label: 'Coroa' },
        { value: 'fa-magic', label: 'Mágica' },
        { value: 'fa-fire', label: 'Fogo' },
        { value: 'fa-bolt', label: 'Raio' },
        { value: 'fa-gem', label: 'Diamante' },
        { value: 'fa-trophy', label: 'Troféu' },
        { value: 'fa-heart', label: 'Coração' }
    ];
    
    return icons.map(i => 
        `<option value="${i.value}" ${i.value === selectedIcon ? 'selected' : ''}>${i.label}</option>`
    ).join('');
}

function updateServiceField(id, field, value) {
    const service = servicesData.find(s => s.id === id);
    if (service) {
        service[field] = value;
    }
}

function updateServiceIcon(id, newIcon) {
    const service = servicesData.find(s => s.id === id);
    if (service) {
        service.icon = newIcon;
        // Atualiza visualmente o ícone
        const card = document.querySelector(`.service-edit-card[data-id="${id}"]`);
        if (card) {
            card.querySelector('.service-icon-selector i').className = `fas ${newIcon}`;
        }
    }
}

function deleteService(id) {
    if (!confirm('Tem certeza que deseja remover este serviço?')) return;
    
    const index = servicesData.findIndex(s => s.id === id);
    if (index > -1) {
        servicesData.splice(index, 1);
        loadServicesManager(); // Recarrega a lista
        toast.show('Serviço removido', 'warning');
    }
}

function openAddServiceModal() {
    // Cria modal dinâmico para adicionar serviço
    const modalHtml = `
        <div class="modal-overlay" id="addServiceModal" onclick="if(event.target === this) closeAddServiceModal()">
            <div class="modal-content-small">
                <div class="modal-header">
                    <h3>Adicionar Novo Serviço</h3>
                    <button class="btn-icon" onclick="closeAddServiceModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="addServiceForm" onsubmit="handleAddService(event)">
                    <div class="form-group">
                        <label>Nome do Serviço *</label>
                        <input type="text" id="newServiceName" required placeholder="Ex: Corte Degradê">
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea id="newServiceDesc" rows="2" placeholder="Descreva o serviço"></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Preço (R$) *</label>
                            <input type="number" id="newServicePrice" required step="0.01" min="0" placeholder="50.00">
                        </div>
                        <div class="form-group">
                            <label>Duração (min) *</label>
                            <input type="number" id="newServiceDuration" required step="5" min="15" value="30">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Ícone</label>
                        <select id="newServiceIcon">
                            ${getIconOptions('fa-cut')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeAddServiceModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar Serviço</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('addServiceModal').classList.add('active');
}

function closeAddServiceModal() {
    const modal = document.getElementById('addServiceModal');
    if (modal) modal.remove();
}

function handleAddService(e) {
    e.preventDefault();
    
    const newService = {
        id: 'service_' + Date.now(),
        name: document.getElementById('newServiceName').value,
        description: document.getElementById('newServiceDesc').value,
        price: parseFloat(document.getElementById('newServicePrice').value),
        duration: parseInt(document.getElementById('newServiceDuration').value),
        icon: document.getElementById('newServiceIcon').value
    };
    
    servicesData.push(newService);
    closeAddServiceModal();
    loadServicesManager();
    toast.show('Serviço adicionado com sucesso!', 'success');
}

function saveAllServices() {
    // Salva no localStorage
    utils.storage.set('services', servicesData);
    
    // Atualiza a exibição pública
    initServices();
    
    toast.show('Serviços salvos e atualizados!', 'success');
}

// ==========================================
// SCHEDULE MANAGER
// ==========================================

function loadScheduleManager() {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;
    
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const schedule = utils.storage.get('schedule', getDefaultSchedule());
    
    container.innerHTML = days.map((day, index) => `
        <div class="schedule-day">
            <h4>${day}</h4>
            <div class="schedule-hours">
                <label class="toggle-switch">
                    <input type="checkbox" ${schedule[index].active ? 'checked' : ''} 
                           onchange="toggleDay(${index})">
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">${schedule[index].active ? 'Aberto' : 'Fechado'}</span>
                </label>
                <div class="hours-inputs" ${schedule[index].active ? '' : 'style="opacity:0.5;pointer-events:none"'}>
                    <input type="time" value="${schedule[index].open}" 
                           onchange="updateHour(${index}, 'open', this.value)">
                    <span>até</span>
                    <input type="time" value="${schedule[index].close}" 
                           onchange="updateHour(${index}, 'close', this.value)">
                </div>
            </div>
        </div>
    `).join('');
}

function getDefaultSchedule() {
    return [
        { active: false, open: '09:00', close: '18:00' },
        { active: true, open: '09:00', close: '20:00' },
        { active: true, open: '09:00', close: '20:00' },
        { active: true, open: '09:00', close: '20:00' },
        { active: true, open: '09:00', close: '20:00' },
        { active: true, open: '09:00', close: '20:00' },
        { active: true, open: '09:00', close: '18:00' },
    ];
}

function toggleDay(index) {
    const schedule = utils.storage.get('schedule', getDefaultSchedule());
    schedule[index].active = !schedule[index].active;
    utils.storage.set('schedule', schedule);
    loadScheduleManager();
}

function updateHour(index, field, value) {
    const schedule = utils.storage.get('schedule', getDefaultSchedule());
    schedule[index][field] = value;
    utils.storage.set('schedule', schedule);
}

// Utility: Shake element
function shakeElement(element) {
    element.style.animation = 'shake 0.5s';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

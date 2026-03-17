// ==========================================
// BOOKING SYSTEM - Classic Barbershop
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initServices();
    initBookingSystem();
});

// Services Data
const servicesData = [
    {
        id: 'corte-classico',
        name: 'Corte Clássico',
        price: 50.00,
        duration: 40,
        description: 'Corte tradicional com acabamento na navalha',
        icon: 'fa-cut'
    },
    {
        id: 'barba-premium',
        name: 'Barba Premium',
        price: 40.00,
        duration: 30,
        description: 'Modelagem completa com toalha quente e produtos',
        icon: 'fa-user-tie'
    },
    {
        id: 'combo',
        name: 'Corte + Barba',
        price: 80.00,
        duration: 70,
        description: 'Combo completo para o visual perfeito',
        icon: 'fa-star'
    },
    {
        id: 'vip',
        name: 'Tratamento VIP',
        price: 150.00,
        duration: 90,
        description: 'Corte, barba, hidratação capilar e massagem',
        icon: 'fa-crown'
    }
];

// Initialize Services Display
function initServices() {
    const grid = document.getElementById('servicesGrid');
    const options = document.getElementById('serviceOptions');
    
    // Carrega serviços salvos do admin
    const savedServices = utils.storage.get('services', null);
    if (savedServices) {
        servicesData.length = 0;
        savedServices.forEach(s => servicesData.push(s));
    }
    
    if (grid) {
        grid.innerHTML = servicesData.map(service => `
            <div class="service-card" data-service="${service.id}">
                <i class="fas ${service.icon} service-icon"></i>
                <h3 class="service-name">${service.name}</h3>
                <p class="service-price">${utils.formatCurrency(service.price)}</p>
                <p class="service-duration">
                    <i class="far fa-clock"></i> ${service.duration} min
                </p>
                <p class="service-description">${service.description}</p>
                <button class="btn btn-outline select-service-btn" data-service="${service.id}">
                    Selecionar
                </button>
            </div>
        `).join('');
        
        grid.querySelectorAll('.select-service-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const serviceId = btn.dataset.service;
                selectService(serviceId);
                document.getElementById('agendamento').scrollIntoView({ behavior: 'smooth' });
            });
        });
    }
    
    if (options) {
        renderServiceOptions();
    }
}

function renderServiceOptions() {
    const options = document.getElementById('serviceOptions');
    if (!options) return;
    
    options.innerHTML = servicesData.map(service => `
        <label class="service-option" data-service="${service.id}">
            <input type="radio" name="service" value="${service.id}" required>
            <div class="option-info">
                <h4>${service.name}</h4>
                <p>${service.duration} min • ${service.description}</p>
            </div>
            <span class="option-price">${utils.formatCurrency(service.price)}</span>
        </label>
    `).join('');
}

// Booking State
let bookingState = {
    step: 1,
    service: null,
    date: null,
    time: null,
    client: {
        name: '',
        phone: '',
        email: '',
        notes: ''
    }
};

// Initialize Booking System
function initBookingSystem() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    
    // Service selection
    document.getElementById('serviceOptions')?.addEventListener('click', (e) => {
        const option = e.target.closest('.service-option');
        if (!option) return;
        
        document.querySelectorAll('.service-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        option.querySelector('input').checked = true;
        
        const serviceId = option.dataset.service;
        bookingState.service = servicesData.find(s => s.id === serviceId);
        updateBookingSummary();
        updateStepIndicator(1);
        enableNextButton(1);
    });
    
    // Navigation buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => nextStep());
    });
    
    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => prevStep());
    });
    
    // Calendar initialization
    initCalendar();
    
    // Phone mask
    const phoneInput = document.getElementById('clientPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = utils.maskPhone(e.target.value);
            validateStep3();
        });
    }
    
    // Name validation
    document.getElementById('clientName')?.addEventListener('input', validateStep3);
    
    // Form submission - AQUI ESTÁ A MÁGICA: Salva E envia WhatsApp
    form.addEventListener('submit', handleBookingSubmit);
}

// Step Navigation
function nextStep() {
    if (bookingState.step < 3) {
        bookingState.step++;
        showStep(bookingState.step);
        updateStepIndicator(bookingState.step);
    }
}

function prevStep() {
    if (bookingState.step > 1) {
        bookingState.step--;
        showStep(bookingState.step);
        updateStepIndicator(bookingState.step);
    }
}

function showStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.form-step[data-step="${step}"]`)?.classList.add('active');
    
    if (step === 1) {
        enableNextButton(1);
    } else if (step === 2) {
        enableNextButton(2);
    } else if (step === 3) {
        validateStep3();
    }
}

function updateStepIndicator(currentStep) {
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
}

function enableNextButton(step) {
    const btn = document.querySelector(`.form-step[data-step="${step}"] .btn-next`);
    if (!btn) return;
    
    let isValid = false;
    if (step === 1) {
        isValid = bookingState.service !== null;
    } else if (step === 2) {
        isValid = bookingState.date !== null && bookingState.time !== null;
    }
    
    btn.disabled = !isValid;
}

// Calendar System
let currentDate = new Date();
let selectedDate = null;

function initCalendar() {
    renderCalendar();
    
    document.getElementById('prevMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    document.getElementById('nextMonth')?.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('currentMonth');
    if (!grid || !monthLabel) return;
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthLabel.textContent = new Date(year, month).toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    let html = '';
    
    const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    dayHeaders.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day disabled"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isToday = date.toDateString() === today.toDateString();
        const isPast = date < new Date(today.setHours(0, 0, 0, 0));
        const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isPast) classes += ' disabled';
        if (isSelected) classes += ' selected';
        
        html += `<div class="${classes}" data-day="${day}" ${isPast ? '' : 'onclick="selectDate(' + day + ')"'}>
            ${day}
        </div>`;
    }
    
    grid.innerHTML = html;
}

function selectDate(day) {
    selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    bookingState.date = selectedDate;
    renderCalendar();
    renderTimeSlots();
    enableNextButton(2);
}

function renderTimeSlots() {
    const container = document.getElementById('timeSlots');
    if (!container || !selectedDate) return;
    
    const slots = generateTimeSlots();
    const bookedSlots = getBookedSlots(selectedDate);
    
    container.innerHTML = '<div class="time-slots-grid">' + 
        slots.map(time => {
            const isBooked = bookedSlots.includes(time);
            const isSelected = bookingState.time === time;
            let classes = 'time-slot';
            if (isBooked) classes += ' disabled';
            if (isSelected) classes += ' selected';
            
            return `<div class="${classes}" onclick="${isBooked ? '' : `selectTime('${time}')`}">
                ${time}
            </div>`;
        }).join('') + 
    '</div>';
}

function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour <= 19; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        if (hour !== 19) {
            slots.push(`${hour.toString().padStart(2, '0')}:30`);
        }
    }
    return slots;
}

function getBookedSlots(date) {
    const appointments = utils.storage.get('appointments', []);
    const dateStr = date.toDateString();
    return appointments
        .filter(a => new Date(a.date).toDateString() === dateStr && a.status !== 'cancelled')
        .map(a => a.time);
}

function selectTime(time) {
    bookingState.time = time;
    renderTimeSlots();
    updateBookingSummary();
    enableNextButton(2);
}

// Validation Step 3
function validateStep3() {
    const name = document.getElementById('clientName')?.value.trim();
    const phone = document.getElementById('clientPhone')?.value.trim();
    
    const nameValid = name.length >= 3;
    const phoneValid = phone.replace(/\D/g, '').length >= 11;
    
    const btn = document.querySelector('.form-step[data-step="3"] .btn-submit');
    if (btn) {
        btn.disabled = !(nameValid && phoneValid);
    }
    
    bookingState.client.name = name;
    bookingState.client.phone = phone;
    bookingState.client.email = document.getElementById('clientEmail')?.value || '';
    bookingState.client.notes = document.getElementById('clientNotes')?.value || '';
    
    updateBookingSummary();
}

function updateBookingSummary() {
    const summary = document.getElementById('bookingSummary');
    if (!summary) return;
    
    if (!bookingState.service) {
        summary.innerHTML = '<p class="select-date-msg">Selecione um serviço para continuar</p>';
        return;
    }
    
    let html = `
        <div class="summary-row">
            <span>Serviço:</span>
            <span>${bookingState.service.name}</span>
        </div>
        <div class="summary-row">
            <span>Duração:</span>
            <span>${bookingState.service.duration} min</span>
        </div>
    `;
    
    if (bookingState.date) {
        html += `
            <div class="summary-row">
                <span>Data:</span>
                <span>${utils.formatDate(bookingState.date)}</span>
            </div>
        `;
    }
    
    if (bookingState.time) {
        html += `
            <div class="summary-row">
                <span>Horário:</span>
                <span>${bookingState.time}</span>
            </div>
        `;
    }
    
    html += `
        <div class="summary-row">
            <span>Total:</span>
            <span>${utils.formatCurrency(bookingState.service.price)}</span>
        </div>
    `;
    
    summary.innerHTML = html;
}

// ==========================================
// FORM SUBMISSION - SALVA E ENVIA WHATSAPP
// ==========================================

function handleBookingSubmit(e) {
    e.preventDefault();
    
    // Validações
    if (!bookingState.service || !bookingState.date || !bookingState.time) {
        toast.show('Preencha todas as informações', 'error');
        return;
    }
    
    const name = document.getElementById('clientName').value.trim();
    const phone = document.getElementById('clientPhone').value.trim();
    const email = document.getElementById('clientEmail')?.value.trim() || '';
    const notes = document.getElementById('clientNotes')?.value.trim() || '';
    
    // Validação extra
    if (name.length < 3 || phone.replace(/\D/g, '').length < 11) {
        toast.show('Preencha nome e telefone corretamente', 'error');
        return;
    }
    
    // Cria objeto do agendamento
    const appointment = {
        id: utils.generateId(),
        service: bookingState.service,
        date: bookingState.date.toISOString(),
        time: bookingState.time,
        client: {
            name: name,
            phone: phone,
            email: email,
            notes: notes
        },
        status: 'confirmed',
        createdAt: new Date().toISOString()
    };
    
    // 1. SALVA NO LOCALSTORAGE
    const appointments = utils.storage.get('appointments', []);
    appointments.push(appointment);
    utils.storage.set('appointments', appointments);
    
    // 2. ENVIA PARA WHATSAPP IMEDIATAMENTE
    sendToWhatsApp(appointment);
    
    // 3. MOSTRA CONFIRMAÇÃO
    toast.show('Agendamento salvo! Abrindo WhatsApp...', 'success');
    
    // 4. LIMPA FORMULÁRIO APÓS 2 SEGUNDOS
    setTimeout(() => {
        resetBookingForm();
    }, 2000);
}

// ==========================================
// WHATSAPP INTEGRATION
// ==========================================

function sendToWhatsApp(appointment) {
    const phone = appointment.client.phone.replace(/\D/g, '');
    
    const date = new Date(appointment.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    const message = `*Classic Barbershop - Confirmação de Agendamento* 💈

Olá, ${appointment.client.name}! Seu agendamento foi confirmado:

✂️ *Serviço:* ${appointment.service.name}
📅 *Data:* ${date}
⏰ *Horário:* ${appointment.time}
💰 *Valor:* ${utils.formatCurrency(appointment.service.price)}
⏱️ *Duração:* ${appointment.service.duration} min

📍 *Endereço:*
Rua dos Barbeiros, 123
Bairro Jardim, São Paulo - SP

📞 *Contato:* (11) 99999-9999

${appointment.client.notes ? `📝 *Observações:* ${appointment.client.notes}

` : ''}Aguardamos você! Se precisar remarcar, é só nos chamar. 👍`;

    // Monta URL do WhatsApp
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    
    // Abre WhatsApp em nova aba imediatamente
    window.open(whatsappUrl, '_blank');
}

// ==========================================
// UTILITIES
// ==========================================

function resetBookingForm() {
    bookingState = {
        step: 1,
        service: null,
        date: null,
        time: null,
        client: { name: '', phone: '', email: '', notes: '' }
    };
    
    document.getElementById('bookingForm')?.reset();
    document.querySelectorAll('.service-option').forEach(o => o.classList.remove('selected'));
    selectedDate = null;
    
    showStep(1);
    updateStepIndicator(1);
    renderCalendar();
    document.getElementById('timeSlots').innerHTML = '<p class="select-date-msg">Selecione uma data primeiro</p>';
    updateBookingSummary();
}

function selectService(serviceId) {
    // Aguarda renderização das opções
    setTimeout(() => {
        const option = document.querySelector(`.service-option[data-service="${serviceId}"]`);
        if (option) {
            option.click();
            nextStep();
        }
    }, 100);
}
/* ============================================
   KERNEL PLANNER - APLICAÇÃO PRINCIPAL
   Gerenciamento de estado e funcionalidades
   ============================================ */

// ============================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================

const App = {
    tasks: [],
    currentView: 'day', // 'day' ou 'week'
    currentTask: null, // tarefa sendo editada
    apiBaseUrl: window.__KERNEL_PLANNER_API__ || '',
    
    // Inicializar a aplicação
    async init() {
        this.setupEventListeners();
        this.setTodayAsDefault();
        await this.loadTasks();
        this.render();
    },
    
    getApiUrl(endpoint) {
        const base = this.apiBaseUrl || '';
        return `${base}${endpoint}`;
    },
    
    cacheTasks() {
        try {
            localStorage.setItem('kernel-planner-cache', JSON.stringify(this.tasks));
        } catch (err) {
            console.warn('Não foi possível armazenar cache local das tarefas.', err);
        }
    },
    
    loadTasksFromCache() {
        try {
            const stored = localStorage.getItem('kernel-planner-cache');
            if (stored) {
                this.tasks = JSON.parse(stored);
            }
        } catch (err) {
            console.warn('Falha ao carregar cache local de tarefas.', err);
        }
    },
    
    // Carregar tarefas do servidor (com fallback para cache local)
    async loadTasks() {
        try {
            const response = await fetch(this.getApiUrl('/api/tasks'));
            if (!response.ok) {
                throw new Error(`Falha ${response.status}`);
            }
            this.tasks = await response.json();
            this.cacheTasks();
        } catch (err) {
            console.warn('Não foi possível carregar as tarefas do servidor. Usando cache local.', err);
            this.loadTasksFromCache();
        }
    },
    
    // Configurar todos os event listeners
    setupEventListeners() {
        // Botão para adicionar nova tarefa
        document.getElementById('btn-add-task').addEventListener('click', () => {
            this.openTaskModal();
        });
        
        // Botões de navegação (dia/semana)
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // Fechar modal
        document.getElementById('btn-close-modal').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        document.getElementById('btn-cancel').addEventListener('click', () => {
            this.closeTaskModal();
        });
        
        // Enviar formulário de tarefa
        document.getElementById('task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveTask();
        });
        
        // Filtro de categoria
        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filterByCategory(e.target.value);
        });
        
        // Fechar modal ao clicar fora
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
    },
    
    // Trocar entre view de dia e semana
    switchView(view) {
        this.currentView = view;
        
        // Atualizar botões ativos
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Atualizar views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.toggle('active', v.id === `view-${view}`);
        });
        
        this.render();
    },
    
    // Definir data de hoje como padrão no modal
    setTodayAsDefault() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-date').value = today;
    },
    
    // Abrir modal de tarefa (novo ou edição)
    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        modal.classList.add('active');
        
        if (task) {
            // Modo edição
            this.currentTask = task;
            document.getElementById('modal-title').textContent = 'Editar Tarefa';
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-time').value = task.time;
            document.getElementById('task-category').value = task.category;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-date').value = task.date;
        } else {
            // Modo criação
            this.currentTask = null;
            document.getElementById('modal-title').textContent = 'Nova Tarefa';
            document.getElementById('task-form').reset();
            this.setTodayAsDefault();
            document.getElementById('task-id').value = '';
        }
    },
    
    // Fechar modal de tarefa
    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.remove('active');
        this.currentTask = null;
    },
    
    // Salvar tarefa (criar ou atualizar)
    async saveTask() {
        const id = document.getElementById('task-id').value;
        const payload = {
            title: document.getElementById('task-title').value.trim(),
            time: document.getElementById('task-time').value || '09:00',
            category: document.getElementById('task-category').value,
            priority: document.getElementById('task-priority').value,
            date: document.getElementById('task-date').value,
        };
        
        if (!payload.title) {
            alert('Informe um título para a tarefa.');
            return;
        }
        
        try {
            let savedTask = null;
            
            if (id) {
                const response = await fetch(this.getApiUrl(`/api/tasks/${id}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error('Falha ao atualizar tarefa');
                }
                
                savedTask = await response.json();
                this.tasks = this.tasks.map(t => t.id === savedTask.id ? savedTask : t);
            } else {
                const response = await fetch(this.getApiUrl('/api/tasks'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error('Falha ao criar tarefa');
                }
                
                savedTask = await response.json();
                this.tasks.push(savedTask);
            }
            
            this.cacheTasks();
            this.render();
            this.closeTaskModal();
        } catch (err) {
            console.error(err);
            alert('Não foi possível salvar a tarefa. Verifique sua conexão e tente novamente.');
        }
    },
    
    // Editar tarefa
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.openTaskModal(task);
        }
    },
    
    // Deletar tarefa
    async deleteTask(taskId) {
        if (!confirm('Deseja realmente excluir esta tarefa?')) {
            return;
        }
        
        try {
            const response = await fetch(this.getApiUrl(`/api/tasks/${taskId}`), {
                method: 'DELETE'
            });
            
            if (!response.ok && response.status !== 204) {
                throw new Error('Falha ao excluir tarefa');
            }
            
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.cacheTasks();
            this.render();
        } catch (err) {
            console.error(err);
            alert('Não foi possível excluir a tarefa. Verifique sua conexão e tente novamente.');
        }
    },
    
    // Filtrar tarefas por categoria
    filterByCategory(category) {
        // Será implementado quando adicionarmos a lógica de filtragem
        this.render();
    },
    
    // Renderizar a view atual
    render() {
        if (this.currentView === 'day') {
            this.renderDayView();
        } else {
            this.renderWeekView();
        }
    },
    
    // Renderizar view do dia
    renderDayView() {
        const container = document.getElementById('task-list-day');
        const today = new Date().toISOString().split('T')[0];
        
        // Filtrar tarefas de hoje
        const todayTasks = this.tasks.filter(t => t.date === today);
        
        // Ordenar por horário
        todayTasks.sort((a, b) => a.time.localeCompare(b.time));
        
        if (todayTasks.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.5;">Nenhuma tarefa para hoje. Adicione uma nova!</p>';
        } else {
            container.innerHTML = todayTasks.map(task => this.createTaskCard(task)).join('');
        }
        
        // Adicionar listeners aos botões de ação (usar currentTarget para garantir o dataset)
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editTask(e.currentTarget.dataset.id);
            });
        });
        
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteTask(e.currentTarget.dataset.id);
            });
        });
        
        // Editar rapidamente com duplo clique no card
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dblclick', () => {
                const taskId = card.dataset.id;
                if (taskId) this.editTask(taskId);
            });
        });
    },
    
    // Renderizar view da semana
    renderWeekView() {
        const container = document.getElementById('week-grid');
        
        // Gerar dias da semana
        const weekDays = this.getWeekDays();
        
        container.innerHTML = weekDays.map(day => this.createWeekDay(day)).join('');
        
        // Renderizar tarefas em cada dia
        weekDays.forEach((day, index) => {
            const dayContainer = container.children[index];
            const dayTasks = this.tasks.filter(t => t.date === day.date);
            
            if (dayTasks.length > 0) {
                const taskList = dayTasks
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(task => this.createTaskCard(task, 'compact'))
                    .join('');
                
                const existingList = dayContainer.querySelector('.task-list');
                if (existingList) {
                    existingList.innerHTML = taskList;
                }
            }
        });
        
        // Adicionar listeners aos botões de ação (usar currentTarget para garantir o dataset)
        container.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editTask(e.currentTarget.dataset.id);
            });
        });
        
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteTask(e.currentTarget.dataset.id);
            });
        });
        
        // Editar rapidamente com duplo clique no card
        container.querySelectorAll('.task-card').forEach(card => {
            card.addEventListener('dblclick', () => {
                const taskId = card.dataset.id;
                if (taskId) this.editTask(taskId);
            });
        });
    },
    
    // Obter dias da semana atual
    getWeekDays() {
        const today = new Date();
        const currentDay = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - currentDay + 1); // Começar na segunda-feira
        
        const days = [];
        const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            
            days.push({
                name: dayNames[i],
                date: date.toISOString().split('T')[0],
                dateObj: date
            });
        }
        
        return days;
    },
    
    // Criar card de tarefa
    createTaskCard(task, size = 'normal') {
        const isCompact = size === 'compact';
        
        return `
            <div class="task-card priority-${task.priority}" data-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${task.title}</div>
                        ${isCompact ? '' : `<div class="task-time">${task.time}</div>`}
                    </div>
                    <div class="task-time">${task.time}</div>
                </div>
                ${!isCompact ? `
                    <span class="task-category category-${task.category}">
                        ${this.getCategoryName(task.category)}
                    </span>
                ` : ''}
                <div class="task-actions">
                    <button class="btn-icon edit btn-edit" data-id="${task.id}" title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icon delete btn-delete" data-id="${task.id}" title="Excluir">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    // Criar card de dia da semana
    createWeekDay(day) {
        const dayNumber = day.dateObj.getDate();
        const isToday = day.date === new Date().toISOString().split('T')[0];
        
        return `
            <div class="week-day ${isToday ? 'today' : ''}">
                <div class="day-header">
                    <div class="day-name">${day.name}</div>
                    <div class="day-date">${dayNumber}/${day.dateObj.getMonth() + 1}</div>
                </div>
                <div class="task-list">
                    <!-- Tarefas serão adicionadas aqui -->
                </div>
            </div>
        `;
    },
    
    // Obter nome da categoria
    getCategoryName(category) {
        const names = {
            work: 'Trabalho',
            personal: 'Pessoal',
            study: 'Estudos',
            other: 'Outros'
        };
        return names[category] || category;
    }
};

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
    console.log('⚡ Kernel Planner iniciado com sucesso!');
});

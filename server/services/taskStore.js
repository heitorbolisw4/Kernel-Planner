const { promises: fs } = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');

const dataDir = path.join(__dirname, '..', 'data');
const tasksFile = path.join(dataDir, 'tasks.json');

async function ensureStore() {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.access(tasksFile);
    } catch (err) {
        const initialPayload = JSON.stringify({ tasks: [] }, null, 2);
        await fs.writeFile(tasksFile, initialPayload, 'utf8');
    }
}

async function readStore() {
    await ensureStore();
    const raw = await fs.readFile(tasksFile, 'utf8');
    const payload = JSON.parse(raw);
    if (!payload.tasks) {
        payload.tasks = [];
    }
    return payload;
}

async function writeStore(payload) {
    await fs.writeFile(tasksFile, JSON.stringify(payload, null, 2), 'utf8');
}

function normalizeTask(task) {
    const now = new Date().toISOString();
    return {
        id: uuid(),
        title: task.title,
        description: task.description || '',
        date: task.date,
        time: task.time || '09:00',
        category: task.category || 'other',
        priority: task.priority || 'medium',
        calendarEventId: task.calendarEventId || null,
        createdAt: now,
        updatedAt: now
    };
}

async function getAllTasks() {
    const store = await readStore();
    return store.tasks;
}

async function getTasksByDate(date) {
    const store = await readStore();
    return store.tasks.filter((task) => task.date === date);
}

async function getTasksBetween(startDate, endDate) {
    const store = await readStore();
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    return store.tasks.filter((task) => {
        const current = new Date(`${task.date}T${task.time || '00:00'}`);
        return current >= start && current <= end;
    });
}

async function createTask(task) {
    const store = await readStore();
    const newTask = normalizeTask(task);
    store.tasks.push(newTask);
    await writeStore(store);
    return newTask;
}

async function updateTask(id, updates) {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    const existing = store.tasks[index];
    const updatedTask = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
    };

    store.tasks[index] = updatedTask;
    await writeStore(store);
    return updatedTask;
}

async function deleteTask(id) {
    const store = await readStore();
    const index = store.tasks.findIndex((task) => task.id === id);
    if (index === -1) return null;

    const [removed] = store.tasks.splice(index, 1);
    await writeStore(store);
    return removed;
}

module.exports = {
    getAllTasks,
    getTasksByDate,
    getTasksBetween,
    createTask,
    updateTask,
    deleteTask
};

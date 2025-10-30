require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { format, startOfWeek, endOfWeek } = require('date-fns');
const { ptBR } = require('date-fns/locale');

const {
    getAllTasks,
    getTasksByDate,
    getTasksBetween,
    createTask,
    updateTask,
    deleteTask
} = require('./services/taskStore');
const { sendDailySummary } = require('./services/emailService');
const calendarService = require('./services/calendarService');
const dailySummaryJob = require('./services/dailySummaryJob');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Servir os arquivos estáticos do front-end (index.html, etc.)
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tasks', async (req, res) => {
    const { date, from, to } = req.query;
    try {
        if (date) {
            const tasks = await getTasksByDate(date);
            res.json(tasks);
            return;
        }

        if (from && to) {
            const tasks = await getTasksBetween(from, to);
            res.json(tasks);
            return;
        }

        const tasks = await getAllTasks();
        res.json(tasks);
    } catch (err) {
        console.error('[tasks] Falha ao buscar tarefas', err);
        res.status(500).json({ error: 'Não foi possível carregar as tarefas' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const payload = req.body;

    if (!payload.title || !payload.date) {
        res.status(400).json({ error: 'Campos "title" e "date" são obrigatórios.' });
        return;
    }

    try {
        const newTask = await createTask(payload);
        try {
            const eventId = await calendarService.createEvent(newTask);
            if (eventId) {
                const synced = await updateTask(newTask.id, { calendarEventId: eventId });
                res.status(201).json(synced);
                return;
            }
        } catch (calendarErr) {
            console.error('[calendar] Falha ao criar evento', calendarErr);
        }
        res.status(201).json(newTask);
    } catch (err) {
        console.error('[tasks] Falha ao criar tarefa', err);
        res.status(500).json({ error: 'Não foi possível criar a tarefa' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    try {
        const updated = await updateTask(id, payload);
        if (!updated) {
            res.status(404).json({ error: 'Tarefa não encontrada' });
            return;
        }

        try {
            if (updated.calendarEventId) {
                await calendarService.updateEvent(updated);
            } else {
                const eventId = await calendarService.createEvent(updated);
                if (eventId) {
                    const synced = await updateTask(updated.id, { calendarEventId: eventId });
                    res.json(synced);
                    return;
                }
            }
        } catch (calendarErr) {
            console.error('[calendar] Falha ao atualizar evento', calendarErr);
        }

        res.json(updated);
    } catch (err) {
        console.error('[tasks] Falha ao atualizar tarefa', err);
        res.status(500).json({ error: 'Não foi possível atualizar a tarefa' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const removed = await deleteTask(id);
        if (!removed) {
            res.status(404).json({ error: 'Tarefa não encontrada' });
            return;
        }

        try {
            await calendarService.deleteEvent(removed);
        } catch (calendarErr) {
            console.error('[calendar] Falha ao remover evento', calendarErr);
        }

        res.status(204).send();
    } catch (err) {
        console.error('[tasks] Falha ao remover tarefa', err);
        res.status(500).json({ error: 'Não foi possível excluir a tarefa' });
    }
});

app.post('/api/notifications/daily', async (req, res) => {
    const { date, recipients } = req.body || {};
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    try {
        const tasks = await getTasksByDate(targetDate);
        if (!tasks.length) {
            res.status(204).send();
            return;
        }

        await sendDailySummary({ date: targetDate, tasks, recipients });
        res.status(202).json({ status: 'queued' });
    } catch (err) {
        console.error('[email] Falha ao enviar resumo diário', err);
        res.status(500).json({ error: 'Não foi possível enviar o e-mail de resumo' });
    }
});

// Iniciar o cron somente quando o servidor iniciar
dailySummaryJob.start();

app.listen(PORT, () => {
    const weekRange = `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR })} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM', { locale: ptBR })}`;
    console.log(`🚀 Kernel Planner API executando na porta ${PORT}`);
    console.log(`📅 Semana em andamento: ${weekRange}`);
});

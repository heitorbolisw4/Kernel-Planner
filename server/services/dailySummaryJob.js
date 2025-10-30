const cron = require('node-cron');
const { format } = require('date-fns');
const { getTasksByDate } = require('./taskStore');
const { sendDailySummary } = require('./emailService');

function getSchedule() {
    return process.env.DAILY_SUMMARY_CRON || '0 7 * * *';
}

function getTimezone() {
    return process.env.TIMEZONE || 'America/Sao_Paulo';
}

async function runDailySummary(date) {
    const tasks = await getTasksByDate(date);
    if (!tasks.length) {
        console.info(`[cron] Nenhuma tarefa encontrada para ${date}. E-mail não enviado.`);
        return;
    }

    await sendDailySummary({ date, tasks });
    console.info(`[cron] Relatório diário enviado para ${date}.`);
}

function start() {
    const schedule = getSchedule();
    const timezone = getTimezone();

    cron.schedule(schedule, async () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        try {
            await runDailySummary(today);
        } catch (err) {
            console.error('[cron] Falha ao enviar relatório diário', err);
        }
    }, { timezone });
}

module.exports = {
    start,
    runDailySummary
};

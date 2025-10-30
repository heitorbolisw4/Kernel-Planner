const nodemailer = require('nodemailer');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

function buildTransporter() {
    const {
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_USER,
        EMAIL_PASS,
        EMAIL_SECURE
    } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
        console.warn('[email] Configuração de e-mail incompleta. E-mails não serão enviados.');
        return null;
    }

    return nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure: EMAIL_SECURE === 'true',
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
}

const transporter = buildTransporter();

function buildDailySummaryHtml(date, tasks) {
    const formattedDate = format(new Date(`${date}T00:00:00`), "EEEE',' dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const rows = tasks.map(
        (task) => `
            <tr>
                <td>${task.time}</td>
                <td>${task.title}</td>
                <td>${task.category}</td>
                <td>${task.priority}</td>
                <td>${task.description || '-'}</td>
            </tr>
        `
    ).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #1f2937;">
            <h2 style="color: #10b981; margin-bottom: 8px;">Relatório diário - ${formattedDate}</h2>
            <p style="margin-bottom: 16px;">Aqui estão as atividades planejadas para hoje:</p>
            <table role="presentation" cellspacing="0" cellpadding="6" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f3f4f6; text-align: left;">
                        <th style="border-bottom: 1px solid #e5e7eb;">Horário</th>
                        <th style="border-bottom: 1px solid #e5e7eb;">Título</th>
                        <th style="border-bottom: 1px solid #e5e7eb;">Categoria</th>
                        <th style="border-bottom: 1px solid #e5e7eb;">Prioridade</th>
                        <th style="border-bottom: 1px solid #e5e7eb;">Notas</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
            <p style="margin-top: 24px; color: #6b7280;">Mensagem automática do Kernel Planner.</p>
        </div>
    `;
}

async function sendDailySummary({ date, tasks, recipients }) {
    if (!transporter) {
        return;
    }

    const {
        EMAIL_FROM,
        EMAIL_TO,
        EMAIL_USER
    } = process.env;

    const to = recipients || EMAIL_TO;
    if (!to) {
        console.warn('[email] Nenhum destinatário configurado. Informe EMAIL_TO ou envie recipients.');
        return;
    }

    const subject = `Kernel Planner - Resumo diário (${date})`;
    const html = buildDailySummaryHtml(date, tasks);

    await transporter.sendMail({
        from: EMAIL_FROM || EMAIL_USER,
        to,
        subject,
        html
    });
}

module.exports = {
    sendDailySummary
};

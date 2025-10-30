const { google } = require('googleapis');
const { zonedTimeToUtc, formatISO } = require('date-fns-tz');
const { addMinutes } = require('date-fns');

function isConfigured() {
    return (
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REDIRECT_URI &&
        process.env.GOOGLE_REFRESH_TOKEN &&
        process.env.GOOGLE_CALENDAR_ID
    );
}

function buildOAuthClient() {
    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return client;
}

function buildCalendarClient() {
    if (!isConfigured()) {
        console.warn('[calendar] Configuração do Google Calendar incompleta. Integração será ignorada.');
        return null;
    }

    const auth = buildOAuthClient();
    return google.calendar({ version: 'v3', auth });
}

const calendar = buildCalendarClient();
const TZ = process.env.TIMEZONE || 'America/Sao_Paulo';

function buildEventPayload(task) {
    const startDateTime = zonedTimeToUtc(`${task.date}T${task.time || '09:00'}`, TZ);
    const end = task.endTime ? `${task.date}T${task.endTime}` : null;
    const endDateTime = end
        ? zonedTimeToUtc(end, TZ)
        : addMinutes(startDateTime, Number(process.env.DEFAULT_TASK_DURATION_MIN || 60));

    return {
        summary: task.title,
        description: task.description || '',
        start: {
            dateTime: formatISO(startDateTime),
            timeZone: TZ
        },
        end: {
            dateTime: formatISO(endDateTime),
            timeZone: TZ
        },
        reminders: {
            useDefault: true
        }
    };
}

async function createEvent(task) {
    if (!calendar) return null;
    const payload = buildEventPayload(task);
    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        requestBody: payload
    });

    return response.data.id;
}

async function updateEvent(task) {
    if (!calendar || !task.calendarEventId) return null;
    const payload = buildEventPayload(task);

    await calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        eventId: task.calendarEventId,
        requestBody: payload
    });

    return task.calendarEventId;
}

async function deleteEvent(task) {
    if (!calendar || !task.calendarEventId) return;
    try {
        await calendar.events.delete({
            calendarId: process.env.GOOGLE_CALENDAR_ID,
            eventId: task.calendarEventId
        });
    } catch (err) {
        // Se o evento já tiver sido removido manualmente, ignoramos o erro 404
        if (err.code !== 410 && err.code !== 404) {
            throw err;
        }
    }
}

module.exports = {
    createEvent,
    updateEvent,
    deleteEvent
};

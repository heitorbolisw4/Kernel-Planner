# ⚡ Kernel Planner

Uma aplicação web para organização pessoal com backend em Node.js, envio de relatórios diários por e‑mail e integração opcional com o Google Calendar.

## 📋 Sobre o Projeto

O **Kernel Planner** nasceu como uma SPA em HTML, CSS e JavaScript puro. Agora ele conta com uma API em Node.js para centralizar o planejamento semanal, disparar notificações diárias e sincronizar tarefas com o Google Calendar.

## ✨ Principais Funcionalidades

- ✅ Criar, editar e excluir tarefas diretamente pela interface web
- 📅 Visualização por dia ou semana
- 🎯 Categorias e prioridades configuráveis
- ☁️ API REST em Node.js para persistência das tarefas
- 📬 Envio automático de relatório diário por e‑mail (cron configurável)
- 📆 Sincronização opcional de tarefas com o Google Calendar
- 🔒 Cache local como fallback quando o servidor estiver indisponível

## 🗂️ Estrutura do Projeto

```
Kernel-Planner/
├── app.js                 # Lógica da aplicação (frontend)
├── index.html             # Estrutura HTML
├── style.css              # Estilos
├── server/
│   ├── index.js           # Servidor Express + rotas
│   └── services/          # Task store, e-mail, calendar, cron
├── .env.example           # Variáveis de ambiente (modelo)
├── .gitignore
└── package.json
```

## 🧰 Requisitos

- Node.js >= 18
- Conta de e-mail com acesso SMTP (ex.: Gmail com App Password)
- (Opcional) Projeto Google Cloud com Calendar API habilitada

## 🚀 Como Executar

1. Copie o arquivo `.env.example` para `.env` e preencha as variáveis.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:4000` no navegador. O Express servirá o frontend e a API na mesma porta.

## 🔐 Configuração `.env`

- `PORT`: porta do servidor (padrão 4000).
- `TIMEZONE`: fuso horário das execuções (ex.: `America/Sao_Paulo`).
- `DAILY_SUMMARY_CRON`: expressão cron para o relatório (padrão: `0 7 * * *` → 07h diariamente).

### SMTP

- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`: dados do servidor SMTP.
- `EMAIL_USER`, `EMAIL_PASS`: credenciais (para Gmail use um App Password).
- `EMAIL_FROM`: remetente exibido (ex.: `"Kernel Planner" <seu-email@gmail.com>`).
- `EMAIL_TO`: destinatário padrão para o relatório.

### Google Calendar (opcional)

Preencha apenas se quiser sincronizar as tarefas automaticamente:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: obtidos no Google Cloud Console (OAuth 2.0).
- `GOOGLE_REFRESH_TOKEN`: token de atualização da conta que autoriza a aplicação.
- `GOOGLE_CALENDAR_ID`: ID do calendário alvo (ex.: `primary` ou endereço do calendário).
- `DEFAULT_TASK_DURATION_MIN`: duração padrão de cada tarefa (minutos) ao criar eventos.

> 💡 Sem essas variáveis o app continua funcionando; apenas a integração com o Calendar é ignorada.

## 📬 Configurando o Envio de E-mails

1. Gere um App Password (Gmail) ou uma senha específica no provedor que preferir.
2. Preencha as variáveis de SMTP.
3. O cron diário enviará o relatório automaticamente; você também pode disparar manualmente via `POST /api/notifications/daily`.

## 📅 Passo a Passo para o Google Calendar

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/).
2. Ative a API **Google Calendar**.
3. Crie uma credencial **OAuth Client ID** (tipo Web) e adicione uma URI de redirecionamento (ex.: `http://localhost:4000/oauth2callback`).
4. Gere manualmente um **refresh token** (por exemplo, usando o script de exemplo do `googleapis` ou o OAuth Playground).
5. Compartilhe o calendário desejado com a conta de serviço/autorizada se necessário.
6. Preencha as variáveis do `.env` com os valores obtidos.

## 🔁 Fluxo de Sincronização

- O frontend consulta a API (`/api/tasks`) ao carregar a página.
- Ao criar/editar/excluir tarefas, o app chama a API correspondente.
- A API persiste em `server/data/tasks.json` (arquivo gerado automaticamente) e, se configurado, cria/atualiza/remove eventos no Google Calendar.
- Um job agendado (`node-cron`) reúne as tarefas do dia e envia o relatório por e-mail.
- Se o servidor não responder, o frontend exibe o último cache salvo no navegador.

## ✅ Próximos Passos Sugeridos

- [ ] Autenticação de usuários
- [ ] Personalização do template de e-mail
- [ ] Reenvio de eventos do Calendar em lote
- [ ] Notificações push (PWA)
- [ ] Aplicativo mobile

---

Desenvolvido com ❤️ para otimizar o planejamento semanal.

const mailer = require('./mailer');

function escapeHtmlTG(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildText(lead) {
  const sourceLabel = lead.source_label || mailer.SOURCE_LABEL[lead.source] || lead.source;
  const pagePath = (typeof lead.page_path === 'string' && lead.page_path.trim()) ? lead.page_path.trim() : '';
  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const payloadRows = mailer.buildPayloadRows(lead.payload, lead.source);

  const phoneEsc = escapeHtmlTG(lead.phone);
  const emailEsc = lead.email ? escapeHtmlTG(lead.email) : null;

  const lines = [];
  lines.push('🔔 <b>ФОРМА: ' + escapeHtmlTG(sourceLabel.toUpperCase()) + '</b>');
  lines.push('');
  lines.push('📅 ' + escapeHtmlTG(when) + ' (МСК)');
  lines.push('');
  lines.push('👤 <b>Контакт</b>');
  lines.push('Имя: ' + escapeHtmlTG(lead.name));
  lines.push('Телефон: <a href="tel:' + phoneEsc + '">' + phoneEsc + '</a>');
  lines.push('Email: ' + (emailEsc ? '<a href="mailto:' + emailEsc + '">' + emailEsc + '</a>' : '—'));
  lines.push('Согласие на маркетинг: ' + (lead.marketing ? 'Да' : 'Нет'));
  lines.push('IP клиента: ' + escapeHtmlTG(lead.ip || '—'));
  if (pagePath) lines.push('Страница: ' + escapeHtmlTG(pagePath));

  if (payloadRows.length) {
    lines.push('');
    lines.push('📋 <b>' + escapeHtmlTG(mailer.sectionTitleFor(lead.source)) + '</b>');
    payloadRows.forEach(function (r) {
      lines.push(escapeHtmlTG(r.label) + ': ' + escapeHtmlTG(r.value));
    });
  }

  return lines.join('\n');
}

let configWarned = false;

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (!configWarned) {
      console.warn('[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не настроены — TG-уведомления отключены');
      configWarned = true;
    }
    return null;
  }
  return { token: token, chatId: chatId };
}

async function sendLeadTelegram(lead) {
  const cfg = getConfig();
  if (!cfg) return;
  // TODO Task 4: реальная отправка
}

module.exports = {
  sendLeadTelegram: sendLeadTelegram
};

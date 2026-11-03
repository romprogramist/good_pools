const mailer = require('./mailer');

function escapeHtmlTG(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const chatIdRaw = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatIdRaw) {
    if (!configWarned) {
      console.warn('[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не настроены — TG-уведомления отключены');
      configWarned = true;
    }
    return null;
  }
  const chatIds = chatIdRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!chatIds.length) return null;
  return { token: token, chatIds: chatIds };
}

// Сетевой путь VPS → api.telegram.org нестабилен: IPv4 не отвечает вовсе,
// IPv6 обрывает каждый 2–4-й коннект (замер 03.11.2026). Поэтому каждый чат
// шлём с повторами: ATTEMPTS попыток по TIMEOUT_MS, пауза растёт линейно.
const ATTEMPTS = 4;
const TIMEOUT_MS = 8000;

function retryDelayMs(attempt) {
  const base = Number(process.env.TELEGRAM_RETRY_DELAY_MS) || 1000;
  return base * attempt;
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function sendOnce(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendToChat(token, chatId, text) {
  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };
  let lastErr;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await sendOnce(url, body);
      if (res.ok) return;
      const errText = await res.text().catch(function () { return ''; });
      const apiErr = new Error('Telegram API ' + res.status + ' (chat ' + chatId + '): ' + errText.slice(0, 200));
      // 4xx — ошибка данных/прав (битый токен, бот заблокирован), повтор бессмысленен.
      if (res.status >= 400 && res.status < 500) throw apiErr;
      lastErr = apiErr;
    } catch (e) {
      if (e && /^Telegram API 4\d\d/.test(e.message)) throw e;
      lastErr = e; // AbortError / ECONNRESET / fetch failed — сетевое, повторяем
    }
    if (attempt < ATTEMPTS) {
      console.warn('[telegram] chat ' + chatId + ': попытка ' + attempt + '/' + ATTEMPTS + ' не удалась (' +
        (lastErr && lastErr.message ? lastErr.message : lastErr) + '), повтор');
      await sleep(retryDelayMs(attempt));
    }
  }
  throw lastErr;
}

async function sendLeadTelegram(lead) {
  const cfg = getConfig();
  if (!cfg) return;

  const text = buildText(lead);
  const results = await Promise.allSettled(cfg.chatIds.map(function (chatId) {
    return sendToChat(cfg.token, chatId, text);
  }));

  const failures = results.filter(function (r) { return r.status === 'rejected'; });
  if (failures.length === results.length) {
    throw failures[0].reason;
  }
  failures.forEach(function (f) {
    console.warn('[telegram]', f.reason && f.reason.message ? f.reason.message : f.reason);
  });
}

module.exports = {
  sendLeadTelegram: sendLeadTelegram,
  // Internal testing hook — используется scripts/verify-telegram-format.js
  // для визуальной проверки формата TG-сообщения без сетевых вызовов.
  __buildText: buildText
};

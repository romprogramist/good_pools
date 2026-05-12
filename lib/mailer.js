const nodemailer = require('nodemailer');

const SOURCE_LABEL = {
  service: 'Услуга',
  ask: 'Задать вопрос',
  consult: 'Консультация',
  quiz: 'Подбор / квиз',
  'interest-popup': 'Поп-ап «интересно»'
};

// Русские переводы для payload квиза. Коды должны совпадать с js/quiz.js (STEPS).
const QUIZ_FIELDS = {
  size: {
    label: 'Размер бассейна',
    values: {
      '3x5': '3 × 5 м', '3x6': '3 × 6 м', '3x7': '3 × 7 м',
      '4x8': '4 × 8 м', '5x10': '5 × 10 м',
      custom: 'Индивидуальный размер'
    }
  },
  finish: {
    label: 'Тип отделки',
    values: {
      composite: 'Композитный',
      concrete: 'Бетонный',
      consult: 'Не знает, нужна консультация'
    }
  },
  options: {
    label: 'Дополнительные опции',
    values: {
      heating: 'Подогрев воды',
      lighting: 'Подсветка',
      autodose: 'Автодозирование химии',
      uv: 'УФ лампа',
      chlorinefree: 'Безхлорная система',
      hydromassage: 'Гидромассаж / Аэромассаж',
      waterfall: 'Водопад'
    }
  },
  budget: {
    label: 'Бюджет',
    values: { '1-2': '1–2 млн руб', '2-3': '2–3 млн руб', '3-4': '3–4 млн руб' }
  },
  timing: {
    label: 'Сроки',
    values: {
      soon: 'В ближайшее время',
      season: 'В тёплый сезон',
      browsing: 'Пока просто прицениваюсь'
    }
  }
};

function translateQuizValue(field, rawValue) {
  const dict = QUIZ_FIELDS[field];
  if (!dict) return null;
  if (Array.isArray(rawValue)) {
    const mapped = rawValue.map(function (v) { return (dict.values && dict.values[v]) || v; });
    return { label: dict.label, value: mapped.join(', ') };
  }
  const mapped = (dict.values && dict.values[rawValue]) || rawValue;
  return { label: dict.label, value: mapped };
}

let transporter = null;
let configWarned = false;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    if (!configWarned) {
      console.warn('[mailer] SMTP не настроен — письма с заявками отправляться не будут');
      configWarned = true;
    }
    return null;
  }

  transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: { user: user, pass: pass }
  });
  return transporter;
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPayload(payload, source) {
  if (!payload || typeof payload !== 'object') return '';
  const lines = Object.keys(payload).map(function (key) {
    const raw = payload[key];

    if (source === 'quiz') {
      const t = translateQuizValue(key, raw);
      if (t) return '  • ' + t.label + ': ' + t.value;
    }

    let value = raw;
    if (value && typeof value === 'object') {
      try { value = JSON.stringify(value, null, 2); } catch (_e) { value = String(value); }
    }
    return '  • ' + key + ': ' + value;
  });
  return lines.join('\n');
}

function buildEmail(lead) {
  const sourceLabel = SOURCE_LABEL[lead.source] || lead.source;
  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

  const lines = [
    'Новая заявка с сайта good-pools',
    '',
    'Источник: ' + sourceLabel + ' (' + lead.source + ')',
    'Имя: ' + lead.name,
    'Телефон: ' + lead.phone,
    'Email: ' + (lead.email || '—'),
    'Маркетинг-согласие: ' + (lead.marketing ? 'да' : 'нет'),
    'IP: ' + (lead.ip || '—'),
    'Время (МСК): ' + when
  ];

  const payloadText = renderPayload(lead.payload, lead.source);
  if (payloadText) {
    lines.push('', 'Дополнительные поля:', payloadText);
  }

  const text = lines.join('\n');

  const htmlRows = [
    ['Источник', sourceLabel + ' <code>' + escapeHtml(lead.source) + '</code>'],
    ['Имя', escapeHtml(lead.name)],
    ['Телефон', '<a href="tel:' + escapeHtml(lead.phone) + '">' + escapeHtml(lead.phone) + '</a>'],
    ['Email', lead.email ? '<a href="mailto:' + escapeHtml(lead.email) + '">' + escapeHtml(lead.email) + '</a>' : '—'],
    ['Маркетинг', lead.marketing ? 'да' : 'нет'],
    ['IP', escapeHtml(lead.ip || '—')],
    ['Время (МСК)', escapeHtml(when)]
  ];

  let html = '<h2 style="margin:0 0 12px">Новая заявка с сайта good-pools</h2>';
  html += '<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">';
  htmlRows.forEach(function (row) {
    html += '<tr><td style="border:1px solid #ddd;background:#f7f7f7;font-weight:bold">' + row[0] + '</td>';
    html += '<td style="border:1px solid #ddd">' + row[1] + '</td></tr>';
  });
  html += '</table>';

  if (payloadText) {
    html += '<h3 style="margin:16px 0 6px">Дополнительные поля</h3>';
    html += '<pre style="background:#f7f7f7;padding:10px;border:1px solid #ddd;white-space:pre-wrap;font-size:13px">' + escapeHtml(payloadText) + '</pre>';
  }

  return {
    subject: 'Заявка с сайта — ' + sourceLabel + ' — ' + lead.name,
    text: text,
    html: html
  };
}

async function sendLeadEmail(lead) {
  const t = getTransporter();
  if (!t) return;

  const fromName = process.env.MAIL_FROM_NAME || 'good-pools';
  const fromAddr = process.env.SMTP_USER;
  const to = process.env.MAIL_TO || process.env.SMTP_USER;

  const mail = buildEmail(lead);
  await t.sendMail({
    from: '"' + fromName + '" <' + fromAddr + '>',
    to: to,
    replyTo: lead.email || undefined,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
}

module.exports = { sendLeadEmail: sendLeadEmail };

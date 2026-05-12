const nodemailer = require('nodemailer');

const SOURCE_LABEL = {
  service:          'Сервисное обслуживание',
  ask:              'Задать вопрос',
  consult:          'Заказ консультации',
  quiz:             'Подбор бассейна (квиз)',
  'interest-popup': 'Интерес к модели (поп-ап)'
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

// Русские названия для ключей не-квиз форм (ask/consult/service/interest-popup).
const FIELD_LABEL = {
  question: 'Вопрос',
  note: 'Сообщение',
  message: 'Сообщение',
  comment: 'Комментарий',
  preferred_time: 'Удобное время',
  model: 'Модель / услуга',
  service: 'Услуга',
  action: 'Действие',
  interest: 'Интерес',
  page: 'Страница',
  triggered_on: 'Сработал на',
  time_on_page_sec: 'Время на странице, сек',
  // service-форма (сервисное обслуживание)
  size: 'Размер бассейна',
  year: 'Год постройки',
  automation: 'Автоматика химии',
  // interest-popup (поп-ап «интересно» на странице модели)
  model_id: 'Код модели',
  model_name: 'Модель',
  location: 'Местоположение клиента',
  score: 'Балл интереса',
  activeSeconds: 'Активность (сек)',
  photosViewed: 'Просмотрено фото',
  opens: 'Открытий карточки модели',
  triggeredAt: 'Время триггера'
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

function stringifyValue(raw) {
  if (raw == null || raw === '') return '—';
  if (Array.isArray(raw)) return raw.join(', ');
  if (typeof raw === 'object') {
    try { return JSON.stringify(raw); } catch (_e) { return String(raw); }
  }
  return String(raw);
}

// Возвращает массив [{ label, value }] — уже переведённый, готов к рендеру.
// Вложенные объекты (например signals у interest-popup) раскрываются как отдельные
// строки того же уровня — каждый внутренний ключ переводится через FIELD_LABEL.
function buildPayloadRows(payload, source) {
  if (!payload || typeof payload !== 'object') return [];
  const rows = [];
  Object.keys(payload).forEach(function (key) {
    const raw = payload[key];
    if (source === 'quiz') {
      const t = translateQuizValue(key, raw);
      if (t) { rows.push({ label: t.label, value: t.value }); return; }
    }
    const isPlainObject = raw && typeof raw === 'object' && !Array.isArray(raw);
    if (isPlainObject) {
      Object.keys(raw).forEach(function (k2) {
        rows.push({ label: FIELD_LABEL[k2] || k2, value: stringifyValue(raw[k2]) });
      });
      return;
    }
    rows.push({ label: FIELD_LABEL[key] || key, value: stringifyValue(raw) });
  });
  return rows;
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

// Inline styles — у email-клиентов нет внешних CSS.
const STYLE = {
  wrap:    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;',
  banner:  'background:#fef3c7;color:#92400e;padding:14px 22px;font-size:18px;font-weight:700;letter-spacing:0.3px;border-radius:8px 8px 0 0;',
  header:  'background:#0a3d62;color:#ffffff;padding:18px 22px;',
  h1:      'margin:0;font-size:18px;font-weight:600;line-height:1.3;',
  hSub:    'margin-top:6px;font-size:13px;opacity:0.85;',
  table:   'border-collapse:collapse;width:100%;background:#ffffff;border:1px solid #e6e8ec;border-top:none;',
  sectionTr: 'background:#0a3d62;',
  sectionTd: 'color:#ffffff;padding:10px 16px;font-weight:600;font-size:13px;letter-spacing:0.2px;',
  labelTd: 'padding:11px 16px;background:#f6f8fb;font-weight:600;width:38%;color:#1f2937;border-bottom:1px solid #eef0f3;vertical-align:top;font-size:14px;',
  valueTd: 'padding:11px 16px;color:#111827;border-bottom:1px solid #eef0f3;vertical-align:top;font-size:14px;word-break:break-word;',
  link:    'color:#0a3d62;text-decoration:none;font-weight:500;'
};

function htmlRow(label, valueHtml) {
  return '<tr>' +
    '<td style="' + STYLE.labelTd + '">' + label + '</td>' +
    '<td style="' + STYLE.valueTd + '">' + valueHtml + '</td>' +
    '</tr>';
}

function htmlSection(title) {
  return '<tr style="' + STYLE.sectionTr + '">' +
    '<td colspan="2" style="' + STYLE.sectionTd + '">' + escapeHtml(title) + '</td>' +
    '</tr>';
}

function buildEmail(lead) {
  const sourceLabel = lead.source_label || SOURCE_LABEL[lead.source] || lead.source;
  const pagePath = (typeof lead.page_path === 'string' && lead.page_path.trim()) ? lead.page_path.trim() : '';
  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const payloadRows = buildPayloadRows(lead.payload, lead.source);

  // --- plain text (для клиентов без HTML) ---
  const lines = [
    'ФОРМА: ' + sourceLabel.toUpperCase(),
    '',
    'Новая заявка с сайта good-pools',
    'Имя: ' + lead.name,
    'Телефон: ' + lead.phone,
    'Email: ' + (lead.email || '—'),
    'Маркетинг-согласие: ' + (lead.marketing ? 'да' : 'нет'),
    'IP: ' + (lead.ip || '—'),
    'Время (МСК): ' + when
  ];
  if (pagePath) lines.push('Страница: ' + pagePath);
  if (payloadRows.length) {
    lines.push('', sectionTitleFor(lead.source) + ':');
    payloadRows.forEach(function (r) {
      lines.push('  • ' + r.label + ': ' + r.value);
    });
  }
  const text = lines.join('\n');

  // --- HTML ---
  const phoneLink = '<a href="tel:' + escapeHtml(lead.phone) + '" style="' + STYLE.link + '">' + escapeHtml(lead.phone) + '</a>';
  const emailLink = lead.email
    ? '<a href="mailto:' + escapeHtml(lead.email) + '" style="' + STYLE.link + '">' + escapeHtml(lead.email) + '</a>'
    : '—';

  let html = '';
  html += '<div style="' + STYLE.wrap + '">';
  html += '<div style="' + STYLE.banner + '">ФОРМА: ' + escapeHtml(sourceLabel).toUpperCase() + '</div>';
  html += '<div style="' + STYLE.header + '">';
  html += '<div style="' + STYLE.h1 + '">Новая заявка с сайта</div>';
  html += '<div style="' + STYLE.hSub + '">' + escapeHtml(when) + '</div>';
  html += '</div>';

  html += '<table cellpadding="0" cellspacing="0" style="' + STYLE.table + '">';
  html += htmlSection('Контакт');
  html += htmlRow('Имя', escapeHtml(lead.name));
  html += htmlRow('Телефон', phoneLink);
  html += htmlRow('Email', emailLink);
  html += htmlRow('Согласие на маркетинг', lead.marketing ? 'Да' : 'Нет');
  html += htmlRow('IP клиента', escapeHtml(lead.ip || '—'));
  if (pagePath) html += htmlRow('Страница', escapeHtml(pagePath));

  if (payloadRows.length) {
    html += htmlSection(sectionTitleFor(lead.source));
    payloadRows.forEach(function (r) {
      html += htmlRow(escapeHtml(r.label), escapeHtml(r.value));
    });
  }

  html += '</table>';
  html += '</div>';

  return {
    subject: 'Заявка с сайта — ' + sourceLabel + ' — ' + lead.name,
    text: text,
    html: html
  };
}

function sectionTitleFor(source) {
  if (source === 'quiz') return 'Ответы клиента в квизе';
  if (source === 'ask') return 'Обращение';
  if (source === 'consult') return 'Пожелания клиента';
  if (source === 'service') return 'Параметры бассейна';
  if (source === 'interest-popup') return 'Контекст поп-апа';
  return 'Дополнительные поля';
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

module.exports = {
  sendLeadEmail: sendLeadEmail,
  SOURCE_LABEL: SOURCE_LABEL
};

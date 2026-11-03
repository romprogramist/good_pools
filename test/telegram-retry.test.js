const test = require('node:test');
const assert = require('node:assert');

// Сетевой путь VPS → api.telegram.org нестабилен (IPv4 глухой, IPv6 падает
// каждый 2–4-й коннект). Отправка обязана повторять попытку, а не терять заявку.

process.env.TELEGRAM_BOT_TOKEN = 'test-token';
process.env.TELEGRAM_CHAT_ID = '111';
process.env.TELEGRAM_RETRY_DELAY_MS = '5';

const telegram = require('../lib/telegram');

const lead = { source: 'consult', name: 'Тест', phone: '+79990000000', payload: {} };

function abortError() {
  const e = new Error('This operation was aborted');
  e.name = 'AbortError';
  return e;
}

test('повторяет отправку после таймаута и в итоге доставляет', async () => {
  let calls = 0;
  const origFetch = global.fetch;
  global.fetch = async function () {
    calls++;
    if (calls === 1) throw abortError();
    return { ok: true, text: async () => '' };
  };
  try {
    await telegram.sendLeadTelegram(lead);
    assert.strictEqual(calls, 2);
  } finally {
    global.fetch = origFetch;
  }
});

test('делает не меньше 4 попыток, прежде чем сдаться', async () => {
  let calls = 0;
  const origFetch = global.fetch;
  global.fetch = async function () {
    calls++;
    throw abortError();
  };
  try {
    await assert.rejects(telegram.sendLeadTelegram(lead), /aborted/);
    assert.ok(calls >= 4, 'ожидалось >=4 попыток, было ' + calls);
  } finally {
    global.fetch = origFetch;
  }
});

test('не повторяет при ответе 4xx от Telegram (ошибка не сетевая)', async () => {
  let calls = 0;
  const origFetch = global.fetch;
  global.fetch = async function () {
    calls++;
    return { ok: false, status: 403, text: async () => 'Forbidden: bot was blocked by the user' };
  };
  try {
    await assert.rejects(telegram.sendLeadTelegram(lead), /Telegram API 403/);
    assert.strictEqual(calls, 1);
  } finally {
    global.fetch = origFetch;
  }
});

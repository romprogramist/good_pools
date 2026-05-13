const mailer = require('./mailer');

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

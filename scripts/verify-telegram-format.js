// Ad-hoc верификация формата TG-сообщения для всех 5 источников.
// Импортирует buildText (требует временного экспорта — см. Step 3).
// Запуск: node scripts/verify-telegram-format.js
const tg = require('../lib/telegram');

const fixtures = [
  { source: 'service', name: 'Иван', phone: '+79991234567', email: 'i@example.com', ip: '1.2.3.4',
    marketing: true, page_path: '/services.html',
    payload: { size: '4x8', year: '2018', automation: 'Нет' } },
  { source: 'ask', name: 'Пётр', phone: '+79991234568', email: null, ip: '1.2.3.5',
    marketing: false, page_path: '/',
    payload: { question: 'Можно <b>спросить</b>?' } },
  { source: 'consult', name: 'Анна', phone: '+79991234569', email: 'a@x.ru', ip: '1.2.3.6',
    marketing: true, page_path: '/catalog.html',
    payload: { preferred_time: 'Завтра 10:00', note: 'Срочно' } },
  { source: 'quiz', name: 'Алексей', phone: '+79991234570', email: 'al@y.ru', ip: '1.2.3.7',
    marketing: true, page_path: '/models.html',
    payload: { size: '4x8', finish: 'composite', options: ['heating', 'uv'], budget: '2-3', timing: 'soon' } },
  { source: 'interest-popup', name: 'Мария', phone: '+79991234571', email: null, ip: '1.2.3.8',
    marketing: false, page_path: '/models/atlantida.html',
    payload: { model_name: 'Атлантида', model_id: 'atlantida', signals: { score: 87, activeSeconds: 42, photosViewed: 5, opens: 2 } } }
];

fixtures.forEach(function (f) {
  console.log('========================================');
  console.log('SOURCE: ' + f.source);
  console.log('========================================');
  console.log(tg.__buildText(f));
  console.log();
});

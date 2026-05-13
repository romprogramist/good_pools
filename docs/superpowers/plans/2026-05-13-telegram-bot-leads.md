# Telegram-бот для дублирования заявок — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дублировать все заявки с `/api/leads` в Telegram-чат параллельно с email — те же поля, та же группировка, тот же баннер «ФОРМА».

**Architecture:** Зеркало `lib/mailer.js`. Новый модуль `lib/telegram.js` экспортирует `sendLeadTelegram(lead)`. `routes/api.js` вызывает его рядом с `mailer.sendLeadEmail(lead)` через fire-and-forget. Транспорт — голый `fetch` к Bot API (Node 22 имеет global `fetch`), нулевые зависимости. Лейблы и переводы квиза переиспользуются из `mailer.js` через новые экспорты `buildPayloadRows` и `sectionTitleFor` — единый источник истины.

**Tech Stack:** Node 22, Express, global `fetch`, Telegram Bot API (`sendMessage` с `parse_mode: HTML`).

**Project conventions:**
- Тест-фреймворка нет — верификация через **ad-hoc Node-скрипты** (импорт функции, печать в stdout, проверка глазами) + браузерный smoke-тест в финале.
- Секреты в `.env` создаются вручную, не деплоятся CI — как `SMTP_*`.
- `lib/` уже в rsync-whitelist `deploy.yml` — новый файл уедет на прод автоматически.

**Spec:** `docs/superpowers/specs/2026-05-13-telegram-bot-leads-design.md`

---

## File Structure

| Файл | Назначение |
|------|-----------|
| `lib/telegram.js` | **NEW.** Экспорт `sendLeadTelegram(lead)`. Внутри: `escapeHtmlTG`, `buildText(lead)`, `getConfig()`, `fetch` к Bot API. |
| `lib/mailer.js` | **MODIFY.** Добавить в `module.exports` функции `buildPayloadRows` и `sectionTitleFor`. |
| `routes/api.js` | **MODIFY.** Require `../lib/telegram` + fire-and-forget вызов после `mailer.sendLeadEmail`. |
| `.env.example` | **MODIFY.** Две новые переменные с комментарием как получить токен и chat_id. |

---

### Task 1: Экспортировать `buildPayloadRows` и `sectionTitleFor` из mailer.js

**Files:**
- Modify: `lib/mailer.js:287-290`

Это foundation для Task 2 — модуль `telegram.js` должен импортировать те же функции, что строят payload-секцию письма, чтобы лейблы 100% совпадали.

- [ ] **Step 1: Заменить блок `module.exports`**

Открой `lib/mailer.js`, найди в самом низу:

```js
module.exports = {
  sendLeadEmail: sendLeadEmail,
  SOURCE_LABEL: SOURCE_LABEL
};
```

Замени на:

```js
module.exports = {
  sendLeadEmail: sendLeadEmail,
  SOURCE_LABEL: SOURCE_LABEL,
  buildPayloadRows: buildPayloadRows,
  sectionTitleFor: sectionTitleFor
};
```

- [ ] **Step 2: Smoke-проверить что mailer.js всё ещё парсится**

Run: `node -e "const m = require('./lib/mailer'); console.log(Object.keys(m))"`
From: `C:\Users\Roman\good_pools`
Expected stdout (ровно эти 4 ключа в любом порядке):
```
[ 'sendLeadEmail', 'SOURCE_LABEL', 'buildPayloadRows', 'sectionTitleFor' ]
```

- [ ] **Step 3: Commit**

```bash
git add lib/mailer.js
git commit -m "feat(mailer): экспорт buildPayloadRows и sectionTitleFor для переиспользования"
```

---

### Task 2: Создать `lib/telegram.js` — config + no-op при отсутствии креденшалов

**Files:**
- Create: `lib/telegram.js`

Сначала — только каркас с проверкой конфига. Без `buildText`, без `fetch`. Цель шага: убедиться, что модуль грузится и тихо ничего не делает, когда `.env` пустой (это критично — код должен быть безопасен для влива до получения токена).

- [ ] **Step 1: Создать `lib/telegram.js` с каркасом**

Создай файл `lib/telegram.js` со следующим содержимым:

```js
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
```

- [ ] **Step 2: Проверить что модуль грузится и no-op срабатывает без креденшалов**

Run:
```
node -e "process.env.TELEGRAM_BOT_TOKEN=''; process.env.TELEGRAM_CHAT_ID=''; const tg = require('./lib/telegram'); tg.sendLeadTelegram({}).then(() => console.log('OK no-op'))"
```
From: `C:\Users\Roman\good_pools`
Expected stdout:
```
[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не настроены — TG-уведомления отключены
OK no-op
```

- [ ] **Step 3: Commit**

```bash
git add lib/telegram.js
git commit -m "feat(telegram): каркас модуля с no-op при отсутствии креденшалов"
```

---

### Task 3: Реализовать `escapeHtmlTG` и `buildText(lead)` — формат сообщения

**Files:**
- Modify: `lib/telegram.js`

Это самая важная часть — рендер контента. Никакого `fetch` ещё нет; проверка через ad-hoc Node-скрипт, который печатает результат `buildText` для каждого из 5 источников. Глазами сверяем с email-форматом.

- [ ] **Step 1: Добавить функции `escapeHtmlTG` и `buildText` в `lib/telegram.js`**

Сразу после `const mailer = require('./mailer');` (но до `let configWarned`) вставь:

```js
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
```

- [ ] **Step 2: Создать ad-hoc verification script `scripts/verify-telegram-format.js`**

Создай папку `scripts/` если её нет. Запиши файл `scripts/verify-telegram-format.js`:

```js
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
```

- [ ] **Step 3: Временно экспортировать `buildText` из telegram.js для верификации**

В `lib/telegram.js` замени блок `module.exports`:

```js
module.exports = {
  sendLeadTelegram: sendLeadTelegram,
  __buildText: buildText  // временно для scripts/verify-telegram-format.js, убрать после верификации формата
};
```

- [ ] **Step 4: Запустить верификацию формата**

Run: `node scripts/verify-telegram-format.js`
From: `C:\Users\Roman\good_pools`
Expected: 5 блоков с правильным TG HTML. Проверь глазами:
- баннер `🔔 <b>ФОРМА: ...</b>` с правильным русским лейблом (`СЕРВИСНОЕ ОБСЛУЖИВАНИЕ`, `ЗАДАТЬ ВОПРОС`, `ЗАКАЗ КОНСУЛЬТАЦИИ`, `ПОДБОР БАССЕЙНА (КВИЗ)`, `ИНТЕРЕС К МОДЕЛИ (ПОП-АП)`)
- секция «👤 <b>Контакт</b>» с полным набором полей
- секция «📋 <b>...</b>» с правильным заголовком на каждый источник: `Параметры бассейна`, `Обращение`, `Пожелания клиента`, `Ответы клиента в квизе`, `Контекст поп-апа`
- квиз: значения переведены (`composite` → `Композитный`, `heating, uv` → `Подогрев воды, УФ лампа`, `2-3` → `2–3 млн руб`, `soon` → `В ближайшее время`)
- interest-popup: вложенный `signals` раскрыт построчно (Балл интереса/Активность/Просмотрено фото/Открытий)
- ask с `<b>` внутри текста — экранировано как `&lt;b&gt;спросить&lt;/b&gt;` (не как HTML-тег)
- email: пустой → `—`, заполненный → `<a href="mailto:...">`

Если в каком-то источнике порядок полей или лейбл отличается от того, что в email — это **баг в Task 1 или Task 3**, не правь форматирование вручную, найди где расхождение.

- [ ] **Step 5: Убрать временный экспорт `__buildText`**

В `lib/telegram.js` верни `module.exports` к виду:

```js
module.exports = {
  sendLeadTelegram: sendLeadTelegram
};
```

- [ ] **Step 6: Commit**

```bash
git add lib/telegram.js scripts/verify-telegram-format.js
git commit -m "feat(telegram): рендер TG HTML с переиспользованием mailer-лейблов"
```

---

### Task 4: Отправка через `fetch` с таймаутом

**Files:**
- Modify: `lib/telegram.js`

- [ ] **Step 1: Заполнить тело `sendLeadTelegram`**

В `lib/telegram.js` замени тело функции `sendLeadTelegram`:

```js
async function sendLeadTelegram(lead) {
  const cfg = getConfig();
  if (!cfg) return;

  const text = buildText(lead);
  const url = 'https://api.telegram.org/bot' + cfg.token + '/sendMessage';
  const body = {
    chat_id: cfg.chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 5000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const errText = await res.text().catch(function () { return ''; });
      throw new Error('Telegram API ' + res.status + ': ' + errText.slice(0, 200));
    }
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: Проверить что no-op путь всё ещё работает**

Run:
```
node -e "process.env.TELEGRAM_BOT_TOKEN=''; process.env.TELEGRAM_CHAT_ID=''; const tg = require('./lib/telegram'); tg.sendLeadTelegram({source:'ask',name:'X',phone:'+7',marketing:false,payload:{question:'q'}}).then(() => console.log('OK no-op'))"
```
From: `C:\Users\Roman\good_pools`
Expected stdout содержит `OK no-op` и warn-строку про неудачную конфигурацию. Никаких сетевых ошибок (мы не звоним fetch если конфиг пустой).

- [ ] **Step 3: Проверить что fetch вызывается при наличии конфига и корректно ловит 401 от Bot API**

Запусти с заведомо невалидным токеном:
```
node -e "process.env.TELEGRAM_BOT_TOKEN='000:fake'; process.env.TELEGRAM_CHAT_ID='1'; const tg = require('./lib/telegram'); tg.sendLeadTelegram({source:'ask',name:'X',phone:'+7',marketing:false,payload:{question:'q'}}).then(()=>console.log('UNEXPECTED OK')).catch(e=>console.log('EXPECTED ERR:',e.message))"
```
From: `C:\Users\Roman\good_pools`
Expected stdout: `EXPECTED ERR: Telegram API 404: ...` (или 401 — Bot API возвращает 404 на невалидный токен формата). Главное — что есть префикс `EXPECTED ERR:` и упомянут HTTP-код.

- [ ] **Step 4: Commit**

```bash
git add lib/telegram.js
git commit -m "feat(telegram): отправка через fetch к Bot API с 5s timeout"
```

---

### Task 5: Подключить в `routes/api.js`

**Files:**
- Modify: `routes/api.js:1-3, 225-227`

- [ ] **Step 1: Добавить require**

В `routes/api.js` найди вверху:

```js
const router = require('express').Router();
const pool = require('../db/pool');
const mailer = require('../lib/mailer');
```

Замени на:

```js
const router = require('express').Router();
const pool = require('../db/pool');
const mailer = require('../lib/mailer');
const telegram = require('../lib/telegram');
```

- [ ] **Step 2: Добавить fire-and-forget вызов рядом с mailer**

В том же файле найди блок (около строки 225):

```js
    mailer
      .sendLeadEmail({ source, source_label, page_path, name, phone, email, payload, marketing, ip })
      .catch(function (e) { console.error('[mailer] send failed:', e && e.message ? e.message : e); });

    res.json({ ok: true });
```

Замени на:

```js
    const leadForNotify = { source, source_label, page_path, name, phone, email, payload, marketing, ip };
    mailer.sendLeadEmail(leadForNotify)
      .catch(function (e) { console.error('[mailer] send failed:', e && e.message ? e.message : e); });
    telegram.sendLeadTelegram(leadForNotify)
      .catch(function (e) { console.error('[telegram] send failed:', e && e.message ? e.message : e); });

    res.json({ ok: true });
```

- [ ] **Step 3: Проверить что приложение стартует**

Останови dev-сервер если запущен (TaskStop на запущенном фоновом процессе) и запусти заново:

Run: `npm run dev`
From: `C:\Users\Roman\good_pools` (в фоне)
Expected: сервер слушает на 3050, в логах есть warn `[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не настроены` (один раз — лениво, при первом вызове) и `Server running on port 3050` или эквивалент.

Если телега ещё не дёрнута — warn появится только после первой заявки. Проверь, что без креденшалов сервер стартует чисто:

Run: `Invoke-WebRequest -Uri http://localhost:3050/api/leads -Method POST -ContentType 'application/json' -Body '{"source":"ask","name":"Test","phone":"+79991234567","consent":true,"payload":{"question":"test from plan"}}'` (PowerShell)
Expected: HTTP 200, JSON `{"ok":true}`. В логах сервера — `[telegram] ...не настроены`, **запрос НЕ упал** благодаря `.catch`. В БД должна быть новая запись (можно глянуть через `psql` если нужно, но не обязательно).

- [ ] **Step 4: Commit**

```bash
git add routes/api.js
git commit -m "feat(api): дублировать заявки в Telegram параллельно с email"
```

---

### Task 6: Обновить `.env.example`

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Дописать в конец `.env.example`**

Открой `.env.example` и в самый конец добавь:

```
# Telegram-бот для дублирования заявок (POST /api/leads → TG).
# 1. Открой @BotFather в Telegram → /newbot → имя → username → получишь токен.
# 2. Напиши боту /start (или добавь в группу и отправь любое сообщение).
# 3. Открой https://api.telegram.org/bot<TOKEN>/getUpdates → найди chat.id.
#    Для группы id отрицательный, например -1001234567890.
# Если переменные пусты — модуль молча ничего не отправляет (см. lib/telegram.js).
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(env): пример для TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID"
```

---

### Task 7: Локальный end-to-end smoke-тест с реальным ботом

**Files:** (только локальный `.env`, в репо не коммитим)

- [ ] **Step 1: Создать бота и получить chat_id**

В Telegram:
1. Найди `@BotFather` → `/newbot` → введи имя (любое) → введи username (заканчивается на `bot`) → BotFather пришлёт строку вида `123456789:ABCdefGhIJklmNOPqrStUVwxYZ` — это `TELEGRAM_BOT_TOKEN`.
2. Найди только что созданного бота по username → нажми START → отправь любое сообщение (например `hi`).
3. В браузере открой: `https://api.telegram.org/bot<TOKEN>/getUpdates` (подставь токен). Найди в JSON `"chat":{"id":...}` — это `TELEGRAM_CHAT_ID`.

Если хочешь в группу: добавь бота в группу, отправь в группе сообщение → тот же `getUpdates` → найди отрицательный id типа `-1001234567890`.

- [ ] **Step 2: Прописать в локальный `.env`**

Открой `C:\Users\Roman\good_pools\.env` и добавь две строки в конец:

```
TELEGRAM_BOT_TOKEN=<токен от BotFather>
TELEGRAM_CHAT_ID=<id из getUpdates>
```

- [ ] **Step 3: Перезапустить dev-сервер**

Останови старый `npm run dev` (если ещё крутится), запусти заново — `--watch` подхватывает изменения файлов, но не `.env`.

- [ ] **Step 4: Прогнать все 5 форм**

Открой `http://localhost:3050/` в браузере и отправь по одной заявке через каждую форму:
1. **`ask`** — кнопка «Задать вопрос» в шапке/футере.
2. **`consult`** — кнопка «Заказать консультацию» / «Связаться».
3. **`service`** — форма «Сервисное обслуживание» (на странице услуг или в футере).
4. **`quiz`** — пройти квиз «Подбор бассейна» (5 шагов: размер, отделка, опции, бюджет, сроки) и оставить контакт.
5. **`interest-popup`** — на странице модели (`/models/<любая>.html`) дождаться или спровоцировать поп-ап «Интересно?» и заполнить.

После каждой формы в Telegram должно прийти отдельное сообщение. Проверь визуально:
- Баннер ФОРМА совпадает с источником.
- Контактный блок полный.
- Секция payload содержит все поля с русскими лейблами; для квиза — переведённые значения.
- Кликабельные `tel:` и `mailto:` ссылки работают (тапни в TG).

- [ ] **Step 5: Negative-сценарий: убрать токен**

В `.env` закомментируй `TELEGRAM_BOT_TOKEN` (поставь `#` в начало строки). Перезапусти dev-сервер. Отправь любую форму. Ожидание:
- В логе сервера — один warn `[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID не настроены`.
- Сообщение в TG **не приходит** (это правильно).
- Email приходит (если SMTP-креды есть).
- В БД новая запись.
- HTTP-ответ клиенту — 200 `{"ok":true}`.

Раскомментируй обратно.

- [ ] **Step 6: Финальный commit (если были правки) или просто отметка готовности**

Если в ходе smoke-теста ничего править не пришлось — коммитить нечего. Если нашёл баг — фикс + коммит с осмысленным сообщением.

---

### Task 8: Деплой на прод

**Files:** (workflow уже настроен — это операционные шаги)

- [ ] **Step 1: Запушить ветку main**

```bash
git push origin main
```

GitHub Actions автоматически:
1. Запустит `.github/workflows/deploy.yml`.
2. Через rsync доставит `lib/telegram.js` и обновлённые `lib/mailer.js`, `routes/api.js` в `/var/www/good-pools/`.
3. `pm2 restart good-pools`.

Дождись зелёного билда (GitHub → Actions).

- [ ] **Step 2: SSH на прод и добавить токен в `.env`**

```bash
ssh roman@95.163.236.186
sudo -u roman nano /var/www/good-pools/.env
```

Добавь:
```
TELEGRAM_BOT_TOKEN=<тот же что локально или новый прод-бот>
TELEGRAM_CHAT_ID=<тот же что локально или прод-чат>
```

Сохрани, выйди (`Ctrl+O`, `Enter`, `Ctrl+X`).

⚠️ Если хочешь разные боты на прод/локалку (рекомендую) — создай через BotFather второго бота с другим именем, его токен пропиши на прод.

- [ ] **Step 3: Перезапустить pm2-процесс**

```bash
pm2 restart good-pools
pm2 logs good-pools --lines 30
```

Expected: процесс поднялся, в логах нет ошибок про telegram. Warn про TELEGRAM_*не настроены **не должно быть** (мы только что прописали).

- [ ] **Step 4: Прод-smoke**

Открой реальный домен (`https://хорошиебассейны.рф` или текущий боевой) и отправь 2 разные формы (например `quiz` и `interest-popup` — самые сложные по payload). Проверь в TG — пришли оба сообщения.

- [ ] **Step 5: Готово**

Удачи. Если что-то не пришло — `pm2 logs good-pools` на проде даст конкретную причину (`[telegram] send failed: ...`).

---

## Self-Review (заполнено автором плана)

**Spec coverage:**
- Архитектура (зеркало mailer.js, fire-and-forget) → Task 5
- Транспорт (fetch + 5s timeout) → Task 4
- Конфигурация (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, no-op при отсутствии) → Task 2, Task 6
- Формат сообщения (TG HTML, 5 источников, переиспользование лейблов) → Task 1, Task 3
- Файлы (4 шт: `lib/telegram.js`, `lib/mailer.js`, `routes/api.js`, `.env.example`) → Task 1, 2, 3, 4, 5, 6
- Деплой (rsync whitelist уже покрывает `lib/`, ручное обновление `.env` на проде) → Task 8
- Верификация (5 форм локально + 2 на проде, negative-сценарий) → Task 7, Task 8

**Placeholder scan:** Нет `TBD`/`TODO`/`implement later` в шагах — кроме `// TODO Task 4` в Task 2 Step 1, который **намеренный маркер** и удаляется в Task 4 Step 1 (там тело функции переписывается целиком).

**Type consistency:**
- `sendLeadTelegram(lead)` — одна и та же сигнатура в Task 2, 4, 5.
- `lead` объект имеет одинаковые поля везде: `source`, `source_label`, `page_path`, `name`, `phone`, `email`, `payload`, `marketing`, `ip` — соответствуют тому, что собирает `routes/api.js` (см. оригинальный код в спеке).
- `buildText(lead)` — internal, не экспортируется (кроме временного `__buildText` в Task 3, удаляется в том же таске).
- `buildPayloadRows(payload, source)` и `sectionTitleFor(source)` — экспортируются в Task 1, импортируются в Task 3.

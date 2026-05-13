# Telegram-бот для дублирования заявок

Все заявки с сайта (`/api/leads`) должны асинхронно дублироваться в Telegram-чат — параллельно с уже существующей отправкой на email через `lib/mailer.js`. Контент должен совпадать с email-версией: те же поля, та же группировка, тот же баннер «ФОРМА», та же секция payload с русскими лейблами.

## Архитектура

Зеркало `lib/mailer.js`. Новый модуль `lib/telegram.js` экспортирует:

```js
async function sendLeadTelegram(lead) { ... }
```

В `routes/api.js` после успешной записи в БД — fire-and-forget рядом с mailer'ом:

```js
mailer.sendLeadEmail(lead).catch(e => console.error('[mailer] send failed:', e.message));
telegram.sendLeadTelegram(lead).catch(e => console.error('[telegram] send failed:', e.message));
```

TG-сбой не блокирует ответ клиенту и не влияет на email. Заявка уже в БД — это источник истины.

## Транспорт

Голый `fetch` к Telegram Bot API:

```
POST https://api.telegram.org/bot<TOKEN>/sendMessage
Content-Type: application/json
{ "chat_id": <CHAT_ID>, "text": "...", "parse_mode": "HTML", "disable_web_page_preview": true }
```

Node 22 имеет глобальный `fetch`. Никаких npm-зависимостей. Таймаут 5 секунд через `AbortController`.

## Конфигурация

В `.env` на проде (создаётся вручную, как SMTP-креды — не в репо, не деплоится CI):

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Если хотя бы одна переменная пуста — модуль логирует одиночный warn (как `mailer.js`) и `sendLeadTelegram` становится no-op. Это позволяет влить код до получения токена.

## Формат сообщения

Telegram HTML (`parse_mode: HTML`). Содержимое **строго совпадает** с email-версией по полям и порядку.

```
🔔 <b>ФОРМА: ПОДБОР БАССЕЙНА (КВИЗ)</b>

📅 13.05.2026, 14:32 (МСК)

👤 <b>Контакт</b>
Имя: Иван
Телефон: <a href="tel:+79991234567">+7 999 123-45-67</a>
Email: <a href="mailto:ivan@example.com">ivan@example.com</a>
Согласие на маркетинг: Да
IP клиента: 95.163.236.186
Страница: /catalog.html

📋 <b>Ответы клиента в квизе</b>
Размер бассейна: 4 × 8 м
Тип отделки: Композитный
Дополнительные опции: Подогрев воды, УФ лампа
Бюджет: 2–3 млн руб
Сроки: В ближайшее время
```

Заголовок секции payload (`section_title`) и лейблы payload — единый источник истины с email: `mailer.js` экспортирует `buildPayloadRows(payload, source)` и `sectionTitleFor(source)`, `telegram.js` их импортирует. Это гарантирует, что любое изменение перевода квиза или лейблов сервис-формы автоматически отражается в обоих каналах.

Все строки данных проходят через локальный `escapeHtmlTG(str)` (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`). Кавычки в TG HTML не требуют экранирования.

## Файлы

| Файл | Изменение |
|------|-----------|
| `lib/telegram.js` | Новый модуль (~80 строк) |
| `lib/mailer.js` | Добавить экспорт `buildPayloadRows` и `sectionTitleFor` |
| `routes/api.js` | `require('../lib/telegram')` + 1 вызов |
| `.env.example` | Две новые переменные с комментарием как получить |

Никаких миграций БД, никаких новых маршрутов, никаких новых зависимостей.

## Деплой

`lib/` уже в rsync-whitelist (`.github/workflows/deploy.yml`). Новый файл `lib/telegram.js` уедет автоматически. После первого деплоя — единоразово на сервере: добавить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` в `/var/www/good-pools/.env`, `pm2 restart good-pools`.

## Верификация

Тест-фреймворка в проекте нет. Браузерный smoke-тест:

1. Локально: создать бота в `@BotFather` → получить токен → узнать `chat_id` (через `getUpdates` после первого сообщения боту) → положить в `.env` → перезапустить `npm run dev` → дёрнуть каждую из 5 форм (`service`, `ask`, `consult`, `quiz`, `interest-popup`) → проверить, что в TG пришло сообщение с правильным баннером ФОРМА и набором полей, идентичным email.
2. Прод: после деплоя — то же самое на боевом сайте, проверить минимум 2 разные формы.

Negative-сценарий: убрать `TELEGRAM_BOT_TOKEN` из `.env`, дёрнуть форму — в логе должен быть один warn, в БД заявка есть, email пришёл, ничего не сломано.

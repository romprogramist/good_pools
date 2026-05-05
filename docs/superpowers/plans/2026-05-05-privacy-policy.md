# Privacy Policy + Consent + /api/leads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести good-pools (хорошиебассейны.рф) в соответствие с 152-ФЗ — публикуемая политика обработки ПД, чекбоксы согласия на 5 формах, cookie-плашка, бэкенд `/api/leads` с фиксацией согласия в БД.

**Architecture:** Статическая `privacy.html` в корне репо (как `index.html`), общие CSS-примитивы для чекбоксов, отдельный JS-модуль cookie-плашки, новый Express-роут `POST /api/leads` пишет в новую таблицу `leads`. Все 5 фронтовых модулей форм (service, ask, consult, quiz, interest-popup) переключаются с `console.log` на этот эндпоинт и получают чекбоксы.

**Tech Stack:** Node/Express, PostgreSQL (миграции через `db/migrate.js`), статический фронт (vanilla JS, EJS только для админки), CI через `.github/workflows/deploy.yml` (rsync).

**Тестирование:** В проекте нет автотестов. Каждая задача завершается шагом ручной проверки (`curl`, открытие страницы в `http://localhost:3050/`, `psql`). При прохождении ручной проверки — сразу коммит.

**Спека:** `docs/superpowers/specs/2026-05-05-privacy-policy-design.md`.

---

## Task 1: Миграция БД — таблица `leads`

**Files:**
- Create: `db/migrations/0003_leads.sql`
- Modify: `db/init.sql` (append leads table at the end, before any final statements)

- [ ] **Step 1: Создать миграцию**

Создай `db/migrations/0003_leads.sql` со следующим содержимым:

```sql
-- 0003_leads.sql
-- Таблица заявок с фиксацией согласия на обработку ПД (152-ФЗ).

CREATE TABLE IF NOT EXISTS leads (
  id                BIGSERIAL PRIMARY KEY,
  source            VARCHAR(32)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  phone             VARCHAR(32)  NOT NULL,
  email             VARCHAR(255),
  payload           JSONB,
  consent_given     BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_marketing BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  consent_ip        VARCHAR(64),
  policy_version    VARCHAR(32)  NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_source_idx     ON leads (source);
```

- [ ] **Step 2: Обновить `db/init.sql`**

В конец `db/init.sql` (перед любой завершающей пустой строкой) добавь тот же DDL — слово в слово как в Step 1, чтобы fresh install сходился с миграциями.

- [ ] **Step 3: Прогнать миграцию локально**

Run: `cd ~/good_pools && node db/migrate.js`
Expected: вывод вида `Applied: 0003_leads.sql` (или ничего, если уже применено).

- [ ] **Step 4: Проверить таблицу**

Run: `psql "$DATABASE_URL" -c "\d leads"`
Expected: видны столбцы `id, source, name, phone, email, payload, consent_given, consent_marketing, consent_at, consent_ip, policy_version, created_at` и два индекса.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/0003_leads.sql db/init.sql
git commit -m "feat(db): add leads table with consent fields"
```

---

## Task 2: Бэкенд — `POST /api/leads`

**Files:**
- Modify: `routes/api.js` (добавить роут перед `module.exports`)

- [ ] **Step 1: Добавить роут в `routes/api.js`**

В самый верх файла (после `const router = ...; const pool = ...;`) добавить константу:

```js
const POLICY_VERSION = '2026-05-05';
const VALID_SOURCES = ['service', 'ask', 'consult', 'quiz', 'interest-popup'];
```

Перед `module.exports = router;` вставить:

```js
// POST /api/leads — приём заявок с фиксацией согласия на обработку ПД
router.post('/leads', async function (req, res) {
  try {
    const body = req.body || {};
    const source = String(body.source || '').trim();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = body.email ? String(body.email).trim() : null;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : null;
    const consent = body.consent === true;
    const marketing = body.marketing === true;

    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).json({ error: 'Invalid source' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Consent required' });
    }
    if (name.length < 2 || name.length > 255) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      return res.status(400).json({ error: 'Invalid phone' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim().slice(0, 64);

    await pool.query(
      `INSERT INTO leads
       (source, name, phone, email, payload, consent_given, consent_marketing, consent_ip, policy_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [source, name, phone, email, payload ? JSON.stringify(payload) : null, true, marketing, ip, POLICY_VERSION]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[api/leads]', err);
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 2: Перезапустить dev-сервер**

`npm run dev` уже работает с `node --watch` — перезапустится сам при сохранении файла. Если запущен иначе — перезапусти руками.

- [ ] **Step 3: Проверить успешный POST**

Run:
```bash
curl -i -X POST http://localhost:3050/api/leads \
  -H "Content-Type: application/json" \
  -d '{"source":"consult","name":"Тест","phone":"+7 (999) 123-45-67","consent":true,"marketing":false}'
```
Expected: `HTTP/1.1 200 OK`, тело `{"ok":true}`.

- [ ] **Step 4: Проверить отказ без согласия**

Run:
```bash
curl -i -X POST http://localhost:3050/api/leads \
  -H "Content-Type: application/json" \
  -d '{"source":"consult","name":"Тест","phone":"+7 (999) 123-45-67","consent":false}'
```
Expected: `HTTP/1.1 400 Bad Request`, тело `{"error":"Consent required"}`.

- [ ] **Step 5: Проверить отказ при невалидном source**

Run:
```bash
curl -i -X POST http://localhost:3050/api/leads \
  -H "Content-Type: application/json" \
  -d '{"source":"hack","name":"Тест","phone":"+79991234567","consent":true}'
```
Expected: `HTTP/1.1 400 Bad Request`, тело `{"error":"Invalid source"}`.

- [ ] **Step 6: Проверить запись в БД**

Run: `psql "$DATABASE_URL" -c "SELECT id, source, name, phone, consent_given, policy_version FROM leads ORDER BY id DESC LIMIT 3;"`
Expected: видна тестовая запись из Step 3 со значениями `source=consult`, `consent_given=t`, `policy_version=2026-05-05`.

- [ ] **Step 7: Удалить тестовые записи**

Run: `psql "$DATABASE_URL" -c "DELETE FROM leads WHERE name = 'Тест';"`

- [ ] **Step 8: Commit**

```bash
git add routes/api.js
git commit -m "feat(api): add POST /api/leads with consent validation"
```

---

## Task 3: Страница `privacy.html`

**Files:**
- Create: `privacy.html` (корень репо)

- [ ] **Step 1: Создать `privacy.html`**

Шаблон страницы (полный текст ниже). Подключения CSS/JS — те же, что у `index.html` (header/footer стили). Header и футер — как на главной (можно скопировать `<header>...</header>` и `<footer>...</footer>` из `index.html` без изменений; обернуть основной текст в `<main class="privacy">`).

Содержимое тела страницы (раздел `<main class="privacy">`):

```html
<main class="privacy" style="max-width:860px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222;">
  <h1>Политика обработки персональных данных</h1>
  <p><em>Редакция от 5 мая 2026 г.</em></p>

  <h2>1. Общие положения</h2>
  <p>Настоящая Политика обработки персональных данных (далее — «Политика») разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению их безопасности, предпринимаемые ООО «Хорошие бассейны».</p>
  <p><strong>Оператор персональных данных:</strong></p>
  <ul>
    <li>Полное наименование: Общество с ограниченной ответственностью «Хорошие бассейны»</li>
    <li>Сокращённое наименование: ООО «Хорошие бассейны»</li>
    <li>Генеральный директор: Рожко Виктория Андреевна</li>
    <li>ИНН / КПП: 6168118370 / 616801001</li>
    <li>ОГРН: 1226100027009</li>
    <li>Юридический адрес: 344091, г. Ростов-на-Дону, ул. Малиновского, д. 3 б, ком. 32/В</li>
    <li>Телефон: 8-961-320-10-50</li>
    <li>E-mail для обращений субъектов ПД: <a href="mailto:Goodbass1@yandex.ru">Goodbass1@yandex.ru</a></li>
    <li>Сайт: хорошиебассейны.рф</li>
  </ul>

  <h2>2. Термины и определения</h2>
  <p><strong>Персональные данные (ПД)</strong> — любая информация, относящаяся к прямо или косвенно определённому или определяемому физическому лицу.</p>
  <p><strong>Оператор</strong> — ООО «Хорошие бассейны».</p>
  <p><strong>Пользователь</strong> — посетитель сайта хорошиебассейны.рф.</p>
  <p><strong>Обработка ПД</strong> — любое действие или совокупность действий с ПД (сбор, запись, систематизация, хранение, уточнение, использование, передача, обезличивание, блокирование, удаление, уничтожение).</p>
  <p><strong>Cookies</strong> — небольшие фрагменты данных, сохраняемые браузером пользователя при посещении сайта.</p>

  <h2>3. Принципы обработки ПД</h2>
  <p>Оператор осуществляет обработку ПД на основе следующих принципов:</p>
  <ul>
    <li>законность и справедливость целей и способов обработки;</li>
    <li>соответствие объёма и характера обрабатываемых ПД заявленным целям;</li>
    <li>достоверность ПД и их актуальность;</li>
    <li>хранение ПД не дольше, чем требуется целью обработки;</li>
    <li>недопущение объединения баз данных, обрабатываемых в несовместимых целях.</li>
  </ul>

  <h2>4. Права и обязанности субъекта ПД</h2>
  <p>Субъект ПД имеет право:</p>
  <ul>
    <li>получать информацию об обработке своих ПД (с исключениями, предусмотренными законом);</li>
    <li>требовать уточнения, блокирования или удаления неполных, устаревших, неточных или незаконно полученных ПД;</li>
    <li>отозвать согласие на обработку ПД в любой момент;</li>
    <li>требовать прекращения обработки ПД;</li>
    <li>обжаловать действия Оператора в Роскомнадзор или в суд.</li>
  </ul>
  <p>Субъект обязуется предоставлять достоверные сведения и своевременно сообщать об их изменении.</p>

  <h2>5. Правовые основания обработки ПД</h2>
  <p>Правовыми основаниями обработки являются:</p>
  <ul>
    <li>Федеральный закон № 152-ФЗ «О персональных данных» и иные нормативные правовые акты РФ;</li>
    <li>согласие пользователя на обработку ПД, выраженное путём заполнения форм на сайте и проставления соответствующей отметки;</li>
    <li>договоры, заключённые между Оператором и пользователем.</li>
  </ul>

  <h2>6. Состав обрабатываемых ПД и цели обработки</h2>
  <p>Оператор обрабатывает следующие персональные данные пользователей:</p>
  <ul>
    <li>фамилия, имя, отчество;</li>
    <li>номер телефона;</li>
    <li>адрес электронной почты;</li>
    <li>ответы на вопросы интерактивных форм (квиз, заявка на сервис и т.п.);</li>
    <li>иные сведения, добровольно предоставленные пользователем через формы на сайте.</li>
  </ul>
  <p>Цели обработки:</p>
  <ul>
    <li>обработка заявок и обратная связь по ним;</li>
    <li>консультация по услугам строительства, монтажа и обслуживания бассейнов;</li>
    <li>заключение, исполнение и прекращение договоров;</li>
    <li>направление информационных и маркетинговых сообщений (только при наличии отдельного согласия пользователя);</li>
    <li>аналитика посещаемости сайта.</li>
  </ul>

  <h2>7. Порядок и условия обработки ПД</h2>
  <p>Обработка осуществляется как с использованием средств автоматизации, так и без них. Доступ к ПД имеют только уполномоченные сотрудники Оператора.</p>
  <p>Срок хранения ПД определяется целями обработки, условиями договора и требованиями законодательства РФ. По достижении целей обработки либо при отзыве согласия ПД подлежат удалению или обезличиванию, если иное не предусмотрено законом.</p>
  <p>Оператор вправе передавать ПД третьим лицам в случае использования сторонних сервисов (аналитики, форм обратной связи, телефонии, коллтрекинга, почтовых сервисов и иных технических инструментов) — в объёме, необходимом для достижения целей обработки, и при соблюдении требований законодательства.</p>

  <h2>8. Меры защиты ПД. Отзыв согласия</h2>
  <p>Оператор принимает необходимые правовые, организационные и технические меры для защиты ПД от неправомерного или случайного доступа, изменения, блокирования, копирования, распространения и уничтожения. В частности:</p>
  <ul>
    <li>передача данных по сети защищена шифрованием (HTTPS);</li>
    <li>пароли учётных записей хранятся в виде криптографических хешей;</li>
    <li>доступ к административной панели ограничен авторизованными сотрудниками;</li>
    <li>регулярно проводится резервное копирование БД.</li>
  </ul>
  <p>Для отзыва согласия на обработку ПД либо для запроса об актуализации/удалении данных направьте письмо на <a href="mailto:Goodbass1@yandex.ru">Goodbass1@yandex.ru</a> с темой «Отзыв согласия на обработку персональных данных» либо «Актуализация данных». Оператор обязуется рассмотреть обращение в сроки, установленные законом.</p>

  <h2>9. Cookies и аналитика</h2>
  <p>Сайт использует файлы cookies для обеспечения работы интерфейса и сбора обезличенной статистики посещаемости. Продолжая использовать сайт, пользователь соглашается на обработку файлов cookies. Отключение cookies в настройках браузера может ограничить функциональность сайта.</p>

  <h2>10. Трансграничная передача ПД</h2>
  <p>Трансграничная передача персональных данных осуществляется только в порядке, установленном законодательством РФ, и при наличии надлежащих оснований.</p>

  <h2>11. Конфиденциальность</h2>
  <p>Оператор обязуется не раскрывать полученные ПД третьим лицам без согласия субъекта, за исключением случаев, прямо предусмотренных законодательством РФ.</p>

  <h2>12. Изменение Политики</h2>
  <p>Оператор вправе вносить изменения в настоящую Политику. Действующая редакция размещается по адресу хорошиебассейны.рф/privacy.html. Пользователю рекомендуется периодически проверять Политику на наличие изменений.</p>

  <p style="margin-top:32px;"><a href="/">← На главную</a></p>
</main>
```

Header и footer — скопировать из `index.html` (от `<header>` до `</header>` включительно и от `<footer class="footer">` до `</footer>` включительно), вставить вокруг `<main class="privacy">` соответственно.

В `<head>` подключить те же стили, что у `index.html`:
```html
<link rel="stylesheet" href="css/style.css?v=20260505">
```

(Дополнительные стили чекбоксов и cookie-плашки будут добавлены в Task 5/6 — пока не подключаем.)

В конец body — те же скрипты, которые на index.html шли до этого, оставить минимальный набор для работы шапки (`js/header.js` если есть, иначе оставить только базовое). Скрипты форм (`consult.js`, `quiz.js`, `ask.js`, `service.js`) на странице политики **не подключаем** — они здесь не нужны.

- [ ] **Step 2: Открыть страницу в браузере**

Run: `open http://localhost:3050/privacy.html`
Expected: страница открывается, шапка и футер как на index, текст политики читается, реквизиты ООО «Хорошие бассейны» видны корректно.

- [ ] **Step 3: Commit**

```bash
git add privacy.html
git commit -m "feat(privacy): add /privacy.html with full policy text"
```

---

## Task 4: Ссылка из футера + локальный hardlink + deploy.yml

**Files:**
- Modify: `index.html`, `catalog.html`, `models.html`, `portfolio.html` — добавить ссылку «Политика конфиденциальности» в `.footer-bottom`
- Modify: `.github/workflows/deploy.yml` — добавить `privacy.html` в rsync фронта
- Local action: `ln public/privacy.html → privacy.html`

- [ ] **Step 1: Найти текущий блок `.footer-bottom`**

Run: `grep -n "footer-bottom" index.html`
Expected: одна строка вида `<div class="footer-bottom">`. Запиши номер.

- [ ] **Step 2: Добавить ссылку в футер `index.html`**

В блок `<div class="footer-bottom">` после `<span>&copy; 2026 Хорошие Бассейны. Все права защищены.</span>` добавить:

```html
<a href="/privacy.html" class="footer-policy-link">Политика конфиденциальности</a>
```

- [ ] **Step 3: Повторить для остальных трёх страниц**

Run точно такую же правку в файлах `catalog.html`, `models.html`, `portfolio.html`. Если разметка `.footer-bottom` отличается — добавь ссылку в логичное место рядом с копирайтом.

- [ ] **Step 4: Стиль ссылки**

В конец `css/style.css` добавь:
```css
.footer-policy-link { color: rgba(255,255,255,.7); margin-left: 16px; text-decoration: underline; font-size: 13px; }
.footer-policy-link:hover { color: #fff; }
```
(Цвета подгони под текущую палитру футера, если фон не тёмный.)

- [ ] **Step 5: Локальный hardlink в `public/`**

CLAUDE.md описывает, что локально HTML лежит в корне, а сервер раздаёт `public/`. На macOS junctions нет — используется hardlink:

Run: `cd ~/good_pools && ln privacy.html public/privacy.html`
Expected: команда выполнилась без ошибок. Проверь: `ls -li privacy.html public/privacy.html` — inode номера должны совпадать.

- [ ] **Step 6: Обновить `.github/workflows/deploy.yml`**

Найди блок «Deploy frontend to /var/www/good-pools/public/» (около строки 47–52). В строке rsync:

было:
```
index.html catalog.html models.html portfolio.html \
slider-data.js \
```
стало:
```
index.html catalog.html models.html portfolio.html privacy.html \
slider-data.js \
```

- [ ] **Step 7: Проверить локально**

Run: `open http://localhost:3050/`
Expected: главная грузится, в самом низу футера видна ссылка «Политика конфиденциальности», клик открывает `/privacy.html`.

Повторить для `catalog.html`, `models.html`, `portfolio.html`.

- [ ] **Step 8: Commit**

```bash
git add index.html catalog.html models.html portfolio.html css/style.css .github/workflows/deploy.yml
git commit -m "feat(footer): add privacy policy link on all pages"
```

(Hardlink `public/privacy.html` в репо не коммитится — `public/` уже в `.gitignore`.)

---

## Task 5: Общие стили и помощник для чекбоксов согласия

**Files:**
- Create: `css/consent.css`
- Create: `js/consent-helper.js` — общий helper для блокировки submit и чтения значения чекбоксов

- [ ] **Step 1: Создать `css/consent.css`**

```css
/* Чекбоксы согласия на обработку ПД и маркетинг */
.consent {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(0,0,0,.72);
  cursor: pointer;
}
.consent input[type="checkbox"] {
  flex-shrink: 0;
  margin-top: 2px;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.consent a {
  color: #0ea5e9;
  text-decoration: underline;
}
.consent a:hover { color: #0284c7; }
.consent--marketing { color: rgba(0,0,0,.55); }

/* Состояние «обязательный чекбокс не отмечен» — submit-кнопка визуально приглушена */
button[disabled].consent-blocked,
.consent-blocked[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Создать `js/consent-helper.js`**

```js
// Общий helper для форм с чекбоксом согласия на обработку ПД.
// Использование:
//   ConsentHelper.attach(formElement, submitButtonElement);
//   ...
//   const { consent, marketing } = ConsentHelper.read(formElement);
(function () {
  'use strict';
  const ConsentHelper = {
    attach(form, submitBtn) {
      if (!form || !submitBtn) return;
      const required = form.querySelector('input[name="consent"]');
      if (!required) return;
      const sync = () => {
        const ok = required.checked;
        submitBtn.disabled = !ok;
        submitBtn.classList.toggle('consent-blocked', !ok);
      };
      required.addEventListener('change', sync);
      sync();
    },
    read(form) {
      const required = form.querySelector('input[name="consent"]');
      const marketing = form.querySelector('input[name="marketing"]');
      return {
        consent: !!(required && required.checked),
        marketing: !!(marketing && marketing.checked)
      };
    }
  };
  window.ConsentHelper = ConsentHelper;
})();
```

- [ ] **Step 3: Подключить на 4 публичных страницах**

В `<head>` каждой из `index.html`, `catalog.html`, `models.html`, `portfolio.html` добавить:
```html
<link rel="stylesheet" href="css/consent.css?v=20260505">
```

Перед `</body>` каждой страницы добавить (до подключений form-модулей `consult.js`, `quiz.js`, `ask.js`, `service.js`, `interest-popup.js`):
```html
<script src="js/consent-helper.js?v=20260505" defer></script>
```

`defer` важен: модули форм используют `ConsentHelper`, поэтому helper должен загрузиться раньше них или быть готов до DOMContentLoaded. Так как `defer` сохраняет порядок и все скрипты с `defer` исполняются до `DOMContentLoaded`, это работает.

- [ ] **Step 4: Проверить, что подключения не сломали страницы**

Run: `open http://localhost:3050/`, открой DevTools → Console.
Expected: страница грузится без 404 на consent.css/consent-helper.js, в консоли нет новых ошибок.

Повторить для catalog/models/portfolio.

- [ ] **Step 5: Commit**

```bash
git add css/consent.css js/consent-helper.js index.html catalog.html models.html portfolio.html
git commit -m "feat(consent): add shared consent checkbox styles and helper"
```

---

## Task 6: Cookie-плашка

**Files:**
- Create: `css/cookie-banner.css`
- Create: `js/cookie-banner.js`
- Modify: `index.html`, `catalog.html`, `models.html`, `portfolio.html`, `privacy.html` — подключить css и js

- [ ] **Step 1: Создать `css/cookie-banner.css`**

```css
.cookie-banner {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  background: #1f2937;
  color: #fff;
  padding: 14px 18px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
  font-size: 14px;
  line-height: 1.4;
}
.cookie-banner__text { flex: 1 1 320px; }
.cookie-banner__text a { color: #7dd3fc; text-decoration: underline; }
.cookie-banner__btn {
  flex-shrink: 0;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.cookie-banner__btn:hover { background: #0284c7; }
@media (max-width: 480px) {
  .cookie-banner { flex-direction: column; align-items: stretch; }
  .cookie-banner__btn { width: 100%; }
}
```

- [ ] **Step 2: Создать `js/cookie-banner.js`**

```js
(function () {
  'use strict';
  const STORAGE_KEY = 'cookieAccepted';

  function init() {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Согласие на cookies');
    banner.innerHTML =
      '<div class="cookie-banner__text">' +
      'Продолжая использовать сайт, вы соглашаетесь на обработку файлов cookie. ' +
      'Подробнее в <a href="/privacy.html">Политике конфиденциальности</a>.' +
      '</div>' +
      '<button type="button" class="cookie-banner__btn">Принять</button>';
    document.body.appendChild(banner);
    banner.querySelector('.cookie-banner__btn').addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      banner.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 3: Подключить на всех 5 страницах**

В `<head>` каждой из `index.html`, `catalog.html`, `models.html`, `portfolio.html`, `privacy.html`:
```html
<link rel="stylesheet" href="css/cookie-banner.css?v=20260505">
```

Перед `</body>`:
```html
<script src="js/cookie-banner.js?v=20260505" defer></script>
```

- [ ] **Step 4: Проверить плашку**

Run: открыть DevTools → Application → Local Storage → удалить ключ `cookieAccepted`. Перезагрузить страницу.
Expected: внизу появляется плашка с текстом и кнопкой «Принять». Клик → плашка исчезает.

Перезагрузить ещё раз — плашка не появляется (флаг сохранён в localStorage).

- [ ] **Step 5: Commit**

```bash
git add css/cookie-banner.css js/cookie-banner.js index.html catalog.html models.html portfolio.html privacy.html
git commit -m "feat(cookies): add bottom cookie consent banner"
```

---

## Task 7: Wire `js/service.js` (форма «Запись на сервис»)

**Files:**
- Modify: `index.html` — добавить чекбоксы в форму `#serviceForm`
- Modify: `js/service.js` — навесить ConsentHelper, добавить POST /api/leads (сохранить открытие WhatsApp)

- [ ] **Step 1: Добавить чекбоксы в `index.html`**

Найди в `index.html` форму `<form class="service-form" id="serviceForm" novalidate>`. Внутри неё, **перед** кнопкой submit (или, если кнопки нет в этом блоке — перед закрывающим `</form>`), вставь:

```html
<label class="consent">
  <input type="checkbox" name="consent" required>
  <span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>
</label>
<label class="consent consent--marketing">
  <input type="checkbox" name="marketing">
  <span>Согласен получать рекламные сообщения и информацию об акциях</span>
</label>
```

Если кнопки submit нет (форма submit-ится по Enter) — найди её в шаблоне формы или добавь в логичное место. Кнопка должна быть `<button type="submit" class="...">Отправить</button>` — её существующий класс не трогай.

- [ ] **Step 2: Подключить ConsentHelper и POST в `js/service.js`**

В файле `js/service.js`, в блоке `document.addEventListener('DOMContentLoaded', () => { ... })`:

После строки `if (!form) return;` добавить:
```js
const submitBtn = form.querySelector('button[type="submit"]');
if (window.ConsentHelper && submitBtn) ConsentHelper.attach(form, submitBtn);
```

Заменить целиком блок `form.addEventListener('submit', (e) => { ... })` на:
```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const result = readAndValidate(form);
  if (!result.ok) {
    result.firstInvalid && result.firstInvalid.focus();
    return;
  }
  const { consent, marketing } = window.ConsentHelper
    ? window.ConsentHelper.read(form)
    : { consent: true, marketing: false };
  if (!consent) return;

  const text = buildMessage(result.data);
  const url = `https://wa.me/${CONTACT_PHONE}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener');
  showToast(toast, 'Отправляем заявку…');

  fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'service',
      name: result.data.name,
      phone: result.data.phone,
      payload: {
        size: result.data.size,
        year: result.data.year,
        automation: result.data.automation,
        comment: result.data.comment
      },
      consent: true,
      marketing: marketing
    })
  }).catch((err) => console.error('[service] /api/leads failed', err));
});
```

- [ ] **Step 3: Проверить блокировку кнопки**

Run: `open http://localhost:3050/#service` (или скролл к секции сервиса).
Expected: кнопка «Отправить» полупрозрачная и `cursor: not-allowed`. Поставить галочку «Я согласен…» — кнопка активируется.

- [ ] **Step 4: Проверить отправку**

Заполнить форму валидно, поставить чекбокс «согласен», нажать «Отправить».
Expected:
- открывается новая вкладка `wa.me/...` (как было раньше);
- в DevTools → Network видно `POST /api/leads` со статусом 200;
- в `psql "$DATABASE_URL" -c "SELECT id, source, name, phone, payload->>'size' AS size, consent_marketing FROM leads ORDER BY id DESC LIMIT 1;"` — новая запись с `source=service`.

- [ ] **Step 5: Commit**

```bash
git add index.html js/service.js
git commit -m "feat(service-form): add consent checkboxes and wire to /api/leads"
```

---

## Task 8: Wire `js/ask.js` (форма «Не нашли ответ»)

**Files:**
- Modify: `index.html` — добавить чекбоксы в `<form class="ask-form" data-ask-form>` (заменить существующий disclaimer)
- Modify: `js/ask.js` — заменить console.log на POST /api/leads, навесить ConsentHelper

- [ ] **Step 1: Заменить disclaimer на чекбоксы в `index.html`**

Найди в `index.html` блок `<form class="ask-form" data-ask-form novalidate>`. Внутри, **удалить** строку:
```html
<p class="ask-disclaimer">Нажимая на кнопку вы соглашаетесь на обработку данных</p>
```

**Перед** кнопкой `<button type="submit" class="ask-submit">Отправить</button>` вставить:
```html
<label class="consent">
  <input type="checkbox" name="consent" required>
  <span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>
</label>
<label class="consent consent--marketing">
  <input type="checkbox" name="marketing">
  <span>Согласен получать рекламные сообщения и информацию об акциях</span>
</label>
```

- [ ] **Step 2: Изменить `js/ask.js`**

В `init()` после строки `if (!form) return;` добавить:
```js
const submitBtn = form.querySelector('.ask-submit');
if (window.ConsentHelper && submitBtn) ConsentHelper.attach(form, submitBtn);
```

В функции `onSubmit(e)`, найди:
```js
console.log('[ask] submit', {
  question: state.question.trim(),
  name: state.name.trim(),
  phone: state.phone
});
// TODO: replace with POST /api/leads when backend is ready

showThanks();
```

Заменить на:
```js
const { consent, marketing } = window.ConsentHelper
  ? window.ConsentHelper.read(form)
  : { consent: true, marketing: false };
if (!consent) return;

fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'ask',
    name: state.name.trim(),
    phone: state.phone,
    payload: { question: state.question.trim() },
    consent: true,
    marketing: marketing
  })
}).then(() => showThanks())
  .catch(() => {
    errEl.textContent = 'Не удалось отправить, попробуйте позже';
    errEl.hidden = false;
  });
```

(`errEl` уже определён в начале `onSubmit` — он используется выше при валидации.)

- [ ] **Step 3: Проверить**

Run: `open http://localhost:3050/#ask` (или скролл к секции «Не нашли ответ»).
- Кнопка «Отправить» неактивна, пока чекбокс не отмечен.
- Заполнить форму валидно, отметить чекбокс, нажать «Отправить».
- Expected: появилось «Спасибо!», в Network есть `POST /api/leads` 200, в БД `source=ask`.

- [ ] **Step 4: Commit**

```bash
git add index.html js/ask.js
git commit -m "feat(ask-form): replace disclaimer with consent checkbox, POST /api/leads"
```

---

## Task 9: Wire `js/consult.js` (модалка «Бесплатная консультация»)

**Files:**
- Modify: `js/consult.js` — добавить чекбоксы в `renderForm()`, навесить ConsentHelper после рендера, заменить console.log

- [ ] **Step 1: Изменить `renderForm()` в `js/consult.js`**

Найди функцию `renderForm()` (около строки 30–50). В её HTML-шаблоне, **перед** строкой `<button type="submit" class="consult-submit">Получить консультацию</button>`, вставь:

```html
<label class="consent">
  <input type="checkbox" name="consent" required>
  <span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>
</label>
<label class="consent consent--marketing">
  <input type="checkbox" name="marketing">
  <span>Согласен получать рекламные сообщения и информацию об акциях</span>
</label>
```

(Это шаблонная HTML-строка внутри JS — экранирование кавычек сделай по образцу окружающего кода.)

- [ ] **Step 2: Навесить ConsentHelper после монтажа диалога**

Найди в `consult.js` место, где `dlg.innerHTML = renderForm()` (или эквивалент). Сразу после установки innerHTML — найди форму внутри диалога и кнопку submit, вызови ConsentHelper:

```js
const form = dlg.querySelector('form');
const submitBtn = dlg.querySelector('.consult-submit');
if (window.ConsentHelper && form && submitBtn) ConsentHelper.attach(form, submitBtn);
```

Это должно происходить каждый раз, когда форма перерендеривается (т.е. при открытии диалога заново после состояния «Спасибо»).

- [ ] **Step 3: Изменить `onSubmit`**

Найди в `consult.js` функцию обработки submit (содержит `console.log('[consult] submit', ...)`).

Заменить блок:
```js
console.log('[consult] submit', { name: state.name.trim(), phone: state.phone });
// TODO: replace with POST /api/leads when backend is ready

state.submitted = true;
```

на:
```js
const form = dlg.querySelector('form');
const { consent, marketing } = window.ConsentHelper
  ? window.ConsentHelper.read(form)
  : { consent: true, marketing: false };
if (!consent) return;

fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'consult',
    name: state.name.trim(),
    phone: state.phone,
    consent: true,
    marketing: marketing
  })
}).catch((err) => console.error('[consult] /api/leads failed', err));

state.submitted = true;
```

(Сетевой fetch не блокирует переход в «Спасибо» — заявка считается принятой клиентски, серверные ошибки логируются.)

- [ ] **Step 4: Проверить**

Run: `open http://localhost:3050/`, кликнуть любую кнопку «Бесплатная консультация».
Expected:
- модалка открыта, видны 2 чекбокса;
- кнопка «Получить консультацию» неактивна без галочки;
- ставим галочку → кнопка активна → заполняем имя+телефон → отправляем;
- видим экран «Спасибо!»;
- в Network виден `POST /api/leads` 200;
- в БД `source=consult`.

Закрыть модалку, открыть снова — чекбоксы снова сброшены, кнопка снова заблокирована.

- [ ] **Step 5: Commit**

```bash
git add js/consult.js
git commit -m "feat(consult-modal): add consent checkboxes, POST /api/leads"
```

---

## Task 10: Wire `js/quiz.js` (квиз)

**Files:**
- Modify: `js/quiz.js` — на последнем шаге квиза (где собираются имя+телефон) добавить чекбоксы и ConsentHelper, заменить console.log на POST

- [ ] **Step 1: Найти место последнего шага в `js/quiz.js`**

Run: `grep -n "data-quiz-submit\|console.log\|TODO" js/quiz.js`
Expected: видны строки `~179`, `~197`, `~198`, `~242`. Последний шаг — там, где рендерится кнопка `data-quiz-submit`.

- [ ] **Step 2: Добавить чекбоксы в шаблон последнего шага**

В `js/quiz.js` найти HTML-шаблон последнего экрана квиза (там, где `data-quiz-submit`). Перед кнопкой `<button ... data-quiz-submit>...</button>` добавить:

```html
<label class="consent">
  <input type="checkbox" name="consent" required>
  <span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>
</label>
<label class="consent consent--marketing">
  <input type="checkbox" name="marketing">
  <span>Согласен получать рекламные сообщения и информацию об акциях</span>
</label>
```

- [ ] **Step 3: Подключить ConsentHelper после рендера последнего шага**

Найти в `quiz.js` функцию, которая рендерит шаги (по пути от `renderStep`/`render` или по обработчику перехода `data-quiz-next`). Сразу после установки `innerHTML` шага, если шаг — последний, вызвать:

```js
const form = dlg.querySelector('form') || dlg; // если форма обёрнута в dialog без form-тега, скорректируй селектор
const submitBtn = dlg.querySelector('[data-quiz-submit]');
if (window.ConsentHelper && submitBtn) {
  ConsentHelper.attach(form, submitBtn);
}
```

Если в quiz нет тега `<form>` (контейнер просто div) — оберни два чекбокса и `[data-quiz-submit]` в `<form>` либо передавай в `ConsentHelper.attach` тот контейнер, в котором лежат `input[name="consent"]` (helper использует `form.querySelector('input[name="consent"]')`, ему достаточно любого общего предка). В этом случае:
```js
const container = dlg.querySelector('.quiz-step--final') || dlg;
ConsentHelper.attach(container, submitBtn);
```
(Замени селектор `.quiz-step--final` на реальный класс финального шага из вёрстки `quiz.js`.)

- [ ] **Step 4: Заменить отправку**

В обработчике submit (около строки 197):
```js
console.log('[quiz] submit', state.answers);
// TODO: replace with POST /api/leads when backend is ready
```

Заменить на:
```js
const container = dlg.querySelector('.quiz-step--final') || dlg;
const { consent, marketing } = window.ConsentHelper
  ? window.ConsentHelper.read(container)
  : { consent: true, marketing: false };
if (!consent) return;

const name = (state.answers && (state.answers.name || state.answers.имя)) || '';
const phone = (state.answers && (state.answers.phone || state.answers.телефон)) || '';

fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'quiz',
    name: String(name).trim(),
    phone: String(phone),
    payload: state.answers,
    consent: true,
    marketing: marketing
  })
}).catch((err) => console.error('[quiz] /api/leads failed', err));
```

(Имена ключей `name`/`phone` в `state.answers` — посмотри по факту в коде квиза; если они под другими ключами (например `userName`, `userPhone`), подставь правильные. Это последний обязательный шаг квиза, имена там точно есть.)

- [ ] **Step 5: Проверить**

Run: открыть `http://localhost:3050/`, нажать «Рассчитать стоимость» (`floating-quiz-cta`) или другую кнопку, открывающую квиз. Пройти все шаги до финального.
Expected:
- на финальном шаге видны 2 чекбокса;
- кнопка отправки заблокирована без галочки;
- после галочки и валидных данных — заявка уходит, в Network виден `POST /api/leads` 200, в БД `source=quiz`, поле `payload` содержит ответы квиза в JSONB.

- [ ] **Step 6: Commit**

```bash
git add js/quiz.js
git commit -m "feat(quiz): add consent checkboxes on final step, POST /api/leads"
```

---

## Task 11: Wire `js/interest-popup.js`

**Files:**
- Modify: `js/interest-popup.js` — добавить чекбоксы в шаблон формы, ConsentHelper, POST

- [ ] **Step 1: Найти HTML-шаблон формы в `js/interest-popup.js`**

Run: `grep -n "interest-dialog__submit\|<button type=\"submit\"" js/interest-popup.js`
Expected: строки около 135, 148.

- [ ] **Step 2: Добавить чекбоксы перед кнопкой submit**

В шаблоне (перед `'<button type="submit" class="interest-dialog__submit">Отправить заявку</button>'`) вставь:

```js
'<label class="consent">' +
  '<input type="checkbox" name="consent" required>' +
  '<span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>' +
'</label>' +
'<label class="consent consent--marketing">' +
  '<input type="checkbox" name="marketing">' +
  '<span>Согласен получать рекламные сообщения и информацию об акциях</span>' +
'</label>' +
```

- [ ] **Step 3: Навесить ConsentHelper**

После того, как форма вставляется в DOM (там, где `dlg.innerHTML = ...` или похожее), добавить:

```js
const form = dlg.querySelector('form') || dlg;
const submitBtn = dlg.querySelector('.interest-dialog__submit');
if (window.ConsentHelper && submitBtn) ConsentHelper.attach(form, submitBtn);
```

- [ ] **Step 4: Заменить отправку**

Найти блок с `console.log('[interest-popup] submit', ...)` (около строки 183). Заменить console.log + TODO на:

```js
const form = dlg.querySelector('form') || dlg;
const { consent, marketing } = window.ConsentHelper
  ? window.ConsentHelper.read(form)
  : { consent: true, marketing: false };
if (!consent) return;

fetch('/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'interest-popup',
    name: state.name || '',
    phone: state.phone || '',
    payload: { interest: state.interest || null },
    consent: true,
    marketing: marketing
  })
}).catch((err) => console.error('[interest-popup] /api/leads failed', err));
```

(Поля `state.name`, `state.phone`, `state.interest` — посмотри по факту в коде модуля. Если ключи другие, подставь корректные. Ничего, кроме отправки, не меняй — оставляй существующую логику показа «Спасибо».)

- [ ] **Step 5: Проверить**

Run: `open http://localhost:3050/models.html`. Дождаться или вызвать interest-popup (это попап интереса при просмотре карточки модели).
Expected:
- видны чекбоксы;
- кнопка заблокирована до галочки;
- отправка → `POST /api/leads` 200, в БД `source=interest-popup`.

- [ ] **Step 6: Commit**

```bash
git add js/interest-popup.js
git commit -m "feat(interest-popup): add consent checkboxes, POST /api/leads"
```

---

## Task 12: Финальная проверка end-to-end

- [ ] **Step 1: Чистый прогон всех 5 форм**

Открыть в браузере чистую сессию (или DevTools → Application → Clear storage). Пройти каждую из 5 форм:
1. `index.html` секция «Запись на сервис» (`#service`) — `service.js`
2. `index.html` секция «Не нашли ответ» (`#ask`) — `ask.js`
3. Любая страница, кнопка «Бесплатная консультация» — `consult.js`
4. Любая страница, кнопка «Рассчитать стоимость» (или иной триггер квиза) — `quiz.js`
5. `models.html`, попап интереса — `interest-popup.js`

Для каждой:
- ✓ кнопка submit заблокирована без галочки «согласен»;
- ✓ при клике по ссылке «Политика обработки персональных данных» открывается `/privacy.html` в новой вкладке;
- ✓ опциональный чекбокс «маркетинг» по умолчанию **снят**;
- ✓ после успешной отправки в Network есть `POST /api/leads` со статусом 200 и телом `{"ok":true}`.

- [ ] **Step 2: Проверить записи в БД**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT source, name, phone, consent_given, consent_marketing, policy_version, created_at FROM leads ORDER BY id DESC LIMIT 10;"
```
Expected: 5 записей за последний прогон, все 5 source-ов (`service`, `ask`, `consult`, `quiz`, `interest-popup`), `consent_given=t` везде, `policy_version=2026-05-05`.

- [ ] **Step 3: Проверить cookie-плашку**

DevTools → Application → Local Storage → удалить `cookieAccepted`. Перезагрузить любую страницу.
Expected: внизу плашка «Продолжая использовать сайт…» с кнопкой «Принять» и ссылкой на `/privacy.html`. Клик → плашка исчезает, перезагрузка → больше не появляется.

- [ ] **Step 4: Проверить ссылку «Политика конфиденциальности» в футере**

Скролл в самый низ на `index.html`, `catalog.html`, `models.html`, `portfolio.html` — на каждой видна ссылка, ведёт на `/privacy.html`.

- [ ] **Step 5: Проверить страницу политики**

Open `http://localhost:3050/privacy.html`.
Expected: страница рендерится, видны все 12 разделов, реквизиты ООО «Хорошие бассейны» корректны (ИНН 6168118370, ОГРН 1226100027009, email Goodbass1@yandex.ru), есть ссылка «← На главную».

- [ ] **Step 6: Финальный коммит-чекпоинт (если ничего больше не меняли)**

Если в ходе финальной проверки нашёлся баг — починить и закоммитить отдельно. Если всё ок — этот шаг пропускается, готово к деплою.

- [ ] **Step 7: Деплой**

Push на `main`:
```bash
git push origin main
```

GitHub Actions запустит rsync + `node db/migrate.js` (на сервере применится миграция `0003_leads.sql`) + `pm2 restart good-pools`.

После деплоя проверить на хорошиебассейны.рф (или временном домене) тот же чек-лист, что в Step 1.

---

## Self-Review (выполнено перед сохранением плана)

**Spec coverage:**
- Страница политики → Task 3 ✓
- Cookie-плашка → Task 6 ✓
- 5 чекбоксов на формах → Tasks 7–11 ✓
- Бэкенд POST /api/leads → Task 2 ✓
- Миграция таблицы leads → Task 1 ✓
- Ссылка из футера → Task 4 ✓
- Версия политики константой на сервере → Task 2 (POLICY_VERSION) ✓
- Без админки заявок → out of scope ✓

**Placeholder scan:** все шаги содержат конкретный код / команды; «посмотри по факту» используется только для названий полей `state.*` в quiz.js и interest-popup.js, где исполнитель легко увидит их по grep — это эксплицитно отмечено.

**Type consistency:** `ConsentHelper.attach(form, btn)` и `ConsentHelper.read(form)` используют одно и то же имя поля `name="consent"` / `name="marketing"` во всех 5 модулях; `source` ∈ `VALID_SOURCES` синхронно в Task 2 и Tasks 7–11.

---

**Plan complete.**

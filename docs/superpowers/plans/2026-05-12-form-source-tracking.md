# Form source tracking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В каждом письме-заявке сверху виден баннер «ФОРМА: <название>», в БД для каждой заявки хранится человеко-читаемое название формы (`source_label`) и URL-путь страницы (`page_path`), с которой пришла заявка.

**Architecture:** Денормализованная запись `source_label` в `leads` (пишется при INSERT из единого справочника `SOURCE_LABEL` в `lib/mailer.js`). Поле `page` пробрасывается от фронта (5 форм добавляют `window.location.pathname`) через API в новую колонку `page_path`. Mailer рендерит крупный жёлтый баннер с названием формы и добавляет строку «Страница» в секцию «Контакт».

**Tech Stack:** Node.js, Express, PostgreSQL (через `pg`), nodemailer, vanilla JS на фронте, EJS-админка (не трогаем).

**Spec:** `docs/superpowers/specs/2026-05-12-form-source-tracking-design.md`

---

## File Structure

**Создаются:**
- `db/migrations/0004_leads_source_label_and_page.sql` — миграция: 2 nullable колонки.

**Модифицируются:**
- `db/init.sql` — добавляются те же 2 колонки в `CREATE TABLE leads` (чтобы fresh install сходился с миграциями).
- `lib/mailer.js` — `SOURCE_LABEL` обновляется; добавляется баннер в HTML и в plain text; добавляется строка «Страница» в секции «Контакт»; `buildEmail` принимает `source_label`/`page_path` с fallback на `SOURCE_LABEL[source]`; `SOURCE_LABEL` экспортируется.
- `routes/api.js` — принимает `page`, нормализует, в INSERT добавляет `source_label` и `page_path`, прокидывает их в `mailer.sendLeadEmail`.
- `js/service.js`, `js/ask.js`, `js/consult.js`, `js/quiz.js`, `js/interest-popup.js` — добавляется поле `page: window.location.pathname` в тело POST на `/api/leads`.

**Тестов нет** — в проекте нет тест-фреймворка. Верификация — locally:
- `node -e ...` smoke-проверки рендера письма.
- Превью HTML открывается в браузере.
- После деплоя — curl + SQL-проверка в БД через SSH-туннель.

---

### Task 1: DB-миграция и init.sql

**Files:**
- Create: `db/migrations/0004_leads_source_label_and_page.sql`
- Modify: `db/init.sql` (CREATE TABLE leads, строки 167-180)

- [ ] **Step 1: Создать миграцию**

Создать файл `db/migrations/0004_leads_source_label_and_page.sql` с содержимым:

```sql
-- 0004_leads_source_label_and_page.sql
-- Добавляет человеко-читаемое название формы и URL-путь страницы заявки.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_label VARCHAR(64);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_path    VARCHAR(255);
```

- [ ] **Step 2: Обновить init.sql**

В `db/init.sql` в блоке `CREATE TABLE IF NOT EXISTS leads (...)` добавить две новые колонки между `source` и `name`. Найти строку:

```sql
  source            VARCHAR(32)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
```

И заменить на:

```sql
  source            VARCHAR(32)  NOT NULL,
  source_label      VARCHAR(64),
  page_path         VARCHAR(255),
  name              VARCHAR(255) NOT NULL,
```

- [ ] **Step 3: Проверить синтаксис миграции локально**

Запуск миграции `db/migrate.js` локально применяет её к **боевой** БД через SSH-туннель (см. CLAUDE.md). НЕ запускать `node db/migrate.js` на этом шаге — миграция накатится автоматически при деплое.

Вместо этого — проверить, что файл валиден синтаксически: открыть, прочитать глазами, убедиться что в нём только `ALTER TABLE ... IF NOT EXISTS`.

- [ ] **Step 4: Commit**

```bash
git add db/migrations/0004_leads_source_label_and_page.sql db/init.sql
git commit -m "feat(db): миграция 0004 — source_label и page_path в leads"
```

---

### Task 2: mailer.js — справочник, баннер, страница, экспорт

**Files:**
- Modify: `lib/mailer.js`

- [ ] **Step 1: Обновить SOURCE_LABEL**

Найти текущий `SOURCE_LABEL` (строки 3-9):

```js
const SOURCE_LABEL = {
  service: 'Услуга',
  ask: 'Задать вопрос',
  consult: 'Консультация',
  quiz: 'Подбор / квиз',
  'interest-popup': 'Поп-ап «интересно»'
};
```

Заменить на:

```js
const SOURCE_LABEL = {
  service:          'Сервисное обслуживание',
  ask:              'Задать вопрос',
  consult:          'Заказ консультации',
  quiz:             'Подбор бассейна (квиз)',
  'interest-popup': 'Интерес к модели (поп-ап)'
};
```

- [ ] **Step 2: Добавить стиль баннера в STYLE**

Найти объект `STYLE` (строки 145-157). После строки с `wrap: ...,` добавить ключ `banner`:

```js
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
```

Изменения: добавлен ключ `banner`; у `header` убран `border-radius:8px 8px 0 0` (теперь сверху скруглён баннер, а не шапка).

- [ ] **Step 3: Обновить buildEmail — sourceLabel с fallback**

Найти строку 173 в `buildEmail`:

```js
  const sourceLabel = SOURCE_LABEL[lead.source] || lead.source;
```

Заменить на:

```js
  const sourceLabel = lead.source_label || SOURCE_LABEL[lead.source] || lead.source;
  const pagePath = (typeof lead.page_path === 'string' && lead.page_path.trim()) ? lead.page_path.trim() : '';
```

- [ ] **Step 4: Обновить plain text block**

Найти plain-text блок (строки 178-188):

```js
  const lines = [
    'Новая заявка с сайта good-pools',
    '',
    'Источник: ' + sourceLabel,
    'Имя: ' + lead.name,
    'Телефон: ' + lead.phone,
    'Email: ' + (lead.email || '—'),
    'Маркетинг-согласие: ' + (lead.marketing ? 'да' : 'нет'),
    'IP: ' + (lead.ip || '—'),
    'Время (МСК): ' + when
  ];
```

Заменить на:

```js
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
```

- [ ] **Step 5: Обновить HTML-шаблон — добавить баннер и убрать sourceLabel из шапки**

Найти HTML-блок шапки (примерно строки 202-208):

```js
  let html = '';
  html += '<div style="' + STYLE.wrap + '">';
  html += '<div style="' + STYLE.header + '">';
  html += '<div style="' + STYLE.h1 + '">Новая заявка с сайта</div>';
  html += '<div style="' + STYLE.hSub + '">' + escapeHtml(sourceLabel) + ' · ' + escapeHtml(when) + '</div>';
  html += '</div>';
```

Заменить на:

```js
  let html = '';
  html += '<div style="' + STYLE.wrap + '">';
  html += '<div style="' + STYLE.banner + '">ФОРМА: ' + escapeHtml(sourceLabel).toUpperCase() + '</div>';
  html += '<div style="' + STYLE.header + '">';
  html += '<div style="' + STYLE.h1 + '">Новая заявка с сайта</div>';
  html += '<div style="' + STYLE.hSub + '">' + escapeHtml(when) + '</div>';
  html += '</div>';
```

Изменения: вставлен `STYLE.banner`-блок перед `STYLE.header`; из `hSub` убран `sourceLabel + ' · '` (имя источника теперь в баннере).

- [ ] **Step 6: Добавить строку «Страница» в секцию «Контакт»**

Найти в HTML-генерации секции «Контакт» строку с `htmlRow('IP клиента', ...)` (около строки 219):

```js
  html += htmlRow('IP клиента', escapeHtml(lead.ip || '—'));
```

После неё добавить:

```js
  html += htmlRow('IP клиента', escapeHtml(lead.ip || '—'));
  if (pagePath) html += htmlRow('Страница', escapeHtml(pagePath));
```

- [ ] **Step 7: Экспортировать SOURCE_LABEL**

Найти в конце файла `module.exports = ...`. Если строка вида `module.exports = { sendLeadEmail };` — заменить на:

```js
module.exports = {
  sendLeadEmail: sendLeadEmail,
  SOURCE_LABEL: SOURCE_LABEL
};
```

Если структура `module.exports` другая (например `module.exports.sendLeadEmail = ...`), добавить строку `module.exports.SOURCE_LABEL = SOURCE_LABEL;` рядом.

- [ ] **Step 8: Smoke-test рендера**

Создать временный файл `.tmp-mailer-smoke.js` со следующим содержимым (используется тот же трюк извлечения `buildEmail` через vm, что и в прошлой сессии):

```js
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, 'lib/mailer.js'), 'utf8');
const wrap = '(function(exports,require,module,__filename,__dirname){' + code + '\nmodule.exports.__b = buildEmail; })';
const compiled = require('vm').runInThisContext(wrap, { filename: 'mailer.js' });
const mod = { exports: {} };
compiled(mod.exports, require, mod, path.resolve('./lib/mailer.js'), path.resolve('./lib'));
const buildEmail = mod.exports.__b;

const cases = [
  {
    name: 'service',
    lead: {
      source: 'service',
      source_label: 'Сервисное обслуживание',
      page_path: '/index.html',
      name: 'Роман',
      phone: '+79180006861',
      email: null,
      marketing: false,
      ip: '80.249.206.143',
      payload: { size: '123', year: '2026', automation: 'Да', comment: 'wq' }
    }
  },
  {
    name: 'consult-no-page',
    lead: {
      source: 'consult',
      source_label: 'Заказ консультации',
      page_path: null,
      name: 'Иван',
      phone: '+79991234567',
      email: 'ivan@example.com',
      marketing: true,
      ip: '1.2.3.4',
      payload: null
    }
  },
  {
    name: 'fallback-no-label',
    lead: {
      source: 'quiz',
      // source_label НЕ передан — должен взять из SOURCE_LABEL
      page_path: '/portfolio.html',
      name: 'Мария',
      phone: '+79001112233',
      email: null,
      marketing: false,
      ip: '5.6.7.8',
      payload: { size: '4x8', finish: 'composite' }
    }
  }
];

for (const c of cases) {
  console.log('========== ' + c.name + ' ==========');
  const m = buildEmail(c.lead);
  console.log('SUBJECT: ' + m.subject);
  console.log('--- TEXT ---');
  console.log(m.text);
  const out = path.join(__dirname, '.tmp-preview-' + c.name + '.html');
  fs.writeFileSync(out, '<!doctype html><meta charset="utf-8"><body style="background:#eef2f7;padding:24px;">' + m.html + '</body>');
  console.log('HTML: ' + out);
  console.log();
}
```

Запустить:

```
node .tmp-mailer-smoke.js
```

Ожидаемый вывод (фрагменты):
- Случай `service`: первая строка text = `ФОРМА: СЕРВИСНОЕ ОБСЛУЖИВАНИЕ`; в конце text присутствует строка `Страница: /index.html`.
- Случай `consult-no-page`: первая строка = `ФОРМА: ЗАКАЗ КОНСУЛЬТАЦИИ`; строки `Страница:` НЕТ.
- Случай `fallback-no-label`: первая строка = `ФОРМА: ПОДБОР БАССЕЙНА (КВИЗ)` (взялось из SOURCE_LABEL).

Открыть в браузере все три `.tmp-preview-*.html` (Windows: `Start-Process` или двойной клик) — визуально проверить:
- Жёлтый/янтарный баннер сверху с крупным текстом «ФОРМА: ...».
- Под баннером синяя шапка с датой (без имени источника).
- В секции «Контакт» строка «Страница: /index.html» (только в первом и третьем случае).

- [ ] **Step 9: Удалить временные файлы**

```bash
rm .tmp-mailer-smoke.js .tmp-preview-*.html
```

- [ ] **Step 10: Commit**

```bash
git add lib/mailer.js
git commit -m "feat(mailer): баннер ФОРМА и строка Страница в письме-заявке"
```

---

### Task 3: API — приём `page`, запись новых колонок

**Files:**
- Modify: `routes/api.js` (строки 183-227, обработчик `POST /api/leads`)

- [ ] **Step 1: Добавить нормализацию page и подготовку source_label**

В обработчике POST `/api/leads` найти блок чтения body (строки 185-193):

```js
    const body = req.body || {};
    const source = String(body.source || '').trim();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = body.email ? String(body.email).trim() : null;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : null;
    const consent = body.consent === true;
    const marketing = body.marketing === true;
```

Добавить ниже (перед валидацией `VALID_SOURCES`):

```js
    const body = req.body || {};
    const source = String(body.source || '').trim();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = body.email ? String(body.email).trim() : null;
    const payload = body.payload && typeof body.payload === 'object' ? body.payload : null;
    const consent = body.consent === true;
    const marketing = body.marketing === true;

    let page_path = null;
    if (typeof body.page === 'string') {
      const p = body.page.trim();
      if (p) page_path = p.length > 255 ? p.slice(0, 255) : p;
    }
    const source_label = mailer.SOURCE_LABEL[source] || null;
```

- [ ] **Step 2: Обновить INSERT-запрос**

Найти INSERT (строки 211-216):

```js
    await pool.query(
      `INSERT INTO leads
       (source, name, phone, email, payload, consent_given, consent_marketing, consent_ip, policy_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [source, name, phone, email, payload ? JSON.stringify(payload) : null, true, marketing, ip, POLICY_VERSION]
    );
```

Заменить на:

```js
    await pool.query(
      `INSERT INTO leads
       (source, source_label, page_path, name, phone, email, payload, consent_given, consent_marketing, consent_ip, policy_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [source, source_label, page_path, name, phone, email, payload ? JSON.stringify(payload) : null, true, marketing, ip, POLICY_VERSION]
    );
```

- [ ] **Step 3: Прокинуть новые поля в mailer**

Найти вызов mailer (строки 218-220):

```js
    mailer
      .sendLeadEmail({ source, name, phone, email, payload, marketing, ip })
      .catch(function (e) { console.error('[mailer] send failed:', e && e.message ? e.message : e); });
```

Заменить на:

```js
    mailer
      .sendLeadEmail({ source, source_label, page_path, name, phone, email, payload, marketing, ip })
      .catch(function (e) { console.error('[mailer] send failed:', e && e.message ? e.message : e); });
```

- [ ] **Step 4: Smoke-test — статическая проверка**

Запустить:

```
node -e "const r = require('./routes/api.js'); console.log('routes/api.js loads OK');"
```

Ожидаемый вывод: `routes/api.js loads OK`. Если ошибка типа `SOURCE_LABEL of undefined` — значит Task 2 Step 7 (экспорт) не выполнен.

- [ ] **Step 5: Commit**

```bash
git add routes/api.js
git commit -m "feat(api): принимать page, писать source_label и page_path в leads"
```

---

### Task 4: Frontend — `page: window.location.pathname` в 5 формах

**Files:**
- Modify: `js/service.js`, `js/ask.js`, `js/consult.js`, `js/quiz.js`, `js/interest-popup.js`

Во всех 5 файлах одно и то же изменение: в теле `fetch('/api/leads', { ..., body: JSON.stringify({...}) })` добавляется поле `page: window.location.pathname` рядом с `source`.

- [ ] **Step 1: js/service.js**

Найти (строки 33-45 в текущем файле):

```js
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
          marketing: consentState.marketing
        })
      }).catch((err) => console.error('[service] /api/leads failed', err));
```

Заменить (добавлена строка `page: window.location.pathname,` после `source:`):

```js
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'service',
          page: window.location.pathname,
          name: result.data.name,
          phone: result.data.phone,
          payload: {
            size: result.data.size,
            year: result.data.year,
            automation: result.data.automation,
            comment: result.data.comment
          },
          consent: true,
          marketing: consentState.marketing
        })
      }).catch((err) => console.error('[service] /api/leads failed', err));
```

- [ ] **Step 2: js/ask.js**

Найти в файле (примерно строки 57-67) блок с `source: 'ask'`. Текущий блок выглядит так:

```js
        source: 'ask',
        name: state.name.trim(),
        phone: state.phone,
        payload: { question: state.question.trim() },
        consent: true,
        marketing: consentState.marketing
```

Сразу после строки `source: 'ask',` добавить:

```js
        page: window.location.pathname,
```

- [ ] **Step 3: js/consult.js**

Найти блок (примерно строки 124-133):

```js
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'consult',
        name: state.name.trim(),
        phone: state.phone,
        consent: true,
        marketing: consentState.marketing
      })
    }).catch((err) => console.error('[consult] /api/leads failed', err));
```

После строки `source: 'consult',` добавить `page: window.location.pathname,`:

```js
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'consult',
        page: window.location.pathname,
        name: state.name.trim(),
        phone: state.phone,
        consent: true,
        marketing: consentState.marketing
      })
    }).catch((err) => console.error('[consult] /api/leads failed', err));
```

- [ ] **Step 4: js/quiz.js**

Найти блок около строки 213 с `payload: { size: ..., finish: ... }`. Перед ним должна быть строка `source: 'quiz',`. После строки `source: 'quiz',` (или эквивалентной) добавить:

```js
        page: window.location.pathname,
```

Если структура другая (например `source: 'quiz'` на другой строке) — добавить `page: window.location.pathname,` сразу после `source: 'quiz',` в том же объекте body.

- [ ] **Step 5: js/interest-popup.js**

Найти блок около строки 207 с `payload: { model_id, ... }`. Аналогично — добавить `page: window.location.pathname,` сразу после строки `source: 'interest-popup',`.

- [ ] **Step 6: Smoke-test — статическая проверка**

Запустить:

```
node -e "
const fs = require('fs');
['js/service.js','js/ask.js','js/consult.js','js/quiz.js','js/interest-popup.js'].forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const has = content.includes('page: window.location.pathname');
  console.log((has ? 'OK ' : 'MISS ') + f);
});
"
```

Ожидаемый вывод: 5 строк `OK js/...`. Если есть `MISS` — добавить пропущенное.

- [ ] **Step 7: Бамп cache-buster для quiz.js (если используется)**

Проверить, есть ли в `index.html` cache-buster для `quiz.js`/прочих JS:

```
grep -n 'quiz.js?v=\|service.js?v=\|ask.js?v=\|consult.js?v=\|interest-popup.js?v=' *.html
```

Если у изменённых файлов есть `?v=NNN` — увеличить версию (или поменять на новую дату), чтобы клиенты получили свежий JS. Если cache-buster'ов нет — пропустить шаг.

- [ ] **Step 8: Commit**

```bash
git add js/service.js js/ask.js js/consult.js js/quiz.js js/interest-popup.js
# если меняли cache-buster: git add также соответствующие *.html
git commit -m "feat(forms): передавать window.location.pathname в /api/leads"
```

---

### Task 5: Push, деплой и production-верификация

**Files:** ничего не меняется, только пуш и проверки.

- [ ] **Step 1: Push в origin/main**

```bash
git push origin main
```

Это триггерит GitHub Actions: rsync кода → `npm install --omit=dev` → `node db/migrate.js` (применит миграцию 0004) → `pm2 restart good-pools`.

- [ ] **Step 2: Дождаться завершения деплоя**

Открыть https://github.com/romprogramist/good_pools/actions и убедиться, что последний workflow закончился зелёным. Альтернатива через CLI:

```bash
gh run list --workflow=deploy.yml --limit 1
gh run watch
```

- [ ] **Step 3: Проверить, что миграция применилась**

Поднять SSH-туннель к серверной БД (если не поднят):

```
ssh -L 5433:localhost:5432 roman@95.163.236.186 -N
```

В отдельном терминале:

```
psql postgres://postgres:Test1234@localhost:5433/good_pools_db -c "\d leads"
```

Ожидаемое: в выводе должны присутствовать колонки `source_label varchar(64)` и `page_path varchar(255)`.

Также проверить таблицу `schema_migrations`:

```
psql postgres://postgres:Test1234@localhost:5433/good_pools_db -c "SELECT name FROM schema_migrations ORDER BY name DESC LIMIT 5;"
```

Ожидаемое: первая строка — `0004_leads_source_label_and_page.sql`.

- [ ] **Step 4: Sanity-чек через curl**

```
curl -X POST https://good-pools.ru/api/leads \
  -H 'Content-Type: application/json' \
  -d '{"source":"ask","name":"Plan Smoke Test","phone":"+79000000000","consent":true,"page":"/portfolio.html","payload":{"question":"проверка после деплоя"}}'
```

Ожидаемый ответ: `{"ok":true}`.

- [ ] **Step 5: Проверить, что заявка попала в БД с новыми полями**

```
psql postgres://postgres:Test1234@localhost:5433/good_pools_db -c "SELECT id, source, source_label, page_path, name, created_at FROM leads WHERE name='Plan Smoke Test' ORDER BY id DESC LIMIT 1;"
```

Ожидаемое: строка, где `source='ask'`, `source_label='Задать вопрос'`, `page_path='/portfolio.html'`.

- [ ] **Step 6: Проверить письмо**

Открыть почту админа (email из `SMTP_USER`). В новом письме должно быть:
- Тема: `Заявка с сайта — Задать вопрос — Plan Smoke Test`.
- Сверху письма — жёлтый/янтарный баннер с крупным текстом «ФОРМА: ЗАДАТЬ ВОПРОС».
- Ниже — синяя шапка с датой (без имени источника).
- В секции «Контакт» — строка «Страница: /portfolio.html».

- [ ] **Step 7: Удалить тестовую заявку из БД (опционально)**

```
psql postgres://postgres:Test1234@localhost:5433/good_pools_db -c "DELETE FROM leads WHERE name='Plan Smoke Test';"
```

- [ ] **Step 8: Проверить реальную форму на проде**

Зайти на https://good-pools.ru/, открыть форму «Задать вопрос» или «Заказ консультации», заполнить тестовыми данными и отправить. Убедиться, что:
1. Письмо приходит с правильным баннером.
2. В БД новая запись содержит `source_label` и `page_path`.

Если что-то не сходится — диагностика: `pm2 logs good-pools --lines 30 --nostream` на сервере.

---

## Self-review

**Spec coverage:**
- ✅ Миграция `0004_leads_source_label_and_page.sql` → Task 1.
- ✅ Обновление `db/init.sql` → Task 1 Step 2.
- ✅ Новое значение `SOURCE_LABEL` → Task 2 Step 1.
- ✅ Баннер сверху письма (жёлтый, цвета и font-size заданы) → Task 2 Steps 2, 5.
- ✅ Удаление sourceLabel из синей шапки → Task 2 Step 5.
- ✅ Строка «Страница» в секции «Контакт» → Task 2 Step 6.
- ✅ Plain-text синхронизирован → Task 2 Step 4.
- ✅ Fallback `lead.source_label || SOURCE_LABEL[source]` → Task 2 Step 3.
- ✅ Export `SOURCE_LABEL` → Task 2 Step 7.
- ✅ API принимает `page` (top-level), нормализует, обрезает до 255, NULL для не-строки → Task 3 Step 1.
- ✅ INSERT с новыми колонками → Task 3 Step 2.
- ✅ `source_label` берётся на бэке (не из тела запроса) → Task 3 Step 1 (`mailer.SOURCE_LABEL[source]`).
- ✅ Прокидка в mailer → Task 3 Step 3.
- ✅ 5 фронт-форм передают `window.location.pathname` → Task 4 Steps 1-5.
- ✅ Production-верификация (curl + SQL + email) → Task 5.

**Placeholder scan:** перечитал — нет «TBD»/«TODO»/«implement later». В Task 4 Steps 4-5 (`js/quiz.js`, `js/interest-popup.js`) описания менее точные, чем в Steps 1-3, потому что объект body там вложенный — но указано конкретное место (`сразу после source: 'quiz',`) и точная вставляемая строка. Это допустимо.

**Type/name consistency:**
- `source_label` в БД, в JS-объекте лида (`lead.source_label`), в INSERT-параметре, в JSON-теле sendLeadEmail — везде snake_case `source_label`. ✓
- `page_path` в БД и в `lead.page_path`, `page` (без `_path`) — только во входящем теле `/api/leads` от фронта. Преобразуется в `page_path` в API-обработчике. ✓
- `SOURCE_LABEL` — UPPER_SNAKE, как и было. ✓
- `STYLE.banner` — новый ключ, упомянут в обоих местах (Step 2 определение, Step 5 использование). ✓

Финального ревью больше не требуется — план готов к исполнению.

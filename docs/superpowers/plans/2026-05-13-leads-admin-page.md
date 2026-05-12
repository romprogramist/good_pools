# Страница заявок в админке — план имплементации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить раздел `/admin/leads` в существующую админку: таблица заявок с фильтрами (источник/статус/даты/поиск), детальная страница, тоггл статуса, удаление и CSV-экспорт.

**Architecture:** Server-rendered EJS в стиле остальной админки (`routes/admin.js` + `views/leads/*.ejs`). Никаких новых зависимостей и клиентского JS. Фильтры через query-параметры GET-формы. Новая миграция 0005 добавляет `status` + `processed_at` в таблицу `leads`.

**Tech Stack:** Node 22 + Express, `pg`, EJS, PostgreSQL (через SSH-туннель на `:5433`), сессии в `connect-pg-simple`. Запуск локально — `npm run dev` на порту 3050.

**Spec:** `docs/superpowers/specs/2026-05-13-leads-admin-page-design.md`

**Важно про тестирование:** В проекте нет тестового фреймворка. Verification — ручная (psql + браузер). Каждая задача заканчивается явным smoke-чеком и коммитом.

**Важно про БД:** Локальная разработка идёт через SSH-туннель на серверную БД (`localhost:5433`). Перед началом убедись, что туннель открыт: `ssh -L 5433:localhost:5432 roman@95.163.236.186 -N` (в отдельном окне). Подключение к psql: `psql "postgres://postgres:Test1234@localhost:5433/good_pools_db"`.

---

### Task 1: Миграция БД 0005 + правка init.sql

**Files:**
- Create: `db/migrations/0005_leads_status.sql`
- Modify: `db/init.sql:167-186`

- [ ] **Step 1: Создать файл миграции**

Записать `db/migrations/0005_leads_status.sql`:

```sql
-- 0005_leads_status.sql
-- Добавляет статус обработки заявки и время перехода в "обработана".

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status        VARCHAR(16) NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
```

- [ ] **Step 2: Обновить `db/init.sql`**

В блоке `CREATE TABLE IF NOT EXISTS leads (...)` (строки 167-182) добавить две колонки перед `created_at`. Заменить:

```sql
  policy_version    VARCHAR(32)  NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

на:

```sql
  policy_version    VARCHAR(32)  NOT NULL,
  status            VARCHAR(16)  NOT NULL DEFAULT 'new',
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

И сразу после блока `CREATE INDEX leads_source_idx` добавить:

```sql
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads (status);
```

- [ ] **Step 3: Применить миграцию**

Run: `cd C:\Users\Roman\good_pools && node db/migrate.js`

Expected output (ориентир — последняя строка должна упоминать `0005_leads_status.sql` как применённую):
```
applying 0005_leads_status.sql
done.
```

- [ ] **Step 4: Verify schema в psql**

Run:
```
psql "postgres://postgres:Test1234@localhost:5433/good_pools_db" -c "\d leads"
```

Expected: в выводе должны быть две новые колонки:
```
 status            | character varying(16)    | not null default 'new'::character varying
 processed_at      | timestamp with time zone |
```
И индекс `leads_status_idx` в списке индексов.

- [ ] **Step 5: Commit**

```
git add db/migrations/0005_leads_status.sql db/init.sql
git commit -m "db: миграция 0005 — status и processed_at в leads"
```

---

### Task 2: Базовый маршрут /admin/leads + view + ссылка в сайдбаре

**Files:**
- Modify: `routes/admin.js` (добавить блок Leads перед `module.exports = router;`)
- Create: `views/leads/index.ejs`
- Modify: `views/layout.ejs:82` (добавить пункт меню после Рендер↔Реальность)

Эта задача делает страницу видимой и кликабельной — без фильтров, без деталей. Просто список последних 50 заявок.

- [ ] **Step 1: Добавить маршрут списка в `routes/admin.js`**

Найти строку `// ---------- Render vs Reality ----------` и в конце файла, **перед** `module.exports = router;`, добавить:

```js
// ---------- Leads ----------

router.get('/leads', async function (req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT id, created_at, source, source_label, name, phone, email, status
         FROM leads
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*)::int AS n FROM leads')
    ]);

    renderAdmin(res, 'leads/index', {
      pageTitle: 'Заявки',
      active: 'leads',
      leads: rows.rows,
      page: page,
      totalPages: Math.max(1, Math.ceil(total.rows[0].n / limit)),
      query: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
```

- [ ] **Step 2: Создать `views/leads/index.ejs`**

```html
<div class="top-bar">
  <h1>Заявки</h1>
</div>

<% if (leads.length === 0) { %>
  <p style="color:#71717a;">Заявок пока нет.</p>
<% } else { %>
  <table class="admin-table">
    <thead>
      <tr>
        <th>Дата</th>
        <th>Источник</th>
        <th>Имя</th>
        <th>Телефон</th>
        <th>Email</th>
        <th>Статус</th>
      </tr>
    </thead>
    <tbody>
      <% leads.forEach(function(l) { %>
      <tr onclick="location.href='/admin/leads/<%= l.id %>'" style="cursor:pointer;">
        <td><%= new Date(l.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) %></td>
        <td><%= l.source_label || l.source %></td>
        <td><%= l.name %></td>
        <td><%= l.phone %></td>
        <td><%= l.email || '—' %></td>
        <td>
          <% if (l.status === 'processed') { %>
            <span style="background:#065f46; color:#6ee7b7; padding:2px 8px; border-radius:6px; font-size:12px;">обработана</span>
          <% } else { %>
            <span style="background:#1e3a8a; color:#93c5fd; padding:2px 8px; border-radius:6px; font-size:12px;">новая</span>
          <% } %>
        </td>
      </tr>
      <% }); %>
    </tbody>
  </table>

  <% if (totalPages > 1) { %>
    <div style="margin-top:16px; display:flex; gap:8px; align-items:center;">
      <% if (page > 1) { %>
        <a href="/admin/leads?page=<%= page - 1 %>" class="btn btn-sm btn-outline">← Назад</a>
      <% } %>
      <span style="color:#71717a; font-size:13px;">Стр. <%= page %> из <%= totalPages %></span>
      <% if (page < totalPages) { %>
        <a href="/admin/leads?page=<%= page + 1 %>" class="btn btn-sm btn-outline">Вперёд →</a>
      <% } %>
    </div>
  <% } %>
<% } %>
```

- [ ] **Step 3: Добавить пункт меню в `views/layout.ejs`**

Найти строку:
```html
<a href="/admin/render-reality" class="<%= typeof active !== 'undefined' && active === 'render-reality' ? 'active' : '' %>">Рендер↔Реальность</a>
```
и **после** неё добавить:
```html
<a href="/admin/leads" class="<%= typeof active !== 'undefined' && active === 'leads' ? 'active' : '' %>">Заявки</a>
```

- [ ] **Step 4: Smoke-проверка в браузере**

Убедись, что dev-сервер запущен (`npm run dev` на 3050). Открой `http://localhost:3050/admin/leads` (предварительно зайди в `/admin/login`).

Expected:
- Страница рендерится без ошибок.
- В сайдбаре пункт «Заявки» подсвечен (тёмный фон).
- Если в БД есть заявки — таблица показывает последние 50, сортировка от новых к старым.
- Если заявок > 50 — внизу видна пагинация.
- Если заявок нет — текст «Заявок пока нет.»
- Бейджи статусов окрашены (синий для «новая», зелёный для «обработана»).

Если заявок в БД нет, отправь одну тестовую через любую форму на сайте (например, на главной — «Получить консультацию»). После сабмита перезагрузи `/admin/leads` — заявка появилась.

- [ ] **Step 5: Commit**

```
git add routes/admin.js views/leads/index.ejs views/layout.ejs
git commit -m "admin: страница заявок /admin/leads (базовый список без фильтров)"
```

---

### Task 3: Фильтры (источник, статус, даты, поиск)

**Files:**
- Modify: `routes/admin.js` (расширить обработчик `GET /admin/leads`)
- Modify: `views/leads/index.ejs` (добавить форму фильтров над таблицей, прокидывать query в пагинацию)

- [ ] **Step 1: Обновить обработчик списка**

В `routes/admin.js` заменить весь блок `router.get('/leads', ...)` (созданный в Task 2) на:

```js
router.get('/leads', async function (req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    // --- разбор фильтров ---
    const q = (req.query.q || '').trim();
    const source = (req.query.source || '').trim();
    const statusFilter = ['new', 'processed'].includes(req.query.status) ? req.query.status : '';

    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;
    const from = (fromDate && !isNaN(fromDate)) ? fromDate : null;
    const to = (toDate && !isNaN(toDate)) ? toDate : null;
    // to делаем включительной до конца дня
    if (to) to.setHours(23, 59, 59, 999);

    // --- сборка WHERE ---
    const where = [];
    const params = [];
    function add(cond, value) { params.push(value); where.push(cond.replace('?', '$' + params.length)); }

    if (source) add('source = ?', source);
    if (statusFilter) add('status = ?', statusFilter);
    if (from) add('created_at >= ?', from);
    if (to) add('created_at <= ?', to);
    if (q) {
      params.push('%' + q + '%');
      const ph = '$' + params.length;
      where.push('(name ILIKE ' + ph + ' OR phone ILIKE ' + ph + ')');
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // --- параллельные запросы: данные, count, список источников ---
    const dataParams = params.concat([limit, offset]);
    const [rows, total, sources] = await Promise.all([
      pool.query(
        `SELECT id, created_at, source, source_label, name, phone, email, status
         FROM leads ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        dataParams
      ),
      pool.query(`SELECT COUNT(*)::int AS n FROM leads ${whereSql}`, params),
      pool.query(`SELECT DISTINCT source, COALESCE(source_label, source) AS label
                  FROM leads ORDER BY label`)
    ]);

    renderAdmin(res, 'leads/index', {
      pageTitle: 'Заявки',
      active: 'leads',
      leads: rows.rows,
      page: page,
      totalPages: Math.max(1, Math.ceil(total.rows[0].n / limit)),
      total: total.rows[0].n,
      sources: sources.rows,
      query: {
        q: q,
        source: source,
        status: statusFilter,
        from: req.query.from || '',
        to: req.query.to || ''
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
```

- [ ] **Step 2: Обновить `views/leads/index.ejs`**

Полностью заменить содержимое файла на:

```html
<div class="top-bar">
  <h1>Заявки <% if (typeof total !== 'undefined') { %><span style="color:#71717a; font-size:14px; font-weight:normal;">(<%= total %>)</span><% } %></h1>
</div>

<form method="GET" action="/admin/leads" style="background:#1a1b23; padding:16px; border-radius:8px; margin-bottom:24px;">
  <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr 2fr; gap:12px; align-items:end;">
    <div class="form-group" style="margin:0;">
      <label>Источник</label>
      <select name="source">
        <option value="">Все</option>
        <% sources.forEach(function(s) { %>
          <option value="<%= s.source %>" <%= query.source === s.source ? 'selected' : '' %>><%= s.label %></option>
        <% }); %>
      </select>
    </div>
    <div class="form-group" style="margin:0;">
      <label>Статус</label>
      <select name="status">
        <option value="">Все</option>
        <option value="new" <%= query.status === 'new' ? 'selected' : '' %>>Новые</option>
        <option value="processed" <%= query.status === 'processed' ? 'selected' : '' %>>Обработанные</option>
      </select>
    </div>
    <div class="form-group" style="margin:0;">
      <label>С даты</label>
      <input type="date" name="from" value="<%= query.from %>">
    </div>
    <div class="form-group" style="margin:0;">
      <label>По дату</label>
      <input type="date" name="to" value="<%= query.to %>">
    </div>
    <div class="form-group" style="margin:0;">
      <label>Поиск (имя или телефон)</label>
      <input type="text" name="q" value="<%= query.q %>" placeholder="Иван или +7...">
    </div>
  </div>
  <div style="margin-top:12px; display:flex; gap:8px;">
    <button type="submit" class="btn btn-primary btn-sm">Применить</button>
    <a href="/admin/leads" class="btn btn-outline btn-sm">Сбросить</a>
  </div>
</form>

<% if (leads.length === 0) { %>
  <p style="color:#71717a;">Заявок не найдено.</p>
<% } else { %>
  <table class="admin-table">
    <thead>
      <tr>
        <th>Дата</th>
        <th>Источник</th>
        <th>Имя</th>
        <th>Телефон</th>
        <th>Email</th>
        <th>Статус</th>
      </tr>
    </thead>
    <tbody>
      <% leads.forEach(function(l) { %>
      <tr onclick="location.href='/admin/leads/<%= l.id %>'" style="cursor:pointer;">
        <td><%= new Date(l.created_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) %></td>
        <td><%= l.source_label || l.source %></td>
        <td><%= l.name %></td>
        <td><%= l.phone %></td>
        <td><%= l.email || '—' %></td>
        <td>
          <% if (l.status === 'processed') { %>
            <span style="background:#065f46; color:#6ee7b7; padding:2px 8px; border-radius:6px; font-size:12px;">обработана</span>
          <% } else { %>
            <span style="background:#1e3a8a; color:#93c5fd; padding:2px 8px; border-radius:6px; font-size:12px;">новая</span>
          <% } %>
        </td>
      </tr>
      <% }); %>
    </tbody>
  </table>

  <% if (totalPages > 1) {
       function qs(extra) {
         var p = Object.assign({}, query, extra);
         return Object.keys(p).filter(function(k){ return p[k]; }).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(p[k]); }).join('&');
       }
  %>
    <div style="margin-top:16px; display:flex; gap:8px; align-items:center;">
      <% if (page > 1) { %>
        <a href="/admin/leads?<%= qs({page: page - 1}) %>" class="btn btn-sm btn-outline">← Назад</a>
      <% } %>
      <span style="color:#71717a; font-size:13px;">Стр. <%= page %> из <%= totalPages %></span>
      <% if (page < totalPages) { %>
        <a href="/admin/leads?<%= qs({page: page + 1}) %>" class="btn btn-sm btn-outline">Вперёд →</a>
      <% } %>
    </div>
  <% } %>
<% } %>
```

- [ ] **Step 3: Smoke-проверка фильтров**

Открой `http://localhost:3050/admin/leads`.

Expected:
- Над таблицей видна форма с 5 полями.
- В dropdown «Источник» — все источники из БД (например `service`/`Заказать услугу`).
- Применить с одним фильтром (например, `Статус = Новые`) → таблица сужается, URL содержит `?status=new`.
- Применить два фильтра одновременно (например, источник + дата от) → корректно сужается, URL содержит оба параметра.
- Поиск по фамилии или части телефона работает (case-insensitive).
- «Сбросить» возвращает на `/admin/leads` без query.
- Пагинация сохраняет фильтры при переходе на след. страницу (если страниц > 1).
- Невалидные query (`?page=abc&from=garbage`) НЕ ломают страницу, фильтр просто игнорируется.

Проверь последний пункт в браузере: `http://localhost:3050/admin/leads?page=abc&from=garbage&status=banana` — страница должна загрузиться нормально без 500.

- [ ] **Step 4: Commit**

```
git add routes/admin.js views/leads/index.ejs
git commit -m "admin: фильтры заявок (источник, статус, даты, поиск)"
```

---

### Task 4: Детальная страница + смена статуса + удаление

**Files:**
- Modify: `routes/admin.js` (добавить три маршрута: GET `:id`, POST `:id/status`, POST `:id/delete`)
- Create: `views/leads/show.ejs`

- [ ] **Step 1: Добавить маршруты деталей и действий в `routes/admin.js`**

Сразу после блока `router.get('/leads', ...)` (заканчивается на `});` после catch) добавить:

```js
router.get('/leads/:id', async function (req, res) {
  try {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.redirect('/admin/leads');
    renderAdmin(res, 'leads/show', {
      pageTitle: 'Заявка #' + req.params.id,
      active: 'leads',
      lead: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/leads');
  }
});

router.post('/leads/:id/status', async function (req, res) {
  try {
    const cur = await pool.query('SELECT status FROM leads WHERE id = $1', [req.params.id]);
    if (!cur.rows.length) {
      req.session.error = 'Заявка не найдена';
      return res.redirect('/admin/leads');
    }
    if (cur.rows[0].status === 'processed') {
      await pool.query('UPDATE leads SET status = $1, processed_at = NULL WHERE id = $2', ['new', req.params.id]);
      req.session.success = 'Возвращено в новые';
    } else {
      await pool.query('UPDATE leads SET status = $1, processed_at = NOW() WHERE id = $2', ['processed', req.params.id]);
      req.session.success = 'Отмечено обработанной';
    }
    res.redirect('/admin/leads/' + req.params.id);
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка смены статуса';
    res.redirect('/admin/leads/' + req.params.id);
  }
});

router.post('/leads/:id/delete', async function (req, res) {
  try {
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    req.session.success = 'Заявка удалена';
    res.redirect('/admin/leads');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/leads');
  }
});
```

- [ ] **Step 2: Создать `views/leads/show.ejs`**

```html
<div class="top-bar">
  <h1>Заявка #<%= lead.id %></h1>
  <a href="/admin/leads" class="btn btn-outline btn-sm">← К списку</a>
</div>

<div style="display:grid; grid-template-columns: 200px 1fr; gap:12px 24px; margin-bottom:24px; max-width:800px;">
  <div style="color:#71717a;">Дата</div>
  <div><%= new Date(lead.created_at).toLocaleString('ru-RU') %></div>

  <div style="color:#71717a;">Статус</div>
  <div>
    <% if (lead.status === 'processed') { %>
      <span style="background:#065f46; color:#6ee7b7; padding:2px 8px; border-radius:6px; font-size:12px;">обработана</span>
      <% if (lead.processed_at) { %>
        <span style="color:#71717a; font-size:13px; margin-left:8px;">в <%= new Date(lead.processed_at).toLocaleString('ru-RU') %></span>
      <% } %>
    <% } else { %>
      <span style="background:#1e3a8a; color:#93c5fd; padding:2px 8px; border-radius:6px; font-size:12px;">новая</span>
    <% } %>
  </div>

  <div style="color:#71717a;">Источник</div>
  <div><%= lead.source_label || '—' %> <span style="color:#71717a; font-size:13px;">(<%= lead.source %>)</span></div>

  <div style="color:#71717a;">Страница</div>
  <div><%= lead.page_path || '—' %></div>

  <div style="color:#71717a;">Имя</div>
  <div><%= lead.name %></div>

  <div style="color:#71717a;">Телефон</div>
  <div><%= lead.phone %></div>

  <div style="color:#71717a;">Email</div>
  <div><%= lead.email || '—' %></div>

  <div style="color:#71717a;">Согласие на ПД</div>
  <div><%= lead.consent_given ? 'Да' : 'Нет' %>
    <span style="color:#71717a; font-size:13px; margin-left:8px;"><%= new Date(lead.consent_at).toLocaleString('ru-RU') %></span>
  </div>

  <div style="color:#71717a;">Согласие на маркетинг</div>
  <div><%= lead.consent_marketing ? 'Да' : 'Нет' %></div>

  <div style="color:#71717a;">IP</div>
  <div><%= lead.consent_ip || '—' %></div>

  <div style="color:#71717a;">Версия политики</div>
  <div><%= lead.policy_version %></div>

  <div style="color:#71717a;">Payload</div>
  <div>
    <% if (lead.payload) { %>
      <pre style="background:#1a1b23; padding:12px; border-radius:8px; overflow-x:auto; margin:0; font-size:13px;"><%= JSON.stringify(lead.payload, null, 2) %></pre>
    <% } else { %>
      <span style="color:#71717a;">—</span>
    <% } %>
  </div>
</div>

<div style="display:flex; gap:12px;">
  <form method="POST" action="/admin/leads/<%= lead.id %>/status">
    <% if (lead.status === 'processed') { %>
      <button type="submit" class="btn btn-outline">Вернуть в новые</button>
    <% } else { %>
      <button type="submit" class="btn btn-primary">Отметить обработанной</button>
    <% } %>
  </form>

  <form method="POST" action="/admin/leads/<%= lead.id %>/delete" onsubmit="return confirm('Удалить заявку безвозвратно?')">
    <button type="submit" class="btn btn-danger">Удалить</button>
  </form>
</div>
```

- [ ] **Step 3: Smoke-проверка деталей**

В списке `/admin/leads` кликни по любой строке.

Expected:
- Открылась страница `/admin/leads/:id` со всеми полями.
- Payload отрендерен как форматированный JSON в `<pre>`.
- Кнопка «Отметить обработанной» видна (если заявка новая).
- Кнопка «Удалить» красная.
- Кнопка «← К списку» возвращает в список.

Нажми «Отметить обработанной»:
- Редирект обратно на ту же страницу.
- Бейдж сменился на зелёный «обработана», рядом дата `processed_at`.
- Кнопка превратилась в «Вернуть в новые».
- Сверху всплыл тост «Отмечено обработанной».

Нажми «Вернуть в новые»:
- Бейдж снова синий «новая», `processed_at` не показан.

Verify в psql, что `processed_at` действительно обнуляется:
```
psql "postgres://postgres:Test1234@localhost:5433/good_pools_db" -c "SELECT id, status, processed_at FROM leads ORDER BY id DESC LIMIT 5"
```

Удали тестовую заявку (если она тестовая):
- Confirm-диалог → ОК → редирект на список, заявки нет, тост «Заявка удалена».

- [ ] **Step 4: Commit**

```
git add routes/admin.js views/leads/show.ejs
git commit -m "admin: детальная страница заявки + тоггл статуса + удаление"
```

---

### Task 5: CSV-экспорт

**Files:**
- Modify: `routes/admin.js` (добавить хелпер `csvEscape` + маршрут `GET /admin/leads/export.csv` **перед** `GET /admin/leads/:id`)
- Modify: `views/leads/index.ejs` (добавить ссылку «Экспорт CSV» над таблицей с проброшенным query)

**Важно:** маршрут `/leads/export.csv` обязан стоять в `admin.js` **до** маршрута `/leads/:id`, иначе Express попытается интерпретировать `export.csv` как `id`.

- [ ] **Step 1: Добавить хелпер `csvEscape` в `routes/admin.js`**

В самом начале файла, сразу после блока `const { processUpload, deleteFile } = require('../middleware/upload');`, добавить:

```js
// CSV-экранирование по RFC 4180 + защита от CSV-инъекции в Excel.
function csvEscape(v) {
  if (v == null) return '';
  let s = String(v);
  // Защита от CSV-injection: значения, начинающиеся со спецсимвола формул.
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
```

- [ ] **Step 2: Добавить маршрут CSV-экспорта в `routes/admin.js`**

Найти `router.get('/leads/:id', ...)` (из Task 4) и **перед** ним вставить:

```js
router.get('/leads/export.csv', async function (req, res) {
  try {
    // Парсим те же фильтры что и /admin/leads, без пагинации.
    const q = (req.query.q || '').trim();
    const source = (req.query.source || '').trim();
    const statusFilter = ['new', 'processed'].includes(req.query.status) ? req.query.status : '';

    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;
    const from = (fromDate && !isNaN(fromDate)) ? fromDate : null;
    const to = (toDate && !isNaN(toDate)) ? toDate : null;
    if (to) to.setHours(23, 59, 59, 999);

    const where = [];
    const params = [];
    function add(cond, value) { params.push(value); where.push(cond.replace('?', '$' + params.length)); }
    if (source) add('source = ?', source);
    if (statusFilter) add('status = ?', statusFilter);
    if (from) add('created_at >= ?', from);
    if (to) add('created_at <= ?', to);
    if (q) {
      params.push('%' + q + '%');
      const ph = '$' + params.length;
      where.push('(name ILIKE ' + ph + ' OR phone ILIKE ' + ph + ')');
    }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const result = await pool.query(
      `SELECT id, created_at, source, source_label, page_path, name, phone, email,
              status, processed_at, consent_given, consent_marketing, policy_version,
              consent_ip, payload
       FROM leads ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT 50000`,
      params
    );

    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads-' + today + '.csv"');
    // UTF-8 BOM для Excel.
    res.write('﻿');

    const headers = [
      'id', 'created_at', 'source', 'source_label', 'page_path', 'name', 'phone', 'email',
      'status', 'processed_at', 'consent_given', 'consent_marketing', 'policy_version',
      'consent_ip', 'payload'
    ];
    res.write(headers.join(',') + '\r\n');

    for (const r of result.rows) {
      const row = [
        r.id,
        r.created_at ? r.created_at.toISOString() : '',
        r.source,
        r.source_label,
        r.page_path,
        r.name,
        r.phone,
        r.email,
        r.status,
        r.processed_at ? r.processed_at.toISOString() : '',
        r.consent_given,
        r.consent_marketing,
        r.policy_version,
        r.consent_ip,
        r.payload ? JSON.stringify(r.payload) : ''
      ].map(csvEscape);
      res.write(row.join(',') + '\r\n');
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
```

- [ ] **Step 3: Добавить ссылку «Экспорт CSV» в `views/leads/index.ejs`**

Найти `<div class="top-bar">` в начале файла, заменить весь этот div на:

```html
<div class="top-bar">
  <h1>Заявки <% if (typeof total !== 'undefined') { %><span style="color:#71717a; font-size:14px; font-weight:normal;">(<%= total %>)</span><% } %></h1>
  <%
    var exportQs = Object.keys(query).filter(function(k){ return query[k]; }).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(query[k]); }).join('&');
  %>
  <a href="/admin/leads/export.csv<%= exportQs ? '?' + exportQs : '' %>" class="btn btn-outline btn-sm">⬇ Экспорт CSV</a>
</div>
```

- [ ] **Step 4: Smoke-проверка CSV**

В `http://localhost:3050/admin/leads` нажми «⬇ Экспорт CSV» без фильтров.

Expected:
- Скачивается файл `leads-YYYY-MM-DD.csv`.
- Открой его в Excel/LibreOffice. Кириллица отображается корректно (нет иероглифов).
- В первой строке — все 15 заголовков из списка выше.
- payload в своей колонке как JSON-строка.

Включи фильтр (например, статус = новые) и снова нажми экспорт.

Expected:
- В файле только новые заявки.
- URL ссылки содержит `?status=new`.

Проверка CSV-инъекции (опционально): создай заявку через `/api/leads` с именем `=cmd|' /C calc'!A1`. После экспорта открой CSV в текстовом редакторе — это значение должно начинаться с одинарной кавычки `'=cmd...`.

- [ ] **Step 5: Commit**

```
git add routes/admin.js views/leads/index.ejs
git commit -m "admin: CSV-экспорт заявок с фильтрами"
```

---

### Task 6: Финальный сквозной smoke-тест

Эта задача — пройтись по всему чеклисту из спека на свежей сессии. Никаких изменений в коде (если не найдёшь баги).

- [ ] **Step 1: Перезапустить dev-сервер**

В терминале где идёт `npm run dev` нажми Ctrl+C, запусти заново. Это сбросит in-memory сессии и поднимет последний код.

- [ ] **Step 2: Полный сквозной чеклист**

Открой `http://localhost:3050/admin/login`, войди.

- [ ] Сабмить новую заявку с фронта: открой в другой вкладке `http://localhost:3050/`, заполни любую форму (например, «Получить консультацию»). Проверь, что письмо ушло (если SMTP настроен) и заявка появилась в таблице со статусом «новая».
- [ ] Открой деталь только что созданной заявки. Все поля заполнены: имя/телефон/email/source/page_path/payload (если форма его шлёт)/consent_ip.
- [ ] «Отметить обработанной» → бейдж зелёный, processed_at заполнен.
- [ ] «Вернуть в новые» → бейдж синий, processed_at очищен.
- [ ] В списке: фильтр «Статус = Обработанные» — заявка не показывается (она снова новая).
- [ ] Фильтр «Статус = Новые» — заявка показывается.
- [ ] Фильтр «Источник» = тот же источник, что у заявки — она остаётся.
- [ ] Поиск по части телефона — заявка показывается.
- [ ] Фильтр «С даты» = сегодня — заявка показывается; «По дату» = вчера — не показывается.
- [ ] Экспорт CSV без фильтра → файл открывается в Excel.
- [ ] Экспорт CSV с применённым фильтром → файл содержит только отфильтрованные строки.
- [ ] На деталях нажми «Удалить» → confirm → заявка исчезла из списка.

- [ ] **Step 3: Проверка вне-scope-сценариев (что не должно сломаться)**

- [ ] Существующие разделы админки (Категории, Модели, Портфолио) открываются и работают.
- [ ] Существующий `POST /api/leads` (отправка с фронта) продолжает работать — лид появляется в БД с дефолтным `status = 'new'`.

Если что-то сломалось — диагностируй, патчь, и сделай отдельный коммит с описанием бага и фикса.

- [ ] **Step 4: (опционально) Подготовка к деплою**

Прежде чем пушить, убедись:
- В `.github/workflows/deploy.yml` папка `views/` есть в rsync-списке (там должна быть — но проверь):
  ```
  grep -E "(views|routes|db)" /c/Users/Roman/good_pools/.github/workflows/deploy.yml
  ```
- На сервере применится миграция 0005 автоматически (это уже в шагах workflow).

Никаких новых top-level папок этот план НЕ вводит — только новый файл `views/leads/index.ejs`+`show.ejs` внутри уже синкаемой `views/`, и новый файл миграции внутри `db/migrations/`. Так что deploy.yml править не надо.

Если всё ок локально — `git push origin main`. После деплоя зайти на прод `/admin/leads` и убедиться, что страница работает.

---

## Карта файлов (итог)

**Создано:**
- `db/migrations/0005_leads_status.sql` — Task 1
- `views/leads/index.ejs` — Task 2 (расширено в Task 3 и Task 5)
- `views/leads/show.ejs` — Task 4

**Изменено:**
- `db/init.sql` — Task 1 (добавлены `status` и `processed_at` в `CREATE TABLE leads`)
- `routes/admin.js` — Task 2 (базовый список), Task 3 (фильтры), Task 4 (детали/статус/удаление), Task 5 (CSV-экспорт + хелпер)
- `views/layout.ejs` — Task 2 (ссылка в сайдбаре)

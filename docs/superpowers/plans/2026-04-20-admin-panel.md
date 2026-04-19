# Admin Panel + PostgreSQL Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PostgreSQL-backed admin panel and REST API to the static "Хорошие Бассейны" site so content is managed through a browser instead of JSON files.

**Architecture:** Single Express server serves the existing static frontend, a public REST API (replacing JSON stubs), and an EJS-rendered admin panel behind session auth. PostgreSQL stores categories, models, portfolio, and admin users. Photos uploaded via admin are stored on disk under `uploads/`.

**Tech Stack:** Node.js 20, Express 4, EJS 3, PostgreSQL 12, bcryptjs, multer, sharp, express-session + connect-pg-simple, dotenv

**Server:** `roman@95.163.236.186` (password: `Test1234`), deploy to `/var/www/good-pools/`, port 3050, PM2 managed.

**SSH shorthand used throughout:** `sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186`

---

## File Map

### New files (backend)

| File | Responsibility |
|------|---------------|
| `server.js` | Express entry point — mounts static, API, admin, uploads, sessions |
| `package.json` | Dependencies and start script |
| `.env.example` | Template for env vars |
| `db/pool.js` | Exports a `pg.Pool` singleton |
| `db/init.sql` | CREATE TABLE statements + seed data from current stubs |
| `create-admin.js` | CLI script: `node create-admin.js <username> <password>` |
| `middleware/auth.js` | `requireAuth` — redirects to login if no session |
| `middleware/upload.js` | Multer + sharp config, exports `uploadAndResize(subfolder)` |
| `routes/api.js` | `GET /api/categories`, `/api/models`, `/api/portfolio` |
| `routes/admin.js` | All `/admin/*` CRUD routes |
| `views/layout.ejs` | Shared admin layout (sidebar, header, toast) |
| `views/login.ejs` | Login form |
| `views/dashboard.ejs` | Admin dashboard with counts |
| `views/categories/index.ejs` | Categories table |
| `views/categories/form.ejs` | Category create/edit form |
| `views/models/index.ejs` | Models table |
| `views/models/form.ejs` | Model create/edit form + image management |
| `views/portfolio/index.ejs` | Portfolio table |
| `views/portfolio/form.ejs` | Portfolio create/edit form + image management |

### Modified files (frontend)

| File | Change |
|------|--------|
| `js/data-source.js` | URLs → `/api/*`, add `getPortfolio()` |
| `js/portfolio.js` | Remove hardcoded `WORKS`/`WORK_CATEGORIES`, load from DataSource |
| `js/models.js` | Remove `stubGallery()`, use `gallery` from API data |
| `.gitignore` | Add `node_modules`, `.env`, `uploads/` |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "good-pools-backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "connect-pg-simple": "^9.0.1",
    "dotenv": "^16.4.5",
    "ejs": "^3.1.10",
    "express": "^4.21.0",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.13.0",
    "sharp": "^0.33.5"
  }
}
```

- [ ] **Step 2: Create .env.example**

```
DATABASE_URL=postgres://roman:Test1234@localhost:5432/good_pools_db
SESSION_SECRET=change-me-to-random-string
PORT=3050
```

- [ ] **Step 3: Update .gitignore**

Append to existing `.gitignore`:
```
node_modules
.env
uploads/
```

- [ ] **Step 4: Create upload directories**

```bash
mkdir -p uploads/categories uploads/models uploads/portfolio
```

- [ ] **Step 5: Commit**

```bash
git add package.json .env.example .gitignore
git commit -m "chore: project scaffolding for backend"
```

---

## Task 2: Database Schema + Seed Data

**Files:**
- Create: `db/init.sql`

- [ ] **Step 1: Write init.sql with all tables and seed data**

```sql
-- ============================================================
-- good_pools_db schema
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50)  UNIQUE NOT NULL,
  label       VARCHAR(100) NOT NULL,
  image       VARCHAR(255),
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(100)  UNIQUE NOT NULL,
  category_id INT           NOT NULL REFERENCES categories(id),
  name        VARCHAR(100)  NOT NULL,
  series      VARCHAR(100),
  description TEXT,
  length_m    DECIMAL(4,1),
  width_m     DECIMAL(4,1),
  depth_m     DECIMAL(4,1),
  specs_label VARCHAR(100),
  price       VARCHAR(100),
  badge       VARCHAR(50),
  sort_order  INT           DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_images (
  id         SERIAL PRIMARY KEY,
  model_id   INT          NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT          DEFAULT 0,
  is_cover   BOOLEAN      DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS portfolio (
  id          SERIAL PRIMARY KEY,
  category_id INT          NOT NULL REFERENCES categories(id),
  title       VARCHAR(200) NOT NULL,
  location    VARCHAR(200),
  size        VARCHAR(100),
  year        INT,
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_images (
  id           SERIAL PRIMARY KEY,
  portfolio_id INT          NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
  image_path   VARCHAR(255) NOT NULL,
  sort_order   INT          DEFAULT 0,
  is_cover     BOOLEAN      DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- connect-pg-simple session table
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- ============================================================
-- Seed: categories
-- ============================================================
INSERT INTO categories (key, label, image, sort_order) VALUES
  ('composite',  'Композитные',  'images/categories/composite-pool.svg', 1),
  ('custom',     'Кастом',       'images/categories/custom-pool.svg',    2),
  ('jacuzzi',    'Джакузи-спа',  'images/categories/jacuzzi-spa.svg',    3),
  ('inflatable', 'Надувные спа', 'images/categories/inflatable-spa.svg', 4),
  ('furako',     'Фурако',       'images/categories/furako.svg',         5),
  ('furniture',  'Мебель',       'images/categories/furniture.svg',      6)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed: models (references category ids by subquery)
-- ============================================================
INSERT INTO models (slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order) VALUES
  ('hiit',  (SELECT id FROM categories WHERE key='composite'), 'HIIT',  'Спортивная серия',   'Увеличенная длина для активного плавания, обтекаемая форма, усиленное дно.', 8.0, 3.6, 1.6, NULL, 'от 1 250 000 ₽', 'Хит продаж', 1),
  ('zen',   (SELECT id FROM categories WHERE key='composite'), 'ZEN',   'Классическая серия', 'Прямоугольная форма для ценителей чистых линий, компактная.',                 6.2, 3.2, 1.5, NULL, 'от 890 000 ₽',   NULL,          2),
  ('tetta', (SELECT id FROM categories WHERE key='composite'), 'TETTA', 'Семейная серия',     'Эргономичная форма со встроенными ступенями и зоной отдыха.',                 7.0, 3.4, 1.5, NULL, 'от 1 100 000 ₽', NULL,          3),

  ('custom-classic',  (SELECT id FROM categories WHERE key='custom'), 'CUSTOM CLASSIC',  'Индивидуальный проект', 'Прямые линии, ваши размеры. Делаем по чертежам участка.',                NULL, NULL, NULL, 'Любой размер', 'По проекту', NULL,      1),
  ('custom-infinity', (SELECT id FROM categories WHERE key='custom'), 'CUSTOM INFINITY', 'Инфинити-проект',       'Бассейн с переливом через край — эффект бесконечной воды.',              NULL, NULL, NULL, 'Любой размер', 'По проекту', 'Премиум', 2),
  ('custom-lagoon',   (SELECT id FROM categories WHERE key='custom'), 'CUSTOM LAGOON',   'Свободная форма',       'Органичные контуры в стиле природной лагуны, пляжный вход.',             NULL, NULL, NULL, 'Любой размер', 'По проекту', NULL,      3),

  ('spa-duo',     (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA DUO',     '2 места', 'Компактное спа для двоих, 20 гидромассажных форсунок, LED-подсветка.', NULL, NULL, NULL, 'Ø 1.9 м · 85 см',    'от 420 000 ₽',   NULL,          1),
  ('spa-family',  (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA FAMILY',  '6 мест',  'Семейное спа с зоной отдыха, 40 форсунок, встроенная акустика.',        NULL, NULL, NULL, '2.2 × 2.2 × 0.9 м',  'от 780 000 ₽',   'Хит продаж',  2),
  ('spa-premium', (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA PREMIUM', '8 мест',  'Топ-модель: 60 форсунок, хромотерапия, аромадиффузор, подогрев.',       NULL, NULL, NULL, '2.4 · 2.4 · 0.95 м', 'от 1 150 000 ₽', NULL,          3),

  ('inflate-round',  (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE ROUND',  '4 места', 'Круглое надувное спа с подогревом 40°C и массажными форсунками.',    NULL, NULL, NULL, 'Ø 1.8 м · 65 см',   'от 89 000 ₽',  NULL,       1),
  ('inflate-square', (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE SQUARE', '6 мест',  'Квадратная форма, большая вместимость, быстрый монтаж за 15 минут.', NULL, NULL, NULL, '2.0 × 2.0 × 0.7 м', 'от 129 000 ₽', NULL,       2),
  ('inflate-jet',    (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE JET',    '4 места', 'Усиленный массаж 140 форсунок, хромотерапия, пульт ДУ.',             NULL, NULL, NULL, 'Ø 1.9 м · 70 см',   'от 165 000 ₽', 'Новинка', 3),

  ('furako-classic', (SELECT id FROM categories WHERE key='furako'), 'FURAKO CLASSIC', 'Кедр сибирский', 'Классическая круглая купель из кедра, дровяная печь внутри.',           NULL, NULL, NULL, 'Ø 1.8 м · 1.0 м',    'от 245 000 ₽', NULL,          1),
  ('furako-oval',    (SELECT id FROM categories WHERE key='furako'), 'FURAKO OVAL',    'Дуб',            'Овальная форма для двоих лёжа, печь снаружи, удобный вход.',             NULL, NULL, NULL, '2.0 × 1.5 × 1.0 м',  'от 310 000 ₽', NULL,          2),
  ('furako-xl',      (SELECT id FROM categories WHERE key='furako'), 'FURAKO XL',      'Кедр премиум',   'Большая купель до 8 человек, встроенные лавки, лестница из нержавейки.', NULL, NULL, NULL, 'Ø 2.2 м · 1.2 м',    'от 420 000 ₽', 'Хит продаж', 3),

  ('lounge-chair', (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE CHAIR', 'Шезлонг',           'Влагостойкий алюминий + ткань Textilene, регулировка спинки.',    NULL, NULL, NULL, '195 × 70 × 40 см',  'от 28 000 ₽',  NULL, 1),
  ('lounge-sofa',  (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE SOFA',  'Диван для террасы', 'Модульный диван из ротанга, водоотталкивающие подушки.',          NULL, NULL, NULL, '220 × 85 × 75 см',  'от 95 000 ₽',  NULL, 2),
  ('lounge-bar',   (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE BAR',   'Барная зона',       'Барная стойка + 2 стула, тик + нержавейка, для зоны у бассейна.', NULL, NULL, NULL, '140 × 55 × 110 см', 'от 142 000 ₽', NULL, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: portfolio
-- ============================================================
INSERT INTO portfolio (category_id, title, location, size, year, sort_order) VALUES
  ((SELECT id FROM categories WHERE key='composite'), 'Вилла в Подмосковье',           'Московская область',   '8.0 × 4.0 м',     2024, 1),
  ((SELECT id FROM categories WHERE key='composite'), 'Загородный дом в Сочи',         'Краснодарский край',    '7.0 × 3.5 м',     2024, 2),
  ((SELECT id FROM categories WHERE key='composite'), 'Коттедж в Краснодаре',          'Краснодар',             '6.5 × 3.2 м',     2023, 3),
  ((SELECT id FROM categories WHERE key='composite'), 'Особняк под Санкт-Петербургом', 'Ленинградская область', '9.0 × 4.5 м',     2024, 4),
  ((SELECT id FROM categories WHERE key='custom'),    'Резиденция в Казани',           'Татарстан',             '12 × 5 м',        2024, 5),
  ((SELECT id FROM categories WHERE key='custom'),    'Дом в Ростове-на-Дону',         'Ростовская область',    '10 × 4 м',        2023, 6),
  ((SELECT id FROM categories WHERE key='custom'),    'Вилла в Калининграде',          'Калининградская обл.',  'Лагуна 14 × 6 м', 2023, 7),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Пентхаус в Екатеринбурге',      'Свердловская область',  'SPA Family',       2024, 8),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Коттедж в Новосибирске',        'Новосибирская обл.',    'SPA Premium',      2024, 9),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Дача под Владивостоком',        'Приморский край',       'SPA Duo',          2023, 10),
  ((SELECT id FROM categories WHERE key='furako'),    'База отдыха в Карелии',         'Республика Карелия',    'Кедр Ø 2.2 м',    2024, 11),
  ((SELECT id FROM categories WHERE key='furako'),    'Гостевой дом на Алтае',         'Горный Алтай',          'Кедр Ø 1.8 м',    2023, 12);
```

- [ ] **Step 2: Commit**

```bash
git add db/init.sql
git commit -m "feat(db): schema and seed data for categories, models, portfolio"
```

---

## Task 3: Database Connection + Express Server

**Files:**
- Create: `db/pool.js`
- Create: `server.js`

- [ ] **Step 1: Create db/pool.js**

```js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
```

- [ ] **Step 2: Create server.js**

```js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3050;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sessions stored in PostgreSQL
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Make session user available in all EJS views
app.use(function (req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Static: uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Static: frontend site (must be AFTER /api and /admin)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', function () {
  console.log('good-pools running on http://0.0.0.0:' + PORT);
});
```

- [ ] **Step 3: Create placeholder route files so server boots**

Create `routes/api.js`:
```js
const router = require('express').Router();

router.get('/categories', function (req, res) { res.json([]); });
router.get('/models', function (req, res) { res.json([]); });
router.get('/portfolio', function (req, res) { res.json([]); });

module.exports = router;
```

Create `routes/admin.js`:
```js
const router = require('express').Router();

router.get('/login', function (req, res) {
  res.send('login page - coming soon');
});

router.get('/', function (req, res) {
  res.send('admin dashboard - coming soon');
});

module.exports = router;
```

- [ ] **Step 4: Commit**

```bash
git add db/pool.js server.js routes/api.js routes/admin.js
git commit -m "feat: express server with session, DB pool, placeholder routes"
```

---

## Task 4: Auth — Middleware, Login, Logout

**Files:**
- Create: `middleware/auth.js`
- Create: `views/login.ejs`
- Modify: `routes/admin.js`
- Create: `create-admin.js`

- [ ] **Step 1: Create middleware/auth.js**

```js
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/admin/login');
}

module.exports = requireAuth;
```

- [ ] **Step 2: Create views/login.ejs**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вход — Админ-панель</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e4e4e7; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-card { background: #1a1b23; border-radius: 16px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .login-card h1 { font-size: 24px; margin-bottom: 8px; }
    .login-card p { color: #71717a; margin-bottom: 24px; font-size: 14px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 13px; color: #a1a1aa; margin-bottom: 6px; }
    .field input { width: 100%; padding: 10px 14px; background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; color: #e4e4e7; font-size: 15px; outline: none; }
    .field input:focus { border-color: #3b82f6; }
    .btn { width: 100%; padding: 12px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; margin-top: 8px; }
    .btn:hover { background: #2563eb; }
    .error-msg { background: #7f1d1d; color: #fca5a5; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>Хорошие Бассейны</h1>
    <p>Панель управления сайтом</p>
    <% if (typeof error !== 'undefined' && error) { %>
      <div class="error-msg"><%= error %></div>
    <% } %>
    <form method="POST" action="/admin/login">
      <div class="field">
        <label for="username">Логин</label>
        <input type="text" id="username" name="username" required autofocus>
      </div>
      <div class="field">
        <label for="password">Пароль</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="btn">Войти</button>
    </form>
  </div>
</body>
</html>
```

- [ ] **Step 3: Update routes/admin.js with login/logout logic**

Replace `routes/admin.js` entirely:

```js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

// ---------- Login / Logout ----------

router.get('/login', function (req, res) {
  if (req.session.user) return res.redirect('/admin');
  res.render('login', { error: null });
});

router.post('/login', async function (req, res) {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.render('login', { error: 'Неверный логин или пароль' });
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/admin');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Ошибка сервера' });
  }
});

router.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('/admin/login');
  });
});

// ---------- All routes below require auth ----------
router.use(requireAuth);

// Dashboard (placeholder — will be replaced in Task 5)
router.get('/', function (req, res) {
  res.send('Dashboard — coming in Task 5');
});

module.exports = router;
```

- [ ] **Step 4: Create create-admin.js**

```js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: node create-admin.js <username> <password>');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET password_hash = $2',
      [username, hash]
    );
    console.log('Admin user "' + username + '" created/updated.');
  } catch (err) {
    console.error('Error:', err.message);
  }
  await pool.end();
}

main();
```

- [ ] **Step 5: Commit**

```bash
git add middleware/auth.js views/login.ejs routes/admin.js create-admin.js
git commit -m "feat(auth): login/logout with bcrypt sessions, create-admin CLI"
```

---

## Task 5: Admin Layout + Dashboard

**Files:**
- Create: `views/layout.ejs`
- Create: `views/dashboard.ejs`
- Modify: `routes/admin.js` (dashboard route)

- [ ] **Step 1: Create views/layout.ejs**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= typeof pageTitle !== 'undefined' ? pageTitle + ' — ' : '' %>Админ · Хорошие Бассейны</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e4e4e7; display: flex; min-height: 100vh; }

    /* Sidebar */
    .sidebar { width: 240px; background: #1a1b23; padding: 24px 16px; display: flex; flex-direction: column; border-right: 1px solid #27272a; }
    .sidebar-logo { font-size: 16px; font-weight: 700; margin-bottom: 32px; padding: 0 8px; color: #3b82f6; }
    .sidebar a { display: block; padding: 10px 12px; border-radius: 8px; color: #a1a1aa; text-decoration: none; font-size: 14px; margin-bottom: 4px; }
    .sidebar a:hover, .sidebar a.active { background: #27272a; color: #e4e4e7; }
    .sidebar .spacer { flex: 1; }
    .sidebar .logout { color: #ef4444; }

    /* Main */
    .main { flex: 1; padding: 32px; overflow-y: auto; }
    .main h1 { font-size: 24px; margin-bottom: 24px; }

    /* Toast */
    .toast { position: fixed; top: 24px; right: 24px; padding: 12px 20px; border-radius: 8px; font-size: 14px; z-index: 1000; animation: fadeInOut 3s forwards; }
    .toast.success { background: #065f46; color: #6ee7b7; }
    .toast.error { background: #7f1d1d; color: #fca5a5; }
    @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(-10px); } 10% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }

    /* Table */
    .admin-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .admin-table th, .admin-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #27272a; font-size: 14px; }
    .admin-table th { color: #71717a; font-weight: 500; font-size: 12px; text-transform: uppercase; }
    .admin-table tr:hover { background: #1a1b23; }

    /* Buttons */
    .btn { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; border: none; text-decoration: none; }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-primary:hover { background: #2563eb; }
    .btn-danger { background: #7f1d1d; color: #fca5a5; }
    .btn-danger:hover { background: #991b1b; }
    .btn-sm { padding: 4px 10px; font-size: 13px; }
    .btn-outline { background: transparent; border: 1px solid #3f3f46; color: #a1a1aa; }
    .btn-outline:hover { border-color: #e4e4e7; color: #e4e4e7; }

    /* Forms */
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; color: #a1a1aa; margin-bottom: 6px; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px 14px; background: #27272a; border: 1px solid #3f3f46; border-radius: 8px; color: #e4e4e7; font-size: 14px; outline: none; }
    .form-group input:focus, .form-group textarea:focus, .form-group select:focus { border-color: #3b82f6; }
    .form-row { display: flex; gap: 16px; }
    .form-row .form-group { flex: 1; }
    .form-actions { margin-top: 24px; display: flex; gap: 12px; }

    /* Cards */
    .stat-cards { display: flex; gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #1a1b23; border-radius: 12px; padding: 24px; flex: 1; border: 1px solid #27272a; }
    .stat-card .val { font-size: 32px; font-weight: 700; }
    .stat-card .label { color: #71717a; font-size: 13px; margin-top: 4px; }

    /* Image grid */
    .img-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
    .img-grid .img-item { position: relative; width: 120px; height: 90px; border-radius: 8px; overflow: hidden; border: 2px solid transparent; }
    .img-grid .img-item.is-cover { border-color: #3b82f6; }
    .img-grid .img-item img { width: 100%; height: 100%; object-fit: cover; }
    .img-grid .img-item .img-actions { position: absolute; top: 4px; right: 4px; display: flex; gap: 4px; }
    .img-grid .img-item .img-btn { width: 24px; height: 24px; border-radius: 4px; border: none; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; }
    .img-btn-del { background: rgba(127,29,29,0.9); color: #fca5a5; }
    .img-btn-cover { background: rgba(59,130,246,0.9); color: #fff; }

    /* Top bar */
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-logo">🏊 Хорошие Бассейны</div>
    <a href="/admin" class="<%= typeof active !== 'undefined' && active === 'dashboard' ? 'active' : '' %>">Дашборд</a>
    <a href="/admin/categories" class="<%= typeof active !== 'undefined' && active === 'categories' ? 'active' : '' %>">Категории</a>
    <a href="/admin/models" class="<%= typeof active !== 'undefined' && active === 'models' ? 'active' : '' %>">Модели</a>
    <a href="/admin/portfolio" class="<%= typeof active !== 'undefined' && active === 'portfolio' ? 'active' : '' %>">Портфолио</a>
    <div class="spacer"></div>
    <a href="/" target="_blank">Открыть сайт ↗</a>
    <a href="/admin/logout" class="logout">Выйти</a>
  </aside>

  <main class="main">
    <% if (typeof success !== 'undefined' && success) { %>
      <div class="toast success"><%= success %></div>
    <% } %>
    <% if (typeof error !== 'undefined' && error) { %>
      <div class="toast error"><%= error %></div>
    <% } %>
    <%- body %>
  </main>
</body>
</html>
```

- [ ] **Step 2: Create views/dashboard.ejs**

```html
<h1>Дашборд</h1>

<div class="stat-cards">
  <div class="stat-card">
    <div class="val"><%= counts.categories %></div>
    <div class="label">Категорий</div>
  </div>
  <div class="stat-card">
    <div class="val"><%= counts.models %></div>
    <div class="label">Моделей</div>
  </div>
  <div class="stat-card">
    <div class="val"><%= counts.portfolio %></div>
    <div class="label">Работ в портфолио</div>
  </div>
</div>

<p style="color:#71717a;">Добро пожаловать, <strong><%= user.username %></strong>. Используйте меню слева для управления контентом сайта.</p>
```

- [ ] **Step 3: Update dashboard route in routes/admin.js**

Replace the dashboard placeholder (`router.get('/', ...)` after `router.use(requireAuth)`) with:

```js
router.get('/', async function (req, res) {
  try {
    const [c, m, p] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM categories'),
      pool.query('SELECT COUNT(*)::int AS n FROM models'),
      pool.query('SELECT COUNT(*)::int AS n FROM portfolio')
    ]);
    res.render('dashboard', {
      body: '', // will be set by layout include pattern
      pageTitle: 'Дашборд',
      active: 'dashboard',
      counts: { categories: c.rows[0].n, models: m.rows[0].n, portfolio: p.rows[0].n }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
```

**Important:** Update `server.js` view rendering approach. Since EJS doesn't have native layout support, we use `express-ejs-layouts` pattern manually. Every admin route will render its content into the `body` variable, then `layout.ejs` wraps it. To achieve this with plain EJS, change the approach: each admin view is a complete page that `<%- include('../layout-start') %>` ... `<%- include('../layout-end') %>`. 

**Simpler approach:** Use `<%- include() %>` with a wrapper pattern. Each page template includes layout parts:

Actually, the simplest pattern: render dashboard.ejs as a standalone, and use `<%- include('layout', { body: ... }) %>`. But EJS doesn't work that way natively.

**Revised approach:** Use `express-ejs-layouts` is NOT a dependency. Instead, render with a two-step approach: render the body template to a string, then render layout with that string.

Add a helper to `routes/admin.js` at the top (after requires):

```js
// Helper: render an EJS view inside the admin layout
function renderAdmin(res, view, locals) {
  res.app.render(view, locals, function (err, body) {
    if (err) { console.error(err); return res.status(500).send('Render error'); }
    locals.body = body;
    res.render('layout', locals);
  });
}
```

Then the dashboard route becomes:

```js
router.get('/', async function (req, res) {
  try {
    const [c, m, p] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM categories'),
      pool.query('SELECT COUNT(*)::int AS n FROM models'),
      pool.query('SELECT COUNT(*)::int AS n FROM portfolio')
    ]);
    renderAdmin(res, 'dashboard', {
      pageTitle: 'Дашборд',
      active: 'dashboard',
      counts: { categories: c.rows[0].n, models: m.rows[0].n, portfolio: p.rows[0].n }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
```

All subsequent admin routes will use `renderAdmin(res, viewName, locals)`.

- [ ] **Step 4: Commit**

```bash
git add views/layout.ejs views/dashboard.ejs routes/admin.js
git commit -m "feat(admin): layout with sidebar, dashboard with counts"
```

---

## Task 6: Categories CRUD

**Files:**
- Create: `views/categories/index.ejs`
- Create: `views/categories/form.ejs`
- Modify: `routes/admin.js`

- [ ] **Step 1: Create views/categories/index.ejs**

```html
<div class="top-bar">
  <h1>Категории</h1>
  <a href="/admin/categories/new" class="btn btn-primary">+ Добавить</a>
</div>

<table class="admin-table">
  <thead>
    <tr>
      <th>Иконка</th>
      <th>Название</th>
      <th>Ключ</th>
      <th>Порядок</th>
      <th>Моделей</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <% categories.forEach(function(cat) { %>
    <tr>
      <td><% if (cat.image) { %><img src="/<%= cat.image %>" alt="" style="height:32px;"><% } %></td>
      <td><%= cat.label %></td>
      <td><code><%= cat.key %></code></td>
      <td><%= cat.sort_order %></td>
      <td><%= cat.model_count %></td>
      <td>
        <a href="/admin/categories/<%= cat.id %>/edit" class="btn btn-sm btn-outline">Редактировать</a>
        <% if (parseInt(cat.model_count) === 0 && parseInt(cat.portfolio_count) === 0) { %>
          <form method="POST" action="/admin/categories/<%= cat.id %>/delete" style="display:inline;" onsubmit="return confirm('Удалить категорию «<%= cat.label %>»?')">
            <button type="submit" class="btn btn-sm btn-danger">Удалить</button>
          </form>
        <% } %>
      </td>
    </tr>
    <% }); %>
  </tbody>
</table>
```

- [ ] **Step 2: Create views/categories/form.ejs**

```html
<h1><%= item ? 'Редактировать' : 'Новая' %> категория</h1>

<form method="POST" action="<%= item ? '/admin/categories/' + item.id : '/admin/categories' %>" enctype="multipart/form-data" style="max-width:500px;">
  <div class="form-group">
    <label for="label">Название</label>
    <input type="text" id="label" name="label" required value="<%= item ? item.label : '' %>">
  </div>
  <div class="form-group">
    <label for="key">Ключ (латиница)</label>
    <input type="text" id="key" name="key" required pattern="[a-z0-9\-]+" value="<%= item ? item.key : '' %>">
  </div>
  <div class="form-group">
    <label for="sort_order">Порядок</label>
    <input type="number" id="sort_order" name="sort_order" value="<%= item ? item.sort_order : 0 %>">
  </div>
  <div class="form-group">
    <label for="image">Иконка (SVG/PNG)</label>
    <input type="file" id="image" name="image" accept=".svg,.png,.jpg,.webp">
    <% if (item && item.image) { %>
      <div style="margin-top:8px;"><img src="/<%= item.image %>" alt="" style="height:40px;"> <span style="color:#71717a;font-size:12px;">Текущая</span></div>
    <% } %>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Сохранить</button>
    <a href="/admin/categories" class="btn btn-outline">Отмена</a>
  </div>
</form>
```

- [ ] **Step 3: Add categories routes to routes/admin.js**

Add after the dashboard route, before `module.exports`:

```js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { processUpload } = require('../middleware/upload');

// --- Categories ---

router.get('/categories', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM models WHERE category_id = c.id) AS model_count,
        (SELECT COUNT(*) FROM portfolio WHERE category_id = c.id) AS portfolio_count
      FROM categories c ORDER BY c.sort_order, c.id
    `);
    renderAdmin(res, 'categories/index', { pageTitle: 'Категории', active: 'categories', categories: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/categories/new', function (req, res) {
  renderAdmin(res, 'categories/form', { pageTitle: 'Новая категория', active: 'categories', item: null });
});

router.post('/categories', processUpload('categories').single('image'), async function (req, res) {
  const { key, label, sort_order } = req.body;
  const image = req.file ? 'uploads/categories/' + req.file.filename : null;
  try {
    await pool.query(
      'INSERT INTO categories (key, label, image, sort_order) VALUES ($1, $2, $3, $4)',
      [key, label, image, parseInt(sort_order) || 0]
    );
    req.session.success = 'Категория добавлена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка сохранения: ' + err.message;
    res.redirect('/admin/categories/new');
  }
});

router.get('/categories/:id/edit', async function (req, res) {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.redirect('/admin/categories');
    renderAdmin(res, 'categories/form', { pageTitle: 'Редактировать категорию', active: 'categories', item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/categories');
  }
});

router.post('/categories/:id', processUpload('categories').single('image'), async function (req, res) {
  const { key, label, sort_order } = req.body;
  try {
    if (req.file) {
      const old = await pool.query('SELECT image FROM categories WHERE id = $1', [req.params.id]);
      if (old.rows[0] && old.rows[0].image) {
        const oldPath = path.join(__dirname, '..', old.rows[0].image);
        fs.unlink(oldPath, function () {});
      }
      await pool.query(
        'UPDATE categories SET key=$1, label=$2, image=$3, sort_order=$4 WHERE id=$5',
        [key, label, 'uploads/categories/' + req.file.filename, parseInt(sort_order) || 0, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE categories SET key=$1, label=$2, sort_order=$3 WHERE id=$4',
        [key, label, parseInt(sort_order) || 0, req.params.id]
      );
    }
    req.session.success = 'Категория обновлена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/categories/' + req.params.id + '/edit');
  }
});

router.post('/categories/:id/delete', async function (req, res) {
  try {
    const deps = await pool.query(
      'SELECT (SELECT COUNT(*) FROM models WHERE category_id=$1) + (SELECT COUNT(*) FROM portfolio WHERE category_id=$1) AS n',
      [req.params.id]
    );
    if (parseInt(deps.rows[0].n) > 0) {
      req.session.error = 'Нельзя удалить: есть привязанные модели или работы';
      return res.redirect('/admin/categories');
    }
    const old = await pool.query('SELECT image FROM categories WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (old.rows[0] && old.rows[0].image) {
      fs.unlink(path.join(__dirname, '..', old.rows[0].image), function () {});
    }
    req.session.success = 'Категория удалена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/categories');
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add views/categories/ routes/admin.js
git commit -m "feat(admin): categories CRUD with image upload"
```

---

## Task 7: File Upload Middleware

**Files:**
- Create: `middleware/upload.js`

- [ ] **Step 1: Create middleware/upload.js**

```js
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

function processUpload(subfolder) {
  const dest = path.join(UPLOAD_ROOT, subfolder);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, dest); },
    filename: function (req, file, cb) {
      const unique = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, unique + ext);
    }
  });

  const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_SIZE },
    fileFilter: function (req, file, cb) {
      if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Недопустимый тип файла: ' + file.mimetype));
    }
  });

  // Wrap to add post-processing (resize for raster images)
  const original = upload;

  // Return a proxy that, after multer runs, resizes raster images
  return {
    single: function (fieldName) {
      return [
        original.single(fieldName),
        resizeMiddleware
      ];
    },
    array: function (fieldName, maxCount) {
      return [
        original.array(fieldName, maxCount),
        resizeMiddleware
      ];
    }
  };
}

async function resizeMiddleware(req, res, next) {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    for (const file of files) {
      if (file.mimetype === 'image/svg+xml') continue;
      const tmpPath = file.path + '.tmp';
      await sharp(file.path)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(tmpPath);
      fs.renameSync(tmpPath, file.path);
    }
    next();
  } catch (err) {
    next(err);
  }
}

// Delete a file by its path (relative to project root)
function deleteFile(relativePath) {
  if (!relativePath) return;
  const abs = path.join(__dirname, '..', relativePath);
  fs.unlink(abs, function () {});
}

module.exports = { processUpload, deleteFile };
```

- [ ] **Step 2: Fix route middleware usage**

Since `processUpload('x').single('field')` returns an array of two middleware functions, Express `router.post(path, ...array, handler)` requires spreading. Update the categories routes in `routes/admin.js` to spread the middleware:

Change:
```js
router.post('/categories', processUpload('categories').single('image'), async function (req, res) {
```
To:
```js
router.post('/categories', ...processUpload('categories').single('image'), async function (req, res) {
```

Apply the same spread (`...`) to `router.post('/categories/:id', ...)`.

- [ ] **Step 3: Commit**

```bash
git add middleware/upload.js routes/admin.js
git commit -m "feat: upload middleware with multer + sharp resize"
```

---

## Task 8: Models CRUD

**Files:**
- Create: `views/models/index.ejs`
- Create: `views/models/form.ejs`
- Modify: `routes/admin.js`

- [ ] **Step 1: Create views/models/index.ejs**

```html
<div class="top-bar">
  <h1>Модели</h1>
  <a href="/admin/models/new" class="btn btn-primary">+ Добавить</a>
</div>

<div style="margin-bottom:16px;">
  <a href="/admin/models" class="btn btn-sm <%= !currentCategory ? 'btn-primary' : 'btn-outline' %>">Все</a>
  <% categories.forEach(function(cat) { %>
    <a href="/admin/models?category=<%= cat.id %>" class="btn btn-sm <%= currentCategory == cat.id ? 'btn-primary' : 'btn-outline' %>"><%= cat.label %></a>
  <% }); %>
</div>

<table class="admin-table">
  <thead>
    <tr>
      <th>Фото</th>
      <th>Название</th>
      <th>Серия</th>
      <th>Категория</th>
      <th>Цена</th>
      <th>Порядок</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <% models.forEach(function(m) { %>
    <tr>
      <td><% if (m.cover_image) { %><img src="/<%= m.cover_image %>" alt="" style="height:40px; border-radius:4px;"><% } else { %><span style="color:#71717a;">—</span><% } %></td>
      <td><strong><%= m.name %></strong><% if (m.badge) { %> <span style="color:#3b82f6; font-size:12px;"><%= m.badge %></span><% } %></td>
      <td><%= m.series || '—' %></td>
      <td><%= m.category_label %></td>
      <td><%= m.price || '—' %></td>
      <td><%= m.sort_order %></td>
      <td>
        <a href="/admin/models/<%= m.id %>/edit" class="btn btn-sm btn-outline">Редактировать</a>
        <form method="POST" action="/admin/models/<%= m.id %>/delete" style="display:inline;" onsubmit="return confirm('Удалить модель «<%= m.name %>»?')">
          <button type="submit" class="btn btn-sm btn-danger">Удалить</button>
        </form>
      </td>
    </tr>
    <% }); %>
  </tbody>
</table>
```

- [ ] **Step 2: Create views/models/form.ejs**

```html
<h1><%= item ? 'Редактировать' : 'Новая' %> модель</h1>

<form method="POST" action="<%= item ? '/admin/models/' + item.id : '/admin/models' %>" style="max-width:600px;">
  <div class="form-row">
    <div class="form-group">
      <label for="name">Название</label>
      <input type="text" id="name" name="name" required value="<%= item ? item.name : '' %>">
    </div>
    <div class="form-group">
      <label for="slug">Slug (URL)</label>
      <input type="text" id="slug" name="slug" required pattern="[a-z0-9\-]+" value="<%= item ? item.slug : '' %>">
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="category_id">Категория</label>
      <select id="category_id" name="category_id" required>
        <option value="">— выбрать —</option>
        <% categories.forEach(function(cat) { %>
          <option value="<%= cat.id %>" <%= item && item.category_id === cat.id ? 'selected' : '' %>><%= cat.label %></option>
        <% }); %>
      </select>
    </div>
    <div class="form-group">
      <label for="series">Серия</label>
      <input type="text" id="series" name="series" value="<%= item ? item.series || '' : '' %>">
    </div>
  </div>

  <div class="form-group">
    <label for="description">Описание</label>
    <textarea id="description" name="description" rows="3"><%= item ? item.description || '' : '' %></textarea>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="length_m">Длина (м)</label>
      <input type="number" id="length_m" name="length_m" step="0.1" value="<%= item && item.length_m ? item.length_m : '' %>">
    </div>
    <div class="form-group">
      <label for="width_m">Ширина (м)</label>
      <input type="number" id="width_m" name="width_m" step="0.1" value="<%= item && item.width_m ? item.width_m : '' %>">
    </div>
    <div class="form-group">
      <label for="depth_m">Глубина (м)</label>
      <input type="number" id="depth_m" name="depth_m" step="0.1" value="<%= item && item.depth_m ? item.depth_m : '' %>">
    </div>
  </div>

  <div class="form-group">
    <label for="specs_label">Размер (текст, если не стандартный)</label>
    <input type="text" id="specs_label" name="specs_label" value="<%= item ? item.specs_label || '' : '' %>" placeholder="Ø 1.9 м · 85 см">
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="price">Цена</label>
      <input type="text" id="price" name="price" value="<%= item ? item.price || '' : '' %>" placeholder="от 890 000 ₽">
    </div>
    <div class="form-group">
      <label for="badge">Бейдж</label>
      <input type="text" id="badge" name="badge" value="<%= item ? item.badge || '' : '' %>" placeholder="Хит продаж">
    </div>
  </div>

  <div class="form-group">
    <label for="sort_order">Порядок</label>
    <input type="number" id="sort_order" name="sort_order" value="<%= item ? item.sort_order : 0 %>">
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Сохранить</button>
    <a href="/admin/models" class="btn btn-outline">Отмена</a>
  </div>
</form>

<% if (item) { %>
<hr style="border-color:#27272a; margin: 32px 0;">
<h2 style="font-size:18px; margin-bottom:16px;">Фотографии</h2>

<form method="POST" action="/admin/models/<%= item.id %>/images" enctype="multipart/form-data" style="margin-bottom:16px;">
  <div class="form-group">
    <input type="file" name="images" accept=".jpg,.jpeg,.png,.webp" multiple>
  </div>
  <button type="submit" class="btn btn-primary btn-sm">Загрузить</button>
</form>

<div class="img-grid">
  <% images.forEach(function(img) { %>
    <div class="img-item <%= img.is_cover ? 'is-cover' : '' %>">
      <img src="/<%= img.image_path %>" alt="">
      <div class="img-actions">
        <% if (!img.is_cover) { %>
          <form method="POST" action="/admin/models/<%= item.id %>/images/<%= img.id %>/cover" style="display:inline;">
            <button type="submit" class="img-btn img-btn-cover" title="Сделать обложкой">★</button>
          </form>
        <% } %>
        <form method="POST" action="/admin/models/<%= item.id %>/images/<%= img.id %>/delete" style="display:inline;" onsubmit="return confirm('Удалить фото?')">
          <button type="submit" class="img-btn img-btn-del" title="Удалить">✕</button>
        </form>
      </div>
    </div>
  <% }); %>
</div>
<% } %>
```

- [ ] **Step 3: Add models routes to routes/admin.js**

Add after the categories routes:

```js
// --- Models ---

router.get('/models', async function (req, res) {
  try {
    const catFilter = req.query.category;
    let query = `
      SELECT m.*, c.label AS category_label,
        (SELECT image_path FROM model_images WHERE model_id = m.id AND is_cover = true LIMIT 1) AS cover_image
      FROM models m
      JOIN categories c ON c.id = m.category_id
    `;
    const params = [];
    if (catFilter) {
      query += ' WHERE m.category_id = $1';
      params.push(catFilter);
    }
    query += ' ORDER BY m.sort_order, m.id';
    const [models, categories] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    renderAdmin(res, 'models/index', {
      pageTitle: 'Модели',
      active: 'models',
      models: models.rows,
      categories: categories.rows,
      currentCategory: catFilter || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/models/new', async function (req, res) {
  const categories = await pool.query('SELECT * FROM categories ORDER BY sort_order, id');
  renderAdmin(res, 'models/form', { pageTitle: 'Новая модель', active: 'models', item: null, images: [], categories: categories.rows });
});

router.post('/models', async function (req, res) {
  const { slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order } = req.body;
  try {
    await pool.query(
      `INSERT INTO models (slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [slug, category_id, name, series || null, description || null,
       length_m || null, width_m || null, depth_m || null, specs_label || null,
       price || null, badge || null, parseInt(sort_order) || 0]
    );
    req.session.success = 'Модель добавлена';
    res.redirect('/admin/models');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/models/new');
  }
});

router.get('/models/:id/edit', async function (req, res) {
  try {
    const [model, images, categories] = await Promise.all([
      pool.query('SELECT * FROM models WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM model_images WHERE model_id = $1 ORDER BY sort_order, id', [req.params.id]),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    if (!model.rows.length) return res.redirect('/admin/models');
    renderAdmin(res, 'models/form', {
      pageTitle: 'Редактировать модель',
      active: 'models',
      item: model.rows[0],
      images: images.rows,
      categories: categories.rows
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models');
  }
});

router.post('/models/:id', async function (req, res) {
  const { slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order } = req.body;
  try {
    await pool.query(
      `UPDATE models SET slug=$1, category_id=$2, name=$3, series=$4, description=$5,
       length_m=$6, width_m=$7, depth_m=$8, specs_label=$9, price=$10, badge=$11, sort_order=$12
       WHERE id=$13`,
      [slug, category_id, name, series || null, description || null,
       length_m || null, width_m || null, depth_m || null, specs_label || null,
       price || null, badge || null, parseInt(sort_order) || 0, req.params.id]
    );
    req.session.success = 'Модель обновлена';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/delete', async function (req, res) {
  try {
    const imgs = await pool.query('SELECT image_path FROM model_images WHERE model_id = $1', [req.params.id]);
    await pool.query('DELETE FROM models WHERE id = $1', [req.params.id]);
    imgs.rows.forEach(function (img) { deleteFile(img.image_path); });
    req.session.success = 'Модель удалена';
    res.redirect('/admin/models');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/models');
  }
});

// Model images
router.post('/models/:id/images', ...processUpload('models').array('images', 10), async function (req, res) {
  try {
    for (const file of (req.files || [])) {
      await pool.query(
        'INSERT INTO model_images (model_id, image_path, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM model_images WHERE model_id=$1))',
        [req.params.id, 'uploads/models/' + file.filename]
      );
    }
    req.session.success = 'Фото загружены';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка загрузки';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/images/:imgId/cover', async function (req, res) {
  try {
    await pool.query('UPDATE model_images SET is_cover = false WHERE model_id = $1', [req.params.id]);
    await pool.query('UPDATE model_images SET is_cover = true WHERE id = $1 AND model_id = $2', [req.params.imgId, req.params.id]);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/images/:imgId/delete', async function (req, res) {
  try {
    const result = await pool.query('DELETE FROM model_images WHERE id = $1 AND model_id = $2 RETURNING image_path', [req.params.imgId, req.params.id]);
    if (result.rows.length) deleteFile(result.rows[0].image_path);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});
```

Also add at the top of the file (with other requires):
```js
const { processUpload, deleteFile } = require('../middleware/upload');
```

- [ ] **Step 4: Commit**

```bash
git add views/models/ routes/admin.js
git commit -m "feat(admin): models CRUD with image management"
```

---

## Task 9: Portfolio CRUD

**Files:**
- Create: `views/portfolio/index.ejs`
- Create: `views/portfolio/form.ejs`
- Modify: `routes/admin.js`

- [ ] **Step 1: Create views/portfolio/index.ejs**

```html
<div class="top-bar">
  <h1>Портфолио</h1>
  <a href="/admin/portfolio/new" class="btn btn-primary">+ Добавить</a>
</div>

<div style="margin-bottom:16px;">
  <a href="/admin/portfolio" class="btn btn-sm <%= !currentCategory ? 'btn-primary' : 'btn-outline' %>">Все</a>
  <% categories.forEach(function(cat) { %>
    <a href="/admin/portfolio?category=<%= cat.id %>" class="btn btn-sm <%= currentCategory == cat.id ? 'btn-primary' : 'btn-outline' %>"><%= cat.label %></a>
  <% }); %>
</div>

<table class="admin-table">
  <thead>
    <tr>
      <th>Фото</th>
      <th>Название</th>
      <th>Город</th>
      <th>Категория</th>
      <th>Год</th>
      <th>Порядок</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <% works.forEach(function(w) { %>
    <tr>
      <td><% if (w.cover_image) { %><img src="/<%= w.cover_image %>" alt="" style="height:40px; border-radius:4px;"><% } else { %><span style="color:#71717a;">—</span><% } %></td>
      <td><strong><%= w.title %></strong></td>
      <td><%= w.location || '—' %></td>
      <td><%= w.category_label %></td>
      <td><%= w.year || '—' %></td>
      <td><%= w.sort_order %></td>
      <td>
        <a href="/admin/portfolio/<%= w.id %>/edit" class="btn btn-sm btn-outline">Редактировать</a>
        <form method="POST" action="/admin/portfolio/<%= w.id %>/delete" style="display:inline;" onsubmit="return confirm('Удалить работу «<%= w.title %>»?')">
          <button type="submit" class="btn btn-sm btn-danger">Удалить</button>
        </form>
      </td>
    </tr>
    <% }); %>
  </tbody>
</table>
```

- [ ] **Step 2: Create views/portfolio/form.ejs**

```html
<h1><%= item ? 'Редактировать' : 'Новая' %> работа</h1>

<form method="POST" action="<%= item ? '/admin/portfolio/' + item.id : '/admin/portfolio' %>" style="max-width:600px;">
  <div class="form-group">
    <label for="title">Название проекта</label>
    <input type="text" id="title" name="title" required value="<%= item ? item.title : '' %>" placeholder="Вилла в Подмосковье">
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="category_id">Категория</label>
      <select id="category_id" name="category_id" required>
        <option value="">— выбрать —</option>
        <% categories.forEach(function(cat) { %>
          <option value="<%= cat.id %>" <%= item && item.category_id === cat.id ? 'selected' : '' %>><%= cat.label %></option>
        <% }); %>
      </select>
    </div>
    <div class="form-group">
      <label for="location">Регион / город</label>
      <input type="text" id="location" name="location" value="<%= item ? item.location || '' : '' %>" placeholder="Московская область">
    </div>
  </div>

  <div class="form-row">
    <div class="form-group">
      <label for="size">Размер</label>
      <input type="text" id="size" name="size" value="<%= item ? item.size || '' : '' %>" placeholder="8.0 × 4.0 м">
    </div>
    <div class="form-group">
      <label for="year">Год</label>
      <input type="number" id="year" name="year" value="<%= item ? item.year || '' : '' %>" placeholder="2024">
    </div>
  </div>

  <div class="form-group">
    <label for="sort_order">Порядок</label>
    <input type="number" id="sort_order" name="sort_order" value="<%= item ? item.sort_order : 0 %>">
  </div>

  <div class="form-actions">
    <button type="submit" class="btn btn-primary">Сохранить</button>
    <a href="/admin/portfolio" class="btn btn-outline">Отмена</a>
  </div>
</form>

<% if (item) { %>
<hr style="border-color:#27272a; margin: 32px 0;">
<h2 style="font-size:18px; margin-bottom:16px;">Фотографии</h2>

<form method="POST" action="/admin/portfolio/<%= item.id %>/images" enctype="multipart/form-data" style="margin-bottom:16px;">
  <div class="form-group">
    <input type="file" name="images" accept=".jpg,.jpeg,.png,.webp" multiple>
  </div>
  <button type="submit" class="btn btn-primary btn-sm">Загрузить</button>
</form>

<div class="img-grid">
  <% images.forEach(function(img) { %>
    <div class="img-item <%= img.is_cover ? 'is-cover' : '' %>">
      <img src="/<%= img.image_path %>" alt="">
      <div class="img-actions">
        <% if (!img.is_cover) { %>
          <form method="POST" action="/admin/portfolio/<%= item.id %>/images/<%= img.id %>/cover" style="display:inline;">
            <button type="submit" class="img-btn img-btn-cover" title="Сделать обложкой">★</button>
          </form>
        <% } %>
        <form method="POST" action="/admin/portfolio/<%= item.id %>/images/<%= img.id %>/delete" style="display:inline;" onsubmit="return confirm('Удалить фото?')">
          <button type="submit" class="img-btn img-btn-del" title="Удалить">✕</button>
        </form>
      </div>
    </div>
  <% }); %>
</div>
<% } %>
```

- [ ] **Step 3: Add portfolio routes to routes/admin.js**

Add after the models routes:

```js
// --- Portfolio ---

router.get('/portfolio', async function (req, res) {
  try {
    const catFilter = req.query.category;
    let query = `
      SELECT p.*, c.label AS category_label,
        (SELECT image_path FROM portfolio_images WHERE portfolio_id = p.id AND is_cover = true LIMIT 1) AS cover_image
      FROM portfolio p
      JOIN categories c ON c.id = p.category_id
    `;
    const params = [];
    if (catFilter) {
      query += ' WHERE p.category_id = $1';
      params.push(catFilter);
    }
    query += ' ORDER BY p.sort_order, p.id';
    const [works, categories] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    renderAdmin(res, 'portfolio/index', {
      pageTitle: 'Портфолио',
      active: 'portfolio',
      works: works.rows,
      categories: categories.rows,
      currentCategory: catFilter || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/portfolio/new', async function (req, res) {
  const categories = await pool.query('SELECT * FROM categories ORDER BY sort_order, id');
  renderAdmin(res, 'portfolio/form', { pageTitle: 'Новая работа', active: 'portfolio', item: null, images: [], categories: categories.rows });
});

router.post('/portfolio', async function (req, res) {
  const { category_id, title, location, size, year, sort_order } = req.body;
  try {
    await pool.query(
      'INSERT INTO portfolio (category_id, title, location, size, year, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
      [category_id, title, location || null, size || null, year || null, parseInt(sort_order) || 0]
    );
    req.session.success = 'Работа добавлена';
    res.redirect('/admin/portfolio');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/portfolio/new');
  }
});

router.get('/portfolio/:id/edit', async function (req, res) {
  try {
    const [work, images, categories] = await Promise.all([
      pool.query('SELECT * FROM portfolio WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM portfolio_images WHERE portfolio_id = $1 ORDER BY sort_order, id', [req.params.id]),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    if (!work.rows.length) return res.redirect('/admin/portfolio');
    renderAdmin(res, 'portfolio/form', {
      pageTitle: 'Редактировать работу',
      active: 'portfolio',
      item: work.rows[0],
      images: images.rows,
      categories: categories.rows
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio');
  }
});

router.post('/portfolio/:id', async function (req, res) {
  const { category_id, title, location, size, year, sort_order } = req.body;
  try {
    await pool.query(
      'UPDATE portfolio SET category_id=$1, title=$2, location=$3, size=$4, year=$5, sort_order=$6 WHERE id=$7',
      [category_id, title, location || null, size || null, year || null, parseInt(sort_order) || 0, req.params.id]
    );
    req.session.success = 'Работа обновлена';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/delete', async function (req, res) {
  try {
    const imgs = await pool.query('SELECT image_path FROM portfolio_images WHERE portfolio_id = $1', [req.params.id]);
    await pool.query('DELETE FROM portfolio WHERE id = $1', [req.params.id]);
    imgs.rows.forEach(function (img) { deleteFile(img.image_path); });
    req.session.success = 'Работа удалена';
    res.redirect('/admin/portfolio');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/portfolio');
  }
});

// Portfolio images
router.post('/portfolio/:id/images', ...processUpload('portfolio').array('images', 10), async function (req, res) {
  try {
    for (const file of (req.files || [])) {
      await pool.query(
        'INSERT INTO portfolio_images (portfolio_id, image_path, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM portfolio_images WHERE portfolio_id=$1))',
        [req.params.id, 'uploads/portfolio/' + file.filename]
      );
    }
    req.session.success = 'Фото загружены';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка загрузки';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/images/:imgId/cover', async function (req, res) {
  try {
    await pool.query('UPDATE portfolio_images SET is_cover = false WHERE portfolio_id = $1', [req.params.id]);
    await pool.query('UPDATE portfolio_images SET is_cover = true WHERE id = $1 AND portfolio_id = $2', [req.params.imgId, req.params.id]);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/images/:imgId/delete', async function (req, res) {
  try {
    const result = await pool.query('DELETE FROM portfolio_images WHERE id = $1 AND portfolio_id = $2 RETURNING image_path', [req.params.imgId, req.params.id]);
    if (result.rows.length) deleteFile(result.rows[0].image_path);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add views/portfolio/ routes/admin.js
git commit -m "feat(admin): portfolio CRUD with image management"
```

---

## Task 10: Public API Routes

**Files:**
- Modify: `routes/api.js`

- [ ] **Step 1: Replace routes/api.js with real queries**

```js
const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/categories
router.get('/categories', async function (req, res) {
  try {
    const result = await pool.query('SELECT key, label, image FROM categories ORDER BY sort_order, id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/models
router.get('/models', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT m.id, m.slug, m.name, c.key AS category, m.series, m.description AS desc,
             m.length_m, m.width_m, m.depth_m, m.specs_label,
             m.price, m.badge
      FROM models m
      JOIN categories c ON c.id = m.category_id
      ORDER BY m.sort_order, m.id
    `);

    const imageResult = await pool.query(`
      SELECT model_id, image_path, is_cover
      FROM model_images
      ORDER BY sort_order, id
    `);

    // Group images by model_id
    const imageMap = {};
    imageResult.rows.forEach(function (img) {
      if (!imageMap[img.model_id]) imageMap[img.model_id] = [];
      imageMap[img.model_id].push(img);
    });

    const models = result.rows.map(function (m) {
      const imgs = imageMap[m.id] || [];

      // Build specs string
      let specs;
      if (m.length_m && m.width_m && m.depth_m) {
        specs = m.length_m + ' · ' + m.width_m + ' · ' + m.depth_m + ' м';
      } else {
        specs = m.specs_label || '';
      }

      // Build gallery array
      const gallery = imgs.map(function (img) { return '/' + img.image_path; });

      return {
        id: m.slug,
        name: m.name,
        category: m.category,
        series: m.series,
        desc: m.desc,
        specs: specs,
        price: m.price,
        badge: m.badge || undefined,
        gallery: gallery
      };
    });

    res.json(models);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/portfolio
router.get('/portfolio', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.location, c.key AS category, p.size, p.year
      FROM portfolio p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.sort_order, p.id
    `);

    const imageResult = await pool.query(`
      SELECT portfolio_id, image_path, is_cover
      FROM portfolio_images
      ORDER BY sort_order, id
    `);

    const imageMap = {};
    imageResult.rows.forEach(function (img) {
      if (!imageMap[img.portfolio_id]) imageMap[img.portfolio_id] = [];
      imageMap[img.portfolio_id].push(img);
    });

    const works = result.rows.map(function (w) {
      const imgs = imageMap[w.id] || [];
      const coverImg = imgs.find(function (i) { return i.is_cover; }) || imgs[0];
      const gallery = imgs.map(function (i) { return '/' + i.image_path; });

      return {
        id: w.id,
        title: w.title,
        location: w.location,
        category: w.category,
        size: w.size,
        year: w.year,
        image: coverImg ? '/' + coverImg.image_path : null,
        gallery: gallery
      };
    });

    res.json(works);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add routes/api.js
git commit -m "feat(api): public REST endpoints for categories, models, portfolio"
```

---

## Task 11: Frontend Changes

**Files:**
- Modify: `js/data-source.js`
- Modify: `js/portfolio.js`
- Modify: `js/models.js`

- [ ] **Step 1: Update js/data-source.js**

Replace the URL constants and add `getPortfolio()`:

```js
(function () {
  const CATEGORIES_URL = '/api/categories';
  const MODELS_URL = '/api/models';
  const PORTFOLIO_URL = '/api/portfolio';

  let categoriesPromise = null;
  let modelsPromise = null;
  let portfolioPromise = null;

  function loadJson(url, label) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error('data-source: ' + label + ' load failed (' + res.status + ')');
      }
      return res.json();
    });
  }

  function getCategories() {
    if (!categoriesPromise) {
      categoriesPromise = loadJson(CATEGORIES_URL, 'categories').catch(function (err) {
        categoriesPromise = null;
        throw err;
      });
    }
    return categoriesPromise;
  }

  function getModels() {
    if (!modelsPromise) {
      modelsPromise = loadJson(MODELS_URL, 'models').catch(function (err) {
        modelsPromise = null;
        throw err;
      });
    }
    return modelsPromise;
  }

  function getPortfolio() {
    if (!portfolioPromise) {
      portfolioPromise = loadJson(PORTFOLIO_URL, 'portfolio').catch(function (err) {
        portfolioPromise = null;
        throw err;
      });
    }
    return portfolioPromise;
  }

  window.DataSource = {
    getCategories: getCategories,
    getModels: getModels,
    getPortfolio: getPortfolio
  };
})();
```

- [ ] **Step 2: Update js/models.js — remove stubGallery, use gallery from data**

Replace the `stubGallery` function and update `openModelInGallery`:

Remove this function entirely:
```js
function stubGallery(index) { ... }
```

Change `openModelInGallery` from:
```js
function openModelInGallery(model, index, cardEl) {
    GalleryModal.open({
      title: model.name,
      infoLines: [
        model.series,
        model.desc,
        model.specs + ' · ' + model.price
      ],
      gallery: stubGallery(index),
      triggerEl: cardEl
    });
  }
```

To:
```js
function openModelInGallery(model, index, cardEl) {
    GalleryModal.open({
      title: model.name,
      infoLines: [
        model.series,
        model.desc,
        model.specs + ' · ' + model.price
      ],
      gallery: model.gallery && model.gallery.length ? model.gallery : ['images/categories/composite-pool.svg'],
      triggerEl: cardEl
    });
  }
```

- [ ] **Step 3: Update js/portfolio.js — load data from DataSource**

Replace the hardcoded data and init logic. Keep the render/interaction functions, but change data source:

Remove the top-level constants: `WORK_CATEGORIES`, `CATEGORY_LABEL`, and `WORKS`.

Add at the top of the file (after the opening, before functions):
```js
let WORKS = [];
let WORK_CATEGORIES = [{ key: 'all', label: 'Все' }];
let CATEGORY_LABEL = {};
```

Update `renderHomeFeatured()` to check if WORKS is loaded:
```js
function renderHomeFeatured() {
  const container = document.querySelector('.port-featured');
  if (!container) return;
  if (WORKS.length < 3) return;

  const big = WORKS[0];
  const small1 = WORKS[1];
  const small2 = WORKS.length > 4 ? WORKS[4] : WORKS[2];

  container.innerHTML = `
    ${cardHtml(big, 'work-card--big')}
    <div class="port-featured-col">
      ${cardHtml(small1)}
      ${cardHtml(small2)}
    </div>
  `;
}
```

Replace the `DOMContentLoaded` listener:
```js
document.addEventListener('DOMContentLoaded', function () {
  Promise.all([DataSource.getCategories(), DataSource.getPortfolio()])
    .then(function (results) {
      const categories = results[0];
      WORKS = results[1];

      // Build CATEGORY_LABEL and WORK_CATEGORIES from categories data
      categories.forEach(function (cat) {
        CATEGORY_LABEL[cat.key] = cat.label;
      });
      WORK_CATEGORIES = [{ key: 'all', label: 'Все' }].concat(
        categories.filter(function (cat) {
          return WORKS.some(function (w) { return w.category === cat.key; });
        })
      );

      renderHomeFeatured();

      if (document.querySelector('.works-grid')) {
        renderPortfolioFilter();
        renderPortfolioGrid();
        attachPortfolioFilter();
        attachPortfolioGallery();
      }
    })
    .catch(function (err) {
      console.error('Portfolio data load failed:', err);
    });
});
```

- [ ] **Step 4: Commit**

```bash
git add js/data-source.js js/models.js js/portfolio.js
git commit -m "feat(frontend): switch from JSON stubs to API endpoints"
```

---

## Task 12: Deploy to Server

**Files:** All project files → server

- [ ] **Step 1: Create the database on the server**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 \
  "sudo -u postgres createdb good_pools_db 2>/dev/null; echo done"
```

- [ ] **Step 2: Copy project files to server**

From the local `good_pools` directory:

```bash
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='uploads' --exclude='.netlify' --exclude='.vercel' --exclude='.superpowers' \
  -e "sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no" \
  /Users/jasminagababyan/good_pools/ roman@95.163.236.186:/var/www/good-pools/
```

- [ ] **Step 3: Create .env on the server**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 \
  "cat > /var/www/good-pools/.env << 'ENVEOF'
DATABASE_URL=postgres://roman:Test1234@localhost:5432/good_pools_db
SESSION_SECRET=$(openssl rand -hex 32)
PORT=3050
ENVEOF"
```

- [ ] **Step 4: Move frontend files into public/ on the server**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 << 'EOF'
cd /var/www/good-pools
mkdir -p public
# Move frontend files into public/
for item in index.html models.html portfolio.html catalog.html css js images data slider-data.js; do
  [ -e "$item" ] && mv "$item" public/
done
mkdir -p uploads/categories uploads/models uploads/portfolio
EOF
```

- [ ] **Step 5: Install dependencies and run init.sql**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 << 'EOF'
cd /var/www/good-pools
npm install --production
psql good_pools_db < db/init.sql
EOF
```

- [ ] **Step 6: Create admin user**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 \
  "cd /var/www/good-pools && node create-admin.js admin admin123"
```

- [ ] **Step 7: Start with PM2**

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 \
  "cd /var/www/good-pools && pm2 delete good-pools 2>/dev/null; pm2 start server.js --name good-pools && pm2 save"
```

- [ ] **Step 8: Verify**

Test in browser:
- Site: `http://95.163.236.186:3050` — should show the pool website
- API: `http://95.163.236.186:3050/api/categories` — should return JSON
- Admin: `http://95.163.236.186:3050/admin` — should redirect to login
- Login with `admin` / `admin123` — should show dashboard

- [ ] **Step 9: Commit deploy scripts/notes (optional)**

```bash
git add -A
git commit -m "chore: finalize project for deployment"
```

---

## Verification Checklist

After deploy, verify each spec requirement:

- [ ] `GET /api/categories` returns same format as old `categories.json`
- [ ] `GET /api/models` returns same format as old `models.json` (with `gallery` field)
- [ ] `GET /api/portfolio` returns same format as old `WORKS` array
- [ ] Frontend site loads and displays categories slider, catalog, portfolio
- [ ] Admin login works with bcrypt
- [ ] Admin dashboard shows counts
- [ ] Categories: create, edit, delete, icon upload
- [ ] Models: create, edit, delete, photo upload, set cover, delete photo
- [ ] Portfolio: create, edit, delete, photo upload, set cover, delete photo
- [ ] Unauthorized access to `/admin/*` redirects to login
- [ ] File uploads resized to max 1920px
- [ ] Deleting a model/portfolio cascades image deletion from disk

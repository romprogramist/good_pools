# Карточки товаров + фид для Яндекс.Директа — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать каждому бассейну страницу-карточку на своём URL (`/pool/:slug`), сгенерировать товарный фид `/feed.xml` для Яндекс.Директа и `/sitemap.xml` + `/robots.txt` для индексации — всё из существующих данных, без миграций БД и без правок админки.

**Architecture:** Один новый роутер `routes/catalog.js` обслуживает все четыре динамических ответа (`/pool/:slug`, `/feed.xml`, `/sitemap.xml`, `/robots.txt`), монтируется в `server.js` ДО статики. Карточка рендерится шаблоном `views/pool.ejs` в стиле публичного сайта. Чистая функция `lib/price.js` парсит строковую цену в число (для schema.org и фида). Карточки на `models.html` получают краулибельную ссылку «Подробнее» на `/pool/:slug` (галерея-модалка сохраняется).

**Tech Stack:** Node/Express, EJS, PostgreSQL (`pg`), встроенный `node --test` для юнит-теста парсера цены. Тест-фреймворка в проекте нет — остальное проверяется ручными smoke-тестами через `curl`.

**Деплой (важно, проверено):** rsync в `.github/workflows/deploy.yml` возит бэкенд из `routes middleware views db lib scripts` и фронт из `css js images data` + именованные html. Поэтому НИЧЕГО нового в rsync-список добавлять не нужно: `routes/catalog.js`, `views/pool.ejs`, `lib/price.js` уедут с бэкендом; `css/pool.css`, `js/models.js` — с фронтом. `robots.txt` НЕ кладём отдельным файлом (он бы не задеплоился) — отдаём маршрутом. Папка `test/` в rsync не входит и на прод не попадёт — это правильно.

**Константа домена:** все абсолютные URL строятся от `BASE_URL`. По умолчанию — punycode (универсально валиден в XML): `https://xn--80ablclk2abatqa7b6b2c.xn--p1ai`. Можно переопределить через `process.env.SITE_URL`.

---

## File Structure

- **Create `lib/price.js`** — `parsePrice(raw)`: строка цены → целое число рублей или `null`. Единственный источник правды для числовой цены.
- **Create `test/price.test.js`** — юнит-тесты парсера через `node:test`. Не деплоится.
- **Create `routes/catalog.js`** — роутер: `GET /pool/:slug`, `GET /feed.xml`, `GET /sitemap.xml`, `GET /robots.txt`. Внутренние хелперы `getModelBySlug`, `getAllModelsForFeed`, `xmlEscape`, `absUrl`.
- **Create `views/pool.ejs`** — standalone-страница карточки в стиле сайта (свой `<head>`, шапка, контент, подключение `style.css`/`consult.css`/`main.js`/`consult.js`).
- **Create `css/pool.css`** — стили карточки.
- **Modify `server.js`** — смонтировать `catalogRoutes` после `/api` и `/admin`, но ДО статики.
- **Modify `js/models.js:18-36`** — в разметку карточки добавить ссылку «Подробнее →» на `/pool/{slug}`.

---

## Task 1: Парсер цены `lib/price.js`

**Files:**
- Create: `lib/price.js`
- Test: `test/price.test.js`

- [ ] **Step 1: Написать падающий тест**

Create `test/price.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { parsePrice } = require('../lib/price');

test('извлекает число из строки "от 1 250 000 ₽"', () => {
  assert.strictEqual(parsePrice('от 1 250 000 ₽'), 1250000);
});

test('понимает неразрывные пробелы и табуляции', () => {
  assert.strictEqual(parsePrice('от 1 250 000 ₽'), 1250000);
});

test('берёт только первое число (диапазоны)', () => {
  assert.strictEqual(parsePrice('1 100 000 – 1 300 000 ₽'), 1100000);
});

test('возвращает null для "По проекту"', () => {
  assert.strictEqual(parsePrice('По проекту'), null);
});

test('возвращает null для пустых/невалидных значений', () => {
  assert.strictEqual(parsePrice(''), null);
  assert.strictEqual(parsePrice(null), null);
  assert.strictEqual(parsePrice(undefined), null);
});

test('игнорирует слишком маленькие числа-артефакты (< 1000)', () => {
  assert.strictEqual(parsePrice('Скидка 20% — от 890 000 ₽'), 890000);
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `node --test test/price.test.js`
Expected: FAIL — `Cannot find module '../lib/price'`.

- [ ] **Step 3: Реализовать `lib/price.js`**

Create `lib/price.js`:

```js
// Парсит строковую цену с сайта в целое число рублей для фида и schema.org.
// "от 1 250 000 ₽" -> 1250000 ; "По проекту" -> null
function parsePrice(raw) {
  if (raw == null) return null;
  const str = String(raw);
  // Все группы цифр (с учётом разделителей-пробелов уже убранных), берём первую "крупную".
  const cleaned = str.replace(/[\s  ]/g, ''); // убрать обычные/неразрывные/узкие пробелы
  const matches = cleaned.match(/\d+/g);
  if (!matches) return null;
  for (const m of matches) {
    const n = parseInt(m, 10);
    if (n >= 1000) return n; // отсекаем артефакты вроде "20" из "Скидка 20%"
  }
  return null;
}

module.exports = { parsePrice };
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `node --test test/price.test.js`
Expected: PASS — все 6 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
git add lib/price.js test/price.test.js
git commit -m "feat: парсер строковой цены в число (lib/price)"
```

---

## Task 2: Страница-карточка `GET /pool/:slug`

**Files:**
- Create: `routes/catalog.js`
- Create: `views/pool.ejs`
- Create: `css/pool.css`
- Modify: `server.js:44-48` (монтирование роутов)

- [ ] **Step 1: Создать роутер с маршрутом карточки**

Create `routes/catalog.js`:

```js
const router = require('express').Router();
const pool = require('../db/pool');
const { parsePrice } = require('../lib/price');

const BASE_URL = (process.env.SITE_URL || 'https://xn--80ablclk2abatqa7b6b2c.xn--p1ai').replace(/\/$/, '');

function absUrl(p) {
  if (!p) return '';
  return BASE_URL + (p.charAt(0) === '/' ? p : '/' + p);
}

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Один бассейн по slug + его картинки. Возвращает null, если не найден.
async function getModelBySlug(slug) {
  const m = await pool.query(`
    SELECT m.id, m.slug, m.name, m.series, m.description, m.length_m, m.width_m,
           m.depth_m, m.specs_label, m.price, m.badge,
           c.key AS category, c.label AS category_label
    FROM models m JOIN categories c ON c.id = m.category_id
    WHERE m.slug = $1
  `, [slug]);
  if (!m.rows.length) return null;
  const model = m.rows[0];
  const imgs = await pool.query(
    'SELECT image_path FROM model_images WHERE model_id = $1 ORDER BY is_cover DESC, sort_order, id',
    [model.id]
  );
  model.gallery = imgs.rows.map(function (r) { return '/' + r.image_path; });
  return model;
}

// GET /pool/:slug — страница-карточка
router.get('/pool/:slug', async function (req, res) {
  try {
    const model = await getModelBySlug(req.params.slug);
    if (!model) {
      return res.status(404).render('pool', { notFound: true, model: null, jsonLd: null, baseUrl: BASE_URL });
    }
    const priceNum = parsePrice(model.price);
    const cover = model.gallery.length ? model.gallery[0] : null;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: model.name,
      description: model.description || '',
      brand: { '@type': 'Brand', name: 'Хорошие Бассейны' }
    };
    if (cover) jsonLd.image = absUrl(cover);
    if (priceNum != null) {
      jsonLd.offers = {
        '@type': 'Offer',
        price: priceNum,
        priceCurrency: 'RUB',
        availability: 'https://schema.org/InStock',
        url: absUrl('/pool/' + model.slug)
      };
    }
    res.render('pool', {
      notFound: false,
      model: model,
      priceNum: priceNum,
      cover: cover,
      jsonLd: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      baseUrl: BASE_URL
    });
  } catch (err) {
    console.error('[catalog] /pool error', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
```

- [ ] **Step 2: Создать шаблон карточки**

Create `views/pool.ejs`:

```ejs
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <% if (notFound) { %>
    <title>Бассейн не найден — Хорошие Бассейны</title>
    <meta name="robots" content="noindex">
  <% } else { %>
    <title><%= model.name %> — Хорошие Бассейны</title>
    <meta name="description" content="<%= (model.description || model.name).slice(0, 160) %>">
    <link rel="canonical" href="<%= baseUrl %>/pool/<%= model.slug %>">
  <% } %>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/consult.css">
  <link rel="stylesheet" href="/css/pool.css">
  <% if (!notFound && jsonLd) { %>
    <script type="application/ld+json"><%- jsonLd %></script>
  <% } %>
</head>
<body class="models-dark">
  <header class="header">
    <div class="header-left">
      <a class="site-logo" href="/index.html" aria-label="На главную">
        <span class="bold">ХОРОШИЕ</span><span class="thin">БАССЕЙНЫ</span>
      </a>
    </div>
    <div class="header-right">
      <a class="header-icon is-phone" href="tel:+79613201050" aria-label="Позвонить">
        <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      </a>
    </div>
  </header>

  <main class="pool-page">
  <% if (notFound) { %>
    <section class="pool-notfound">
      <h1>Бассейн не найден</h1>
      <p><a href="/models.html">← Ко всем моделям</a></p>
    </section>
  <% } else { %>
    <nav class="pool-breadcrumbs" aria-label="Хлебные крошки">
      <a href="/index.html">Главная</a> →
      <a href="/models.html">Каталог</a> →
      <a href="/models.html?category=<%= model.category %>"><%= model.category_label %></a> →
      <span><%= model.name %></span>
    </nav>

    <section class="pool-hero">
      <div class="pool-gallery">
        <% if (cover) { %>
          <img class="pool-cover" src="<%= cover %>" alt="<%= model.name %>">
          <% if (model.gallery.length > 1) { %>
            <div class="pool-thumbs">
              <% model.gallery.forEach(function (g) { %>
                <img src="<%= g %>" alt="<%= model.name %>" loading="lazy">
              <% }) %>
            </div>
          <% } %>
        <% } %>
      </div>

      <div class="pool-info">
        <% if (model.badge) { %><div class="pool-badge"><%= model.badge %></div><% } %>
        <h1 class="pool-name"><%= model.name %></h1>
        <% if (model.series) { %><div class="pool-series"><%= model.series %></div><% } %>

        <table class="pool-specs">
          <% if (model.length_m) { %><tr><td>Длина</td><td><%= model.length_m %> м</td></tr><% } %>
          <% if (model.width_m) { %><tr><td>Ширина</td><td><%= model.width_m %> м</td></tr><% } %>
          <% if (model.depth_m) { %><tr><td>Глубина</td><td><%= model.depth_m %></td></tr><% } %>
          <% if (!model.length_m && model.specs_label) { %><tr><td>Размер</td><td><%= model.specs_label %></td></tr><% } %>
        </table>

        <% if (model.price) { %><div class="pool-price"><%= model.price %></div><% } %>
        <button type="button" class="consult-trigger pool-cta" data-consult-open>Оставить заявку</button>
      </div>
    </section>

    <% if (model.description) { %>
      <section class="pool-description">
        <h2>Описание</h2>
        <p><%= model.description %></p>
      </section>
    <% } %>
  <% } %>
  </main>

  <script src="/js/main.js" defer></script>
  <script src="/js/consult.js" defer></script>
</body>
</html>
```

- [ ] **Step 3: Создать стили карточки**

Create `css/pool.css`:

```css
.pool-page { max-width: 1100px; margin: 0 auto; padding: 90px 20px 60px; }
.pool-breadcrumbs { font-size: 13px; opacity: .7; margin-bottom: 24px; }
.pool-breadcrumbs a { color: inherit; text-decoration: none; }
.pool-breadcrumbs a:hover { text-decoration: underline; }
.pool-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
.pool-cover { width: 100%; border-radius: 14px; object-fit: cover; }
.pool-thumbs { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.pool-thumbs img { width: 88px; height: 64px; object-fit: cover; border-radius: 8px; cursor: pointer; }
.pool-badge { display: inline-block; background: #2e7dd1; color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; }
.pool-name { font-size: 34px; margin: 0 0 6px; }
.pool-series { opacity: .7; margin-bottom: 20px; }
.pool-specs { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
.pool-specs td { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.12); }
.pool-specs td:last-child { text-align: right; font-weight: 600; }
.pool-price { font-size: 26px; font-weight: 700; margin-bottom: 22px; }
.pool-cta { cursor: pointer; padding: 14px 28px; border: none; border-radius: 10px; background: #2e7dd1; color: #fff; font-size: 16px; }
.pool-cta:hover { background: #2569b0; }
.pool-description { margin-top: 48px; max-width: 760px; }
.pool-description h2 { font-size: 22px; margin-bottom: 12px; }
.pool-notfound { padding: 120px 0; text-align: center; }
.pool-notfound a { color: #2e7dd1; }
@media (max-width: 800px) { .pool-hero { grid-template-columns: 1fr; gap: 24px; } .pool-name { font-size: 26px; } }
```

- [ ] **Step 4: Смонтировать роуты в `server.js`**

In `server.js`, after the `/admin` mount (line 48) and BEFORE the `/privacy.html` route, add:

```js
const catalogRoutes = require('./routes/catalog');
app.use('/', catalogRoutes);
```

Resulting block (lines 44-49 area) должен выглядеть так:

```js
// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const catalogRoutes = require('./routes/catalog');
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', catalogRoutes);
```

- [ ] **Step 5: Запустить сервер и проверить карточку**

Run (сервер уже может работать на :3050 через туннель к прод-БД; если нет — `npm start`):
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/pool/hiit
curl -s http://localhost:3050/pool/hiit | grep -o 'application/ld+json'
curl -s -o /dev/null -w "404=%{http_code}\n" http://localhost:3050/pool/nonexistent-xyz
```
Expected: `200` для `hiit`; строка `application/ld+json` присутствует; `404=404` для несуществующего slug.

- [ ] **Step 6: Глазами в браузере**

Открыть `http://localhost:3050/pool/hiit`: видны хлебные крошки, галерея, характеристики, цена, кнопка «Оставить заявку» (по клику открывается модалка consult), описание. Стиль соответствует сайту.

- [ ] **Step 7: Commit**

```bash
git add routes/catalog.js views/pool.ejs css/pool.css server.js
git commit -m "feat: страница-карточка бассейна /pool/:slug со schema.org"
```

---

## Task 3: Фид `GET /feed.xml`

**Files:**
- Modify: `routes/catalog.js` (добавить хелпер выборки + маршрут `/feed.xml`)

- [ ] **Step 1: Добавить выборку всех моделей для фида**

In `routes/catalog.js`, добавить функцию ПЕРЕД `module.exports`:

```js
// Все бассейны + обложка для фида/sitemap.
async function getAllModelsForFeed() {
  const res = await pool.query(`
    SELECT m.slug, m.name, m.series, m.description, m.price,
           c.label AS category_label,
           (SELECT image_path FROM model_images mi
            WHERE mi.model_id = m.id ORDER BY is_cover DESC, sort_order, id LIMIT 1) AS cover
    FROM models m JOIN categories c ON c.id = m.category_id
    ORDER BY m.sort_order, m.id
  `);
  return res.rows;
}
```

- [ ] **Step 2: Добавить маршрут фида**

In `routes/catalog.js`, добавить ПЕРЕД `module.exports`:

```js
// GET /feed.xml — товарный фид (Google Shopping XML) для Яндекс.Директа
router.get('/feed.xml', async function (req, res) {
  try {
    const rows = await getAllModelsForFeed();
    const items = rows.map(function (m) {
      const price = parsePrice(m.price);
      if (price == null) return ''; // без цены товар в фид не идёт
      const title = m.series ? (m.name + ' ' + m.series) : m.name;
      const link = absUrl('/pool/' + m.slug);
      const image = m.cover ? absUrl('/' + m.cover) : '';
      return [
        '    <item>',
        '      <g:id>' + xmlEscape(m.slug) + '</g:id>',
        '      <g:title>' + xmlEscape(title) + '</g:title>',
        '      <g:link>' + xmlEscape(link) + '</g:link>',
        image ? '      <g:image_link>' + xmlEscape(image) + '</g:image_link>' : '',
        '      <g:description>' + xmlEscape(m.description || title) + '</g:description>',
        '      <g:price>' + price + ' RUB</g:price>',
        '      <g:availability>in stock</g:availability>',
        '      <g:brand>Хорошие Бассейны</g:brand>',
        '      <g:product_type>' + xmlEscape(m.category_label) + '</g:product_type>',
        '    </item>'
      ].filter(Boolean).join('\n');
    }).filter(Boolean).join('\n');

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n' +
      '  <channel>\n' +
      '    <title>Хорошие Бассейны</title>\n' +
      '    <link>' + xmlEscape(BASE_URL) + '</link>\n' +
      '    <description>Каталог бассейнов</description>\n' +
      items + '\n' +
      '  </channel>\n' +
      '</rss>\n';

    res.set('Content-Type', 'application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('[catalog] /feed.xml error', err);
    res.status(500).send('Server error');
  }
});
```

- [ ] **Step 3: Проверить фид**

Run:
```bash
curl -s http://localhost:3050/feed.xml | head -40
curl -s http://localhost:3050/feed.xml | grep -c '<item>'
curl -s http://localhost:3050/feed.xml | grep -o '<g:price>[^<]*</g:price>' | head -5
```
Expected: валидный XML с `xmlns:g`; число `<item>` равно количеству бассейнов С распознанной ценой (бетонные «По проекту» отсутствуют); цены вида `1250000 RUB`.

- [ ] **Step 4: Проверить well-formedness XML**

Run:
```bash
node -e "const x=require('child_process').execSync('curl -s http://localhost:3050/feed.xml').toString(); const m=x.match(/<item>/g); console.log('items:', m?m.length:0); if(!x.startsWith('<?xml')) throw new Error('not xml'); console.log('ok')"
```
Expected: `items: N` и `ok` без исключений.

- [ ] **Step 5: Commit**

```bash
git add routes/catalog.js
git commit -m "feat: товарный фид /feed.xml (Google Shopping XML)"
```

---

## Task 4: Sitemap `GET /sitemap.xml` и `GET /robots.txt`

**Files:**
- Modify: `routes/catalog.js` (два маршрута)

- [ ] **Step 1: Добавить маршрут sitemap**

In `routes/catalog.js`, добавить ПЕРЕД `module.exports`:

```js
// GET /sitemap.xml — статические страницы + все карточки
router.get('/sitemap.xml', async function (req, res) {
  try {
    const rows = await getAllModelsForFeed();
    const staticPages = ['/', '/models.html', '/portfolio.html', '/catalog.html'];
    const urls = staticPages.map(function (p) { return absUrl(p); })
      .concat(rows.map(function (m) { return absUrl('/pool/' + m.slug); }));
    const body = urls.map(function (u) {
      return '  <url><loc>' + xmlEscape(u) + '</loc></url>';
    }).join('\n');
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      body + '\n' +
      '</urlset>\n';
    res.set('Content-Type', 'application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('[catalog] /sitemap.xml error', err);
    res.status(500).send('Server error');
  }
});

// GET /robots.txt — отдаём маршрутом (отдельный файл не задеплоился бы через rsync)
router.get('/robots.txt', function (req, res) {
  const txt = 'User-agent: *\nAllow: /\nSitemap: ' + BASE_URL + '/sitemap.xml\n';
  res.set('Content-Type', 'text/plain; charset=utf-8').send(txt);
});
```

- [ ] **Step 2: Проверить sitemap и robots**

Run:
```bash
curl -s http://localhost:3050/sitemap.xml | head -20
curl -s http://localhost:3050/sitemap.xml | grep -c '<loc>'
curl -s http://localhost:3050/robots.txt
```
Expected: валидный `<urlset>` с `<loc>` для статики + каждой карточки (число `<loc>` = 4 + кол-во бассейнов); `robots.txt` содержит строку `Sitemap: https://.../sitemap.xml`.

- [ ] **Step 3: Commit**

```bash
git add routes/catalog.js
git commit -m "feat: /sitemap.xml и /robots.txt"
```

---

## Task 5: Ссылка «Подробнее» на карточках `models.html`

**Files:**
- Modify: `js/models.js:18-36` (функция `renderGrid`)

**Контекст:** клик по карточке сейчас открывает галерею-модалку (`attachModelGallery`). Эту логику НЕ трогаем. Добавляем отдельную краулибельную ссылку `<a>` внутрь `.mcard-info`, чтобы у карточек были реальные ссылки на `/pool/:slug` (для поисковых роботов и перехода). Клик по ссылке не должен открывать модалку — добавим класс, по которому обработчик клика её игнорирует.

- [ ] **Step 1: Добавить ссылку в разметку карточки**

In `js/models.js`, заменить функцию `renderGrid` (строки 18-36) на:

```js
  function renderGrid(container, models, categoryImage) {
    container.innerHTML = models.map(function (m) {
      return (
        '<article class="mcard" data-id="' + m.id + '" data-category="' + m.category + '" tabindex="0" role="button" aria-label="Открыть галерею: ' + m.name + '" data-reveal data-reveal-y="sm">' +
          '<div class="mcard-img">' +
            '<img src="' + (m.gallery && m.gallery.length ? m.gallery[0] : categoryImage[m.category]) + '" alt="' + m.name + '" loading="lazy">' +
            (m.badge ? '<div class="mcard-badge">' + m.badge + '</div>' : '') +
            '<div class="mcard-size">' + m.specs + '</div>' +
          '</div>' +
          '<div class="mcard-info">' +
            '<div class="mcard-name">' + m.name + '</div>' +
            '<div class="mcard-series">' + m.series + '</div>' +
            '<div class="mcard-desc">' + m.desc + '</div>' +
            '<div class="mcard-price">' + m.price + '</div>' +
            '<a class="mcard-more" href="/pool/' + m.id + '">Подробнее →</a>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }
```

- [ ] **Step 2: Не открывать галерею при клике по ссылке**

In `js/models.js`, в функции `attachModelGallery` (строки 60-63), заменить обработчик `click` на:

```js
    gridEl.addEventListener('click', function (e) {
      if (e.target.closest('.mcard-more')) return; // клик по ссылке "Подробнее" — это переход, не галерея
      const card = e.target.closest('.mcard');
      if (card) tryOpen(card);
    });
```

- [ ] **Step 3: Добавить стиль ссылки**

In `css/style.css`, добавить в конец файла:

```css
.mcard-more { display: inline-block; margin-top: 10px; color: #2e7dd1; text-decoration: none; font-size: 14px; }
.mcard-more:hover { text-decoration: underline; }
```

- [ ] **Step 4: Проверить хард-линк `models.html` НЕ затронут**

Правок в `models.html` нет, поэтому хард-линк-ловушка не активируется. Изменён только `js/models.js` (через junction `public/js` → правка видна сразу). Проверка:
```bash
curl -s http://localhost:3050/js/models.js | grep -c 'mcard-more'
```
Expected: `2` (в разметке карточки и в обработчике клика).

- [ ] **Step 5: Глазами в браузере**

Открыть `http://localhost:3050/models.html`: на каждой карточке есть ссылка «Подробнее →». Клик по ней ведёт на `/pool/{slug}`. Клик по самой карточке (не по ссылке) по-прежнему открывает галерею.

- [ ] **Step 6: Commit**

```bash
git add js/models.js css/style.css
git commit -m "feat: ссылка 'Подробнее' с карточек каталога на /pool/:slug"
```

---

## Финальная проверка (вся фича целиком)

- [ ] `/pool/hiit`, `/pool/zen` и др. — данные, фото, цена, крошки, рабочая кнопка заявки.
- [ ] Заявка с карточки реально падает в лиды/почту/телеграм (поле `page` = URL карточки).
- [ ] `/feed.xml` — открыть и прогнать через валидатор фидов Яндекс.Директа.
- [ ] schema.org на карточке — прогнать через валидатор разметки Яндекса.
- [ ] `/sitemap.xml` — все карточки на месте; `/robots.txt` отдаётся.
- [ ] `node --test test/price.test.js` — зелёный.
- [ ] (Деплой) после `git push origin main` проверить те же URL на проде; убедиться, что новые файлы доехали (они в деплоящихся папках).

## Заметки по реализации

- **Цена для фида** вытаскивается из строки `price` парсером `lib/price.js`; ничего вручную вводить не нужно. Бетонные «По проекту» (нет числа) автоматически исключаются из фида, но карточка у них есть.
- **Деплой** правок `deploy.yml` НЕ требует — все файлы в уже-деплоящихся папках; `robots.txt` отдаётся маршрутом.
- **Хард-линк-ловушка** (`index/catalog/models/portfolio.html`, `slider-data.js`) не активируется: эти 5 файлов в плане не редактируются.
- **БД и админка** не меняются.

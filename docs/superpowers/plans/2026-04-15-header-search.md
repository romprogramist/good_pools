# Header Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the header search button open a live dropdown that finds categories and pool models and navigates to `models.html` with the right filter or deep link. All data flows through a single `DataSource` module reading JSON files, so a future PostgreSQL + admin panel plugs in by changing one URL per resource.

**Architecture:** Move hardcoded `CATEGORIES`/`MODELS` from `js/models.js` into `data/*.json`. Introduce `js/data-source.js` as the single read path (`fetch` + in-memory cache). Refactor `js/models.js` to consume it. Add `js/search.js` that self-mounts on the existing header button, lazily loads data on first open, renders a dropdown with live substring filtering, and navigates via `?category=` / `?model=` URL params which `models.js` handles on load.

**Tech Stack:** Vanilla JS (no bundler, no modules), plain `<script>` tags, `fetch` API, CSS in `css/style.css`. No test framework — verification is manual in the already-running local server at `http://localhost:8000/`.

**Spec:** `docs/superpowers/specs/2026-04-15-header-search-design.md`

**Testing model note:** The project has no test runner. For each task, "verification" means opening the affected page in the running local server (`http://localhost:8000/`), performing the specified interaction, and confirming the expected observation in the browser (and DevTools console). Read this as the manual equivalent of "run the failing test → implement → run the passing test".

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `data/categories.json` | create | Array of category records `{key, label, image}` |
| `data/models.json` | create | Array of model records `{id, name, category, series, desc, specs, price, badge?}` |
| `js/data-source.js` | create | Global `DataSource` with `getCategories()` and `getModels()`, fetch-and-cache, the only module that knows where data lives |
| `js/search.js` | create | Mounts a search dropdown on the header button, lazy-loads data via `DataSource`, renders live-filtered results, navigates on selection |
| `js/models.js` | modify | Remove hardcoded data, consume `DataSource`, add `data-id` to cards, handle `?category` / `?model` URL params |
| `css/style.css` | modify | Append styles for `.search-panel` (and its children) and `.mcard.highlight` |
| `index.html` | modify | Add `<script src="js/data-source.js">` and `<script src="js/search.js">` |
| `models.html` | modify | Add `<script src="js/data-source.js">` and `<script src="js/search.js">` |
| `portfolio.html` | modify | Add `<script src="js/data-source.js">` and `<script src="js/search.js">` |

`catalog.html`, `js/main.js`, `js/portfolio.js` are untouched.

---

## Task 1: Extract category and model data into JSON files

**Files:**
- Create: `data/categories.json`
- Create: `data/models.json`

- [ ] **Step 1: Create `data/categories.json`**

Write this exact content:

```json
[
  { "key": "composite",  "label": "Композитные",  "image": "images/categories/composite-pool.svg" },
  { "key": "custom",     "label": "Кастом",       "image": "images/categories/custom-pool.svg" },
  { "key": "jacuzzi",    "label": "Джакузи-спа",  "image": "images/categories/jacuzzi-spa.svg" },
  { "key": "inflatable", "label": "Надувные спа", "image": "images/categories/inflatable-spa.svg" },
  { "key": "furako",     "label": "Фурако",       "image": "images/categories/furako.svg" },
  { "key": "furniture",  "label": "Мебель",       "image": "images/categories/furniture.svg" }
]
```

Note: the old `CATEGORIES` constant had an extra "all" pseudo-category first. It is a UI concern, not data — `js/models.js` will synthesize it in Task 3. Do not include it here.

- [ ] **Step 2: Create `data/models.json`**

Write the 18 models extracted verbatim from `js/models.js` lines 20-50, one per line for readability:

```json
[
  { "id": "hiit",  "name": "HIIT",  "category": "composite", "series": "Спортивная серия",   "desc": "Увеличенная длина для активного плавания, обтекаемая форма, усиленное дно.", "specs": "8.0 · 3.6 · 1.6 м", "price": "от 1 250 000 ₽", "badge": "Хит продаж" },
  { "id": "zen",   "name": "ZEN",   "category": "composite", "series": "Классическая серия", "desc": "Прямоугольная форма для ценителей чистых линий, компактная.",                 "specs": "6.2 · 3.2 · 1.5 м", "price": "от 890 000 ₽" },
  { "id": "tetta", "name": "TETTA", "category": "composite", "series": "Семейная серия",     "desc": "Эргономичная форма со встроенными ступенями и зоной отдыха.",                 "specs": "7.0 · 3.4 · 1.5 м", "price": "от 1 100 000 ₽" },

  { "id": "custom-classic",  "name": "CUSTOM CLASSIC",  "category": "custom", "series": "Индивидуальный проект", "desc": "Прямые линии, ваши размеры. Делаем по чертежам участка.",                "specs": "Любой размер", "price": "По проекту" },
  { "id": "custom-infinity", "name": "CUSTOM INFINITY", "category": "custom", "series": "Инфинити-проект",       "desc": "Бассейн с переливом через край — эффект бесконечной воды.",              "specs": "Любой размер", "price": "По проекту", "badge": "Премиум" },
  { "id": "custom-lagoon",   "name": "CUSTOM LAGOON",   "category": "custom", "series": "Свободная форма",       "desc": "Органичные контуры в стиле природной лагуны, пляжный вход.",             "specs": "Любой размер", "price": "По проекту" },

  { "id": "spa-duo",     "name": "SPA DUO",     "category": "jacuzzi", "series": "2 места",  "desc": "Компактное спа для двоих, 20 гидромассажных форсунок, LED-подсветка.", "specs": "Ø 1.9 м · 85 см", "price": "от 420 000 ₽" },
  { "id": "spa-family",  "name": "SPA FAMILY",  "category": "jacuzzi", "series": "6 мест",   "desc": "Семейное спа с зоной отдыха, 40 форсунок, встроенная акустика.",        "specs": "2.2 × 2.2 × 0.9 м", "price": "от 780 000 ₽", "badge": "Хит продаж" },
  { "id": "spa-premium", "name": "SPA PREMIUM", "category": "jacuzzi", "series": "8 мест",   "desc": "Топ-модель: 60 форсунок, хромотерапия, аромадиффузор, подогрев.",       "specs": "2.4 × 2.4 × 0.95 м", "price": "от 1 150 000 ₽" },

  { "id": "inflate-round",  "name": "INFLATE ROUND",  "category": "inflatable", "series": "4 места",  "desc": "Круглое надувное спа с подогревом 40°C и массажными форсунками.",    "specs": "Ø 1.8 м · 65 см", "price": "от 89 000 ₽" },
  { "id": "inflate-square", "name": "INFLATE SQUARE", "category": "inflatable", "series": "6 мест",   "desc": "Квадратная форма, большая вместимость, быстрый монтаж за 15 минут.", "specs": "2.0 × 2.0 × 0.7 м", "price": "от 129 000 ₽" },
  { "id": "inflate-jet",    "name": "INFLATE JET",    "category": "inflatable", "series": "4 места",  "desc": "Усиленный массаж 140 форсунок, хромотерапия, пульт ДУ.",             "specs": "Ø 1.9 м · 70 см", "price": "от 165 000 ₽", "badge": "Новинка" },

  { "id": "furako-classic", "name": "FURAKO CLASSIC", "category": "furako", "series": "Кедр сибирский", "desc": "Классическая круглая купель из кедра, дровяная печь внутри.",         "specs": "Ø 1.8 м · 1.0 м", "price": "от 245 000 ₽" },
  { "id": "furako-oval",    "name": "FURAKO OVAL",    "category": "furako", "series": "Дуб",            "desc": "Овальная форма для двоих лёжа, печь снаружи, удобный вход.",           "specs": "2.0 × 1.5 × 1.0 м", "price": "от 310 000 ₽" },
  { "id": "furako-xl",      "name": "FURAKO XL",      "category": "furako", "series": "Кедр премиум",   "desc": "Большая купель до 8 человек, встроенные лавки, лестница из нержавейки.", "specs": "Ø 2.2 м · 1.2 м", "price": "от 420 000 ₽", "badge": "Хит продаж" },

  { "id": "lounge-chair", "name": "LOUNGE CHAIR", "category": "furniture", "series": "Шезлонг",          "desc": "Влагостойкий алюминий + ткань Textilene, регулировка спинки.",   "specs": "195 × 70 × 40 см", "price": "от 28 000 ₽" },
  { "id": "lounge-sofa",  "name": "LOUNGE SOFA",  "category": "furniture", "series": "Диван для террасы", "desc": "Модульный диван из ротанга, водоотталкивающие подушки.",        "specs": "220 × 85 × 75 см", "price": "от 95 000 ₽" },
  { "id": "lounge-bar",   "name": "LOUNGE BAR",   "category": "furniture", "series": "Барная зона",      "desc": "Барная стойка + 2 стула, тик + нержавейка, для зоны у бассейна.", "specs": "140 × 55 × 110 см", "price": "от 142 000 ₽" }
]
```

- [ ] **Step 3: Verify JSON is served and valid**

Run:

```bash
curl -sf http://localhost:8000/data/categories.json | head -c 100
echo
curl -sf http://localhost:8000/data/models.json | python3 -c 'import sys, json; d = json.load(sys.stdin); print(f"models: {len(d)}"); print(f"first id: {d[0][\"id\"]}")'
```

Expected output:

```
[
  { "key": "composite",  "label": "Композитные",  "image"
models: 18
first id: hiit
```

If `curl` returns nothing or Python errors, fix the JSON before proceeding.

- [ ] **Step 4: Commit**

```bash
git add data/categories.json data/models.json
git commit -m "Extract catalog data into data/*.json"
```

---

## Task 2: Create the `DataSource` module

**Files:**
- Create: `js/data-source.js`
- Modify: `index.html` (add one `<script>` tag)

- [ ] **Step 1: Create `js/data-source.js`**

Write this exact content:

```javascript
// The single source of truth for catalog data.
// When the PostgreSQL backend ships, replace the URL constants with
// the real API endpoints — no UI module changes are needed.

(function () {
  const CATEGORIES_URL = 'data/categories.json';
  const MODELS_URL = 'data/models.json';

  let categoriesPromise = null;
  let modelsPromise = null;

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

  window.DataSource = {
    getCategories: getCategories,
    getModels: getModels
  };
})();
```

Notes for the implementer:
- IIFE avoids leaking helpers into the global namespace; only `window.DataSource` is exposed.
- On failure, the cached promise is cleared so the next call retries. This is the behaviour the spec requires for search re-opening after a transient network error.
- Subsequent successful calls return the same promise — the fetch runs at most once per page load.

- [ ] **Step 2: Include the script on `index.html`**

In `index.html`, find the existing script block at the bottom:

```html
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

Replace it with:

```html
  <script src="js/data-source.js"></script>
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

(The other two pages will be updated in Task 5 when `search.js` is added.)

- [ ] **Step 3: Verify `DataSource` works in the browser**

Open `http://localhost:8000/index.html` in the browser, open DevTools console, and run:

```javascript
DataSource.getModels().then(m => console.log('models:', m.length, m[0].name));
DataSource.getCategories().then(c => console.log('cats:', c.length, c[0].label));
```

Expected console output:

```
models: 18 HIIT
cats: 6 Композитные
```

If you see `Uncaught ReferenceError: DataSource is not defined`, the script tag is in the wrong place or typo'd. If you see a fetch error, the JSON files aren't being served — re-run Task 1 Step 3's `curl` check.

- [ ] **Step 4: Commit**

```bash
git add js/data-source.js index.html
git commit -m "Add DataSource module for single-source catalog reads"
```

---

## Task 3: Refactor `js/models.js` to consume `DataSource`

**Files:**
- Modify: `js/models.js` (replace entirely)
- Modify: `models.html` (add `<script>` tag for `data-source.js`)

This task only changes how data is loaded. URL-param handling comes in Task 4. Visual behaviour of `models.html` must be unchanged after this task.

- [ ] **Step 1: Include `data-source.js` on `models.html`**

In `models.html`, find the existing script block at the bottom:

```html
  <script src="js/main.js"></script>
  <script src="js/models.js"></script>
```

Replace with:

```html
  <script src="js/data-source.js"></script>
  <script src="js/main.js"></script>
  <script src="js/models.js"></script>
```

- [ ] **Step 2: Replace `js/models.js` entirely**

Overwrite the file with this content:

```javascript
// models.html catalog view. Data comes from DataSource; this module
// only renders and handles interactions.

(function () {
  function buildCategoryImageMap(categories) {
    const map = {};
    categories.forEach(function (c) { map[c.key] = c.image; });
    return map;
  }

  function renderFilter(container, categories) {
    const chips = [{ key: 'all', label: 'Все' }].concat(categories);
    container.innerHTML = chips.map(function (cat, i) {
      return '<button class="mchip' + (i === 0 ? ' active' : '') + '" data-category="' + cat.key + '">' + cat.label + '</button>';
    }).join('');
  }

  function renderGrid(container, models, categoryImage) {
    container.innerHTML = models.map(function (m) {
      return (
        '<article class="mcard" data-id="' + m.id + '" data-category="' + m.category + '">' +
          '<div class="mcard-img">' +
            '<img src="' + categoryImage[m.category] + '" alt="' + m.name + '">' +
            (m.badge ? '<div class="mcard-badge">' + m.badge + '</div>' : '') +
            '<div class="mcard-size">' + m.specs + '</div>' +
          '</div>' +
          '<div class="mcard-info">' +
            '<div class="mcard-name">' + m.name + '</div>' +
            '<div class="mcard-series">' + m.series + '</div>' +
            '<div class="mcard-desc">' + m.desc + '</div>' +
            '<div class="mcard-price">' + m.price + '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function applyCategoryFilter(gridEl, filterEl, key) {
    filterEl.querySelectorAll('.mchip').forEach(function (c) {
      c.classList.toggle('active', c.dataset.category === key);
    });
    gridEl.querySelectorAll('.mcard').forEach(function (card) {
      const match = key === 'all' || card.dataset.category === key;
      card.classList.toggle('hidden', !match);
    });
  }

  function attachFilter(filterEl, gridEl) {
    filterEl.addEventListener('click', function (e) {
      const chip = e.target.closest('.mchip');
      if (!chip) return;
      applyCategoryFilter(gridEl, filterEl, chip.dataset.category);
    });
  }

  function renderError(gridEl) {
    gridEl.innerHTML = '<div class="models-error">Не удалось загрузить каталог</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    const filterEl = document.querySelector('.models-filter');
    const gridEl = document.querySelector('.models-grid');
    if (!filterEl || !gridEl) return;

    Promise.all([DataSource.getCategories(), DataSource.getModels()])
      .then(function (results) {
        const categories = results[0];
        const models = results[1];
        const categoryImage = buildCategoryImageMap(categories);

        renderFilter(filterEl, categories);
        renderGrid(gridEl, models, categoryImage);
        attachFilter(filterEl, gridEl);
      })
      .catch(function (err) {
        console.error(err);
        renderError(gridEl);
      });
  });
})();
```

Notes:
- `applyCategoryFilter` is now a reusable function, which Task 4 will call from URL-param handling.
- `renderFilter` prepends the synthetic `{ key: 'all', label: 'Все' }` chip so the JSON file stays pure data.
- Each card now has `data-id="..."` in addition to `data-category="..."`.
- The IIFE keeps helpers module-private.

- [ ] **Step 3: Verify `models.html` still works visually**

Hard-reload `http://localhost:8000/models.html`. Expected observations:

1. The header, title "ВСЕ МОДЕЛИ", subtitle "18 моделей · 6 категорий" all render.
2. The filter chip row shows 7 chips: `Все`, `Композитные`, `Кастом`, `Джакузи-спа`, `Надувные спа`, `Фурако`, `Мебель`. `Все` is active.
3. The grid shows 18 cards.
4. Clicking `Джакузи-спа` leaves only 3 cards visible; clicking `Все` restores all 18.
5. DevTools console is empty (no errors).
6. In DevTools → Elements, pick any card and confirm it has both `data-id` and `data-category` attributes.

If the grid is empty or shows "Не удалось загрузить каталог":
- Check `DataSource.getModels()` in the console as in Task 2 Step 3.
- Check the Network tab for a failing request to `data/models.json`.

- [ ] **Step 4: Commit**

```bash
git add js/models.js models.html
git commit -m "Refactor models.js to use DataSource, add data-id to cards"
```

---

## Task 4: Add URL-param handling to `models.js` and highlight style

**Files:**
- Modify: `js/models.js` (extend the `DOMContentLoaded` handler)
- Modify: `css/style.css` (append highlight styles)

- [ ] **Step 1: Append highlight styles to `css/style.css`**

At the very end of `css/style.css`, append:

```css
/* ===== Deep-link highlight for model cards ===== */
.mcard.highlight {
  animation: mcard-pulse 2s ease-out;
}
@keyframes mcard-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7), 0 20px 60px rgba(3, 105, 161, 0.12);
    outline: 2px solid rgba(14, 165, 233, 0.9);
    outline-offset: 4px;
  }
  100% {
    box-shadow: 0 0 0 20px rgba(14, 165, 233, 0), 0 4px 24px rgba(3, 105, 161, 0.06);
    outline: 2px solid rgba(14, 165, 233, 0);
    outline-offset: 4px;
  }
}
```

- [ ] **Step 2: Add URL-param handling in `js/models.js`**

In `js/models.js`, find the existing `DOMContentLoaded` handler (the one added in Task 3):

```javascript
  document.addEventListener('DOMContentLoaded', function () {
    const filterEl = document.querySelector('.models-filter');
    const gridEl = document.querySelector('.models-grid');
    if (!filterEl || !gridEl) return;

    Promise.all([DataSource.getCategories(), DataSource.getModels()])
      .then(function (results) {
        const categories = results[0];
        const models = results[1];
        const categoryImage = buildCategoryImageMap(categories);

        renderFilter(filterEl, categories);
        renderGrid(gridEl, models, categoryImage);
        attachFilter(filterEl, gridEl);
      })
      .catch(function (err) {
        console.error(err);
        renderError(gridEl);
      });
  });
```

Replace the body of the `.then` with:

```javascript
      .then(function (results) {
        const categories = results[0];
        const models = results[1];
        const categoryImage = buildCategoryImageMap(categories);

        renderFilter(filterEl, categories);
        renderGrid(gridEl, models, categoryImage);
        attachFilter(filterEl, gridEl);

        applyDeepLink(filterEl, gridEl, categories, models);
      })
```

Then, above `document.addEventListener('DOMContentLoaded', ...)`, add the `applyDeepLink` helper:

```javascript
  function applyDeepLink(filterEl, gridEl, categories, models) {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const modelParam = params.get('model');

    if (categoryParam) {
      const known = categories.some(function (c) { return c.key === categoryParam; });
      if (known) {
        applyCategoryFilter(gridEl, filterEl, categoryParam);
      }
    }

    if (modelParam) {
      const target = gridEl.querySelector('.mcard[data-id="' + modelParam + '"]');
      if (target && !target.classList.contains('hidden')) {
        // Defer so smooth scroll starts after layout settles.
        setTimeout(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('highlight');
          setTimeout(function () { target.classList.remove('highlight'); }, 2000);
        }, 50);
      }
    }
  }
```

Notes:
- Unknown `category` values are silently ignored (spec requirement).
- If a `model` ID exists but is hidden by the category filter, filter takes precedence — the `!target.classList.contains('hidden')` guard enforces this.
- The `setTimeout(..., 50)` gives the browser a tick to commit the layout before smooth-scrolling.

- [ ] **Step 3: Verify deep-links work**

Manual checks in the browser:

1. Navigate to `http://localhost:8000/models.html?category=jacuzzi`. Expected: `Джакузи-спа` chip is active, only 3 jacuzzi cards visible.
2. Navigate to `http://localhost:8000/models.html?model=hiit`. Expected: `Все` chip active (default), page scrolls smoothly to the HIIT card, card pulses with blue outline for ~2 seconds.
3. Navigate to `http://localhost:8000/models.html?category=composite&model=hiit`. Expected: `Композитные` chip active, only 3 composite cards shown, HIIT card scrolls into view and pulses.
4. Navigate to `http://localhost:8000/models.html?category=jacuzzi&model=hiit`. Expected: `Джакузи-спа` active, 3 jacuzzi cards visible, **no** scroll, **no** pulse (HIIT is hidden — filter wins).
5. Navigate to `http://localhost:8000/models.html?category=nonsense`. Expected: page renders in default state (`Все` active, 18 cards). No console errors.
6. Navigate to `http://localhost:8000/models.html?model=nonsense`. Expected: default state, no errors.
7. Navigate to `http://localhost:8000/models.html` (no params). Expected: default state, unchanged from Task 3.

- [ ] **Step 4: Commit**

```bash
git add js/models.js css/style.css
git commit -m "Handle ?category and ?model URL params on models.html"
```

---

## Task 5: Create `search.js` skeleton — open, close, focus

**Files:**
- Create: `js/search.js`
- Modify: `css/style.css` (append search panel styles)
- Modify: `index.html` (add `<script src="js/search.js">`)
- Modify: `models.html` (add `<script src="js/search.js">`)
- Modify: `portfolio.html` (add `<script src="js/data-source.js">` and `<script src="js/search.js">`)

This task wires up open/close behaviour with an empty panel. Data loading and filtering come in later tasks.

- [ ] **Step 1: Append search panel styles to `css/style.css`**

At the very end of `css/style.css`, append:

```css
/* ===== Header search panel ===== */
.search-panel {
  position: fixed;
  top: 72px;
  right: 24px;
  width: min(480px, calc(100vw - 48px));
  max-height: calc(100vh - 100px);
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(3, 105, 161, 0.18), 0 4px 16px rgba(3, 105, 161, 0.08);
  z-index: 1000;
  display: none;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
}
.search-panel.open {
  display: flex;
}
.search-panel-input-wrap {
  padding: 20px 20px 12px;
  border-bottom: 1px solid #e0f2fe;
}
.search-panel-input {
  width: 100%;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  color: #0c4a6e;
  background: #f0f9ff;
  padding: 14px 16px;
  border-radius: 12px;
}
.search-panel-input::placeholder {
  color: #94a3b8;
  font-weight: 400;
}
.search-panel-results {
  padding: 16px 20px 20px;
  overflow-y: auto;
  flex: 1;
}
.search-panel-group-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #94a3b8;
  margin: 8px 0 10px;
}
.search-panel-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}
.search-panel-chip {
  background: #e0f2fe;
  color: #0c4a6e;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.search-panel-chip:hover {
  background: #bae6fd;
}
.search-panel-model {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 12px;
  border-radius: 10px;
  font-family: inherit;
  transition: background 0.2s;
}
.search-panel-model:hover {
  background: #f0f9ff;
}
.search-panel-model-name {
  font-size: 14px;
  font-weight: 700;
  color: #0c4a6e;
  letter-spacing: 0.5px;
}
.search-panel-model-meta {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}
.search-panel-empty,
.search-panel-error {
  padding: 24px 8px;
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
}
.search-panel-error {
  color: #dc2626;
}
```

- [ ] **Step 2: Create `js/search.js`**

Write this exact content. Filtering and data loading are stubbed to minimal placeholders; the next tasks flesh them out.

```javascript
// Header search dropdown. Self-mounts on pages that include the shared
// header search button. Data loading, filtering, and navigation are
// layered on top in subsequent tasks.

(function () {
  let panel = null;
  let button = null;
  let inputEl = null;
  let resultsEl = null;
  let isOpen = false;

  function buildPanel() {
    const el = document.createElement('div');
    el.className = 'search-panel';
    el.innerHTML =
      '<div class="search-panel-input-wrap">' +
        '<input type="search" class="search-panel-input" placeholder="Поиск по каталогу" aria-label="Поиск по каталогу">' +
      '</div>' +
      '<div class="search-panel-results"></div>';
    document.body.appendChild(el);
    return el;
  }

  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();
  }

  function close() {
    if (!isOpen) return;
    panel.classList.remove('open');
    isOpen = false;
    inputEl.value = '';
    button.focus();
  }

  function toggle() {
    if (isOpen) close(); else open();
  }

  function onDocumentClick(e) {
    if (!isOpen) return;
    if (panel.contains(e.target)) return;
    if (button.contains(e.target)) return;
    // Outside click: close without clearing input (spec: preserve state),
    // but still return focus to the search button (spec: focus returns on both Esc and outside-click).
    panel.classList.remove('open');
    isOpen = false;
    button.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    button = document.querySelector('.header button[aria-label="Поиск"]');
    if (!button) return;

    panel = buildPanel();
    inputEl = panel.querySelector('.search-panel-input');
    resultsEl = panel.querySelector('.search-panel-results');

    button.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
  });
})();
```

Notes:
- `close()` clears the input (for the Escape/button path). `onDocumentClick` intentionally does not clear it (spec: outside-click preserves state). This asymmetry is deliberate — don't unify it.
- The panel is appended to `document.body`, not into the header, so its `position: fixed` is not affected by any header transforms.

- [ ] **Step 3: Add script tags to the three pages**

On `index.html`, change the bottom script block from (current state after Task 2):

```html
  <script src="js/data-source.js"></script>
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

to:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

On `models.html`, change (current state after Task 3):

```html
  <script src="js/data-source.js"></script>
  <script src="js/main.js"></script>
  <script src="js/models.js"></script>
```

to:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/models.js"></script>
```

On `portfolio.html`, change:

```html
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

to:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

- [ ] **Step 4: Verify open/close behaviour**

Hard-reload each page and test:

1. `http://localhost:8000/index.html` → click the search (magnifying glass) icon in the header. Expected: a white rounded panel appears below the header with an empty search input focused. The results area is empty.
2. Press `Escape`. Expected: panel closes.
3. Click the search icon again to open it. Click anywhere outside the panel (e.g. the hero text). Expected: panel closes.
4. Click the icon to re-open. Click inside the panel (e.g. the input). Expected: panel stays open.
5. Repeat steps 1-4 on `http://localhost:8000/models.html` and `http://localhost:8000/portfolio.html`. Same expectations.
6. DevTools console is clean throughout.

- [ ] **Step 5: Commit**

```bash
git add js/search.js css/style.css index.html models.html portfolio.html
git commit -m "Add search panel skeleton with open/close behaviour"
```

---

## Task 6: Load data and render empty-state chips

**Files:**
- Modify: `js/search.js`

This task makes the panel load categories and models on first open and display all categories as chips when the input is empty. No live filtering yet — that's Task 7.

- [ ] **Step 1: Extend `js/search.js` with data loading and empty-state rendering**

In `js/search.js`, add three module-local variables at the top of the IIFE, right after `let isOpen = false;`:

```javascript
  let categories = null;
  let models = null;
  let loadPromise = null;
```

Then, after the `buildPanel` function, add:

```javascript
  function ensureData() {
    if (categories && models) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([DataSource.getCategories(), DataSource.getModels()])
      .then(function (results) {
        categories = results[0];
        models = results[1];
      })
      .catch(function (err) {
        console.error(err);
        loadPromise = null;
        throw err;
      });
    return loadPromise;
  }

  function renderError() {
    resultsEl.innerHTML = '<div class="search-panel-error">Не удалось загрузить данные</div>';
  }

  function renderEmptyState() {
    if (!categories) {
      resultsEl.innerHTML = '';
      return;
    }
    const chips = categories.map(function (c) {
      return '<button class="search-panel-chip" data-category="' + c.key + '">' + c.label + '</button>';
    }).join('');
    resultsEl.innerHTML =
      '<div class="search-panel-group-title">Категории</div>' +
      '<div class="search-panel-chips">' + chips + '</div>';
  }
```

Then replace the existing `open` function:

```javascript
  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();
  }
```

with:

```javascript
  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();

    ensureData()
      .then(function () { renderEmptyState(); })
      .catch(function () { renderError(); });
  }
```

- [ ] **Step 2: Verify empty state renders and caches**

Hard-reload `http://localhost:8000/index.html`. Open DevTools → Network tab, clear it.

1. Click the search icon. Expected: panel opens, you see a "КАТЕГОРИИ" title and 6 chips: `Композитные`, `Кастом`, `Джакузи-спа`, `Надувные спа`, `Фурако`, `Мебель`. The Network tab shows one request each to `data/categories.json` and `data/models.json` (both 200).
2. Close the panel (Escape), re-open it. Expected: chips still appear; no new network requests in the Network tab (the data is cached in `DataSource`).

Error path check:

3. Open DevTools → Network tab → right-click on `data/categories.json` row → "Block request URL". Close and re-open the panel (the cached success value still wins for this session — so this test requires reloading the page first). Reload `index.html`, click the icon. Expected: panel shows "Не удалось загрузить данные".
4. Unblock the URL, close and re-open the panel. Expected: the retry succeeds and chips render (because `ensureData` cleared `loadPromise` on failure).

- [ ] **Step 3: Commit**

```bash
git add js/search.js
git commit -m "Load data lazily in search panel and render category chips"
```

---

## Task 7: Live filtering and results rendering

**Files:**
- Modify: `js/search.js`

- [ ] **Step 1: Add the filtering / rendering helpers**

In `js/search.js`, after `renderEmptyState`, add:

```javascript
  function normalise(s) {
    return (s || '').toString().toLowerCase();
  }

  function filterCategories(query) {
    if (!categories) return [];
    return categories.filter(function (c) {
      return normalise(c.label).indexOf(query) !== -1;
    }).slice(0, 5);
  }

  function filterModels(query) {
    if (!models) return [];
    return models.filter(function (m) {
      const hay = normalise(m.name) + ' ' + normalise(m.series) + ' ' + normalise(m.desc) + ' ' + normalise(m.specs);
      return hay.indexOf(query) !== -1;
    }).slice(0, 5);
  }

  function renderResults(catResults, modelResults) {
    if (catResults.length === 0 && modelResults.length === 0) {
      resultsEl.innerHTML = '<div class="search-panel-empty">Ничего не найдено</div>';
      return;
    }

    let html = '';

    if (catResults.length > 0) {
      const chips = catResults.map(function (c) {
        return '<button class="search-panel-chip" data-category="' + c.key + '">' + c.label + '</button>';
      }).join('');
      html +=
        '<div class="search-panel-group-title">Категории</div>' +
        '<div class="search-panel-chips">' + chips + '</div>';
    }

    if (modelResults.length > 0) {
      const rows = modelResults.map(function (m) {
        return (
          '<button class="search-panel-model" data-model="' + m.id + '">' +
            '<div class="search-panel-model-name">' + m.name + '</div>' +
            '<div class="search-panel-model-meta">' + m.series + ' · ' + m.specs + '</div>' +
          '</button>'
        );
      }).join('');
      html +=
        '<div class="search-panel-group-title">Модели</div>' +
        rows;
    }

    resultsEl.innerHTML = html;
  }

  function updateResults() {
    if (!categories || !models) return;
    const q = normalise(inputEl.value).trim();
    if (q === '') {
      renderEmptyState();
      return;
    }
    renderResults(filterCategories(q), filterModels(q));
  }
```

- [ ] **Step 2: Refactor `open()` to use `updateResults()`**

The `open()` function added in Task 6 currently always calls `renderEmptyState()` after data resolves. With the outside-click-preserves-input semantics from Task 5, reopening a panel that has text in the input should show the matching results, not the empty state. Replace the `open()` function body so the post-load step calls `updateResults()`:

Find this version of `open()` (from Task 6):

```javascript
  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();

    ensureData()
      .then(function () { renderEmptyState(); })
      .catch(function () { renderError(); });
  }
```

Replace with:

```javascript
  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();

    ensureData()
      .then(function () { updateResults(); })
      .catch(function () { renderError(); });
  }
```

- [ ] **Step 3: Wire the input event**

Still in `js/search.js`, find the `DOMContentLoaded` handler. After the `button.addEventListener('click', ...)` line, add:

```javascript
    inputEl.addEventListener('input', function () {
      updateResults();
    });
```

- [ ] **Step 4: Verify live filtering**

Reload `http://localhost:8000/index.html`. Open the search panel. Test each case:

1. Type `hiit`. Expected: `Категории` group is hidden; `Модели` group shows one row "HIIT / Спортивная серия · 8.0 · 3.6 · 1.6 м".
2. Clear the input (select all, delete). Expected: empty state comes back — 6 category chips.
3. Type `джакузи`. Expected: `Категории` shows one chip "Джакузи-спа"; `Модели` shows 3 rows (SPA DUO, SPA FAMILY, SPA PREMIUM).
4. Type `фурако`. Expected: 1 category chip + 3 model rows (FURAKO CLASSIC, FURAKO OVAL, FURAKO XL).
5. Type `xyz123`. Expected: "Ничего не найдено".
6. Clear → type `к` (single Cyrillic char). Expected: at least a few categories and models match (no crash, no duplicates beyond 5 per group).
7. Type `spa` → close with outside click (e.g. click the hero title) → click the search icon again. Expected: panel reopens with `spa` still in the input **and** the matching SPA rows still in the results (this verifies the `open()` refactor from Step 2).
8. Console is clean throughout.

- [ ] **Step 5: Commit**

```bash
git add js/search.js
git commit -m "Add live substring filtering to search panel"
```

---

## Task 8: Selection, navigation, and Enter key

**Files:**
- Modify: `js/search.js`

- [ ] **Step 1: Add click delegation on the results area**

In `js/search.js`, after `renderResults`, add:

```javascript
  function navigateToCategory(key) {
    window.location.href = 'models.html?category=' + encodeURIComponent(key);
  }

  function navigateToModel(id) {
    window.location.href = 'models.html?model=' + encodeURIComponent(id);
  }

  function onResultsClick(e) {
    const chip = e.target.closest('.search-panel-chip');
    if (chip) {
      navigateToCategory(chip.dataset.category);
      return;
    }
    const modelBtn = e.target.closest('.search-panel-model');
    if (modelBtn) {
      navigateToModel(modelBtn.dataset.model);
    }
  }
```

- [ ] **Step 2: Wire results click and Enter key in `DOMContentLoaded`**

Still in `js/search.js`, inside the `DOMContentLoaded` handler, after the `inputEl.addEventListener('input', ...)` block added in Task 7, add:

```javascript
    resultsEl.addEventListener('click', onResultsClick);

    inputEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!categories || !models) return;
      const q = normalise(inputEl.value).trim();
      if (q === '') return;
      const modelHits = filterModels(q);
      if (modelHits.length > 0) {
        navigateToModel(modelHits[0].id);
        return;
      }
      const catHits = filterCategories(q);
      if (catHits.length > 0) {
        navigateToCategory(catHits[0].key);
      }
    });
```

- [ ] **Step 3: Verify end-to-end**

Reload `http://localhost:8000/index.html` and test:

1. Open search, type `hiit`, click the HIIT row. Expected: navigates to `models.html?model=hiit`, card scrolls into view and pulses blue. (This exercises Task 4's deep-link handler.)
2. Go back, open search, type `джакузи`, click the "Джакузи-спа" chip. Expected: navigates to `models.html?category=jacuzzi`, only 3 jacuzzi cards visible.
3. Go back, open search, click the `Композитные` chip in the empty state. Expected: navigates to `models.html?category=composite`, 3 composite cards visible.
4. Open search, type `spa`, press `Enter`. Expected: navigates to the first matching model (`SPA DUO` → `?model=spa-duo`), deep-link highlights.
5. Open search, type `кедр`, press `Enter`. Expected: navigates to the first matching model (`FURAKO CLASSIC` — matches via its `series` field "Кедр сибирский").
6. Open search, type `xyz`, press `Enter`. Expected: nothing happens, panel stays open.
7. Repeat steps 1-2 from `http://localhost:8000/models.html` and `http://localhost:8000/portfolio.html` — search should work identically from all three pages.

- [ ] **Step 4: Commit**

```bash
git add js/search.js
git commit -m "Add selection, navigation, and Enter-key support to search"
```

---

## Task 9: Final regression pass

**Files:** none

- [ ] **Step 1: Run the full test matrix from the spec**

Run all scenarios from the spec's Testing section against the running local server. Each must still pass:

**Happy path:**
1. `index.html` → search → `hiit` → click → `?model=hiit` deep link works, pulses.
2. `models.html` → search → `джакузи` → click category → `?category=jacuzzi` filter applied.
3. Open empty search → 6 category chips visible.
4. Non-matching query → "Ничего не найдено".
5. `Enter` with matches → first model wins.
6. `Escape` → closes, focus returns to button.
7. Outside click → closes, input preserved, re-open shows same state.

**Regressions:**
8. `models.html` chip filter (manual clicks) still works as before.
9. `index.html` hero, carousel, catalog, portfolio sections render unchanged.

**Failures:**
10. Block `data/models.json` in DevTools, reload `models.html` → grid shows "Не удалось загрузить каталог", no JS errors.
11. Blocked, open search panel → "Не удалось загрузить данные". Unblock, reopen panel → loads normally.
12. `models.html?category=nonsense` → default state, no errors.
13. `models.html?model=nonsense` → default state, no errors.

Any failure — stop and fix. Do not mark this task done with outstanding issues.

- [ ] **Step 2: Verify git tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

If there are leftover edits, review them and commit or revert before closing out.

---

## Done

After Task 9, the header search feature is complete, the catalog data lives in a single source of truth, and the spec's success criteria are satisfied. The plan explicitly leaves the Postgres backend and admin panel for a later spec.

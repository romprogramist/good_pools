# Header search with data-source refactor

**Date:** 2026-04-15
**Status:** Approved design, pending implementation plan

## Goal

Turn the existing (non-functional) search button in the header into a live search across categories and pool models, and refactor the catalog data layer so adding new entities (via a future admin panel backed by PostgreSQL) automatically flows into both the catalog page and the search without any code changes to the UI.

## Context

`good_pools` is a static, vanilla-JS site (no bundler, no framework). Today:

- `js/models.js` contains two hardcoded constants, `CATEGORIES` (6 entries) and `MODELS` (18 entries), and renders the `models.html` catalog with a category chip filter.
- `index.html`, `models.html`, and `portfolio.html` share a header that includes a search button (`<button class="header-icon" aria-label="Поиск">`) which currently has no behaviour. `catalog.html` is a standalone demo page with no shared header and is out of scope.
- A minimal admin panel backed by PostgreSQL is planned for a separate future task. It is out of scope here, but every decision in this spec must leave a clear, low-effort path for that future work.

The core constraint: **data must be defined in exactly one place**. The catalog page, the search, and any future feature must read from the same source.

## Non-goals

- Building the backend (Node/Express, Postgres schema, migrations, REST endpoints).
- Building the admin panel.
- Fuzzy search, typo tolerance, ranked relevance, search analytics, voice input.
- Full-text search across arbitrary fields; a substring match over a fixed set of searchable fields is sufficient for the current ~18-item dataset and is expected to remain adequate up to ~100 items.
- A build system, bundler, or module system beyond what the site already uses (plain `<script>` tags, no `import`/`export`).
- Any redesign of `models.html`, `catalog.html`, `index.html`, or the header beyond what the search requires.

## Architecture

### Data layer — single source of truth

Introduce two JSON files under a new `data/` directory:

- `data/categories.json` — array of `{ key, label, image }`, one entry per category. `key` is the stable identifier used in URLs and `data-category` attributes. `label` is the Russian display name. `image` is the relative path to the category image (matches today's `CATEGORY_IMAGE` map).
- `data/models.json` — array of model objects with the same shape currently hardcoded in `js/models.js`: `{ id, name, category, series, desc, specs, price, badge? }`. `category` is the `key` of an entry in `categories.json`.

Portfolio projects are intentionally **not** part of this spec (see "Out of scope / future work"); adding a third resource later is a trivial extension of the same module.

Introduce one new JS module, `js/data-source.js`, that is **the only** place in the frontend that knows where data lives. It exposes a global `DataSource` object (no ES modules — keep consistent with the rest of the site) with two methods:

- `DataSource.getCategories()` → `Promise<Category[]>`
- `DataSource.getModels()` → `Promise<Model[]>`

Internals:

- Each method fetches its JSON file via `fetch()` on first call and caches the parsed result in a module-local variable. Subsequent calls return the cached promise, so the network is hit at most once per page load per resource.
- URLs are declared as two constants at the top of the module. Migrating to a real backend later means changing those constants (e.g. `'data/models.json'` → `'/api/models'`) and nothing else.
- On `fetch` failure or non-OK response, the method rejects with an `Error` whose message is `'data-source: <resource> load failed'`. Callers decide how to present the failure.

### Catalog page refactor (`js/models.js`)

`models.js` stops owning data. It becomes a pure view module:

- Remove the `CATEGORIES`, `CATEGORY_IMAGE`, and `MODELS` constants.
- On `DOMContentLoaded`, call `DataSource.getCategories()` and `DataSource.getModels()` in parallel (`Promise.all`).
- Once resolved, build `CATEGORY_IMAGE` locally from the categories array (`category.key → category.image`), then call the existing `renderFilter` / `renderGrid` / `attachFilter` functions unchanged in their signatures.
- If either request fails, render a minimal fallback message inside `.models-grid` ("Не удалось загрузить каталог") and log the error to the console. Do not render partial state.
- `renderGrid` adds `data-id="${model.id}"` to each `.mcard` (today it only sets `data-category`). This is required for the `?model=` deep-link behaviour described below.

Visual behaviour of `models.html` is otherwise unchanged.

### Search UI (`js/search.js` + CSS in `css/style.css`)

A new module, `js/search.js`, owns the entire search dropdown: DOM, event wiring, data fetching via `DataSource`, filtering, and navigation.

**Mounting.** On `DOMContentLoaded`, `search.js` looks for `button[aria-label="Поиск"]` inside `.header`. If found, it:

1. Creates a panel element `<div class="search-panel">` and appends it to `document.body` (positioned absolutely under the header via CSS). It does not modify the existing header markup.
2. Attaches a click listener to the search button that toggles the panel open/closed.
3. Does nothing else until the panel is first opened (lazy data load).

Pages without a search button (if any) simply no-op.

**First open.** The first time the panel opens, `search.js` calls `DataSource.getCategories()` and `DataSource.getModels()` in parallel and builds an in-memory index: for each model, a lowercase haystack string concatenating `name`, `series`, `desc`, and `specs`; for each category, a lowercase haystack from `label`. Subsequent opens reuse the index. If the load fails, the panel shows "Не удалось загрузить данные" and re-tries on the next open.

**Panel layout.**

- Search input (`<input type="search">`) with placeholder "Поиск по каталогу".
- Results area below the input, containing two optional groups:
  - "Категории" — up to 5 matching categories, rendered as chip-style buttons.
  - "Модели" — up to 5 matching models, rendered as compact rows (name + series + specs).
- Empty input state: "Категории" group shows **all** categories as chips (read from `DataSource`, so new categories appear automatically); "Модели" group is hidden.
- No-match state: single line "Ничего не найдено".

**Filtering.** Runs on every `input` event. Case-insensitive substring match against the haystack string for each item. `.toLowerCase()` is used as the normaliser; Cyrillic input works out of the box with substring matching. Result sets are capped at 5 per group. No debouncing for the current dataset size; if the dataset grows past ~500 items, a 100ms debounce can be added without touching the rest of the module.

**Selection.**

- Click on a category chip → navigate to `models.html?category=<key>`.
- Click on a model row → navigate to `models.html?model=<id>`.
- `Enter` key in the input → navigate to the first result, preferring the first model if any exist, otherwise the first category. If there are no results, `Enter` does nothing.
- `Escape` key → close the panel, clear the input.
- Click outside the panel (and outside the search button) → close the panel, preserve the input value so reopening shows the same state.
- Arrow-key navigation between results is **out of scope** for this spec; clicks and Enter are sufficient.

**Focus.** When the panel opens, the input receives focus automatically. When it closes via Escape or outside-click, focus returns to the search button.

### Deep-link handling on `models.html`

After `renderGrid` finishes, `models.js` parses `window.location.search` using `URLSearchParams`:

- `?category=<key>`: if `<key>` matches a known category, activate the corresponding chip and apply the existing filter logic (same code path as a manual chip click — extract the filter body into a reusable function if needed). Unknown keys are silently ignored; the default "Все" state stays.
- `?model=<id>`: if `<id>` matches a rendered card, call `card.scrollIntoView({ behavior: 'smooth', block: 'center' })` and add a `.highlight` class to that card. The class auto-removes after 2000ms via `setTimeout`. CSS for `.highlight` adds a short pulse animation (outline + soft shadow). Unknown ids are silently ignored.
- Both parameters together are applied in order: category filter first, then scroll-and-highlight. If the targeted model is hidden by the category filter, the filter takes precedence (no scroll, no highlight).

## Module boundaries

| Module | Knows about | Does not know about |
|---|---|---|
| `js/data-source.js` | JSON URLs, `fetch`, in-memory cache, resource shapes | Any DOM, any page |
| `js/search.js` | Search panel DOM, keyboard, URL navigation, `DataSource` | How data is stored, catalog page internals |
| `js/models.js` | `models.html` DOM, filter logic, URL params, `DataSource` | How data is stored, search panel |

`js/main.js` (hamburger menu, header behaviours) is unchanged by this spec. `search.js` self-mounts on `DOMContentLoaded` by looking for the search button — there is no orchestrator wiring modules together. No UI module ever reads JSON directly. All data access goes through `DataSource`.

## Page wiring

`index.html`, `models.html`, and `portfolio.html` include `<script src="js/data-source.js"></script>` and `<script src="js/search.js"></script>` before the existing `js/main.js` script tag. `models.html` additionally keeps its `js/models.js`. Load order: `data-source.js` first (defines the global), then the consumers. No page includes raw data files directly.

## Data flow

1. User loads any page. Header renders statically. `search.js` mounts, attaches click handler, does not fetch.
2. User clicks the search button. `search.js` opens the panel, requests `DataSource.getCategories()` + `getModels()`, builds the index, renders initial (empty-input) state.
3. User types. `search.js` filters the in-memory index, re-renders the results area.
4. User picks a result. `search.js` navigates to `models.html?category=…` or `?model=…`.
5. `models.html` loads. `models.js` fetches via `DataSource`, renders chips + cards (adding `data-id`), then reads URL params and applies category filter and/or scroll-and-highlight.

## Error handling

- `fetch` failure in `data-source.js` — rejects with a typed error message; no partial caching (failed resources are re-tried on the next call).
- `fetch` failure seen by `models.js` — catalog grid is replaced with "Не удалось загрузить каталог", error is logged.
- `fetch` failure seen by `search.js` — panel body is replaced with "Не удалось загрузить данные", index is not built, next open retries.
- Unknown URL params on `models.html` — silently ignored, page renders in default state.
- Deep-link to a model that exists but is in a hidden category — filter wins, no scroll/highlight (documented above as the expected precedence).

## Testing

Manual, in the already-running local server on port 8000.

Happy-path scenarios:

1. `index.html` → click search → type "hiit" → HIIT appears under "Модели" → click → lands on `models.html?model=hiit`, card scrolls into view, pulses for ~2 s.
2. `models.html` → click search → type "джакузи" → "Джакузи-спа" under "Категории", three SPA cards under "Модели" → click the category chip → navigates to `models.html?category=jacuzzi`, jacuzzi chip active, only jacuzzi cards visible.
3. `models.html` → click search → open with empty input → all 6 categories shown as chips, "Модели" group hidden.
4. Type a string that matches nothing → "Ничего не найдено".
5. Press `Enter` with a non-empty query that has matches → navigates to the first model if any, otherwise the first category.
6. Press `Escape` in the open panel → panel closes, focus returns to the button.
7. Click outside the panel → panel closes, input value preserved, reopening shows previous state.

Regression scenarios:

8. `models.html` chip filter (manual clicks) still works unchanged.
9. `index.html` category carousel and other sections render unchanged.

Failure scenarios:

10. In DevTools, block `data/models.json`, reload `models.html` → grid area shows "Не удалось загрузить каталог", no JS exceptions.
11. With the data request blocked, open the search panel → panel body shows "Не удалось загрузить данные"; unblock, close and reopen → panel loads normally.
12. Navigate to `models.html?category=nonsense` → page shows default state, no errors.
13. Navigate to `models.html?model=nonsense` → page shows default state, no errors.

## Out of scope / future work

- Replacing `data-source.js` URLs with real `/api/...` endpoints once the Postgres backend is built. Expected effort: minutes.
- Admin panel CRUD UI.
- Search ranking, fuzzy matching, highlighting matched substrings in results, recently searched history.
- Extending the search to portfolio projects: add `data/projects.json` + `DataSource.getProjects()` + a third result group in `search.js`. The existing `DataSource` pattern makes this a small additive change.

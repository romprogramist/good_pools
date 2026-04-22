# Portfolio home → portfolio.html deep link

**Дата:** 2026-04-22

## Цель

В секции «Наши работы» на `index.html` клик по карточке должен открывать `portfolio.html` с уже выбранной категорией и сразу развёрнутой галереей конкретной работы — так же, как это сделано в «Каталог чаш» → `models.html`.

## Паттерн-источник

- `js/main.js` → `catalogCardHtml(m)` строит `<a href="models.html?category=<k>&model=<id>" class="pcard">…</a>`.
- `js/models.js` → `applyDeepLink()` читает `?category=&model=`, активирует чипс, скроллит к карточке и вызывает `openModelInGallery(...)`.

## Изменения

1. **`js/portfolio.js`**
   - Добавить `homeCardHtml(work, modifier)` — идентичный `cardHtml`, но внешним тегом служит `<a href="portfolio.html?category=<key>&work=<id>" class="work-card …">` (без `tabindex`/`role="button"` — это уже ссылка).
   - `renderHomeFeatured()` переводится на `homeCardHtml` (главная — только ссылки).
   - Ветка страницы `portfolio.html` продолжает использовать `cardHtml` + `attachPortfolioGallery` (клик → модалка) — без изменений.
   - Добавить функцию `applyDeepLink(filterEl, gridEl)`:
     1. `new URLSearchParams(location.search)` → `category`, `work`.
     2. Если `category` валидна (есть в `WORK_CATEGORIES` и `!== 'all'`) — эмулировать клик по соответствующему `.mchip` (чтобы переиспользовать existing handler `attachPortfolioFilter`).
     3. Если `work` найден в `WORKS` и соответствующая `.work-card` не `hidden` — `scrollIntoView({ behavior:'smooth', block:'center' })` и `openWorkInGallery(work, cardEl)` через `setTimeout(..., 100)`.
   - Вызвать `applyDeepLink` после того как `renderPortfolioGrid` + `attachPortfolioFilter` + `attachPortfolioGallery` отработали.

2. **HTML/CSS** — не трогаем. Классы и разметка остаются. `.work-card` уже стилизован по классу, `<a class="work-card">` подхватит стили (как `.pcard`/`.mcard`).

## Краевые случаи

- Неизвестный `category` → просто остаётся дефолтная «Все».
- Неизвестный `work` → не открываем галерею.
- Если `work.category` существует, но фильтр его случайно скрыл — не открываем (проверяем `hidden` перед открытием).
- Без параметров в URL — поведение страницы не меняется.

## Проверка

- Открыть `index.html`, клик по большой карточке в «Наши работы» → `portfolio.html?category=<k>&work=<id>`, чип активен, карточка в центре вьюпорта, галерея открыта.
- Открыть `portfolio.html` напрямую — фильтр «Все», никакой галереи.
- Открыть `portfolio.html?category=composite` — активен чип «Композитные», галерея закрыта.

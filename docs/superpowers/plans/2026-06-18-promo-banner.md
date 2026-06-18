# Промо-баннер «−10% за заявку» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить тонкую фиксированную промо-полосу над шапкой («Оставьте заявку — скидка 10% на строительство бассейна»): кликабельна целиком (открывает форму заявки), закрывается крестиком, после закрытия скрыта до конца сессии.

**Architecture:** Изолированный модуль по образцу `cookie-banner` (свой CSS + IIFE-JS, вставляющий узел в `body`). Полоса `position:fixed; top:0; z-index:101` над шапкой (z=100). Сдвиг шапки и контента — через CSS-переменную `--promo-h` (по умолчанию `0`, JS ставит реальную высоту полосы). Клик вызывает уже существующую форму заявки через экспортированные глобали `window.openQuiz` / `window.openConsult`.

**Tech Stack:** Vanilla JS (ES5-совместимый IIFE, без сборки), CSS с переменными темы (`theme.css`), Node.js статик-сервер (Express). Тесты: браузерный `*.test.html` с `window.__name` (как `js/quiz.test.html`).

## Global Constraints

- **Версионные query-строки.** Все новые ассеты подключать с `?v=20260618` (как у соседних `?v=…` в проекте). При изменении — бампать суффикс.
- **Бренд-токены.** Цвета баннера — только через переменные: фон `var(--gp-cta-grad)`, текст `var(--gp-cta-ink)`. Тайминги — `var(--motion-slow)` (620ms), `var(--motion-fast)` (180ms), easing `var(--ease-out)`. Не хардкодить hex/ms (reduced-motion схлопывает токены в 1ms автоматически — отдельный media-блок не нужен).
- **ID счётчика Метрики:** `100792239` (как в остальных вызовах `ym`).
- **`css/style.css` не редактировать.** Все layout-правила баннера — в `css/promo-banner.css` (грузится после `style.css`, та же специфичность → берёт верх).
- **Без персональных данных** в коде/коммитах.
- **Коммиты — локально, без `git push`.** Push в `main` триггерит деплой (`.github/workflows/deploy.yml`) — пушим только по явной просьбе пользователя.
- **Подмена пользователя в форме** — вне рамок; форму открываем существующими опенерами, ничего в их логике не меняем.

---

### Task 1: Экспорт опенеров формы заявки (`window.openQuiz`, `window.openConsult`)

Баннер вставляется динамически после `DOMContentLoaded`, а `quiz.js`/`consult.js` навешивают клики только на элементы, существующие в этот момент (`querySelectorAll(...).forEach`), без делегирования. Поэтому баннер должен вызывать опенер напрямую. Экспортируем функции в `window`.

**Files:**
- Modify: `js/quiz.js` (перед блоком `DOMContentLoaded`, строка ~390)
- Modify: `js/consult.js` (перед блоком `DOMContentLoaded`, строка ~197)

**Interfaces:**
- Produces: `window.openQuiz()` — открывает квиз-форму (есть на index/catalog/models/portfolio). `window.openConsult()` — открывает форму консультации (есть на всех страницах, включая `/pool`). Обе сами шлют в Метрику `form_opened`.

- [ ] **Step 1: Экспортировать openQuiz**

В `js/quiz.js` найти строку:

```js
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-quiz-open]').forEach((el) => {
```

Вставить **перед** ней:

```js
  // Экспорт для внешних триггеров (промо-баннер), т.к. квиз биндит клики
  // только на статические элементы в DOMContentLoaded.
  window.openQuiz = openQuiz;

```

- [ ] **Step 2: Экспортировать openConsult**

В `js/consult.js` найти строку:

```js
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-consult, [data-consult-open]').forEach(function (btn) {
```

Вставить **перед** ней:

```js
  // Экспорт для внешних триггеров (промо-баннер на страницах без quiz.js, напр. /pool).
  window.openConsult = openConsult;

```

- [ ] **Step 3: Проверка синтаксиса**

Run: `cd ~/good_pools && node --check js/quiz.js && node --check js/consult.js && echo OK`
Expected: `OK` (без ошибок парсинга).

- [ ] **Step 4: Ручная проверка в браузере**

Сервер уже запущен на `http://localhost:3050` (если нет — `npm run dev`). Открыть `http://localhost:3050/`, в DevTools Console:

```js
typeof window.openQuiz    // ожидаем "function"
typeof window.openConsult // ожидаем "function"
window.openQuiz()         // должен открыться квиз
```

Затем открыть `http://localhost:3050/pool/<любой-слаг>` (или любую страницу `/pool`), в Console:

```js
typeof window.openConsult // "function"
window.openConsult()      // должна открыться форма консультации
```

Expected: обе функции есть; вызовы открывают соответствующие формы.

- [ ] **Step 5: Commit**

```bash
cd ~/good_pools
git add js/quiz.js js/consult.js
git commit -m "feat(forms): экспорт window.openQuiz/openConsult для внешних триггеров

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: JS-модуль промо-баннера + unit-тест гейта показа

Полный модуль `js/promo-banner.js`: гейт по `sessionStorage`, вставка узла, измерение высоты, slide-in, клик по полосе → опенер формы + цель `promo_click`, крестик → закрытие на сессию с возвратом layout. Единственная чисто-логическая часть (`shouldShow`) покрывается браузерным тестом по образцу `js/quiz.test.html`. Визуальное поведение проверяется в Task 3 (после подключения CSS и страницы).

**Files:**
- Create: `js/promo-banner.js`
- Create: `js/promo-banner.test.html`

**Interfaces:**
- Consumes: `window.openQuiz` / `window.openConsult` (Task 1), `window.ym` (Метрика, может отсутствовать), CSS-переменная `--promo-h` (Task 3).
- Produces: `window.__promo.shouldShow(storage)` → `boolean` — показывать ли баннер (`false`, если `storage.getItem('promoClosed') === '1'`; `true` при ошибке/отсутствии storage). Узел `.promo-bar` с дочерними `.promo-bar__text` и `.promo-bar__close`. Ставит/снимает `--promo-h` на `document.documentElement`.

- [ ] **Step 1: Написать падающий тест на shouldShow**

Создать `js/promo-banner.test.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><title>promo-banner tests</title></head>
<body>
<h1>promo-banner tests — открой DevTools → Console</h1>
<script src="promo-banner.js"></script>
<script>
  (function () {
    let pass = 0, fail = 0;
    function eq(actual, expected, name) {
      if (actual === expected) { pass++; console.log('OK:', name); }
      else { fail++; console.error('FAIL:', name, '\n  expected:', JSON.stringify(expected), '\n  actual:', JSON.stringify(actual)); }
    }
    const P = window.__promo;

    eq(P.shouldShow({ getItem: function () { return '1'; } }), false, 'closed flag → не показывать');
    eq(P.shouldShow({ getItem: function () { return null; } }), true,  'нет флага → показывать');
    eq(P.shouldShow({ getItem: function () { return '0'; } }), true,  'другое значение → показывать');
    eq(P.shouldShow(null), true, 'нет storage → показывать');
    eq(P.shouldShow({ getItem: function () { throw new Error('blocked'); } }), true, 'storage кидает → показывать');

    console.log(`\n${pass} passed, ${fail} failed`);
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Открыть `http://localhost:3050/js/promo-banner.test.html`, DevTools → Console.
Expected: ошибка `Cannot read properties of undefined (reading 'shouldShow')` (модуль `promo-banner.js` ещё не создан / не экспортирует `window.__promo`).

- [ ] **Step 3: Создать модуль с shouldShow (минимум для прохождения теста)**

Создать `js/promo-banner.js`:

```js
(function () {
  'use strict';

  var STORAGE_KEY = 'promoClosed';
  var YM_ID = 100792239;

  // Чистая логика: показывать ли баннер при данном storage-объекте.
  function shouldShow(storage) {
    try {
      return !storage || storage.getItem(STORAGE_KEY) !== '1';
    } catch (_) {
      return true; // storage недоступен → показываем
    }
  }

  // экспорт для тестов (как window.__quiz)
  window.__promo = { shouldShow: shouldShow };
})();
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Перезагрузить `http://localhost:3050/js/promo-banner.test.html`, Console.
Expected: `5 passed, 0 failed`.

- [ ] **Step 5: Дописать модуль (вставка, slide-in, клик, закрытие)**

Заменить содержимое `js/promo-banner.js` целиком на:

```js
(function () {
  'use strict';

  var STORAGE_KEY = 'promoClosed';
  var YM_ID = 100792239;
  var REVEAL_DELAY = 600;   // не «бить по глазам» на загрузке
  var REMOVE_FALLBACK = 800; // подстраховка, если transitionend не сработал

  // Чистая логика: показывать ли баннер при данном storage-объекте.
  function shouldShow(storage) {
    try {
      return !storage || storage.getItem(STORAGE_KEY) !== '1';
    } catch (_) {
      return true; // storage недоступен → показываем
    }
  }

  // Открыть доступную форму заявки. На index/catalog/models/portfolio — квиз,
  // на /pool — консультация. Возвращает true, если форма открыта.
  function openLeadForm() {
    if (typeof window.openQuiz === 'function') { window.openQuiz(); return true; }
    if (typeof window.openConsult === 'function') { window.openConsult(); return true; }
    return false;
  }

  function buildBar() {
    var bar = document.createElement('div');
    bar.className = 'promo-bar';
    bar.setAttribute('role', 'button');
    bar.setAttribute('tabindex', '0');
    bar.setAttribute('aria-label', 'Оставить заявку и получить скидку 10% на строительство бассейна');
    bar.innerHTML =
      '<span class="promo-bar__text">' +
        '<span class="promo-bar__emoji" aria-hidden="true">🎁</span>' +
        'Оставьте заявку на сайте — скидка <b>10%</b> на строительство бассейна' +
      '</span>' +
      '<button type="button" class="promo-bar__close" aria-label="Закрыть">&times;</button>';
    return bar;
  }

  function init() {
    var storage;
    try { storage = window.sessionStorage; } catch (_) { storage = null; }
    if (!shouldShow(storage)) return;

    var root = document.documentElement;
    var bar = buildBar();
    document.body.appendChild(bar);

    var height = bar.offsetHeight; // измеряем до показа (узел скрыт через transform)

    function activate() {
      if (openLeadForm() && typeof window.ym === 'function') {
        try { window.ym(YM_ID, 'reachGoal', 'promo_click'); } catch (_) {}
      }
    }

    bar.addEventListener('click', function (e) {
      if (e.target.closest('.promo-bar__close')) return;
      activate();
    });

    bar.addEventListener('keydown', function (e) {
      if (e.target.closest('.promo-bar__close')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        activate();
      }
    });

    bar.querySelector('.promo-bar__close').addEventListener('click', function (e) {
      e.stopPropagation();
      try { if (storage) storage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      bar.classList.remove('is-visible');
      root.style.setProperty('--promo-h', '0px'); // контент уезжает обратно вверх
      var removed = false;
      function remove() { if (removed) return; removed = true; bar.remove(); }
      bar.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, REMOVE_FALLBACK);
    });

    // Показ: одновременно резервируем место (--promo-h) и проявляем (is-visible).
    setTimeout(function () {
      root.style.setProperty('--promo-h', height + 'px');
      bar.classList.add('is-visible');
    }, REVEAL_DELAY);
  }

  // экспорт для тестов (как window.__quiz)
  window.__promo = { shouldShow: shouldShow };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 6: Перепроверить unit-тест и синтаксис**

Run: `cd ~/good_pools && node --check js/promo-banner.js && echo OK`
Expected: `OK`.
Перезагрузить `http://localhost:3050/js/promo-banner.test.html`, Console.
Expected: `5 passed, 0 failed` (логика `shouldShow` не изменилась).

- [ ] **Step 7: Commit**

```bash
cd ~/good_pools
git add js/promo-banner.js js/promo-banner.test.html
git commit -m "feat(promo): JS-модуль промо-баннера + unit-тест гейта показа

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: CSS промо-баннера + подключение на главной, полная визуальная проверка

Стили и layout-механика (`--promo-h`, сдвиг шапки/контента), оформление в обеих темах, адаптив. Подключаем на `index.html` и проверяем полное поведение: появление, темы, мобайл, скролл, клик → форма + `promo_click`, крестик → закрытие на сессию.

**Files:**
- Create: `css/promo-banner.css`
- Modify: `index.html` (`<head>` — `<link>` после `cookie-banner.css`, строка ~12; перед `</body>` — `<script>` рядом с `cookie-banner.js`, строка ~554)

**Interfaces:**
- Consumes: `js/promo-banner.js` (Task 2) — узел `.promo-bar`/`.promo-bar__close`, переменная `--promo-h`. Токены `theme.css`/`style.css` (`--gp-cta-grad`, `--gp-cta-ink`, `--motion-*`, `--ease-out`).
- Produces: визуальный баннер; CSS-контракт `:root{--promo-h}`, `.header{top:var(--promo-h)}`, `body{padding-top:var(--promo-h)}` — используется на всех страницах подключения.

- [ ] **Step 1: Создать css/promo-banner.css**

```css
/* Промо-баннер «−10% за заявку». Layout через --promo-h; style.css не трогаем. */

:root { --promo-h: 0px; }

/* Резервируем место над фикс-шапкой ровно на высоту полосы.
   При --promo-h:0 (баннер скрыт/закрыт) поведение идентично исходному. */
body   { padding-top: var(--promo-h); transition: padding-top var(--motion-slow) var(--ease-out); }
.header { top: var(--promo-h); }

.promo-bar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 101; /* выше шапки (z=100) */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 9px 44px 9px 16px; /* справа место под крестик */
  background: var(--gp-cta-grad);
  color: var(--gp-cta-ink);
  font-size: 14px;
  line-height: 1.3;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(0, 0, 0, .15);

  opacity: 0;
  transform: translateY(-100%);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-out);
}

.promo-bar.is-visible { opacity: 1; transform: translateY(0); }

.promo-bar__text {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.promo-bar__text b { font-weight: 800; }
.promo-bar__emoji { font-size: 16px; }

.promo-bar__close {
  position: absolute;
  top: 50%; right: 10px;
  transform: translateY(-50%);
  width: 28px; height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 22px;
  line-height: 1;
  border-radius: 6px;
  cursor: pointer;
  opacity: .75;
  transition:
    opacity var(--motion-fast) var(--ease-out),
    background var(--motion-fast) var(--ease-out);
}
@media (hover: hover) {
  .promo-bar__close:hover { opacity: 1; background: rgba(0, 0, 0, .08); }
}

.promo-bar:focus-visible { outline: 2px solid var(--gp-cta-ink); outline-offset: -3px; }
.promo-bar__close:focus-visible { outline: 2px solid var(--gp-cta-ink); outline-offset: 1px; }

@media (max-width: 480px) {
  .promo-bar { font-size: 12.5px; padding: 8px 40px 8px 12px; }
}
```

- [ ] **Step 2: Подключить CSS в index.html**

В `index.html` найти строку (~12):

```html
  <link rel="stylesheet" href="css/cookie-banner.css?v=20260518-motion6a">
```

Добавить **после** неё:

```html
  <link rel="stylesheet" href="css/promo-banner.css?v=20260618">
```

- [ ] **Step 3: Подключить JS в index.html**

В `index.html` найти строку (~554):

```html
  <script src="js/cookie-banner.js?v=20260518-motion6" defer></script>
```

Добавить **после** неё:

```html
  <script src="js/promo-banner.js?v=20260618" defer></script>
```

- [ ] **Step 4: Проверка появления и layout**

Очистить флаг и открыть главную: в DevTools Console выполнить `sessionStorage.removeItem('promoClosed')`, затем перезагрузить `http://localhost:3050/`.
Expected:
- Через ~0.6с сверху плавно выезжает янтарная полоса с текстом «Оставьте заявку на сайте — скидка **10%** на строительство бассейна» и крестиком справа.
- Шапка и контент сдвинуты вниз ровно на высоту полосы; ничего не перекрыто, hero-заголовок не «прячется» под шапкой.

- [ ] **Step 5: Проверка тем и мобайла**

- Переключить тему тумблером на сайте (светлая/тёмная) — текст и фон полосы читаемы в обеих.
- DevTools → device toolbar → ширина 390px: полоса корректной высоты, текст переносится/умещается, крестик доступен (тап-таргет ≥28px).
- Скролл вниз: шапка прячется, полоса остаётся тонкой сверху, верстка не «прыгает».

- [ ] **Step 6: Проверка клика и цели promo_click**

Кликнуть по тексту полосы (не по крестику).
Expected: открывается квиз-форма. В Console (Метрика инициализируется после первого взаимодействия) проверить факт отправки — выполнить до клика `window.ym = function(){ console.log('ym', arguments); }` и затем кликнуть; ожидаем в логе `ym ... 'reachGoal' 'promo_click'` и из формы `... 'form_opened'`.

- [ ] **Step 7: Проверка закрытия и памяти на сессию**

Кликнуть крестик.
Expected: полоса уезжает вверх, контент плавно возвращается на место; `sessionStorage.getItem('promoClosed') === '1'`. Перезагрузить страницу — баннера нет. Выполнить `sessionStorage.removeItem('promoClosed')` и перезагрузить — баннер снова появляется.

- [ ] **Step 8: Commit**

```bash
cd ~/good_pools
git add css/promo-banner.css index.html
git commit -m "feat(promo): стили промо-баннера + подключение на главной

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Раскатка на остальные страницы (catalog, models, portfolio, /pool)

Подключить баннер на оставшиеся статические страницы и на серверный шаблон `/pool` (там нет `quiz.js`, поэтому клик откроет форму консультации через `window.openConsult`).

**Files:**
- Modify: `catalog.html`, `models.html`, `portfolio.html` (`<head>` + перед `</body>`)
- Modify: `views/pool.ejs` (`<head>` — абсолютный путь `/css/…`; перед `</body>` — `/js/…`)

**Interfaces:**
- Consumes: `css/promo-banner.css`, `js/promo-banner.js` (Task 2–3); `window.openConsult` на `/pool` (Task 1).

- [ ] **Step 1: Подключить на catalog/models/portfolio**

В каждом из `catalog.html`, `models.html`, `portfolio.html`:

1. В `<head>` после строки с `cookie-banner.css` добавить:

```html
  <link rel="stylesheet" href="css/promo-banner.css?v=20260618">
```

2. Перед `</body>` рядом с подключением `cookie-banner.js` добавить:

```html
  <script src="js/promo-banner.js?v=20260618" defer></script>
```

(Если на конкретной странице нет `cookie-banner.css`/`cookie-banner.js` — вставить `<link>` последним среди CSS в `<head>`, а `<script>` — последним среди скриптов перед `</body>`.)

- [ ] **Step 2: Подключить на /pool (views/pool.ejs)**

В `views/pool.ejs` в `<head>` после строки `<link rel="stylesheet" href="/css/pool.css">` (~строка 16) добавить:

```html
  <link rel="stylesheet" href="/css/promo-banner.css?v=20260618">
```

Перед `</body>` после `<script src="/js/gallery-modal.js" defer></script>` (~строка 115) добавить:

```html
  <script src="/js/promo-banner.js?v=20260618" defer></script>
```

- [ ] **Step 3: Проверка статических страниц**

Для каждой из `http://localhost:3050/catalog.html`, `/models.html`, `/portfolio.html`: предварительно `sessionStorage.removeItem('promoClosed')`, перезагрузить.
Expected: полоса появляется сверху, layout сдвинут корректно, клик открывает квиз, крестик закрывает.

- [ ] **Step 4: Проверка /pool**

Открыть страницу товара `http://localhost:3050/pool/<слаг>` (слаг взять из каталога). `sessionStorage.removeItem('promoClosed')`, перезагрузить.
Expected: полоса появляется; клик по ней открывает **форму консультации** (на `/pool` нет квиза); в Метрику уходит `promo_click` + `form_opened`; крестик закрывает, после перезагрузки скрыта в рамках сессии.

- [ ] **Step 5: Commit**

```bash
cd ~/good_pools
git add catalog.html models.html portfolio.html views/pool.ejs
git commit -m "feat(promo): подключить промо-баннер на каталог/модели/портфолио и /pool

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the executor

- Dev-сервер: `http://localhost:3050` (уже запущен; если нет — `cd ~/good_pools && npm run dev`).
- Жёсткое обновление кэша CSS/JS в браузере: Cmd+Shift+R.
- Между прогонами визуальных проверок сбрасывать флаг: `sessionStorage.removeItem('promoClosed')`.
- Не делать `git push` — деплой триггерится пушем в `main`; публикуем только по явной просьбе.

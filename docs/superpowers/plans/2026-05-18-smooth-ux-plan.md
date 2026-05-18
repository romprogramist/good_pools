# Smooth UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести движение по всему публичному сайту good_pools (хорошиебассейны.рф) к единому плавному motion-языку: появление секций, hover/press, меню, модалки, попапы, квиз, формы.

**Architecture:** Vanilla CSS custom properties как единый источник правды (длительности, easing, геометрия) + ~80 строк `js/motion.js` с IntersectionObserver-утилитами. Все компонентные стили используют `var(--motion-*)` / `var(--ease-*)` / `var(--reveal-*)` / `var(--hover-*)`. Один media-query `prefers-reduced-motion: reduce` обнуляет всё.

**Tech Stack:** Express + EJS-админка + статические `*.html` + `css/` + `js/` без сборщика; деплой через rsync на `/var/www/good-pools/`.

**Spec:** `docs/superpowers/specs/2026-05-18-smooth-ux-design.md` (commit `b44f25f`).

**Verification model:** Тестов на UI в проекте нет (явное решение спеки). Каждая задача завершается smoke-проверкой в браузере по конкретному чек-листу. Локальный запуск: `npm run dev` → `http://localhost:3050/`. Если dev-сервер уже крутится (port 3050 занят) — пользуемся им.

---

## File Structure

**Создать:**
- `js/motion.js` — foundation: reveal/scroll/header/img-fade утилиты (~80 строк)

**Модифицировать:**
- `css/style.css` — токены в `:root`, базовые стили `[data-reveal]`, `.img-loaded`, `body.header-hidden`, миграция hover/press, scroll-snap на карусели, burger menu slide-in
- `index.html`, `models.html`, `catalog.html`, `portfolio.html` — `<script src="js/motion.js" defer>`, `data-reveal` на секциях, `loading="lazy"` на картинках
- `js/main.js` — `data-reveal-y="sm"` в `catalogCardHtml`, hero stagger-reveal на DOMContentLoaded
- `js/models.js`, `js/portfolio.js` — `data-reveal-y="sm"` на динамически рендерящихся карточках
- `js/gallery-modal.js` — backdrop fade + image scale-up через классы (не inline-стили)
- `css/cookie-banner.css` + `js/cookie-banner.js` — slide-up snizu с задержкой 800мс, slide-out на dismiss
- `css/interest-popup.css` — миграция на токены
- `css/quiz.css` + `js/quiz.js` — переходы между шагами, focus-glow, прогресс-spring, success-чекмарк
- `css/consult.css` + `js/consult.js` — focus-glow, submit-spinner, success-сообщение

**НЕ трогаем:** `server.js`, `routes/`, `db/`, `views/` (админка), `middleware/`, `lib/`, миграции.

---

### Task 1: Motion tokens + reduced-motion baseline

**Files:**
- Modify: `css/style.css` (новый блок в самом начале файла, перед существующим контентом)

**Why first:** все последующие задачи опираются на эти CSS custom properties. Без них код Task 2-6 не имеет смысла.

- [ ] **Step 1: Записать baseline-замеры производительности**

Перед изменениями зафиксировать «было», чтобы в конце сравнить:

```
1. Открыть http://localhost:3050/ в Chrome incognito
2. DevTools → Lighthouse → Mobile → Performance only → Generate report
3. Записать в plan-файл (под этой задачей внизу) значения: Performance score, LCP, CLS, TBT
4. Закрыть DevTools
```

- [ ] **Step 2: Добавить блок motion-токенов в начало `css/style.css`**

Прочитать `css/style.css` (первые ~20 строк) — найти, есть ли там уже `:root {}`. Если есть — добавить переменные в существующий блок. Если нет — вставить новый блок в самое начало файла, ДО любого селектора.

Код для вставки:

```css
/* ===== MOTION DESIGN TOKENS ===== */
:root {
  /* Длительности */
  --motion-fast:   180ms;   /* press, мелкие переключения */
  --motion-base:   280ms;   /* hover, кнопки, модалки */
  --motion-slow:   620ms;   /* появление секций */
  --motion-stage:  900ms;   /* hero, большие герои */

  /* Easings */
  --ease-out:      cubic-bezier(.16, 1, .3, 1);
  --ease-spring:   cubic-bezier(.34, 1.56, .64, 1);
  --ease-press:    cubic-bezier(.4, 0, .2, 1);

  /* Геометрия */
  --reveal-y:      32px;
  --reveal-y-sm:   16px;
  --hover-lift:    -6px;
  --hover-lift-sm: -3px;
  --press-scale:   .97;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 1ms;
    --motion-base: 1ms;
    --motion-slow: 1ms;
    --motion-stage: 1ms;
    --reveal-y: 0;
    --reveal-y-sm: 0;
    --hover-lift: 0;
    --hover-lift-sm: 0;
    --press-scale: 1;
  }
}
/* ===== /MOTION DESIGN TOKENS ===== */
```

- [ ] **Step 3: Бамп cache-busting query в HTML-файлах**

В `index.html`, `models.html`, `catalog.html`, `portfolio.html` найти `css/style.css?v=...` и заменить версию на `?v=20260518-motion1`. Это нужно, чтобы пользователи увидели изменения после деплоя (rsync не меняет mtime, браузер кешит).

Поиск-и-замена в 4 файлах: `style.css?v=20260429-rr1100` → `style.css?v=20260518-motion1`.

- [ ] **Step 4: Verify в браузере — токены доступны**

```
1. http://localhost:3050/ → F5 (hard reload, Ctrl+Shift+R)
2. DevTools → Elements → выбрать <html> → Computed → проверить наличие переменных:
   --motion-base, --ease-spring, --reveal-y, --hover-lift
3. Console → выполнить:
   getComputedStyle(document.documentElement).getPropertyValue('--ease-spring')
   Expected: " cubic-bezier(.34, 1.56, .64, 1)" (или похожее с пробелом)
4. DevTools → Rendering → Emulate CSS media feature "prefers-reduced-motion: reduce"
5. В Console:
   getComputedStyle(document.documentElement).getPropertyValue('--motion-base')
   Expected: " 1ms"
6. Снять эмуляцию reduced-motion
```

Если все 6 проверок прошли → переходим к коммиту. Если переменная пуста — переоткрыть style.css, проверить что блок попал в файл и не закомментирован.

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html models.html catalog.html portfolio.html
git commit -m "feat(motion): design tokens + prefers-reduced-motion baseline"
```

---

### Task 2: Foundation utilities — `js/motion.js` + базовый CSS

**Files:**
- Create: `js/motion.js`
- Modify: `css/style.css` (добавить базовые стили для `[data-reveal]`, `img.img-loaded`, `body.header-hidden`)
- Modify: `index.html`, `models.html`, `catalog.html`, `portfolio.html` (подключить `motion.js`)

- [ ] **Step 1: Создать `js/motion.js`**

Создать файл `js/motion.js` со следующим содержимым (целиком):

```javascript
// good_pools motion utilities — IntersectionObserver reveal, smooth scroll,
// header hide-on-scroll, image fade-in. No dependencies. ~80 LOC.
(function () {
  'use strict';

  // ---------- 1. Reveal on scroll ----------
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: показать всё сразу
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.hasAttribute('data-reveal-stagger')) {
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.setProperty('--stagger-i', i);
            child.classList.add('is-revealed');
          });
        }
        el.classList.add('is-revealed');
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      // Применить delay из data-reveal-delay (мс) как CSS-переменную
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      observer.observe(el);
    });
  }

  // ---------- 2. Hero stagger reveal on DOMContentLoaded ----------
  function initHeroReveal() {
    var heroItems = document.querySelectorAll('[data-reveal-hero]');
    heroItems.forEach(function (el, i) {
      el.style.setProperty('--stagger-i', i);
      // Через rAF чтобы CSS успел применить начальное состояние
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add('is-revealed'); });
      });
    });
  }

  // ---------- 3. Smooth scroll by anchor with header compensation ----------
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var header = document.querySelector('.header');
      var offset = (header && !document.body.classList.contains('header-hidden'))
        ? header.getBoundingClientRect().height + 8
        : 8;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      if (history.pushState) history.pushState(null, '', hash);
    });
  }

  // ---------- 4. Header hide on scroll down, show on scroll up ----------
  function initHeaderScroll() {
    var lastY = window.scrollY;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      var dy = y - lastY;
      if (dy > 8 && y > 100) document.body.classList.add('header-hidden');
      else if (dy < -4) document.body.classList.remove('header-hidden');
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  // ---------- 5. Image fade-in on load ----------
  function initImageFade() {
    document.querySelectorAll('img[loading="lazy"], img[data-fade]').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('img-loaded');
        return;
      }
      img.addEventListener('load', function () { img.classList.add('img-loaded'); }, { once: true });
      img.addEventListener('error', function () { img.classList.add('img-loaded'); }, { once: true });
    });
  }

  function init() {
    initReveal();
    initHeroReveal();
    initSmoothScroll();
    initHeaderScroll();
    initImageFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 2: Добавить базовые CSS-правила в `css/style.css`**

В конец файла `css/style.css` добавить:

```css
/* ===== MOTION FOUNDATION ===== */
[data-reveal] {
  opacity: 0;
  transform: translateY(var(--reveal-y));
  transition:
    opacity var(--motion-slow) var(--ease-spring),
    transform var(--motion-slow) var(--ease-spring);
  transition-delay: calc(var(--reveal-delay, 0ms) + var(--stagger-i, 0) * 80ms);
  will-change: opacity, transform;
}
[data-reveal][data-reveal-y="sm"] { transform: translateY(var(--reveal-y-sm)); }
[data-reveal].is-revealed { opacity: 1; transform: none; }
[data-reveal].is-revealed { will-change: auto; }

/* Hero: дети помеченные data-reveal-hero появляются stagger'ом */
[data-reveal-hero] {
  opacity: 0;
  transform: translateY(var(--reveal-y-sm));
  transition:
    opacity var(--motion-stage) var(--ease-spring),
    transform var(--motion-stage) var(--ease-spring);
  transition-delay: calc(var(--stagger-i, 0) * 120ms);
}
[data-reveal-hero].is-revealed { opacity: 1; transform: none; }

/* Lazy images: fade-in */
img[loading="lazy"], img[data-fade] {
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out);
}
img.img-loaded { opacity: 1; }

/* Header hide on scroll */
.header {
  transition: transform var(--motion-base) var(--ease-out);
  will-change: transform;
}
body.header-hidden .header { transform: translateY(-100%); }

/* Глобальный smooth scroll fallback (на случай если js не загрузился) */
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
/* ===== /MOTION FOUNDATION ===== */
```

- [ ] **Step 3: Подключить `motion.js` в HTML-файлы**

В `index.html`, `models.html`, `catalog.html`, `portfolio.html` найти место, где подключаются другие js-файлы (например `<script src="js/main.js" defer>`) и сразу ПЕРЕД ним добавить:

```html
<script src="js/motion.js?v=20260518-motion1" defer></script>
```

Если в файле нет других `<script>` тегов в конце body — добавить перед закрывающим `</body>`.

Также бампнуть `style.css?v=...` → `style.css?v=20260518-motion2` (новый bump, потому что CSS-файл снова поменялся).

- [ ] **Step 4: Verify — фундамент работает без визуальных регрессий**

```
1. http://localhost:3050/ → hard reload (Ctrl+Shift+R)
2. DevTools → Console → проверить: нет ошибок (никаких красных)
3. DevTools → Network → проверить что motion.js загрузился (200, ~3 KB)
4. Скроллить страницу вниз ~200px → header плавно уезжает вверх
5. Скроллить хоть чуть-чуть вверх → header возвращается
6. Visual check: страница выглядит как раньше (никакие секции не "пропали",
   потому что data-reveal ещё не навешен ни на одну существующую секцию).
7. Открыть models.html, catalog.html, portfolio.html — тоже без ошибок,
   header hide/show работает.
```

Если есть ошибки в консоли — открыть js/motion.js, искать опечатки.

- [ ] **Step 5: Commit**

```bash
git add js/motion.js css/style.css index.html models.html catalog.html portfolio.html
git commit -m "feat(motion): foundation utilities (reveal/scroll/header/img-fade)"
```

---

### Task 3: Area A — Section reveals + image fade-in

**Files:**
- Modify: `index.html`, `models.html`, `catalog.html`, `portfolio.html` (`data-reveal` на секции, `loading="lazy"` на img)
- Modify: `js/main.js` (1) hero stagger через `data-reveal-hero`, (2) `catalogCardHtml` добавить `data-reveal-y="sm"` на динамические карточки
- Modify: `js/models.js`, `js/portfolio.js` (`data-reveal-y="sm"` на динамических карточках, если они там рендерятся)

- [ ] **Step 1: Разметить секции на `index.html`**

Открыть `index.html`. Добавить атрибут `data-reveal` на следующие секционные элементы (НЕ трогать `.hero` — у неё особое поведение):

```html
<!-- БЫЛО -->
<section class="catalog">
<!-- СТАЛО -->
<section class="catalog" data-reveal>

<!-- БЫЛО -->
<section class="portfolio">
<!-- СТАЛО -->
<section class="portfolio" data-reveal>

<!-- БЫЛО -->
<section class="rr" id="render-reality">
<!-- СТАЛО -->
<section class="rr" id="render-reality" data-reveal>
```

Дочитать `index.html` до конца, найти все остальные `<section ...>` (showroom, отзывы, форма консультации, footer, ask, service) и каждой добавить `data-reveal`.

На сетках карточек добавить `data-reveal-stagger`:

```html
<!-- БЫЛО -->
<div class="cat-grid" id="catGrid">
<!-- СТАЛО -->
<div class="cat-grid" id="catGrid" data-reveal data-reveal-stagger>
```

То же — для `.port-featured`, любых других контейнеров-сеток.

- [ ] **Step 2: Hero stagger через `data-reveal-hero`**

В `index.html` в блоке `<section class="hero">` пометить главные элементы как hero-stagger:

```html
<!-- БЫЛО -->
<div class="hero-title">
  <span class="bold">ХОРОШИЕ</span>
  <span class="thin">БАССЕЙНЫ</span>
</div>

<div class="hero-tags">
  <span>НАДЕЖНОСТЬ</span>
  <span>КРАСОТА</span>
  <span>ПРОЗРАЧНОСТЬ</span>
</div>
<!-- СТАЛО -->
<div class="hero-title" data-reveal-hero>
  <span class="bold">ХОРОШИЕ</span>
  <span class="thin">БАССЕЙНЫ</span>
</div>

<div class="hero-tags" data-reveal-hero>
  <span>НАДЕЖНОСТЬ</span>
  <span>КРАСОТА</span>
  <span>ПРОЗРАЧНОСТЬ</span>
</div>
```

Также добавить `data-reveal-hero` на `.hero-cta` (контейнер с кнопкой).

Карусель `.carousel-container` НЕ помечать — она и так визуально яркая, любая дополнительная анимация будет лишней.

- [ ] **Step 3: Динамически рендерящиеся карточки получают `data-reveal-y="sm"`**

Открыть `js/main.js`. Найти функцию `catalogCardHtml` (строка ~156). Найти строку, которая начинается с `'<a href="' + link + '" class="pcard'` — добавить туда `data-reveal data-reveal-y="sm"`:

```javascript
// БЫЛО
return (
  '<a href="' + link + '" class="pcard' + (isFeatured ? ' featured' : '') + (isFullWidth ? ' fullwidth' : '') + '">' +
// СТАЛО
return (
  '<a href="' + link + '" class="pcard' + (isFeatured ? ' featured' : '') + (isFullWidth ? ' fullwidth' : '') + '" data-reveal data-reveal-y="sm">' +
```

Также в той же функции после рендера карточек нужно пнуть наблюдатель, потому что они добавлены в DOM после первичного init. В конце блока `if (catGrid && typeof DataSource !== 'undefined') {`:

```javascript
// БЫЛО (после catGrid.innerHTML = html;)
catGrid.innerHTML = html;
// ДОБАВИТЬ:
if (window.Motion && window.Motion.observeNew) window.Motion.observeNew(catGrid);
```

Чтобы это работало, в `js/motion.js` в конце добавить public API (между `function init()` и блоком с DOMContentLoaded):

```javascript
window.Motion = {
  observeNew: function (root) {
    if (!('IntersectionObserver' in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    (root || document).querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el) {
      obs.observe(el);
    });
  }
};
```

- [ ] **Step 4: Аналогично для `js/models.js` и `js/portfolio.js`**

Открыть `js/models.js`, найти места где формируется HTML карточки моделей (обычно `'<a ... class="...">' + ...`). Добавить туда `data-reveal data-reveal-y="sm"`. После `innerHTML =` вызвать `window.Motion.observeNew(...)`.

То же для `js/portfolio.js`.

- [ ] **Step 5: `loading="lazy"` на все НЕ-hero картинки**

В `index.html`, `models.html`, `catalog.html`, `portfolio.html` пробежаться по всем `<img>` тегам, у которых ещё нет `loading="lazy"`. Добавить.

Исключение — картинки внутри `<section class="hero">` (если есть): они в первом экране, lazy на них не нужен и даже вреден.

Для динамически рендерящихся `<img>` в `main.js` (`pcard-img`), `gallery-modal.js` — пока не трогаем, они и так появляются поздно.

- [ ] **Step 6: Бамп version**

В 4 HTML файлах поменять:
- `style.css?v=20260518-motion2` → `style.css?v=20260518-motion3`
- `js/motion.js?v=20260518-motion1` → `js/motion.js?v=20260518-motion2`
- Также `js/main.js?v=...` → бамп на `20260518-motion3` (если в HTML висит cache-buster)

- [ ] **Step 7: Verify — секции «выезжают», картинки fade-in**

```
1. http://localhost:3050/ → hard reload
2. Console: нет ошибок
3. Скроллить главную сверху донизу медленно
4. Каждая секция должна:
   - стартовать невидимой (opacity 0, чуть смещена вниз)
   - при подскролле плавно появиться (opacity 1 + transform 0)
   - НЕ повторять анимацию при обратном скролле
5. Карточки в .cat-grid появляются волной (stagger), не все одновременно
6. Hero: при загрузке заголовок + теги + CTA появляются по очереди
7. Картинки fade-in (не появляются резко)
8. Reduced motion: DevTools → Rendering → emulate reduce → reload → секции
   видны мгновенно, без выезда; всё работает кликабельно
9. Открыть models.html, catalog.html, portfolio.html — тоже работает
```

- [ ] **Step 8: Commit**

```bash
git add index.html models.html catalog.html portfolio.html js/main.js js/motion.js js/models.js js/portfolio.js
git commit -m "feat(motion): section reveals + image fade-in on public pages"
```

---

### Task 4: Area B — Unified hover/press + carousel snap

**Files:**
- Modify: `css/style.css` — мигрировать ховеры карточек/кнопок на токены, добавить `:active`, `@media (hover:hover)` для hover-блоков, scroll-snap на карусели

- [ ] **Step 1: Карточки `.pcard` — миграция hover на токены**

В `css/style.css` найти селектор `.pcard:hover` (строка ~759). Заменить:

```css
/* БЫЛО */
.pcard {
  ...
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  ...
}

.pcard:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

/* СТАЛО */
.pcard {
  ...
  transition:
    transform var(--motion-base) var(--ease-spring),
    box-shadow var(--motion-base) var(--ease-spring);
  ...
}

@media (hover: hover) {
  .pcard:hover {
    transform: translateY(var(--hover-lift));
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
}

.pcard:active {
  transform: scale(var(--press-scale));
  transition:
    transform var(--motion-fast) var(--ease-press),
    box-shadow var(--motion-fast) var(--ease-press);
}
```

Внимание: оставить `transition: all` лишь если в этом селекторе действительно меняется много свойств. Если только transform/box-shadow — явно перечислить (производительнее, чем `all`).

- [ ] **Step 2: Категории `.category-card` — то же лечение**

Найти `.category-card:hover` (строка ~510). Аналогично:

```css
/* БЫЛО */
.category-card {
  ...
}

.category-card:hover {
  transform: translateY(-8px);
}

/* СТАЛО */
.category-card {
  ...
  transition: transform var(--motion-base) var(--ease-spring);
}

@media (hover: hover) {
  .category-card:hover {
    transform: translateY(var(--hover-lift));
  }
}

.category-card:active {
  transform: scale(var(--press-scale));
  transition: transform var(--motion-fast) var(--ease-press);
}
```

- [ ] **Step 3: Кнопка hero CTA + общие CTA**

Найти `.hero-cta-btn:hover` (строка ~456):

```css
/* БЫЛО */
.hero-cta-btn:hover {
  background: #e4e4e7;
  transform: translateY(-2px);
}

/* СТАЛО — добавить базовый transition на .hero-cta-btn ВЫШЕ (где он определяется), а :hover вынести в hover-media */

.hero-cta-btn {
  ...
  transition:
    background var(--motion-base) var(--ease-out),
    transform var(--motion-base) var(--ease-spring),
    box-shadow var(--motion-base) var(--ease-out);
}

@media (hover: hover) {
  .hero-cta-btn:hover {
    background: #e4e4e7;
    transform: translateY(var(--hover-lift-sm));
    box-shadow: 0 12px 24px -8px rgba(0, 0, 0, .3);
  }
}

.hero-cta-btn:active {
  transform: scale(var(--press-scale));
  transition: transform var(--motion-fast) var(--ease-press);
}
```

- [ ] **Step 4: Стрелки `.btn-all-top` (с `→`)**

Найти `.btn-all-top .arrow { font-size: 18px; transition: transform 0.3s; }`. Заменить:

```css
/* БЫЛО */
.btn-all-top .arrow { font-size: 18px; transition: transform 0.3s; }
.btn-all-top:hover .arrow { transform: translateX(5px); }

/* СТАЛО */
.btn-all-top .arrow {
  font-size: 18px;
  transition: transform var(--motion-base) var(--ease-spring);
}

@media (hover: hover) {
  .btn-all-top:hover .arrow { transform: translateX(5px); }
}
```

- [ ] **Step 5: Carousel arrows — добавить press-state и обернуть hover**

Найти `.carousel-arrow` (строка ~564). Конкретные строки нужно прочитать на месте, но общий паттерн:

```css
/* Базовый transition на .carousel-arrow — мигрировать на токены */
.carousel-arrow {
  ...
  transition:
    background var(--motion-base) var(--ease-out),
    transform var(--motion-base) var(--ease-spring),
    box-shadow var(--motion-base) var(--ease-out);
}

@media (hover: hover) {
  .carousel-arrow:hover {
    /* существующие правила */
    transform: scale(1.1);
  }
}

.carousel-arrow:active {
  transform: scale(0.92);
  transition: transform var(--motion-fast) var(--ease-press);
}
```

- [ ] **Step 6: Scroll-snap на карусели категорий**

Найти `.carousel-track` (можно через Grep). Добавить:

```css
.carousel-track {
  ...existing...
  scroll-snap-type: x mandatory;
  scroll-padding-left: 16px;
  -webkit-overflow-scrolling: touch;
}
```

Карточка `.category-card` (строка ~500): подтвердить что `scroll-snap-align: start;` уже есть (видел в Grep — да, есть на строке 502). Если ещё не было — добавить.

- [ ] **Step 7: Bump version → motion4**

В 4 HTML файлах: `style.css?v=20260518-motion3` → `style.css?v=20260518-motion4`.

- [ ] **Step 8: Verify — hover/press единый, mobile нормально**

```
1. http://localhost:3050/ → hard reload
2. Desktop: навести на 3 карточки в .cat-grid → у всех одинаковый
   подъём (-6px) + усиление тени + лёгкий spring-overshoot
3. Кликнуть на карточке (mousedown, не отпуская) → лёгкий press
   (scale 0.97)
4. Навести на «Все модели →» → стрелка плавно сдвигается вправо
5. Навести на стрелку карусели → scale 1.1; clik → press scale 0.92
6. Карусель: скроллить вправо/влево пальцем (или drag scrollbar) →
   карточки «прилипают» к началу при остановке
7. Mobile emulation (DevTools → iPhone 13):
   - тап по карточке → НЕ должно остаться «залипшего» подъёма
     после отпускания (это то, что лечит @media (hover: hover))
   - press-state работает
8. Открыть models.html, catalog.html, portfolio.html — пройтись
   по ховерам, визуальная регрессия?
```

- [ ] **Step 9: Commit**

```bash
git add css/style.css index.html models.html catalog.html portfolio.html
git commit -m "feat(motion): unified hover/press across cards and buttons + carousel snap"
```

---

### Task 5: Area C — Menu, modals, popup, cookie

**Files:**
- Modify: `css/style.css` (`.menu-overlay`, `.menu-bg`, `.hamburger` — миграция на токены, slide-from-right для контейнера)
- Modify: `js/main.js` (бургер уже работает через `.open` — не трогать логику, только убедиться что body-scroll-lock компенсирует scrollbar)
- Modify: `js/gallery-modal.js` (заменить hidden=true/false + inline overflow на классы; добавить fade-in/out)
- Modify: `css/interest-popup.css` (мигрировать на токены — найти существующие transition'ы, заменить)
- Modify: `css/cookie-banner.css` + `js/cookie-banner.js` (slide-up snizu с задержкой 800мс, slide-out на dismiss)

- [ ] **Step 1: Бургер-меню — slide-from-right для контейнера**

В `css/style.css` найти блок `.menu-overlay { ... }` (~строка 215). Сейчас контейнер просто через `visibility` появляется, контент уже staggered. Дополнить:

```css
/* БЫЛО */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  pointer-events: none;
  visibility: hidden;
}

.menu-overlay.open {
  pointer-events: all;
  visibility: visible;
}

/* СТАЛО */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  pointer-events: none;
  visibility: hidden;
  opacity: 0;
  transition:
    opacity var(--motion-base) var(--ease-out),
    visibility 0s linear var(--motion-base);
}

.menu-overlay.open {
  pointer-events: all;
  visibility: visible;
  opacity: 1;
  transition:
    opacity var(--motion-base) var(--ease-out),
    visibility 0s linear 0s;
}
```

И мигрировать `.menu-bg` на токены (строка ~231):

```css
/* БЫЛО */
.menu-bg {
  ...
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
/* СТАЛО */
.menu-bg {
  ...
  transition: opacity var(--motion-base) var(--ease-out);
}
```

Hamburger lines (строка ~52):

```css
/* БЫЛО */
.hamburger span {
  ...
  transition: all 0.3s;
}
/* СТАЛО */
.hamburger span {
  ...
  transition:
    transform var(--motion-base) var(--ease-spring),
    opacity var(--motion-base) var(--ease-out);
}
```

Staggered menu-link delays (строки 272-276) НЕ трогать — они хорошо подобраны под существующее ощущение.

- [ ] **Step 2: Body scroll-lock + scrollbar compensation**

В `css/style.css` найти `body.menu-open` (или похожее, прогрепать). Если правила только `overflow: hidden` — добавить компенсацию:

```css
body.menu-open {
  overflow: hidden;
  padding-right: var(--scrollbar-width, 0px);
}
```

В `js/main.js` найти место где навешивается `body.classList.toggle('menu-open')` (видно в Read'е — строка 107). До toggle посчитать ширину scrollbar:

```javascript
// БЫЛО
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  menuOverlay.classList.toggle('open');
  document.body.classList.toggle('menu-open');
});

// СТАЛО
hamburger.addEventListener('click', () => {
  if (!menuOverlay.classList.contains('open')) {
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', sbw + 'px');
  }
  hamburger.classList.toggle('active');
  menuOverlay.classList.toggle('open');
  document.body.classList.toggle('menu-open');
});
```

- [ ] **Step 3: Gallery modal — fade backdrop + scale image**

В `js/gallery-modal.js` найти функции `open(item)` (строка ~146) и `close()` (строка ~163). Заменить логику показа с inline overflow на классы:

```javascript
// В open():
// БЫЛО
modalEl.hidden = false;
closeBtn.focus();

// СТАЛО
modalEl.hidden = false;
// Принудительный reflow перед добавлением класса (чтобы transition сработал)
void modalEl.offsetWidth;
modalEl.classList.add('is-open');
closeBtn.focus();
```

```javascript
// В close():
// БЫЛО
modalEl.hidden = true;
document.body.style.overflow = prevBodyOverflow;

// СТАЛО
modalEl.classList.remove('is-open');
setTimeout(function () {
  modalEl.hidden = true;
}, 300); // = --motion-base
document.body.style.overflow = prevBodyOverflow;
```

В `css/style.css` найти существующий блок `.pgal-modal { ... }` (есть, ~8 упоминаний `.pgal-*` в style.css). К нему добавить opacity/transition либо отдельным правилом перед `:has`-селекторами:

```css
/* Добавить рядом с другими .pgal-* правилами или в конец файла */
.pgal-modal {
  /* существующие правила сохраняем; добавляем: */
  opacity: 0;
  transition: opacity var(--motion-base) var(--ease-out);
}
.pgal-modal.is-open { opacity: 1; }

.pgal-image {
  /* существующие правила сохраняем; добавляем transition + начальный scale: */
  transform: scale(.96);
  transition: transform var(--motion-base) var(--ease-spring);
}
.pgal-modal.is-open .pgal-image { transform: scale(1); }
```

Внимание: НЕ дублируй существующий `.pgal-modal { ... }` блок — если правила уже есть, дополни их этими опасити/transition строчками внутри того же блока (или добавь отдельный `.pgal-modal { opacity: 0; transition: ... }` ПОСЛЕ существующего, чтобы переопределить).

- [ ] **Step 4: Interest popup — миграция на токены**

Прочитать `css/interest-popup.css` полностью. Найти все `transition:` строки. Заменить hard-coded длительности на `var(--motion-base)`, easings на `var(--ease-spring)` (для transform) и `var(--ease-out)` (для opacity).

Не менять геометрию (translate, scale) — только тайминги/кривые.

- [ ] **Step 5: Cookie banner — slide-up с задержкой + slide-out**

Перезаписать `css/cookie-banner.css` целиком:

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
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
  font-size: 14px;
  line-height: 1.4;

  opacity: 0;
  transform: translateY(120%);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-spring);
}

.cookie-banner.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.cookie-banner.is-leaving {
  opacity: 0;
  transform: translateY(120%);
  transition:
    opacity var(--motion-base) var(--ease-out),
    transform var(--motion-base) var(--ease-out);
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
  transition: background var(--motion-fast) var(--ease-out);
}
.cookie-banner__btn:hover { background: #0284c7; }

@media (max-width: 480px) {
  .cookie-banner { flex-direction: column; align-items: stretch; }
  .cookie-banner__btn { width: 100%; }
}
```

Перезаписать `js/cookie-banner.js` целиком:

```javascript
(function () {
  'use strict';

  const STORAGE_KEY = 'cookieAccepted';

  function init() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch (_) { /* localStorage unavailable — show anyway */ }

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

    // Задержка 800мс перед slide-in, чтобы не выпрыгивал в лицо при загрузке
    setTimeout(function () {
      banner.classList.add('is-visible');
    }, 800);

    banner.querySelector('.cookie-banner__btn').addEventListener('click', function () {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) { /* ignore */ }
      banner.classList.remove('is-visible');
      banner.classList.add('is-leaving');
      setTimeout(function () { banner.remove(); }, 320); // = --motion-base + buffer
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 6: Bump versions**

В 4 HTML файлах: `style.css?v=20260518-motion4` → `motion5`; `cookie-banner.css?v=20260505` → `motion5`; `interest-popup.css` если есть — бамп. Также `js/cookie-banner.js`, `js/gallery-modal.js`, `js/main.js`, `js/motion.js`, `js/interest-popup.js` — везде где висит cache-buster, бамп до `motion5`.

- [ ] **Step 7: Verify — модалки/меню/попап/cookie плавные**

```
1. http://localhost:3050/ → hard reload
2. Бургер-меню: тап на гамбургер → плавный fade-in оверлея +
   три полоски превращаются в крест без рывка. Линки появляются
   stagger'ом (это и было). Тап на ссылке → плавно закрывается
   и переходит/скроллит к якорю
3. Очистить localStorage (DevTools → Application → Storage → Clear)
   → hard reload → через ~800ms cookie banner snizu выезжает.
   Тап «Принять» → плавно уезжает вниз → исчезает.
4. Перезагрузить — cookie banner НЕ появляется (cookie уже принят)
5. Открыть galleries: portfolio.html → клик на фото →
   modal плавно проявляется (backdrop fade + image scale-up).
   Клик «×» → плавно закрывается. Клик outside → закрывается.
   Esc → закрывается.
6. Interest popup: дождаться триггера или вызвать вручную через
   js-консоль (если есть public API), проверить плавность open/close
7. Reduced motion: эмулировать → все модалки/меню открываются
   мгновенно, без анимаций, но полностью функциональны
```

- [ ] **Step 8: Commit**

```bash
git add css/style.css css/cookie-banner.css css/interest-popup.css js/main.js js/gallery-modal.js js/cookie-banner.js index.html models.html catalog.html portfolio.html
git commit -m "feat(motion): animated burger menu + modal/popup/cookie polish"
```

---

### Task 6: Area D — Quiz step transitions + form polish

**Files:**
- Modify: `css/quiz.css` — переходы между шагами, focus-glow, progress-bar spring, success
- Modify: `js/quiz.js` — добавить классы `.is-leaving` и `.is-entering` вокруг render(), SVG чекмарк в success
- Modify: `css/consult.css` — focus-glow на полях
- Modify: `js/consult.js` — submit-spinner state, success classes

- [ ] **Step 1: Quiz step transitions**

В `css/quiz.css` добавить (в конец файла):

```css
/* ===== QUIZ MOTION ===== */
[data-quiz-body] {
  position: relative;
  min-height: 240px; /* чтобы не дёргалось при подмене content */
}

.quiz-body-inner {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity var(--motion-base) var(--ease-out),
    transform var(--motion-base) var(--ease-spring);
}

.quiz-body-inner.is-leaving {
  opacity: 0;
  transform: translateX(-20px);
}

.quiz-body-inner.is-entering {
  opacity: 0;
  transform: translateX(20px);
}

/* Back direction: зеркально */
.quiz-body-inner.is-leaving-back {
  transform: translateX(20px);
  opacity: 0;
}
.quiz-body-inner.is-entering-back {
  transform: translateX(-20px);
  opacity: 0;
}

/* Поля квиза: focus-glow */
.quiz-input {
  transition:
    border-color var(--motion-fast) var(--ease-out),
    box-shadow var(--motion-fast) var(--ease-out);
}
.quiz-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, .15);
}

/* Quiz option buttons: press */
.quiz-option {
  transition:
    background var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-press);
}
.quiz-option:active {
  transform: scale(var(--press-scale));
}

/* Submit button spinner state */
.quiz-btn.is-loading {
  pointer-events: none;
  color: transparent;
  position: relative;
}
.quiz-btn.is-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  color: #fff;
  animation: quiz-spin .8s linear infinite;
}
@keyframes quiz-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .quiz-btn.is-loading::after { animation: none; border-right-color: currentColor; }
}

/* Success: SVG checkmark draw-in */
.quiz-thanks-check {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  display: block;
}
.quiz-thanks-check circle {
  fill: none;
  stroke: #10b981;
  stroke-width: 2;
  stroke-dasharray: 220;
  stroke-dashoffset: 220;
  animation: quiz-circle-draw .5s var(--ease-out) forwards;
}
.quiz-thanks-check path {
  fill: none;
  stroke: #10b981;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: quiz-check-draw .35s var(--ease-out) .35s forwards;
}
@keyframes quiz-circle-draw { to { stroke-dashoffset: 0; } }
@keyframes quiz-check-draw  { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .quiz-thanks-check circle, .quiz-thanks-check path { animation: none; stroke-dashoffset: 0; }
}
/* ===== /QUIZ MOTION ===== */
```

- [ ] **Step 2: Quiz step transitions — JS-сторона**

В `js/quiz.js` обернуть `body.innerHTML = inner + renderNav();` (строка ~257) в timing-логику. Заменить функцию `render()` целиком:

```javascript
// БЫЛО (строка ~247-263)
function render() {
  const dlg = document.getElementById(DIALOG_ID);
  if (!dlg) return;
  const body = dlg.querySelector('[data-quiz-body]');
  if (!body) return;
  const step = STEPS[state.step - 1];
  let inner = '';
  if (step.type === 'single')        inner = renderSingle(step);
  else if (step.type === 'multi')    inner = renderMulti(step);
  else if (step.type === 'contacts') inner = renderContacts(step);
  body.innerHTML = inner + renderNav();

  if (step.type === 'contacts' && window.ConsentHelper) {
    const submitBtn = body.querySelector('[data-quiz-submit]');
    if (submitBtn) window.ConsentHelper.attach(body, submitBtn);
  }
}

// СТАЛО
var __lastDirection = 'forward';

function render(direction) {
  const dlg = document.getElementById(DIALOG_ID);
  if (!dlg) return;
  const body = dlg.querySelector('[data-quiz-body]');
  if (!body) return;
  const step = STEPS[state.step - 1];
  let inner = '';
  if (step.type === 'single')        inner = renderSingle(step);
  else if (step.type === 'multi')    inner = renderMulti(step);
  else if (step.type === 'contacts') inner = renderContacts(step);

  const isBack = direction === 'back';
  const oldInner = body.querySelector('.quiz-body-inner');

  function mount() {
    body.innerHTML = '<div class="quiz-body-inner ' + (isBack ? 'is-entering-back' : 'is-entering') + '">' + inner + renderNav() + '</div>';
    var newInner = body.querySelector('.quiz-body-inner');
    if (step.type === 'contacts' && window.ConsentHelper) {
      const submitBtn = body.querySelector('[data-quiz-submit]');
      if (submitBtn) window.ConsentHelper.attach(body, submitBtn);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        newInner.classList.remove('is-entering', 'is-entering-back');
      });
    });
  }

  if (oldInner) {
    oldInner.classList.add(isBack ? 'is-leaving-back' : 'is-leaving');
    setTimeout(mount, 280); // = --motion-base
  } else {
    mount();
  }
}
```

Заменить вызовы `render()` на `render('forward')` / `render('back')` в трёх местах функции `onBodyClick` (строки ~265-300):

- В блоке `[data-quiz-back]`: `render();` → `render('back');`
- В блоке `[data-quiz-next]`: `render();` → `render('forward');`
- В блоке pick + toggle: `render();` → `render('forward');` (или просто `render()` — текущее поведение OK для in-place rerender; чтобы не было анимации при выборе опции на том же шаге, можно использовать direction='same' и не делать leave/enter)

Для опций (`pick` и `toggle`) лучше НЕ запускать переход (это перерисовка того же шага):

```javascript
// Внутри блока pick:
if (step.type === 'single') {
  state.answers[step.id] = pick.getAttribute('data-quiz-pick');
  renderSame();
}
// Внутри toggle:
const idx = arr.indexOf(value);
if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
renderSame();
```

Добавить функцию `renderSame()` — это просто `render()` без direction-классов:

```javascript
function renderSame() {
  // Просто перерендерить inner без animation transitions
  const dlg = document.getElementById(DIALOG_ID);
  if (!dlg) return;
  const body = dlg.querySelector('[data-quiz-body]');
  if (!body) return;
  const step = STEPS[state.step - 1];
  let inner = '';
  if (step.type === 'single')        inner = renderSingle(step);
  else if (step.type === 'multi')    inner = renderMulti(step);
  else if (step.type === 'contacts') inner = renderContacts(step);
  body.innerHTML = '<div class="quiz-body-inner">' + inner + renderNav() + '</div>';
  if (step.type === 'contacts' && window.ConsentHelper) {
    const submitBtn = body.querySelector('[data-quiz-submit]');
    if (submitBtn) window.ConsentHelper.attach(body, submitBtn);
  }
}
```

Также `openQuiz()` (строка ~96) вызывает `render()` — заменить на `renderSame()` (первый показ, без направления).

- [ ] **Step 3: Success экран — SVG чекмарк**

В `js/quiz.js` найти функцию `showThankYou()` (строка ~233). Заменить:

```javascript
// БЫЛО
function showThankYou() {
  const dlg = document.getElementById(DIALOG_ID);
  if (!dlg) return;
  const body = dlg.querySelector('[data-quiz-body]');
  if (!body) return;
  body.innerHTML = `
    <div class="quiz-thanks">
      <h3 class="quiz-thanks-title">Спасибо! Заявка принята</h3>
      <p class="quiz-thanks-text">Менеджер свяжется с вами в течение 10 минут</p>
      <button type="button" class="quiz-btn quiz-btn--next" data-quiz-close>Закрыть</button>
    </div>
  `;
}

// СТАЛО
function showThankYou() {
  const dlg = document.getElementById(DIALOG_ID);
  if (!dlg) return;
  const body = dlg.querySelector('[data-quiz-body]');
  if (!body) return;
  body.innerHTML = `
    <div class="quiz-body-inner">
      <div class="quiz-thanks">
        <svg class="quiz-thanks-check" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="35"/>
          <path d="M24 41 L36 53 L57 30"/>
        </svg>
        <h3 class="quiz-thanks-title">Спасибо! Заявка принята</h3>
        <p class="quiz-thanks-text">Менеджер свяжется с вами в течение 10 минут</p>
        <button type="button" class="quiz-btn quiz-btn--next" data-quiz-close>Закрыть</button>
      </div>
    </div>
  `;
}
```

Также в `handleSubmit()` (строка ~198) — добавить spinner-state на кнопку submit ПЕРЕД отправкой fetch:

```javascript
// БЫЛО (внутри handleSubmit, перед fetch)
fetch('/api/leads', {

// СТАЛО
var submitBtn = document.querySelector('[data-quiz-submit]');
if (submitBtn) submitBtn.classList.add('is-loading');

fetch('/api/leads', {
```

- [ ] **Step 4: Consult form — focus-glow + spinner + success**

Реальные селекторы (проверены в `css/consult.css`): `.consult-input`, `.consult-submit`. `textarea` в форме нет. Уже существуют:
- `.consult-input:focus { border-color: #0ea5e9; outline: none; }` (строка 63) — без glow, без transition
- `.consult-submit { ... transition: transform .2s, box-shadow .2s; }` (строка 79) — hard-coded
- `.consult-submit:hover { transform: translateY(-2px); ... }` (строка 81)
- `@media (prefers-reduced-motion: reduce) { .consult-submit { transition: none; } .consult-submit:hover { transform: none; } }` (строка 106-109)

План: ЗАМЕНИТЬ существующие правила hover/focus/reduced-motion на token-based + добавить glow и `.is-loading` spinner. Финальный блок в `css/consult.css` (заменяет три старых блока + добавляет новое):

```css
/* ===== CONSULT MOTION (заменяет старые правила :focus и :hover на consult-submit) ===== */
.consult-input {
  transition:
    border-color var(--motion-fast) var(--ease-out),
    box-shadow var(--motion-fast) var(--ease-out);
}
.consult-input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 4px rgba(14, 165, 233, .15);
}

.consult-submit {
  /* Заменить hard-coded "transition: transform .2s, box-shadow .2s" на: */
  transition:
    background var(--motion-fast) var(--ease-out),
    transform var(--motion-base) var(--ease-spring),
    box-shadow var(--motion-base) var(--ease-out);
}
@media (hover: hover) {
  .consult-submit:hover {
    transform: translateY(var(--hover-lift-sm));
    box-shadow: 0 8px 28px rgba(14, 165, 233, 0.35);
  }
}
.consult-submit:active { transform: scale(var(--press-scale)); }

.consult-submit.is-loading {
  pointer-events: none;
  color: transparent;
  position: relative;
}
.consult-submit.is-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  color: #fff;
  animation: quiz-spin .8s linear infinite;
}

/* Старый @media (prefers-reduced-motion) блок в consult.css можно удалить —
   тайминги теперь идут через токены, которые сами обнуляются в reduced-motion. */
/* ===== /CONSULT MOTION ===== */
```

При редактировании файла: найти и УДАЛИТЬ старые блоки `.consult-input:focus` (стр. 63), `.consult-submit:hover` (стр. 81), `@media (prefers-reduced-motion: reduce)` (стр. 106-109), и заменить `transition: transform .2s, box-shadow .2s;` в `.consult-submit` (стр. 79) на новое. Затем приклеить блок выше в конец файла.

В `js/consult.js` найти место отправки формы (вероятно `fetch(...)` для лида). Перед fetch — добавить `.is-loading` на кнопку submit; после ответа (success или error) — снять. На success — заменить форму на блок с `data-reveal` и сообщением «Спасибо».

Конкретная вставка зависит от структуры файла — прочитать `js/consult.js` целиком на месте.

- [ ] **Step 5: Bump versions**

В 4 HTML файлах: `quiz.css?v=20260430-center` → `quiz.css?v=20260518-motion6`; `consult.css?v=20260430` → `consult.css?v=20260518-motion6`; `js/quiz.js`, `js/consult.js` — бамп до `motion6` (если в cache-buster в HTML).

- [ ] **Step 6: Verify — квиз и форма плавные**

```
1. http://localhost:3050/ → hard reload
2. Нажать "РАССЧИТАТЬ СТОИМОСТЬ" → квиз открылся (dialog showModal —
   браузерная анимация). Шаг 1 виден.
3. Тап на опцию — выделилась мгновенно (renderSame без перехода)
4. Тап "ДАЛЕЕ →" → текущий шаг fade+уехал влево, новый
   въезжает справа. Кнопка "← НАЗАД" появилась.
5. Тап "← НАЗАД" → зеркально (текущий вправо, новый слева)
6. Дойти до шага 6 (контакты). Тап в поле "Имя" → border меняет цвет,
   появляется лёгкий glow. То же — для phone.
7. Заполнить, тап "ПОЛУЧИТЬ ПРЕДЛОЖЕНИЕ" → кнопка превращается в
   спиннер. Через ~200ms — success-экран с чекмарком, который
   рисуется (круг → галочка).
8. Закрыть, открыть форму консультации (если на главной есть) →
   focus-glow на полях работает.
9. Reduced motion: эмулировать → переходы между шагами мгновенные,
   спиннер не крутится (статичная иконка), чекмарк нарисован
   сразу. Квиз функционален.
```

- [ ] **Step 7: Commit**

```bash
git add css/quiz.css css/consult.css js/quiz.js js/consult.js index.html models.html catalog.html portfolio.html
git commit -m "feat(motion): quiz step transitions + form focus polish"
```

---

### Task 7: Final perf delta + full reduced-motion pass

**Files:** только проверки, никаких изменений кода (но если найдём баг — коммитим fix отдельным коммитом).

- [ ] **Step 1: Lighthouse delta**

```
1. http://localhost:3050/ → Chrome incognito → DevTools → Lighthouse
2. Mobile → Performance only → Generate report
3. Сравнить с baseline из Task 1 / Step 1:
   - Performance score: не упал больше чем на 2 пункта
   - LCP: не вырос больше чем на 100ms
   - CLS: не должен сильно измениться (≤ 0.01 dif)
   - TBT: ±50ms
```

Если упало сильнее — посмотреть в Performance panel что именно ест время. Подозрительные места: слишком много IntersectionObserver targets (мы создаём 2 наблюдателя для динамических карточек — это OK для < 50 целей). Slow-CSS rules (`will-change` на десятках элементов одновременно — мы ставим только пока `is-revealed` не сработал, потом снимаем).

- [ ] **Step 2: FPS-замер скролла**

```
1. DevTools → Performance → Record
2. Скроллить главную сверху донизу за ~5 секунд
3. Stop record
4. Смотреть FPS bar сверху:
   - Desktop: ≥ 55 fps на большей части
   - Mobile emulation (CPU 4× slowdown, iPhone 13):
     ≥ 40 fps приемлемо
```

- [ ] **Step 3: Полный reduced-motion pass**

```
1. DevTools → Rendering → emulate prefers-reduced-motion: reduce
2. Hard reload главной
3. Пройтись по всему чек-листу из Task 3 / 4 / 5 / 6 Verify-шагов:
   - Секции появляются мгновенно (нет fade/slide)
   - Hover: без подъёма, только цвет/тень
   - Press: без scale
   - Burger menu: открывается мгновенно
   - Gallery modal: open/close без fade/scale
   - Cookie banner: появляется без slide-up (но всё ещё с
     задержкой 800мс — это не motion, а UX-задержка, оставляем)
   - Quiz steps: переключаются мгновенно
   - Quiz spinner: статичная окружность, не вращается
   - Quiz success checkmark: нарисован сразу, не draws
4. Сайт должен оставаться полностью функциональным
```

- [ ] **Step 4: Регрессионный пробег по другим страницам**

```
1. http://localhost:3050/models.html — пройти hover'ом по карточкам,
   открыть gallery modal если рендерится; формы консультации если есть
2. http://localhost:3050/catalog.html — то же
3. http://localhost:3050/portfolio.html — то же; gallery modal на превью
4. Открыть портфолио в галерее → перелистать стрелками / свайпом
5. Любые JS-ошибки в console — фиксить
```

- [ ] **Step 5: Mobile-проверка через DevTools emulation**

```
1. DevTools → Toggle device toolbar → iPhone 13
2. На главной: тап по карточке (mousedown ~300ms) →
   подъём НЕ должен залипнуть после отпускания
3. Бургер-меню: тап → открывается; тап ссылка → закрывается
4. Карусель: скролл пальцем → snap'ит к карточке
5. Квиз: помещается, поля доступны
```

- [ ] **Step 6: Cache-buster sanity check**

```
1. cd C:/Users/Roman/good_pools && git log --oneline -7
   Должно быть 6 коммитов "feat(motion): ..." + spec
2. grep -rn "v=20260518-motion" *.html — каждый из 4 HTML файлов
   должен ссылаться на самые свежие версии CSS/JS bundle'ов
3. Все .css и .js файлы существуют (Get-ChildItem)
```

- [ ] **Step 7: Финальный коммит (если что-то фиксили)**

Если в шагах 1-6 нашли баг и пофиксили:

```bash
git add <fixed files>
git commit -m "fix(motion): <what was wrong>"
```

Если всё чисто — коммит не нужен.

---

## Baseline measurements (заполнить в Task 1 / Step 1)

```
Дата baseline: __________
Performance score: __
LCP: ___ ms
CLS: ___
TBT: ___ ms
```

## Final measurements (заполнить в Task 7 / Step 1)

```
Дата final: __________
Performance score: __  (delta: ___)
LCP: ___ ms             (delta: ___)
CLS: ___                (delta: ___)
TBT: ___ ms             (delta: ___)
```

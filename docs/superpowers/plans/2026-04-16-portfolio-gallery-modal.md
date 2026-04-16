# Portfolio Gallery Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `portfolio.html`, clicking a work card opens a modal with a scrollable gallery of 4 photos for that project. Demo-grade (for client presentation) — no backend.

**Architecture:** All modal logic (DOM template, click delegation, navigation, a11y, swipe) lives in `js/portfolio.js` alongside the existing card rendering. A single reusable modal root is appended to `<body>` on load. Each `WORKS` record gains a `gallery` array populated deterministically from the existing `work-01.jpg..work-12.jpg` pool. Styles go in `css/style.css`.

**Tech Stack:** Vanilla JS (no framework, no test runner — static HTML site). Verification is done manually in a browser.

**Spec:** `docs/superpowers/specs/2026-04-16-portfolio-gallery-modal-design.md`

---

## Task 1: Data model — add `gallery` field and `data-work-id`

**Files:**
- Modify: `js/portfolio.js` (currently ~110 lines)

- [ ] **Step 1: Add `gallery` arrays to each `WORKS` entry**

Replace the entire `const WORKS = [ ... ];` block (lines 16-29 in current file) with this version. The `gallery` for each work starts with its own cover image, then three deterministic slots picked from the `work-01..work-12` pool.

```javascript
const WORKS = [
  { id: 1,  title: 'Вилла в Подмосковье',            location: 'Московская область',   category: 'composite', size: '8.0 × 4.0 м',     year: 2024, image: 'images/portfolio/work-01.jpg', gallery: ['images/portfolio/work-01.jpg', 'images/portfolio/work-05.jpg', 'images/portfolio/work-08.jpg', 'images/portfolio/work-03.jpg'] },
  { id: 2,  title: 'Загородный дом в Сочи',          location: 'Краснодарский край',    category: 'composite', size: '7.0 × 3.5 м',     year: 2024, image: 'images/portfolio/work-02.jpg', gallery: ['images/portfolio/work-02.jpg', 'images/portfolio/work-06.jpg', 'images/portfolio/work-09.jpg', 'images/portfolio/work-04.jpg'] },
  { id: 3,  title: 'Коттедж в Краснодаре',           location: 'Краснодар',             category: 'composite', size: '6.5 × 3.2 м',     year: 2023, image: 'images/portfolio/work-03.jpg', gallery: ['images/portfolio/work-03.jpg', 'images/portfolio/work-07.jpg', 'images/portfolio/work-10.jpg', 'images/portfolio/work-05.jpg'] },
  { id: 4,  title: 'Особняк под Санкт-Петербургом',  location: 'Ленинградская область', category: 'composite', size: '9.0 × 4.5 м',     year: 2024, image: 'images/portfolio/work-04.jpg', gallery: ['images/portfolio/work-04.jpg', 'images/portfolio/work-08.jpg', 'images/portfolio/work-11.jpg', 'images/portfolio/work-06.jpg'] },
  { id: 5,  title: 'Резиденция в Казани',            location: 'Татарстан',             category: 'custom',    size: '12 × 5 м',        year: 2024, image: 'images/portfolio/work-05.jpg', gallery: ['images/portfolio/work-05.jpg', 'images/portfolio/work-09.jpg', 'images/portfolio/work-12.jpg', 'images/portfolio/work-07.jpg'] },
  { id: 6,  title: 'Дом в Ростове-на-Дону',          location: 'Ростовская область',    category: 'custom',    size: '10 × 4 м',        year: 2023, image: 'images/portfolio/work-06.jpg', gallery: ['images/portfolio/work-06.jpg', 'images/portfolio/work-10.jpg', 'images/portfolio/work-01.jpg', 'images/portfolio/work-08.jpg'] },
  { id: 7,  title: 'Вилла в Калининграде',           location: 'Калининградская обл.',  category: 'custom',    size: 'Лагуна 14 × 6 м', year: 2023, image: 'images/portfolio/work-07.jpg', gallery: ['images/portfolio/work-07.jpg', 'images/portfolio/work-11.jpg', 'images/portfolio/work-02.jpg', 'images/portfolio/work-09.jpg'] },
  { id: 8,  title: 'Пентхаус в Екатеринбурге',       location: 'Свердловская область',  category: 'jacuzzi',   size: 'SPA Family',      year: 2024, image: 'images/portfolio/work-08.jpg', gallery: ['images/portfolio/work-08.jpg', 'images/portfolio/work-12.jpg', 'images/portfolio/work-03.jpg', 'images/portfolio/work-10.jpg'] },
  { id: 9,  title: 'Коттедж в Новосибирске',         location: 'Новосибирская обл.',    category: 'jacuzzi',   size: 'SPA Premium',     year: 2024, image: 'images/portfolio/work-09.jpg', gallery: ['images/portfolio/work-09.jpg', 'images/portfolio/work-01.jpg', 'images/portfolio/work-04.jpg', 'images/portfolio/work-11.jpg'] },
  { id: 10, title: 'Дача под Владивостоком',         location: 'Приморский край',       category: 'jacuzzi',   size: 'SPA Duo',         year: 2023, image: 'images/portfolio/work-10.jpg', gallery: ['images/portfolio/work-10.jpg', 'images/portfolio/work-02.jpg', 'images/portfolio/work-05.jpg', 'images/portfolio/work-12.jpg'] },
  { id: 11, title: 'База отдыха в Карелии',          location: 'Республика Карелия',    category: 'furako',    size: 'Кедр Ø 2.2 м',    year: 2024, image: 'images/portfolio/work-11.jpg', gallery: ['images/portfolio/work-11.jpg', 'images/portfolio/work-03.jpg', 'images/portfolio/work-06.jpg', 'images/portfolio/work-01.jpg'] },
  { id: 12, title: 'Гостевой дом на Алтае',          location: 'Горный Алтай',          category: 'furako',    size: 'Кедр Ø 1.8 м',    year: 2023, image: 'images/portfolio/work-12.jpg', gallery: ['images/portfolio/work-12.jpg', 'images/portfolio/work-04.jpg', 'images/portfolio/work-07.jpg', 'images/portfolio/work-02.jpg'] }
];
```

- [ ] **Step 2: Add `data-work-id` attribute to card markup**

In `cardHtml()` (currently at lines 31-47), replace the `<article>` opening tag. Find:

```javascript
    <article class="${cls}" data-category="${work.category}">
```

Replace with:

```javascript
    <article class="${cls}" data-category="${work.category}" data-work-id="${work.id}">
```

- [ ] **Step 3: Verify cards still render identically**

Start the server if it's not running: `python -m http.server 8000`

Open `http://localhost:8000/portfolio.html` in a browser. Open DevTools → Elements, inspect one of the `.work-card` elements. Confirm:
- The card still renders (image, title, tag, year visible).
- The `<article>` has both `data-category="..."` and `data-work-id="..."` attributes.
- In DevTools Console, run `WORKS[0].gallery.length` — expected: `4`.

- [ ] **Step 4: Commit**

```bash
git add js/portfolio.js
git commit -m "feat(portfolio): add gallery field and data-work-id to work cards

Each WORKS entry gains a deterministic 4-photo gallery drawn from
the existing work-01..work-12 pool. Cards carry data-work-id so a
click handler can resolve the record. No behavior change yet."
```

---

## Task 2: Modal shell — DOM template, CSS, open/close

At the end of this task, clicking a work card opens a dark full-screen modal with the cover photo, info panel, and close button. Esc, backdrop click, and the close button all dismiss it. No prev/next navigation yet — that comes in Task 3.

**Files:**
- Modify: `js/portfolio.js`
- Modify: `css/style.css` (append at end; currently 2923 lines)

- [ ] **Step 1: Add CSS for the modal**

Open `css/style.css` and append the following at the very end of the file (after line 2923):

```css

/* ===== Portfolio gallery modal ===== */
.pgal-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.85);
  padding: 40px 20px;
  box-sizing: border-box;
}
.pgal-modal[hidden] { display: none; }

.pgal-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  max-width: min(1100px, 92vw);
  width: 100%;
}

.pgal-image-wrap {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.pgal-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  background: #111;
}
.pgal-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50vh;
  background: #1a1a1a;
  color: #888;
  font-size: 14px;
  letter-spacing: 0.04em;
  border-radius: 12px;
}

.pgal-btn {
  background: rgba(20, 20, 20, 0.7);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  padding: 0;
}
.pgal-btn:hover { background: rgba(40, 40, 40, 0.95); }
.pgal-btn:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.pgal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 42px;
  height: 42px;
  font-size: 26px;
  line-height: 1;
}

.pgal-info {
  color: #fff;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 100%;
}
.pgal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}
.pgal-location {
  font-size: 14px;
  color: #bbb;
}
.pgal-meta {
  font-size: 13px;
  color: #888;
  letter-spacing: 0.02em;
}
.pgal-counter {
  font-size: 13px;
  color: #999;
  letter-spacing: 0.08em;
}

@media (max-width: 720px) {
  .pgal-modal { padding: 20px 12px; }
  .pgal-image { max-height: 60vh; }
  .pgal-close { top: 12px; right: 12px; width: 38px; height: 38px; font-size: 22px; }
  .pgal-title { font-size: 17px; }
}
```

- [ ] **Step 2: Add modal module to `js/portfolio.js`**

Open `js/portfolio.js`. At the **end** of the file (after the `document.addEventListener('DOMContentLoaded', ...)` closing at line 110), **append** the following code:

```javascript

// ===== Portfolio gallery modal =====
const PortfolioGallery = (() => {
  let modalEl = null;
  let imgEl = null;
  let titleEl = null;
  let locationEl = null;
  let metaEl = null;
  let counterEl = null;
  let closeBtn = null;
  let currentWork = null;
  let currentIndex = 0;
  let triggerCard = null;
  let prevBodyOverflow = '';

  function getGallery(work) {
    return (work && work.gallery && work.gallery.length) ? work.gallery : [work.image];
  }

  function buildModal() {
    const root = document.createElement('div');
    root.className = 'pgal-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'pgal-title');
    root.hidden = true;
    root.innerHTML = `
      <button class="pgal-btn pgal-close" aria-label="Закрыть">×</button>
      <div class="pgal-stage">
        <div class="pgal-image-wrap">
          <img class="pgal-image" alt="" />
        </div>
        <div class="pgal-info">
          <h2 class="pgal-title" id="pgal-title"></h2>
          <div class="pgal-location"></div>
          <div class="pgal-meta"></div>
          <div class="pgal-counter" aria-live="polite"></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = gallery.length > 1 ? `${currentIndex + 1} / ${gallery.length}` : '';
  }

  function open(work, cardEl) {
    if (!modalEl) {
      modalEl = buildModal();
      imgEl = modalEl.querySelector('.pgal-image');
      titleEl = modalEl.querySelector('.pgal-title');
      locationEl = modalEl.querySelector('.pgal-location');
      metaEl = modalEl.querySelector('.pgal-meta');
      counterEl = modalEl.querySelector('.pgal-counter');
      closeBtn = modalEl.querySelector('.pgal-close');

      closeBtn.addEventListener('click', close);
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) close();
      });
      document.addEventListener('keydown', onKey);
    }

    currentWork = work;
    currentIndex = 0;
    triggerCard = cardEl;
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    render();
    modalEl.hidden = false;
    closeBtn.focus();
  }

  function close() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.style.overflow = prevBodyOverflow;
    if (triggerCard && typeof triggerCard.focus === 'function') {
      triggerCard.focus();
    }
    currentWork = null;
    triggerCard = null;
  }

  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  function attach() {
    const grid = document.querySelector('.works-grid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.work-card');
      if (!card) return;
      const id = Number(card.dataset.workId);
      const work = WORKS.find(w => w.id === id);
      if (!work) return;
      open(work, card);
    });
  }

  return { attach };
})();
```

- [ ] **Step 3: Call `PortfolioGallery.attach()` on DOMContentLoaded**

In `js/portfolio.js`, find the existing `DOMContentLoaded` handler (lines 102-110 in current file):

```javascript
document.addEventListener('DOMContentLoaded', () => {
  renderHomeFeatured();

  if (document.querySelector('.works-grid')) {
    renderPortfolioFilter();
    renderPortfolioGrid();
    attachPortfolioFilter();
  }
});
```

Add a single call to `PortfolioGallery.attach()` after `attachPortfolioFilter();` inside the `if` block, so it becomes:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  renderHomeFeatured();

  if (document.querySelector('.works-grid')) {
    renderPortfolioFilter();
    renderPortfolioGrid();
    attachPortfolioFilter();
    PortfolioGallery.attach();
  }
});
```

- [ ] **Step 4: Cache-bust the portfolio script in `portfolio.html`**

In `portfolio.html`, find line 105:

```html
  <script src="js/portfolio.js"></script>
```

Replace with:

```html
  <script src="js/portfolio.js?v=20260416g"></script>
```

Also cache-bust the CSS link. In `portfolio.html` line 7, find:

```html
  <link rel="stylesheet" href="css/style.css">
```

Replace with:

```html
  <link rel="stylesheet" href="css/style.css?v=20260416g">
```

- [ ] **Step 5: Verify in browser**

Reload `http://localhost:8000/portfolio.html`. Check:
- Clicking any card opens a full-screen dark modal with the cover photo.
- Title, location, and `category · size · year` line show under the photo.
- Counter shows `1 / 4`.
- Clicking the `×` button closes the modal.
- Clicking the backdrop (dark area outside the photo/panel) closes the modal.
- Pressing `Esc` closes the modal.
- Page scrolling is locked while modal is open; after closing, scroll works again.
- No JS errors in the DevTools Console.

- [ ] **Step 6: Commit**

```bash
git add js/portfolio.js css/style.css portfolio.html
git commit -m "feat(portfolio): gallery modal shell with open/close

Click a card on portfolio.html to open a modal showing the cover
photo, info panel, and a close button. Close via X, backdrop click,
or Esc. Locks body scroll while open. Navigation arrives next."
```

---

## Task 3: Gallery navigation — prev/next buttons, arrow keys, counter

At the end of this task, the modal shows round prev/next buttons on the sides of the photo, arrow keys work, the counter updates, and navigation wraps around. If a project only has 1 photo, buttons and counter stay hidden.

**Files:**
- Modify: `js/portfolio.js`
- Modify: `css/style.css`

- [ ] **Step 1: Add CSS for the arrow buttons**

Open `css/style.css`. Find the line `/* ===== Portfolio gallery modal ===== */` (added in Task 2) and locate the `.pgal-close` rule. **Directly after the `.pgal-close { ... }` block**, add:

```css
.pgal-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  font-size: 28px;
  line-height: 1;
  z-index: 2;
}
.pgal-nav--prev { left: 10px; }
.pgal-nav--next { right: 10px; }

@media (max-width: 720px) {
  .pgal-nav { display: none; }
}
```

- [ ] **Step 2: Extend the modal template to include prev/next buttons**

Open `js/portfolio.js`. In the `buildModal()` function (added in Task 2), find the `root.innerHTML = \`...\`` block and replace it with this version that adds two `<button>` elements inside `.pgal-image-wrap`:

```javascript
    root.innerHTML = `
      <button class="pgal-btn pgal-close" aria-label="Закрыть">×</button>
      <div class="pgal-stage">
        <div class="pgal-image-wrap">
          <button class="pgal-btn pgal-nav pgal-nav--prev" aria-label="Предыдущее фото">‹</button>
          <img class="pgal-image" alt="" />
          <button class="pgal-btn pgal-nav pgal-nav--next" aria-label="Следующее фото">›</button>
        </div>
        <div class="pgal-info">
          <h2 class="pgal-title" id="pgal-title"></h2>
          <div class="pgal-location"></div>
          <div class="pgal-meta"></div>
          <div class="pgal-counter" aria-live="polite"></div>
        </div>
      </div>
    `;
```

- [ ] **Step 3: Add nav-button refs, `next()` / `prev()` functions, visibility logic**

In `js/portfolio.js`, inside the `PortfolioGallery` IIFE, **find the variable declarations at the top**:

```javascript
  let modalEl = null;
  let imgEl = null;
  let titleEl = null;
  let locationEl = null;
  let metaEl = null;
  let counterEl = null;
  let closeBtn = null;
```

Add two more variables at the end of that block so it reads:

```javascript
  let modalEl = null;
  let imgEl = null;
  let titleEl = null;
  let locationEl = null;
  let metaEl = null;
  let counterEl = null;
  let closeBtn = null;
  let prevBtn = null;
  let nextBtn = null;
```

Next, in the `open()` function, find the block that assigns refs after `buildModal()`:

```javascript
      modalEl = buildModal();
      imgEl = modalEl.querySelector('.pgal-image');
      titleEl = modalEl.querySelector('.pgal-title');
      locationEl = modalEl.querySelector('.pgal-location');
      metaEl = modalEl.querySelector('.pgal-meta');
      counterEl = modalEl.querySelector('.pgal-counter');
      closeBtn = modalEl.querySelector('.pgal-close');

      closeBtn.addEventListener('click', close);
```

Replace with:

```javascript
      modalEl = buildModal();
      imgEl = modalEl.querySelector('.pgal-image');
      titleEl = modalEl.querySelector('.pgal-title');
      locationEl = modalEl.querySelector('.pgal-location');
      metaEl = modalEl.querySelector('.pgal-meta');
      counterEl = modalEl.querySelector('.pgal-counter');
      closeBtn = modalEl.querySelector('.pgal-close');
      prevBtn = modalEl.querySelector('.pgal-nav--prev');
      nextBtn = modalEl.querySelector('.pgal-nav--next');

      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', () => go(-1));
      nextBtn.addEventListener('click', () => go(1));
```

Next, add a `go()` helper. Insert it **immediately before** the `onKey` function:

```javascript
  function go(delta) {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    if (gallery.length < 2) return;
    currentIndex = (currentIndex + delta + gallery.length) % gallery.length;
    render();
  }
```

Next, update `onKey` to handle arrow keys. Replace the existing `onKey` function:

```javascript
  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }
```

with:

```javascript
  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  }
```

Finally, update `render()` to hide navigation controls when the gallery has only 1 photo. Replace the existing `render()` function:

```javascript
  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = gallery.length > 1 ? `${currentIndex + 1} / ${gallery.length}` : '';
  }
```

with:

```javascript
  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];
    const multi = gallery.length > 1;

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = multi ? `${currentIndex + 1} / ${gallery.length}` : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
  }
```

- [ ] **Step 4: Cache-bust and verify**

Bump the version in `portfolio.html`. Find:

```html
  <script src="js/portfolio.js?v=20260416g"></script>
```

Replace with:

```html
  <script src="js/portfolio.js?v=20260416h"></script>
```

And for the CSS:

```html
  <link rel="stylesheet" href="css/style.css?v=20260416g">
```

Replace with:

```html
  <link rel="stylesheet" href="css/style.css?v=20260416h">
```

Reload `http://localhost:8000/portfolio.html`. Verify:
- Open a card. You see round `‹` and `›` buttons overlaid on the left and right of the photo.
- Clicking `›` advances to photo 2 of 4; the counter updates to `2 / 4`.
- Clicking `›` three more times wraps back to `1 / 4`.
- Clicking `‹` goes to the previous photo; from `1 / 4` it wraps to `4 / 4`.
- Pressing `←` / `→` does the same.
- Resize the window to less than 720px wide — arrow buttons disappear (swipe comes in Task 4).
- Close and reopen the same card — always starts at `1 / 4`.
- No JS errors in Console.

- [ ] **Step 5: Commit**

```bash
git add js/portfolio.js css/style.css portfolio.html
git commit -m "feat(portfolio): gallery navigation via buttons and arrow keys

Prev/next buttons on desktop (hidden under 720px), arrow-key support,
wrap-around at ends, live-updating counter. Controls stay hidden
when a project only has one photo."
```

---

## Task 4: Touch swipe on mobile

At the end of this task, horizontal swipes on the photo navigate between photos on touch devices.

**Files:**
- Modify: `js/portfolio.js`

- [ ] **Step 1: Add swipe handlers inside `buildModal()`**

In `js/portfolio.js`, open the `PortfolioGallery` IIFE. Find the `buildModal()` function. Just **before the final `return root;`** inside that function, add the swipe logic:

```javascript
    let touchStartX = null;
    let touchStartY = null;
    const SWIPE_THRESHOLD = 50;

    root.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { touchStartX = null; return; }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    root.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) return;  // mostly-vertical — ignore
      go(dx < 0 ? 1 : -1);
    });
```

- [ ] **Step 2: Cache-bust and verify**

Bump the version in `portfolio.html` — replace `?v=20260416h` with `?v=20260416i` for both `js/portfolio.js` and `css/style.css`.

Reload `http://localhost:8000/portfolio.html`. Open DevTools → toggle device toolbar (Ctrl+Shift+M in Chrome) → select a mobile preset (e.g. iPhone 12).

Verify:
- Tap a card; modal opens.
- Swipe the photo left (drag touch pointer left by ~100px) — advances to the next photo; counter updates.
- Swipe right — goes back.
- Small swipes (< 50px) are ignored.
- Vertical drags don't change the photo.
- Desktop arrow keys and buttons still work when you exit device mode.

- [ ] **Step 3: Commit**

```bash
git add js/portfolio.js portfolio.html
git commit -m "feat(portfolio): horizontal swipe navigation on touch devices

50px threshold, ignores mostly-vertical drags. Works alongside
desktop controls."
```

---

## Task 5: Accessibility — focus trap and focus return

At the end of this task, keyboard users can Tab through the modal without leaving it, and focus returns to the card that opened the modal on close.

**Files:**
- Modify: `js/portfolio.js`

- [ ] **Step 1: Make work cards focusable and keyboard-activatable**

In `js/portfolio.js`, find `cardHtml()` (defined at the top of the file). Update the `<article>` opening tag to include `tabindex="0"` and `role="button"` so cards become focusable and announce themselves as buttons to screen readers. Find:

```javascript
    <article class="${cls}" data-category="${work.category}" data-work-id="${work.id}">
```

Replace with:

```javascript
    <article class="${cls}" data-category="${work.category}" data-work-id="${work.id}" tabindex="0" role="button" aria-label="Открыть галерею проекта: ${work.title}">
```

Then, in `PortfolioGallery.attach()`, extend the click handler so `Enter` and `Space` on a focused card also open the modal. Find:

```javascript
  function attach() {
    const grid = document.querySelector('.works-grid');
    if (!grid) return;
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.work-card');
      if (!card) return;
      const id = Number(card.dataset.workId);
      const work = WORKS.find(w => w.id === id);
      if (!work) return;
      open(work, card);
    });
  }
```

Replace with:

```javascript
  function attach() {
    const grid = document.querySelector('.works-grid');
    if (!grid) return;

    const tryOpen = (card) => {
      const id = Number(card.dataset.workId);
      const work = WORKS.find(w => w.id === id);
      if (work) open(work, card);
    };

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.work-card');
      if (card) tryOpen(card);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.work-card');
      if (!card) return;
      e.preventDefault();
      tryOpen(card);
    });
  }
```

- [ ] **Step 2: Add focus trap inside the modal**

In the `onKey` function, add Tab-key handling that cycles focus between the modal's interactive elements. Replace the current `onKey`:

```javascript
  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  }
```

with:

```javascript
  function getFocusables() {
    // Order matters: matches visual order (close, prev, next)
    const list = [closeBtn];
    if (prevBtn && !prevBtn.hidden) list.push(prevBtn);
    if (nextBtn && !nextBtn.hidden) list.push(nextBtn);
    return list;
  }

  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'Tab') {
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const active = document.activeElement;
      const idx = focusables.indexOf(active);
      e.preventDefault();
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
      } else {
        nextIdx = idx === -1 || idx === focusables.length - 1 ? 0 : idx + 1;
      }
      focusables[nextIdx].focus();
    }
  }
```

Note: `getFocusables` must be declared **above** `onKey` in the file (or above the first call site). If `onKey` is declared before `getFocusables` in the current file layout, move `getFocusables` above `onKey`. Function declarations are hoisted, so placement is for readability.

- [ ] **Step 3: Cache-bust and verify**

Bump the version in `portfolio.html` — replace `?v=20260416i` with `?v=20260416j` for both `js/portfolio.js` and `css/style.css`.

Reload `http://localhost:8000/portfolio.html`. Verify keyboard-only:
- Press `Tab` until a work card is focused (you'll see a focus ring from the browser).
- Press `Enter` — modal opens; close button is focused.
- Press `Tab` repeatedly — focus cycles close → prev → next → close, never leaving the modal.
- Press `Shift+Tab` — focus cycles backward through the same elements.
- Press `Esc` — modal closes, and focus returns to the card that opened it.
- Repeat with mouse to confirm nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add js/portfolio.js portfolio.html
git commit -m "feat(portfolio): a11y — focus trap and keyboard-activatable cards

Cards gain tabindex/role/aria-label and respond to Enter/Space.
Modal traps Tab / Shift+Tab to its own controls. Closing returns
focus to the triggering card."
```

---

## Task 6: Robustness — preload neighbors, image error fallback, finish

At the end of this task, adjacent photos preload invisibly, a broken image shows a placeholder, and the feature is ready for the client demo.

**Files:**
- Modify: `js/portfolio.js`

- [ ] **Step 1: Preload previous and next images after each render**

In `js/portfolio.js`, inside the `PortfolioGallery` IIFE, add a `preloadNeighbors()` helper **immediately before** the `render()` function:

```javascript
  function preloadNeighbors() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    if (gallery.length < 2) return;
    const nextIdx = (currentIndex + 1) % gallery.length;
    const prevIdx = (currentIndex - 1 + gallery.length) % gallery.length;
    [nextIdx, prevIdx].forEach(i => {
      const img = new Image();
      img.src = gallery[i];
    });
  }
```

Then, at the end of `render()`, call it. Find the current `render()`:

```javascript
  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];
    const multi = gallery.length > 1;

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = multi ? `${currentIndex + 1} / ${gallery.length}` : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
  }
```

Replace with (adds a `preloadNeighbors()` call at the end):

```javascript
  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];
    const multi = gallery.length > 1;

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    imgEl.style.display = '';
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = multi ? `${currentIndex + 1} / ${gallery.length}` : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;

    // Clear any leftover placeholder from a previous broken image
    const leftover = modalEl.querySelector('.pgal-image-placeholder');
    if (leftover) leftover.remove();

    preloadNeighbors();
  }
```

- [ ] **Step 2: Handle image load errors — show placeholder**

In the `open()` function, find the block that sets up event listeners on first open:

```javascript
      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', () => go(-1));
      nextBtn.addEventListener('click', () => go(1));
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) close();
      });
      document.addEventListener('keydown', onKey);
```

Immediately after `document.addEventListener('keydown', onKey);`, add an `error` listener on the image:

```javascript
      imgEl.addEventListener('error', () => {
        // Hide the broken image and inject a placeholder into .pgal-image-wrap
        imgEl.style.display = 'none';
        const wrap = modalEl.querySelector('.pgal-image-wrap');
        if (!wrap.querySelector('.pgal-image-placeholder')) {
          const ph = document.createElement('div');
          ph.className = 'pgal-image-placeholder';
          ph.textContent = 'Фото недоступно';
          // Insert before the next-button so it sits where the image was
          wrap.insertBefore(ph, nextBtn);
        }
      });
```

- [ ] **Step 3: Cache-bust and verify**

Bump the version in `portfolio.html` — replace `?v=20260416j` with `?v=20260416k` for both `js/portfolio.js` and `css/style.css`.

Reload `http://localhost:8000/portfolio.html`. Verify:

*Preload:*
- Open a card. Open DevTools → Network → filter by "Img".
- Within a second of the modal opening, you should see requests for both the next and previous images, not just the current one.

*Error fallback (simulated):*
- In DevTools Console, override the first gallery slot of work id 1 with a bogus path:
  ```js
  WORKS.find(w => w.id === 1).gallery[0] = 'images/portfolio/does-not-exist.jpg';
  ```
- Click work card #1. The modal opens; the cover image fails; you see a grey "Фото недоступно" placeholder.
- Click `›` to advance. The real next photo displays correctly (placeholder is removed).
- Click `‹` to go back. The broken slot shows the placeholder again.
- Reload the page to reset the override.

*Full regression sweep:*
- Mouse: open, navigate via buttons, close via X / backdrop / Esc.
- Keyboard: Tab to a card, Enter to open, Tab-cycle within modal, arrow-key navigation, Esc to close, focus returns to card.
- Mobile (DevTools device mode): tap to open, swipe to navigate, tap backdrop to close.
- Counter is accurate in every case. No JS errors in Console.

- [ ] **Step 4: Commit**

```bash
git add js/portfolio.js portfolio.html
git commit -m "feat(portfolio): preload neighbors and image-error fallback

Adjacent gallery photos preload after each render to make navigation
feel instant. Broken image URLs show a 'Фото недоступно' placeholder
without blocking navigation."
```

- [ ] **Step 5: Push to origin**

```bash
git push
```

Confirm the remote now includes all six feature commits. The modal is ready to show to the client.

# Hero Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `.hero` from a two-column (40/60) layout into a full-width vertical stack of four rows: title → tags → slider → CTA, fitting into `100svh` on desktop.

**Architecture:** Single-file changes across `index.html`, `css/style.css`, and `js/main.js`. No new components, no JS logic changes to the carousel itself — only wrapper markup and styles. Dead JS (`equalizeHeroTitle`) from the old two-line title is removed.

**Tech Stack:** Static HTML + vanilla CSS + vanilla JS. No test runner — verification is done manually in the browser against local dev server at `http://localhost:3050/`.

**Spec:** `docs/superpowers/specs/2026-04-24-hero-layout-redesign-design.md`

---

## Task 1: Replace hero HTML markup

**Files:**
- Modify: `index.html:83-119`

- [ ] **Step 1: Replace the `<section class="hero">…</section>` block**

Open `index.html`. The current hero (lines 83–119) is:

```html
  <!-- HERO -->
  <section class="hero">
    <div class="hero-left">
      <div class="hero-title-bold">Хорошие</div>
      <div class="hero-title-thin">Бассейны</div>
      <div class="hero-tags">
        <span>НАДЕЖНОСТЬ</span>
        <span>КРАСОТА</span>
        <span>ПРОЗРАЧНОСТЬ</span>
      </div>
      <div class="hero-cta">
        <a href="#service" class="hero-cta-btn">РАССЧИТАТЬ СТОИМОСТЬ</a>
        <p class="hero-cta-text">Рассчитайте стоимость бассейна самостоятельно и <strong>получите бесплатную консультацию от нашего менеджера</strong></p>
      </div>
    </div>

    <div class="hero-right">
      <div class="carousel-container">
        <div class="carousel-track" id="categoryTrack">
          <!-- категории рендерятся из js/main.js -->
        </div>

        <button class="carousel-arrow carousel-arrow--prev" aria-label="Предыдущий">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <button class="carousel-arrow carousel-arrow--next" aria-label="Следующий">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <div class="hero-cta hero-cta--mobile">
      <a href="#service" class="hero-cta-btn">РАССЧИТАТЬ СТОИМОСТЬ</a>
      <p class="hero-cta-text">Рассчитайте стоимость бассейна самостоятельно и <strong>получите бесплатную консультацию от нашего менеджера</strong></p>
    </div>
  </section>
```

Replace it with:

```html
  <!-- HERO -->
  <section class="hero">
    <div class="hero-title">
      <span class="bold">ХОРОШИЕ</span>
      <span class="thin">БАССЕЙНЫ</span>
    </div>

    <div class="hero-tags">
      <span>НАДЕЖНОСТЬ</span>
      <span>КРАСОТА</span>
      <span>ПРОЗРАЧНОСТЬ</span>
    </div>

    <div class="hero-slider">
      <div class="carousel-container">
        <div class="carousel-track" id="categoryTrack">
          <!-- категории рендерятся из js/main.js -->
        </div>

        <button class="carousel-arrow carousel-arrow--prev" aria-label="Предыдущий">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <button class="carousel-arrow carousel-arrow--next" aria-label="Следующий">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <div class="hero-cta">
      <a href="#service" class="hero-cta-btn">РАССЧИТАТЬ СТОИМОСТЬ</a>
      <p class="hero-cta-text">Рассчитайте стоимость бассейна самостоятельно и <strong>получите бесплатную консультацию от нашего менеджера</strong></p>
    </div>
  </section>
```

Changes:
- `.hero-left` / `.hero-right` wrappers removed.
- `.hero-title-bold` + `.hero-title-thin` → single `.hero-title` with two `<span>` children (`.bold`, `.thin`).
- Slider wrapped in `.hero-slider` (new).
- Duplicate `.hero-cta--mobile` block removed — only one `.hero-cta` remains (always at the bottom).

- [ ] **Step 2: Verify markup with dev server running**

Dev server is already running on `http://localhost:3050/`. If not, run from `C:/Users/Roman/good_pools`:
```
npm run dev
```
Reload `http://localhost:3050/`. At this point the page will look **broken** (no styles for new class names yet) — that's expected. Just confirm the browser loads it without console errors from JS.

- [ ] **Step 3: Commit**

```
git -C C:/Users/Roman/good_pools add index.html
git -C C:/Users/Roman/good_pools commit -m "hero: switch to vertical stack markup"
```

---

## Task 2: Replace base hero CSS

**Files:**
- Modify: `css/style.css:271-396` (the block containing `.hero`, `.hero-left`, `.hero-title-bold`, `.hero-title-thin`, `.hero-tags`, `.hero-cta`, `.hero-cta--mobile`, `.hero-cta-btn`, `.hero-cta-text`, `.hero-right`, `.carousel-container`, `.carousel-track`)

- [ ] **Step 1: Identify the exact block to replace**

Open `css/style.css`. The current block starts at line 271 with `.hero {` and runs through line 396. In that range:
- Lines 271–369 define the old hero layout (`.hero`, `.hero-left`, `.hero-title-bold`, `.hero-title-thin`, `.hero-tags`, `.hero-cta`, `.hero-cta--mobile`, `.hero-cta-btn`, `.hero-cta-text`).
- Lines 370–396 define `.hero-right`, `.carousel-container`, `.carousel-track`, `.carousel-track::-webkit-scrollbar`.

Only lines 271–397 are replaced; keep everything from line 398 onward (`.category-card` and down) untouched.

- [ ] **Step 2: Replace lines 271–397 with the new styles**

New content for lines 271–397:

```css
.hero {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  padding: 80px 60px 40px;
  gap: 24px;
  position: relative;
}

.hero-title {
  font-size: clamp(56px, 10vw, 160px);
  line-height: 0.95;
  letter-spacing: 2px;
  color: #fff;
  text-transform: uppercase;
  white-space: nowrap;
  display: flex;
  gap: 0.35em;
  align-items: baseline;
}

.hero-title .bold {
  font-weight: 900;
}

.hero-title .thin {
  font-weight: 200;
  letter-spacing: 4px;
}

.hero-tags {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 3px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  flex-wrap: wrap;
  gap: 6px 0;
}

.hero-slider {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
}

.hero-slider .carousel-container {
  width: 100%;
}

.hero-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.hero-cta-btn {
  display: inline-block;
  padding: 20px 36px;
  background: #fff;
  color: #0f1117;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  text-decoration: none;
  text-transform: uppercase;
  border-radius: 4px;
  white-space: nowrap;
  transition: background 0.3s, transform 0.3s;
  flex-shrink: 0;
}

.hero-cta-btn:hover {
  background: #e4e4e7;
  transform: translateY(-2px);
}

.hero-cta-text {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255,255,255,0.6);
  max-width: 300px;
}

.hero-cta-text strong {
  color: rgba(255,255,255,0.85);
}

/* ===== CAROUSEL ===== */
.carousel-container {
  position: relative;
  width: 100%;
}

.carousel-track {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 40px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.carousel-track::-webkit-scrollbar {
  display: none;
}
```

Key differences from the old block:
- Old `.hero-left` (width 40%, padding-left 60px) removed.
- Old `.hero-right` (width 60%) removed.
- Old `.hero-title-bold` / `.hero-title-thin` replaced by `.hero-title` + descendant `.bold`/`.thin`.
- `.hero-tags` no longer has `max-width: var(--hero-title-width, 100%)` or `margin-top: 24px` — spacing is handled by parent `.hero gap`.
- `.hero-cta--mobile` rule removed entirely.
- `.hero-cta { margin-top: auto }` removed — the slider (`flex: 1`) handles the push now.
- `.hero-cta-btn`, `.hero-cta-text`, `.carousel-track`, `.carousel-container` copied verbatim from the old file — kept identical to preserve existing visuals.

- [ ] **Step 3: Reload browser and verify desktop layout**

Reload `http://localhost:3050/`. Open DevTools, switch to a 1920×1080 or 1440×900 viewport. Expected:
- Hero occupies roughly one screen height (no scroll needed to see CTA).
- Title «ХОРОШИЕ БАССЕЙНЫ» on one line, spanning most of the width. «ХОРОШИЕ» is bold (weight 900), «БАССЕЙНЫ» is thin (weight 200).
- Below title: three tags evenly distributed (space-between).
- Carousel in the middle, cards scrollable horizontally.
- CTA button + descriptive text at the bottom, left-aligned.
- No console errors (except possibly from the `equalizeHeroTitle` JS, which will be removed in Task 4 — it logs nothing but does run no-ops).

If the title overflows on 1024px–1280px (because `10vw` of 1024 ≈ 102px and «БАССЕЙНЫ» is 8 chars), shrink the lower clamp bound or test Task 3 first.

- [ ] **Step 4: Commit**

```
git -C C:/Users/Roman/good_pools add css/style.css
git -C C:/Users/Roman/good_pools commit -m "hero: replace 40/60 layout with vertical stack (base styles)"
```

---

## Task 3: Update responsive hero CSS (media queries)

**Files:**
- Modify: `css/style.css` — five media-query blocks that currently override hero rules: `@media (max-width: 1024px)` (line 1677), `@media (min-width: 769px) and (max-width: 1024px)` (1746), `@media (max-width: 768px)` (1779), `@media (max-width: 480px)` (2082), `@media (max-width: 360px)` (2386)

- [ ] **Step 1: Remove old hero overrides inside `@media (max-width: 1024px)` at line 1677**

Inside that block (which starts at 1677 with `@media (max-width: 1024px) {` and contains generic 1024px rules), locate and **delete** these 3 lines (currently at 1682–1684):

```css
  .hero-left {
    padding-left: 40px;
  }
```

Leave the rest of the `@media (max-width: 1024px)` block intact — it contains rules for `.category-card`, `.card-image`, `.catalog`, `.why-us` etc., which we are not touching.

- [ ] **Step 2: Replace the entire `@media (min-width: 769px) and (max-width: 1024px)` block at line 1746**

The current block (lines 1744–1776) exists *specifically* to stack the hero on narrow laptops — now that desktop already stacks, this whole block is obsolete. Delete lines 1744–1776 in their entirety:

```css
/* Narrow laptops / large tablets (769–1024px): hero switches to column,
   because 40% hero-left is too narrow for the CTA button */
@media (min-width: 769px) and (max-width: 1024px) {
  .hero {
    flex-direction: column;
    min-height: auto;
    padding-top: 60px;
    padding-bottom: 0;
  }

  .hero-left {
    width: 100%;
    padding: 40px 40px 24px;
    display: block;
  }

  .hero-left .hero-cta {
    display: none;
  }

  .hero-cta--mobile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100%;
    padding: 0 40px 32px;
  }

  .hero-right {
    width: 100%;
  }
}
```

Do **not** replace with anything — the whole block goes away.

- [ ] **Step 3: Update hero rules inside `@media (max-width: 768px)` at line 1779**

Current hero-related rules in that block (approximately lines 1799–1874):

```css
  .hero {
    flex-direction: column;
    min-height: auto;
    padding-top: 56px;
    padding-bottom: 0;
  }

  .hero-left {
    width: 100%;
    padding: 40px 24px 24px;
    display: block;
  }

  .hero-title-bold,
  .hero-title-thin {
    font-size: clamp(48px, 10vw, 70px);
  }

  .hero-tags {
    margin-top: 16px;
    font-size: 11px;
    letter-spacing: 2px;
  }

  .hero-left .hero-cta {
    display: none;
  }

  .hero-cta--mobile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    width: 100%;
    padding: 0 24px 32px;
  }

  .hero-cta-btn {
    padding: 16px 28px;
    font-size: 13px;
  }

  .hero-cta-text {
    font-size: 13px;
    max-width: 100%;
  }

  .hero-right {
    width: 100%;
  }

  .carousel-track {
    padding: 20px 24px 30px;
    gap: 20px;
  }

  .category-card {
    flex: 0 0 180px;
  }

  .card-image {
    width: 180px;
    height: 200px;
  }

  .card-title-bold {
    font-size: 15px;
  }

  .card-title-thin {
    font-size: 14px;
  }

  .hero-right {
    overflow: visible;
  }

  .carousel-container {
    margin-left: -40px;
  }

  .carousel-arrow {
    width: 40px;
    height: 40px;
  }

  .carousel-arrow--next {
    right: -38px;
    padding: 0 6px 0 0;
  }

  .carousel-arrow--prev {
    left: -38px;
    padding: 0 0 0 6px;
  }
```

Replace those hero-specific rules with this set (keep `.carousel-track`, `.category-card`, `.card-image`, `.card-title-*`, `.carousel-arrow*` rules — they are not hero-layout but carousel-content and stay as-is):

```css
  .hero {
    padding: 56px 24px 24px;
    gap: 16px;
    min-height: 100vh;
    min-height: 100svh;
  }

  .hero-title {
    font-size: clamp(48px, 10vw, 70px);
  }

  .hero-tags {
    font-size: 11px;
    letter-spacing: 2px;
  }

  .hero-cta-btn {
    padding: 16px 28px;
    font-size: 13px;
    width: 100%;
    text-align: center;
  }

  .hero-cta-text {
    font-size: 13px;
    max-width: 100%;
  }
```

Specifically:
- Remove `.hero-left`, `.hero-right`, `.hero-left .hero-cta`, `.hero-cta--mobile`, `.hero-right { overflow: visible }`, `.carousel-container { margin-left: -40px }` (the negative margin was compensating for `.hero-left` padding; no longer needed).
- Replace the `.hero-title-bold, .hero-title-thin` combined selector with `.hero-title`.
- Leave `.carousel-track`, `.category-card`, `.card-image`, `.card-title-bold`, `.card-title-thin`, `.carousel-arrow`, `.carousel-arrow--next`, `.carousel-arrow--prev` as-is (they style the card content, not the hero layout).

- [ ] **Step 4: Add title wrap rule for ≤600px inside `@media (max-width: 768px)`**

Right after the `.hero-title` block you just wrote, add a nested rule? No — CSS doesn't nest. Instead, after closing `@media (max-width: 768px) { ... }`, add a **new** media query at 600px that enables wrapping:

Find the line with `}` that closes `@media (max-width: 768px) {` (just before the next `@media (max-width: 480px) {` at line 2082). Immediately before line 2082, insert:

```css
/* Very narrow (≤600px): let the title wrap onto two lines */
@media (max-width: 600px) {
  .hero-title {
    white-space: normal;
    flex-direction: column;
    gap: 0;
  }
  .hero-tags {
    justify-content: flex-start;
    gap: 8px 16px;
  }
}
```

- [ ] **Step 5: Update hero rules inside `@media (max-width: 480px)` at line 2082**

Current hero-related rules (approximately lines 2107–2142):

```css
  .hero {
    padding-top: 52px;
  }

  .hero-left {
    padding: 30px 16px 10px;
  }

  .hero-title-bold {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title-thin {
    font-size: clamp(38px, 11vw, 56px);
    letter-spacing: 2px;
  }

  .hero-tags {
    margin-top: 12px;
    font-size: 10px;
    letter-spacing: 1.5px;
  }

  .hero-cta--mobile {
    padding: 0 16px 24px;
    gap: 12px;
  }

  .hero-cta-btn {
    padding: 14px 24px;
    font-size: 12px;
  }

  .hero-cta-text {
    font-size: 12px;
  }
```

Replace with:

```css
  .hero {
    padding: 52px 16px 16px;
    gap: 12px;
  }

  .hero-title {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title .thin {
    letter-spacing: 2px;
  }

  .hero-tags {
    font-size: 10px;
    letter-spacing: 1.5px;
  }

  .hero-cta-btn {
    padding: 14px 24px;
    font-size: 12px;
  }

  .hero-cta-text {
    font-size: 12px;
  }
```

- [ ] **Step 6: Update hero rules inside `@media (max-width: 360px)` at line 2386**

Current hero-related rules (approximately lines 2410–2446):

```css
  .hero {
    padding-top: 48px;
  }

  .hero-left {
    padding: 24px 12px 8px;
  }

  .hero-title-bold {
    font-size: 36px;
  }

  .hero-title-thin {
    font-size: 36px;
    letter-spacing: 1px;
  }

  .hero-tags {
    font-size: 9px;
    letter-spacing: 1px;
    margin-top: 10px;
  }

  .hero-cta--mobile {
    padding: 0 12px 20px;
    gap: 10px;
  }

  .hero-cta-btn {
    padding: 12px 20px;
    font-size: 11px;
    letter-spacing: 1px;
  }

  .hero-cta-text {
    font-size: 11px;
  }
```

Replace with:

```css
  .hero {
    padding: 48px 12px 12px;
    gap: 10px;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-title .thin {
    letter-spacing: 1px;
  }

  .hero-tags {
    font-size: 9px;
    letter-spacing: 1px;
  }

  .hero-cta-btn {
    padding: 12px 20px;
    font-size: 11px;
    letter-spacing: 1px;
  }

  .hero-cta-text {
    font-size: 11px;
  }
```

- [ ] **Step 7: Verify responsive breakpoints in DevTools**

With dev server reloaded at `http://localhost:3050/`, open DevTools and cycle through:

| Width  | Expected                                                                                     |
|--------|----------------------------------------------------------------------------------------------|
| 1920px | Hero = 1 screen, title one line large, tags spread, slider centered, CTA bottom-left         |
| 1366px | Same layout, slightly smaller title                                                          |
| 1024px | Same layout, stack is still comfortable                                                      |
| 768px  | Tighter padding (24px), smaller title (≤70px), CTA button **full-width**                     |
| 600px  | Title wraps onto 2 lines (`ХОРОШИЕ` / `БАССЕЙНЫ`), tags left-aligned flex-wrap                |
| 480px  | Title ~42px, tiny tags, button 14×24 padding                                                 |
| 360px  | Title 36px, smallest tags, button 12×20                                                      |

Scroll on each — the rest of the page (catalog, portfolio, etc.) should be visually identical to before.

Carousel still works: drag/scroll horizontally, click arrows, click a card → navigates to `models.html`.

- [ ] **Step 8: Commit**

```
git -C C:/Users/Roman/good_pools add css/style.css
git -C C:/Users/Roman/good_pools commit -m "hero: update responsive styles for vertical stack"
```

---

## Task 4: Remove dead `equalizeHeroTitle` JS

**Files:**
- Modify: `js/main.js:85-154`

- [ ] **Step 1: Understand why this block is dead**

The block at `js/main.js:85–154` (starting `// Hero title equal-width auto-fit`) queries `.hero-title-bold` / `.hero-title-thin`, which no longer exist after Task 1. The guard `if (heroBold && heroThin)` evaluates to `false`, so the body never runs. It also sets a CSS variable `--hero-title-width` that is no longer consumed by any CSS rule. It is pure dead code now — remove it.

- [ ] **Step 2: Delete lines 85–154**

Open `js/main.js`. Locate the comment `// Hero title equal-width auto-fit` on line 85. Delete from that line through the closing `}` on line 154 (the one that closes the `if (heroBold && heroThin) { ... }` block). The surrounding code should look like this before:

```javascript
    });
  }

  // Hero title equal-width auto-fit
  const heroBold = document.querySelector('.hero-title-bold');
  const heroThin = document.querySelector('.hero-title-thin');

  if (heroBold && heroThin) {
    // ... (many lines) ...
  }

  // Catalog cards on home page: render from API
  var catGrid = document.getElementById('catGrid');
```

After the edit:

```javascript
    });
  }

  // Catalog cards on home page: render from API
  var catGrid = document.getElementById('catGrid');
```

- [ ] **Step 3: Reload and confirm no errors in the console**

Reload `http://localhost:3050/`. Open DevTools → Console. Expected: no new errors introduced by this change. (Carousel keeps working from the rest of `main.js`.)

- [ ] **Step 4: Commit**

```
git -C C:/Users/Roman/good_pools add js/main.js
git -C C:/Users/Roman/good_pools commit -m "hero: remove dead equalizeHeroTitle logic"
```

---

## Task 5: Bump CSS cache-busting and final browser verification

**Files:**
- Modify: `index.html:7`

- [ ] **Step 1: Bump the `?v=` query string on the CSS link**

Open `index.html`. Line 7 currently reads:

```html
  <link rel="stylesheet" href="css/style.css?v=20260422b">
```

Change to:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424a">
```

- [ ] **Step 2: Full page smoke test at `http://localhost:3050/`**

Hard-reload (Ctrl+Shift+R). Walk through the following scenarios and confirm each:

1. **Desktop 1920 (or max viewport)**:
   - Hero is one screen tall (no page scroll needed to reveal the CTA).
   - Title «ХОРОШИЕ БАССЕЙНЫ» is in one line at the top, spanning most of the width.
   - Three tags directly below the title, evenly distributed (space-between).
   - Carousel in the middle of the hero, cards visible, scrolls horizontally on drag.
   - CTA button + descriptive text at the bottom-left.
   - Header (hamburger + icons) overlays correctly on top.
2. **Laptop 1366**: same as above; title a bit smaller due to clamp.
3. **Tablet 768**: full-width CTA button, tighter paddings, title in one line still fits (or wraps at 600).
4. **Phone 390**: title wraps to two lines, tags left-aligned, carousel cards visible.
5. **Below the hero**: `.catalog`, `.portfolio`, `.rr`, `.why-us`, `.service`, `.contacts` sections render identically to before the change — no visual regressions. Quick scroll to each.
6. **Click checks**: click CTA button → scrolls to `#service`. Click a carousel card → navigates to `models.html`. Click carousel prev/next arrows → they scroll the track.
7. **Console**: no red errors in DevTools console.

If any of the above fails, stop and fix before committing. If the title overflows at some viewport between 1024 and 1280, lower the clamp's middle value from `10vw` to `9vw`.

- [ ] **Step 3: Commit**

```
git -C C:/Users/Roman/good_pools add index.html
git -C C:/Users/Roman/good_pools commit -m "hero: bump CSS cache-busting to v=20260424a"
```

- [ ] **Step 4: Final status**

```
git -C C:/Users/Roman/good_pools log --oneline -5
git -C C:/Users/Roman/good_pools status
```

Expected: 5 clean commits on top of previous HEAD, working tree clean.

---

## Notes for the implementing agent

- The dev server (`npm run dev`) and SSH tunnel are already running; do not restart them. If for some reason port 3050 or 5433 is not listening, see `CLAUDE.md` → «Локальная разработка на Windows» for restart commands.
- Do **not** edit anything outside the files listed above (`index.html`, `css/style.css`, `js/main.js`). In particular: do not touch `server.js`, the `routes/`, the `views/` EJS templates, other HTML pages (`catalog.html`, `models.html`, `portfolio.html`), or the admin panel.
- Do **not** rename or remove carousel-related classes (`.carousel-container`, `.carousel-track`, `.carousel-arrow*`, `.category-card`, `.card-*`) — `js/main.js` renders into these.
- Commit after each task. If a task's verification fails, roll back within the task before moving on.

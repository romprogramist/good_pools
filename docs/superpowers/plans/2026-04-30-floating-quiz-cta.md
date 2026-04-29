# Floating "Рассчитать стоимость" CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed "Рассчитать стоимость" button always visible during scroll on all 4 public pages of the site, opening the same quiz as the existing hero CTA.

**Architecture:** Static `<button class="floating-cta" data-quiz-open>` snippet inserted in each of the 4 HTML files; styles in `css/style.css`; visibility logic in new `js/floating-cta.js` (uses `IntersectionObserver` on `.hero-cta-btn` to toggle `.is-visible`). Click handling reuses existing `js/quiz.js` (already binds `[data-quiz-open]`).

**Tech Stack:** Vanilla HTML/CSS/JS. No build step. No automated test framework — verification is manual via the dev server at `http://localhost:3050/` (already running per project setup).

**Spec:** [`docs/superpowers/specs/2026-04-30-floating-quiz-cta-design.md`](../specs/2026-04-30-floating-quiz-cta-design.md)

---

## Pre-flight

Confirm the dev server is running and reachable before starting:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
```

Expected: `200`. If not, run `cd ~/good_pools && npm run dev` in a separate terminal.

---

## Task 1: Add CSS for `.floating-cta` to `css/style.css`

**Files:**
- Modify: `css/style.css` (append at end)

- [ ] **Step 1: Append the CSS block to the end of `css/style.css`**

```css

/* ===== Floating "Рассчитать стоимость" CTA ===== */
.floating-cta {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(14,165,233,0.35), 0 2px 6px rgba(0,0,0,0.15);
  z-index: 90;
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: opacity .25s ease, transform .25s ease, box-shadow .25s ease;
}

.floating-cta.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.floating-cta:hover {
  box-shadow: 0 12px 32px rgba(14,165,233,0.5), 0 4px 10px rgba(0,0,0,0.2);
  transform: translateY(-2px);
}

.floating-cta__icon { width: 20px; height: 20px; }

@media (max-width: 768px) {
  .floating-cta {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    padding: 0;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    justify-content: center;
  }
  .floating-cta__label {
    position: absolute; width: 1px; height: 1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  .floating-cta__icon { width: 24px; height: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .floating-cta { transition: none; }
  .floating-cta:hover { transform: none; }
}
```

- [ ] **Step 2: Verify CSS does not break any existing page**

Open `http://localhost:3050/` in the browser, hard-reload (Cmd+Shift+R). Page should look identical to before — no `.floating-cta` element exists yet, so nothing visible changes.

Repeat for `http://localhost:3050/catalog.html`, `http://localhost:3050/models.html`, `http://localhost:3050/portfolio.html`. All four pages must look unchanged.

Expected: all 4 pages render unchanged.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style(floating-cta): add styles for floating quiz CTA"
```

---

## Task 2: Create `js/floating-cta.js` (visibility logic)

**Files:**
- Create: `js/floating-cta.js`

- [ ] **Step 1: Create the file with the IIFE**

```js
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.querySelector('.floating-cta');
    if (!fab) return;

    var heroBtn = document.querySelector('.hero-cta-btn');
    if (!heroBtn || typeof IntersectionObserver === 'undefined') {
      fab.classList.add('is-visible');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        fab.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });

    io.observe(heroBtn);
  });
})();
```

- [ ] **Step 2: Verify file exists and is syntactically valid**

```bash
node --check js/floating-cta.js
```

Expected: no output (success). Any syntax error will print a stack trace.

- [ ] **Step 3: Commit**

```bash
git add js/floating-cta.js
git commit -m "feat(floating-cta): add visibility controller using IntersectionObserver"
```

---

## Task 3: Wire the button into `index.html`

**Files:**
- Modify: `index.html` (insert button + script before `</body>` near line 460)

- [ ] **Step 1: Insert the button block immediately before the existing `<script src="js/quiz.js…">` line**

Find this in `index.html`:
```html
  <script src="js/quiz.js?v=20260430-mask"></script>
</body>
```

Replace with:
```html
  <button type="button" class="floating-cta" data-quiz-open aria-label="Рассчитать стоимость">
    <svg class="floating-cta__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="12" y1="10" x2="12" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="12" y1="14" x2="12" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="8" y2="18"/>
      <line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
    <span class="floating-cta__label">Рассчитать стоимость</span>
  </button>
  <script src="js/quiz.js?v=20260430-mask"></script>
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 2: Verify on the home page — initial load (button hidden)**

Hard-reload `http://localhost:3050/` (Cmd+Shift+R). Scroll position must be at top.

Expected: hero section visible, no floating button visible in bottom-right corner. Button exists in DOM but `opacity: 0`.

To confirm presence in DOM: open DevTools → Elements → search for `floating-cta`. The `<button>` should be there but without the `is-visible` class.

- [ ] **Step 3: Verify on the home page — scroll past hero (button appears)**

Scroll the page until the hero "РАССЧИТАТЬ СТОИМОСТЬ" button is no longer visible.

Expected: floating button fades in at the bottom-right with sky-blue gradient and the text "Рассчитать стоимость" + calculator icon.

In DevTools → Elements: the button now has class `floating-cta is-visible`.

- [ ] **Step 4: Verify on the home page — scroll back to top (button hides)**

Scroll back to the top of the page.

Expected: floating button fades out.

- [ ] **Step 5: Verify click opens the quiz**

Scroll down so the floating button is visible, then click it.

Expected: the same quiz dialog opens that the hero button opens — title "РАССЧИТАТЬ СТОИМОСТЬ", first step shown.

Close the dialog (Esc or the close button) and confirm the floating button is still kickable on subsequent clicks.

- [ ] **Step 6: Verify mobile (≤768px) — circular FAB form**

In DevTools, toggle device toolbar (Cmd+Shift+M), pick iPhone-size (e.g. 375×667). Reload the page and scroll past the hero.

Expected: the floating button is a 56×56 circle with only the calculator icon visible; the text "Рассчитать стоимость" is not visible. The `aria-label` on the button still reads correctly.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "feat(index): add floating Рассчитать стоимость CTA"
```

---

## Task 4: Wire `catalog.html` (add quiz infra + button)

`catalog.html` does not yet include `quiz.css` / `quiz.js` — they need to be added before the floating button can open the quiz from this page.

**Files:**
- Modify: `catalog.html`

- [ ] **Step 1: Add `quiz.css` link in `<head>` (before the closing `</head>` near line 220)**

Locate the last `<link>` inside `<head>` and add this line right before `</head>`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
```

- [ ] **Step 2: Insert button + scripts before `</body>` (near line 360)**

Replace `</body>` with:

```html
  <button type="button" class="floating-cta" data-quiz-open aria-label="Рассчитать стоимость">
    <svg class="floating-cta__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="12" y1="10" x2="12" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="12" y1="14" x2="12" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="8" y2="18"/>
      <line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
    <span class="floating-cta__label">Рассчитать стоимость</span>
  </button>
  <script src="js/quiz.js?v=20260430-mask" defer></script>
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the quiz dialog markup loads on the catalog page**

Hard-reload `http://localhost:3050/catalog.html`. Open DevTools → Network. Confirm `quiz.js` and `quiz.css` both return 200, and `floating-cta.js` returns 200.

In DevTools → Elements, after `DOMContentLoaded`, search for `<dialog` — `quiz.js` injects a `<dialog id="quiz-dialog">` into the DOM. It must be present.

- [ ] **Step 4: Verify the floating button is visible immediately**

On the catalog page (no hero CTA exists here), the floating button should appear right after page load (no scroll needed).

Expected: button visible in bottom-right with class `floating-cta is-visible`.

- [ ] **Step 5: Verify click opens the quiz**

Click the floating button.

Expected: the same quiz dialog opens with title "РАССЧИТАТЬ СТОИМОСТЬ".

Close it, then click again — confirm it reopens.

- [ ] **Step 6: Commit**

```bash
git add catalog.html
git commit -m "feat(catalog): add floating CTA + wire quiz module"
```

---

## Task 5: Wire `models.html` (add quiz infra + button)

**Files:**
- Modify: `models.html`

- [ ] **Step 1: Add `quiz.css` link in `<head>` (before the closing `</head>` near line 8)**

Add right before `</head>`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
```

- [ ] **Step 2: Insert button + scripts before `</body>` (near line 120)**

Replace `</body>` with:

```html
  <button type="button" class="floating-cta" data-quiz-open aria-label="Рассчитать стоимость">
    <svg class="floating-cta__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="12" y1="10" x2="12" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="12" y1="14" x2="12" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="8" y2="18"/>
      <line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
    <span class="floating-cta__label">Рассчитать стоимость</span>
  </button>
  <script src="js/quiz.js?v=20260430-mask" defer></script>
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify on `http://localhost:3050/models.html`**

Hard-reload. Floating button should be visible immediately. Click → quiz opens. Close → quiz closes. Click again → quiz reopens.

- [ ] **Step 4: Commit**

```bash
git add models.html
git commit -m "feat(models): add floating CTA + wire quiz module"
```

---

## Task 6: Wire `portfolio.html` (add quiz infra + button)

**Files:**
- Modify: `portfolio.html`

- [ ] **Step 1: Add `quiz.css` link in `<head>` (before the closing `</head>` near line 8)**

Add right before `</head>`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
```

- [ ] **Step 2: Insert button + scripts before `</body>` (near line 115)**

Replace `</body>` with:

```html
  <button type="button" class="floating-cta" data-quiz-open aria-label="Рассчитать стоимость">
    <svg class="floating-cta__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="12" y1="10" x2="12" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="12" y1="14" x2="12" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="8" y2="18"/>
      <line x1="12" y1="18" x2="16" y2="18"/>
    </svg>
    <span class="floating-cta__label">Рассчитать стоимость</span>
  </button>
  <script src="js/quiz.js?v=20260430-mask" defer></script>
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify on `http://localhost:3050/portfolio.html`**

Hard-reload. Floating button visible immediately. Click → quiz opens. Close → quiz closes. Click again → reopens.

- [ ] **Step 4: Commit**

```bash
git add portfolio.html
git commit -m "feat(portfolio): add floating CTA + wire quiz module"
```

---

## Task 7: Final smoke test across all pages

No code changes — only verification that all earlier tasks combine correctly.

- [ ] **Step 1: Re-verify each page in turn**

For each of the 4 URLs below, hard-reload and check the listed expectations.

`http://localhost:3050/`
- On load: floating button NOT visible.
- After scrolling past the hero "РАССЧИТАТЬ СТОИМОСТЬ" button: floating button fades in.
- Scroll back to top: floating button fades out.
- Click while visible: quiz dialog opens with title "РАССЧИТАТЬ СТОИМОСТЬ"; close → reopen works.

`http://localhost:3050/catalog.html`
- On load: floating button visible immediately.
- Click: quiz dialog opens.

`http://localhost:3050/models.html`
- On load: floating button visible immediately.
- Click: quiz dialog opens.

`http://localhost:3050/portfolio.html`
- On load: floating button visible immediately.
- Click: quiz dialog opens.

- [ ] **Step 2: Mobile viewport check (one page is enough since CSS is identical)**

In DevTools toggle device toolbar (Cmd+Shift+M), set viewport to 375×667, hard-reload `http://localhost:3050/catalog.html`.

Expected: floating button is a 56×56 px circle with only the calculator icon (text hidden). Click still opens the quiz.

- [ ] **Step 3: Reduced-motion check (optional but recommended)**

In DevTools → Rendering panel → "Emulate CSS media feature `prefers-reduced-motion`" → set to `reduce`. Reload `http://localhost:3050/catalog.html`.

Expected: button still appears, but without fade/slide transition (instant) and no hover-lift.

- [ ] **Step 4: Console error check**

For each of the 4 pages, hard-reload with DevTools Console open.

Expected: no red errors related to `floating-cta` or `quiz`. (Pre-existing warnings unrelated to this change are out of scope.)

- [ ] **Step 5: No commit needed**

This task is verification only. If any step fails, go back to the corresponding earlier task and fix.

---

## Done state

All of:
- Floating button visible after the hero on `index.html` and immediately on the other 3 pages.
- Click on the floating button opens the same quiz as the hero CTA on every page.
- Mobile viewport renders the round FAB form.
- No console errors introduced.
- 6 commits added to the branch (one per code-changing task).

## Out of scope (do not do)

- Refactor `js/quiz.js`.
- Change hero-cta-btn behaviour or styles.
- Add analytics / tracking.
- Add a generic header/footer template across pages.
- `git push` or any deployment action.

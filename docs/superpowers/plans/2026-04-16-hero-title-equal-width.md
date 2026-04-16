# Hero Title Equal-Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make «ХОРОШИЕ» and «БАССЕЙНЫ» in the hero block render at identical pixel widths on every screen size and after the web font finishes loading.

**Architecture:** Add a single JS function `equalizeHeroTitle()` to `js/main.js` that measures both words via an offscreen helper `<span>`, computes the width gap, and applies `letter-spacing` to the narrower word. Trigger on `DOMContentLoaded`, `document.fonts.ready`, and a debounced `resize`.

**Tech Stack:** Vanilla JS (no framework, no test runner — static HTML site). Verification is done manually in a browser.

**Spec:** `docs/superpowers/specs/2026-04-16-hero-title-equal-width-design.md`

---

## Task 1: Add `equalizeHeroTitle()` and wire up triggers

**Files:**
- Modify: `js/main.js` (currently 47 lines, single `DOMContentLoaded` handler)

- [ ] **Step 1: Add the function and wire it into the existing `DOMContentLoaded` handler**

Open `js/main.js`. Inside the existing `document.addEventListener('DOMContentLoaded', () => { ... })` block, after the hamburger-menu code (after line 46, the last `}` of the `if (hamburger && menuOverlay) { ... }` block, but BEFORE the closing `});` of the DOMContentLoaded handler on line 47), insert this code:

```javascript
  // Hero title equal-width auto-fit
  const heroBold = document.querySelector('.hero-title-bold');
  const heroThin = document.querySelector('.hero-title-thin');

  if (heroBold && heroThin) {
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:-9999px;letter-spacing:normal;';
    document.body.appendChild(measureSpan);

    const measureWidth = (el) => {
      measureSpan.style.font = getComputedStyle(el).font;
      measureSpan.textContent = el.textContent;
      return measureSpan.getBoundingClientRect().width;
    };

    const equalizeHeroTitle = () => {
      // Reset before measuring so re-runs don't compound
      heroBold.style.letterSpacing = '';
      heroThin.style.letterSpacing = '';

      const boldW = measureWidth(heroBold);
      const thinW = measureWidth(heroThin);

      if (boldW === 0 || thinW === 0) return; // hidden / not laid out

      const delta = boldW - thinW;
      if (Math.abs(delta) < 0.5) return; // already equal

      const narrower = delta > 0 ? heroThin : heroBold;
      const gaps = narrower.textContent.length - 1;
      if (gaps <= 0) return;

      narrower.style.letterSpacing = (Math.abs(delta) / gaps) + 'px';
    };

    equalizeHeroTitle();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalizeHeroTitle);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(equalizeHeroTitle, 100);
    });
  }
```

The full file should now look like:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Carousel
  const track = document.querySelector('.carousel-track');
  const arrow = document.querySelector('.carousel-arrow');

  if (track && arrow) {
    const scrollAmount = 310;
    arrow.addEventListener('click', () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScroll - 10) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    });
  }

  // Hamburger menu
  const hamburger = document.querySelector('.hamburger');
  const menuOverlay = document.getElementById('menuOverlay');

  if (hamburger && menuOverlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      menuOverlay.classList.toggle('open');
      document.body.classList.toggle('menu-open');
    });

    // Close menu on link click
    menuOverlay.querySelectorAll('.menu-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        menuOverlay.classList.remove('open');
        document.body.classList.remove('menu-open');
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOverlay.classList.contains('open')) {
        hamburger.classList.remove('active');
        menuOverlay.classList.remove('open');
        document.body.classList.remove('menu-open');
      }
    });
  }

  // Hero title equal-width auto-fit
  const heroBold = document.querySelector('.hero-title-bold');
  const heroThin = document.querySelector('.hero-title-thin');

  if (heroBold && heroThin) {
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText =
      'position:absolute;visibility:hidden;white-space:nowrap;left:-9999px;top:-9999px;letter-spacing:normal;';
    document.body.appendChild(measureSpan);

    const measureWidth = (el) => {
      measureSpan.style.font = getComputedStyle(el).font;
      measureSpan.textContent = el.textContent;
      return measureSpan.getBoundingClientRect().width;
    };

    const equalizeHeroTitle = () => {
      heroBold.style.letterSpacing = '';
      heroThin.style.letterSpacing = '';

      const boldW = measureWidth(heroBold);
      const thinW = measureWidth(heroThin);

      if (boldW === 0 || thinW === 0) return;

      const delta = boldW - thinW;
      if (Math.abs(delta) < 0.5) return;

      const narrower = delta > 0 ? heroThin : heroBold;
      const gaps = narrower.textContent.length - 1;
      if (gaps <= 0) return;

      narrower.style.letterSpacing = (Math.abs(delta) / gaps) + 'px';
    };

    equalizeHeroTitle();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(equalizeHeroTitle);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(equalizeHeroTitle, 100);
    });
  }
});
```

- [ ] **Step 2: Cache-bust the JS reference in `index.html`**

`index.html` line 7 versions the CSS via `?v=20260416c`. Apply the same idea to the JS so the user's browser doesn't serve a stale `main.js` from cache.

Find line 554 in `index.html`:

```html
  <script src="js/main.js"></script>
```

Replace with:

```html
  <script src="js/main.js?v=20260416d"></script>
```

(If the CSS version was already bumped today, increment the suffix letter so this is unambiguous.)

- [ ] **Step 3: Verify in a browser — desktop width**

Open `index.html` in a browser at desktop width (≥1280px). Hard-reload (Ctrl+F5).

Expected: «ХОРОШИЕ» and «БАССЕЙНЫ» render with the same width — the right edges of both words line up vertically.

In DevTools console, run this snippet — it uses `Range.getBoundingClientRect()` which returns the actual rendered text width (not the parent block's width):

```javascript
const measure = (sel) => {
  const r = document.createRange();
  r.selectNodeContents(document.querySelector(sel));
  return r.getBoundingClientRect().width;
};
const b = measure('.hero-title-bold');
const t = measure('.hero-title-thin');
console.log({ bold: b, thin: t, delta: Math.abs(b - t) });
```

Expected: `delta` ≤ 1 (pixel).

If `delta` is large (e.g. 20+px), the function didn't run or measurement is off. Check the console for errors and verify the script tag was updated.

- [ ] **Step 4: Verify across breakpoints**

In DevTools, switch to responsive mode and resize through these widths:
- 1440px (desktop)
- 1024px (small desktop)
- 768px (tablet — `.hero-left` becomes 100% width)
- 480px (mobile)
- 360px (small mobile)

At each width, re-run the `Range`-based console snippet from Step 3. Expected: `delta` ≤ 1 at every breakpoint, with no visible misalignment of the right edges.

- [ ] **Step 5: Verify font-load behavior**

Hard-reload with cache disabled (DevTools → Network → "Disable cache" checked, then F5).

Expected: there is no visible "snap" or jump after the page paints — the alignment is correct from the first paint that includes the web font, or re-syncs imperceptibly.

If you see a flicker: the `document.fonts.ready` trigger isn't firing or fires after a long delay. Inspect with:

```javascript
document.fonts.ready.then(() => console.log('fonts loaded'));
```

- [ ] **Step 6: Sanity-check the carousel and menu still work**

The new code lives inside the same `DOMContentLoaded` handler — confirm we didn't break the existing features.

- Click the carousel arrow → carousel scrolls.
- Click the hamburger → menu opens.
- Press Escape → menu closes.
- Click a menu link → menu closes.

Expected: all four behave as before.

- [ ] **Step 7: Commit**

```bash
git add js/main.js index.html
git commit -m "feat: equal-width hero titles via JS auto-fit"
```

---

## Out of Scope

- Changes to `.hero-title-bold` / `.hero-title-thin` CSS (font-size, weight, color).
- Other hero elements (carousel, cards).
- Other pages — none use this hero block.

## Done When

- Right edges of «ХОРОШИЕ» and «БАССЕЙНЫ» align (delta ≤ 1px) at 1440 / 1024 / 768 / 480 / 360 px.
- No console errors.
- No visible flicker on load.
- Carousel and hamburger menu still work.
- Change committed.

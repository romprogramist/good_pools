# Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the washed-out light header with a glassmorphism dark header that gives Search and Phone visual hierarchy via colored accent circles.

**Architecture:** Pure CSS + HTML markup change. Header CSS block in `css/style.css` is rewritten in place. The same header markup is duplicated across `index.html`, `models.html`, `portfolio.html` — all three need the same edits. The `.menu-overlay` (open mobile menu) is untouched. JS (`search.js` etc.) is untouched.

**Tech Stack:** Static HTML + CSS (Montserrat font already loaded). No build step. Cache busting via `?v=` query string on the stylesheet link.

**Spec:** `docs/superpowers/specs/2026-04-24-header-redesign-design.md`

**Verification model:** This is a visual change. There are no automated tests in this repo. Each task that changes user-visible CSS or HTML is verified by reloading http://localhost:3050/ in a browser and inspecting the result. The dev server is already running on port 3050 (started earlier in this session); restart with `cd /c/Users/Roman/good_pools && npm start` if needed.

---

## File Structure

**Modify:**
- `css/style.css` — rewrite header block (lines 17–105) and trim header-title rules in two media queries (around lines 2038–2055).
- `index.html` — line 19 (remove title), line 35 (add `is-search`), line 39 (add `is-phone`), line 7 (cache bust).
- `models.html` — same three markup edits (lines 19, 31, 34) + cache bust on line 7.
- `portfolio.html` — same three markup edits + cache bust on line 7.

**Do not touch:**
- `.menu-overlay` and any `.menu-*` rules — open mobile menu is out of scope.
- `js/search.js`, `js/main.js` — search behavior unchanged, only the trigger styling.
- `views/layout.ejs` — admin layout is a different surface.
- `catalog.html` — has no header.

---

### Task 1: Rewrite header CSS block

**Files:**
- Modify: `css/style.css:17-105` (the entire `/* ===== HEADER ===== */` and `/* ===== HAMBURGER ANIMATION ===== */` sections, replacing the existing rules)

The hamburger animation rules (`.hamburger.active span:nth-child(N)`) at lines 108–119 must be **kept verbatim** at the end of the new block — they're triggered when the mobile menu opens and the spec says don't break the open state.

- [ ] **Step 1: Replace the header CSS block**

Open `css/style.css`. Replace lines 17 through 105 (everything from the `/* ===== HEADER ===== */` comment through the closing brace of `.header-icon svg.max-icon`) with this exact block. Do **not** remove lines 107–119 (the hamburger animation rules).

```css
/* ===== HEADER ===== */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 60px;
  background: rgba(15, 20, 25, 0.85);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  overflow: hidden;
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  padding: 8px;
  background: none;
  border: none;
}

.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #fff;
  transition: all 0.3s;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.2s, box-shadow 0.2s;
}

.header-icon:hover {
  background: rgba(255, 255, 255, 0.10);
}

.header-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: #e4e4e7;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.header-icon svg.max-icon {
  fill: #e4e4e7;
  stroke: none;
}

.header-icon.is-search {
  background: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
}

.header-icon.is-search svg {
  stroke: #fff;
}

.header-icon.is-search:hover {
  background: #2563eb;
}

.header-icon.is-phone {
  background: #22c55e;
  border-color: #22c55e;
}

.header-icon.is-phone svg {
  stroke: #fff;
}

.header-icon.is-phone:hover {
  background: #16a34a;
}
```

Note: the `.header-title` selector is intentionally absent — the markup will be removed in Task 3.

- [ ] **Step 2: Verify the file still parses**

Run: `node -e "require('fs').readFileSync('C:/Users/Roman/good_pools/css/style.css','utf8').length"`
Expected: a number printed (anything > 0). The file is still readable. CSS itself doesn't error at parse time — visual check comes after Task 4.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/Roman/good_pools && git add css/style.css && git commit -m "feat(header): rewrite header CSS as glassmorphism dark with accent icons"
```

---

### Task 2: Remove `.header-title` rules from media queries

**Files:**
- Modify: `css/style.css` — the `@media (max-width: 600px)` block around line 2039 and the `@media (max-width: 480px)` block around line 2046.

The `.header-title` element is being removed from markup. The rules that target it become dead code. Delete them.

- [ ] **Step 1: Delete the 600px header-title rule**

Find this block in `css/style.css`:

```css
/* Narrow screens — hide decorative title so 5 icons + hamburger fit cleanly */
@media (max-width: 600px) {
  .header-title {
    display: none;
  }
}
```

Delete the entire block (the comment line, the `@media` wrapper, and the rule).

- [ ] **Step 2: Delete the header-title rule inside the 480px block**

In the `@media (max-width: 480px)` block, delete only this rule:

```css
  .header-title {
    font-size: 12px;
    letter-spacing: 1px;
  }
```

Keep everything else inside that media query (`.header { padding: 0 12px; height: 52px; }`, `.header-right { gap: 4px; }`, `.header-icon { width: 30px; height: 30px; }`, `.header-icon svg { width: 16px; height: 16px; }`, and any `.hero-*` rules below them).

- [ ] **Step 3: Verify no `.header-title` references remain**

Use Grep tool with pattern `header-title` over `css/style.css`.
Expected: zero matches.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/Roman/good_pools && git add css/style.css && git commit -m "feat(header): drop dead .header-title media-query rules"
```

---

### Task 3: Update `index.html` markup

**Files:**
- Modify: `index.html:19` (remove title span), `index.html:35` (add `is-search` class), `index.html:39` (add `is-phone` class), `index.html:7` (cache-bust).

- [ ] **Step 1: Remove the `Мы строим` title span**

In `index.html`, delete the entire line:

```html
      <span class="header-title">Мы строим</span>
```

- [ ] **Step 2: Add `is-search` class to the search button**

Find:

```html
      <button class="header-icon" aria-label="Поиск">
```

Replace with:

```html
      <button class="header-icon is-search" aria-label="Поиск">
```

- [ ] **Step 3: Add `is-phone` class to the phone link**

Find:

```html
      <a class="header-icon" href="tel:+79613201050" aria-label="Позвонить">
```

Replace with:

```html
      <a class="header-icon is-phone" href="tel:+79613201050" aria-label="Позвонить">
```

- [ ] **Step 4: Bump the stylesheet cache-buster**

Find on line 7:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424k">
```

Replace with:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424-header1">
```

- [ ] **Step 5: Verify in browser**

Open http://localhost:3050/ (hard reload with Ctrl+F5 if needed). Check:
- Header is dark/glassy, not light grey.
- Hamburger lines are white.
- No "Мы строим" text on the left.
- Search icon is a blue circle with a soft glow ring around it.
- Phone icon is a green circle.
- Telegram, WhatsApp, MAX icons are subtle dark circles with light strokes.
- Click search icon — the existing search panel still opens (regression check).

If anything is wrong, fix and re-verify before committing.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Roman/good_pools && git add index.html && git commit -m "feat(header): apply glassmorphism dark header to index.html"
```

---

### Task 4: Update `models.html` markup

**Files:**
- Modify: `models.html:19`, `models.html:31`, `models.html:34`, `models.html:7`.

Same three edits as Task 3, applied to `models.html`.

- [ ] **Step 1: Remove the `Мы строим` title span**

In `models.html`, delete the entire line:

```html
      <span class="header-title">Мы строим</span>
```

- [ ] **Step 2: Add `is-search` class to the search button**

Find:

```html
      <button class="header-icon" aria-label="Поиск">
```

Replace with:

```html
      <button class="header-icon is-search" aria-label="Поиск">
```

- [ ] **Step 3: Add `is-phone` class to the phone link**

Find:

```html
      <a class="header-icon" href="tel:+79613201050" aria-label="Позвонить">
```

Replace with:

```html
      <a class="header-icon is-phone" href="tel:+79613201050" aria-label="Позвонить">
```

- [ ] **Step 4: Bump the stylesheet cache-buster**

Find on line 7:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424f">
```

Replace with:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424-header1">
```

- [ ] **Step 5: Verify in browser**

Open http://localhost:3050/models.html. Same checklist as Task 3 Step 5.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Roman/good_pools && git add models.html && git commit -m "feat(header): apply glassmorphism dark header to models.html"
```

---

### Task 5: Update `portfolio.html` markup

**Files:**
- Modify: `portfolio.html:19`, `portfolio.html:31`, `portfolio.html:34`, `portfolio.html:7`.

Same three edits as Task 3, applied to `portfolio.html`. (Line numbers may differ slightly — search by content, not line number.)

- [ ] **Step 1: Remove the `Мы строим` title span**

In `portfolio.html`, delete the entire line:

```html
      <span class="header-title">Мы строим</span>
```

- [ ] **Step 2: Add `is-search` class to the search button**

Find:

```html
      <button class="header-icon" aria-label="Поиск">
```

Replace with:

```html
      <button class="header-icon is-search" aria-label="Поиск">
```

- [ ] **Step 3: Add `is-phone` class to the phone link**

Find:

```html
      <a class="header-icon" href="tel:+79613201050" aria-label="Позвонить">
```

Replace with:

```html
      <a class="header-icon is-phone" href="tel:+79613201050" aria-label="Позвонить">
```

- [ ] **Step 4: Bump the stylesheet cache-buster**

Find on line 7:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424f">
```

Replace with:

```html
  <link rel="stylesheet" href="css/style.css?v=20260424-header1">
```

- [ ] **Step 5: Verify in browser**

Open http://localhost:3050/portfolio.html. Same checklist as Task 3 Step 5.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/Roman/good_pools && git add portfolio.html && git commit -m "feat(header): apply glassmorphism dark header to portfolio.html"
```

---

### Task 6: Cross-browser and responsive sanity check

No code changes — this task is verification only. If something is broken, the fix lives in Task 1 or 2 and gets a follow-up commit.

- [ ] **Step 1: Mobile widths**

In the browser dev tools, switch to a 480px-wide viewport. Open http://localhost:3050/, http://localhost:3050/models.html, http://localhost:3050/portfolio.html. Check:
- Hamburger + 5 icons fit on one row, no horizontal scroll.
- Search glow ring still visible, doesn't clip the next icon awkwardly. If the glow visibly collides with the phone icon, narrow the ring with a 480px override (e.g., `box-shadow: 0 0 0 2px rgba(59,130,246,0.18);`) inside the existing `@media (max-width: 480px)` block.

- [ ] **Step 2: Open mobile menu — regression check**

On any of the three pages, click the hamburger. The full-screen mobile menu (`.menu-overlay`) should slide in exactly as before — black overlay, animated links, no visual changes. The hamburger lines should still animate into an X.

- [ ] **Step 3: Search panel — regression check**

Click the blue search icon. The search dropdown panel from `js/search.js` should appear with its input and results area. Type a couple of letters — results should filter as before.

- [ ] **Step 4: Done**

If all checks pass, no further commit needed. If any check fails, capture the issue, fix in the relevant earlier task's file, commit with a short follow-up message like `fix(header): tighten search glow on narrow screens`.

---

## Self-Review

**Spec coverage check:**
- Container glassmorphism (rgba background + backdrop-filter + bottom border) → Task 1 Step 1.
- Hamburger lines white → Task 1 Step 1 (`.hamburger span { background: #fff; }`).
- Remove "Мы строим" markup → Tasks 3/4/5 Step 1.
- Neutral pill-circle icons (rgba bg + border, light stroke) → Task 1 Step 1.
- Search accent (blue solid + glow) → Task 1 Step 1 (`.header-icon.is-search` rules) + Tasks 3/4/5 Step 2.
- Phone accent (green solid) → Task 1 Step 1 (`.header-icon.is-phone` rules) + Tasks 3/4/5 Step 3.
- Hover on neutral icons → Task 1 Step 1 (`.header-icon:hover`).
- Hover on accents → Task 1 Step 1 (`.is-search:hover`, `.is-phone:hover`).
- Drop dead `.header-title` rules from both media queries → Task 2.
- Mobile fits 5 icons + hamburger at 480px → Task 6 Step 1.
- Search panel still opens on click → Task 3/4/5 Step 5 + Task 6 Step 3.
- Mobile menu open state untouched → enforced by Task 1 keeping lines 107–119 verbatim; verified in Task 6 Step 2.
- All three HTML files updated → Tasks 3, 4, 5.

No spec section is missing from the plan.

**Placeholder scan:** none of "TBD", "TODO", "implement later", "appropriate error handling" appear. All CSS and HTML is shown verbatim.

**Type/name consistency:** class names `is-search` and `is-phone` are introduced in Task 1 and used the same way in Tasks 3/4/5. SVG markup is unchanged across tasks — only wrapper class names change.

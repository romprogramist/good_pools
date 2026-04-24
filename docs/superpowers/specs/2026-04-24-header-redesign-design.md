# Header redesign — Glassmorphism Dark

**Date:** 2026-04-24
**Scope:** Public site header (closed state) on `index.html`, `models.html`, `portfolio.html`. Mobile menu overlay (`.menu-overlay` open state) is **out of scope** — do not touch.

## Problem

Current header has three usability issues:

1. Background `#f5f5f5` (light grey) is washed out against the dark site (`#0a1014`). Header reads as a foreign panel.
2. Five right-side icons (Telegram, WhatsApp, MAX, Search, Phone) all share identical styling — same circle, same `#333` stroke, same hover. No visual hierarchy.
3. Search has no affordance distinct from social icons. Users miss it. Phone — the primary contact CTA — also blends in.

## Direction (chosen: Variant B from brainstorm)

Glassmorphism dark header. Translucent near-black background with backdrop blur, neutral pill-circle icons for socials, **blue accented circle** for search (with glow ring), **green accented circle** for phone. Two distinct accent colors mark the two key actions; phone uses the universal "call" green so it's instantly recognizable without competing with search.

## Visual spec

### Container

```
.header
  position: fixed; top:0; left:0; right:0; z-index:100; height:60px;
  display:flex; justify-content:space-between; align-items:center;
  padding: 0 40px;
  background: rgba(15, 20, 25, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.08);
```

### Left side

- Hamburger only. **Remove** `<span class="header-title">Мы строим</span>` from markup.
- Hamburger lines: `background: #fff` (was `#333`).

### Right side (icons)

Common base for all 5 right-side icons:

```
.header-icon
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  display:flex; align-items:center; justify-content:center;
  transition: background 0.2s, box-shadow 0.2s;

.header-icon svg
  width: 20px; height: 20px;
  stroke: #e4e4e7; fill: none; stroke-width: 2;
.header-icon svg.max-icon { fill: #e4e4e7; stroke: none; }

.header-icon:hover { background: rgba(255,255,255,0.10); }
```

Search trigger — **primary accent**:

```
.header-icon.is-search
  background: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59,130,246,0.18);
.header-icon.is-search svg { stroke: #fff; }
.header-icon.is-search:hover { background: #2563eb; }
```

Phone — **secondary accent (call green)**:

```
.header-icon.is-phone
  background: #22c55e;
  border-color: #22c55e;
.header-icon.is-phone svg { stroke: #fff; }
.header-icon.is-phone:hover { background: #16a34a; }
```

### Responsive

Existing breakpoints stay. Updates:

- `@media (max-width: 600px)` — delete the `.header-title { display:none; }` block (element no longer exists).
- `@media (max-width: 480px)` — delete the `.header-title { font-size:12px; letter-spacing:1px; }` block. Keep the `.header { padding:0 12px; height:52px; }`, `.header-right { gap:4px; }`, and `.header-icon { width:30px; height:30px; }` rules. The search glow ring stays on the smaller icon and looks fine.

## Markup changes

Apply identically to `index.html`, `models.html`, `portfolio.html`.

1. Remove the `<span class="header-title">Мы строим</span>` line.
2. Add `is-search` class to the search button: `<button class="header-icon is-search" aria-label="Поиск">`.
3. Add `is-phone` class to the phone link: `<a class="header-icon is-phone" href="tel:+79613201050" aria-label="Позвонить">`.

No SVG changes. No JS changes. `js/search.js` continues to bind to the search button — only the trigger appearance changes.

## Out of scope

- `.menu-overlay` and any class starting with `.menu-` — open mobile menu stays as-is.
- Admin layout (`views/layout.ejs`).
- `catalog.html` — no header present.

## Acceptance

- Header background reads dark/glassy on the home page hero, not as a foreign light panel.
- Search and Phone icons are immediately distinguishable from socials at first glance (color test: squint at the header — those two should pop).
- Click on search icon still opens the existing search panel (regression check on `search.js`).
- Mobile (≤480px): all 5 icons + hamburger fit on one row without overflow.
- No visual changes when mobile menu is opened.

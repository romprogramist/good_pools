# Portfolio gallery modal — design

**Date:** 2026-04-16
**Scope:** `portfolio.html` page only
**Goal:** Clicking a work card opens a modal where the user can flip through multiple photos of that project. Demo-grade (for showing to the client); no backend, no admin wiring.

## 1. Architecture

- Modal markup, styles, and behavior live alongside the existing portfolio code:
  - Logic + DOM insertion in `js/portfolio.js` (same file that renders the cards — keeps portfolio concerns in one place).
  - Styles in `css/style.css` under a `/* ===== Portfolio gallery modal ===== */` section.
- The modal root `<div class="pgal-modal" hidden>...</div>` is appended to `<body>` **once** on `DOMContentLoaded` (only on pages that have `.works-grid`). It is reused for every card — opening just updates content and removes `hidden`.
- Cards are not wrapped in links. Click delegation on `.works-grid` looks up the clicked card's `data-work-id`, finds the `WORKS` entry by id, and opens the modal.
- The existing `cardHtml()` gains `data-work-id="${work.id}"` on the `<article>` (needed so click delegation can resolve the record).

## 2. UX and controls

**Layout**
- Full-viewport dark backdrop (`rgba(0,0,0,0.85)`).
- Centered stage: large photo constrained by `max-width: min(1100px, 92vw)` and `max-height: 80vh`, preserving aspect ratio.
- Two round arrow buttons (`‹` / `›`) overlaid on the left/right of the photo, vertically centered. Hidden on viewports ≤720px — swipe replaces them there.
- Info panel below the photo (stacked on all breakpoints for simplicity): project title, location, `category · size · year`, and a counter `2 / 4` on the right.
- Close button (`×`) in the top-right of the modal.

**Interactions**
- Click card → modal opens on the first photo of its gallery.
- `←` / `→` keys, arrow buttons, and horizontal swipes (touch, ~50px threshold) navigate between photos.
- Navigation wraps around (last → first, first → last).
- Clicking the backdrop **or** pressing `Esc` closes the modal.
- Clicking the photo itself does nothing (guard against accidental close).
- Close button is always visible and works on all sizes.

**Scope limits**
- Cards on the home page (`.port-featured`) are **not** wired to the modal in this iteration — only cards inside `.works-grid` on `portfolio.html`.

## 3. Data

Each `WORKS` entry gains an optional `gallery` array of image paths:

```js
{ id: 1, ..., image: 'images/portfolio/work-01.jpg',
  gallery: [
    'images/portfolio/work-01.jpg',  // cover always first
    'images/portfolio/work-05.jpg',
    'images/portfolio/work-09.jpg',
    'images/portfolio/work-03.jpg'
  ]
}
```

**Stub rule** (demo fill):
- Slot 0 = the card's own `image` (cover).
- Slots 1–3 = `images/portfolio/work-NN.jpg` where `NN` is derived deterministically from `id`:
  - slot 1: `((id - 1 + 4) % 12) + 1`
  - slot 2: `((id - 1 + 7) % 12) + 1`
  - slot 3: `((id - 1 + 2) % 12) + 1`
- Deterministic (not `Math.random`) so reload order is stable and no duplicates appear adjacent for most ids.

**Access helper**
- `getGallery(work)` returns `work.gallery || [work.image]`.
- If the resulting array has length 1, arrows and counter are hidden (modal still opens, shows the single image).

## 4. Accessibility and edge cases

**A11y**
- Modal root: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the title element inside the info panel.
- On open: move focus to the close button. Remember which card triggered opening; on close, return focus to it.
- Focus trap: `Tab` / `Shift+Tab` cycles between `close`, `prev`, `next` (and nothing else).
- Buttons have `aria-label` (`Закрыть`, `Предыдущее фото`, `Следующее фото`).
- Counter lives in an `aria-live="polite"` container so screen readers announce photo changes.
- `Esc` handler is bound while the modal is open and removed on close.

**Body / layout**
- On open: set `body.style.overflow = 'hidden'`. Restore the previous value on close.

**Performance**
- After the current image paints, preload `previous` and `next` by instantiating `new Image(); img.src = url`.
- No bulk preloading of the entire gallery.

**Failure cases**
- If an image fails to load (`onerror`), replace the `<img>` with a placeholder element: grey background, centered text `Фото недоступно`. Arrows and counter keep working.
- Repeatedly opening the same card always starts at slot 0 (no persistent state).

**Explicitly out of scope (YAGNI)**
- No zoom / pinch.
- No thumbnail strip (counter + arrows cover navigation).
- No URL deep-linking (`?work=3&photo=2`).
- No admin integration — this is demo data only. When a backend arrives later, the `gallery` field can be populated from an API without frontend changes, but that is not a goal of this iteration.

## 5. Files touched

- `js/portfolio.js` — add `gallery` field to each `WORKS` entry, add `data-work-id` to card markup, add modal init/render/open/close/navigate code.
- `css/style.css` — add modal styles section.
- `portfolio.html` — cache-bust bump on the `portfolio.js` script tag.
- No new files.

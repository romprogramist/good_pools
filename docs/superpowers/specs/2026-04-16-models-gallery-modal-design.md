# Models gallery modal — design

**Date:** 2026-04-16
**Scope:** `models.html` + refactor of portfolio modal into a shared module.
**Goal:** Clicking a model card on `models.html` opens the same gallery modal used by portfolio. Demo-grade (for client presentation).

## Architecture

Extract the modal (built in the previous portfolio iteration) into a shared module so both pages use it verbatim.

- **New file:** `js/gallery-modal.js` — exposes `window.GalleryModal.open({ title, infoLines, gallery, triggerEl })`. Contains everything the `PortfolioGallery` IIFE did: build DOM, render, open/close, prev/next, arrow keys, swipe, focus trap, preload, error fallback.
- **`js/portfolio.js`:** `PortfolioGallery` IIFE is deleted; the click handler on `.works-grid` now calls `GalleryModal.open()` with an adapter that maps `work → { title, infoLines, gallery, triggerEl }`.
- **`js/models.js`:** gains click + `Enter`/`Space` handlers on `.models-grid`. For each model it builds a stub `gallery` from the `work-01..12.jpg` pool and calls `GalleryModal.open()`.
- **`portfolio.html` / `models.html`:** both include `<script src="js/gallery-modal.js?v=..."></script>` before the page-specific script.

## Info panel contract

`infoLines` is an array of short strings rendered below the title. The modal renders title + each line as a separate `<div>`. This keeps the API generic: portfolio sends location + `category · size · year`; models sends series + desc + `specs · price`.

## Stub gallery for models

Deterministic, from the existing `work-01..12.jpg` pool. Because models come from JSON asynchronously, galleries are computed at click time (or render time) as:

```js
function stubGallery(index) {  // index = model's position in the loaded list
  const offsets = [0, 4, 7, 2];
  return offsets.map(o => `images/portfolio/work-${String(((index + o) % 12) + 1).padStart(2, '0')}.jpg`);
}
```

## Card affordance

Cards `.mcard` get `tabindex="0"`, `role="button"`, and `aria-label="Открыть галерею: <name>"`. Click delegation on `.models-grid` matches `.mcard` via `closest()`.

## Out of scope

- No changes to `data/models.json` (galleries are computed on the fly).
- Home-page `.port-featured` cards still don't open the modal (unchanged).
- Admin / backend hookup — still not in this iteration.

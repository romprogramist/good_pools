# Hero Title Equal-Width Alignment

## Problem

In the hero section of `index.html`, the brand mark consists of two stacked words:

- `.hero-title-bold` — «ХОРОШИЕ» (font-weight 900)
- `.hero-title-thin` — «БАССЕЙНЫ» (font-weight 200)

Both elements share the same `font-size`, but because bold glyphs are wider than thin glyphs (and «ХОРОШИЕ» contains the wide letters О and Ш), the bold word renders visibly wider than the thin one. The user wants the two words to render at **identical widths** so the block reads as a single squared block.

## Goal

Make `.hero-title-bold` and `.hero-title-thin` render at the same pixel width on every screen size and after the web font finishes loading.

## Approach

JavaScript auto-fit: measure both words at runtime and apply `letter-spacing` to whichever word is narrower until the widths match. This guarantees the result regardless of breakpoint, font, or text content.

CSS letter-spacing per breakpoint was rejected because it requires manual tuning at four breakpoints and re-tuning if the font ever changes.

## Implementation

### Where

Add a new function `equalizeHeroTitle()` to `js/main.js`, called from the existing `DOMContentLoaded` handler. No new files, no new `<script>` tags.

### Algorithm

1. Find both elements: `.hero-title-bold` and `.hero-title-thin`. If either is missing, return silently.
2. Reset `letter-spacing` on both to `normal` before measuring (so re-runs on resize don't compound).
3. Measure each word's text width using a hidden offscreen `<span>` helper:
   - Create one `<span>` with `position: absolute; visibility: hidden; white-space: nowrap; left: -9999px;`.
   - For each title element, copy its computed `font` shorthand and `letterSpacing: normal` to the helper, set `textContent` to the word, append to `body`, read `getBoundingClientRect().width`, remove.
   - This avoids touching the real elements (no flicker, no layout side-effects).
4. Determine which word is narrower. Compute the gap: `delta = wider - narrower`.
5. Distribute `delta` across the gaps between letters of the narrower word: `letter-spacing = delta / (text.length - 1)` px. (`text.length - 1` because letter-spacing applies to gaps between letters; the last letter has no trailing gap that affects layout in most cases, but browsers do add trailing letter-spacing — accept the tiny over-shoot or subtract one extra unit. Iterate once after applying to fine-tune if width is still off by >0.5px.)
6. Apply `letter-spacing` via inline `style.letterSpacing = '<n>px'` on the narrower element.

### Triggers

Call `equalizeHeroTitle()` at three moments:

1. **`DOMContentLoaded`** — initial layout (may be slightly off if font isn't loaded yet, but cheap insurance).
2. **`document.fonts.ready`** (Promise) — recompute once the web font is fully loaded; this is the authoritative measurement.
3. **`window.resize`** — debounced (≈100 ms via `setTimeout`) so widths stay matched as breakpoints change `font-size`.

### Edge cases

- **No `document.fonts` API** (very old browsers): skip that trigger; the resize/load triggers still cover it.
- **Element width is 0** (display:none, e.g. inside a closed mobile menu): skip — measurement would be invalid. Re-run on resize will catch it.
- **JS disabled**: words render at their natural widths (current behavior). Acceptable fallback.
- **Reduced motion / accessibility**: `letter-spacing` is a static visual property, no animation, no a11y concern.

## Files Touched

- `js/main.js` — add `equalizeHeroTitle()` function and three event hookups (DOMContentLoaded, document.fonts.ready, debounced resize) inside the existing `DOMContentLoaded` block.

No HTML or CSS changes required.

## Out of Scope

- Changing the visual hierarchy (font sizes, weights, colors).
- Other hero elements (carousel, cards).
- Other pages (`catalog.html`, `models.html`, etc.) — they don't have this hero block.

## Success Criteria

- On desktop (>1024px), tablet (768px), mobile (480px), and small mobile (360px), the rendered widths of «ХОРОШИЕ» and «БАССЕЙНЫ» differ by ≤1px.
- After the web font loads, the alignment is correct (no permanent visible gap from a pre-font measurement).
- On window resize across breakpoints, alignment re-syncs within ~100 ms.
- No console errors. No flicker visible to the user.

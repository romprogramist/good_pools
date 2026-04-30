# Hero Title Equal-Width — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On viewports ≤600px, the hero-title lines "ХОРОШИЕ" and "БАССЕЙНЫ" must render at the same visual width by giving each its own `font-size`. Font weight, letter-spacing, and font family stay unchanged. The header logo must NOT be touched.

**Architecture:** A single file changes — `css/style.css`. In three existing `@media` blocks (`≤600px`, `≤480px`, `≤360px`) the rule that sets `font-size` on `.hero-title` as a whole is split into two rules — one for `.hero-title .bold`, one for `.hero-title .thin` — with the `.thin` size starting at ~10/11 of `.bold`. Final ratio is tuned visually in the browser at 600px, then the same ratio is propagated to the smaller breakpoints.

**Tech Stack:** Vanilla CSS. No build step. No automated test framework — verification is manual via DevTools responsive mode at 600 / 480 / 360 / 320 / 601 px viewport widths.

**Spec:** [`docs/superpowers/specs/2026-04-30-hero-title-equal-width-design.md`](../specs/2026-04-30-hero-title-equal-width-design.md)

---

## Pre-flight

Confirm the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
```

Expected: `200`. If not, run `cd ~/good_pools && npm run dev` in a separate terminal.

---

## Task 1: Apply the three breakpoint splits with starting values

The current `@media` blocks set a single `font-size` on `.hero-title`. Replace each with two rules — one for `.bold`, one for `.thin` — where `.thin` is sized ~91% of `.bold`. These are starting values; tuning happens in Task 2.

**Files:**
- Modify: `css/style.css` (three @media blocks at ~2147, ~2202, ~2499)

- [ ] **Step 1: Replace `.hero-title` font-size in `@media (max-width: 600px)`**

Find this exact block in `css/style.css` (around line 2147):

```css
  .hero-title {
    white-space: normal;
    flex-direction: column;
    gap: 0;
    font-size: 11vw;
  }
```

Replace with:

```css
  .hero-title {
    white-space: normal;
    flex-direction: column;
    gap: 0;
  }
  .hero-title .bold { font-size: 11vw; }
  .hero-title .thin { font-size: 10vw; }
```

- [ ] **Step 2: Replace `.hero-title` font-size in `@media (max-width: 480px)`**

Find this exact block in `css/style.css` (around line 2202):

```css
  .hero-title {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title .thin {
    letter-spacing: 2px;
  }
```

Replace with:

```css
  .hero-title .bold {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title .thin {
    font-size: clamp(34px, 10vw, 50px);
    letter-spacing: 2px;
  }
```

- [ ] **Step 3: Replace `.hero-title` font-size in `@media (max-width: 360px)`**

Find this exact block in `css/style.css` (around line 2499):

```css
  .hero-title {
    font-size: 36px;
  }

  .hero-title .thin {
    letter-spacing: 1px;
  }
```

Replace with:

```css
  .hero-title .bold {
    font-size: 36px;
  }

  .hero-title .thin {
    font-size: 33px;
    letter-spacing: 1px;
  }
```

- [ ] **Step 4: Verify the home page still loads**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
```

Expected: `200`.

- [ ] **Step 5: Verify the page renders without breakage**

Hard-reload `http://localhost:3050/` in the browser at default desktop width (>600px).

Expected: hero title looks identical to before — single line, same fonts, same size. The split affects only stacked-layout breakpoints, not the desktop one.

---

## Task 2: Tune `.thin` font-size at 600px until widths match

Open the home page in DevTools responsive mode at exactly 600px width and check whether `ХОРОШИЕ` and `БАССЕЙНЫ` have the same width. Adjust `.thin` value until they do.

**Files:**
- Modify (iteratively): `css/style.css` — only the `.hero-title .thin { font-size: ... }` rule inside `@media (max-width: 600px)`

- [ ] **Step 1: Open DevTools at 600px**

Open `http://localhost:3050/` in the browser. Toggle device toolbar (Cmd+Shift+M) and set viewport width to exactly `600` px (height irrelevant). Hard-reload.

- [ ] **Step 2: Measure both lines**

In DevTools Inspector, click on `<span class="bold">ХОРОШИЕ</span>` — note the rendered width shown in the box-model panel (or hover the dimensions tooltip). Do the same for `<span class="thin">БАССЕЙНЫ</span>`.

Expected: two pixel widths.

- [ ] **Step 3: Adjust `.thin` font-size if widths differ**

If `БАССЕЙНЫ` is wider, decrease the value (e.g., `10vw` → `9.5vw`). If narrower, increase (`10vw` → `10.5vw`). Save the file, hard-reload, re-measure. Repeat until the widths are equal within ~2 pixels.

Concrete edit example (only one line changes per iteration):

```css
  .hero-title .thin { font-size: 9.5vw; }   /* iterated value */
```

- [ ] **Step 4: Record the final ratio**

Once widths match, write down:
- Final `.thin` value (e.g., `9.5vw`).
- Ratio = thin-vw ÷ 11 (e.g., `9.5 / 11 ≈ 0.864`). Keep this number to 3 decimal places.

This ratio drives the smaller-breakpoint values in Task 3.

---

## Task 3: Propagate the final ratio to ≤480px and ≤360px breakpoints

The starting values in Task 1 used a 10/11 ≈ 0.909 ratio. If Task 2 settled on a different ratio (e.g., 0.864), update the `.thin` values in the two smaller breakpoints to keep the same proportion.

**Files:**
- Modify: `css/style.css` — `.hero-title .thin` rules in `@media (max-width: 480px)` and `@media (max-width: 360px)`

- [ ] **Step 1: Compute new values**

Let `R` = final ratio from Task 2 (e.g., `0.864`).

For `@media (max-width: 480px)` — current `.thin` is `clamp(34px, 10vw, 50px)`. Recompute as:
- min = `round(38 × R)` px
- vw = `round((11 × R) × 10) / 10` vw (one decimal)
- max = `round(56 × R)` px

Example for R = 0.864:
- min = `round(38 × 0.864)` = `33px`
- vw = `round(11 × 0.864 × 10) / 10` = `9.5vw`
- max = `round(56 × 0.864)` = `48px`
→ `clamp(33px, 9.5vw, 48px)`

For `@media (max-width: 360px)` — current `.thin` is `33px`. Recompute as `round(36 × R)` px.

Example for R = 0.864: `round(36 × 0.864)` = `31px`.

- [ ] **Step 2: Update `.thin` in `@media (max-width: 480px)`**

In the block from Task 1 Step 2, replace the `.thin` font-size only:

```css
  .hero-title .thin {
    font-size: clamp(<computed-min>px, <computed-vw>vw, <computed-max>px);
    letter-spacing: 2px;
  }
```

Substitute the computed values. (If R from Task 2 happened to be exactly the starting 10/11, this step is a no-op — values already match.)

- [ ] **Step 3: Update `.thin` in `@media (max-width: 360px)`**

In the block from Task 1 Step 3, replace the `.thin` font-size only:

```css
  .hero-title .thin {
    font-size: <computed-px>px;
    letter-spacing: 1px;
  }
```

(If R = 10/11, leave `33px`.)

- [ ] **Step 4: Verify at 480px**

In DevTools responsive mode, set width to `480` px, hard-reload.

Expected: `ХОРОШИЕ` and `БАССЕЙНЫ` are the same width within ~2 pixels.

- [ ] **Step 5: Verify at 360px**

Set width to `360` px, hard-reload.

Expected: same widths within ~2 pixels.

---

## Task 4: Final cross-width verification + regression checks

- [ ] **Step 1: 600px**

Set viewport to 600px, hard-reload. Verify widths still match (sanity check after Task 3).

- [ ] **Step 2: 320px (below the 360px breakpoint)**

Set viewport to 320px, hard-reload.

Expected: `≤360px` rule applies — `.bold` at 36px, `.thin` at the value from Task 3 step 3. Both lines visually equal width.

- [ ] **Step 3: 601px (above the breakpoint — not affected)**

Set viewport to 601px, hard-reload.

Expected: title is back to single-line layout (flex row). It looks the same as before this whole change.

- [ ] **Step 4: 1024px desktop (regression check)**

Set viewport to 1024px (or close DevTools responsive mode), hard-reload.

Expected: hero title looks identical to before — same single-line layout.

- [ ] **Step 5: Logo in the header (regression check)**

At any viewport size, the small logo `<a class="site-logo">` in the top-left corner contains the same words «Хорошие Бассейны». Verify it renders unchanged across the same widths (600 / 480 / 360 / 1024).

Expected: logo unchanged. The selectors `.hero-title .bold` and `.hero-title .thin` cannot match elements inside `.site-logo`, so this is a sanity check.

- [ ] **Step 6: Console-error check**

Open DevTools Console at the home page. Reload.

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add css/style.css
git commit -m "style(hero): equal-width title lines on viewports ≤600px"
```

---

## Done state

- At ≤600px viewport widths, `ХОРОШИЕ` and `БАССЕЙНЫ` have the same visual width (within ~2 px tolerance).
- The same proportion holds on ≤480px and ≤360px (and ≤320px which falls under ≤360px).
- At >600px the hero title looks unchanged from before.
- The header logo is untouched.
- No console errors introduced.
- 1 commit added to the branch.

## Out of scope (do not do)

- Touch the header logo (`.site-logo`) or its CSS.
- Change font weights, letter-spacing values (other than the existing 4/2/1px on `.thin`), or font family.
- Use `transform: scaleX()`, JS measurement, or any other dynamic mechanism — final values are static CSS.
- Change desktop (`>600px`) styles.
- `git push` or any deployment action — leave that to the user.

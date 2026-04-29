# Free-Consultation Modal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every `.btn-consult` button on the site open a modal with a 2-field lead form (name + phone), submit-stub matching the existing quiz pattern, and a "Спасибо!" confirmation state.

**Architecture:** Two new files — `js/consult.js` (IIFE that creates a `<dialog>` programmatically and binds clicks on `.btn-consult`) and `css/consult.css` (light modal styled to match `quiz.css`). All four public HTML pages (`index`, `catalog`, `models`, `portfolio`) get the same two-line wiring — one `<link>` in `<head>`, one `<script>` before `</body>`. No changes to existing `.btn-consult` HTML or to `quiz.js`/`quiz.css`/`floating-cta.js`.

**Tech Stack:** Vanilla HTML/CSS/JS, native `<dialog>`. No build step. No automated test framework — verification is manual via the dev server at `http://localhost:3050/`.

**Spec:** [`docs/superpowers/specs/2026-04-30-consult-modal-design.md`](../specs/2026-04-30-consult-modal-design.md)

---

## Pre-flight

Confirm the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
```

Expected: `200`. If not, run `cd ~/good_pools && npm run dev` in a separate terminal.

---

## Task 1: Create `css/consult.css`

**Files:**
- Create: `css/consult.css`

- [ ] **Step 1: Create the file with the full stylesheet**

Write `css/consult.css` with this content:

```css
.consult-modal {
  border: none;
  padding: 0;
  background: #fff;
  color: #0f1117;
  max-width: 460px;
  width: calc(100vw - 32px);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.35);
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
  inset: 0;
  margin: auto;
}
.consult-modal::backdrop { background: rgba(15,17,23,0.55); }

.consult-close {
  position: absolute;
  top: 10px; right: 12px;
  width: 36px; height: 36px;
  border: none; background: transparent;
  font-size: 28px; line-height: 1; cursor: pointer;
  color: #555;
}
.consult-close:hover { color: #000; }

.consult-body { padding: 36px 32px 28px; }

.consult-title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  line-height: 1.25;
}
.consult-title-accent {
  display: block;
  color: #0ea5e9;
}

.consult-lead {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.5;
  color: #555;
}

.consult-form { display: flex; flex-direction: column; gap: 12px; }
.consult-field { display: block; }
.consult-input {
  width: 100%;
  padding: 14px 18px;
  border: 1.5px solid #d8dde3;
  border-radius: 999px;
  font: inherit; font-size: 15px;
  color: #0f1117;
  background: #fff;
  box-sizing: border-box;
}
.consult-input::placeholder { color: #9aa1ab; }
.consult-input:focus { border-color: #0ea5e9; outline: none; }

.consult-error { margin: 0; font-size: 13px; color: #c0392b; }
.consult-error[hidden] { display: none; }

.consult-submit {
  margin-top: 4px;
  padding: 14px 26px;
  border: none;
  border-radius: 999px;
  font: inherit; font-size: 14px; font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(14,165,233,0.25);
  transition: transform .2s, box-shadow .2s;
}
.consult-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(14,165,233,0.35);
}
.consult-submit:disabled {
  opacity: .7; cursor: default;
  transform: none; box-shadow: none;
}

.consult-disclaimer {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #888;
  text-align: center;
}

.consult-thanks { text-align: center; padding: 8px 0 4px; }

@media (max-width: 480px) {
  .consult-modal { width: calc(100vw - 16px); }
  .consult-body { padding: 28px 20px 24px; }
  .consult-title { font-size: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .consult-submit { transition: none; }
  .consult-submit:hover { transform: none; }
}
```

- [ ] **Step 2: Verify the file is reachable from the dev server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/css/consult.css
```

Expected: `200`.

- [ ] **Step 3: Verify all 4 pages still render unchanged**

The CSS file isn't yet linked from any page, so visually nothing must change. Open each of these in the browser and hard-reload (Cmd+Shift+R):
- `http://localhost:3050/`
- `http://localhost:3050/catalog.html`
- `http://localhost:3050/models.html`
- `http://localhost:3050/portfolio.html`

Expected: all four look identical to before. No floating modal, no console errors related to `consult`.

- [ ] **Step 4: Commit**

```bash
git add css/consult.css
git commit -m "style(consult): add styles for free-consultation modal"
```

---

## Task 2: Create `js/consult.js`

**Files:**
- Create: `js/consult.js`

- [ ] **Step 1: Create the file with the full module**

Write `js/consult.js` with this content:

```js
(function () {
  'use strict';

  const DIALOG_ID = 'consultModal';
  let state = { name: '', phone: '', submitted: false };

  function ensureDialog() {
    let dlg = document.getElementById(DIALOG_ID);
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = DIALOG_ID;
    dlg.className = 'consult-modal';
    dlg.innerHTML = renderForm();
    document.body.appendChild(dlg);

    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeConsult();
      if (e.target.closest('[data-consult-close]')) closeConsult();
    });
    dlg.addEventListener('input', onInput);
    dlg.addEventListener('submit', onSubmit);
    dlg.addEventListener('close', () => {
      state = { name: '', phone: '', submitted: false };
    });

    return dlg;
  }

  function renderForm() {
    return `
      <button type="button" class="consult-close" aria-label="Закрыть" data-consult-close>×</button>
      <div class="consult-body" data-consult-body>
        <h2 class="consult-title">
          Давайте начнём
          <span class="consult-title-accent">с бесплатной консультации?</span>
        </h2>
        <p class="consult-lead">Оставьте заявку и наш менеджер свяжется с вами и расскажет о возможных вариантах строительства.</p>
        <form class="consult-form" data-consult-form novalidate>
          <label class="consult-field">
            <input type="text" name="name" class="consult-input" placeholder="Имя" autocomplete="name" data-consult-name>
          </label>
          <label class="consult-field">
            <input type="tel" name="phone" class="consult-input" placeholder="+7 (000) 000-00-00" autocomplete="tel" inputmode="tel" data-consult-phone>
          </label>
          <p class="consult-error" data-consult-error hidden></p>
          <button type="submit" class="consult-submit">Получить консультацию</button>
          <p class="consult-disclaimer">Нажимая на кнопку вы соглашаетесь на обработку данных</p>
        </form>
      </div>
    `;
  }

  function renderThanks() {
    return `
      <button type="button" class="consult-close" aria-label="Закрыть" data-consult-close>×</button>
      <div class="consult-body consult-thanks">
        <h2 class="consult-title">Спасибо!</h2>
        <p class="consult-lead">Менеджер свяжется с вами в ближайшее время.</p>
        <button type="button" class="consult-submit" data-consult-close>Закрыть</button>
      </div>
    `;
  }

  function openConsult() {
    const dlg = ensureDialog();
    if (state.submitted) dlg.innerHTML = renderForm();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    const nameInput = dlg.querySelector('[data-consult-name]');
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }

  function closeConsult() {
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open) dlg.close();
  }

  function onInput(e) {
    const t = e.target;
    if (t && t.matches('[data-consult-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.phone = normalizePhone(t.value);
    } else if (t && t.matches('[data-consult-name]')) {
      state.name = t.value;
    }
  }

  function onSubmit(e) {
    if (!e.target.matches('[data-consult-form]')) return;
    e.preventDefault();
    const err = validate();
    const errEl = e.target.querySelector('[data-consult-error]');
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    console.log('[consult] submit', { name: state.name.trim(), phone: state.phone });
    // TODO: replace with POST /api/leads when backend is ready

    state.submitted = true;
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg) dlg.innerHTML = renderThanks();
  }

  function validate() {
    if (!state.name.trim()) return 'Укажите имя';
    if (state.phone.length < 11) return 'Введите телефон полностью';
    return null;
  }

  function normalizePhone(raw) {
    if (raw == null) return '';
    return String(raw).replace(/\D/g, '');
  }

  function formatPhoneMask(raw) {
    const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (digits.length === 0) return '';
    let core = digits;
    if (core.charAt(0) === '7' || core.charAt(0) === '8') core = core.slice(1);
    core = core.slice(0, 10);
    if (core.length === 0) return '+7 ';
    let s = '+7 (' + core.slice(0, 3);
    if (core.length > 3) s += ') ' + core.slice(3, 6);
    if (core.length > 6) s += '-' + core.slice(6, 8);
    if (core.length > 8) s += '-' + core.slice(8, 10);
    return s;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-consult').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openConsult();
      });
    });
  });
})();
```

- [ ] **Step 2: Syntax-check the file**

```bash
node --check js/consult.js && echo OK
```

Expected: `OK`. Any syntax error prints a stack trace.

- [ ] **Step 3: Verify the file is reachable from the dev server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/js/consult.js
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add js/consult.js
git commit -m "feat(consult): add consultation modal module"
```

---

## Task 3: Wire `index.html`

`index.html` already has `quiz.css` linked at line 8 and `floating-cta.js` as the last script before `</body>`. Insert `consult.css` after `quiz.css` and `consult.js` after `floating-cta.js`.

**Files:**
- Modify: `index.html` (lines 8 and 475)

- [ ] **Step 1: Add the `<link>` in `<head>`**

Find this in `index.html`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
</head>
```

Replace with:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
  <link rel="stylesheet" href="css/consult.css?v=20260430">
</head>
```

- [ ] **Step 2: Add the `<script>` before `</body>`**

Find this in `index.html`:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

Replace with:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
  <script src="js/consult.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the page still loads and the new asset is served**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
curl -s http://localhost:3050/ | grep -c 'consult\.\(css\|js\)'
```

Expected: `200` and `2` (one css link + one js script).

- [ ] **Step 4: Browser smoke test on `index.html`**

Hard-reload `http://localhost:3050/` (Cmd+Shift+R), open DevTools Console.

1. Scroll down to the bottom-of-page «Бесплатная консультация» button. Click it.
   - Expected: modal opens centered, with title "Давайте начнём с бесплатной консультации?" (second line in sky-blue), two rounded-pill input fields, "Получить консультацию" button.
2. Press the submit button without filling anything.
   - Expected: red text "Укажите имя" appears under the inputs.
3. Type something in the name field, then a few digits in the phone field (less than 10 digits of phone number).
   - Expected: phone field formats live as `+7 (XXX) XXX...`. On submit attempt, error switches to "Введите телефон полностью".
4. Fill the phone fully (10 digits after +7) and submit.
   - Expected: modal content swaps to "Спасибо!" + "Менеджер свяжется с вами в ближайшее время." + a "Закрыть" button. Console shows: `[consult] submit { name: '...', phone: '7XXXXXXXXXX' }`.
5. Click "Закрыть" → modal closes.
6. Click the «Бесплатная консультация» button again → fresh blank form (no leftover thanks state).
7. Open the modal again, then press Esc → modal closes.
8. Open it again, click outside the modal (on the dimmed backdrop) → modal closes.
9. Verify the existing hero «РАССЧИТАТЬ СТОИМОСТЬ» button still opens the **quiz** (not consult).
10. Scroll down so the floating CTA appears, click it → still opens the **quiz** (not consult).

Expected: all 10 checks pass.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(index): wire free-consultation modal to .btn-consult"
```

---

## Task 4: Wire `catalog.html`

`catalog.html` has `quiz.css` linked at line 220, `floating-cta.js` as the last script before `</body>`. Same pattern as Task 3.

**Files:**
- Modify: `catalog.html` (lines 220 and 377)

- [ ] **Step 1: Add the `<link>` in `<head>`**

Find this in `catalog.html`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
</head>
```

Replace with:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
  <link rel="stylesheet" href="css/consult.css?v=20260430">
</head>
```

- [ ] **Step 2: Add the `<script>` before `</body>`**

Find this in `catalog.html`:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

Replace with:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
  <script src="js/consult.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the page is served and contains both refs**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/catalog.html
curl -s http://localhost:3050/catalog.html | grep -c 'consult\.\(css\|js\)'
```

Expected: `200` and `2`.

- [ ] **Step 4: Browser smoke test on `catalog.html`**

Hard-reload `http://localhost:3050/catalog.html`, open DevTools Console.

1. Click the «Бесплатная консультация» button at the bottom of the page.
   - Expected: same modal as on `index.html` opens.
2. Submit empty → error "Укажите имя".
3. Fill name + 4-digit phone → submit → error "Введите телефон полностью" and live-formatted `+7 (XXX) X...`.
4. Fill phone fully → submit → "Спасибо!" + console.log line.
5. Close, reopen → fresh form.
6. Esc and backdrop-click both close.
7. The floating CTA in the bottom-right still opens the **quiz** (not consult).

Expected: all 7 checks pass.

- [ ] **Step 5: Commit**

```bash
git add catalog.html
git commit -m "feat(catalog): wire free-consultation modal to .btn-consult"
```

---

## Task 5: Wire `models.html`

`models.html` has `quiz.css` linked at line 8, `floating-cta.js` last before `</body>`. Same pattern.

**Files:**
- Modify: `models.html` (lines 8 and 137)

- [ ] **Step 1: Add the `<link>` in `<head>`**

Find this in `models.html`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
</head>
```

Replace with:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
  <link rel="stylesheet" href="css/consult.css?v=20260430">
</head>
```

- [ ] **Step 2: Add the `<script>` before `</body>`**

Find this in `models.html`:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

Replace with:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
  <script src="js/consult.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the page is served and contains both refs**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/models.html
curl -s http://localhost:3050/models.html | grep -c 'consult\.\(css\|js\)'
```

Expected: `200` and `2`.

- [ ] **Step 4: Browser smoke test on `models.html`**

Hard-reload `http://localhost:3050/models.html`, open DevTools Console.

1. Click «Бесплатная консультация» → modal opens with the consultation form.
2. Submit empty → "Укажите имя".
3. Fill incomplete phone → "Введите телефон полностью".
4. Fill full phone → "Спасибо!" + console.log line.
5. Close, reopen → fresh form.
6. Esc and backdrop-click close.

Expected: all 6 checks pass.

- [ ] **Step 5: Commit**

```bash
git add models.html
git commit -m "feat(models): wire free-consultation modal to .btn-consult"
```

---

## Task 6: Wire `portfolio.html`

`portfolio.html` has `quiz.css` linked at line 8, `floating-cta.js` last before `</body>`. Same pattern.

**Files:**
- Modify: `portfolio.html` (lines 8 and 132)

- [ ] **Step 1: Add the `<link>` in `<head>`**

Find this in `portfolio.html`:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
</head>
```

Replace with:

```html
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
  <link rel="stylesheet" href="css/consult.css?v=20260430">
</head>
```

- [ ] **Step 2: Add the `<script>` before `</body>`**

Find this in `portfolio.html`:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
</body>
```

Replace with:

```html
  <script src="js/floating-cta.js?v=20260430" defer></script>
  <script src="js/consult.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the page is served and contains both refs**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/portfolio.html
curl -s http://localhost:3050/portfolio.html | grep -c 'consult\.\(css\|js\)'
```

Expected: `200` and `2`.

- [ ] **Step 4: Browser smoke test on `portfolio.html`**

Hard-reload `http://localhost:3050/portfolio.html`, open DevTools Console.

1. Click «Бесплатная консультация» → modal opens.
2. Submit empty → "Укажите имя".
3. Fill incomplete phone → "Введите телефон полностью".
4. Fill full phone → "Спасибо!" + console.log line.
5. Close, reopen → fresh form.
6. Esc and backdrop-click close.

Expected: all 6 checks pass.

- [ ] **Step 5: Commit**

```bash
git add portfolio.html
git commit -m "feat(portfolio): wire free-consultation modal to .btn-consult"
```

---

## Task 7: Final smoke test

No code changes — verification that everything together works.

- [ ] **Step 1: Server-side cross-check of all assets and refs**

```bash
for u in / /catalog.html /models.html /portfolio.html /css/consult.css /js/consult.js; do
  printf "%-26s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3050$u)"
done
echo ""
for f in index.html catalog.html models.html portfolio.html; do
  c=$(curl -s "http://localhost:3050/$f" | grep -cE 'consult\.css|consult\.js')
  echo "$f: $c (expect 2)"
done
```

Expected: every URL `200`, every page reports `2`.

- [ ] **Step 2: Re-verify each page in the browser**

For each URL, hard-reload, click «Бесплатная консультация», fill name + phone, submit.

- `http://localhost:3050/`
- `http://localhost:3050/catalog.html`
- `http://localhost:3050/models.html`
- `http://localhost:3050/portfolio.html`

Expected: modal opens, validation works, submit shows "Спасибо!", console logs `[consult] submit { ... }`.

- [ ] **Step 3: Mobile viewport check**

In DevTools toggle device toolbar (Cmd+Shift+M), set viewport 375×667, hard-reload `http://localhost:3050/catalog.html`, click «Бесплатная консультация».

Expected: modal width adapts (calc(100vw - 16px)), title is 18px, padding tighter, all fields and the submit button visible without horizontal scrolling.

- [ ] **Step 4: Pre-existing features still work**

On `http://localhost:3050/`:
1. Hero «РАССЧИТАТЬ СТОИМОСТЬ» button still opens the **quiz** (multi-step), not consult.
2. Scroll down past hero → floating-cta appears. Click it → still opens the **quiz**.

Expected: both still trigger the quiz. No regressions.

- [ ] **Step 5: Console-error check**

Open DevTools Console on each of the 4 pages.

Expected: no new red errors related to `consult` or `dialog`.

- [ ] **Step 6: No commit needed**

This task is verification only. If any step fails, return to the corresponding earlier task and fix.

---

## Done state

All of:
- Click on any `.btn-consult` opens a centered modal with name + phone form on all 4 pages.
- Validation messages appear inline for empty name / incomplete phone.
- Successful submit logs `[consult] submit { name, phone }` and replaces modal content with «Спасибо!».
- Esc / × / backdrop / «Закрыть» all close the modal; reopening shows a fresh form.
- Mobile viewport renders correctly.
- Quiz and floating-cta keep working unchanged.
- 6 commits added to the branch (one per code-changing task).

## Out of scope (do not do)

- Refactor `js/quiz.js` or unify the phone-mask helpers between modules.
- Change `.btn-consult` HTML on any page.
- Add a real backend endpoint for leads.
- Add a privacy policy page or link.
- Add multi-country phone selector.
- Add analytics or tracking events.
- `git push` or any deployment action — leave that to the user.

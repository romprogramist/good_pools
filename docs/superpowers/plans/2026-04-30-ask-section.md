# "Не нашли ответ" Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a final-CTA section "Не нашли ответ на свой вопрос?" with a 3-field form (question + name + phone) on the home page, between the contacts section and the footer. Submit is a `console.log` stub matching the existing quiz/consult pattern.

**Architecture:** One new file (`js/ask.js`, IIFE handling phone mask + validation + submit-stub + thanks-state), one CSS append (block of `.ask*` styles in `css/style.css`), and an HTML section block inserted into `index.html` between `</section>` of contacts and the `<!-- FOOTER -->` comment. Phone-mask logic is a third local copy (per the YAGNI choice in the spec); no other modules are touched.

**Tech Stack:** Vanilla HTML/CSS/JS. No build step. No automated test framework — verification is manual via the dev server at `http://localhost:3050/`.

**Spec:** [`docs/superpowers/specs/2026-04-30-ask-section-design.md`](../specs/2026-04-30-ask-section-design.md)

---

## Pre-flight

Confirm the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
```

Expected: `200`. If not, run `cd ~/good_pools && npm run dev` in a separate terminal.

---

## Task 1: Append `.ask*` styles to `css/style.css`

**Files:**
- Modify: `css/style.css` (append at end)

- [ ] **Step 1: Append the CSS block to the end of `css/style.css`**

Add this block at the very end of the file (after the existing `}`):

```css

/* ===== ASK SECTION ===== */
.ask {
  padding: 100px 80px;
  color: #fff;
}
.ask-inner {
  max-width: 720px;
  margin: 0 auto;
}
.ask-head { margin-bottom: 36px; }
.ask-title {
  margin: 0 0 14px;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #fff;
}
.ask-title strong { font-weight: 900; display: block; }
.ask-title span   { font-weight: 300; display: block; letter-spacing: 3px; }
.ask-lead {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: rgba(255,255,255,0.65);
  max-width: 520px;
}

.ask-form { display: flex; flex-direction: column; gap: 14px; }
.ask-field { display: block; }

.ask-textarea,
.ask-input {
  width: 100%;
  padding: 18px 22px;
  border: 1.5px solid rgba(255,255,255,0.18);
  border-radius: 18px;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 15px;
  box-sizing: border-box;
  resize: none;
  transition: border-color .2s;
}
.ask-textarea { min-height: 120px; }
.ask-input { border-radius: 999px; }

.ask-textarea::placeholder,
.ask-input::placeholder { color: rgba(255,255,255,0.45); }

.ask-textarea:focus,
.ask-input:focus { border-color: #0ea5e9; outline: none; }

.ask-textarea.is-invalid,
.ask-input.is-invalid { border-color: #ef4444; }

.ask-error {
  margin: 0;
  font-size: 13px;
  color: #ef4444;
  min-height: 18px;
}
.ask-error[hidden] { display: none; }

.ask-submit {
  align-self: flex-start;
  margin-top: 4px;
  padding: 14px 32px;
  border: 1.5px solid rgba(255,255,255,0.4);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .25s, border-color .25s, transform .2s, box-shadow .25s;
}
.ask-submit:hover {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border-color: transparent;
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(14,165,233,0.35);
}

.ask-disclaimer {
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(255,255,255,0.45);
}

.ask-inner--thanks { text-align: center; padding: 40px 0; }
.ask-inner--thanks .ask-title strong { display: block; }
.ask-inner--thanks .ask-lead { max-width: none; margin: 0 auto; }

@media (max-width: 768px) {
  .ask { padding: 64px 24px; }
  .ask-title { font-size: 26px; }
}
@media (max-width: 480px) {
  .ask { padding: 48px 16px; }
  .ask-title { font-size: 22px; letter-spacing: 1px; }
  .ask-textarea, .ask-input { padding: 14px 18px; font-size: 14px; }
  .ask-submit { width: 100%; align-self: stretch; padding: 14px 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .ask-submit { transition: none; }
  .ask-submit:hover { transform: none; }
}
```

- [ ] **Step 2: Verify the home page still renders unchanged**

Hard-reload `http://localhost:3050/` (Cmd+Shift+R). The section HTML doesn't exist yet, so visually nothing changes — no extra block appears.

Expected: page identical to before, no console errors.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "style(ask): add styles for 'Не нашли ответ' section"
```

---

## Task 2: Create `js/ask.js`

**Files:**
- Create: `js/ask.js`

- [ ] **Step 1: Create the file with the full module**

Write `js/ask.js` with this content:

```js
(function () {
  'use strict';

  let state = { question: '', name: '', phone: '' };

  function init() {
    const form = document.querySelector('[data-ask-form]');
    if (!form) return;

    form.addEventListener('input', onInput);
    form.addEventListener('submit', onSubmit);
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.matches('[data-ask-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.phone = normalizePhone(t.value);
    } else if (t.matches('[data-ask-name]')) {
      state.name = t.value;
    } else if (t.matches('[data-ask-question]')) {
      state.question = t.value;
    }
    t.classList.remove('is-invalid');
    const errEl = document.querySelector('[data-ask-error]');
    if (errEl) errEl.hidden = true;
  }

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const errEl = form.querySelector('[data-ask-error]');

    const err = validate();
    if (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      const field = form.querySelector(err.selector);
      if (field) field.classList.add('is-invalid');
      return;
    }

    console.log('[ask] submit', {
      question: state.question.trim(),
      name: state.name.trim(),
      phone: state.phone
    });
    // TODO: replace with POST /api/leads when backend is ready

    showThanks();
  }

  function validate() {
    if (state.question.trim().length < 3) {
      return { selector: '[data-ask-question]', message: 'Напишите вопрос (минимум 3 символа)' };
    }
    if (!state.name.trim()) {
      return { selector: '[data-ask-name]', message: 'Укажите имя' };
    }
    if (state.phone.length < 11) {
      return { selector: '[data-ask-phone]', message: 'Введите телефон полностью' };
    }
    return null;
  }

  function showThanks() {
    const section = document.querySelector('.ask');
    if (!section) return;
    const inner = section.querySelector('.ask-inner');
    if (!inner) return;
    inner.classList.add('ask-inner--thanks');
    inner.innerHTML = `
      <h2 class="ask-title"><strong>Спасибо!</strong></h2>
      <p class="ask-lead">Менеджер ответит вам в течение 10 минут.</p>
    `;
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

  document.addEventListener('DOMContentLoaded', init);
})();
```

- [ ] **Step 2: Syntax-check the file**

```bash
node --check js/ask.js && echo OK
```

Expected: `OK`. Any syntax error prints a stack trace.

- [ ] **Step 3: Verify the file is reachable from the dev server**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/js/ask.js
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add js/ask.js
git commit -m "feat(ask): add 'Не нашли ответ' form module"
```

---

## Task 3: Wire HTML into `index.html`

Insert the new `<section class="ask">` right before the `<!-- FOOTER -->` comment, and add the `<script src="js/ask.js">` tag right after the existing `<script src="js/consult.js">` tag.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Insert the section before the footer**

Find this in `index.html`:

```html
  </section>

  <!-- FOOTER -->
  <footer class="footer">
```

Replace with:

```html
  </section>

  <section class="ask" id="ask">
    <div class="ask-inner">
      <div class="ask-head">
        <h2 class="ask-title">
          <strong>Не нашли ответ</strong>
          <span>на свой вопрос?</span>
        </h2>
        <p class="ask-lead">Напишите его в окошко и наш менеджер ответит на него в течение 10 минут.</p>
      </div>
      <form class="ask-form" data-ask-form novalidate>
        <label class="ask-field">
          <textarea name="question" class="ask-textarea" placeholder="Ваш вопрос…" rows="4" data-ask-question></textarea>
        </label>
        <label class="ask-field">
          <input type="text" name="name" class="ask-input" placeholder="Имя" autocomplete="name" data-ask-name>
        </label>
        <label class="ask-field">
          <input type="tel" name="phone" class="ask-input" placeholder="+7 (000) 000-00-00" autocomplete="tel" inputmode="tel" data-ask-phone>
        </label>
        <p class="ask-error" data-ask-error hidden></p>
        <button type="submit" class="ask-submit">Отправить</button>
        <p class="ask-disclaimer">Нажимая на кнопку вы соглашаетесь на обработку данных</p>
      </form>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
```

- [ ] **Step 2: Add the `<script>` tag**

Find this in `index.html`:

```html
  <script src="js/consult.js?v=20260430" defer></script>
</body>
```

Replace with:

```html
  <script src="js/consult.js?v=20260430" defer></script>
  <script src="js/ask.js?v=20260430" defer></script>
</body>
```

- [ ] **Step 3: Verify the page renders and includes the new asset**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/
curl -s http://localhost:3050/ | grep -cE 'class="ask|data-ask-form|js/ask\.js'
```

Expected: `200` and at least `3` (one `class="ask"`-prefixed match for `<section class="ask"`, one `data-ask-form`, one `js/ask.js`).

- [ ] **Step 4: Browser smoke test on `index.html`**

Hard-reload `http://localhost:3050/` (Cmd+Shift+R), open DevTools Console.

1. Scroll to the bottom of the page. The new section appears between the contacts/map block and the footer, with title "Не нашли ответ / на свой вопрос?" (first line bold, second thin), subtitle paragraph, big rounded textarea placeholder "Ваш вопрос…", "Имя" input, phone input "+7 (000) 000-00-00", "Отправить" button (outlined white pill), and a small grey disclaimer line.
2. Click "Отправить" with all fields empty.
   - Expected: red text "Напишите вопрос (минимум 3 символа)" appears under the form, the textarea gets a red border.
3. Type 2 chars in the question. Click "Отправить".
   - Expected: same error (after `trim()` → 2 chars).
4. Type a longer question (3+ chars). Leave name empty. Click "Отправить".
   - Expected: error text switches to "Укажите имя", textarea border resets to neutral, name input gets red border. (Verify the question's red border was cleared — it should be neutral now since you typed in it.)
5. Type a name. Type 4 digits in the phone field. Click "Отправить".
   - Expected: phone formats live as `+7 (XXX) X...`. Error text switches to "Введите телефон полностью", phone input gets red border.
6. Fill phone fully (10 digits after +7). Click "Отправить".
   - Expected: section content swaps to "Спасибо!" + "Менеджер ответит вам в течение 10 минут.". Console shows: `[ask] submit { question: '...', name: '...', phone: '7XXXXXXXXXX' }`.
7. Hard-reload the page. The form is back to empty.
8. Hover over "Отправить" (without filling) — button background fills with a sky-blue gradient and lifts slightly.
9. **Regressions:** Hero "РАССЧИТАТЬ СТОИМОСТЬ" still opens the multi-step quiz; the floating CTA bottom-right still opens the quiz; the "Бесплатная консультация" button at the bottom of the contacts area still opens the consultation modal.

Expected: all 9 checks pass, no console errors related to `ask`/`form`.

- [ ] **Step 5: Mobile viewport check**

In DevTools toggle device toolbar (Cmd+Shift+M), set viewport to 375×667, hard-reload.

Expected: section padding tighter, title `font-size: 22px`, fields and submit button visible without horizontal scroll, "Отправить" stretches to full width.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(index): add 'Не нашли ответ' section before footer"
```

---

## Done state

All of:
- New section visible on the home page between the contacts/map block and the footer.
- Empty submit shows "Напишите вопрос (минимум 3 символа)"; partial fills cycle through "Укажите имя" / "Введите телефон полностью".
- Live phone mask `+7 (XXX) XXX-XX-XX` while typing.
- Successful submit logs `[ask] submit { question, name, phone }` and replaces section content with "Спасибо!".
- Mobile viewport renders correctly.
- Quiz, floating CTA, and consult modal still work unchanged.
- 3 commits added to the branch (one per code-changing task).

## Out of scope (do not do)

- Refactor `js/quiz.js` or `js/consult.js` to share the phone mask.
- Add a real backend endpoint for leads.
- Add the section to other pages.
- Add analytics or tracking.
- Persist form draft to `localStorage`.
- `git push` or any deployment action — leave that to the user.

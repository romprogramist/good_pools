# Behavioral Interest Popup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `models.html`, score each user's interest in a specific pool model via active dwell time, photo gallery scrolling, and repeat opens. When the score crosses the threshold, show a non-intrusive toast that expands into a lead form on click. Phase 1 is frontend-only — submit goes to `console.log` plus a "Спасибо" UI.

**Architecture:** Three new files (`js/interest-tracker.js`, `js/interest-popup.js`, `css/interest-popup.css`) and minimal additive edits to `js/gallery-modal.js`, `js/models.js`, and `models.html`. Communication between tracker and popup happens via `CustomEvent` on `document` — neither imports the other. The tracker also stays decoupled from `GalleryModal` by listening to events the modal dispatches; on pages without `GalleryModal` (or without a model id) the tracker is silent.

**Tech Stack:** Vanilla HTML/CSS/JS, native `<dialog>`, `localStorage` + `sessionStorage`. No build step, no automated test framework — verification is manual via the dev server at `http://localhost:3050/`. The project follows the same pattern as the existing `js/consult.js` + `css/consult.css` modal.

**Spec:** [`docs/superpowers/specs/2026-05-04-interest-popup-design.md`](../specs/2026-05-04-interest-popup-design.md)

---

## Pre-flight

Confirm the dev server is running:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3050/models.html
```

Expected: `200`. If not, run in a separate terminal:

```bash
cd ~/good_pools && npm run dev
```

Confirm the models API returns data with `id`, `name`, and `gallery`:

```bash
curl -s http://localhost:3050/api/models | head -c 400
```

Expected: JSON array, each entry has `"id":"..."`, `"name":"..."`, `"gallery":[...]`.

---

## Task 1: Dispatch `gallery:*` events from `js/gallery-modal.js`

This is a non-breaking refactor: existing consumers (`portfolio.html`, `models.html`) continue to work, but a new event channel becomes available.

**Files:**
- Modify: `js/gallery-modal.js`

- [ ] **Step 1: Open `js/gallery-modal.js` and add the `gallery:open` dispatch in `open(item)`**

In `function open(item)` (around line 137), insert the dispatch **before** `render()` so that `gallery:open` always fires before the first `gallery:photo`. Replace this block:

```js
  function open(item) {
    ensureMounted();
    currentItem = item;
    currentIndex = 0;
    triggerEl = item.triggerEl || null;
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    render();
    modalEl.hidden = false;
    closeBtn.focus();
  }
```

with:

```js
  function open(item) {
    ensureMounted();
    currentItem = item;
    currentIndex = 0;
    triggerEl = item.triggerEl || null;
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.dispatchEvent(new CustomEvent('gallery:open', {
      detail: { id: item.id || null, name: item.title || '' }
    }));

    render();
    modalEl.hidden = false;
    closeBtn.focus();
  }
```

- [ ] **Step 2: Add the `gallery:photo` dispatch at the end of `render()`**

In `function render()` (around line 77), append the dispatch at the end of the function (after `preloadNeighbors()`). Replace this final block of `render()`:

```js
    counterEl.textContent = multi ? ((currentIndex + 1) + ' / ' + gallery.length) : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;

    const leftover = modalEl.querySelector('.pgal-image-placeholder');
    if (leftover) leftover.remove();

    preloadNeighbors();
  }
```

with:

```js
    counterEl.textContent = multi ? ((currentIndex + 1) + ' / ' + gallery.length) : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;

    const leftover = modalEl.querySelector('.pgal-image-placeholder');
    if (leftover) leftover.remove();

    preloadNeighbors();

    document.dispatchEvent(new CustomEvent('gallery:photo', {
      detail: {
        id: currentItem.id || null,
        index: currentIndex,
        total: gallery.length,
        url: src || null
      }
    }));
  }
```

- [ ] **Step 3: Add the `gallery:close` dispatch in `close()`**

In `function close()` (around line 150), insert the dispatch **before** `currentItem = null`. Replace:

```js
  function close() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.style.overflow = prevBodyOverflow;
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
    currentItem = null;
    triggerEl = null;
  }
```

with:

```js
  function close() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.style.overflow = prevBodyOverflow;
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
    document.dispatchEvent(new CustomEvent('gallery:close', {
      detail: { id: currentItem ? (currentItem.id || null) : null }
    }));
    currentItem = null;
    triggerEl = null;
  }
```

- [ ] **Step 4: Manual verify — events fire, existing pages still work**

Open `http://localhost:3050/portfolio.html` in the browser. Open DevTools → Console. Paste:

```js
['gallery:open', 'gallery:close', 'gallery:photo'].forEach(e => document.addEventListener(e, ev => console.log(e, ev.detail)));
```

Then:
1. Click any portfolio card → expect `gallery:open {id: null, name: '<title>'}` followed by `gallery:photo {id: null, index: 0, total: <n>, url: '...'}` (id is null because portfolio doesn't pass an id — that's correct).
2. Press → arrow → expect another `gallery:photo` with `index: 1`.
3. Press Esc → expect `gallery:close {id: null}`.
4. The portfolio gallery itself works the same as before (no visual change).

Then open `http://localhost:3050/models.html`, paste the listener again, click any model card. Expect the same events but still `id: null` (Task 2 will fix this for models.html).

- [ ] **Step 5: Commit**

```bash
cd ~/good_pools
git add js/gallery-modal.js
git commit -m "feat(gallery-modal): dispatch gallery:open/close/photo CustomEvents

Adds an event channel so other modules can react to gallery state
changes without touching the modal internals. Used by the upcoming
interest tracker. No behavior change for existing consumers
(portfolio.html, models.html)."
```

---

## Task 2: Pass model `id` to `GalleryModal.open(...)` in `js/models.js`

**Files:**
- Modify: `js/models.js`

- [ ] **Step 1: Add `id: model.id` to the `GalleryModal.open(...)` call**

In `js/models.js`, find `function openModelInGallery` (line 38). Replace:

```js
  function openModelInGallery(model, index, cardEl) {
    GalleryModal.open({
      title: model.name,
      infoLines: [
        model.series,
        model.desc,
        model.specs + ' · ' + model.price
      ],
      gallery: model.gallery && model.gallery.length ? model.gallery : [],
      triggerEl: cardEl
    });
  }
```

with:

```js
  function openModelInGallery(model, index, cardEl) {
    GalleryModal.open({
      id: model.id,
      title: model.name,
      infoLines: [
        model.series,
        model.desc,
        model.specs + ' · ' + model.price
      ],
      gallery: model.gallery && model.gallery.length ? model.gallery : [],
      triggerEl: cardEl
    });
  }
```

- [ ] **Step 2: Manual verify — `id` is now in the events**

Reload `http://localhost:3050/models.html`. In Console, paste:

```js
document.addEventListener('gallery:open', e => console.log('OPEN', e.detail));
document.addEventListener('gallery:photo', e => console.log('PHOTO', e.detail));
```

Click any model card (e.g. HIIT). Expect:
- `OPEN {id: 'hii', name: 'HIIT'}` — `id` is **not null**.
- `PHOTO {id: 'hii', index: 0, total: 2, url: '/uploads/models/...'}`.

The actual `id` value depends on what `/api/models` returns — any non-null string is correct.

- [ ] **Step 3: Commit**

```bash
cd ~/good_pools
git add js/models.js
git commit -m "feat(models): pass model id to GalleryModal.open

Required so the upcoming interest tracker can attribute dwell time
and photo views to the specific model. Portfolio (and any other
consumer that doesn't pass id) is unaffected."
```

---

## Task 3: Create `js/interest-tracker.js`

This is the score engine. It listens to `gallery:*` events, maintains per-model state in `localStorage`, and dispatches `interest:trigger` when the score crosses the threshold.

**Files:**
- Create: `js/interest-tracker.js`

- [ ] **Step 1: Create the file with the full module**

Create `js/interest-tracker.js`:

```js
// Behavioral interest tracker. Listens to gallery:open/close/photo events,
// maintains a per-model interest score in localStorage, and dispatches
// `interest:trigger` when the score crosses CONFIG.TRIGGER_THRESHOLD.
// See docs/superpowers/specs/2026-05-04-interest-popup-design.md.

(function () {
  'use strict';

  const STORAGE_KEY = 'gp_interest_v1';
  const SESSION_KEY = 'gp_interest_shown_session';
  const DAY_MS = 24 * 60 * 60 * 1000;

  const CONFIG = {
    TRIGGER_THRESHOLD: 10,
    DISMISS_PAUSE_DAYS: 7,
    IDLE_AFTER_MS: 15000,
    WEIGHTS: {
      secondActive: 0.2,
      photoView: 1.5,
      secondOpen: 3,
      nthOpen: 5,
      lastPhoto: 2
    },
    CAPS: {
      secondsPerOpen: 8,
      photosPerOpen: 6
    }
  };

  function emptyState() {
    return {
      scores: {},
      opens: {},
      photosViewed: {},
      lastPhotoAwarded: {},
      triggered: {},
      dismissed: {},
      submitted: {}
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return Object.assign(emptyState(), JSON.parse(raw));
    } catch (e) {
      return emptyState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // localStorage unavailable (private mode, quota): keep going in-memory.
    }
  }

  let state = loadState();

  // Per-open accumulators (reset on every gallery:open)
  let currentId = null;
  let currentName = '';
  let openSecondsAccrued = 0;
  let openPhotoBalanceAccrued = 0;

  // Activity detection
  let lastActivity = Date.now();
  let activityTimer = null;

  function bumpActivity() { lastActivity = Date.now(); }

  function isActiveNow() {
    if (document.visibilityState !== 'visible') return false;
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
    if (Date.now() - lastActivity > CONFIG.IDLE_AFTER_MS) return false;
    return true;
  }

  function startActivityTimer() {
    if (activityTimer) return;
    activityTimer = setInterval(activityTick, 1000);
  }

  function stopActivityTimer() {
    if (activityTimer) {
      clearInterval(activityTimer);
      activityTimer = null;
    }
  }

  function activityTick() {
    if (!currentId) return;
    if (!isActiveNow()) return;
    if (openSecondsAccrued >= CONFIG.CAPS.secondsPerOpen) return;
    const remaining = CONFIG.CAPS.secondsPerOpen - openSecondsAccrued;
    const inc = Math.min(CONFIG.WEIGHTS.secondActive, remaining);
    addScore(currentId, inc);
    openSecondsAccrued += inc;
    saveState();
    maybeTrigger(currentId, currentName);
  }

  function addScore(id, delta) {
    state.scores[id] = (state.scores[id] || 0) + delta;
  }

  function maybeTrigger(id, name) {
    if (!id) return;
    if (state.submitted[id]) return;
    const dismissedAt = state.dismissed[id];
    if (dismissedAt && Date.now() - dismissedAt < CONFIG.DISMISS_PAUSE_DAYS * DAY_MS) return;
    if ((state.scores[id] || 0) < CONFIG.TRIGGER_THRESHOLD) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch (e) {
      // sessionStorage unavailable; treat as "not shown yet" — let it fire.
    }
    state.triggered[id] = Date.now();
    saveState();
    document.dispatchEvent(new CustomEvent('interest:trigger', {
      detail: { id: id, name: name }
    }));
  }

  document.addEventListener('gallery:open', function (e) {
    const detail = e.detail || {};
    const id = detail.id;
    if (!id) return;
    currentId = id;
    currentName = detail.name || '';
    openSecondsAccrued = 0;
    openPhotoBalanceAccrued = 0;
    lastActivity = Date.now();

    state.opens[id] = (state.opens[id] || 0) + 1;
    if (state.opens[id] === 2) {
      addScore(id, CONFIG.WEIGHTS.secondOpen);
    } else if (state.opens[id] >= 3) {
      addScore(id, CONFIG.WEIGHTS.nthOpen);
    }
    saveState();
    startActivityTimer();
    maybeTrigger(id, currentName);
  });

  document.addEventListener('gallery:close', function () {
    stopActivityTimer();
    currentId = null;
    currentName = '';
    openSecondsAccrued = 0;
    openPhotoBalanceAccrued = 0;
  });

  document.addEventListener('gallery:photo', function (e) {
    const detail = e.detail || {};
    const id = detail.id;
    if (!id || id !== currentId) return;
    const url = detail.url;
    const index = detail.index;
    const total = detail.total;

    if (url) {
      const seen = state.photosViewed[id] || [];
      if (seen.indexOf(url) === -1) {
        seen.push(url);
        state.photosViewed[id] = seen;
        if (openPhotoBalanceAccrued < CONFIG.CAPS.photosPerOpen) {
          const remaining = CONFIG.CAPS.photosPerOpen - openPhotoBalanceAccrued;
          const inc = Math.min(CONFIG.WEIGHTS.photoView, remaining);
          addScore(id, inc);
          openPhotoBalanceAccrued += inc;
        }
      }
    }

    if (typeof index === 'number' && typeof total === 'number' && total > 0 && index === total - 1) {
      if (!state.lastPhotoAwarded[id]) {
        addScore(id, CONFIG.WEIGHTS.lastPhoto);
        state.lastPhotoAwarded[id] = Date.now();
      }
    }

    saveState();
    maybeTrigger(id, currentName);
  });

  ['mousemove', 'keydown', 'touchmove', 'scroll', 'click'].forEach(function (ev) {
    document.addEventListener(ev, bumpActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') bumpActivity();
  });

  window.InterestTracker = {
    markDismissed: function (id) {
      if (!id) return;
      state.dismissed[id] = Date.now();
      saveState();
    },
    markSubmitted: function (id) {
      if (!id) return;
      state.submitted[id] = Date.now();
      saveState();
    },
    getSnapshot: function (id) {
      return {
        score: state.scores[id] || 0,
        opens: state.opens[id] || 0,
        photosViewed: (state.photosViewed[id] || []).length,
        activeSeconds: openSecondsAccrued > 0
          ? Math.round(openSecondsAccrued / CONFIG.WEIGHTS.secondActive)
          : 0,
        triggeredAt: state.triggered[id] || null
      };
    },
    _state: function () { return state; },
    _config: CONFIG,
    _reset: function () {
      state = emptyState();
      saveState();
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
  };
})();
```

- [ ] **Step 2: Manual verify — score grows, threshold triggers**

The tracker isn't wired into any HTML page yet (Task 6 does that). For this verify step you don't edit any HTML — load the new module ad-hoc via the browser Console.

Open `http://localhost:3050/models.html`. In DevTools → Console, paste a one-shot loader:

```js
const s = document.createElement('script');
s.src = 'js/interest-tracker.js?nocache=' + Date.now();
document.head.appendChild(s);
```

Then paste:

```js
document.addEventListener('interest:trigger', e => console.log('TRIGGER', e.detail));
window.InterestTracker._reset();
```

Click a model card to open the gallery. After ~50 seconds of active viewing (mouse moves), expect:
1. `console.log('TRIGGER', { id: '...', name: '...' })` to fire.
2. `InterestTracker.getSnapshot('hii')` (or whatever id) returns a `score` ≥ 10.
3. `InterestTracker._state()` shows `triggered: {hii: <ms>}`.

Then:
4. Reload the page → `InterestTracker._state()` still shows the previous score (persisted in localStorage).
5. Open the same model again → no new trigger (sessionStorage block per session).
6. Open a different tab, repeat → trigger fires there too (new session).

For a faster smoke test, temporarily edit `js/interest-tracker.js` and change `TRIGGER_THRESHOLD: 10` to `TRIGGER_THRESHOLD: 2`, reload the page, and re-run the loader. **Restore the value to `10` before committing in Step 3** — `git diff js/interest-tracker.js` should show no leftover threshold change.

- [ ] **Step 3: Commit**

```bash
cd ~/good_pools
git add js/interest-tracker.js
git commit -m "feat(interest): add interest-tracker module

Listens to gallery:open/close/photo events, maintains a per-model
interest score (active dwell time, unique photo views, repeat opens,
last-photo bonus) in localStorage. Dispatches interest:trigger when
the score crosses the threshold; respects per-session and per-model
dismiss/submit cooldowns."
```

---

## Task 4: Create `css/interest-popup.css`

Styles for both the toast and the dialog. Color palette and typography align with `consult.css`.

**Files:**
- Create: `css/interest-popup.css`

- [ ] **Step 1: Create the file with the full stylesheet**

Create `css/interest-popup.css`:

```css
/* ===== Toast ===== */
.interest-toast {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 340px;
  max-width: calc(100vw - 16px);
  background: #fff;
  color: #0f1117;
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(3, 105, 161, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 16px 18px;
  z-index: 10010;
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
  cursor: pointer;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.interest-toast--enter { opacity: 1; transform: translateY(0); }
.interest-toast--leave { opacity: 0; transform: translateY(20px); }

.interest-toast__body { padding-right: 28px; }

.interest-toast__title {
  font-size: 15px;
  font-weight: 800;
  color: #0c4a6e;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.interest-toast__text {
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.interest-toast__cta {
  position: absolute;
  right: 18px;
  bottom: 14px;
  font-size: 18px;
  color: #0ea5e9;
  font-weight: 700;
}

.interest-toast__close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: #94a3b8;
}
.interest-toast__close:hover { color: #0f1117; }

@media (max-width: 600px) {
  .interest-toast {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
  }
}

/* ===== Dialog ===== */
.interest-dialog {
  border: none;
  padding: 0;
  background: #fff;
  color: #0f1117;
  max-width: 460px;
  width: calc(100vw - 32px);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
  inset: 0;
  margin: auto;
}
.interest-dialog::backdrop { background: rgba(15, 17, 23, 0.55); }

.interest-dialog__close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #555;
}
.interest-dialog__close:hover { color: #000; }

.interest-dialog__body { padding: 36px 32px 28px; }

.interest-dialog__title {
  margin: 0 0 14px;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.5px;
  line-height: 1.25;
  color: #0c4a6e;
}

.interest-dialog__lead {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 1.6;
  color: #475569;
}

.interest-dialog__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.interest-dialog__field { display: block; }

.interest-dialog__input {
  width: 100%;
  font-family: inherit;
  font-size: 15px;
  padding: 14px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.interest-dialog__input:focus {
  border-color: #0ea5e9;
  background: #fff;
}

.interest-dialog__details { margin-top: 4px; }

.interest-dialog__summary {
  font-size: 13px;
  color: #0ea5e9;
  cursor: pointer;
  padding: 6px 0;
  list-style: none;
  user-select: none;
}
.interest-dialog__summary::-webkit-details-marker { display: none; }
.interest-dialog__summary::before {
  content: '▸ ';
  display: inline-block;
}
.interest-dialog__details[open] .interest-dialog__summary::before { content: '▾ '; }

.interest-dialog__error {
  margin: 4px 4px 0;
  font-size: 12px;
  color: #dc2626;
}

.interest-dialog__submit {
  margin-top: 8px;
  padding: 14px 24px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(14, 165, 233, 0.25);
  transition: transform 0.2s, box-shadow 0.2s;
}
.interest-dialog__submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(14, 165, 233, 0.35);
}

.interest-dialog__disclaimer {
  margin-top: 10px;
  font-size: 11px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.5;
}

.interest-dialog__thanks {
  text-align: center;
  padding-top: 48px;
}
```

- [ ] **Step 2: Verify the file is valid CSS (no syntax errors)**

Browsers parse CSS leniently, so the easiest check is to load the file in DevTools after Task 6 wires it. For now:

```bash
cd ~/good_pools && wc -l css/interest-popup.css
```

Expected: a non-zero line count (~190 lines).

- [ ] **Step 3: Commit**

```bash
cd ~/good_pools
git add css/interest-popup.css
git commit -m "feat(interest): add interest-popup styles

Toast (bottom-right, full-width on mobile) and dialog (centered modal).
Palette and typography match consult.css for visual consistency."
```

---

## Task 5: Create `js/interest-popup.js`

UI module: listens to `interest:trigger`, shows the toast, expands into a dialog with the lead form, handles submit (`console.log` + "Thanks" view).

**Files:**
- Create: `js/interest-popup.js`

- [ ] **Step 1: Create the file with the full module**

Create `js/interest-popup.js`:

```js
// Interest popup UI. Listens to interest:trigger from interest-tracker.js,
// shows a toast → on click expands to a <dialog> with the lead form.
// Submit goes to console.log + UI "Спасибо" (no backend in phase 1).
// See docs/superpowers/specs/2026-05-04-interest-popup-design.md.

(function () {
  'use strict';

  const TOAST_ID = 'interestToast';
  const DIALOG_ID = 'interestDialog';

  let state = {
    id: null,
    name: '',
    submitted: false,
    form: { name: '', phone: '', location: '' }
  };

  document.addEventListener('interest:trigger', function (e) {
    const detail = e.detail || {};
    if (!detail.id) return;
    state.id = detail.id;
    state.name = detail.name || '';
    state.submitted = false;
    state.form = { name: '', phone: '', location: '' };
    showToast();
  });

  document.addEventListener('gallery:close', function () {
    const toast = document.getElementById(TOAST_ID);
    if (toast && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      removeToast();
    }
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      dlg.close();
    }
  });

  function showToast() {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.className = 'interest-toast';
      toast.setAttribute('role', 'dialog');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML =
      '<button type="button" class="interest-toast__close" aria-label="Закрыть" data-itoast-close>×</button>' +
      '<div class="interest-toast__body" data-itoast-expand>' +
        '<div class="interest-toast__title">Понравилась ' + escapeHtml(state.name) + '?</div>' +
        '<div class="interest-toast__text">Расскажем, как примерить её на ваш участок — без обязательств.</div>' +
        '<div class="interest-toast__cta">→</div>' +
      '</div>';
    toast.classList.remove('interest-toast--leave');
    requestAnimationFrame(function () { toast.classList.add('interest-toast--enter'); });

    toast.querySelector('[data-itoast-close]').addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      removeToast();
    });
    toast.querySelector('[data-itoast-expand]').addEventListener('click', function () {
      removeToast();
      openDialog();
    });
  }

  function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (!toast) return;
    toast.classList.remove('interest-toast--enter');
    toast.classList.add('interest-toast--leave');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }

  function openDialog() {
    let dlg = document.getElementById(DIALOG_ID);
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = DIALOG_ID;
      dlg.className = 'interest-dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) closeDialog();
        if (e.target.closest('[data-idlg-close]')) closeDialog();
      });
      dlg.addEventListener('input', onInput);
      dlg.addEventListener('submit', onSubmit);
    }
    dlg.innerHTML = renderForm();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    setTimeout(function () {
      const nameInput = dlg.querySelector('[data-idlg-name]');
      if (nameInput) nameInput.focus();
    }, 50);
  }

  function closeDialog() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
    }
    dlg.close();
  }

  function renderForm() {
    return (
      '<button type="button" class="interest-dialog__close" aria-label="Закрыть" data-idlg-close>×</button>' +
      '<div class="interest-dialog__body">' +
        '<h2 class="interest-dialog__title">Примерим ' + escapeHtml(state.name) + ' у вас на участке</h2>' +
        '<p class="interest-dialog__lead">Менеджер свяжется в течение дня, расскажет про монтаж и подготовит расчёт под ваш участок.</p>' +
        '<form class="interest-dialog__form" data-idlg-form novalidate>' +
          '<label class="interest-dialog__field">' +
            '<input type="text" name="name" class="interest-dialog__input" placeholder="Имя" autocomplete="name" data-idlg-name>' +
          '</label>' +
          '<label class="interest-dialog__field">' +
            '<input type="tel" name="phone" class="interest-dialog__input" placeholder="+7 (000) 000-00-00" autocomplete="tel" inputmode="tel" data-idlg-phone>' +
          '</label>' +
          '<details class="interest-dialog__details">' +
            '<summary class="interest-dialog__summary">Указать участок (необязательно)</summary>' +
            '<label class="interest-dialog__field">' +
              '<input type="text" name="location" class="interest-dialog__input" placeholder="Адрес или размер участка" data-idlg-location>' +
            '</label>' +
          '</details>' +
          '<p class="interest-dialog__error" data-idlg-error hidden></p>' +
          '<button type="submit" class="interest-dialog__submit">Отправить заявку</button>' +
          '<p class="interest-dialog__disclaimer">Нажимая, вы соглашаетесь на обработку данных</p>' +
        '</form>' +
      '</div>'
    );
  }

  function renderThanks() {
    return (
      '<button type="button" class="interest-dialog__close" aria-label="Закрыть" data-idlg-close>×</button>' +
      '<div class="interest-dialog__body interest-dialog__thanks">' +
        '<h2 class="interest-dialog__title">Спасибо!</h2>' +
        '<p class="interest-dialog__lead">Менеджер свяжется в ближайшее время.</p>' +
        '<button type="button" class="interest-dialog__submit" data-idlg-close>Закрыть</button>' +
      '</div>'
    );
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.matches('[data-idlg-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.form.phone = normalizePhone(t.value);
    } else if (t.matches('[data-idlg-name]')) {
      state.form.name = t.value;
    } else if (t.matches('[data-idlg-location]')) {
      state.form.location = t.value;
    }
  }

  function onSubmit(e) {
    if (!e.target.matches('[data-idlg-form]')) return;
    e.preventDefault();
    const err = validate();
    const errEl = e.target.querySelector('[data-idlg-error]');
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    const snap = window.InterestTracker
      ? window.InterestTracker.getSnapshot(state.id)
      : { score: null, opens: null, photosViewed: null, activeSeconds: null, triggeredAt: null };

    console.log('[interest-popup] submit', {
      source: 'interest_popup',
      model_id: state.id,
      model_name: state.name,
      name: state.form.name.trim(),
      phone: state.form.phone,
      location: state.form.location.trim(),
      score: snap.score,
      signals: {
        activeSeconds: snap.activeSeconds,
        photosViewed: snap.photosViewed,
        opens: snap.opens
      },
      triggeredAt: snap.triggeredAt
    });
    // TODO: replace with POST /api/leads when backend is ready

    state.submitted = true;
    if (window.InterestTracker) window.InterestTracker.markSubmitted(state.id);

    const dlg = document.getElementById(DIALOG_ID);
    if (dlg) dlg.innerHTML = renderThanks();
  }

  function validate() {
    if (!state.form.name.trim()) return 'Укажите имя';
    if (state.form.phone.length < 11) return 'Введите телефон полностью';
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Copies of formatPhoneMask / normalizePhone from js/consult.js — kept
  // local on purpose to keep modules independent (same approach as
  // consult.js vs quiz.js).
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
})();
```

- [ ] **Step 2: Manual verify — toast and dialog UI work in isolation**

Tracker isn't wired yet (Task 6) — but you can dry-run the popup module by manually loading it. On `models.html`, in the Console:

```js
['css/interest-popup.css', 'js/interest-popup.js'].forEach(p => {
  if (p.endsWith('.css')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = p + '?nocache=' + Date.now(); document.head.appendChild(l);
  } else {
    const s = document.createElement('script'); s.src = p + '?nocache=' + Date.now(); document.head.appendChild(s);
  }
});
```

Wait one second, then fire a fake trigger:

```js
document.dispatchEvent(new CustomEvent('interest:trigger', { detail: { id: 'test', name: 'TEST POOL' } }));
```

Verify:
1. Toast appears bottom-right, headline says "Понравилась TEST POOL?".
2. Click toast body → dialog opens with form, headline "Примерим TEST POOL у вас на участке".
3. The "Указать участок" toggle expands/collapses.
4. Submit empty form → red error "Укажите имя".
5. Type a name + an incomplete phone → error "Введите телефон полностью".
6. Type valid name + valid phone (`+7 (912) 345-67-89`) + submit → "Спасибо" view, console shows `[interest-popup] submit { source: 'interest_popup', model_id: 'test', ... }`.
7. Close [×] → dialog closes, gallery (if open) is unaffected.

On mobile (DevTools device emulation), toast spans full width minus 16px.

- [ ] **Step 3: Commit**

```bash
cd ~/good_pools
git add js/interest-popup.js
git commit -m "feat(interest): add interest-popup UI module

Listens to interest:trigger, shows a toast that expands into a
<dialog> with a lead form (name + phone + optional location). Submit
logs to console with full context (model id, score, signals) — backend
POST /api/leads is deferred. Marks dismissed/submitted on the tracker
to manage cooldowns."
```

---

## Task 6: Wire up `models.html` and verify end-to-end

**Files:**
- Modify: `models.html`

- [ ] **Step 1: Add the CSS link in `<head>`**

In `models.html`, after the existing `<link rel="stylesheet" href="css/consult.css?v=20260430">` line (line 9), add:

```html
  <link rel="stylesheet" href="css/interest-popup.css?v=20260504">
```

The full `<head>` block should now end like:

```html
  <link rel="stylesheet" href="css/style.css?v=20260429-rr1100">
  <link rel="stylesheet" href="css/quiz.css?v=20260430-center">
  <link rel="stylesheet" href="css/consult.css?v=20260430">
  <link rel="stylesheet" href="css/interest-popup.css?v=20260504">
</head>
```

- [ ] **Step 2: Add the script tags after `js/models.js`**

In `models.html`, after the existing `<script src="js/models.js?v=20260416l"></script>` line (line 121), add **two** new script tags. Order matters — tracker first (defines `window.InterestTracker` and listens to gallery events), then popup (uses tracker and listens to `interest:trigger`):

```html
  <script src="js/interest-tracker.js?v=20260504"></script>
  <script src="js/interest-popup.js?v=20260504"></script>
```

The block around lines 117-122 should now read:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/gallery-modal.js?v=20260416l"></script>
  <script src="js/models.js?v=20260416l"></script>
  <script src="js/interest-tracker.js?v=20260504"></script>
  <script src="js/interest-popup.js?v=20260504"></script>
```

(Note: not using `defer` because `gallery-modal.js` and `models.js` above also don't use `defer` — keep load order consistent with the existing pattern. The DOMContentLoaded handlers inside the modules manage their own timing.)

- [ ] **Step 3: End-to-end manual verification**

Reload `http://localhost:3050/models.html` (force reload to bust cache: Cmd-Shift-R).

In Console, reset state for a clean slate:

```js
window.InterestTracker._reset();
sessionStorage.removeItem('gp_interest_shown_session');
```

Run these scenarios:

| # | Scenario | Expected |
|---|---|---|
| 1 | Open HIIT, sit and watch (mouse moves a bit) for ~50 sec | Toast appears bottom-right: "Понравилась HIIT?" |
| 2 | _After (1)_ close toast [×], open ZEN, watch 50 sec | No toast (one-per-session lock) |
| 3 | New tab, reset, open HIIT, click prev/next 3+ times within ~10 sec | Toast appears within ~10 sec |
| 4 | New tab, reset, open HIIT for 5 sec, close; open again (~5 sec); open third time | On the 3rd open, toast appears almost immediately |
| 5 | Click toast body | Dialog opens with form, headline "Примерим HIIT у вас на участке" |
| 6 | Submit valid name + phone | "Спасибо" UI; Console: `[interest-popup] submit { source: 'interest_popup', model_id: 'hii', model_name: 'HIIT', name, phone, score, signals: { activeSeconds, photosViewed, opens }, triggeredAt }` with non-null values |
| 7 | _After (6)_ reset session marker only (`sessionStorage.removeItem('gp_interest_shown_session')`), reload, view HIIT again | No toast — `submitted` lock persists across sessions |
| 8 | New tab, reset, open HIIT, switch to a different browser tab, wait 2 min, return | No toast (timer was paused while tab was hidden) |
| 9 | DevTools → toggle device emulation (e.g. iPhone 13), reset, open HIIT, swipe through photos | Toast spans full width minus 16px on mobile, dialog scales to viewport |
| 10 | Open `http://localhost:3050/portfolio.html` (no models, no id) | No errors in console; gallery still works; no toast ever |

For scenario (1) and similar long-dwell tests: it's faster to lower the threshold temporarily by editing `CONFIG.TRIGGER_THRESHOLD: 2` in `js/interest-tracker.js`, then **restore to 10 before commit**. Alternatively, just trigger many photo views (cheaper and tests the same path).

- [ ] **Step 4: Commit**

```bash
cd ~/good_pools
git add models.html
git commit -m "feat(models): wire up interest popup on models.html

Loads css/interest-popup.css and the two new JS modules
(interest-tracker, interest-popup). Order matters: tracker before
popup. The feature is now live: 50s of active dwell, 4 unique photo
views, or repeat opens of the same model trigger a toast that
expands into a lead form. Submit logs to console; POST /api/leads
will be wired in a follow-up."
```

- [ ] **Step 5: Push when ready**

When you're satisfied with manual verification:

```bash
cd ~/good_pools
git push origin main
```

This triggers the GitHub Actions deploy workflow (see project `CLAUDE.md`), which rsyncs front+back to the server, runs migrations, and restarts pm2. There are no DB migrations in this feature — purely static files.

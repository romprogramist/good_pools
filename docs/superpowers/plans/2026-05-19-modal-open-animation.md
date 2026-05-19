# Plавное открытие модалок — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести три нативных `<dialog>` (`.quiz-modal`, `.consult-modal`, `.interest-dialog`) к fade+scale-открытию/закрытию, одинаковому с уже работающей `.pgal-modal`.

**Architecture:** Класс-based `.is-open` toggle. JS делает `showModal()` → `requestAnimationFrame()` добавляет класс. На закрытии класс снимается, `setTimeout(280ms)` → реальный `dlg.close()`. Перехват ESC через `'cancel'`-event, чтобы тоже шёл через анимированный путь. Используем существующие токены `--motion-slow` / `--ease-out` / `--ease-spring`.

**Tech Stack:** Vanilla CSS + vanilla JS, без сборщика. Express dev-server на `http://localhost:3050/`.

**Spec:** `docs/superpowers/specs/2026-05-19-modal-open-animation-design.md` (commits `a6622c1`, `d3d8369`).

**Verification model:** UI-тестов в проекте нет. Каждая задача завершается smoke-проверкой в браузере по чек-листу. Локальный запуск: `npm run dev` → `http://localhost:3050/`. Если dev-сервер уже работает (порт 3050 занят) — пользуемся им.

---

## File Structure

**Модифицировать:**
- `css/consult.css` — +CSS-блок для `.consult-modal` (~12 строк в конец файла)
- `css/quiz.css` — +CSS-блок для `.quiz-modal` (~12 строк в конец)
- `css/interest-popup.css` — +CSS-блок для `.interest-dialog` (~12 строк в конец, перед существующими медиа-запросами если они в самом конце)
- `js/consult.js` — обернуть open/close, добавить cancel-listener
- `js/quiz.js` — обернуть open/close, добавить cancel-listener
- `js/interest-popup.js` — обернуть open/close (две точки close: closeDialog + gallery:close handler), добавить cancel-listener
- `index.html`, `models.html`, `catalog.html`, `portfolio.html` — bump cache-buster до `motion10` для затронутых файлов

**НЕ трогаем:** `.pgal-modal`, `.menu-overlay`, `.cookie-banner`, `.interest-toast`, `js/motion.js`, никакой HTML-разметки внутри модалок.

---

### Task 1: Анимировать `.consult-modal`

**Files:**
- Modify: `css/consult.css` — добавить блок в конец файла
- Modify: `js/consult.js` — обернуть `dlg.showModal()` и `dlg.close()`, добавить `'cancel'`-listener

- [ ] **Step 1: Убедиться что dev-сервер запущен**

```
1. Открыть http://localhost:3050/ в Chrome
2. Если не отвечает — запустить `npm run dev` в C:\Users\Roman\good_pools
3. Открыть в Chrome incognito (чтобы избежать кэша)
```

- [ ] **Step 2: Записать baseline-поведение `.consult-modal` (до изменений)**

```
1. Открыть http://localhost:3050/
2. Кликнуть кнопку «Бесплатная консультация» (в hero или footer)
3. Зафиксировать: модалка появляется мгновенно (без fade/scale)
4. Закрыть через × — закрывается мгновенно
5. Открыть ещё раз, нажать ESC — закрывается мгновенно
```

Это baseline, после Step 6 должно быть плавно.

- [ ] **Step 3: Добавить CSS-блок в `css/consult.css`**

В самый конец файла (после всех существующих правил, включая `@media`) добавить:

```css

/* ===== Open/close animation ===== */
.consult-modal {
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-spring);
}
.consult-modal.is-open { opacity: 1; transform: scale(1); }

.consult-modal::backdrop {
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out);
}
.consult-modal.is-open::backdrop { opacity: 1; }
```

- [ ] **Step 4: Обновить `js/consult.js` — обёртки + cancel-listener**

Открыть `js/consult.js` и сделать следующие точечные правки:

**4a.** В `ensureDialog()` (рядом с уже существующими `dlg.addEventListener('click', ...)`, `'input'`, `'submit'`, `'close'`) добавить новую подписку **перед** `return dlg;` (текущая строка `return dlg;` — около строки 27):

```js
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeConsult();
    });
```

**4b.** В функции `openConsult()` (около строки 79) заменить блок:

```js
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
```

на:

```js
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
      requestAnimationFrame(() => dlg.classList.add('is-open'));
    } else {
      dlg.setAttribute('open', '');
      dlg.classList.add('is-open');
    }
```

**4c.** В функции `closeConsult()` (около строки 92) заменить тело:

```js
  function closeConsult() {
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open) dlg.close();
  }
```

на:

```js
  function closeConsult() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!dlg.classList.contains('is-open')) { dlg.close(); return; }
    dlg.classList.remove('is-open');
    setTimeout(() => { if (dlg.open) dlg.close(); }, 280);
  }
```

- [ ] **Step 5: Hard-reload браузера и проверить плавность**

```
1. Открыть http://localhost:3050/?cb=test1 (любой query чтобы сломать кэш)
2. Ctrl+Shift+R (hard reload)
3. Кликнуть «Бесплатная консультация»
   → ОЖИДАЕМО: модалка плавно появляется (~280ms), backdrop проявляется одновременно
4. Закрыть через ×
   → ОЖИДАЕМО: модалка плавно исчезает (~280ms), потом dialog убирается из DOM
5. Открыть снова, нажать ESC
   → ОЖИДАЕМО: анимация закрытия отрабатывает (НЕ мгновенно)
6. Открыть снова, кликнуть в backdrop (вне модалки)
   → ОЖИДАЕМО: анимированное закрытие
7. Открыть снова, дважды быстро кликнуть × во время анимации закрытия
   → ОЖИДАЕМО: нет JS-ошибок в консоли, dialog корректно закрылся
```

Если какой-то пункт не отрабатывает — стоп, исправить и перепроверить.

- [ ] **Step 6: Проверить reduced-motion**

```
1. F12 → DevTools → Cmd+Shift+P / Ctrl+Shift+P → "Show Rendering"
2. В Rendering панели: Emulate CSS media feature prefers-reduced-motion → "reduce"
3. Открыть/закрыть консультацию
   → ОЖИДАЕМО: мгновенно (без анимации)
4. Вернуть в "No emulation"
```

- [ ] **Step 7: Commit**

```bash
cd C:\Users\Roman\good_pools
git add css/consult.css js/consult.js
git commit -m "feat(motion): smooth fade+scale open/close for consult modal"
```

---

### Task 2: Анимировать `.quiz-modal`

**Files:**
- Modify: `css/quiz.css` — добавить блок в конец файла
- Modify: `js/quiz.js` — обернуть `dlg.showModal()` и `dlg.close()`, добавить `'cancel'`-listener

- [ ] **Step 1: Записать baseline `.quiz-modal`**

```
1. На http://localhost:3050/ кликнуть floating-cta «Рассчитать стоимость»
2. Зафиксировать: модалка появляется мгновенно
3. Закрыть, перепройти первый шаг — внутренние шаги (slide-transitions) уже анимированы Task 6 прошлой итерации — НЕ ТРОГАТЬ
```

- [ ] **Step 2: Добавить CSS-блок в `css/quiz.css`**

В самый конец файла (после `@keyframes quiz-check-draw` и любых медиа-запросов) добавить:

```css

/* ===== Open/close animation ===== */
.quiz-modal {
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-spring);
}
.quiz-modal.is-open { opacity: 1; transform: scale(1); }

.quiz-modal::backdrop {
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out);
}
.quiz-modal.is-open::backdrop { opacity: 1; }
```

- [ ] **Step 3: Обновить `js/quiz.js` — добавить cancel-listener**

В `ensureDialog()` рядом со строкой 91 (`dlg.addEventListener('close', () => { state = makeInitialState(); });`) добавить новую подписку:

```js
    dlg.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeQuiz();
    });
```

- [ ] **Step 4: Обновить `openQuiz()` в `js/quiz.js`**

Заменить блок около строки 100-107:

```js
    try {
      dlg.showModal();
      if (typeof window.ym === 'function') window.ym(100792239, 'reachGoal', 'quiz_started');
    }
    catch (err) {
      console.error('[quiz] showModal failed', err);
      alert('Ваш браузер не поддерживает эту форму, обновите его.');
    }
```

на:

```js
    try {
      dlg.showModal();
      requestAnimationFrame(() => dlg.classList.add('is-open'));
      if (typeof window.ym === 'function') window.ym(100792239, 'reachGoal', 'quiz_started');
    }
    catch (err) {
      console.error('[quiz] showModal failed', err);
      alert('Ваш браузер не поддерживает эту форму, обновите его.');
    }
```

- [ ] **Step 5: Обновить `closeQuiz()` в `js/quiz.js`**

Заменить:

```js
  function closeQuiz() {
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open) dlg.close();
  }
```

на:

```js
  function closeQuiz() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!dlg.classList.contains('is-open')) { dlg.close(); return; }
    dlg.classList.remove('is-open');
    setTimeout(() => { if (dlg.open) dlg.close(); }, 280);
  }
```

- [ ] **Step 6: Hard-reload и проверить**

```
1. http://localhost:3050/?cb=test2 + Ctrl+Shift+R
2. Кликнуть floating-cta «Рассчитать стоимость»
   → ОЖИДАЕМО: квиз плавно появляется (fade+scale), backdrop проявляется
3. Пройти первый шаг (slide между шагами должен работать как раньше — не сломали)
4. Закрыть через ×
   → ОЖИДАЕМО: плавное закрытие 280ms
5. Открыть, ESC
   → ОЖИДАЕМО: анимация закрытия отрабатывает
6. Открыть, клик в backdrop
   → ОЖИДАЕМО: анимация закрытия отрабатывает
7. Submit на последнем шаге (после прохождения — pessimistic flow покажет "Спасибо")
   → ОЖИДАЕМО: ничего не сломалось в submit-логике
```

- [ ] **Step 7: Reduced-motion**

```
1. Включить prefers-reduced-motion: reduce
2. Открыть/закрыть квиз — мгновенно
3. Вернуть в No emulation
```

- [ ] **Step 8: Commit**

```bash
cd C:\Users\Roman\good_pools
git add css/quiz.css js/quiz.js
git commit -m "feat(motion): smooth fade+scale open/close for quiz modal"
```

---

### Task 3: Анимировать `.interest-dialog`

**Files:**
- Modify: `css/interest-popup.css` — добавить блок (после `.interest-dialog::backdrop`, ДО медиа-запросов)
- Modify: `js/interest-popup.js` — обернуть две точки close: `closeDialog()` И `gallery:close` listener; обернуть showModal в `openDialog()`; добавить cancel-listener

**Trigger note:** `interest-popup` запускается по сигналу от `interest-tracker.js` после нескольких просмотров фото моделей. Чтобы проверить вручную — в DevTools console на странице `models.html`:

```js
document.dispatchEvent(new CustomEvent('interest:trigger', { detail: { id: 'test', name: 'Тестовая модель' } }));
```

— это сразу покажет тоаст. Клик по тоасту откроет наш `.interest-dialog`.

- [ ] **Step 1: Записать baseline `.interest-dialog`**

```
1. http://localhost:3050/models.html → F12 → Console
2. Вставить триггер выше → нажать Enter
3. Тоаст внизу справа — кликнуть по нему
4. Зафиксировать: dialog появляется мгновенно
5. Закрыть через ×
```

- [ ] **Step 2: Добавить CSS-блок в `css/interest-popup.css`**

Найти строку `.interest-dialog::backdrop { background: rgba(15, 17, 23, 0.55); }` (примерно строка 94) и **сразу после неё** добавить:

```css

/* ===== Open/close animation ===== */
.interest-dialog {
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-spring);
}
.interest-dialog.is-open { opacity: 1; transform: scale(1); }

.interest-dialog::backdrop {
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out);
}
.interest-dialog.is-open::backdrop { opacity: 1; }
```

ВАЖНО: в файле УЖЕ есть правило `.interest-dialog::backdrop { background: ... }` — наш новый блок добавляет ВТОРОЕ правило для того же селектора с `opacity` + `transition`. Это валидный CSS, свойства мерджатся. Не удалять старое правило.

- [ ] **Step 3: Обновить `js/interest-popup.js` — cancel-listener + showModal обёртка**

В функции `openDialog()` (строка ~83) внутри блока `if (!dlg) { ... }` рядом с существующими `dlg.addEventListener('click', ...)`, `'input'`, `'submit'` добавить:

```js
      dlg.addEventListener('cancel', function (e) {
        e.preventDefault();
        closeDialog();
      });
```

Затем заменить блок (строки ~103-104):

```js
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
```

на:

```js
    if (typeof dlg.showModal === 'function') {
      dlg.showModal();
      requestAnimationFrame(function () { dlg.classList.add('is-open'); });
    } else {
      dlg.setAttribute('open', '');
      dlg.classList.add('is-open');
    }
```

- [ ] **Step 4: Обновить `closeDialog()` в `js/interest-popup.js`**

Заменить функцию (строки ~112-119):

```js
  function closeDialog() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
    }
    dlg.close();
  }
```

на:

```js
  function closeDialog() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
    }
    if (!dlg.classList.contains('is-open')) { dlg.close(); return; }
    dlg.classList.remove('is-open');
    setTimeout(function () { if (dlg.open) dlg.close(); }, 280);
  }
```

- [ ] **Step 5: Обновить `gallery:close` listener в `js/interest-popup.js`**

В блоке `document.addEventListener('gallery:close', ...)` (строки ~29-40) заменить:

```js
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      dlg.close();
    }
```

на:

```js
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      if (!dlg.classList.contains('is-open')) { dlg.close(); }
      else {
        dlg.classList.remove('is-open');
        setTimeout(function () { if (dlg.open) dlg.close(); }, 280);
      }
    }
```

- [ ] **Step 6: Hard-reload и проверить**

```
1. http://localhost:3050/models.html?cb=test3 + Ctrl+Shift+R
2. F12 → Console:
   document.dispatchEvent(new CustomEvent('interest:trigger', { detail: { id: 'test', name: 'Тестовая' } }));
3. Тоаст справа внизу должен появиться (уже плавно — не наша задача)
4. Кликнуть по тоасту
   → ОЖИДАЕМО: dialog плавно появляется (~280ms)
5. Закрыть через ×
   → ОЖИДАЕМО: плавное закрытие
6. Снова триггер + тоаст + клик → ESC
   → ОЖИДАЕМО: анимация закрытия
7. Снова триггер + тоаст + клик → клик в backdrop
   → ОЖИДАЕМО: анимация закрытия
8. Снова триггер + тоаст + клик → открыть галерею (gallery:close test):
   - На странице models.html кликнуть на любую модель чтобы открыть pgal-modal
   - Если interest-dialog был открыт, gallery:close может закрыть его
   - (этот сценарий нечастый, но проверить что нет JS-ошибок)
```

- [ ] **Step 7: Reduced-motion**

```
1. Включить prefers-reduced-motion: reduce
2. Триггер → тоаст → клик → dialog появляется мгновенно
3. Закрыть мгновенно
4. Вернуть No emulation
```

- [ ] **Step 8: Commit**

```bash
cd C:\Users\Roman\good_pools
git add css/interest-popup.css js/interest-popup.js
git commit -m "feat(motion): smooth fade+scale open/close for interest popup dialog"
```

---

### Task 4: Cache-busters в HTML + restore hardlinks

**Files:**
- Modify: `index.html`, `models.html`, `catalog.html`, `portfolio.html` — bump `?v=20260518-motion*` до `?v=20260519-motion10` для затронутых файлов

**Background:** Production кэширует CSS/JS по query-string. Без bump'а пользователи увидят старые версии. NTFS-хардлинки между корнем и `public/` рвутся при `Edit` (см. `CLAUDE.md`), потому в конце задачи restore.

**Затронутые файлы (бампать только эти):**
- `css/consult.css`
- `css/quiz.css`
- `css/interest-popup.css` (только в `models.html` — единственная страница где он подключён)
- `js/consult.js`
- `js/quiz.js`
- `js/interest-popup.js` (только в `models.html`)

- [ ] **Step 1: Bump cache-busters в `index.html`**

Найти и заменить через Edit tool (по одной строке):
- `css/style.css?v=...` — НЕ ТРОГАТЬ (не наш файл)
- `css/quiz.css?v=...` → `css/quiz.css?v=20260519-motion10`
- `css/consult.css?v=...` → `css/consult.css?v=20260519-motion10`
- `js/quiz.js?v=...` → `js/quiz.js?v=20260519-motion10`
- `js/consult.js?v=...` → `js/consult.js?v=20260519-motion10`

Использовать Edit tool, НЕ PowerShell (см. memory `feedback_no_powershell_for_utf8`).

- [ ] **Step 2: Bump cache-busters в `portfolio.html`**

Через Edit tool заменить в `portfolio.html`:
- `css/quiz.css?v=...` → `css/quiz.css?v=20260519-motion10`
- `css/consult.css?v=...` → `css/consult.css?v=20260519-motion10`
- `js/quiz.js?v=...` → `js/quiz.js?v=20260519-motion10`
- `js/consult.js?v=...` → `js/consult.js?v=20260519-motion10`

`css/style.css?v=...` — НЕ ТРОГАТЬ.

- [ ] **Step 3: Bump cache-busters в `catalog.html`**

Через Edit tool заменить в `catalog.html`:
- `css/quiz.css?v=...` → `css/quiz.css?v=20260519-motion10`
- `css/consult.css?v=...` → `css/consult.css?v=20260519-motion10`
- `js/quiz.js?v=...` → `js/quiz.js?v=20260519-motion10`
- `js/consult.js?v=...` → `js/consult.js?v=20260519-motion10`

`css/style.css?v=...` — НЕ ТРОГАТЬ.

- [ ] **Step 4: Bump cache-busters в `models.html`**

Через Edit tool заменить в `models.html`:
- `css/quiz.css?v=...` → `css/quiz.css?v=20260519-motion10`
- `css/consult.css?v=...` → `css/consult.css?v=20260519-motion10`
- `css/interest-popup.css?v=...` → `css/interest-popup.css?v=20260519-motion10`
- `js/quiz.js?v=...` → `js/quiz.js?v=20260519-motion10`
- `js/consult.js?v=...` → `js/consult.js?v=20260519-motion10`
- `js/interest-popup.js?v=...` → `js/interest-popup.js?v=20260519-motion10`

`css/style.css?v=...` — НЕ ТРОГАТЬ.

- [ ] **Step 5: Restore NTFS hardlinks для всех 4 HTML**

В PowerShell (см. `CLAUDE.md` за рецептом):

```powershell
cd C:\Users\Roman\good_pools
foreach ($f in 'index.html','models.html','catalog.html','portfolio.html') {
  Remove-Item -Force -Path "public\$f" -ErrorAction SilentlyContinue
  New-Item -ItemType HardLink -Path "public\$f" -Target $f -Force | Out-Null
}
```

Проверить:

```powershell
foreach ($f in 'index.html','models.html','catalog.html','portfolio.html') {
  $a = (Get-Item $f).LinkType
  $b = (Get-Item "public\$f").LinkType
  Write-Output "$f -> root LinkType=$a, public LinkType=$b"
}
```

Оба значения должны быть `HardLink` (или у root может быть пусто — он первоисточник; ключевое чтобы `public\$f` показывал HardLink).

- [ ] **Step 6: Smoke-проверить что версии подтянулись**

```
1. http://localhost:3050/?cb=test4 + Ctrl+Shift+R
2. F12 → Network → Filter: motion10
3. ОЖИДАЕМО: видны 4 запроса с motion10 — consult.css/.js, quiz.css/.js, response 200
4. models.html — то же + interest-popup.css/.js motion10
```

- [ ] **Step 7: Commit**

```bash
cd C:\Users\Roman\good_pools
git add index.html models.html catalog.html portfolio.html
git commit -m "chore: bump cache-busters to motion10 for modal animation"
```

---

### Task 5: Финальная верификация перед push

**Цель:** прогнать end-to-end сценарии, убедиться что ничего не сломали в существующих фичах.

- [ ] **Step 1: Сквозная проверка всех модалок на главной**

```
1. http://localhost:3050/?cb=final + Ctrl+Shift+R
2. Открыть «Бесплатная консультация» из hero — плавно ✓
3. Заполнить имя+телефон+согласие → submit → должна показаться «Спасибо» (pessimistic flow живой)
4. Закрыть × → плавно ✓
5. Открыть floating-cta «Рассчитать стоимость» — плавно ✓
6. Пройти 1 шаг квиза → slide-анимация между шагами работает (не сломали)
7. Закрыть × → плавно ✓
```

- [ ] **Step 2: Проверить interest-dialog на models.html**

```
1. http://localhost:3050/models.html?cb=final + Ctrl+Shift+R
2. F12 → Console:
   document.dispatchEvent(new CustomEvent('interest:trigger', { detail: { id: 't', name: 'Тест' } }));
3. Кликнуть тоаст → dialog плавно ✓
4. ESC → плавно ✓
```

- [ ] **Step 3: Проверить что НЕ сломали уже работающее**

```
1. На главной открыть мобильное меню (гамбургер) → анимация stagger-меню работает ✓
2. На portfolio.html кликнуть на проект → pgal-modal открывается плавно (fade+scale) ✓
3. Cookie-banner — если виден, кликнуть «Принять» → slide-out отрабатывает ✓
```

- [ ] **Step 4: Проверить production-сборку логически**

Никакой production-сборки нет (deploy через rsync). Но git diff должен показать ТОЛЬКО:
- `css/consult.css` (+CSS-блок)
- `css/quiz.css` (+CSS-блок)
- `css/interest-popup.css` (+CSS-блок)
- `js/consult.js` (обёртки)
- `js/quiz.js` (обёртки)
- `js/interest-popup.js` (обёртки)
- 4× HTML (cache-buster bump)

```bash
cd C:\Users\Roman\good_pools
git log --oneline -10
```

Ожидаемые последние 4 коммита (в обратном порядке):
- `chore: bump cache-busters to motion10 for modal animation`
- `feat(motion): smooth fade+scale open/close for interest popup dialog`
- `feat(motion): smooth fade+scale open/close for quiz modal`
- `feat(motion): smooth fade+scale open/close for consult modal`

- [ ] **Step 5: Push (по подтверждению пользователя)**

НЕ пушить автоматически — спросить пользователя:

> «Все 4 коммита готовы. Запушить в `origin/main` для деплоя?»

После подтверждения:

```bash
cd C:\Users\Roman\good_pools
git push origin main
```

Затем сообщить пользователю URL GitHub Actions runs:
`https://github.com/<owner>/good_pools/actions` (узнать `<owner>` через `git remote get-url origin`).

---

## Acceptance criteria (из спеки)

После Task 5 все пять критериев из спеки должны быть выполнены:

1. ✓ При открытии quiz/consult/interest dialog плавно проявляется (fade + scale 0.96 → 1) с backdrop'ом за 280ms.
2. ✓ При закрытии (X / ESC / click outside / submit success) — обратная анимация 280ms, dialog исчезает только по её завершении.
3. ✓ С `prefers-reduced-motion: reduce` — мгновенно (verified via DevTools Emulate).
4. ✓ Двойной клик по «×» во время closing не вызывает ошибок.
5. ✓ Существующее поведение submit'а и валидации сохранено.

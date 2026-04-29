# Модалка «Бесплатная консультация»

**Дата:** 2026-04-30
**Статус:** утверждено к имплементации

## Цель

Сделать так, чтобы клик по кнопке «Бесплатная консультация» (класс `.btn-consult`) на любой странице сайта открывал модальное окно с короткой формой заявки (имя + телефон), повторяющей структуру референс-скриншота, но в визуальном стиле сайта.

## Контекст текущего состояния

- Кнопки `<button class="btn-consult">Бесплатная консультация</button>` присутствуют на всех 4 публичных страницах: `index.html:149`, `catalog.html:356`, `models.html:111`, `portfolio.html:106`.
- JS-обработчика на `.btn-consult` сейчас нет — кнопки инертны.
- В проекте уже есть пример модалки на нативном `<dialog>` — `js/quiz.js` + `css/quiz.css`. Новая модалка следует тому же паттерну.
- Существующий submit квиза — заглушка `console.log('[quiz] submit', ...)` с TODO `// replace with POST /api/leads when backend is ready`. Бэкенда для лидов нет.
- Маска телефона `+7 (XXX) XXX-XX-XX` реализована в `js/quiz.js` функциями `formatPhoneMask` и `normalizePhone` (~15 строк).
- Страницы политики обработки персональных данных в проекте нет.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Селектор страны | Только `+7`, без флага и без дропдауна. Маска `+7 (XXX) XXX-XX-XX`. |
| Submit | Заглушка `console.log('[consult] submit', { name, phone })` + замена контента модалки на «Спасибо!». TODO для будущего `POST /api/leads`. |
| Состояние «Спасибо» | Заголовок «Спасибо!», подзаголовок «Менеджер свяжется с вами в ближайшее время.», явная кнопка «Закрыть». Без автозакрытия (как в квизе). |
| Триггер | Клик по любому элементу с классом `.btn-consult`. HTML существующих кнопок не меняется. |
| Архитектура | Отдельный самодостаточный модуль `js/consult.js` + `css/consult.css`. Не лезет в `quiz.js`. |
| Маска телефона | Копия `formatPhoneMask`/`normalizePhone` из `quiz.js` (15 строк дубля ради изоляции модулей). |
| Дисклеймер | «Нажимая на кнопку вы соглашаетесь на обработку данных» — простой текст без ссылки (страницы политики нет). |
| Визуальный стиль | Светлая модалка, голубой акцент `#0ea5e9`, овальные «капсулы» инпутов. Скриншот используется как референс **структуры**, а не визуала — стиль выровнен с `quiz.css` для единообразия. |

## Архитектура

Два новых файла + точечные правки в 4 HTML-файлах:

1. **`js/consult.js`** (новый) — IIFE, программно создаёт `<dialog id="consultModal">`, вешает обработчики, реализует маску, валидацию, submit-заглушку.
2. **`css/consult.css`** (новый) — стили модалки в духе `quiz.css`.
3. **HTML-правки** (`index.html`, `catalog.html`, `models.html`, `portfolio.html`):
   - В `<head>`: `<link rel="stylesheet" href="css/consult.css?v=20260430">`.
   - Перед `</body>`: `<script src="js/consult.js?v=20260430" defer></script>`.

Никаких изменений в самой разметке `<button class="btn-consult">`. Никаких правок в `quiz.js`/`quiz.css`.

## Компоненты

### 1. JS-модуль (`js/consult.js`)

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

### 2. CSS (`css/consult.css`)

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

### 3. HTML-правки

В `<head>` каждой из 4 страниц добавляется одна строка после существующих `<link rel="stylesheet">`:

```html
<link rel="stylesheet" href="css/consult.css?v=20260430">
```

Перед `</body>` каждой из 4 страниц добавляется одна строка:

```html
<script src="js/consult.js?v=20260430" defer></script>
```

## Поток событий

1. Страница загружается. `consult.js` с `defer` отрабатывает на `DOMContentLoaded`, навешивает клик на все `.btn-consult`.
2. Пользователь кликает «Бесплатная консультация». Срабатывает `openConsult()` → `ensureDialog()` создаёт `<dialog id="consultModal">` (один раз за сессию страницы) и вызывает `showModal()`.
3. Native `<dialog>` рисуется в top-layer с бэкдропом, страница под ним блокируется.
4. Фокус перемещается на поле «Имя» через 50мс.
5. Пользователь вводит имя → `state.name` обновляется.
6. Пользователь вводит телефон → `formatPhoneMask` форматирует на лету, `state.phone` хранит только цифры.
7. Клик по «Получить консультацию» → `onSubmit` валидирует. При ошибке показывает сообщение под полем. При успехе — `console.log` + перерисовка модалки в режим «Спасибо!».
8. Пользователь закрывает модалку любым из четырёх способов (Esc, ×, бэкдроп, кнопка «Закрыть»). На событии `close` состояние сбрасывается.
9. При повторном клике по `.btn-consult` модалка открывается с чистой формой.

## Edge cases

| Случай | Поведение |
|---|---|
| Браузер без поддержки `<dialog>` | Фолбэк `setAttribute('open', '')`. Без полной модальности — известное ограничение, такое же как у `quiz.js`. |
| Пользователь вводит телефон через `8` или `+7` руками | Маска нормализует — ведущие `7`/`8` отбрасываются, далее форматируется. |
| Пустое имя или неполный телефон при submit | Под полями появляется красный текст: «Укажите имя» или «Введите телефон полностью». Submit блокируется. |
| Повторный submit (после «Спасибо» открыли заново) | `state.submitted` ловится в `openConsult` и форма перерендеривается заново. |
| Клик по `.btn-consult` пока модалка квиза открыта | `<dialog>.showModal()` блокирует клики по странице бэкдропом — клик до `.btn-consult` не дойдёт. Конфликта нет. |
| `prefers-reduced-motion: reduce` | Hover-приподнимание кнопки submit отключается через media-query. |

## Доступность

- Кнопка-крестик: `aria-label="Закрыть"`.
- `<input type="tel">` + `inputmode="tel"` — мобильная клавиатура с цифрами.
- `autocomplete="name"` / `autocomplete="tel"` — браузерное автозаполнение.
- Esc закрывает (нативно у `<dialog>`).
- Автофокус на поле «Имя» при открытии.
- Состояние ошибки помечается через `[hidden]` (скрыто) → `hidden=false` (видно), текст внутри `<p class="consult-error">`.

## Тестирование (ручное)

- [ ] На каждой из 4 страниц клик по «Бесплатная консультация» открывает модалку с заголовком «Давайте начнём с бесплатной консультации?».
- [ ] Пустое имя при submit → сообщение «Укажите имя».
- [ ] Неполный телефон при submit → сообщение «Введите телефон полностью».
- [ ] Ввод цифр в телефон формирует `+7 (XXX) XXX-XX-XX` на лету.
- [ ] Корректный submit → экран «Спасибо!» + строка `[consult] submit` в консоли.
- [ ] Esc / ×/ клик по бэкдропу / кнопка «Закрыть» — все закрывают.
- [ ] Повторное открытие после submit — чистая форма.
- [ ] Мобильный viewport (≤480px): модалка узкая, заголовок 18px, всё помещается.
- [ ] Плавающая «Рассчитать стоимость» по-прежнему открывает квиз (не консультацию).
- [ ] Hero-кнопка «Рассчитать стоимость» по-прежнему открывает квиз.

## Файлы, которые меняются

| Файл | Что |
|---|---|
| `js/consult.js` | новый файл (~110 строк) |
| `css/consult.css` | новый файл (~85 строк) |
| `index.html` | + `<link>` в `<head>`, + `<script>` перед `</body>` |
| `catalog.html` | то же |
| `models.html` | то же |
| `portfolio.html` | то же |

## Файлы, которые НЕ меняются

- `js/quiz.js`, `css/quiz.css` — без изменений.
- `js/floating-cta.js`, стили `.floating-cta` — без изменений.
- HTML-разметка кнопок `<button class="btn-consult">` — без изменений.
- Серверная часть, БД, миграции — не затронуты.

## Out of scope

- Реальный бэкенд для лидов (`POST /api/leads` остаётся `TODO` — общий с квизом).
- Страница политики обработки персональных данных.
- Мультистрановой селектор телефона (только `+7`).
- Аналитика / события трекинга.
- Связь с CRM / Telegram-ботом.
- Унификация маски телефона между `quiz.js` и `consult.js` через общий модуль (15 строк дубля — приемлемо).

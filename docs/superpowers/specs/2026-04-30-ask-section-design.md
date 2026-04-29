# Секция «Не нашли ответ» на главной

**Дата:** 2026-04-30
**Статус:** утверждено к имплементации

## Цель

Добавить на главную страницу (`index.html`) новую секцию с короткой формой свободного вопроса (вопрос + имя + телефон). Структура повторяет референс-скриншот, визуальный стиль — наш (тёмный фон сайта + голубой акцент `#0ea5e9`).

## Контекст текущего состояния

- Главная страница `index.html` — последовательность секций: hero → catalog → portfolio → render-reality → why-us → showroom → service → contacts → footer.
- В проекте есть две формы-заглушки сбора лидов: `js/quiz.js` (многошаговый квиз) и `js/consult.js` (модалка консультации). Обе вместо реального сабмита делают `console.log` + TODO `// replace with POST /api/leads when backend is ready`.
- Маска телефона `+7 (XXX) XXX-XX-XX` (`formatPhoneMask`/`normalizePhone`) дублируется в `quiz.js` и `consult.js`. С новой формой будет 3 копии — выбран **Подход 1**: оставить дубль, без рефакторинга существующих модулей.
- Цветовая схема главной — тёмный градиент `#0a1014 → #0f1419` на `body`, секции прозрачны, акцент `#0ea5e9` (голубой) для подсветки.
- Стили существующих секций живут в `css/style.css`. Стили модалок (`quiz.css`, `consult.css`) — в отдельных файлах.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Размещение | Между `<section class="contacts">` (строка 400) и `<footer class="footer">` (строка 402) на `index.html`. |
| Селектор страны / маска | Только `+7`, без флага и дропдауна. Маска `+7 (XXX) XXX-XX-XX`. |
| Submit | Заглушка `console.log('[ask] submit', { question, name, phone })` + TODO для будущего `POST /api/leads`. После успеха — содержимое `.ask-inner` подменяется на «Спасибо! Менеджер ответит вам в течение 10 минут.». |
| Валидация | Все три поля обязательные. Вопрос — `trim().length >= 3`. Имя — `trim()` непустой. Телефон — 11 цифр (полная маска). Показываем первую упавшую ошибку, помечаем поле классом `is-invalid`. На любой ввод ошибка снимается. |
| Архитектура | Статический HTML в `index.html`, стили в `css/style.css`, поведение в новом `js/ask.js`. Маска телефона — третья локальная копия (Подход 1). |
| Подключение | Скрипт подключается только на `index.html`, других страниц не касается. |
| Визуальный стиль | Тёмный фон (наследует `body`), заголовок «жирное / тонкое» как в `.hero-title`, инпуты — прозрачные с тонкой светлой рамкой и `border-radius: 999px` (textarea — `18px`). Submit — обводка, при ховере заливается голубым градиентом `#0ea5e9 → #0284c7`. |

## Архитектура

Один новый JS-файл + дополнения к существующим:

1. **`js/ask.js`** (новый) — IIFE: на `DOMContentLoaded` находит `[data-ask-form]`, навешивает `input` (маска + state) и `submit` (валидация + log + замена контента) обработчики.
2. **`css/style.css`** (модификация) — приписываем в конец блок стилей `.ask`/`.ask-*` (~110 строк).
3. **`index.html`** (модификация) — вставляем `<section class="ask">` между existing `</section>` контактов и `<footer>`; добавляем `<script src="js/ask.js?v=20260430" defer>` перед `</body>`.

Никаких изменений в `js/quiz.js`, `js/consult.js`, `js/floating-cta.js`, `css/quiz.css`, `css/consult.css`, на других HTML-страницах.

## Компоненты

### 1. HTML (вставка в `index.html`)

После закрытия `<section class="contacts">` (строка 400), перед `<footer class="footer">` (строка 402):

```html
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
```

После успешного submit JS подменит `.ask-inner` на:

```html
<div class="ask-inner ask-inner--thanks">
  <h2 class="ask-title"><strong>Спасибо!</strong></h2>
  <p class="ask-lead">Менеджер ответит вам в течение 10 минут.</p>
</div>
```

Подключение скрипта — перед `</body>`, после `js/floating-cta.js?v=20260430`:

```html
<script src="js/ask.js?v=20260430" defer></script>
```

### 2. CSS (приписываем в конец `css/style.css`)

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

### 3. JS (`js/ask.js`, новый)

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

## Поток событий

1. Пользователь скроллит главную, доходит до конца — видит новую секцию между «Контакты» и футером.
2. Заполняет вопрос → имя → телефон (телефон форматируется на лету).
3. Кликает «Отправить»:
   - Если хоть одно поле невалидно — под формой появляется первое сообщение, поле краснеет.
   - Если всё валидно — `console.log('[ask] submit', { question, name, phone })`, содержимое `.ask-inner` заменяется на «Спасибо! Менеджер ответит вам в течение 10 минут.».
4. Пользователь видит подтверждение. Чтобы отправить ещё раз — должен перезагрузить страницу (одна заявка на просмотр).

## Edge cases

| Случай | Поведение |
|---|---|
| JS не загрузился | Форма отправится на текущий URL с query-параметрами (стандартное `<form>` без `action`). Общая особенность всех форм сайта (`quiz`, `consult` ведут себя так же), out of scope чинить. |
| Длинный вопрос (multi-line, много текста) | `textarea` с `resize: none` и `min-height: 120px` — большое содержимое скроллится внутри поля. |
| Повторная отправка после «Спасибо!» | Состояние держится до перезагрузки страницы. |
| Пробелы вместо текста в имени или вопросе | `trim()` в валидации отсекает. |
| Телефон через `8` или `+7` руками | Маска нормализует. |
| Несколько ошибок одновременно | Показываем первую, по приоритету: вопрос → имя → телефон. На любой ввод ошибка скрывается, рамка очищается. |
| `prefers-reduced-motion: reduce` | Hover-анимация submit отключается через media-query. |

## Доступность

- Все три инпута внутри `<label>` — связь с подсказкой через placeholder (видимая) и autocomplete-атрибуты.
- `inputmode="tel"` + `autocomplete="tel"` для мобильной клавиатуры.
- `autocomplete="name"` для автозаполнения имени.
- Submit нативный, Enter в любом поле формы тоже отправляет.
- Цвет ошибки `#ef4444` поверх белого текста на тёмном фоне — достаточный контраст.

## Тестирование (ручное)

- [ ] На `http://localhost:3050/` после прокрутки за блок «Контакты» появляется новая секция с заголовком «Не нашли ответ / на свой вопрос?», подзаголовком, тремя полями и кнопкой «Отправить».
- [ ] Submit с пустыми полями → «Напишите вопрос (минимум 3 символа)», красная рамка на textarea.
- [ ] 2 символа в textarea → submit → та же ошибка.
- [ ] 3+ символа, пустое имя → «Укажите имя», красная рамка на имени.
- [ ] Имя заполнено, телефон 4 цифры → «Введите телефон полностью», красная рамка на телефоне; маска работает на лету.
- [ ] Все три поля валидны → секция переключается в «Спасибо!»; в консоли `[ask] submit { question, name, phone }`.
- [ ] При вводе в провалившее поле — рамка возвращается к нейтральной, сообщение об ошибке скрывается.
- [ ] Mobile (≤480px): padding меньше, заголовок 22px, submit на всю ширину.
- [ ] Hover на «Отправить» — заливается голубым градиентом, лёгкое поднятие.
- [ ] Регрессии: hero «Рассчитать стоимость», плавающая кнопка, кнопки «Бесплатная консультация» работают как раньше.

## Файлы, которые меняются

| Файл | Что |
|---|---|
| `index.html` | + блок `<section class="ask">` между контактами и футером, + `<script src="js/ask.js">` перед `</body>` |
| `css/style.css` | + блок стилей `.ask*` (~110 строк в конец) |
| `js/ask.js` | новый файл (~95 строк) |

## Файлы, которые НЕ меняются

- `js/quiz.js`, `css/quiz.css`, `js/consult.js`, `css/consult.css`, `js/floating-cta.js` — без изменений.
- `catalog.html`, `models.html`, `portfolio.html` — секция только на главной.
- Серверная часть, БД, миграции — не затронуты.

## Out of scope

- Реальный бэкенд для лидов (`POST /api/leads` остаётся `TODO`, общий с квизом и консультацией).
- Унификация маски телефона между тремя модулями (3-я копия, отложено).
- Размещение секции на других страницах сайта.
- Аналитика и события трекинга.
- Интеграция с CRM / Telegram / email.
- Сохранение черновика формы в `localStorage`.

# Service Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить раздел «Сервисное обслуживание» на `index.html` с двумя метриками (80+ клиентов, 3 специалиста) и формой-опросником. Форма отправляется предзаполненным сообщением в WhatsApp; вторичная ссылка копирует текст в буфер и открывает Telegram-чат.

**Architecture:** Одна новая секция между `WHY US` и `CONTACTS` на `index.html`, двухколоночный лейаут в стиле `.why-us-inner` (описание+метрики слева, карточка с формой справа). Логика формы — один новый файл `js/service.js` (валидация + сборка сообщения + открытие `wa.me` + clipboard-fallback для Telegram). Существующие пункты «Услуги» в мобильном меню и футере получают `href="#service"`.

**Tech Stack:** Vanilla JS (нет бандлера, плоские `<script>` теги), `fetch` не нужен, `navigator.clipboard.writeText` для TG-фолбэка, CSS в `css/style.css`. Бэкенда нет — сообщение уходит в WhatsApp через `wa.me` deep link.

**Spec:** `docs/superpowers/specs/2026-04-16-service-section-design.md`

**Testing model note:** В проекте нет тест-раннера. Для каждой задачи «verification» = открыть `http://localhost:8000/index.html` в уже запущенном локальном сервере, выполнить описанное взаимодействие и подтвердить ожидаемое наблюдение в браузере (и DevTools, если указано). Это ручной эквивалент «run failing test → implement → run passing test».

---

## File Structure

| Path | Status | Responsibility |
|---|---|---|
| `index.html` | modify | Новая секция `<section class="service" id="service">` между строкой 375 (`</section>` WHY US) и строкой 377 (`<!-- CONTACTS -->`); изменить `href` в `.menu-link` (строка 57) и в футере (строка 444) с `#` на `#service`; добавить `<script src="js/service.js">` рядом с остальными скриптами |
| `css/style.css` | modify | Добавить блок стилей `.service` / `.service-inner` / `.service-left` / `.service-right` / `.service-stats` / `.service-stat-*` / `.service-form` / `.service-field` / `.service-radio` / `.service-submit` / `.service-tg-link` / `.service-toast`; адаптивные правила внутри существующих `@media (max-width: 1024px)`, `@media (max-width: 768px)`, `@media (max-width: 480px)` |
| `js/service.js` | create | Валидация полей, сборка текста сообщения, открытие `wa.me/79613201050?text=...`, копирование текста в буфер обмена и открытие `t.me/+79613201050` по клику на TG-ссылку, показ тост-уведомления |

Untouched: `catalog.html`, `models.html`, `portfolio.html`, `js/main.js`, `js/data-source.js`, `js/models.js`, `js/search.js`, `js/portfolio.js`, `slider-data.js`.

---

## Task 1: Section shell + stats (markup + styles)

**Files:**
- Modify: `index.html` (вставка между строкой 375 и строкой 377)
- Modify: `css/style.css` (append в конец или рядом с секцией `.why-us`)

- [ ] **Step 1: Insert section HTML in `index.html`**

Открой `index.html`. Найди строку `</section>` закрывающую `WHY US` (строка 375) и комментарий `<!-- CONTACTS -->` на следующей строке. Вставь между ними:

```html
  <!-- SERVICE -->
  <section class="service" id="service">
    <div class="service-inner">
      <div class="service-left">
        <div class="service-label">Сервис</div>
        <h2>
          <span class="bold">СЕРВИСНОЕ</span><br>
          <span class="thin">ОБСЛУЖИВАНИЕ</span>
        </h2>
        <p class="service-desc">Дополнительная услуга после строительства — регулярное обслуживание бассейна нашими специалистами.</p>
        <div class="service-stats">
          <div class="service-stat">
            <div class="service-stat-val">80+</div>
            <div class="service-stat-label">клиентов на регулярном сервисе</div>
          </div>
          <div class="service-stat">
            <div class="service-stat-val">3</div>
            <div class="service-stat-label">специалиста ежедневно</div>
          </div>
        </div>
      </div>
      <div class="service-right">
        <!-- форма вставится в Task 3 -->
      </div>
    </div>
  </section>

```

- [ ] **Step 2: Append section styles to `css/style.css`**

В конец файла (или сразу после правил `.why-*`, перед блоком `/* ===== RESPONSIVE ===== */` — как удобнее) добавь:

```css
/* Service */
.service {
  padding: 100px 80px;
  background: #0f1419;
  color: #fff;
}

.service-inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: flex-start;
  gap: 80px;
}

.service-left {
  flex: 1;
  min-width: 0;
}

.service-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 5px;
  text-transform: uppercase;
  color: #0ea5e9;
  margin-bottom: 16px;
}

.service-left h2 {
  font-size: 64px;
  line-height: 0.95;
  margin-bottom: 24px;
}

.service-left h2 .bold {
  font-weight: 900;
  color: #fff;
  letter-spacing: 2px;
}

.service-left h2 .thin {
  font-weight: 200;
  color: #7dd3fc;
  letter-spacing: 4px;
}

.service-desc {
  font-size: 15px;
  color: #bae6fd;
  line-height: 1.8;
  margin-bottom: 40px;
  max-width: 460px;
}

.service-stats {
  display: flex;
  gap: 40px;
}

.service-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.service-stat-val {
  font-size: 44px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}

.service-stat-label {
  font-size: 11px;
  font-weight: 600;
  color: #7dd3fc;
  text-transform: uppercase;
  letter-spacing: 2px;
  max-width: 180px;
  line-height: 1.4;
}

.service-right {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 3: Verify in browser**

Открой `http://localhost:8000/index.html` (или обнови). Прокрути вниз — между «ПОЧЕМУ ВЫБИРАЮТ НАС» и «Контакты» должна появиться новая тёмная секция с надписью «СЕРВИС», заголовком «СЕРВИСНОЕ / ОБСЛУЖИВАНИЕ», описанием и двумя метриками (80+ и 3). Правая колонка пока пустая (место под форму). Верстка не должна ломать соседние секции.

Expected: секция видна, метрики читаемы, заголовок в стиле остальных секций.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add service section shell with stats"
```

---

## Task 2: Wire navigation anchors

**Files:**
- Modify: `index.html` (строки 57 и 444)

- [ ] **Step 1: Change mobile-menu «Услуги» link**

В `index.html` найди блок пункта меню «Услуги» (около строки 57):

```html
      <a href="#" class="menu-link" data-index="3">
        <span class="menu-num">03</span>
        <span class="menu-text">Услуги</span>
      </a>
```

Замени `href="#"` на `href="#service"`:

```html
      <a href="#service" class="menu-link" data-index="3">
```

- [ ] **Step 2: Change footer «Услуги» link**

В `index.html` найди строку в футере (около строки 444):

```html
          <li><a href="#">Услуги</a></li>
```

Замени на:

```html
          <li><a href="#service">Услуги</a></li>
```

- [ ] **Step 3: Verify in browser**

Обнови `http://localhost:8000/index.html`. Открой гамбургер-меню, кликни «Услуги» — меню должно закрыться (существующий обработчик в `js/main.js` закрывает меню по клику на `.menu-link`), и страница должна проскроллиться к секции сервиса. В футере — клик по «Услуги» тоже должен вести на `#service`.

Expected: оба клика скроллят к секции `#service`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: link 'Услуги' menu and footer entries to service section"
```

---

## Task 3: Form markup + styles

**Files:**
- Modify: `index.html` (содержимое `.service-right`)
- Modify: `css/style.css` (append стили формы)

- [ ] **Step 1: Insert form into `.service-right`**

Замени комментарий `<!-- форма вставится в Task 3 -->` внутри `.service-right` в `index.html` на:

```html
        <form class="service-form" id="serviceForm" novalidate>
          <div class="service-form-title">Запись на сервис</div>

          <div class="service-field">
            <label for="sfName">Ваше имя</label>
            <input type="text" id="sfName" name="name" required minlength="2" autocomplete="name">
            <div class="service-error" id="sfNameError"></div>
          </div>

          <div class="service-field">
            <label for="sfPhone">Телефон</label>
            <input type="tel" id="sfPhone" name="phone" required pattern="[0-9+\-\s()]{10,}" placeholder="+7 (___) ___-__-__" autocomplete="tel">
            <div class="service-error" id="sfPhoneError"></div>
          </div>

          <div class="service-field">
            <label for="sfSize">Размер бассейна</label>
            <input type="text" id="sfSize" name="size" required placeholder="например, 6×3×1.5 м">
            <div class="service-error" id="sfSizeError"></div>
          </div>

          <div class="service-field">
            <label for="sfYear">Год постройки</label>
            <input type="number" id="sfYear" name="year" required min="1990" max="2026" placeholder="2020">
            <div class="service-error" id="sfYearError"></div>
          </div>

          <fieldset class="service-field service-radio-group">
            <legend>Автоматика дозирования химии</legend>
            <div class="service-radio-row">
              <label class="service-radio">
                <input type="radio" name="automation" value="Да" required>
                <span>Да</span>
              </label>
              <label class="service-radio">
                <input type="radio" name="automation" value="Нет">
                <span>Нет</span>
              </label>
              <label class="service-radio">
                <input type="radio" name="automation" value="Не знаю">
                <span>Не знаю</span>
              </label>
            </div>
            <div class="service-error" id="sfAutomationError"></div>
          </fieldset>

          <div class="service-field">
            <label for="sfComment">Комментарий</label>
            <textarea id="sfComment" name="comment" rows="3" placeholder="Дополнительная информация (необязательно)"></textarea>
          </div>

          <button type="submit" class="service-submit">Отправить заявку в WhatsApp</button>
          <a href="https://t.me/+79613201050" target="_blank" rel="noopener" class="service-tg-link" id="serviceTgLink">Или напишите нам в Telegram →</a>
          <div class="service-toast" id="serviceToast" role="status" aria-live="polite"></div>
        </form>
```

- [ ] **Step 2: Append form styles to `css/style.css`**

После ранее добавленного блока `.service-*` (в том же месте) добавь:

```css
.service-form {
  background: #181c20;
  border: 1px solid #252a30;
  border-radius: 20px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.service-form-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.service-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border: none;
  padding: 0;
  margin: 0;
}

.service-field > label,
.service-field > legend {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #7dd3fc;
}

.service-field input[type="text"],
.service-field input[type="tel"],
.service-field input[type="number"],
.service-field textarea {
  background: #0f1419;
  border: 1px solid #252a30;
  border-radius: 12px;
  padding: 12px 14px;
  color: #e2e8f0;
  font-family: inherit;
  font-size: 14px;
  transition: border-color 0.2s;
}

.service-field input:focus,
.service-field textarea:focus {
  outline: none;
  border-color: #0ea5e9;
}

.service-field textarea {
  resize: vertical;
  min-height: 72px;
}

.service-field input[aria-invalid="true"],
.service-field textarea[aria-invalid="true"] {
  border-color: #ef4444;
}

.service-radio-group[aria-invalid="true"] > legend {
  color: #ef4444;
}

.service-error {
  font-size: 12px;
  color: #ef4444;
  min-height: 14px;
}

.service-radio-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.service-radio {
  flex: 1 1 0;
  min-width: 80px;
  cursor: pointer;
}

.service-radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.service-radio span {
  display: block;
  padding: 10px 12px;
  background: #0f1419;
  border: 1px solid #252a30;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #bae6fd;
  transition: all 0.2s;
}

.service-radio input:checked + span {
  background: rgba(14, 165, 233, 0.15);
  border-color: #0ea5e9;
  color: #fff;
}

.service-radio input:focus-visible + span {
  outline: 2px solid #0ea5e9;
  outline-offset: 2px;
}

.service-submit {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  padding: 14px 28px;
  border-radius: 14px;
  border: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.25);
  transition: all 0.3s;
  margin-top: 8px;
}

.service-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(14, 165, 233, 0.35);
}

.service-tg-link {
  font-size: 13px;
  font-weight: 600;
  color: #0ea5e9;
  text-decoration: none;
  text-align: center;
  transition: color 0.2s;
}

.service-tg-link:hover {
  color: #7dd3fc;
}

.service-toast {
  min-height: 18px;
  font-size: 12px;
  color: #7dd3fc;
  text-align: center;
}
```

- [ ] **Step 3: Verify in browser**

Обнови страницу. Прокрути к секции сервиса. Справа должна появиться карточка с формой: заголовок «Запись на сервис», шесть полей (имя, телефон, размер, год, 3 радио-pill для автоматики, комментарий), кнопка «Отправить заявку в WhatsApp» и ссылка «Или напишите нам в Telegram →». Клик по радио-варианту подсвечивает выбранный pill. Поля имеют тёмный фон, акцентный `#0ea5e9` при фокусе.

Expected: форма отображается, фокус-стили и радио-подсветка работают, пока без submit-логики.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add service section form markup and styles"
```

---

## Task 4: Form logic (validate + submit to WhatsApp + Telegram fallback)

**Files:**
- Create: `js/service.js`
- Modify: `index.html` (добавить `<script src="js/service.js">` рядом с остальными)

- [ ] **Step 1: Create `js/service.js`**

Содержимое файла:

```javascript
(function () {
  const CONTACT_PHONE = '79613201050';
  const TG_URL = 'https://t.me/+79613201050';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if (!form) return;

    const tgLink = document.getElementById('serviceTgLink');
    const toast = document.getElementById('serviceToast');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = readAndValidate(form);
      if (!result.ok) {
        result.firstInvalid && result.firstInvalid.focus();
        return;
      }
      const text = buildMessage(result.data);
      const url = `https://wa.me/${CONTACT_PHONE}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      showToast(toast, 'Открываем WhatsApp…');
    });

    tgLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const result = readAndValidate(form, { silent: true });
      if (result.ok) {
        const text = buildMessage(result.data);
        try {
          await navigator.clipboard.writeText(text);
          showToast(toast, 'Текст заявки скопирован — вставьте в Telegram');
        } catch {
          showToast(toast, 'Откройте Telegram и напишите нам');
        }
      }
      window.open(TG_URL, '_blank', 'noopener');
    });

    form.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('input', () => {
        const name = el.name;
        if (!name || name === 'automation') return;
        const errorId = 'sf' + name.charAt(0).toUpperCase() + name.slice(1) + 'Error';
        clearError(el, errorId);
      });
    });
    form.querySelectorAll('input[name="automation"]').forEach((el) => {
      el.addEventListener('change', () => {
        clearError(form.querySelector('.service-radio-group'), 'sfAutomationError');
      });
    });
  });

  function readAndValidate(form, opts = {}) {
    const silent = !!opts.silent;
    const data = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      size: form.elements.size.value.trim(),
      year: form.elements.year.value.trim(),
      automation: (form.querySelector('input[name="automation"]:checked') || {}).value || '',
      comment: form.elements.comment.value.trim(),
    };

    let firstInvalid = null;
    const phoneOk = /^[0-9+\-\s()]{10,}$/.test(data.phone);
    const yearNum = parseInt(data.year, 10);
    const yearOk = !Number.isNaN(yearNum) && yearNum >= 1990 && yearNum <= 2026;

    const checks = [
      [form.elements.name, data.name.length >= 2, 'Введите имя (мин. 2 символа)', 'sfNameError'],
      [form.elements.phone, phoneOk, 'Введите корректный телефон', 'sfPhoneError'],
      [form.elements.size, data.size.length > 0, 'Укажите размер бассейна', 'sfSizeError'],
      [form.elements.year, yearOk, 'Год от 1990 до 2026', 'sfYearError'],
      [form.querySelector('.service-radio-group'), data.automation.length > 0, 'Выберите вариант', 'sfAutomationError'],
    ];

    for (const [el, valid, message, errorId] of checks) {
      if (valid) {
        if (!silent) clearError(el, errorId);
      } else {
        if (!silent) setError(el, message, errorId);
        if (!firstInvalid) firstInvalid = el;
      }
    }

    return { ok: !firstInvalid, firstInvalid, data };
  }

  function setError(el, message, errorId) {
    el.setAttribute('aria-invalid', 'true');
    const err = document.getElementById(errorId);
    if (err) err.textContent = message;
  }

  function clearError(el, errorId) {
    el.removeAttribute('aria-invalid');
    if (errorId) {
      const err = document.getElementById(errorId);
      if (err) err.textContent = '';
    }
  }

  function buildMessage(d) {
    return [
      'Заявка на сервисное обслуживание',
      '',
      `Имя: ${d.name}`,
      `Телефон: ${d.phone}`,
      `Размер бассейна: ${d.size}`,
      `Год постройки: ${d.year}`,
      `Автоматика химии: ${d.automation}`,
      `Комментарий: ${d.comment || '—'}`,
    ].join('\n');
  }

  let toastTimer = null;
  function showToast(el, message) {
    if (!el) return;
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.textContent = ''; }, 3500);
  }
})();
```

- [ ] **Step 2: Wire the script in `index.html`**

В `index.html` в конце `<body>` есть блок `<script>` тегов:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/portfolio.js"></script>
```

Добавь строку с `service.js` перед `portfolio.js`:

```html
  <script src="js/data-source.js"></script>
  <script src="js/search.js"></script>
  <script src="js/main.js"></script>
  <script src="js/service.js"></script>
  <script src="js/portfolio.js"></script>
```

- [ ] **Step 3: Verify — submit с валидными данными**

Обнови страницу. Прокрути к форме. Заполни все поля корректно (имя «Иван», телефон «+7 961 320 10 50», размер «6×3×1.5 м», год «2020», автоматика «Да», комментарий — любой). Нажми «Отправить заявку в WhatsApp».

Expected: открывается новая вкладка с `web.whatsapp.com` или приложением WhatsApp, в поле ввода предзаполнен текст формата:

```
Заявка на сервисное обслуживание

Имя: Иван
Телефон: +7 961 320 10 50
Размер бассейна: 6×3×1.5 м
Год постройки: 2020
Автоматика химии: Да
Комментарий: <твой комментарий или —>
```

Под кнопкой появляется «Открываем WhatsApp…» на ~3.5 секунды.

- [ ] **Step 4: Verify — submit с пустой формой**

Очисти поля (или просто обнови страницу). Нажми «Отправить заявку в WhatsApp», не заполняя ничего.

Expected: под каждым невалидным полем появляется красный текст ошибки, поля получают красный border через `aria-invalid="true"`, фокус перемещается в поле «Ваше имя». Новая вкладка НЕ открывается.

- [ ] **Step 5: Verify — Telegram fallback**

Снова заполни форму валидно. Кликни «Или напишите нам в Telegram →».

Expected: в новой вкладке открывается `https://t.me/+79613201050`, под кнопкой появляется «Текст заявки скопирован — вставьте в Telegram». Открой любой текстовый редактор, вставь — должен быть тот же текст, что и в WhatsApp-сообщении.

Если кликнуть по TG-ссылке с невалидной формой — вкладка Telegram всё равно должна открыться, но без копирования и без тоста (поведение silent-режима).

- [ ] **Step 6: Commit**

```bash
git add index.html js/service.js
git commit -m "feat: wire service form to WhatsApp and Telegram"
```

---

## Task 5: Responsive breakpoints

**Files:**
- Modify: `css/style.css` (добавить правила в существующие `@media` блоки)

- [ ] **Step 1: Добавь правила в `@media (max-width: 1024px)`**

Найди блок `@media (max-width: 1024px)` в `css/style.css` (около строки 1206). Внутри него, рядом с правилами `.why-us { padding: 100px 40px; }`, добавь:

```css
  .service {
    padding: 80px 40px;
  }

  .service-inner {
    gap: 50px;
  }

  .service-left h2 {
    font-size: 48px;
  }

  .service-stat-val {
    font-size: 36px;
  }
```

- [ ] **Step 2: Добавь правила в `@media (max-width: 768px)`**

Найди блок `@media (max-width: 768px)` (около строки 1262). Внутри него добавь:

```css
  .service {
    padding: 60px 20px;
  }

  .service-inner {
    flex-direction: column;
    gap: 40px;
  }

  .service-left h2 {
    font-size: 40px;
  }

  .service-desc {
    margin-bottom: 28px;
  }

  .service-form {
    padding: 24px;
  }

  .service-stats {
    gap: 24px;
  }
```

- [ ] **Step 3: Добавь правила в `@media (max-width: 480px)`**

Найди блок `@media (max-width: 480px)` (первый, около строки 898; если их несколько — выбери тот, где уже есть мобильные правила для `.why-*`, либо добавь новый блок в конце). Добавь:

```css
  .service {
    padding: 48px 16px;
  }

  .service-left h2 {
    font-size: 32px;
  }

  .service-stat-val {
    font-size: 28px;
  }

  .service-stat-label {
    font-size: 10px;
    letter-spacing: 1px;
  }

  .service-form {
    padding: 20px;
    border-radius: 16px;
  }

  .service-radio-row {
    gap: 8px;
  }

  .service-radio span {
    padding: 10px 8px;
    font-size: 12px;
  }
```

- [ ] **Step 4: Verify in DevTools**

Открой `http://localhost:8000/index.html`. В DevTools включи режим мобильного устройства. Проверь три ширины: **1280px** (desktop — 2 колонки), **800px** (tablet — 2 колонки, меньший шрифт), **375px** (mobile — одна колонка, форма под метриками, радио-pill не ломает ряд).

Expected: на мобильных лейаут в одну колонку, все поля влезают по ширине, радио-кнопки не вываливаются за пределы формы.

- [ ] **Step 5: Commit**

```bash
git add css/style.css
git commit -m "feat: responsive styles for service section"
```

---

## Task 6: End-to-end smoke test

**Files:** не изменяются.

- [ ] **Step 1: Полный сценарий desktop**

Открой `http://localhost:8000/index.html` в ширине ≥ 1280px. Прокрути к секции сервиса. Все визуальные элементы на месте (лейбл, h2, описание, 2 метрики, форма). Заполни форму валидно, нажми submit → WhatsApp открывается с префилом. Заполни ещё раз, кликни TG-ссылку → Telegram открывается, текст в буфере (проверь вставкой).

- [ ] **Step 2: Сценарий навигации**

Открой главную. Кликни гамбургер → «Услуги» в меню → страница скроллит к секции сервиса. Повтори клик по «Услуги» в футере — тот же результат.

- [ ] **Step 3: Сценарий валидации**

Очисти все поля. Нажми submit → появляются пять сообщений об ошибках, фокус в «Ваше имя», новая вкладка не открывается. Начни печатать в поле с ошибкой → ошибка и красный border пропадают при вводе.

- [ ] **Step 4: Сценарий мобильного**

В DevTools 375px: форма в одну колонку, радио-pill в ряд на всю ширину, submit-кнопка на всю ширину, скролл без горизонтального overflow. Клик по submit работает так же.

- [ ] **Step 5: Проверь консоль**

В DevTools Console не должно быть ошибок JS ни при открытии, ни при submit, ни при TG-клике.

- [ ] **Step 6: Финальный коммит (если были правки по итогам smoke test)**

Если всё прошло — ничего коммитить не нужно. Если всплыли баги и ты их правил — одним коммитом:

```bash
git add -A
git commit -m "fix: service section smoke-test fixes"
```

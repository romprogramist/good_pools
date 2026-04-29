# Плавающая кнопка «Рассчитать стоимость»

**Дата:** 2026-04-30
**Статус:** утверждено к имплементации

## Цель

Добавить на сайт «зафиксированную» CTA-кнопку «Рассчитать стоимость», которая всегда видна во время прокрутки на всех страницах сайта, и при клике открывает тот же квиз, что и существующая hero-кнопка.

## Контекст текущего состояния

- Главная hero-кнопка: `index.html:121` — `<button class="hero-cta-btn" data-quiz-open>РАССЧИТАТЬ СТОИМОСТЬ</button>`.
- Квиз реализован в `js/quiz.js`. На `DOMContentLoaded` модуль вешает обработчик клика на любой элемент с атрибутом `data-quiz-open` и вызывает `openQuiz()`, который показывает HTML-`<dialog>`.
- `js/quiz.js` и `css/quiz.css` подключены **только** на `index.html`. На `catalog.html`, `models.html`, `portfolio.html` квиза нет.
- Сайт — статический HTML, без шаблонизатора для публичных страниц.
- Брендовый акцент сайта — `#0ea5e9` (sky-500), часто в виде градиента к `#0284c7`.

## Принятые решения (из брейншторма)

| Вопрос | Решение |
|---|---|
| Где появляется | На всех 4 страницах (`index`, `catalog`, `models`, `portfolio`) |
| Форма | Овальная кнопка-пилюля в правом нижнем углу с полным текстом |
| Момент появления | На главной — после скролла за hero-кнопку. На других — сразу |
| Мобильная версия (≤768px) | Круглый FAB 56×56 px с иконкой калькулятора, текст визуально скрыт (но доступен скринридерам) |
| Цвет | Голубой градиент `linear-gradient(135deg, #0ea5e9, #0284c7)`, текст и иконка белые |
| Подход | Статический HTML в каждом файле + один JS-модуль для логики прокрутки |

## Архитектура

Три новые сущности и точечные правки в существующих HTML-файлах:

1. **HTML-блок кнопки** — повторяется в 4 файлах перед `</body>`.
2. **`css/style.css`** — добавляются стили `.floating-cta` (в конец файла, рядом с другими CTA).
3. **`js/floating-cta.js`** (новый файл) — управляет видимостью кнопки.
4. **Подключение `quiz.css` + `quiz.js` на 3 страницах** (`catalog.html`, `models.html`, `portfolio.html`) — чтобы квиз там работал.

Открытие квиза — НЕ часть этого модуля. Триггер — атрибут `data-quiz-open`, обработчик уже есть в `js/quiz.js`.

## Компоненты

### 1. HTML-блок (одинаковый во всех 4 файлах)

```html
<button type="button" class="floating-cta" data-quiz-open aria-label="Рассчитать стоимость">
  <svg class="floating-cta__icon" viewBox="0 0 24 24" aria-hidden="true">
    <!-- inline path иконки калькулятора -->
  </svg>
  <span class="floating-cta__label">Рассчитать стоимость</span>
</button>
```

Иконка калькулятора — inline SVG (без внешних файлов), `currentColor` для совпадения с цветом текста.

### 2. CSS (добавление в `css/style.css`)

```css
.floating-cta {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(14,165,233,0.35), 0 2px 6px rgba(0,0,0,0.15);
  z-index: 90;
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: opacity .25s ease, transform .25s ease, box-shadow .25s ease;
}

.floating-cta.is-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.floating-cta:hover {
  box-shadow: 0 12px 32px rgba(14,165,233,0.5), 0 4px 10px rgba(0,0,0,0.2);
  transform: translateY(-2px);
}

.floating-cta__icon { width: 20px; height: 20px; }

@media (max-width: 768px) {
  .floating-cta {
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    padding: 0;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    justify-content: center;
  }
  .floating-cta__label {
    position: absolute; width: 1px; height: 1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
  }
  .floating-cta__icon { width: 24px; height: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .floating-cta { transition: none; }
  .floating-cta:hover { transform: none; }
}
```

**Обоснование выбранных значений:**
- `z-index: 90` — выше контента (макс. в коде сейчас `10`), ниже шапки/меню (`99`/`100`) и модалок (`1000`/`9999`). HTML `<dialog>.showModal()` рисуется в top-layer, кнопку всегда перекроет.
- Точка `768px` — совпадает с уже используемым в `style.css` брейкпоинтом.
- В скрытом состоянии — `pointer-events: none`, чтобы невидимая кнопка не перехватывала клики.

### 3. JS (`js/floating-cta.js`, новый файл)

```js
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var fab = document.querySelector('.floating-cta');
    if (!fab) return;

    var heroBtn = document.querySelector('.hero-cta-btn');
    if (!heroBtn || typeof IntersectionObserver === 'undefined') {
      fab.classList.add('is-visible');
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        fab.classList.toggle('is-visible', !entry.isIntersecting);
      });
    }, { threshold: 0 });

    io.observe(heroBtn);
  });
})();
```

**Логика:**
- Если в DOM есть `.hero-cta-btn` (только на главной) — наблюдаем за ним: пока виден — кнопка скрыта; ушёл из viewport — показываем.
- Если hero-кнопки нет — сразу показываем плавающую (catalog/models/portfolio).
- Фолбэк при отсутствии `IntersectionObserver` — кнопка всегда видна.

### 4. Подключение на остальных страницах

В `catalog.html`, `models.html`, `portfolio.html`:
- В `<head>`: `<link rel="stylesheet" href="css/quiz.css">`
- Перед `</body>`: `<script src="js/quiz.js" defer></script>`

Во **всех 4 файлах**:
- Перед `</body>`: блок `<button class="floating-cta" ...>` (см. выше) и `<script src="js/floating-cta.js" defer></script>`.

## Поток событий

1. Пользователь открывает любую страницу.
2. `js/quiz.js` загружается с `defer`, на `DOMContentLoaded` подвешивает обработчик клика на все `[data-quiz-open]` (включая плавающую кнопку и, на главной, hero-кнопку).
3. `js/floating-cta.js` загружается с `defer`, на `DOMContentLoaded` решает, показывать кнопку сразу или ждать выхода hero из viewport.
4. Клик по плавающей кнопке → срабатывает обработчик из `quiz.js` → `openQuiz()` → `<dialog>.showModal()` → пользователь видит тот же квиз.

## Edge cases

| Случай | Поведение |
|---|---|
| Квиз уже открыт, повторный клик по плавающей кнопке | `<dialog>.showModal()` на открытом диалоге кинет ошибку. Это существующее поведение сайта (повторный клик по hero-кнопке делает то же самое). Не чиним — out of scope. |
| Браузер не поддерживает `<dialog>` | Существующее поведение всего сайта. Out of scope. |
| Нет `IntersectionObserver` (старые браузеры) | Фолбэк: кнопка всегда видна. |
| iOS safe area | `env(safe-area-inset-bottom)` отодвигает кнопку от нижней полосы жестов. |
| `prefers-reduced-motion` | Анимации opacity/transform отключены через media query. |
| Кнопка перекрывает контент внизу страницы | Контент остаётся доступен скроллом. Стандартный FAB-паттерн, риск минимальный. |
| Скринридер на мобильном (текст визуально скрыт) | Озвучивание через `aria-label="Рассчитать стоимость"` + `<span>` с visually-hidden технике. |

## Тестирование (ручное)

- [ ] `index.html` при загрузке: плавающая кнопка скрыта.
- [ ] `index.html` после прокрутки за hero-кнопку: плавающая появляется плавно.
- [ ] `index.html` возврат наверх: плавающая снова скрывается.
- [ ] `catalog.html`, `models.html`, `portfolio.html` — кнопка видна сразу при загрузке.
- [ ] Клик по плавающей кнопке на каждой из 4 страниц открывает квиз с заголовком «РАССЧИТАТЬ СТОИМОСТЬ».
- [ ] Ширина окна ≤768px: кнопка — круглый FAB 56×56 без видимого текста, иконка по центру.
- [ ] Ширина окна >768px: пилюля с текстом и иконкой.
- [ ] Hover на десктопе: лёгкое поднятие, усиление тени.
- [ ] Открытый квиз закрывает плавающую кнопку (она под оверлеем).
- [ ] После закрытия квиза плавающая кнопка снова кликабельна.
- [ ] Атрибут `aria-label` озвучивается скринридером и на десктопе, и на мобильном.
- [ ] При включённом `prefers-reduced-motion` нет анимаций появления/hover.

## Out of scope

- Переписывание `js/quiz.js` или способа его подключения.
- Изменение поведения hero-кнопки.
- Аналитика и события трекинга.
- Анимация открытия самого квиза.
- Шаблонизация HTML (общие фрагменты для всех страниц) — сайт остаётся статическим.

## Файлы, которые меняются

| Файл | Что |
|---|---|
| `index.html` | + блок `<button class="floating-cta">`, + `<script src="js/floating-cta.js" defer>` |
| `catalog.html` | + `<link href="css/quiz.css">`, + блок кнопки, + `<script src="js/quiz.js" defer>`, + `<script src="js/floating-cta.js" defer>` |
| `models.html` | то же, что `catalog.html` |
| `portfolio.html` | то же, что `catalog.html` |
| `css/style.css` | + блок стилей `.floating-cta` (~80 строк) |
| `js/floating-cta.js` | новый файл (~20 строк) |

## Файлы, которые НЕ меняются

- `js/quiz.js` — остаётся как есть.
- `css/quiz.css` — остаётся как есть.
- Серверная часть, БД, миграции — не затронуты.

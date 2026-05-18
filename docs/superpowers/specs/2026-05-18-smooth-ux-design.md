# Smooth UX Polish — Design

**Дата:** 2026-05-18
**Тема:** единое плавное движение по всему сайту — появление секций, hover/press, меню, модалки, квиз, формы.

## Цель

Сделать ощущение от сайта максимально плавным и приятным: секции «выезжают» при скролле, элементы реагируют живо и предсказуемо, переходы в меню/модалках/квизе — без рывков. Единый motion-язык по всему сайту вместо текущего разнобоя (71 transition в `style.css`, 2 keyframes, частичный `prefers-reduced-motion`).

## Скоуп

**В работе:**
- Главная (`index.html`) — все секции
- Каталог (`models.html`, `catalog.html`)
- Портфолио (`portfolio.html`)
- Глобальные элементы: header, бургер-меню, gallery modal, interest popup, cookie banner
- Квиз и форма консультации

**НЕ в работе** (явный out-of-scope):
- Внешние библиотеки анимаций (Motion One, GSAP) — решили обходиться vanilla CSS + IntersectionObserver
- Изменения визуального дизайна (цвета, шрифты, layout, контент)
- Серверная часть (`server.js`, routes, БД, миграции)
- Юнит/E2E-тесты — статичный сайт, верификация вручную по чек-листу
- Page transitions между HTML-страницами (требует SPA-логики)
- Админка (`views/`) — внутренний инструмент, не имеет приоритета

## Решённые альтернативы

**Подход к реализации:** IntersectionObserver + CSS (выбрано) vs Motion One vs GSAP.
Причина: проект — статичные HTML + vanilla JS, без сборщика. Добавление либы = operational complexity без пропорциональной выгоды. Spring-overshoot отлично имитируется через `cubic-bezier(.34, 1.56, .64, 1)`.

**Характер движения:** Apple/luxury (медленно-мягко) vs Crisp/modern (чётко-быстро) vs **Springy/lively** (с отскоком — выбрано).
Причина: пользователь хочет «лёгкий отскок», заметнее и приятнее на нашем продукте.

**Раскатка:** один большой PR vs сначала главная vs **фундамент → области** (выбрано).
Причина: единый motion-язык начинается с токенов и утилит; дальше каждая область — отдельный обозримый коммит, можно проверять по ходу.

## Архитектура

### Motion-токены (единый источник правды)

Блок в `:root` в `css/style.css`:

```css
:root {
  /* Длительности */
  --motion-fast:   180ms;   /* press, мелкие переключения */
  --motion-base:   280ms;   /* hover, кнопки, модалки */
  --motion-slow:   620ms;   /* появление секций */
  --motion-stage:  900ms;   /* hero, большие герои */

  /* Easings */
  --ease-out:      cubic-bezier(.16, 1, .3, 1);
  --ease-spring:   cubic-bezier(.34, 1.56, .64, 1);
  --ease-press:    cubic-bezier(.4, 0, .2, 1);

  /* Геометрия */
  --reveal-y:      32px;
  --reveal-y-sm:   16px;
  --hover-lift:    -6px;
  --hover-lift-sm: -3px;
  --press-scale:   .97;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 1ms; --motion-base: 1ms;
    --motion-slow: 1ms; --motion-stage: 1ms;
    --reveal-y: 0; --reveal-y-sm: 0;
    --hover-lift: 0; --hover-lift-sm: 0;
    --press-scale: 1;
  }
}
```

Все компонентные стили в дальнейшем используют **только** эти переменные. Один media-query отключает движение для всего сайта без переписывания компонентов.

### Foundation: `js/motion.js` (~80 строк, без зависимостей)

Подгружается во всех публичных страницах: `<script src="js/motion.js" defer></script>`. Содержит четыре утилиты:

**1. Reveal-on-scroll** — один глобальный `IntersectionObserver` (threshold 0.12, rootMargin `0px 0px -60px 0px`). Находит все `[data-reveal]`; при пересечении добавляет класс `is-revealed`. После первого срабатывания unobserve — анимация не повторяется при обратном скролле.

Поддерживаемые атрибуты:
- `data-reveal` — базовое появление
- `data-reveal-delay="120"` — задержка в мс
- `data-reveal-stagger` — на контейнере: дети получают `--stagger-i: 0`, `1`, `2`… и анимируются с шагом 80мс (через `transition-delay: calc(var(--stagger-i) * 80ms)`)
- `data-reveal-y="sm"` — использовать `--reveal-y-sm` вместо `--reveal-y` (для близких/мелких элементов)

CSS:
```css
[data-reveal] {
  opacity: 0;
  transform: translateY(var(--reveal-y));
  transition: opacity var(--motion-slow) var(--ease-spring),
              transform var(--motion-slow) var(--ease-spring);
  transition-delay: calc(var(--reveal-delay, 0ms) + var(--stagger-i, 0) * 80ms);
}
[data-reveal].is-revealed { opacity: 1; transform: none; }
[data-reveal-y="sm"] { transform: translateY(var(--reveal-y-sm)); }
```

**2. Smooth scroll по якорям** — `html { scroll-behavior: smooth; }` + JS-перехват кликов по `a[href^="#"]`. Перед скроллом считывает высоту header (с учётом hidden/pinned состояния) и компенсирует — якорь не уезжает под header.

**3. Header hide-on-scroll** — слушает scroll через `requestAnimationFrame`-throttle. Сравнивает текущий `scrollY` с предыдущим:
- Если уехал вниз больше чем на 8px и `scrollY > 100` → `body.classList.add('header-hidden')`
- Если поехал вверх хоть на 4px → `body.classList.remove('header-hidden')`

CSS:
```css
.header { transition: transform var(--motion-base) var(--ease-out); }
body.header-hidden .header { transform: translateY(-100%); }
```

**4. Image fade-in** — все `<img>` с `data-fade` (или с `loading="lazy"`) стартуют с `opacity: 0`; на `load` событие добавляется `img-loaded`. Если изображение уже в кэше (complete = true на момент init), сразу `img-loaded`.

```css
img[data-fade], img[loading="lazy"] { opacity: 0; transition: opacity var(--motion-slow) var(--ease-out); }
img.img-loaded { opacity: 1; }
```

## Применение по областям

### A. Появление секций и картинок

Файлы: `index.html`, `models.html`, `catalog.html`, `portfolio.html`.

- `data-reveal` на главных секциях: hero, карусель категорий, каталог-сетка, портфолио, showroom, отзывы, форма консультации, footer
- `data-reveal-stagger` на сетках карточек (`#catGrid`, `.carousel-track`, `.portfolio-grid`)
- Всем `<img>` без `loading="lazy"` (кроме hero) — добавить атрибут
- В JS-рендерах (`main.js` catalogCardHtml, models.js, portfolio.js): новые карточки получают `data-reveal-y="sm"` чтобы не «улетали» далеко при появлении
- Hero — отдельная стартовая анимация: текст + кнопка появляются последовательно через `data-reveal-delay`, без участия скролл-наблюдателя (просто `is-revealed` после `DOMContentLoaded`)

### B. Hover, press, карусель

Файлы: `css/style.css` (миграция существующих transition'ов на токены).

- Карточки (`.pcard`, `.category-card`, портфолио, model-cards): hover → `translateY(var(--hover-lift))` + `box-shadow` bloom; transition — `transform var(--motion-base) var(--ease-spring)`
- Кнопки CTA (`.btn-primary`, `.btn-card`, «Смотреть все», «Подробнее»): hover → подъём `var(--hover-lift-sm)` + тень + стрелка `→` сдвигается +4px вправо
- `:active` для всех интерактивных: `transform: scale(var(--press-scale))` + `transition-duration: var(--motion-fast)` + `var(--ease-press)`
- Стрелки карусели (`.carousel-arrow`): hover → scale(1.1) + усиление bg, активное состояние — press-scale
- Карусель `.carousel-track`: добавить `scroll-snap-type: x mandatory`, на `.category-card` — `scroll-snap-align: start`
- Существующие 71 transition не удаляются автоматически — мигрируются на токены в рамках коммита Области B; transition'ы, не вписывающиеся в систему (декоративные `causticPool`, `mcard-pulse` и т.п.), остаются как есть

### C. Меню, модалки, попапы

**Бургер-меню** (`main.js`, `css/style.css`):
- Overlay стартует `translateX(100%)` + `opacity: 0`; класс `.open` → `translateX(0)` + `opacity: 1`
- Backdrop отдельным `::before` элементом с fade
- Иконка гамбургера: три `<span>` через transform превращаются в крест (rotate + translate) за `var(--motion-base)`
- Закрытие: обратные классы, тот же easing; `body.menu-open` снимается ДО завершения slide-out (иначе блокирует фокус)

**Gallery modal** (`gallery-modal.js`, инлайновые стили):
- Backdrop fade за `var(--motion-base)`
- Изображение `scale(.96) → scale(1)` + fade
- Закрытие — обратное; click outside и Esc уже работают
- Если в модалке есть thumb-strip превьюшек, контейнер получает `data-reveal-stagger` — превьюшки появляются волной

**Interest popup** (`interest-popup.css`, `interest-popup.js`):
- Уже есть анимация — переписать на токены (`var(--motion-base)`, `var(--ease-spring)`)
- Mobile: slide-up снизу; Desktop: scale-up из центра
- Закрытие — обратное

**Cookie banner** (`cookie-banner.css`, `cookie-banner.js`):
- При первом визите: задержка 800мс после `DOMContentLoaded`, затем slide-up снизу
- Dismiss: slide-down + opacity 0, после завершения — `display:none`
- Без анимации, если cookie уже принят (сразу не показывается)

### D. Квиз и формы консультации

**Квиз** (`quiz.js`, `quiz.css`):
- Переходы между шагами: текущий → `opacity 0 + translateX(-20px)` за `var(--motion-base)`; новый стартует с `opacity 0 + translateX(20px)` → `0`
- Кнопка «Назад» — зеркально (translateX знаки меняются)
- Поля при фокусе: border-color + glow (`box-shadow: 0 0 0 4px rgba(brand, .15)`) за `var(--motion-fast)`
- Кастомные radio/checkbox: анимация «галочка рисуется» через stroke-dasharray
- Прогресс-бар: width-transition на `var(--motion-slow) var(--ease-spring)` (доезжает с лёгким overshoot)
- Success-экран: SVG-чекмарк рисуется (stroke-dasharray от длины к 0) за 600мс, текст «Спасибо» появляется через `data-reveal` с задержкой 400мс

**Форма консультации** (`consult.js`, `consult.css`):
- Поля — то же поведение что и в квизе
- Submit-кнопка: на время отправки `.is-loading` → текст fade-out, появляется спиннер (CSS-only rotation)
- Success: текст success-сообщения через `data-reveal`

## Верификация

### Smoke-тест в браузере (после каждого коммита)

Локально, `npm run dev`, `http://localhost:3050/`:

1. Скролл главной сверху донизу → секции выезжают по очереди, не дёргаются, картинки fade-in (не «попают» резко)
2. Hover на 3-4 карточках + 2 кнопках → единый подъём, тень, при клике — лёгкий press
3. Click по якорю в footer/menu → плавный smooth scroll, не уезжает под header
4. Скролл вниз → header уехал; скролл чуть вверх → header вернулся
5. Бургер-меню: открыть → выезжает справа; клик по ссылке → плавно закрылось и проскроллило к секции
6. Галерея портфолио: открыть → fade+scale; закрыть → обратно
7. Cookie banner: первый визит — появляется снизу с задержкой; принять → уезжает вниз
8. Interest popup: триггер → появляется по правилам устройства; закрыть → обратное
9. Квиз: пройти от шага 1 до success → шаги переезжают, прогресс растёт с overshoot, в конце чекмарк рисуется
10. Форма консультации: ввод → focus-glow на полях; submit → спиннер → success

### Mobile (DevTools device emulation)

iPhone 13 + Pixel 7:
- Hover-эффекты не «залипают» после тапа (использовать `@media (hover: hover)` для hover-стилей)
- Бургер-меню открывается/закрывается без лагов
- Квиз помещается на экран, поля доступны
- Skip-link / focus management не сломан

### Reduced motion

Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`:
- Появление секций — мгновенное (без выезда, без задержки)
- Hover/press — без transform, чистые цветовые изменения
- Модалки — открываются/закрываются мгновенно
- Сайт **полностью функционален** — все клики работают, формы шлются

### Производительность

- DevTools → Performance → запись скролла главной 5 сек → FPS ≥ 55 на desktop, ≥ 40 на mobile emulation (CPU 4× slowdown)
- Lighthouse Performance: не падает больше чем на 2 пункта от baseline (замерить ДО первого коммита и после последнего)
- `motion.js` — потолок 4 KB raw (в проекте нет сборщика/минификации, файл отдаётся как есть)

### Регрессии

После каждого коммита — быстрый пробег по другим страницам (`models.html`, `catalog.html`, `portfolio.html`), смотрю что layout/функциональность не сломались от глобальных CSS-изменений токенов.

## Раскатка по коммитам

1. `feat(motion): design tokens + prefers-reduced-motion baseline` — Секция 1 архитектуры
2. `feat(motion): foundation utilities (reveal/scroll/header/img-fade)` — Секция 2 / `js/motion.js`
3. `feat(motion): section reveals + image fade-in on public pages` — Область A
4. `feat(motion): unified hover/press + carousel snap` — Область B
5. `feat(motion): animated burger menu + modal/popup/cookie polish` — Область C
6. `feat(motion): quiz step transitions + form focus polish` — Область D

После каждого коммита — smoke-тест по чек-листу. Если что-то сломалось — фикс в том же коммите до push (не накапливаем).

## Риски и нюансы

- **Существующие 71 transition в `style.css`**: миграция на токены идёт постепенно в Области B; декоративные анимации (`causticPool`, `mcard-pulse`) остаются как есть — они не про навигационное движение
- **`scroll-snap-type` на карусели категорий** может конфликтовать с `scrollTo({behavior:'smooth'})` в `main.js` — проверить на iOS Safari, при необходимости использовать `scroll-snap-stop: always`
- **Hover на touch-устройствах** — обернуть hover-стили в `@media (hover: hover)`, чтобы тап не оставлял «залипший» подъём карточки
- **Cookie banner с задержкой 800мс**: важно убедиться, что задержка не запускается на повторных визитах (где cookie уже принят)
- **Header hide-on-scroll**: первый раз скрывается только после `scrollY > 100`, чтобы при коротком скролле в начале страницы header не дёргался
- **Body scroll lock при открытом меню/модалке**: `overflow: hidden` на `body` иногда вызывает «прыжок» страницы из-за исчезновения скроллбара — компенсировать через `padding-right` равный ширине скроллбара

# Hero Layout Redesign — Full-Width Vertical Stack

**Date:** 2026-04-24
**Project:** good_pools
**Target:** `index.html` hero section + `css/style.css`

## Context

Сейчас hero-секция — двухколоночный flex 40/60:

- **Слева (40%)**: заголовок в 2 строки (`ХОРОШИЕ` жирный / `БАССЕЙНЫ` тонкий), ряд тегов (НАДЕЖНОСТЬ · КРАСОТА · ПРОЗРАЧНОСТЬ), CTA-кнопка «РАССЧИТАТЬ СТОИМОСТЬ» + поясняющий текст.
- **Справа (60%)**: горизонтальная карусель категорий (`#categoryTrack`) со стрелками.
- Дубль CTA (`.hero-cta--mobile`) внизу, показывается только на мобиле.

Нужно пересобрать в вертикальный стек, где каждый ряд занимает всю ширину секции.

## Goal

Превратить hero в вертикальный full-width стек из 4-х рядов, сохранив всё содержимое и вмещая всё в один экран (`100svh`) на десктопе.

## Design

### Target layout (desktop + mobile, единая раскладка)

```
┌──────────────────────────────────────────────────────┐
│   ХОРОШИЕ БАССЕЙНЫ     ← 1 ряд, 1 строка             │  .hero-title
│                          ("ХОРОШИЕ" weight 900,      │
│                           "БАССЕЙНЫ" weight 200)     │
├──────────────────────────────────────────────────────┤
│   НАДЕЖНОСТЬ      КРАСОТА      ПРОЗРАЧНОСТЬ          │  .hero-tags
│   (justify-content: space-between)                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│   [ карусель категорий, flex: 1, тянется            │  .hero-slider
│     по всему свободному месту ]                      │  (обёртка над
│                                                      │   .carousel-container)
├──────────────────────────────────────────────────────┤
│   [ РАССЧИТАТЬ СТОИМОСТЬ ]                          │  .hero-cta
│   Поясняющий текст…                                  │
└──────────────────────────────────────────────────────┘
```

Боковой padding — 60px (как сейчас), высота — `min-height: 100svh` (сохраняется).

### HTML-структура (`index.html`, секция `.hero`)

```html
<section class="hero">
  <div class="hero-title">
    <span class="bold">ХОРОШИЕ</span>
    <span class="thin">БАССЕЙНЫ</span>
  </div>

  <div class="hero-tags">
    <span>НАДЕЖНОСТЬ</span>
    <span>КРАСОТА</span>
    <span>ПРОЗРАЧНОСТЬ</span>
  </div>

  <div class="hero-slider">
    <div class="carousel-container">
      <div class="carousel-track" id="categoryTrack">
        <!-- категории рендерятся из js/main.js -->
      </div>
      <button class="carousel-arrow carousel-arrow--prev" aria-label="Предыдущий">…</button>
      <button class="carousel-arrow carousel-arrow--next" aria-label="Следующий">…</button>
    </div>
  </div>

  <div class="hero-cta">
    <a href="#service" class="hero-cta-btn">РАССЧИТАТЬ СТОИМОСТЬ</a>
    <p class="hero-cta-text">
      Рассчитайте стоимость бассейна самостоятельно и
      <strong>получите бесплатную консультацию от нашего менеджера</strong>
    </p>
  </div>
</section>
```

### CSS (desktop baseline)

```css
.hero {
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  padding: 80px 60px 40px; /* top запас под .header */
  gap: 24px;
  position: relative;
}

.hero-title {
  font-size: clamp(56px, 10vw, 160px);
  line-height: 0.95;
  letter-spacing: 2px;
  color: #fff;
  text-transform: uppercase;
  white-space: nowrap;
  display: flex;
  gap: 0.35em;
  align-items: baseline;
}
.hero-title .bold { font-weight: 900; }
.hero-title .thin { font-weight: 200; letter-spacing: 4px; }

.hero-tags {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 3px;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  flex-wrap: wrap;
  gap: 6px 0;
}

.hero-slider {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
}
.hero-slider .carousel-container { width: 100%; }

.hero-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
/* .hero-cta-btn и .hero-cta-text — без изменений (оставляем текущие стили) */
```

**Ключевые решения:**

- `clamp(56px, 10vw, 160px)` масштабирует заголовок по ширине окна; `white-space: nowrap` держит в одну строку, верхний предел 160px — защита от гигантизма на широких экранах.
- `.hero-slider` с `flex: 1; min-height: 0` — съедает всё свободное пространство между тегами и CTA, поэтому hero помещается в один экран.
- `.hero-tags` с `justify-content: space-between` растягивает 3 тега на всю ширину hero.
- Все стили внутри `.carousel-container`, `.carousel-track`, `.category-card` — без изменений.

### Responsive (mobile)

```css
@media (max-width: 900px) {
  .hero {
    padding: 60px 20px 20px;
    gap: 16px;
  }
}

@media (max-width: 600px) {
  .hero-title {
    white-space: normal;
    flex-direction: column;  /* слова на отдельных строках */
    gap: 0;
  }
  .hero-tags {
    justify-content: flex-start;
    gap: 8px 16px;
  }
  .hero-cta-btn { width: 100%; text-align: center; }
}
```

### Удаляемые артефакты старой раскладки

CSS-классы (вместе со всеми их media-queries в `css/style.css`):

- `.hero-left` (строка 281, + 1682, 1754, 1760, 1806, 1823, 2111, 2414)
- `.hero-right` (371, 1773, 1846, 1872)
- `.hero-title-bold` (293, 1812, 2115, 2418)
- `.hero-title-thin` (302, 1813, 2119, 2422)
- `.hero-cta--mobile` (334, 1764, 1827, 2130, 2433)
- CSS-переменная `--hero-title-width` (если встречается — проверить, на старте установки у `.hero-tags` стоит `max-width: var(--hero-title-width, 100%)` — убрать `max-width`).

HTML (`index.html`):

- Удалить второй блок `<div class="hero-cta hero-cta--mobile">…</div>` (строки 115–118) — это был дубликат CTA для мобильной раскладки; в новой раскладке CTA один и всегда внизу.

**Контент не трогаем** — весь текст («Хорошие», «Бассейны», теги, «РАССЧИТАТЬ СТОИМОСТЬ», поясняющий параграф, карусель категорий) остаётся как есть.

### Затрагиваемые файлы

| File | Change |
|------|--------|
| `index.html` | Переписать `.hero` (строки 84–119). Удалить дубликат `.hero-cta--mobile` (115–118). |
| `css/style.css` | Переписать секцию `.hero*` (271–396). Удалить media-queries для устаревших классов (1682–1872 в части hero, 1799–1872, 2107–2140, 2410–2444). Новые правила положить вместо старых, сохранив номера строк общего блока hero. |

### Что НЕ трогаем

- `js/main.js` и логика рендеринга карусели (`#categoryTrack`).
- Все остальные секции (`.catalog`, `.portfolio`, `.rr`, `.why-us`, `.showroom`, `.service`, `.contacts`, `.footer`).
- Хедер и мобильное меню.

### Bump cache-busting

Поднять версию CSS в `index.html`: `css/style.css?v=20260424a`.

## Acceptance criteria

- Десктоп 1920×1080: hero занимает ровно один экран (без вертикального скролла внутри hero). Заголовок «ХОРОШИЕ БАССЕЙНЫ» в одну строку, жирный + тонкий, тянется по ширине. Теги равномерно по ширине. Карусель посередине. CTA снизу слева.
- Ноутбук 1366×768: то же, заголовок уменьшается через clamp, всё помещается в экран.
- Мобильный 390×844: заголовок переносится на 2 строки (`white-space: normal`), теги слева флэкс-врапом, карусель скроллится горизонтально, кнопка на всю ширину, текст под ней.
- Карусель категорий работает: горизонтальный скролл, стрелки prev/next, клик по карточке ведёт на `models.html`.
- Никаких визуальных регрессий в соседних секциях.

## Non-goals

- Не меняем содержимое карточек категорий или источник данных (`js/main.js`).
- Не меняем header/меню.
- Не правим другие секции страницы.
- Не добавляем анимаций/переходов сверх существующих.

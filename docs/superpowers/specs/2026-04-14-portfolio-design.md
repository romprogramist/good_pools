# Портфолио: секция на главной + страница `portfolio.html`

**Дата:** 2026-04-14
**Статус:** одобрено, готово к реализации
**Контекст:** демо-макет для заказчика. Данные потом подключат к админке.

## Цель

Добавить на главную страницу секцию «Наши работы» в стиле featured-layout (одна крупная карточка + две малые) с кнопкой «Смотреть все работы», ведущей на новую страницу `portfolio.html` с сеткой 12 реализованных проектов и клиентским фильтром по категории.

## Scope

- Секция `.portfolio` в `index.html` между `.catalog` и `.why-us`
- Новая страница `portfolio.html` с тёмной темой (переиспользует `body.models-dark`)
- 12 работ, все фото скачиваются локально в `images/portfolio/` (офлайн-режим демо работает)
- Клиентский фильтр по категории (show/hide как в `js/models.js`)
- Обновление меню во всех HTML: пункт «Портфолио» → `portfolio.html`

## Вне scope (YAGNI)

- Лайтбокс / модалка увеличения фото
- Слайдер фото внутри карточки
- Детальные страницы отдельных проектов
- Поиск, сортировка, пагинация
- Отзывы клиентов на карточке
- Real API / бэкенд

## Архитектура

### Файлы

| Файл | Роль |
|---|---|
| `images/portfolio/work-01.jpg` … `work-12.jpg` | 12 фото 1600×1200, скачиваются с Unsplash локально |
| `index.html` | Новая `<section class="portfolio">` между `.catalog` и `.why-us`. Пункт меню «Портфолио» → `portfolio.html` |
| `portfolio.html` | Новая страница. `body.models-dark` (тёмная тема переиспользуется). Копия шапки/меню из `models.html` |
| `js/portfolio.js` | Массив `WORKS` (12 объектов) + рендер сетки и фильтра |
| `css/style.css` | Секция `PORTFOLIO`: стили `.portfolio` (светлая на главной) и `.work-card` (универсальный, с оверрайдами под `body.models-dark`) |
| `models.html` | Пункт меню «Портфолио» → `portfolio.html` |

### Данные работы

```js
{
  id: 1,
  title: 'Вилла в Подмосковье',
  location: 'Московская область',
  category: 'composite',         // composite | custom | jacuzzi | furako
  size: '8.0 × 4.0 м',
  year: 2024,
  image: 'images/portfolio/work-01.jpg'
}
```

Всего 12 работ:
- **Композитные (4):** Подмосковье / Сочи / Краснодар / Санкт-Петербург
- **Кастом (3):** Казань / Ростов-на-Дону / Калининград
- **Джакузи-спа (3):** Екатеринбург / Новосибирск / Владивосток
- **Фурако (2):** Карелия / Горный Алтай

### Фото

Источник — Unsplash (прямые CDN URL), скачиваются через curl в `images/portfolio/`. Если какой-то URL не отдаёт 200, fallback на Lorem Picsum со seed'ом. Итого 12 файлов по 200–400 КБ.

### Секция на главной — разметка

```
<section class="portfolio">
  <div class="port-header">
    <div class="port-header-left">
      <div class="label">Портфолио</div>
      <h2>
        <span class="bold">НАШИ</span><br>
        <span class="thin">РАБОТЫ</span>
      </h2>
    </div>
    <div class="port-header-right">
      <p>Более 200 реализованных проектов. Вот несколько свежих.</p>
      <a href="portfolio.html" class="btn-all-top">
        Смотреть все работы <span class="arrow">→</span>
      </a>
    </div>
  </div>
  <div class="port-featured">
    <article class="work-card work-card--big">…</article>
    <div class="port-featured-col">
      <article class="work-card">…</article>
      <article class="work-card">…</article>
    </div>
  </div>
</section>
```

Сетка `.port-featured`: CSS Grid `grid-template-columns: 1.6fr 1fr`, левая колонка — одна big-карточка во всю высоту, правая — две обычные карточки друг над другом. На мобильном — вертикальный стек.

### Карточка `.work-card`

```
┌───────────────────────────┐
│                           │
│    [фото, object-cover]   │
│                           │
│  ┌ category-tag (cyan)    │  абсолютно, top-left
│  └ year (полупрозрачный)  │  абсолютно, top-right
│                           │
│                           │
├───────────────────────────┤
│ Название проекта          │
│ Локация                   │
│ Категория · размер        │  cyan
└───────────────────────────┘
```

`.work-card--big` растягивается на всю высоту правой колонки, фото занимает ~75% карточки.

Светлая вариация (на `index.html`):
- `background: #fff`
- `title`: `#0c4a6e`
- `location`: `#64748b`
- `tag`: cyan градиент
- `border-radius: 24px`
- `box-shadow: 0 4px 24px rgba(3,105,161,0.06)`

Тёмная (на `portfolio.html` через `body.models-dark .work-card`):
- `background: #101722`
- `title`: `#f1f5f9`
- `location`: `#94a3b8`
- `border: 1px solid rgba(14,165,233,0.12)`

Hover (обе темы): `translateY(-6px)` + усиленный shadow, фото `scale(1.05)`.

### Структура `portfolio.html`

```
<header> (тёмная через body.models-dark)
<menu overlay>
<main class="models-page portfolio-page">
  <section class="models-hero">
    "← На главную"
    "Портфолио · реализованные проекты"
    H1: "НАШЕ / ПОРТФОЛИО" (bold/thin)
    "12 реализованных проектов"
  </section>
  <nav class="models-filter">
    [Все] [Композитные] [Кастом] [Джакузи-спа] [Фурако]
  </nav>
  <div class="works-grid">
    12 × .work-card
  </div>
  <section class="models-cta">
    "Хотите такой же проект? [Бесплатная консультация]"
  </section>
</main>
<script src="js/main.js">
<script src="js/portfolio.js">
```

Реюзаем `.models-page`, `.models-hero`, `.models-filter`, `.mchip`, `.models-cta` — все уже есть в `style.css`.

### `works-grid` — сетка

| Ширина | Колонок |
|---|---|
| ≥1200px | 3 |
| 768–1199 | 2 |
| <768px | 1 |

Тот же адаптив, что у `.models-grid`. Можно переиспользовать правила, но для ясности заведу `.works-grid` с такими же значениями (чтобы при изменении моделей не задеть портфолио).

### Фильтр

- 5 чипов: Все, Композитные, Кастом, Джакузи-спа, Фурако
- Мебель и надувные спа исключены — это товары, а не «реализованные проекты»
- Логика show/hide как в `js/models.js`: клик → активный класс → перебор карточек → `.hidden`

### Обновление меню

В `index.html`, `models.html`, `portfolio.html`:

```html
<a href="portfolio.html" class="menu-link" data-index="1">
```

(раньше было `href="#"` или `href="index.html"`).

## Тестирование

1. `http://localhost:8000/` — вижу секцию «НАШИ РАБОТЫ» между каталогом и why-us, 3 карточки, фото загружены
2. Клик на «Смотреть все работы» → открывается `portfolio.html` с тёмной темой
3. В портфолио видны 12 карточек, 5 чипов
4. Клик по каждому чипу скрывает лишние (4+3+3+2 по категориям)
5. Клик «Все» возвращает все 12
6. Responsive: 3 → 2 → 1 колонка
7. Клик «Портфолио» в гамбургер-меню на любой странице → `portfolio.html`
8. Клик «← На главную» → `index.html`
9. Кнопка «Все модели» по-прежнему работает, не сломалась

## Риски

- **Unsplash URL может не отвечать 200** → встроенный fallback на Lorem Picsum со seed'ом, плюс проверка статусов после скачивания
- **Размер репо вырастет на ~3 МБ** — приемлемо для статичной демки, `.gitignore` не нужен
- **Тёмные оверрайды для `.work-card`** — если где-то реальный селектор не перекроется, карточка будет выглядеть как светлая на тёмном фоне. Проверка: visual test после деплоя

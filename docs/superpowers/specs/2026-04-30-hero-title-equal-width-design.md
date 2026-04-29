# Одинаковая ширина строк hero-заголовка на ≤600px

**Дата:** 2026-04-30
**Статус:** утверждено к имплементации

## Цель

На главной странице (`index.html`) при ширине viewport ≤600px две строки заголовка hero-секции — «ХОРОШИЕ» и «БАССЕЙНЫ» — должны иметь визуально одинаковую ширину относительно друг друга. Шрифтовые стили (вес, тип, letter-spacing) **не меняются** — только `font-size` каждой строки.

## Контекст текущего состояния

- HTML hero-заголовка в `index.html:91-94`:
  ```html
  <div class="hero-title">
    <span class="bold">ХОРОШИЕ</span>
    <span class="thin">БАССЕЙНЫ</span>
  </div>
  ```
- Базовые стили (`css/style.css:376-395`):
  - `.hero-title` — flex с `gap: 0.35em`, `white-space: nowrap`, размер `calc((100vw - 160px) / 14)`.
  - `.hero-title .bold { font-weight: 900 }`.
  - `.hero-title .thin { font-weight: 200; letter-spacing: 4px }`.
- На ≤600px (`css/style.css:2147-2164`) hero-title переключается в столбец (`flex-direction: column`) и получает общий `font-size: 11vw`.
- На ≤480px (`css/style.css:2202-2208`) общий `font-size: clamp(38px, 11vw, 56px)`, `.thin { letter-spacing: 2px }`.
- На ≤360px (`css/style.css:2499-2505`) общий `font-size: 36px`, `.thin { letter-spacing: 1px }`.
- Логотип сайта в шапке использует те же слова, но другой класс (`.site-logo`) и не пересекается с `.hero-title`. Его НЕ трогаем.
- Поскольку «ХОРОШИЕ» (7 букв, вес 900) и «БАССЕЙНЫ» (8 букв, вес 200, letter-spacing 4-2-1px по брейкпоинтам) при одном `font-size` рендерятся разной ширины, нужна раздельная настройка размера на каждый span.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Что выравниваем | Только большой заголовок hero-секции (`<div class="hero-title">` в `index.html:91`). Логотип в шапке (`<a class="site-logo">` в `index.html:22`) не трогаем. |
| На каких ширинах | `≤600px` — задача. Так как стартовое соотношение `.thin/.bold` сохраняется и на меньших брейкпоинтах (480px и 360px), пропорция сохранится в той же доле и там. |
| Что меняем | Только `font-size` каждой строки. Шрифтовые веса (`.bold` 900, `.thin` 200) и letter-spacing — без изменений. |
| Подход | CSS-only, разные `font-size` для `.bold` и `.thin` в трёх существующих @media-блоках (`≤600px`, `≤480px`, `≤360px`). Никакого JS, никаких `transform: scaleX()`. |
| Стартовое соотношение | `.thin = 10/11 ≈ 0.91` от `.bold`. Финальное значение — подбирается в DevTools на 600px по совпадению ширины строк. |

## Архитектура

Одна правка — `css/style.css`. Никаких новых файлов, никаких правок HTML или JS.

В трёх существующих @media-блоках, которые задают `font-size` на `.hero-title` целиком, разделяем его на per-span: `.hero-title .bold` и `.hero-title .thin` получают свои значения.

## Изменения в `css/style.css`

### 1. Блок `@media (max-width: 600px)` (строки 2147-2164)

**Было:**
```css
@media (max-width: 600px) {
  .hero {
    padding-top: 96px;
  }
  .hero-head {
    width: auto;
  }
  .hero-title {
    white-space: normal;
    flex-direction: column;
    gap: 0;
    font-size: 11vw;
  }
  .hero-tags {
    justify-content: flex-start;
    gap: 8px 16px;
  }
}
```

**Стало:**
```css
@media (max-width: 600px) {
  .hero {
    padding-top: 96px;
  }
  .hero-head {
    width: auto;
  }
  .hero-title {
    white-space: normal;
    flex-direction: column;
    gap: 0;
  }
  .hero-title .bold { font-size: 11vw; }
  .hero-title .thin { font-size: 10vw; }
  .hero-tags {
    justify-content: flex-start;
    gap: 8px 16px;
  }
}
```

### 2. Блок `@media (max-width: 480px)` — правила `.hero-title*` (строки 2202-2208)

**Было:**
```css
  .hero-title {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title .thin {
    letter-spacing: 2px;
  }
```

**Стало:**
```css
  .hero-title .bold {
    font-size: clamp(38px, 11vw, 56px);
  }

  .hero-title .thin {
    font-size: clamp(34px, 10vw, 50px);
    letter-spacing: 2px;
  }
```

### 3. Блок `@media (max-width: 360px)` — правила `.hero-title*` (строки 2499-2505)

**Было:**
```css
  .hero-title {
    font-size: 36px;
  }

  .hero-title .thin {
    letter-spacing: 1px;
  }
```

**Стало:**
```css
  .hero-title .bold {
    font-size: 36px;
  }

  .hero-title .thin {
    font-size: 33px;
    letter-spacing: 1px;
  }
```

## Тюнинг значений

Стартовое соотношение `.thin / .bold ≈ 0.91` — оценка по примерной ширине глифов Montserrat 900 vs 200 + учёт letter-spacing. Финальная подгонка делается в браузере:

1. Открыть `http://localhost:3050/` в браузере, DevTools → Responsive mode → ширина `600px`.
2. Прикинуть ширины строк «ХОРОШИЕ» и «БАССЕЙНЫ» (можно подсветить span'ы Inspector'ом — внизу панели `Computed` видно `width`).
3. Если `БАССЕЙНЫ` всё ещё шире — уменьшить значение `.thin` (10vw → 9.5vw → 9vw).
4. Если уже уже — увеличить.
5. Когда совпало на 600px — **пересчитать ту же дробь** в `≤480px` и `≤360px`-блоках:
   - `clamp` для `.thin` пересчитать как `clamp(min × ratio, vw × ratio, max × ratio)`, где `ratio` — финальная дробь от `.bold`.
   - Для `≤360px` фиксированный пиксель — `36px × ratio`, округлить до целого.
6. Перепроверить на 480px и 360px ширины — обе строки одинаковой ширины.

## Поведение на других ширинах

- `>600px`: правила `.hero-title { font-size: ... }` из строки 376 действуют без изменений — заголовок в одну строку, ничего не трогаем.
- В шапке `.site-logo`: классы `.bold` и `.thin` те же самые слова, но внутри `.site-logo`, не `.hero-title`. Селекторы `.hero-title .bold` / `.hero-title .thin` не зацепят логотип.

## Edge cases

| Случай | Поведение |
|---|---|
| Очень узкий viewport (320px) | Срабатывает `≤360px` правило с фиксированными `36px` / `33px`. Обе строки одинаковой ширины. |
| Браузер не поддерживает `clamp()` | Очень старый браузер. На сайте `clamp()` уже используется (`render-vs-reality`, контакты, хедер) — не наша проблема. |
| Включённый user-agent zoom | Размеры в `vw` масштабируются вместе с layout, пропорция сохраняется. |
| Загрузка веб-шрифта Montserrat не завершена (FOUT/FOIT) | На fallback-шрифте `'Segoe UI', sans-serif` пропорция может быть чуть иной — решается тем же одним соотношением, влияет ненадолго и непринципиально. |

## Тестирование (ручное)

- [ ] DevTools → 600px ширина → строки «ХОРОШИЕ» и «БАССЕЙНЫ» одинаковой ширины (визуально).
- [ ] DevTools → 480px ширина → пропорция сохраняется.
- [ ] DevTools → 360px ширина → пропорция сохраняется.
- [ ] DevTools → 320px ширина → правило `≤360px` действует, обе строки одинаковой ширины.
- [ ] DevTools → 601px ширина → заголовок в одну строку, выглядит как до правки.
- [ ] Логотип в шапке `<header>` на всех ширинах выглядит как до правки (не задет селекторами).

## Файлы, которые меняются

| Файл | Что |
|---|---|
| `css/style.css` | Три точечные правки в `@media (max-width: 600px)`, `@media (max-width: 480px)`, `@media (max-width: 360px)` — разделение `font-size` на `.bold` / `.thin`. |

## Файлы, которые НЕ меняются

- `index.html`, `catalog.html`, `models.html`, `portfolio.html` — никаких правок HTML.
- Все JS-модули — не задействованы.
- Серверная часть, БД — не задействованы.
- Логотип в шапке (`.site-logo`) — не трогаем.

## Out of scope

- Логотип сайта в шапке (`.site-logo`).
- Изменение веса шрифта, letter-spacing, типа шрифта.
- Использование JS для динамических измерений.
- Использование `transform: scaleX()` (искажает буквы тонкого начертания).
- Изменения для `>600px` ширины.

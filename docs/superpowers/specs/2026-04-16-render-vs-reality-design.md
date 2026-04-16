# Секция «От рендера до реальности» — дизайн

**Дата:** 2026-04-16
**Файл:** `index.html` (между секциями `portfolio` и `why-us`)

## Цель
Показать клиенту разницу между 3D-визуализацией проекта и построенным результатом, чтобы вызвать «вау» и снять страх «нарисовали красиво, построят кое-как».

## UX-механика
Глобальный toggle «Рендер ↔ Реальность» с плавным crossfade (~500мс) внутри карусели из 3 пар фотографий.

- Пользователь по умолчанию видит **рендеры**.
- Тап/клик на «Реальность» → одновременно во всех слайдах кадры рендеров плавно сменяются реальными фото.
- Карусель свайпается на тач, листается стрелками на десктопе, есть точки-навигация.
- Используется toggle-вариант (не drag-slider before/after), потому что ракурсы рендера и реала не совпадают пиксель-в-пиксель — drag-shutter дал бы кашу.

## Структура DOM
```
section.rr
  .rr-inner
    .rr-head            (eyebrow + h2 + sub)
    .rr-toggle          (две кнопки + sliding pill)
    .rr-stage[data-mode="render"|"real"]
      .rr-arrow.rr-prev
      .rr-track
        .rr-slide.is-active
          .rr-frame
            img.rr-img-render
            img.rr-img-real
      .rr-arrow.rr-next
    .rr-dots
```

## Поведение
- Toggle меняет `data-mode` на `.rr-stage`. CSS:
  - `[data-mode="render"] .rr-img-real { opacity: 0 }`
  - `[data-mode="real"] .rr-img-render { opacity: 0 }`
  - transition `opacity .5s ease`
- Карусель: один слайд видим, `transform: translateX()` на `.rr-track`. Остальные слайды по сторонам.
- Свайп: pointerdown/move/up + порог 40px → next/prev.
- Стрелки скрыты на ≤767px, на тач только свайп + точки.
- Toggle pill анимирован transform-translateX 250мс.

## Контент
- **Eyebrow:** «Визуализация · реализация»
- **Заголовок:** «ОТ РЕНДЕРА» / «ДО РЕАЛЬНОСТИ» (паттерн bold/thin как в hero и других секциях)
- **Sub:** «Каждый проект сначала живёт в 3D. Сравните, что обещали — и что построили.»
- **Toggle:** «Рендер» | «Реальность»

## Активы
`images/render-vs-reality/`:
- `pair1-render.jpg` ↔ `pair1-real.jpg` (бассейн с водопадом, угловой ракурс)
- `pair2-render.jpg` ↔ `pair2-real.jpg` (длинный бассейн, общий план)
- `pair3-render.jpg` ↔ `pair3-real.jpg` (бассейн крупно у воды)

## Стиль
- Тёмный фон в духе сайта (`#0f1419` — как у других тёмных секций).
- Aspect-ratio фрейма `16/10` на десктопе, `4/5` на мобиле (под вертикальные WhatsApp-фото).
- Aкцентный цвет — `#0ea5e9` (как в `.why-us`).

## Файлы
- `index.html` — добавить разметку секции
- `css/style.css` — добавить блок `.rr*`, обновить cache-bust query
- `js/render-vs-reality.js` — toggle, карусель, свайп, точки
- `index.html` — подключить новый JS

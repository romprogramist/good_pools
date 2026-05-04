# Поведенческий попап интереса (Interest Popup)

**Дата:** 2026-05-04
**Статус:** утверждено к имплементации

## Цель

Ловить «горячих» посетителей, которые проявили активный интерес к конкретной модели чаши, и предлагать им оставить заявку — без раздражения тех, кто просто внимательно читает.

Сигналы интереса считаются по каждой модели независимо, копятся между сессиями, складываются в один балл (score). Когда score превышает порог — снизу появляется ненавязчивый toast с привязкой к конкретной модели. Клик по toast разворачивает модалку с формой (имя, телефон, опционально адрес/размер участка).

Бэкенд для лидов в этой задаче не делается — сабмит идёт в `console.log` + UI «Спасибо». Когда `POST /api/leads` появится, payload уже сейчас формируется в нужной структуре.

## Контекст текущего состояния

- Каталог моделей с реальными фото — на странице `models.html` (тянет данные из `/api/models`, у каждой модели в API есть `id`, `name`, `gallery: [url, ...]`).
- Страница `catalog.html` — статический hero-блок с 4 hard-coded карточками и без галереи фото. В рамках этой задачи **не трогается**.
- Модалка с фото уже реализована — `js/gallery-modal.js`, `window.GalleryModal.open({ title, infoLines, gallery, triggerEl })`. Используется на `models.html` и `portfolio.html`.
- В текущем `GalleryModal.open(...)` не передаётся `id` модели — только `title`. Для трекинга по конкретной чаше это критично: нужно отличать «смотрел HIIT 30 секунд» от «смотрел ZEN 30 секунд». Минимальная правка `gallery-modal.js` это исправит.
- Существующая модалка `js/consult.js` (имя + телефон через `<dialog>`) использует те же поля и валидацию, маска `+7 (XXX) XXX-XX-XX`. Новый попап — отдельный flow и отдельный модуль; код маски и валидации переиспользуется через копирование (~15 строк) ради изоляции модулей — тот же подход, что между `consult.js` и `quiz.js`.
- Бэкенда для лидов нет — в `consult.js` стоит `// TODO: replace with POST /api/leads when backend is ready`. Эта задача его не делает.

## Принятые решения

| Вопрос | Решение |
|---|---|
| Где работает | Только на `models.html` (страница со списком моделей и реальными фото). На `catalog.html` не работает — там нет галереи. |
| Триггер | Композитный score интереса по каждой модели. Порог `score >= 10`. |
| Сигналы и веса | Активное время в модалке `+0.2/сек` (cap 8 за открытие); просмотр уникального фото `+1.5/фото` (cap 6); 2-е открытие модели `+3` разово; 3-е и далее `+5` за каждое; дошёл до последнего фото `+2` разово. |
| «Активное» время | Учитывается, только если: вкладка видима (`visibilityState === 'visible'`), окно в фокусе (`document.hasFocus()`), и активность пользователя (`mousemove`/`keydown`/`touchmove`/`scroll`/`click`) была в последние 15 секунд. |
| Хранение score | `localStorage`, ключ `gp_interest_v1`, копится между сессиями. Версия в ключе — для будущих миграций формата. |
| Формат показа | **Toast снизу-справа поверх `GalleryModal`** (не блокирует фото). Клик по toast → разворачивается **модалка с формой**. Модалка не закрывает `GalleryModal` под собой. |
| Поля формы | Имя (обязательно), телефон с маской `+7 (XXX) XXX-XX-XX` (обязательно), адрес/размер участка (необязательно, скрыто под раскрывашкой «Указать участок (необязательно)»). |
| Сабмит | `console.log('[interest-popup] submit', payload)` + UI «Спасибо». Payload включает `model_id`, `model_name`, `score`, сводку сигналов — структура совпадает с будущим `POST /api/leads`. |
| Частота показа | Один показ **на сессию** (любая модель — `sessionStorage`). После закрытия toast/модалки без сабмита — пауза **7 дней** для этой модели. После сабмита — **никогда** для этой модели. |
| Бэкенд | Не делается. Только клиент. Сервер ничего о попапе не знает. |
| Архитектура | Один модуль трекинга (`interest-tracker.js`) + один модуль UI (`interest-popup.js`) + один CSS. Связь между ними — через `CustomEvent` на `document`. |
| Связь с GalleryModal | `gallery-modal.js` начинает диспатчить `CustomEvent`-ы (`gallery:open`, `gallery:close`, `gallery:photo`). Tracker слушает, не лезет в потроха галереи. На страницах без `GalleryModal` tracker просто бездействует. |
| Адаптив | Toast и модалка — десктоп и мобайл. Toast на мобиле — снизу на всю ширину минус 16px. Модалка по образцу `consult.css`. |
| A11y | `role="dialog"` + `aria-modal` для формы, focus trap, Esc закрывает, фокус возвращается на toast после закрытия модалки. |

## Архитектура

Три новых файла + точечные правки в `gallery-modal.js`, `models.js` и `models.html`:

1. **`js/interest-tracker.js`** (новый) — IIFE. Считает score по каждой модели, держит таймер активного времени, читает/пишет в `localStorage`. На пороге диспатчит `CustomEvent('interest:trigger', { detail: { id, name } })` на `document`. Не знает про UI.
2. **`js/interest-popup.js`** (новый) — IIFE. Слушает `interest:trigger`, рисует toast, по клику разворачивает модалку, обрабатывает форму. Не знает про score.
3. **`css/interest-popup.css`** (новый) — стили toast и модалки. Цвет/шрифты согласованы с `consult.css` и `quiz.css`.
4. **`js/gallery-modal.js`** (правка) — три новых вызова `document.dispatchEvent(new CustomEvent('gallery:*', { detail }))` в `open`, `close`, `render`/`go`. Никакой другой логики не меняется. На страницах, где нет трекера, события никем не слушаются и ничего не делают.
5. **`js/models.js`** (правка) — при вызове `GalleryModal.open({...})` пробрасывать `id` модели в новое поле `item.id`. Текущий вызов уже знает `id` (приходит из `/api/models`), просто не передаёт.
6. **`models.html`** (правка) — подключить:
   - `<link rel="stylesheet" href="css/interest-popup.css?v=20260504">`
   - `<script src="js/interest-tracker.js?v=20260504" defer></script>`
   - `<script src="js/interest-popup.js?v=20260504" defer></script>`

Изоляция:
- Tracker → Popup общаются только через `CustomEvent`. Можно подменить любой из двух независимо.
- Tracker → GalleryModal: только через `CustomEvent`. GalleryModal остаётся универсальным, не знает про трекинг.
- Веса/пороги — в одном объекте `CONFIG` в `interest-tracker.js`, легко тюнить.

## Компоненты

### 1. `js/interest-tracker.js`

```js
(function () {
  'use strict';

  const STORAGE_KEY = 'gp_interest_v1';
  const SESSION_KEY = 'gp_interest_shown_session';
  const CONFIG = {
    TRIGGER_THRESHOLD: 10,
    DISMISS_PAUSE_DAYS: 7,
    IDLE_AFTER_MS: 15000,
    WEIGHTS: {
      secondActive: 0.2,
      photoView: 1.5,
      secondOpen: 3,
      nthOpen: 5,
      lastPhoto: 2,
    },
    CAPS: {
      secondsPerOpen: 8,    // макс баллов за активное время в одном открытии (= 40 сек)
      photosPerOpen: 6,     // макс баллов за фото в одном открытии (= 4 уникальных)
    },
  };

  // state in memory + persisted to localStorage:
  // {
  //   scores: { hii: 12.4, zen: 3.1 },
  //   opens:  { hii: 2 },                  // суммарно по всей истории
  //   photosViewed: { hii: ['url1','url2'] }, // уникальные URL за всю историю — для +lastPhoto и cap
  //   triggered: { hii: 1714824000000 },   // когда первый раз триггернули
  //   dismissed: { hii: 1714824000000 },   // toast/модалку закрыли без сабмита
  //   submitted: { hii: 1714824000000 },   // отправили заявку
  // }

  // public for popup (через объект на window или CustomEvent payload):
  // window.InterestTracker = {
  //   markDismissed(id),
  //   markSubmitted(id),
  //   getSnapshot(id) -> { score, opens, photosViewed, activeSeconds }
  // }

  // event listeners:
  // document.addEventListener('gallery:open',  ...) — стартует таймер активного времени, +secondOpen/+nthOpen, проверка триггера
  // document.addEventListener('gallery:close', ...) — стопит таймер
  // document.addEventListener('gallery:photo', ...) — +photoView (если новое уникальное), +lastPhoto (если index === total-1), проверка триггера

  // активное время — setInterval(1000) пока модалка открыта,
  // tick добавляется в score только если visible && hasFocus && (Date.now() - lastActivity) < IDLE_AFTER_MS

  // триггер:
  // function maybeTrigger(id, name) {
  //   if (sessionStorage.getItem(SESSION_KEY)) return; // 1 показ на сессию
  //   if (state.submitted[id]) return;                  // уже отправлял
  //   if (state.dismissed[id] && Date.now() - state.dismissed[id] < 7*24*60*60*1000) return;
  //   if (state.scores[id] < CONFIG.TRIGGER_THRESHOLD) return;
  //   sessionStorage.setItem(SESSION_KEY, '1');
  //   document.dispatchEvent(new CustomEvent('interest:trigger', { detail: { id, name } }));
  // }
})();
```

### 2. `js/interest-popup.js`

```js
(function () {
  'use strict';

  const TOAST_ID = 'interestToast';
  const DIALOG_ID = 'interestDialog';
  let state = { id: null, name: '', form: { name: '', phone: '', location: '' }, submitted: false };

  // listens:
  document.addEventListener('interest:trigger', (e) => {
    state.id = e.detail.id;
    state.name = e.detail.name;
    showToast();
  });

  // showToast() — создаёт #interestToast снизу-справа (или внизу всей ширины на мобиле),
  //   slide-in 200мс, headline = `Понравилась ${name}?`, body = `...без обязательств.`,
  //   клик по плашке (кроме [×]) → expandToDialog()
  //   клик по [×] → InterestTracker.markDismissed(id), toast slide-out
  //   также закрываем toast при `gallery:close` без сабмита (но не помечаем dismissed —
  //   позволим попапу появиться снова на следующем открытии этой же модели в этой же сессии?
  //   нет — по решению "1 показ на сессию" sessionStorage уже стоит, второго раза не будет)

  // expandToDialog() — toast уезжает, появляется <dialog id="interestDialog">
  //   с формой по образцу consult.js (имя, тел, ниже — раскрывашка "Указать участок"),
  //   submit → console.log + InterestTracker.markSubmitted(id) + replace UI на "Спасибо"
  //   close (Esc/[×]/backdrop) → InterestTracker.markDismissed(id), GalleryModal остаётся открытой

  // переиспользуем formatPhoneMask/normalizePhone — копия из consult.js, ~15 строк
})();
```

### 3. `css/interest-popup.css`

- `.interest-toast` — `position:fixed; bottom:16px; right:16px; z-index:10000` (выше `GalleryModal`); padding 16px 20px; rounded 14px; box-shadow; голубой акцент `#0ea5e9`. На мобиле — `left:8px; right:8px; bottom:8px`.
- `.interest-toast--enter` / `.interest-toast--leave` — slide+fade 200мс.
- `.interest-dialog` — структурно как `consult-modal`: затемнённый backdrop, центрированная карточка, овальные инпуты. Цветовая палитра — копия `consult.css`.
- `.interest-dialog__location-toggle` — `<details>` или кастомный аккордеон для поля адреса.

### 4. Правки `js/gallery-modal.js`

Три вставки `document.dispatchEvent(...)` без изменения остальной логики:

- В `function open(item)` после `render()`:
  ```js
  document.dispatchEvent(new CustomEvent('gallery:open', {
    detail: { id: item.id || null, name: item.title || '' }
  }));
  ```
- В `function close()` перед обнулением `currentItem`:
  ```js
  document.dispatchEvent(new CustomEvent('gallery:close', {
    detail: { id: currentItem ? currentItem.id : null }
  }));
  ```
- В `function render()` после установки `currentIndex` (или в `go(delta)` после нового `currentIndex`):
  ```js
  document.dispatchEvent(new CustomEvent('gallery:photo', {
    detail: {
      id: currentItem.id || null,
      index: currentIndex,
      total: gallery.length,
      url: gallery[currentIndex] || null
    }
  }));
  ```

Гард `if (currentItem)` уже стоит в `render()`. Никакой ещё бизнес-логики не трогаем.

### 5. Правка `js/models.js`

При построении вызова `GalleryModal.open(...)` добавить поле `id`:

```js
GalleryModal.open({
  id: model.id,             // <-- новое
  title: model.name,
  infoLines: [...],
  gallery: model.gallery,
  triggerEl: btn
});
```

### 6. Правка `models.html`

В `<head>`: `<link rel="stylesheet" href="css/interest-popup.css?v=20260504">`.
Перед `</body>`, **после** `gallery-modal.js`: `<script src="js/interest-tracker.js?v=20260504" defer></script>` и `<script src="js/interest-popup.js?v=20260504" defer></script>`.

## Поток данных (типовой сценарий)

```
1. Юзер на models.html кликает "Подробнее" у HIIT
2. js/models.js → GalleryModal.open({ id:'hii', title:'HIIT', gallery:[...] })
3. gallery-modal.js → dispatch 'gallery:open' { id:'hii', name:'HIIT' }
4. interest-tracker:
   - state.opens.hii = 1 (первое открытие — без бонуса)
   - запускает activity timer (setInterval 1000)
   - listener'ы на mousemove/keydown/touchmove/scroll/click обновляют lastActivity
5. Юзер листает: prev/next
   gallery-modal.js → dispatch 'gallery:photo' { id:'hii', index:1, total:2, url:'...' }
   interest-tracker: новое уникальное фото → score += 1.5; maybeTrigger()
6. Юзер 30 секунд активно смотрит
   tracker tick: visible && focused && active → score += 0.2 каждую секунду
   на ~50-й секунде (комбо) score >= 10 → dispatch 'interest:trigger' { id:'hii', name:'HIIT' }
   sessionStorage 'gp_interest_shown_session' = '1'
7. interest-popup.js: показывает toast "Понравилась HIIT?"
8a. Юзер кликает toast → expandToDialog → форма
    submit → console.log({ source:'interest_popup', model_id:'hii', model_name:'HIIT',
                           name, phone, location, score, signals, triggeredAt })
    InterestTracker.markSubmitted('hii') → state.submitted.hii = Date.now()
    UI → "Спасибо! Менеджер свяжется в ближайшее время." [Закрыть]
8b. Юзер кликает [×] на toast → InterestTracker.markDismissed('hii')
    state.dismissed.hii = Date.now()
    Через 7 дней попап по этой модели снова возможен
9. Закрытие GalleryModal:
   gallery-modal.js → dispatch 'gallery:close'
   tracker: останавливает activity timer
   Если форма открыта и не сабмиченна — она остаётся видимой? Нет: при закрытии GalleryModal popup тоже закрывается и помечается dismissed.
   (см. Edge cases)
```

## Edge cases

| Сценарий | Поведение |
|---|---|
| Вкладка свёрнута/окно не в фокусе | Тики активного времени не идут. Когда вернётся фокус — продолжаем. |
| Юзер открывает 5 моделей подряд | Score копится по каждой отдельно. Но после первого триггера на любой модели сессионная блокировка не даёт показать второй раз в этой сессии. |
| GalleryModal закрылся пока score копился | Activity timer стопится. Score сохраняется в localStorage. При следующем открытии этой модели — продолжается (+ возможно бонус 2-го/3-го открытия). |
| Юзер закрыл `GalleryModal` пока был открыт toast или модалка | Toast/модалку закрываем тоже. Если форма не отправлена — `markDismissed`. |
| `localStorage` недоступен (приватный режим) | Tracker работает в памяти (in-process state). В рамках сессии всё работает корректно, между сессиями ничего не сохраняется. Без падений. |
| `GalleryModal` отсутствует на странице | События `gallery:*` никто не диспатчит. Tracker подключён, но score не растёт. Бесшумно. |
| Мобильный без `mousemove` | idle определяется по `touchmove`/`scroll`/`click`/`keydown`. Без них — idle, что корректно. |
| Очень большая галерея (20 фото) | Cap `photosPerOpen: 6` ограничивает. 4 уникальных фото = максимум 6 баллов от листания за одно открытие. |
| Несколько вкладок одновременно | Каждая вкладка свой in-memory state, общий localStorage. Race-условия некритичны (худший случай — лишний +1 балл). Не синхронизируем. |
| Юзер уже отправил заявку через `consult.js` | В этой задаче не учитывается (нет общего хранилища). Когда появится `/api/leads` — можно будет проверять по cookie/phone. Сейчас — нет. |
| Модель без `id` в `GalleryModal.open(...)` (например, на portfolio.html) | `gallery:*` диспатчится с `id: null`. Tracker фильтрует и игнорирует события без `id`. Не влияет на portfolio. |
| Длинное `name` модели в toast | CSS `text-overflow: ellipsis` после второй строки. |
| Score уже >= порога при первом `gallery:open` (вернулся в новой сессии и сразу открыл) | Триггер срабатывает — это намеренно, такой посетитель «горячий». |

## Тестирование

Без формальных юнит-тестов. Ручная проверка после билда — `npm run dev`, `http://localhost:3050/models.html`. Сценарии:

| # | Сценарий | Ожидание |
|---|---|---|
| 1 | Открыть HIIT, активно смотреть 50 сек, не листать | Через ~50 сек появляется toast «Понравилась HIIT?» |
| 2 | Открыть HIIT, пролистать 4+ фото за 10 сек | Toast появляется быстрее (за ~10 сек) |
| 3 | Открыть HIIT, закрыть; открыть снова; открыть в третий раз | На 3-м открытии toast почти сразу |
| 4 | Закрыть toast крестиком | В этой сессии больше не появляется ни на одной модели |
| 5 | Открыть новую вкладку (новая сессия) | На новой сессии триггер возможен, но не для HIIT (7 дней) |
| 6 | Заполнить форму, отправить | UI «Спасибо», в консоли — payload с правильными `model_id`, `score`, `signals` |
| 7 | Свернуть вкладку, ждать 2 минуты | Toast не появляется (таймер стоял) |
| 8 | На мобиле свайпать фото | Toast и модалка корректно адаптируются по ширине |
| 9 | Отключить localStorage в DevTools (DOMException на `setItem`) | Никаких ошибок в консоли, в рамках сессии работает |
| 10 | Открыть `portfolio.html`, листать галерею | Никаких toast, никаких ошибок (id отсутствует — игнор) |

## Что НЕ делаем

- Не делаем бэкенд `POST /api/leads` и таблицу `leads` в БД — отложено.
- Не делаем админку лидов — отложено.
- Не отправляем серверную аналитику событий (`viewed_card`, `dwell_seconds`) — пока только клиент.
- Не трогаем `consult.js` (отдельный flow модалки консультации).
- Не трогаем `catalog.html` (нет галереи фото).
- Не трогаем `quiz.js` / `quiz.css` / `floating-cta.js`.
- Не делаем A/B-тестирование вариантов попапа.
- Не делаем пуш-уведомления и retargeting.
- Не убираем дубль `formatPhoneMask`/`normalizePhone` — оставляем копию ради изоляции модулей (тот же подход, что между `consult.js` и `quiz.js`).

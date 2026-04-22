# Админка для секции «От рендера до реальности» — дизайн

**Дата:** 2026-04-22
**Связанный спек:** `2026-04-16-render-vs-reality-design.md` (сама секция на фронте)

## Цель

Перевести статическую секцию `#render-reality` на `index.html` под управление админ-панели: заголовок, подзаголовок и слайды (произвольное число) редактируются без правки кода и деплоя.

## Scope

**Редактируется из админки:**
- Заголовок секции (`title`).
- Подзаголовок (`subtitle`).
- Слайды: произвольное количество, каждый содержит пару картинок (render + real) и два текста — название слайда (`caption_title`) и подпись (`caption_meta`).

**Остаётся в коде (не редактируется):**
- Eyebrow «Визуализация · реализация».
- Кнопка «Смотреть все рендеры →» и её URL.
- Лейблы тогглa «Рендер» / «Реальность».
- Бэйджи «Рендер» / «Реальность» на фото.

## База данных

Новая миграция `db/migrations/0002_render_reality.sql` (идемпотентная) + симметричное обновление `db/init.sql`.

```sql
-- singleton: одна запись, title + subtitle
CREATE TABLE IF NOT EXISTS rr_section (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  subtitle   TEXT
);

-- слайды
CREATE TABLE IF NOT EXISTS rr_slides (
  id            SERIAL PRIMARY KEY,
  caption_title VARCHAR(200) NOT NULL,
  caption_meta  VARCHAR(300),
  render_image  VARCHAR(255) NOT NULL,
  real_image    VARCHAR(255) NOT NULL,
  sort_order    INT          DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW()
);
```

**Сид (и в миграции, и в init.sql)** — перенести текущие значения:

- `rr_section`: title `'ОТ РЕНДЕРА\nДО РЕАЛЬНОСТИ'` (символ `\n` → на фронте делится на bold/thin строки), subtitle `'Каждый проект сначала живёт в 3D. Сравните, что обещали — и что построили.'`.
- `rr_slides`: 3 строки с существующими путями `images/render-vs-reality/pair{1,2,3}-{render,real}.jpg` и подписями из `index.html:199-226`.

Сид выполнять **только при fresh install** — в миграции через `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM rr_section)` (и аналогично для слайдов), чтобы повторное применение не дублировало.

**Важно:** миграция не удаляет и не трогает файлы `images/render-vs-reality/*.jpg` — они остаются по старым путям и используются сидом. Новые аплоады идут в `uploads/rr/` (см. ниже).

## API

Новый эндпоинт в `routes/api.js`, по паттерну `/api/showroom`:

```
GET /api/render-reality
→ {
    title: string,
    subtitle: string | null,
    slides: [
      { title: string, meta: string | null, render: string, real: string }
    ]
  }
```

- Слайды сортируются `ORDER BY sort_order, id`.
- Пути к картинкам возвращаются с ведущим `/` (`/uploads/rr/xxx.jpg` или `/images/render-vs-reality/pair1-render.jpg` для сид-данных).
- Если `rr_section` пустая — вернуть `null` (фронт в этом случае оставит секцию скрытой).

## Админка

### Навигация

В `views/layout.ejs` добавить ссылку в сайдбар между «Площадка» и разделителем:
```
<a href="/admin/render-reality" class="... 'active' : ''">Рендер↔Реальность</a>
```

### Роуты в `routes/admin.js`

Секция «Render vs Reality» добавляется после блока `Showroom`. Эндпоинты по паттерну showroom + слайды по паттерну showroom_images:

- `GET  /admin/render-reality` — отрисовка формы + списка слайдов.
- `POST /admin/render-reality` — upsert singleton (`rr_section`): если запись есть — UPDATE, иначе — INSERT.
- `POST /admin/render-reality/slides` — создать слайд. Форма отправляет `multipart/form-data` с двумя файлами (`render_image`, `real_image`) + текстовые поля. `processUpload('rr').fields([{name:'render_image',maxCount:1},{name:'real_image',maxCount:1}])`. Записываем пути `uploads/rr/<filename>`. `sort_order` — следующий `MAX(sort_order)+1`.
- `POST /admin/render-reality/slides/:id` — обновить текст/`sort_order`/картинки. Для картинок: если файл приложен — удаляем старый через `deleteFile()` и заменяем; если нет — не трогаем.
- `POST /admin/render-reality/slides/:id/delete` — удалить слайд + оба файла через `deleteFile()`.

Все POST-хендлеры ставят `req.session.success` / `req.session.error` и редиректят на `/admin/render-reality`.

### View `views/render-reality/form.ejs`

Структура (по паттерну `showroom/form.ejs`, без выделения отдельного партиала на этом этапе):

1. **H1** «От рендера до реальности».
2. **Форма секции** (title + subtitle) → `POST /admin/render-reality`. Подсказка под title: «Перенос строки (Enter) делит заголовок на bold/thin на фронте».
3. **Hr-разделитель.**
4. **H2** «Слайды».
5. **Список существующих слайдов** — каждый в своей карточке-форме (`<form method="POST" action="/admin/render-reality/slides/<id>" enctype="multipart/form-data">`):
   - Поле caption_title, поле caption_meta, поле sort_order.
   - Два `<input type="file">` с превью текущих картинок рядом (маленькие thumbnails 120×90 слева от input’ов, используем существующий класс `.img-grid`/`.img-item`).
   - Кнопки «Сохранить» и «Удалить» (последняя — отдельная форма `POST .../delete` с `onsubmit="return confirm(...)"`).
6. **Форма «Добавить слайд»** — те же поля, но оба file-input’а обязательные (`required`), action = `POST /admin/render-reality/slides`.

### Upload

`middleware/upload.js` — проверить, что `processUpload('rr')` создаёт папку `uploads/rr/` (текущая реализация уже делает `mkdir -p` для любой подпапки — проверить при реализации; если нет, поправить там же).

## Фронтенд

### `index.html`

Оставляем skeleton секции (`.rr`, `.rr-inner`, `.rr-head` с eyebrow/кнопкой, `.rr-toggle`, `.rr-stage`, стрелки, `.rr-dots`). Убираем:

- Текст внутри `<h2 class="rr-title">` (оставляем пустой, с комментарием `<!-- рендерится из js -->`).
- `<p class="rr-sub">` (оставляем пустым).
- Три хардкод-слайда внутри `.rr-track` — заменяем на пустой `<div class="rr-track"></div>`.

Eyebrow, кнопка «Смотреть все рендеры», toggle-кнопки и стрелки остаются в HTML как есть.

### `js/render-vs-reality.js`

Рефакторинг: оборачиваем всю существующую инициализацию в `async init()`, который сначала делает `fetch('/api/render-reality')`, потом рендерит слайды, потом навешивает слушатели.

```
async function init() {
  const data = await fetch('/api/render-reality').then(r => r.json()).catch(() => null);
  if (!data || !data.slides.length) { section.hidden = true; return; }

  // 1. Рендерим заголовок: делим data.title по \n; первая строка — .bold, вторая — .thin.
  //    Если нет \n — всё в .bold.
  // 2. Подзаголовок в .rr-sub.
  // 3. Слайды: собираем разметку (.rr-slide .rr-frame img.rr-img-render/real .rr-badge* + .rr-caption)
  //    и вставляем в .rr-track.
  // 4. После этого NodeList `slides` пересобирается и дальше идёт текущая логика
  //    (setMode, goTo, tabs listeners, swipe, dots, keydown) — без изменений.
}
```

Один модуль, одна ответственность: fetch → render → carousel init. Если API вернул `null` или `slides.length === 0` — секция скрывается (`section.hidden = true`), JS выходит.

Cache-bust в `index.html` для `render-vs-reality.js` и `style.css` (если CSS не трогается — его не бампаем) обновить через query-параметр, как в остальном проекте.

## Файлы (итого)

**Новые:**
- `db/migrations/0002_render_reality.sql`
- `views/render-reality/form.ejs`

**Изменения:**
- `db/init.sql` — добавить `CREATE TABLE rr_section`, `rr_slides` + сид.
- `routes/admin.js` — блок Render vs Reality (singleton + CRUD слайдов).
- `routes/api.js` — `GET /api/render-reality`.
- `views/layout.ejs` — ссылка в сайдбар.
- `index.html` — убрать хардкод (заголовок, подзаголовок, 3 слайда), оставить скелет.
- `js/render-vs-reality.js` — fetch → render → init carousel.
- `middleware/upload.js` — проверить поддержку подпапки `rr` (только если понадобится).

## Нефункциональные требования

- Миграция идемпотентна (можно прогонять повторно).
- `init.sql` + миграции сходятся для fresh install (добавить проверку вручную после реализации).
- Существующие пути `images/render-vs-reality/*.jpg` не ломаются — сид сохраняет старые URL как валидный стартовый контент.
- До деплоя секция не должна ломаться при любом состоянии БД: если `rr_section` пуста — секция скрыта, но страница живёт.

## Вне скоупа

- Drag-n-drop переупорядочивание (используем `sort_order`-число, как в остальной админке).
- Превью секции из админки.
- Eyebrow / кнопка / лейблы тогглa / бэйджи — остаются в HTML.
- Удаление cover-флага для слайдов — его здесь нет, обе картинки равноправны.

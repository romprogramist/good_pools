# Страница заявок в админке — дизайн

**Дата:** 2026-05-13
**Статус:** утверждено пользователем, готово к плану имплементации.

## Контекст

Сайт уже принимает заявки через `POST /api/leads` (5 форм) и пишет их в таблицу `leads` (миграции `0003_leads.sql` + `0004_leads_source_label_and_page.sql`). Каждое создание также шлёт email через `lib/mailer.js`.

Чего нет: страницы в личном кабинете администратора, где эти заявки видно списком с фильтрами. Этот спек закрывает этот пробел.

ЛК (`/admin/*`) уже есть: сессии + `bcrypt` по `admin_users`, EJS-шаблоны в `views/`, маршруты в `routes/admin.js`, единый layout с тёмной темой и таблицами `.admin-table`. Делаем заявки в том же стиле, без новых зависимостей и без клиентского JS.

## Архитектура

Server-rendered EJS, как остальная админка. Маршруты добавляем в существующий `routes/admin.js` (блок `// ---------- Leads ----------` после Portfolio/Showroom). Фильтры — query-параметры формы `method="GET"`, чтобы URL можно было шарить и боукмаркать.

Альтернатива (SPA с fetch+JSON) отброшена: ломает консистентность с остальной админкой и тащит новый слой ради одной таблицы.

## Схема БД

Новая миграция `db/migrations/0005_leads_status.sql`, идемпотентная по правилу проекта:

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);
```

Значения `status`: `'new'` | `'processed'`.

Параллельно правится `db/init.sql` — поля добавляются в `CREATE TABLE leads`, чтобы fresh-install сходился с миграциями (требование `CLAUDE.md`).

Семантика `processed_at`:
- При переходе `new → processed` пишется `NOW()`.
- При обратном `processed → new` обнуляется в `NULL`.

## Маршруты

Все под существующим `requireAuth` (после `router.use(requireAuth)` в `routes/admin.js`).

| Метод | Путь | Назначение |
|---|---|---|
| `GET` | `/admin/leads` | Список с фильтрами и пагинацией |
| `GET` | `/admin/leads/export.csv` | CSV-экспорт по текущему фильтру |
| `GET` | `/admin/leads/:id` | Детальная страница одной заявки |
| `POST` | `/admin/leads/:id/status` | Тоггл `new` ↔ `processed`, редирект на детали |
| `POST` | `/admin/leads/:id/delete` | Жёсткое удаление, редирект на список |

Маршрут `export.csv` должен быть **до** `:id`, чтобы Express не съел `export.csv` как `id`.

## UI списка `/admin/leads`

**Панель фильтров** (форма `GET /admin/leads`):
- `source` — `<select>`, опции из `SELECT DISTINCT source, COALESCE(source_label, source) AS label FROM leads ORDER BY label`. Первая опция «Все источники».
- `status` — `<select>` с тремя значениями: `все` (по умолчанию), `новые`, `обработанные`.
- `from`, `to` — `<input type="date">`, оба опциональны.
- `q` — `<input type="text">`, ищет `ILIKE` по `name` и `phone` одним полем.
- Кнопка «Применить», ссылка «Сбросить» (на `/admin/leads` без query).

Сортировка фиксированная: `ORDER BY created_at DESC, id DESC`.

**Пагинация:** простая offset/limit, 50 на страницу. Кнопки `← Назад` / `Вперёд →` под таблицей, текущая страница из `?page=` (дефолт 1).

**Колонки таблицы** (используется существующий класс `.admin-table`):

| Дата | Источник | Имя | Телефон | Email | Статус |

- Дата: `created_at` в формате `DD.MM.YYYY HH:mm`.
- Источник: `source_label` или `source` если label пустой.
- Статус: цветной бейдж — `новая` (синий) / `обработана` (зелёный).
- Вся строка кликабельна и ведёт на `/admin/leads/:id`.

**Над таблицей:** ссылка «Экспорт CSV» — `href="/admin/leads/export.csv?<те же query params>"`.

**Пустое состояние:** «Заявок пока нет» вместо пустой разметки.

## UI детальной `/admin/leads/:id`

Все поля заявки в виде «label : value»: `id`, `created_at`, `status`, `processed_at`, `source` + `source_label`, `page_path`, `name`, `phone`, `email`, `consent_given`, `consent_marketing`, `consent_ip`, `consent_at`, `policy_version`. Внизу `<pre>` с `payload` (отформатированный JSON).

Две формы:
- `POST /admin/leads/:id/status` с кнопкой «Отметить обработанной» (для `new`) или «Вернуть в новые» (для `processed`).
- `POST /admin/leads/:id/delete` с кнопкой «Удалить» (класс `.btn-danger`) и `onclick="return confirm('Удалить заявку?')"`.

## CSV-экспорт

`GET /admin/leads/export.csv` принимает те же query-параметры что и список (без `page`/`limit`), выгружает весь отфильтрованный результат с лимитом 50000.

**Заголовки:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="leads-YYYY-MM-DD.csv"
```

Тело префиксуется `﻿` (UTF-8 BOM) для корректного открытия в Excel.

**Столбцы CSV** в фиксированном порядке:
```
id, created_at, source, source_label, page_path, name, phone, email,
status, processed_at, consent_given, consent_marketing, policy_version,
consent_ip, payload
```

- `created_at`, `processed_at` — ISO-8601 в UTC.
- `payload` — `JSON.stringify(payload)` одной строкой.
- Экранирование по RFC 4180: значения с `,`, `"`, `\n`, `\r` оборачиваются в `"…"`, внутренние `"` удваиваются.
- **Защита от CSV-инъекции:** значения, начинающиеся с `=`, `+`, `-`, `@`, префиксуются апострофом `'` перед экранированием.

Реализация без библиотек — инлайн-хелпер `csvEscape(v)` в `routes/admin.js`, стрим через `res.write` построчно.

## Сайдбар

В `views/layout.ejs` после ссылки на `/admin/render-reality` добавляется:
```html
<a href="/admin/leads" class="<%= typeof active !== 'undefined' && active === 'leads' ? 'active' : '' %>">Заявки</a>
```

## Новые и изменяемые файлы

**Новые:**
- `db/migrations/0005_leads_status.sql`
- `views/leads/index.ejs`
- `views/leads/show.ejs`

**Изменяемые:**
- `db/init.sql` — добавить `status` и `processed_at` в `CREATE TABLE leads`.
- `routes/admin.js` — добавить блок `// ---------- Leads ----------` с пятью обработчиками + хелпер `csvEscape`.
- `views/layout.ejs` — пункт сайдбара «Заявки».

## Деплой

Проверить, что `views/`, `routes/`, `db/`, `middleware/`, `lib/` уже в rsync-whitelist в `.github/workflows/deploy.yml` (по памяти — да). Никаких новых top-level папок не вводится, значит deploy.yml править не нужно.

Миграция применится автоматически через `node db/migrate.js` на шаге деплоя.

## Безопасность

- **SQL-инъекция:** все запросы параметризованы (`$1, $2, ...`); фильтр `q` — `name ILIKE $N OR phone ILIKE $N` с `'%'||$N||'%'`.
- **XSS:** EJS экранирует через `<%= %>` по умолчанию; `payload` рендерится как `<%= JSON.stringify(payload, null, 2) %>` внутри `<pre>`.
- **Авторизация:** все маршруты под `requireAuth`, как остальная админка.
- **CSV-инъекция:** см. раздел CSV.

## Валидация query-параметров

- `page` — `Math.max(1, parseInt(req.query.page) || 1)`.
- `from`, `to` — `new Date(...)`; если `isNaN`, игнорируем фильтр.
- `status` — whitelist `['new', 'processed']`, иначе игнорируем.
- `source` — пропускаем как есть в параметризованный запрос, ничего страшного если значение неизвестное (просто пустой результат).

Невалидные параметры не должны приводить к 500.

## Тестирование

В проекте нет тестового фреймворка — verification ручной.

**Smoke-чеклист после имплементации:**
1. `node db/migrate.js` применяет 0005 без ошибок.
2. `/admin/leads` рендерится, пункт «Заявки» в сайдбаре подсвечен.
3. Сабмит формы на сайте → запись появляется в таблице со статусом «новая».
4. Клик по строке открывает детали со всеми полями и payload.
5. «Отметить обработанной» → статус меняется, `processed_at` заполняется.
6. «Вернуть в новые» → `processed_at` обнуляется.
7. Каждый фильтр (source, status, from/to, q) сужает выдачу; query-string шарится.
8. «Экспорт CSV» открывается в Excel без иероглифов, payload в одной ячейке.
9. «Удалить» убирает запись, редирект на список.

## Вне scope

- Массовые действия (bulk delete/mark).
- Редактирование полей заявки (только статус).
- Email-нотификации при смене статуса (письмо при создании уже шлёт `/api/leads`).
- Расширение статусов сверх `new`/`processed` (можно добавить позже миграцией).
- Бейдж со счётчиком новых в сайдбаре.

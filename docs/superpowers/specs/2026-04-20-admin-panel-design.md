# Admin Panel + PostgreSQL Backend — Design Spec

**Date:** 2026-04-20
**Project:** Хорошие Бассейны (good_pools)
**Stack:** Node.js + Express + EJS + PostgreSQL
**Deadline:** 2026-04-21 (показ заказчику)

---

## 1. Overview

Добавить серверную часть к статическому сайту "Хорошие Бассейны":
- PostgreSQL база данных для хранения категорий, моделей бассейнов и портфолио
- REST API для фронтенда (заменяет JSON-заглушки)
- Админ-панель с авторизацией для управления контентом (CRUD)
- Загрузка и хранение фото

Текущий фронтенд (HTML/CSS/JS) остаётся без изменений, кроме трёх JS-файлов, которые переключаются с JSON-файлов на API.

## 2. Architecture

```
Browser (сайт)  ──→  GET /api/*       ──→  Express (port 3050)  ──→  PostgreSQL (good_pools_db)
Browser (админ) ──→  GET/POST /admin/* ──→  Express (EJS views)  ──→  PostgreSQL
                                            ↕
                                       /uploads/ (фото на диске)
```

Один Express-сервер обслуживает:
- Статику сайта из `public/`
- REST API (`/api/categories`, `/api/models`, `/api/portfolio`)
- Админ-панель (`/admin/*`) — EJS-шаблоны, защищённые сессионной авторизацией
- Загруженные фото из `uploads/`

Доступ: `http://95.163.236.186:3050` (прямой по IP, без nginx).

## 3. Database Schema

### categories
| Column     | Type         | Constraints              | Description                    |
|------------|--------------|--------------------------|--------------------------------|
| id         | SERIAL       | PRIMARY KEY              |                                |
| key        | VARCHAR(50)  | UNIQUE NOT NULL          | "composite", "custom" и т.д.  |
| label      | VARCHAR(100) | NOT NULL                 | "Композитные", "Кастом"       |
| image      | VARCHAR(255) |                          | Путь к SVG/PNG иконке          |
| sort_order | INT          | DEFAULT 0                | Порядок в слайдере             |
| created_at | TIMESTAMP    | DEFAULT NOW()            |                                |

### models
| Column      | Type          | Constraints                        | Description                         |
|-------------|---------------|------------------------------------|-------------------------------------|
| id          | SERIAL        | PRIMARY KEY                        |                                     |
| slug        | VARCHAR(100)  | UNIQUE NOT NULL                    | "hiit", "zen" — используется в URL и data-id на фронте |
| category_id | INT           | REFERENCES categories(id) NOT NULL | FK на категорию                     |
| name        | VARCHAR(100)  | NOT NULL                           | "HIIT", "ZEN"                       |
| series      | VARCHAR(100)  |                                    | "Спортивная серия"                  |
| description | TEXT          |                                    | Описание модели                     |
| length_m    | DECIMAL(4,1)  |                                    | Длина в метрах (NULL если нестанд.) |
| width_m     | DECIMAL(4,1)  |                                    | Ширина                              |
| depth_m     | DECIMAL(4,1)  |                                    | Глубина                             |
| specs_label | VARCHAR(100)  |                                    | "Ø 1.9 м · 85 см" (нестандартные)  |
| price       | VARCHAR(100)  |                                    | "от 1 250 000 ₽", "По проекту"    |
| badge       | VARCHAR(50)   |                                    | "Хит продаж", NULL если нет        |
| sort_order  | INT           | DEFAULT 0                          |                                     |
| created_at  | TIMESTAMP     | DEFAULT NOW()                      |                                     |

### model_images
| Column     | Type         | Constraints                              | Description          |
|------------|--------------|------------------------------------------|----------------------|
| id         | SERIAL       | PRIMARY KEY                              |                      |
| model_id   | INT          | REFERENCES models(id) ON DELETE CASCADE  | FK на модель         |
| image_path | VARCHAR(255) | NOT NULL                                 | "/uploads/models/…" |
| sort_order | INT          | DEFAULT 0                                |                      |
| is_cover   | BOOLEAN      | DEFAULT FALSE                            | Главное фото         |

### portfolio
| Column      | Type         | Constraints                        | Description              |
|-------------|--------------|------------------------------------|--------------------------|
| id          | SERIAL       | PRIMARY KEY                        |                          |
| category_id | INT          | REFERENCES categories(id) NOT NULL | FK на категорию          |
| title       | VARCHAR(200) | NOT NULL                           | "Вилла в Подмосковье"   |
| location    | VARCHAR(200) |                                    | "Московская область"    |
| size        | VARCHAR(100) |                                    | "8.0 × 4.0 м"           |
| year        | INT          |                                    | 2024                     |
| sort_order  | INT          | DEFAULT 0                          |                          |
| created_at  | TIMESTAMP    | DEFAULT NOW()                      |                          |

### portfolio_images
| Column       | Type         | Constraints                                 | Description            |
|--------------|--------------|---------------------------------------------|------------------------|
| id           | SERIAL       | PRIMARY KEY                                 |                        |
| portfolio_id | INT          | REFERENCES portfolio(id) ON DELETE CASCADE  | FK на работу           |
| image_path   | VARCHAR(255) | NOT NULL                                    | "/uploads/portfolio/…" |
| sort_order   | INT          | DEFAULT 0                                   |                        |
| is_cover     | BOOLEAN      | DEFAULT FALSE                               | Главное фото           |

### admin_users
| Column        | Type         | Constraints     | Description    |
|---------------|--------------|-----------------|----------------|
| id            | SERIAL       | PRIMARY KEY     |                |
| username      | VARCHAR(50)  | UNIQUE NOT NULL |                |
| password_hash | VARCHAR(255) | NOT NULL        | bcrypt hash    |
| created_at    | TIMESTAMP    | DEFAULT NOW()   |                |

## 4. REST API (Public)

Формат ответа идентичен текущим JSON-заглушкам — фронтенд не требует изменений в рендер-логике.

### GET /api/categories
Возвращает массив категорий, отсортированный по `sort_order`:
```json
[
  { "key": "composite", "label": "Композитные", "image": "/uploads/categories/composite-pool.svg" }
]
```

### GET /api/models
Возвращает массив моделей с полем `gallery` (массив URL фото), отсортированный по `sort_order`.
Поле `specs` формируется на бэкенде: если `length_m/width_m/depth_m` заполнены → `"8.0 · 3.6 · 1.6 м"`, иначе → `specs_label`.
Поле `category` — это `categories.key` (JOIN по `category_id`).
```json
[
  { "id": "hiit", "name": "HIIT", "category": "composite", "series": "Спортивная серия",
    "desc": "...", "specs": "8.0 · 3.6 · 1.6 м", "price": "от 1 250 000 ₽",
    "badge": "Хит продаж", "gallery": ["/uploads/models/hiit-01.jpg"] }
]
Поле `id` в JSON — это `models.slug` из БД (строка, не число), для совместимости с `data-id` на фронтенде.

### GET /api/portfolio
Возвращает массив работ с `gallery` и `image` (cover-фото), отсортированный по `sort_order`:
```json
[
  { "id": 1, "title": "Вилла в Подмосковье", "location": "Московская область",
    "category": "composite", "size": "8.0 × 4.0 м", "year": 2024,
    "image": "/uploads/portfolio/work-01.jpg",
    "gallery": ["/uploads/portfolio/work-01.jpg", "/uploads/portfolio/work-02.jpg"] }
]
```

## 5. Admin Panel

### Auth
- `GET /admin/login` — форма входа (username + password)
- `POST /admin/login` — проверка bcrypt, создание сессии
- `GET /admin/logout` — уничтожение сессии, редирект на логин
- Middleware `requireAuth` — все `/admin/*` (кроме login) редиректят на логин если нет сессии
- Сессии хранятся в PostgreSQL через `connect-pg-simple`

### Dashboard
`GET /admin` — сводка: количество категорий, моделей, работ. Ссылки на разделы.

### Categories CRUD
- `GET /admin/categories` — таблица (label, key, иконка, sort_order) + кнопка "Добавить"
- `GET /admin/categories/new` — форма создания
- `POST /admin/categories` — сохранение новой категории
- `GET /admin/categories/:id/edit` — форма редактирования
- `POST /admin/categories/:id` — обновление
- `POST /admin/categories/:id/delete` — удаление (с проверкой на привязанные модели/портфолио)

### Models CRUD
- `GET /admin/models` — таблица с фильтром по категории + кнопка "Добавить"
- `GET /admin/models/new` — форма: категория (dropdown), name, series, description, длина/ширина/глубина или specs_label, price, badge
- `POST /admin/models` — сохранение
- `GET /admin/models/:id/edit` — форма редактирования + управление фото
- `POST /admin/models/:id` — обновление
- `POST /admin/models/:id/delete` — удаление (каскадно удалит фото из БД и с диска)
- `POST /admin/models/:id/images` — загрузка фото (multer, до 5 МБ, jpg/png/webp/svg)
- `POST /admin/models/:id/images/:imgId/delete` — удаление фото

### Portfolio CRUD
- Аналогично Models: таблица, создание, редактирование, удаление, управление фото
- Поля: категория, title, location, size, year

## 6. Frontend Changes

Три файла меняются:

### data-source.js
- `CATEGORIES_URL` → `/api/categories`
- `MODELS_URL` → `/api/models`
- Добавить `getPortfolio()` — загрузка из `/api/portfolio`

### portfolio.js
- Убрать хардкод `WORKS` и `WORK_CATEGORIES`
- Загружать данные через `DataSource.getCategories()` и `DataSource.getPortfolio()`
- Рендер-функции (`cardHtml`, `renderPortfolioGrid` и т.д.) остаются без изменений

### models.js
- Убрать `stubGallery()` — фото приходят в поле `gallery` из API
- Остальной код без изменений

### Не трогаем
`index.html`, `models.html`, `portfolio.html`, `catalog.html`, `style.css`, `gallery-modal.js`, `main.js`, `search.js`, `service.js`, `render-vs-reality.js`, `slider-data.js`

## 7. File Upload & Storage

- Библиотека: `multer` (загрузка) + `sharp` (сжатие/ресайз)
- Допустимые типы: jpg, png, webp, svg
- Лимит: 5 МБ на файл
- Сжатие: jpg/png/webp → ресайз до max 1920px по длинной стороне, качество 80%
- SVG — без обработки
- Хранение: `/var/www/good-pools/uploads/{categories,models,portfolio}/`
- При удалении записи из БД — файл удаляется с диска

## 8. Deploy

- Папка: `/var/www/good-pools/`
- PM2: `pm2 start server.js --name good-pools`
- Порт: 3050
- Доступ: `http://95.163.236.186:3050`
- Без nginx-прокси (прямой доступ по IP:port)
- БД: `good_pools_db` в локальном PostgreSQL
- Начальный админ: создаётся CLI-скриптом `node create-admin.js admin <password>`

## 9. Dependencies

```json
{
  "express": "^4",
  "pg": "^8",
  "ejs": "^3",
  "express-session": "^1",
  "connect-pg-simple": "^9",
  "bcryptjs": "^2",
  "multer": "^1",
  "sharp": "^0.33",
  "dotenv": "^16"
}
```

## 10. Project Structure

```
/var/www/good-pools/
├── server.js                 -- точка входа Express
├── package.json
├── .env                      -- DB credentials, SESSION_SECRET, PORT
├── create-admin.js           -- CLI: создание админ-пользователя
├── db/
│   └── init.sql              -- CREATE TABLE + начальные данные
├── routes/
│   ├── api.js                -- GET /api/categories, /api/models, /api/portfolio
│   └── admin.js              -- CRUD-роуты админки
├── middleware/
│   └── auth.js               -- requireAuth middleware
├── views/
│   ├── layout.ejs            -- общий layout (sidebar, header)
│   ├── login.ejs
│   ├── dashboard.ejs
│   ├── categories/
│   │   ├── index.ejs
│   │   └── form.ejs
│   ├── models/
│   │   ├── index.ejs
│   │   └── form.ejs
│   └── portfolio/
│       ├── index.ejs
│       └── form.ejs
├── public/                   -- текущий фронтенд сайта
│   ├── index.html
│   ├── models.html
│   ├── portfolio.html
│   ├── css/
│   ├── js/
│   ├── images/
│   └── data/                 -- остаётся как fallback, но не используется
└── uploads/
    ├── categories/
    ├── models/
    └── portfolio/
```

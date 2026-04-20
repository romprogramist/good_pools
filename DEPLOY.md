# Инструкция по деплою — Хорошие Бассейны

## Сервер

- **IP:** 95.163.236.186
- **User:** roman
- **OS:** Ubuntu 20.04
- **Путь проекта:** `/var/www/good-pools/`
- **Порт:** 3050
- **URL:** http://95.163.236.186:3050
- **Админка:** http://95.163.236.186:3050/admin

## Стек на сервере

| Компонент | Версия |
|-----------|--------|
| Node.js | 20.20 |
| PostgreSQL | 12.22 |
| PM2 | установлен |
| Nginx | 1.18 (не используется для этого проекта) |

## Структура на сервере

```
/var/www/good-pools/
├── server.js              # Express-приложение
├── package.json
├── .env                   # DB_URL, SESSION_SECRET, PORT
├── create-admin.js        # CLI: создание админ-пользователя
├── db/
│   ├── pool.js            # PG-подключение
│   └── init.sql           # Схема + seed-данные
├── routes/
│   ├── api.js             # Публичный REST API
│   └── admin.js           # CRUD-роуты админки
├── middleware/
│   ├── auth.js            # Проверка сессии
│   └── upload.js          # Multer + Sharp
├── views/                 # EJS-шаблоны админки
├── public/                # Фронтенд (HTML/CSS/JS/images)
│   ├── index.html
│   ├── models.html
│   ├── portfolio.html
│   ├── css/
│   ├── js/
│   └── images/
└── uploads/               # Загруженные фото
    ├── categories/
    ├── models/
    ├── portfolio/
    └── showroom/
```

## Первый деплой (с нуля)

### 1. Создать базу данных

```bash
ssh roman@95.163.236.186
sudo -u postgres createdb good_pools_db
```

### 2. Скопировать файлы на сервер

С локальной машины:

```bash
# Запаковать проект
tar czf /tmp/good-pools.tar.gz \
  --exclude='node_modules' --exclude='.git' --exclude='.env' \
  --exclude='uploads' --exclude='.netlify' --exclude='.vercel' .

# Скопировать на сервер
scp /tmp/good-pools.tar.gz roman@95.163.236.186:/tmp/

# На сервере: распаковать
ssh roman@95.163.236.186
sudo mkdir -p /var/www/good-pools
sudo chown roman:roman /var/www/good-pools
cd /var/www/good-pools
tar xzf /tmp/good-pools.tar.gz
rm /tmp/good-pools.tar.gz
```

### 3. Организовать структуру

```bash
cd /var/www/good-pools

# Переместить фронтенд в public/
mkdir -p public
for item in index.html models.html portfolio.html catalog.html css js images data slider-data.js; do
  [ -e "$item" ] && mv "$item" public/
done

# Создать директории для загрузок
mkdir -p uploads/categories uploads/models uploads/portfolio uploads/showroom
```

### 4. Создать .env

```bash
cat > /var/www/good-pools/.env << 'EOF'
DATABASE_URL=postgres://postgres:Test1234@localhost:5432/good_pools_db
SESSION_SECRET=СГЕНЕРИРОВАТЬ_СЛУЧАЙНУЮ_СТРОКУ
PORT=3050
EOF
```

Сгенерировать секрет: `openssl rand -hex 32`

### 5. Установить зависимости

```bash
cd /var/www/good-pools
npm install --production
```

### 6. Инициализировать БД

```bash
psql good_pools_db < db/init.sql
```

### 7. Создать админ-пользователя

```bash
node create-admin.js admin ПАРОЛЬ_АДМИНА
```

### 8. Открыть порт в файрволе

```bash
sudo ufw allow 3050/tcp
```

### 9. Запустить через PM2

```bash
pm2 start server.js --name good-pools
pm2 save
```

### 10. Проверить

- Сайт: http://95.163.236.186:3050
- API: http://95.163.236.186:3050/api/categories
- Админка: http://95.163.236.186:3050/admin

---

## Обновление (повторный деплой)

### Быстрый способ — через SCP

```bash
# С локальной машины — копируем изменённые файлы
# Бэкенд:
scp server.js roman@95.163.236.186:/var/www/good-pools/
scp routes/*.js roman@95.163.236.186:/var/www/good-pools/routes/
scp middleware/*.js roman@95.163.236.186:/var/www/good-pools/middleware/

# Фронтенд:
scp index.html roman@95.163.236.186:/var/www/good-pools/public/
scp js/*.js roman@95.163.236.186:/var/www/good-pools/public/js/
scp css/style.css roman@95.163.236.186:/var/www/good-pools/public/css/

# Шаблоны админки:
scp -r views/ roman@95.163.236.186:/var/www/good-pools/

# Перезапустить
ssh roman@95.163.236.186 "pm2 restart good-pools"
```

### Полный способ — через tar

```bash
# Локально
tar czf /tmp/good-pools.tar.gz \
  --exclude='node_modules' --exclude='.git' --exclude='.env' \
  --exclude='uploads' --exclude='.netlify' --exclude='.vercel' .

scp /tmp/good-pools.tar.gz roman@95.163.236.186:/tmp/

# На сервере
ssh roman@95.163.236.186
cd /var/www/good-pools

# Сохранить .env и uploads
cp .env /tmp/.env.bak

# Распаковать (перезаписать файлы)
tar xzf /tmp/good-pools.tar.gz

# Переместить фронтенд
mkdir -p public
for item in index.html models.html portfolio.html catalog.html css js images data slider-data.js; do
  [ -e "$item" ] && mv "$item" public/
done

# Вернуть .env
cp /tmp/.env.bak .env

# Обновить зависимости если нужно
npm install --production

# Перезапустить
pm2 restart good-pools
```

---

## Управление

### PM2

```bash
pm2 status                    # Статус всех процессов
pm2 logs good-pools           # Логи в реальном времени
pm2 logs good-pools --lines 50  # Последние 50 строк
pm2 restart good-pools        # Перезапуск
pm2 stop good-pools           # Остановить
pm2 delete good-pools         # Удалить из PM2
pm2 save                      # Сохранить список процессов
```

### База данных

```bash
# Подключиться к БД
psql good_pools_db

# Посмотреть таблицы
\dt

# Сбросить и пересоздать данные
psql good_pools_db < db/init.sql

# Создать/обновить админа
cd /var/www/good-pools && node create-admin.js admin НОВЫЙ_ПАРОЛЬ
```

### Бэкап

```bash
# Бэкап БД
pg_dump good_pools_db > /tmp/good_pools_backup_$(date +%Y%m%d).sql

# Бэкап загруженных фото
tar czf /tmp/uploads_backup_$(date +%Y%m%d).tar.gz -C /var/www/good-pools uploads/

# Восстановление БД
psql good_pools_db < /tmp/good_pools_backup_20260420.sql
```

---

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /api/categories | Список категорий |
| GET | /api/models | Список моделей с фото |
| GET | /api/portfolio | Список работ портфолио |
| GET | /api/showroom | Данные выставочной площадки |

---

## Переменные окружения (.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| DATABASE_URL | Строка подключения к PostgreSQL | postgres://postgres:Test1234@localhost:5432/good_pools_db |
| SESSION_SECRET | Секрет для сессий (hex, 32+ символов) | a7b0bc8b5cd804... |
| PORT | Порт сервера | 3050 |

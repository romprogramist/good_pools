# Быстрый деплой — команды для Claude

## Сервер

- **SSH:** `sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186`
- **SCP:** `sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no`
- **Проект на сервере:** `/var/www/good-pools/`
- **PM2 имя:** `good-pools`

## Деплой изменённых файлов

### Бэкенд (routes, middleware, server.js)

```bash
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no routes/api.js roman@95.163.236.186:/var/www/good-pools/routes/api.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no routes/admin.js roman@95.163.236.186:/var/www/good-pools/routes/admin.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no middleware/upload.js roman@95.163.236.186:/var/www/good-pools/middleware/upload.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no server.js roman@95.163.236.186:/var/www/good-pools/server.js
```

### Фронтенд (HTML/JS/CSS → public/ на сервере)

```bash
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no index.html roman@95.163.236.186:/var/www/good-pools/public/index.html
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no models.html roman@95.163.236.186:/var/www/good-pools/public/models.html
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no portfolio.html roman@95.163.236.186:/var/www/good-pools/public/portfolio.html
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no js/main.js roman@95.163.236.186:/var/www/good-pools/public/js/main.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no js/models.js roman@95.163.236.186:/var/www/good-pools/public/js/models.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no js/portfolio.js roman@95.163.236.186:/var/www/good-pools/public/js/portfolio.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no js/data-source.js roman@95.163.236.186:/var/www/good-pools/public/js/data-source.js
sshpass -p 'Test1234' scp -o StrictHostKeyChecking=no css/style.css roman@95.163.236.186:/var/www/good-pools/public/css/style.css
```

### Шаблоны админки (views/)

```bash
sshpass -p 'Test1234' scp -r -o StrictHostKeyChecking=no views/ roman@95.163.236.186:/var/www/good-pools/views/
```

### Перезапуск (обязательно после изменений бэкенда)

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 "pm2 restart good-pools"
```

**Важно:** для фронтенд-файлов (HTML/JS/CSS) перезапуск PM2 не нужен — они статические. Перезапуск нужен только если менялись server.js, routes/, middleware/, views/.

## Проверка

```bash
# Логи
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 "pm2 logs good-pools --lines 10 --nostream"

# API
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 "curl -s http://localhost:3050/api/categories"

# Статус
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 "pm2 status"
```

## SQL на сервере

```bash
sshpass -p 'Test1234' ssh -o StrictHostKeyChecking=no roman@95.163.236.186 "psql good_pools_db -c 'SELECT * FROM categories;'"
```

## Структура файлов: локально → сервер

```
Локально                    →  На сервере
─────────────────────────────────────────────
index.html                  →  /var/www/good-pools/public/index.html
models.html                 →  /var/www/good-pools/public/models.html
portfolio.html              →  /var/www/good-pools/public/portfolio.html
css/style.css               →  /var/www/good-pools/public/css/style.css
js/*.js                     →  /var/www/good-pools/public/js/*.js
images/                     →  /var/www/good-pools/public/images/
server.js                   →  /var/www/good-pools/server.js
routes/*.js                 →  /var/www/good-pools/routes/*.js
middleware/*.js              →  /var/www/good-pools/middleware/*.js
views/**/*.ejs              →  /var/www/good-pools/views/**/*.ejs
db/*.js                     →  /var/www/good-pools/db/*.js
```

Ключевое: фронтенд-файлы (HTML/CSS/JS/images) в репозитории лежат в корне, а на сервере — в `public/`.

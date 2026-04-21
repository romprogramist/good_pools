# Project notes for Claude Code

## Правило про схему БД (важно)

**Любое изменение схемы БД — только через новый файл миграции в `db/migrations/NNNN_описание.sql`.**

- Номера монотонные: `0001`, `0002`, `0003`. Никогда не перенумеровывай и не редактируй уже применённую миграцию — пиши новую.
- Всегда делай миграцию идемпотентной (`IF NOT EXISTS`, `DO $$ ... IF ... THEN ALTER ... END IF $$`).
- Раннер: `db/migrate.js`. Таблица учёта: `schema_migrations` (primary key — имя файла).
- Обнови `db/init.sql` так, чтобы fresh install сразу создавал правильную схему (init.sql + миграции должны сходиться).

**Что НЕ делать:**
- Не править схему напрямую через `psql` / pgAdmin на любой БД (локальной или прод). Это расходит схему между средами и ломает раннер миграций.
- Изменения **данных** через админку сайта — это ок, они записываются напрямую в боевую БД и к миграциям отношения не имеют. Миграции — только про DDL и структурные `UPDATE`.

## Архитектура стека

- Node/Express (`server.js`), EJS-шаблоны для админки (`views/`), статика — `public/` (на сервере).
- Postgres через `pg` + `connect-pg-simple` для сессий.
- Фронтенд: статические `*.html` + `css/` + `js/`, данные тянет из `/api/*` (`routes/api.js`).
- Админка: `/admin/*` (`routes/admin.js`), вход в `admin_users`, пароль bcrypt.

## Локальная разработка на Windows

- База данных **только на сервере** (95.163.236.186). Локального Postgres не используем.
- SSH-туннель пробрасывает серверный Postgres на локальный `:5433`:
  ```
  ssh -L 5433:localhost:5432 roman@95.163.236.186 -N
  ```
  Ключ для входа: `~/.ssh/id_ed25519` (личный, работает).
- `.env` (не коммитится):
  ```
  DATABASE_URL=postgres://postgres:Test1234@localhost:5433/good_pools_db
  SESSION_SECRET=local-dev-secret-change-me
  PORT=3050
  ```
- Запуск: `npm run dev` (node --watch). Открывать `http://localhost:3050/`.
- Путевое различие: на сервере фронтенд живёт в `public/`, а локально HTML/CSS/JS лежат в корне. Локально это решено через junction/hard-link'ы в `public/` (в `.gitignore`). Если `public/` исчез — пересоздай из PowerShell:
  ```powershell
  $pub="C:\Users\Roman\good_pools\public"; $root="C:\Users\Roman\good_pools"
  foreach ($d in 'css','js','images','data') { New-Item -ItemType Junction -Path "$pub\$d" -Target "$root\$d" -Force | Out-Null }
  foreach ($f in 'index.html','catalog.html','models.html','portfolio.html','slider-data.js') { New-Item -ItemType HardLink -Path "$pub\$f" -Target "$root\$f" -Force | Out-Null }
  ```

## Деплой

- Триггер: `git push origin main`. Workflow: `.github/workflows/deploy.yml`.
- Шаги: rsync бэк → rsync фронт → `npm install --omit=dev` → `node db/migrate.js` → `pm2 restart good-pools`.
- SSH-ключ для деплоя: `~/.ssh/good_pools_deploy` (в GitHub Secrets как `SSH_PRIVATE_KEY`, base64-encoded).
- Прямые правки файлов на сервере не делаем — rsync с `--delete-after` снесёт их при следующем деплое.

## Сервер (для ручных проверок)

- SSH: `ssh -i ~/.ssh/good_pools_deploy roman@95.163.236.186` (или личным ключом, тоже пускает).
- Путь: `/var/www/good-pools/`.
- PM2: `pm2 status good-pools`, `pm2 logs good-pools --lines 30 --nostream`.
- Postgres на сервере: подключение как `postgres` (через локальный sock), БД `good_pools_db`.

## Утечки в истории git

`DEPLOY.md` и `DEPLOY-QUICK.md` в ранних коммитах содержали SSH-пароль `Test1234` в открытом виде. Если репозиторий когда-либо станет публичным, надо вычистить историю (`git filter-repo`) и сменить пароль пользователя `roman` на сервере.

# Переезд good-pools на домен хорошиебассейны.рф — дизайн

**Дата:** 2026-05-13
**Статус:** утверждено пользователем, готово к плану имплементации.

## Контекст

Сайт «Хорошие Бассейны» сейчас живёт на сервере `95.163.236.186` как pm2-процесс `good-pools` (id=3) в `/var/www/good-pools/`, слушает `0.0.0.0:3050` и доступен снаружи только по тестовому URL `http://95.163.236.186:3050/`. Реверс-прокси (nginx) у проекта пока нет — в отличие от соседних сайтов на том же сервере (`bio-communal`, `oksana-legal`, `aaabez`, `happy-task-canvas`), у которых уже настроены `sites-enabled/`-конфиги + сертификаты Let's Encrypt.

Домен `хорошиебассейны.рф` зарегистрирован на reg.ru, сейчас A-записями указывает на стороннее хостинг-окружение со старым сайтом клиента. У владельца есть доступ и к reg.ru, и к серверу (`ssh roman@95.163.236.186`). Старый сайт **сохранять не нужно** — просто заменяется через DNS.

**Punycode-форма домена:** `xn--80ablclk2abatqa7b6b2c.xn--p1ai` (получено через `python3 -c "import idna; idna.encode(...)"` на сервере).

## Цель

После работ домен `хорошиебассейны.рф` (и `www.хорошиебассейны.рф`) открывает текущее приложение good-pools по HTTPS, с авто-редиректом `http→https` и `www→bare`, с авто-обновляемым сертификатом Let's Encrypt, без даунтайма самого приложения и без побочного воздействия на 4 других сайта на сервере.

## Что в scope, а что нет

**In scope:**
- Создание nginx-конфига для домена, проксирующего на `127.0.0.1:3050`.
- Изменение DNS-записей на reg.ru.
- Выпуск сертификата Let's Encrypt для обоих имён.
- Проверка авто-обновления сертификата.

**Out of scope (явно):**
- MX/почта на `@хорошиебассейны.рф` — не нужна (исходящая почта уже идёт через Yandex SMTP на `Goodbass1@yandex.ru`, входящая на сам домен — не требуется).
- Редирект со старого `goodpools.ru` — не нужен.
- Закрытие тестового URL `http://95.163.236.186:3050/` — оставлен «как есть» по решению пользователя.
- Любые изменения кода приложения, `deploy.yml`, GitHub Actions, БД.
- Перенос/сохранение контента со старого сайта на текущем `хорошиебассейны.рф`.

## Архитектура

```
Пользователь → хорошиебассейны.рф
                    │
       reg.ru DNS (A @ + A www) → 95.163.236.186
                    │
                    ▼
       nginx :443 (TLS, Let's Encrypt)
         server_name = xn--80ablclk2abatqa7b6b2c.xn--p1ai
                       www.xn--80ablclk2abatqa7b6b2c.xn--p1ai
                    │
                    │ proxy_pass http://127.0.0.1:3050
                    ▼
       pm2 "good-pools" (Node/Express :3050)
                    │
                    ▼
       /var/www/good-pools/
```

Параллельно сохраняется текущий тестовый доступ `http://95.163.236.186:3050/` — nginx и pm2 не конкурируют, разные слушающие сокеты.

**Редиректы:**
- `http://хорошиебассейны.рф/*` → `https://хорошиебассейны.рф/*` (301)
- `http://www.хорошиебассейны.рф/*` → `https://хорошиебассейны.рф/*` (301)
- `https://www.хорошиебассейны.рф/*` → `https://хорошиебассейны.рф/*` (301)

Главный домен — без `www`, как у соседнего `bio-communal.ru`.

## Отвергнутые альтернативы

- **Cloudflare-прокси перед сервером** — требует переноса nameservers с reg.ru, добавляет внешнюю зависимость и потенциальные сложности с IDN. Для сайта-визитки CDN/DDoS-защита избыточны.
- **Caddy вместо nginx** — сломает 4 других проекта на сервере, которые завязаны на текущий nginx + certbot.

## DNS на reg.ru

В DNS-зоне `хорошиебассейны.рф`:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A   | `@` | `95.163.236.186` | 3600 |
| A   | `www` | `95.163.236.186` | 3600 |

**Удалить** все существующие A/AAAA-записи `@` и `www`, указывающие на старый хостинг, чтобы в зоне не было конфликтующих ответов. MX/NS/TXT не трогаем. Парковочные CNAME от reg.ru (если есть) убираем.

**Опционально (за ~24ч до переезда):** понизить TTL старых записей до 300с — сократит окно «частичной видимости» после фактического переключения с часов до минут.

## nginx-конфиг

**Файл:** `/etc/nginx/sites-available/good-pools`
**Симлинк:** `/etc/nginx/sites-enabled/good-pools` → `../sites-available/good-pools`

Имя файла совпадает с pm2-процессом и стилем `bio-communal` / `happy-task-canvas`.

**Начальный (HTTP-only) вид — создаём руками перед certbot:**

```nginx
server {
    listen 80;
    server_name xn--80ablclk2abatqa7b6b2c.xn--p1ai www.xn--80ablclk2abatqa7b6b2c.xn--p1ai;

    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|avif|woff|woff2|ttf|css|js|pdf)$ {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=2592000";
    }

    location / {
        proxy_pass http://127.0.0.1:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Итоговый вид (после `certbot --nginx --redirect`):** certbot сам допишет к 80-блоку SSL-конфиг (точнее, выделит его в 443-блок), а 80-блок заменит на редиректный — итог идентичен паттерну `/etc/nginx/sites-available/bio-communal`:

```nginx
server {
    server_name xn--80ablclk2abatqa7b6b2c.xn--p1ai www.xn--80ablclk2abatqa7b6b2c.xn--p1ai;

    # ... весь блок proxy_pass / кэш статики / gzip из начального вида ...

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/xn--80ablclk2abatqa7b6b2c.xn--p1ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xn--80ablclk2abatqa7b6b2c.xn--p1ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.xn--80ablclk2abatqa7b6b2c.xn--p1ai) {
        return 301 https://xn--80ablclk2abatqa7b6b2c.xn--p1ai$request_uri;
    }
    if ($host = xn--80ablclk2abatqa7b6b2c.xn--p1ai) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name xn--80ablclk2abatqa7b6b2c.xn--p1ai www.xn--80ablclk2abatqa7b6b2c.xn--p1ai;
    return 404;
}
```

**Решения и почему:**

- **`server_name` в punycode.** Браузеры всегда шлют `Host`-заголовок в punycode для IDN-доменов; nginx сопоставляет байтово. Кириллицу в `server_name` можно писать дополнительно, но это косметика — оставляем только punycode для предсказуемости.
- **`proxy_pass` на `127.0.0.1:3050`, не `0.0.0.0`.** Хождение через loopback — стандартная практика; pm2-сокет good-pools слушает `0.0.0.0:3050`, так что доступен и так.
- **Основной домен без `www`** — копия паттерна `bio-communal.ru`. www-вариант редиректит на голый домен.
- **Кэш статики 30 дней** взят 1:1 из `bio-communal`. Блок `/_next/static/` оттуда не переносим — у good-pools нет Next.js (vanilla Express + статические HTML).
- **Никаких изменений в pm2-конфиге и порту 3050** — приложение не трогаем.

## Certbot / HTTPS

**Команда:**

```bash
sudo certbot --nginx \
    -d xn--80ablclk2abatqa7b6b2c.xn--p1ai \
    -d www.xn--80ablclk2abatqa7b6b2c.xn--p1ai \
    --redirect --agree-tos -m romprogramist@gmail.com -n
```

**Подтверждения работоспособности окружения:**
- На сервере `certbot 0.40.0` — работающий, тот же, под которым выпущены все остальные ~22 сертификата в `/etc/letsencrypt/live/`, включая несколько `xn--*.xn--p1ai` IDN-доменов.
- nginx 1.18.0 слушает `:80` и `:443` (проверено `ss -tlnp`), все 80-challenge будут проходить.

**Предусловия для успешного выпуска:**
- DNS уже резолвится в `95.163.236.186` — проверяется `dig` из двух резолверов до запуска certbot.
- nginx-конфиг (HTTP-only вид выше) уже создан, симлинк в `sites-enabled/`, `nginx -t` чистый, `systemctl reload nginx` выполнен.
- Имена в `-d` — **только punycode**. Certbot 0.40 не принимает кириллицу в аргументах.

**Что делает certbot:**
1. Кладёт challenge-файл в webroot (`/var/www/letsencrypt/.well-known/acme-challenge/<token>`) или временно правит nginx-конфиг для отдачи токена через сам nginx.
2. Let's Encrypt дёргает оба имени по HTTP, получает токены, выпускает один общий сертификат с двумя SAN.
3. Перписывает наш `/etc/nginx/sites-available/good-pools` в финальный вид (см. выше).
4. Делает `nginx -t && systemctl reload nginx`.

**Авто-обновление:**
- На Ubuntu при установке certbot включается systemd-таймер `certbot.timer` (дважды в день запускает `certbot renew`).
- Это **обязательно проверяется** на верификации (см. ниже): `systemctl list-timers | grep certbot` + `certbot renew --dry-run`. Тот факт, что у соседних сайтов сертификаты живые много месяцев, — косвенное, но не достаточное подтверждение [[feedback_verify_mechanism]].

## Порядок исполнения

```
Шаг 0  (опционально, за ~24ч)
   reg.ru: понизить TTL текущих A-записей до 300с

Шаг 1  (на сервере, до DNS-переключения)
   создать /etc/nginx/sites-available/good-pools (HTTP-only вид)
   ln -s ../sites-available/good-pools /etc/nginx/sites-enabled/good-pools
   sudo nginx -t
   sudo systemctl reload nginx
   └─ снаружи пока ничего не меняется — DNS ещё указывает на старый хостинг

Шаг 2  (reg.ru)
   удалить старые A-записи хорошиебассейны.рф
   добавить:  A @     → 95.163.236.186  (TTL 3600 или 300)
              A www   → 95.163.236.186  (TTL 3600 или 300)

Шаг 3  (на сервере, ждём пропагацию)
   dig +short хорошиебассейны.рф @8.8.8.8     # → 95.163.236.186
   dig +short www.хорошиебассейны.рф @8.8.8.8 # → 95.163.236.186
   dig +short хорошиебассейны.рф @1.1.1.1     # → 95.163.236.186
   ждём, пока все три вернут наш IP (5–30 мин с шагом 0, иначе до 1–4ч)

Шаг 4  (на сервере, выпуск сертификата)
   sudo certbot --nginx \
        -d xn--80ablclk2abatqa7b6b2c.xn--p1ai \
        -d www.xn--80ablclk2abatqa7b6b2c.xn--p1ai \
        --redirect --agree-tos -m romprogramist@gmail.com -n

Шаг 5  (verification, см. ниже)
```

## Verification

Каждый пункт даёт галочку только при фактическом подтверждении.

**DNS:**
```bash
dig +short хорошиебассейны.рф @8.8.8.8        # → 95.163.236.186
dig +short www.хорошиебассейны.рф @8.8.8.8    # → 95.163.236.186
dig +short хорошиебассейны.рф @1.1.1.1        # → 95.163.236.186
```

**HTTP/HTTPS-цепочка:**
```bash
curl -sI http://хорошиебассейны.рф/           # 301 → https://хорошиебассейны.рф/
curl -sI http://www.хорошиебассейны.рф/       # 301 → https://хорошиебассейны.рф/
curl -sI https://www.хорошиебассейны.рф/      # 301 → https://хорошиебассейны.рф/
curl -sI https://хорошиебассейны.рф/          # 200 OK от Express
```

**Сертификат и автообновление:**
```bash
sudo certbot certificates | grep -A3 xn--80ablclk2abatqa7b6b2c
   # Domains: оба имени, Expiry ~90 дней
systemctl list-timers | grep certbot
   # certbot.timer активен, Next run в течение 12ч
sudo certbot renew --dry-run
   # завершается без ошибок
```

**Контентная проверка (вручную в браузере на новом домене):**
- [ ] `/` — главная, картинки + CSS на месте.
- [ ] `/catalog`, `/models`, `/portfolio` — все ключевые страницы.
- [ ] Одна из 5 форм — отправка → запись в БД и письмо на `Goodbass1@yandex.ru` (через `/api/leads` и `lib/mailer.js`).
- [ ] Зелёный замок, серт «Let's Encrypt», действителен.
- [ ] Slider/JS на главной работает.

**Регрессии:**
- [ ] `http://95.163.236.186:3050/` всё ещё открывается.
- [ ] `bio-communal.ru`, `oksana-legal`, `aaabez.ru`, `happy-task-canvas` — открываются по HTTPS (`curl -sI` каждого).
- [ ] `nginx -t` clean, `systemctl status nginx` active.
- [ ] `pm2 list` → `good-pools` online, ↺-counter не растёт.

## Откат

| Что сломалось | Действие |
|---|---|
| Шаг 1: `nginx -t` ругается | Удалить симлинк, починить конфиг, повторить. Соседи не задеты. |
| Шаг 3: DNS не пропагируется > 4ч | Проверить, что записи реально сохранились в зоне reg.ru. Не дёргать certbot заранее. |
| Шаг 4: certbot не выпустил серт | Чинить причину (обычно DNS), повторять команду. Сайт продолжает работать по HTTP, деградации нет. |
| Шаг 5: сайт открывается, но кривой | `pm2 logs good-pools`, `tail /var/log/nginx/error.log` для good-pools. |

**Чего не делаем:**
- Не откатываем DNS обратно — TTL уже размазал переезд, обратный откат тоже размажется на часы.
- Не делаем `pm2 restart all` — на сервере ещё 4 проекта под пользователем `roman`.

## Риски и допущения

- **Допущение:** в зоне `хорошиебассейны.рф` на reg.ru нет проблемных DNSSEC/CAA-записей, мешающих Let's Encrypt. Если CAA-запись присутствует и ограничивает CA — её нужно либо удалить, либо добавить `letsencrypt.org`. Проверим перед шагом 4 (`dig CAA хорошиебассейны.рф`).
- **Риск:** между шагом 3 и шагом 4 пользователи увидят сайт по HTTP без HTTPS (Not secure-плашка). Окно — единицы минут. Приемлемо.
- **Риск:** rate-limit Let's Encrypt (5 неудач на хост в час). При первой неудаче — диагностируем, а не молотим повторно.

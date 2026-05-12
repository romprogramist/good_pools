# Переезд good-pools на домен хорошиебассейны.рф — план имплементации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести продакшен-сайт good-pools с тестового URL `http://95.163.236.186:3050/` на домен `хорошиебассейны.рф` (+ `www`) по HTTPS с авто-обновляемым сертификатом Let's Encrypt, без даунтайма приложения и без побочного воздействия на 4 соседних проекта на сервере.

**Architecture:** Reverse-proxy nginx (уже стоит на сервере, обслуживает 4 других проекта) добавляет новый `sites-enabled/good-pools`-конфиг с проксированием на `127.0.0.1:3050`. Сертификат выпускает certbot 0.40 (уже установлен) после переключения DNS на reg.ru. Punycode-форма домена: `xn--80ablclk2abatqa7b6b2c.xn--p1ai`.

**Tech Stack:** nginx 1.18 + certbot 0.40 на Ubuntu (сервер `95.163.236.186`), Let's Encrypt, reg.ru DNS-панель, pm2-процесс `good-pools` (id=3) на `:3050`, локальные команды через `ssh roman@95.163.236.186`.

**Spec:** `docs/superpowers/specs/2026-05-13-domain-migration-design.md` (коммит `2ccee6e`).

**Важно про тип задачи:** Это infrastructure-задача, не код. TDD не применяется. Каждый шаг заканчивается verification-командой с ожидаемым выводом. Коммитов в репозиторий тут почти нет (изменения на сервере и в reg.ru, а не в исходниках) — финальный коммит только для отметки в репозитории и/или закрытия плана.

**Важно про порядок:** Шаги строго последовательные. **Не запускать certbot до Task 5** (DNS должен быть пропагирован), иначе HTTP-01 challenge провалится и можно упереться в rate-limit Let's Encrypt.

**Доступы:** `ssh roman@95.163.236.186` (sudo без пароля для nginx/certbot должен работать — у соседних проектов он работает). Доступ к панели управления `reg.ru` под учёткой владельца домена.

---

### Task 1: Pre-flight — убедиться, что окружение в норме

**Files:** только проверки, ничего не меняем.

- [ ] **Step 1: Проверить, что nginx, certbot, pm2 и порт 3050 в норме**

Run:
```bash
ssh roman@95.163.236.186 "
  echo '--- nginx ---'; nginx -v 2>&1; sudo nginx -t 2>&1;
  echo '--- certbot ---'; certbot --version 2>&1;
  echo '--- pm2 good-pools ---'; pm2 describe good-pools | grep -E 'status|pid|uptime|restart time' | head -5;
  echo '--- 3050 listening ---'; ss -tln | grep :3050;
"
```

Expected output (фрагменты):
- `nginx version: nginx/1.18.0 (Ubuntu)`
- `nginx: configuration file /etc/nginx/nginx.conf test is successful`
- `certbot 0.40.0`
- `status: online`
- `LISTEN 0 511 0.0.0.0:3050 ...`

Если `nginx -t` падает с ошибкой — **остановиться и чинить**, иначе reload на Task 3 убьёт все 5 сайтов сервера.

- [ ] **Step 2: Убедиться, что нашего конфига ещё нет в sites-enabled**

Run:
```bash
ssh roman@95.163.236.186 "ls -la /etc/nginx/sites-enabled/ | grep -i 'good-pools\|пул\|бассейн\|xn--80ablclk2'"
```

Expected: пусто. Если что-то найдено — изучить файл, согласовать с пользователем перед удалением/перезаписью.

- [ ] **Step 3: Проверить, что punycode-домен совпадает с тем, что в спеке**

Run:
```bash
ssh roman@95.163.236.186 "python3 -c \"import idna; print(idna.encode('хорошиебассейны.рф').decode())\""
```

Expected: `xn--80ablclk2abatqa7b6b2c.xn--p1ai`

Если значение отличается — **немедленно остановиться** и сверить со спекой, дальше все строки конфигов и certbot-команды зависят от него.

- [ ] **Step 4: Проверить CAA-записи в зоне домена (могут блокировать Let's Encrypt)**

Run:
```bash
dig +short CAA хорошиебассейны.рф @8.8.8.8
dig +short CAA xn--80ablclk2abatqa7b6b2c.xn--p1ai @8.8.8.8
```

Expected: пусто. Если есть запись вида `0 issue "..."` без `letsencrypt.org` — нужно либо удалить CAA, либо добавить `0 issue "letsencrypt.org"` в reg.ru. Зафиксировать в чате с пользователем и не двигаться дальше до решения.

- [ ] **Step 5: Зафиксировать стартовое состояние соседних сайтов (на случай регрессии)**

Run:
```bash
for d in bio-communal.ru oksana-legal.ru aaabez.ru; do
  echo "=== $d ==="
  curl -sI "https://$d/" | head -1
done
```

Expected: каждая строка — `HTTP/... 200 OK` или `HTTP/... 301/302`. Если хоть один уже сломан — пометить, чтобы не приписать поломку нашим работам.

---

### Task 2: (Опционально, за ~24ч до миграции) Снизить TTL старых DNS-записей

Пропустить, если делаем переезд «в один заход» и согласны на 1–4 часа размазанного переключения.

**Files:** изменения в DNS-панели reg.ru. Ничего на сервере.

- [ ] **Step 1: Зайти в панель reg.ru → Мои домены → `хорошиебассейны.рф` → DNS / Управление зоной**

- [ ] **Step 2: Для существующих A-записей `@` и `www` изменить TTL на `300` секунд. Сохранить.**

- [ ] **Step 3: Verify — убедиться, что TTL действительно понижен**

Run:
```bash
dig +noall +answer хорошиебассейны.рф @ns1.reg.ru
dig +noall +answer www.хорошиебассейны.рф @ns1.reg.ru
```

Expected: в третьей колонке (TTL) значение `300` для обеих записей. (`ns1.reg.ru` — авторитативный сервер; его ответ показывает «правду из зоны», а не закэшированное где-то.)

- [ ] **Step 4: Подождать минимум `<старый TTL>` (обычно 1–4 часа). Только потом переходить к Task 3.**

---

### Task 3: Создать HTTP-only nginx-конфиг для домена

Сначала кладём конфиг с `listen 80` (без SSL) — это нужно, чтобы certbot потом смог пройти HTTP-01 challenge через nginx-plugin. Сразу после Task 5 этот конфиг сам перепишется в SSL-вариант командой certbot.

**Files:**
- Create на сервере: `/etc/nginx/sites-available/good-pools`
- Create на сервере: симлинк `/etc/nginx/sites-enabled/good-pools` → `../sites-available/good-pools`

- [ ] **Step 1a: Создать локальный файл `C:\Users\Roman\good_pools\.tmp\good-pools.conf`** с содержимым:

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

`.tmp/` уже в `.gitignore` (или будет проигнорирован если нет — это временный путь только для scp). Если такой папки нет — создать: `mkdir C:\Users\Roman\good_pools\.tmp`.

- [ ] **Step 1b: Скопировать файл на сервер и установить владельца/права**

Run (PowerShell):
```powershell
scp C:\Users\Roman\good_pools\.tmp\good-pools.conf roman@95.163.236.186:/tmp/good-pools.conf
ssh roman@95.163.236.186 "sudo install -o root -g root -m 0644 /tmp/good-pools.conf /etc/nginx/sites-available/good-pools && rm /tmp/good-pools.conf"
```

Expected: команды отрабатывают молча, без ошибок.

- [ ] **Step 2: Verify содержимое конфига**

Run:
```bash
ssh roman@95.163.236.186 "sudo cat /etc/nginx/sites-available/good-pools"
```

Expected: точный конфиг из Step 1, в `server_name` оба punycode-имени, `proxy_pass http://127.0.0.1:3050;` в обоих location-блоках, никаких `listen 443`-строк (их добавит certbot позже).

- [ ] **Step 3: Создать симлинк в sites-enabled**

Run:
```bash
ssh roman@95.163.236.186 "sudo ln -sf /etc/nginx/sites-available/good-pools /etc/nginx/sites-enabled/good-pools && ls -la /etc/nginx/sites-enabled/good-pools"
```

Expected: `good-pools -> /etc/nginx/sites-available/good-pools`.

- [ ] **Step 4: nginx -t (синтаксис конфига чистый)**

Run:
```bash
ssh roman@95.163.236.186 "sudo nginx -t"
```

Expected:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Если падает — **остановиться**, починить (обычно — кавычка/`;`), не делать reload.

- [ ] **Step 5: Перезагрузить nginx**

Run:
```bash
ssh roman@95.163.236.186 "sudo systemctl reload nginx && systemctl status nginx --no-pager | head -10"
```

Expected: `Active: active (running)`, в логах нет свежих ошибок.

- [ ] **Step 6: Smoke-чек через IP с подменой Host (DNS ещё не переключен, но мы можем проверить, что конфиг отвечает)**

Run:
```bash
curl -sI --resolve xn--80ablclk2abatqa7b6b2c.xn--p1ai:80:95.163.236.186 \
     http://xn--80ablclk2abatqa7b6b2c.xn--p1ai/ | head -5
```

Expected: `HTTP/1.1 200 OK` (или 301/302, если приложение редиректит). Если получаем дефолтную `Welcome to nginx!` страницу — наш `server_name` не сматчился, перепроверять Step 1.

- [ ] **Step 7: Регрессия — соседи не сломались**

Run:
```bash
for d in bio-communal.ru oksana-legal.ru aaabez.ru; do
  echo "=== $d ==="
  curl -sI "https://$d/" | head -1
done
```

Expected: те же коды, что в Task 1 Step 5. Если что-то изменилось — **немедленно** откатить (`sudo rm /etc/nginx/sites-enabled/good-pools && sudo systemctl reload nginx`) и расследовать.

---

### Task 4: Переключить DNS на reg.ru

**Files:** изменения в DNS-панели reg.ru. На сервере ничего.

- [ ] **Step 1: Зайти в панель reg.ru → Мои домены → `хорошиебассейны.рф` → DNS / Управление зоной**

- [ ] **Step 2: Снять скриншот текущего состояния зоны (для отката в случае проблем)**

- [ ] **Step 3: Удалить все существующие A и AAAA записи `@` и `www`, указывающие на старый хостинг**

Также убрать парковочные CNAME `@` или `www` от reg.ru, если они есть. Не трогать NS-записи и MX-записи (хотя MX не нужны — просто не наша забота сейчас).

- [ ] **Step 4: Добавить новые A-записи**

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A   | `@`   | `95.163.236.186` | 3600 (или 300, если делали Task 2) |
| A   | `www` | `95.163.236.186` | 3600 (или 300, если делали Task 2) |

Сохранить изменения в зоне.

- [ ] **Step 5: Verify на авторитативном NS reg.ru (немедленно, не дожидаясь пропагации)**

Run:
```bash
dig +noall +answer хорошиебассейны.рф @ns1.reg.ru
dig +noall +answer www.хорошиебассейны.рф @ns1.reg.ru
```

Expected: обе записи возвращают `95.163.236.186`. Если нет — записи не сохранились, вернуться в панель.

---

### Task 5: Дождаться пропагации DNS

Это «активное ожидание»: каждые 2–5 минут запускаем `dig` на публичные резолверы. Не идти дальше, пока все три не вернут наш IP. **Не запускать certbot, пока этот шаг не пройден полностью** — иначе будет неудачный challenge и риск rate-limit.

- [ ] **Step 1: Опрашивать публичные резолверы**

Run каждые ~2 минуты (можно в цикле):
```bash
echo "=== 8.8.8.8 ==="; dig +short хорошиебассейны.рф @8.8.8.8; dig +short www.хорошиебассейны.рф @8.8.8.8
echo "=== 1.1.1.1 ==="; dig +short хорошиебассейны.рф @1.1.1.1; dig +short www.хорошиебассейны.рф @1.1.1.1
echo "=== 77.88.8.8 (Yandex) ==="; dig +short хорошиебассейны.рф @77.88.8.8; dig +short www.хорошиебассейны.рф @77.88.8.8
```

Expected (все шесть значений): `95.163.236.186`.

- [ ] **Step 2: Финальный smoke — HTTP-запрос реально доходит до нашего nginx**

Run:
```bash
curl -sI http://хорошиебассейны.рф/ | head -5
curl -sI http://www.хорошиебассейны.рф/ | head -5
```

Expected: `HTTP/1.1 200 OK` от приложения good-pools (заголовки Express). Если видим контент старого сайта — DNS ещё не докатился, ждать.

⚠️ В эти несколько минут сайт работает только по HTTP, без HTTPS. Это ожидаемое короткое окно. Не паниковать, идти дальше.

---

### Task 6: Выпустить сертификат Let's Encrypt через certbot

**Files:** certbot перепишет `/etc/nginx/sites-available/good-pools` (после успеха он будет соответствовать «финальному виду» из секции «nginx-конфиг» спека).

- [ ] **Step 1: Запустить certbot**

Run:
```bash
ssh roman@95.163.236.186 "sudo certbot --nginx \
    -d xn--80ablclk2abatqa7b6b2c.xn--p1ai \
    -d www.xn--80ablclk2abatqa7b6b2c.xn--p1ai \
    --redirect --agree-tos -m romprogramist@gmail.com -n"
```

Expected (фрагменты вывода):
```
Requesting a certificate for xn--80ablclk2abatqa7b6b2c.xn--p1ai and www.xn--80ablclk2abatqa7b6b2c.xn--p1ai
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/xn--80ablclk2abatqa7b6b2c.xn--p1ai/fullchain.pem
Successfully deployed certificate for xn--80ablclk2abatqa7b6b2c.xn--p1ai
Successfully deployed certificate for www.xn--80ablclk2abatqa7b6b2c.xn--p1ai
Congratulations! You have successfully enabled HTTPS
```

Если упало:
- `DNS problem` / `connection refused` / `timeout` — DNS не до конца пропагирован, вернуться в Task 5 и подождать ещё.
- `too many requests` — Let's Encrypt rate-limit. **Не повторять** в цикле, разобраться, может потребоваться ждать час.
- `nginx unable to find...` — конфиг из Task 3 не на месте, перепроверить Step 3 Task 3.

- [ ] **Step 2: Verify, что certbot переписал nginx-конфиг**

Run:
```bash
ssh roman@95.163.236.186 "sudo cat /etc/nginx/sites-available/good-pools"
```

Expected: появились строки `listen 443 ssl;`, `ssl_certificate /etc/letsencrypt/live/xn--80ablclk2abatqa7b6b2c.xn--p1ai/fullchain.pem;`, и второй `server { listen 80; ... return 301 https://...; }` блок с редиректами. Содержимое — копия паттерна `bio-communal` из спека.

- [ ] **Step 3: Verify, что nginx перезагрузился чисто**

Run:
```bash
ssh roman@95.163.236.186 "sudo nginx -t && systemctl status nginx --no-pager | head -5"
```

Expected: `test is successful`, `Active: active (running)`.

- [ ] **Step 4: Verify сертификат**

Run:
```bash
ssh roman@95.163.236.186 "sudo certbot certificates | grep -A4 xn--80ablclk2abatqa7b6b2c"
```

Expected (фрагмент):
```
Certificate Name: xn--80ablclk2abatqa7b6b2c.xn--p1ai
    Domains: xn--80ablclk2abatqa7b6b2c.xn--p1ai www.xn--80ablclk2abatqa7b6b2c.xn--p1ai
    Expiry Date: <дата через ~90 дней>
    Certificate Path: /etc/letsencrypt/live/xn--80ablclk2abatqa7b6b2c.xn--p1ai/fullchain.pem
```

- [ ] **Step 5: Verify авто-обновление**

Run:
```bash
ssh roman@95.163.236.186 "systemctl list-timers | grep certbot"
```

Expected: одна строка с активным таймером (`certbot.timer`) и `Next:` в пределах 12 часов. Если таймера нет — это ❌, поднять с пользователем (можно настроить вручную через systemd unit, но это уже за рамками текущего плана).

Run:
```bash
ssh roman@95.163.236.186 "sudo certbot renew --dry-run 2>&1 | tail -20"
```

Expected: `Congratulations, all simulated renewals succeeded` или эквивалентная строка успеха.

---

### Task 7: Полная финальная верификация и регрессии

После certbot основная работа сделана; этот таск — проверить ВСЁ, не делать выводов «всё работает» по одному `curl`.

- [ ] **Step 1: DNS из трёх резолверов (повторно, на случай если что-то по дороге дрифтануло)**

Run:
```bash
for ns in 8.8.8.8 1.1.1.1 77.88.8.8; do
  echo "=== $ns ==="
  dig +short хорошиебассейны.рф @$ns
  dig +short www.хорошиебассейны.рф @$ns
done
```

Expected: все шесть строк — `95.163.236.186`.

- [ ] **Step 2: HTTP/HTTPS-цепочка редиректов**

Run:
```bash
echo '--- http bare ---';     curl -sI http://хорошиебассейны.рф/      | head -3
echo '--- http www ---';      curl -sI http://www.хорошиебассейны.рф/  | head -3
echo '--- https www ---';     curl -sI https://www.хорошиебассейны.рф/ | head -3
echo '--- https bare ---';    curl -sI https://хорошиебассейны.рф/     | head -3
```

Expected:
- `http://хорошиебассейны.рф/` → `301 Moved Permanently`, `Location: https://хорошиебассейны.рф/`
- `http://www.хорошиебассейны.рф/` → `301 Moved Permanently`, `Location: https://хорошиебассейны.рф/`
- `https://www.хорошиебассейны.рф/` → `301 Moved Permanently`, `Location: https://хорошиебассейны.рф/`
- `https://хорошиебассейны.рф/` → `200 OK` (заголовки от Express, видны `X-Powered-By` или подобные)

- [ ] **Step 3: Проверка отдачи реального контента**

Run:
```bash
curl -s https://хорошиебассейны.рф/ | grep -E '<title>|<h1>' | head -5
```

Expected: видим заголовок страницы good-pools («Хорошие Бассейны» или похожий из `index.html`), не дефолтный nginx, не контент старого сайта.

- [ ] **Step 4: Сертификат глазами клиента (не сервера)**

Run:
```bash
echo | openssl s_client -servername xn--80ablclk2abatqa7b6b2c.xn--p1ai \
       -connect xn--80ablclk2abatqa7b6b2c.xn--p1ai:443 2>/dev/null \
     | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Expected:
- `subject= CN = xn--80ablclk2abatqa7b6b2c.xn--p1ai`
- `issuer= ... O = Let's Encrypt ...`
- `notBefore=` сегодня, `notAfter=` ~90 дней
- `X509v3 Subject Alternative Name: DNS:xn--80ablclk2abatqa7b6b2c.xn--p1ai, DNS:www.xn--80ablclk2abatqa7b6b2c.xn--p1ai`

- [ ] **Step 5: Проверка форм — реальная отправка лида**

Открыть в браузере `https://хорошиебассейны.рф/`. Отправить форму обратного звонка с тестовыми данными (имя: `test-migration`, телефон с маркером).

Verify в БД. Сначала открыть SSH-туннель к БД **в отдельном терминале** (паттерн проекта — см. `docs/superpowers/plans/2026-05-13-leads-admin-page.md`):
```bash
ssh -L 5433:localhost:5432 roman@95.163.236.186 -N
```
В исходном терминале:
```bash
psql "postgres://postgres:Test1234@localhost:5433/good_pools_db" -c "SELECT id, name, phone, source, created_at FROM leads ORDER BY id DESC LIMIT 3;"
```

Expected: видим только что отправленную заявку с `name = 'test-migration'`.

Verify письмо: проверить ящик `Goodbass1@yandex.ru` (или `MAIL_TO` из `.env` на сервере) — пришло уведомление о новой заявке.

- [ ] **Step 6: Тестовый URL :3050 всё ещё работает (пользователь попросил оставить)**

Run:
```bash
curl -sI http://95.163.236.186:3050/ | head -3
```

Expected: `200 OK` от Express. Никаких 301/308.

- [ ] **Step 7: Регрессия — все соседние сайты не сломались**

Run:
```bash
for d in bio-communal.ru oksana-legal.ru aaabez.ru pool-builder-crm.ru; do
  echo "=== $d ==="
  curl -sI "https://$d/" | head -1
done
```

Expected: те же коды, что в Task 1 Step 5 / Task 3 Step 7.

- [ ] **Step 8: pm2 + nginx живы**

Run:
```bash
ssh roman@95.163.236.186 "pm2 describe good-pools | grep -E 'status|restart time|uptime' | head -5; echo '---'; systemctl is-active nginx"
```

Expected: `status: online`, restart-counter не вырос относительно Task 1, `active`.

- [ ] **Step 9: Удалить тестовую заявку, оставленную в Step 5**

Run:
```bash
psql "postgres://postgres:Test1234@localhost:5433/good_pools_db" -c "DELETE FROM leads WHERE name = 'test-migration';"
```

Expected: `DELETE 1`.

---

### Task 8: Финальный коммит — отметить миграцию выполненной

**Files:**
- Modify: `docs/superpowers/specs/2026-05-13-domain-migration-design.md:4` (статус)
- (Опционально) Modify: `CLAUDE.md` если там есть упоминание тестового URL как «канонического»

- [ ] **Step 1: Поменять статус спека**

В файле `docs/superpowers/specs/2026-05-13-domain-migration-design.md` поменять строку:
```
**Статус:** утверждено пользователем, готово к плану имплементации.
```
на:
```
**Статус:** ВЫПОЛНЕНО 2026-05-13. Домен живёт по HTTPS, сертификат активен, авто-обновление работает.
```

- [ ] **Step 2: Закоммитить**

Run:
```bash
git -C "C:/Users/Roman/good_pools" add docs/superpowers/specs/2026-05-13-domain-migration-design.md
git -C "C:/Users/Roman/good_pools" commit -m "docs(spec): отметить переезд на хорошиебассейны.рф выполненным"
```

Push в `origin/main` — на усмотрение пользователя (deploy.yml не задеплоит `docs/`, побочных эффектов нет).

- [ ] **Step 3: Отметить план как выполненный (опционально)**

Дополнительная фраза в `docs/superpowers/plans/2026-05-13-domain-migration.md` в самом верху рядом с **Goal:** — `**Status:** DONE 2026-05-13.`

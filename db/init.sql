-- ============================================================
-- good_pools_db schema
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50)  UNIQUE NOT NULL,
  label       VARCHAR(100) NOT NULL,
  image       VARCHAR(255),
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id          SERIAL PRIMARY KEY,
  slug        VARCHAR(100)  UNIQUE NOT NULL,
  category_id INT           NOT NULL REFERENCES categories(id),
  name        VARCHAR(100)  NOT NULL,
  series      VARCHAR(100),
  description TEXT,
  length_m    DECIMAL(4,1),
  width_m     DECIMAL(4,1),
  depth_m     DECIMAL(4,1),
  specs_label VARCHAR(100),
  price       VARCHAR(100),
  badge       VARCHAR(50),
  sort_order  INT           DEFAULT 0,
  created_at  TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_images (
  id         SERIAL PRIMARY KEY,
  model_id   INT          NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  image_path VARCHAR(255) NOT NULL,
  sort_order INT          DEFAULT 0,
  is_cover   BOOLEAN      DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS portfolio (
  id          SERIAL PRIMARY KEY,
  category_id INT          NOT NULL REFERENCES categories(id),
  title       VARCHAR(200) NOT NULL,
  location    VARCHAR(200),
  size        VARCHAR(100),
  year        INT,
  sort_order  INT          DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_images (
  id           SERIAL PRIMARY KEY,
  portfolio_id INT          NOT NULL REFERENCES portfolio(id) ON DELETE CASCADE,
  image_path   VARCHAR(255) NOT NULL,
  sort_order   INT          DEFAULT 0,
  is_cover     BOOLEAN      DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- connect-pg-simple session table
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- ============================================================
-- Seed: categories
-- ============================================================
INSERT INTO categories (key, label, image, sort_order) VALUES
  ('composite',  'Композитные',  'images/categories/composite-pool.svg', 1),
  ('custom',     'Кастом',       'images/categories/custom-pool.svg',    2),
  ('jacuzzi',    'Джакузи-спа',  'images/categories/jacuzzi-spa.svg',    3),
  ('inflatable', 'Надувные спа', 'images/categories/inflatable-spa.svg', 4),
  ('furako',     'Фурако',       'images/categories/furako.svg',         5),
  ('furniture',  'Мебель',       'images/categories/furniture.svg',      6)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Seed: models
-- ============================================================
INSERT INTO models (slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order) VALUES
  ('hiit',  (SELECT id FROM categories WHERE key='composite'), 'HIIT',  'Спортивная серия',   'Увеличенная длина для активного плавания, обтекаемая форма, усиленное дно.', 8.0, 3.6, 1.6, NULL, 'от 1 250 000 ₽', 'Хит продаж', 1),
  ('zen',   (SELECT id FROM categories WHERE key='composite'), 'ZEN',   'Классическая серия', 'Прямоугольная форма для ценителей чистых линий, компактная.',                 6.2, 3.2, 1.5, NULL, 'от 890 000 ₽',   NULL,          2),
  ('tetta', (SELECT id FROM categories WHERE key='composite'), 'TETTA', 'Семейная серия',     'Эргономичная форма со встроенными ступенями и зоной отдыха.',                 7.0, 3.4, 1.5, NULL, 'от 1 100 000 ₽', NULL,          3),

  ('custom-classic',  (SELECT id FROM categories WHERE key='custom'), 'CUSTOM CLASSIC',  'Индивидуальный проект', 'Прямые линии, ваши размеры. Делаем по чертежам участка.',                NULL, NULL, NULL, 'Любой размер', 'По проекту', NULL,      1),
  ('custom-infinity', (SELECT id FROM categories WHERE key='custom'), 'CUSTOM INFINITY', 'Инфинити-проект',       'Бассейн с переливом через край — эффект бесконечной воды.',              NULL, NULL, NULL, 'Любой размер', 'По проекту', 'Премиум', 2),
  ('custom-lagoon',   (SELECT id FROM categories WHERE key='custom'), 'CUSTOM LAGOON',   'Свободная форма',       'Органичные контуры в стиле природной лагуны, пляжный вход.',             NULL, NULL, NULL, 'Любой размер', 'По проекту', NULL,      3),

  ('spa-duo',     (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA DUO',     '2 места', 'Компактное спа для двоих, 20 гидромассажных форсунок, LED-подсветка.', NULL, NULL, NULL, 'Ø 1.9 м · 85 см',    'от 420 000 ₽',   NULL,          1),
  ('spa-family',  (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA FAMILY',  '6 мест',  'Семейное спа с зоной отдыха, 40 форсунок, встроенная акустика.',        NULL, NULL, NULL, '2.2 × 2.2 × 0.9 м',  'от 780 000 ₽',   'Хит продаж',  2),
  ('spa-premium', (SELECT id FROM categories WHERE key='jacuzzi'), 'SPA PREMIUM', '8 мест',  'Топ-модель: 60 форсунок, хромотерапия, аромадиффузор, подогрев.',       NULL, NULL, NULL, '2.4 · 2.4 · 0.95 м', 'от 1 150 000 ₽', NULL,          3),

  ('inflate-round',  (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE ROUND',  '4 места', 'Круглое надувное спа с подогревом 40°C и массажными форсунками.',    NULL, NULL, NULL, 'Ø 1.8 м · 65 см',   'от 89 000 ₽',  NULL,       1),
  ('inflate-square', (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE SQUARE', '6 мест',  'Квадратная форма, большая вместимость, быстрый монтаж за 15 минут.', NULL, NULL, NULL, '2.0 × 2.0 × 0.7 м', 'от 129 000 ₽', NULL,       2),
  ('inflate-jet',    (SELECT id FROM categories WHERE key='inflatable'), 'INFLATE JET',    '4 места', 'Усиленный массаж 140 форсунок, хромотерапия, пульт ДУ.',             NULL, NULL, NULL, 'Ø 1.9 м · 70 см',   'от 165 000 ₽', 'Новинка', 3),

  ('furako-classic', (SELECT id FROM categories WHERE key='furako'), 'FURAKO CLASSIC', 'Кедр сибирский', 'Классическая круглая купель из кедра, дровяная печь внутри.',           NULL, NULL, NULL, 'Ø 1.8 м · 1.0 м',    'от 245 000 ₽', NULL,          1),
  ('furako-oval',    (SELECT id FROM categories WHERE key='furako'), 'FURAKO OVAL',    'Дуб',            'Овальная форма для двоих лёжа, печь снаружи, удобный вход.',             NULL, NULL, NULL, '2.0 × 1.5 × 1.0 м',  'от 310 000 ₽', NULL,          2),
  ('furako-xl',      (SELECT id FROM categories WHERE key='furako'), 'FURAKO XL',      'Кедр премиум',   'Большая купель до 8 человек, встроенные лавки, лестница из нержавейки.', NULL, NULL, NULL, 'Ø 2.2 м · 1.2 м',    'от 420 000 ₽', 'Хит продаж', 3),

  ('lounge-chair', (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE CHAIR', 'Шезлонг',           'Влагостойкий алюминий + ткань Textilene, регулировка спинки.',    NULL, NULL, NULL, '195 × 70 × 40 см',  'от 28 000 ₽',  NULL, 1),
  ('lounge-sofa',  (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE SOFA',  'Диван для террасы', 'Модульный диван из ротанга, водоотталкивающие подушки.',          NULL, NULL, NULL, '220 × 85 × 75 см',  'от 95 000 ₽',  NULL, 2),
  ('lounge-bar',   (SELECT id FROM categories WHERE key='furniture'), 'LOUNGE BAR',   'Барная зона',       'Барная стойка + 2 стула, тик + нержавейка, для зоны у бассейна.', NULL, NULL, NULL, '140 × 55 × 110 см', 'от 142 000 ₽', NULL, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: portfolio
-- ============================================================
INSERT INTO portfolio (category_id, title, location, size, year, sort_order) VALUES
  ((SELECT id FROM categories WHERE key='composite'), 'Вилла в Подмосковье',           'Московская область',   '8.0 × 4.0 м',     2024, 1),
  ((SELECT id FROM categories WHERE key='composite'), 'Загородный дом в Сочи',         'Краснодарский край',    '7.0 × 3.5 м',     2024, 2),
  ((SELECT id FROM categories WHERE key='composite'), 'Коттедж в Краснодаре',          'Краснодар',             '6.5 × 3.2 м',     2023, 3),
  ((SELECT id FROM categories WHERE key='composite'), 'Особняк под Санкт-Петербургом', 'Ленинградская область', '9.0 × 4.5 м',     2024, 4),
  ((SELECT id FROM categories WHERE key='custom'),    'Резиденция в Казани',           'Татарстан',             '12 × 5 м',        2024, 5),
  ((SELECT id FROM categories WHERE key='custom'),    'Дом в Ростове-на-Дону',         'Ростовская область',    '10 × 4 м',        2023, 6),
  ((SELECT id FROM categories WHERE key='custom'),    'Вилла в Калининграде',          'Калининградская обл.',  'Лагуна 14 × 6 м', 2023, 7),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Пентхаус в Екатеринбурге',      'Свердловская область',  'SPA Family',       2024, 8),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Коттедж в Новосибирске',        'Новосибирская обл.',    'SPA Premium',      2024, 9),
  ((SELECT id FROM categories WHERE key='jacuzzi'),   'Дача под Владивостоком',        'Приморский край',       'SPA Duo',          2023, 10),
  ((SELECT id FROM categories WHERE key='furako'),    'База отдыха в Карелии',         'Республика Карелия',    'Кедр Ø 2.2 м',    2024, 11),
  ((SELECT id FROM categories WHERE key='furako'),    'Гостевой дом на Алтае',         'Горный Алтай',          'Кедр Ø 1.8 м',    2023, 12);

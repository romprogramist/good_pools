-- Секция «От рендера до реальности»: singleton-настройки + список слайдов

CREATE TABLE IF NOT EXISTS rr_section (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  subtitle   TEXT
);

CREATE TABLE IF NOT EXISTS rr_slides (
  id            SERIAL PRIMARY KEY,
  caption_title VARCHAR(200) NOT NULL,
  caption_meta  VARCHAR(300),
  render_image  VARCHAR(255) NOT NULL,
  real_image    VARCHAR(255) NOT NULL,
  sort_order    INT          DEFAULT 0,
  created_at    TIMESTAMP    DEFAULT NOW()
);

-- Сид: переносим текущий хардкод из index.html, только если секция ещё не настроена
INSERT INTO rr_section (title, subtitle)
SELECT
  E'ОТ РЕНДЕРА\nДО РЕАЛЬНОСТИ',
  'Каждый проект сначала живёт в 3D. Сравните, что обещали — и что построили.'
WHERE NOT EXISTS (SELECT 1 FROM rr_section);

INSERT INTO rr_slides (caption_title, caption_meta, render_image, real_image, sort_order)
SELECT * FROM (VALUES
  ('Бассейн с водопадом',  'Композитная чаша · бетонная скамья-фонтан',   'images/render-vs-reality/pair1-render.jpg', 'images/render-vs-reality/pair1-real.jpg', 1),
  ('Длинный лап-пул',      'Переливная система · подкатное укрытие',       'images/render-vs-reality/pair2-render.jpg', 'images/render-vs-reality/pair2-real.jpg', 2),
  ('Зона отдыха у воды',   'Натуральный камень · бирюзовая отделка чаши', 'images/render-vs-reality/pair3-render.jpg', 'images/render-vs-reality/pair3-real.jpg', 3)
) AS v(caption_title, caption_meta, render_image, real_image, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM rr_slides);

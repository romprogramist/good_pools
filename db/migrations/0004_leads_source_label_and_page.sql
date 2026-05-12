-- 0004_leads_source_label_and_page.sql
-- Добавляет человеко-читаемое название формы и URL-путь страницы заявки.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_label VARCHAR(64);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_path    VARCHAR(255);

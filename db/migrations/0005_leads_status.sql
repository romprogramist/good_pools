-- 0005_leads_status.sql
-- Добавляет статус обработки заявки и время перехода в "обработана".

ALTER TABLE leads ADD COLUMN IF NOT EXISTS status        VARCHAR(16) NOT NULL DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS processed_at  TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);

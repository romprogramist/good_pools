-- 0003_leads.sql
-- Таблица заявок с фиксацией согласия на обработку ПД (152-ФЗ).

CREATE TABLE IF NOT EXISTS leads (
  id                BIGSERIAL PRIMARY KEY,
  source            VARCHAR(32)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  phone             VARCHAR(32)  NOT NULL,
  email             VARCHAR(255),
  payload           JSONB,
  consent_given     BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_marketing BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  consent_ip        VARCHAR(64),
  policy_version    VARCHAR(32)  NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_source_idx     ON leads (source);

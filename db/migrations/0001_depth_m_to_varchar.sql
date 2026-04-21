-- depth_m: numeric(4,1) → varchar(20), чтобы хранить диапазоны вроде "1.4 - 1.6"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name  = 'models'
      AND column_name = 'depth_m'
      AND data_type   = 'numeric'
  ) THEN
    ALTER TABLE models
      ALTER COLUMN depth_m TYPE varchar(20)
      USING depth_m::varchar;
  END IF;
END $$;

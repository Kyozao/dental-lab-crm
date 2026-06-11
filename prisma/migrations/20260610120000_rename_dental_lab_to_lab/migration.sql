DO $$
BEGIN
  IF to_regclass('public.dental_labs') IS NOT NULL
    AND to_regclass('public.labs') IS NULL THEN
    ALTER TABLE "dental_labs" RENAME TO "labs";
  END IF;

  IF to_regclass('public.user_lab_memberships') IS NOT NULL
    AND to_regclass('public.lab_members') IS NULL THEN
    ALTER TABLE "user_lab_memberships" RENAME TO "lab_members";
  END IF;
END $$;

DROP FUNCTION IF EXISTS _rename_column_if_exists(text, text, text);

CREATE OR REPLACE FUNCTION _rename_column_if_exists(target_table_name text, old_column_name text, new_column_name text)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND columns.table_name = target_table_name
      AND column_name = old_column_name
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND columns.table_name = target_table_name
      AND column_name = new_column_name
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', target_table_name, old_column_name, new_column_name);
  END IF;
END;
$$ LANGUAGE plpgsql;

SELECT _rename_column_if_exists('lab_customers', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('lab_members', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('service_types', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('processes', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('milling_drills', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('case_millings', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('clinics', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('dentists', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('components', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('block_types', 'dental_lab_id', 'lab_id');
SELECT _rename_column_if_exists('cases', 'dental_lab_id', 'lab_id');

DROP FUNCTION _rename_column_if_exists(text, text, text);

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT schemaname, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE '%dental_lab_id%' OR indexname LIKE '%dental_labs%' OR indexname LIKE '%user_lab_memberships%')
  LOOP
    EXECUTE format('ALTER INDEX %I.%I RENAME TO %I',
      item.schemaname,
      item.indexname,
      replace(
        replace(
          replace(item.indexname, 'user_lab_memberships', 'lab_members'),
          'dental_labs',
          'labs'
        ),
        'dental_lab_id',
        'lab_id'
      )
    );
  END LOOP;
END $$;

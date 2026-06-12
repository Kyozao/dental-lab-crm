DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'labs',
    'lab_members',
    'service_types',
    'processes',
    'milling_drills',
    'case_millings',
    'case_attachments',
    'customers',
    'dentists',
    'components',
    'case_component_usages',
    'block_types',
    'cases',
    'case_processes',
    'case_process_dependencies',
    'case_status_histories',
    'notifications',
    'push_subscriptions'
  ]
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id DROP DEFAULT', table_name);
    END IF;
  END LOOP;
END
$$;

UPDATE "service_types"
SET "workflow_json" = jsonb_build_object(
  'steps',
  COALESCE(
    (
      SELECT jsonb_agg(
        (step.value - 'minutes_per_unit' - 'points_per_unit' - 'dependency_lag_days')
      )
      FROM jsonb_array_elements(COALESCE("workflow_json"->'steps', '[]'::jsonb)) AS step(value)
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("workflow_json"->'steps') = 'array';

ALTER TABLE "case_processes"
DROP COLUMN IF EXISTS "snapshot_minutes_per_unit",
DROP COLUMN IF EXISTS "snapshot_dependency_lag_days";

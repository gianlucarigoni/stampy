-- Deletes ALL rows from every table in the `public` schema. Keeps tables, columns, FKs,
-- indexes, EXCLUDE constraints (promotions_no_overlap) and the `drizzle` migrations schema.
-- DEV DATABASE ONLY. Run with:
--   docker exec -i stampy-db psql -U stampy -d stampy_dev -v ON_ERROR_STOP=1 < scripts/reset-data.sql
-- One TRUNCATE listing every table at once is accepted by Postgres even with RESTRICT FKs.
DO $$
DECLARE
  tables text;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO tables
    FROM pg_tables
   WHERE schemaname = 'public';

  IF tables IS NULL THEN
    RAISE NOTICE 'No tables in public: nothing to do';
    RETURN;
  END IF;

  EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY';
  RAISE NOTICE 'Truncated: %', tables;
END
$$;

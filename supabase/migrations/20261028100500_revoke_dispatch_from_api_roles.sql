-- Supabase grants EXECUTE on public functions to anon and authenticated.
-- REVOKE FROM PUBLIC does not remove those grants, so PostgREST could call
-- public.dispatch at /rest/v1/rpc/dispatch with the anon key.
-- The same revoke applies to every other SECURITY DEFINER function in public
-- (session_secret included). service_role keeps EXECUTE so the Edge Function works.
-- Local Postgres has no anon or authenticated role; that revoke is skipped.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', fn);
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.dispatch(text, text, text, jsonb) TO service_role;
  GRANT EXECUTE ON FUNCTION public.session_secret() TO service_role;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

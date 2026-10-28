-- Session pepper and non-secret function settings.
-- The pepper is created inside the database with gen_random_bytes when Vault
-- is available. This file never contains the value. Hosted Supabase has the
-- vault schema. Local Postgres used by tests does not, and this file skips it.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS private_config (
  name text PRIMARY KEY,
  value text NOT NULL
);

COMMENT ON TABLE private_config IS
  'Non-secret Edge Function settings. Not exposed to anon or authenticated. DEV_FIXED_OTP is test-only.';

ALTER TABLE private_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE private_config FROM PUBLIC;

DO $$ BEGIN
  REVOKE ALL ON TABLE private_config FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  GRANT SELECT ON TABLE private_config TO service_role;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Reads vault.decrypted_secrets. Only service_role may execute it.
-- Returns null when Vault is not installed, so local tests still migrate.
CREATE OR REPLACE FUNCTION public.session_secret() RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := current_setting('request.jwt.claim.role', true);
  IF jwt_role IS NULL OR jwt_role = '' THEN
    BEGIN
      jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
    EXCEPTION WHEN OTHERS THEN
      jwt_role := NULL;
    END;
  END IF;
  IF jwt_role IN ('anon', 'authenticated') OR current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'session secret is not available' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'vault') THEN
    RETURN NULL;
  END IF;
  RETURN (
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'nsnp_session_secret'
    LIMIT 1
  );
EXCEPTION
  WHEN undefined_table OR invalid_schema_name THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.session_secret() FROM PUBLIC;

DO $$ BEGIN
  REVOKE ALL ON FUNCTION public.session_secret() FROM anon, authenticated;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.session_secret() TO service_role;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create the pepper only when Vault exists and the name is not already there.
-- The random value stays in Vault. It is not returned and not written to git.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'vault')
     AND NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'nsnp_session_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'nsnp_session_secret',
      'NSNP trial session pepper. Generated in the database.'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_function OR invalid_schema_name THEN
    NULL;
END $$;

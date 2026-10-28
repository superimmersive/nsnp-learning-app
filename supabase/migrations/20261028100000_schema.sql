-- Standalone schema for the NSNP trial. Safe to run again.
-- Table person is the plan's user table. Ids are text we choose, not generated.

-- Phase 1 trial schema. Table `person` is the plan's `user` table
-- (`user` is a reserved word). Internal ids are text so the website can
-- keep the same identifiers it already uses.

CREATE TABLE IF NOT EXISTS province (
  id text PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS district (
  id text PRIMARY KEY,
  province_id text NOT NULL REFERENCES province (id),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS school (
  id text PRIMARY KEY,
  district_id text NOT NULL REFERENCES district (id),
  school_number text NOT NULL UNIQUE,
  name text NOT NULL,
  phase text CHECK (phase IN ('primary', 'secondary', 'combined', 'special')),
  quintile integer CHECK (quintile BETWEEN 1 AND 5),
  enrolment integer CHECK (enrolment IS NULL OR enrolment >= 0),
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS person (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  surname text NOT NULL,
  cellphone text NOT NULL UNIQUE,
  locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'af', 'xh')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS membership (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES person (id),
  role text NOT NULL CHECK (role IN (
    'food_handler', 'smt_member', 'nsnp_coordinator', 'principal',
    'district_official', 'province_admin', 'super_admin'
  )),
  scope text NOT NULL CHECK (scope IN ('school', 'district', 'province', 'platform')),
  school_id text REFERENCES school (id),
  district_id text REFERENCES district (id),
  province_id text REFERENCES province (id),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'removed')),
  approved_by text REFERENCES membership (id),
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  CHECK (
    (scope = 'school' AND school_id IS NOT NULL AND district_id IS NULL AND province_id IS NULL)
    OR (scope = 'district' AND district_id IS NOT NULL AND school_id IS NULL AND province_id IS NULL)
    OR (scope = 'province' AND province_id IS NOT NULL AND school_id IS NULL AND district_id IS NULL)
    OR (scope = 'platform' AND school_id IS NULL AND district_id IS NULL AND province_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS official_assignment (
  membership_id text NOT NULL REFERENCES membership (id),
  school_id text NOT NULL REFERENCES school (id),
  PRIMARY KEY (membership_id, school_id)
);

CREATE TABLE IF NOT EXISTS join_code (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES school (id),
  code text NOT NULL UNIQUE,
  cellphone text NOT NULL,
  intended_role text NOT NULL CHECK (intended_role IN ('nsnp_coordinator', 'principal')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  withdrawn_at timestamptz,
  issued_by text NOT NULL REFERENCES membership (id)
);

CREATE TABLE IF NOT EXISTS staff_code (
  id text PRIMARY KEY,
  school_id text NOT NULL UNIQUE REFERENCES school (id),
  code text NOT NULL UNIQUE,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_release (
  id text PRIMARY KEY,
  locale text NOT NULL CHECK (locale IN ('en', 'af', 'xh')),
  content_hash text NOT NULL,
  published_at timestamptz NOT NULL,
  note text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS module_progress (
  user_id text NOT NULL REFERENCES person (id),
  module_id text NOT NULL,
  visited boolean NOT NULL DEFAULT false,
  correct integer NOT NULL DEFAULT 0 CHECK (correct >= 0),
  total integer NOT NULL DEFAULT 5 CHECK (total > 0),
  passed boolean NOT NULL DEFAULT false,
  content_release_id text NOT NULL REFERENCES content_release (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempt (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES person (id),
  module_id text NOT NULL,
  content_release_id text NOT NULL REFERENCES content_release (id),
  correct integer NOT NULL,
  total integer NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL,
  client_recorded_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  client_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS certificate (
  id text PRIMARY KEY,
  user_id text NOT NULL UNIQUE REFERENCES person (id),
  school_id text NOT NULL REFERENCES school (id),
  role text NOT NULL,
  content_release_id text NOT NULL REFERENCES content_release (id),
  issued_at timestamptz NOT NULL,
  verification_code text NOT NULL UNIQUE,
  disclaimer text NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_snapshot (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES school (id),
  checklist_id text NOT NULL,
  content_release_id text NOT NULL REFERENCES content_release (id),
  items jsonb NOT NULL,
  submitted_by text NOT NULL REFERENCES membership (id),
  client_recorded_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  note text,
  client_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS daily_feeding_stat (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES school (id),
  feeding_date date NOT NULL,
  menu_number integer,
  breakfast_fed integer NOT NULL CHECK (breakfast_fed >= 0),
  main_meal_fed integer NOT NULL CHECK (main_meal_fed >= 0),
  main_meal_time text NOT NULL,
  submitted_by text NOT NULL REFERENCES membership (id),
  client_recorded_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  clock_plausible boolean NOT NULL DEFAULT true,
  replaces_id text REFERENCES daily_feeding_stat (id),
  correction_reason text,
  note text,
  client_id text UNIQUE,
  CHECK (replaces_id IS NULL OR length(btrim(correction_reason)) > 0)
);

CREATE TABLE IF NOT EXISTS monthly_pack (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES school (id),
  period text NOT NULL,
  attendance_register_sent boolean NOT NULL,
  stock_form_sent boolean NOT NULL,
  proof_of_payment_sent boolean NOT NULL,
  submitted_by text NOT NULL REFERENCES membership (id),
  client_recorded_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  replaces_id text REFERENCES monthly_pack (id),
  correction_reason text,
  client_id text UNIQUE,
  CHECK (replaces_id IS NULL OR length(btrim(correction_reason)) > 0)
);

CREATE TABLE IF NOT EXISTS issue_report (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES school (id),
  created_by text NOT NULL REFERENCES membership (id),
  kind text NOT NULL CHECK (kind IN ('delivery', 'safety', 'forms', 'app', 'other')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status text NOT NULL CHECK (status IN ('open', 'seen', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_by text REFERENCES membership (id),
  seen_at timestamptz,
  closed_by text REFERENCES membership (id),
  closed_at timestamptz,
  client_id text UNIQUE
);

CREATE TABLE IF NOT EXISTS audit_event (
  id text PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_membership_id text NOT NULL REFERENCES membership (id),
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  summary text NOT NULL,
  reason text
);

CREATE TABLE IF NOT EXISTS consent_record (
  id text PRIMARY KEY,
  user_id text REFERENCES person (id),
  cellphone text NOT NULL,
  notice_version text NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  purpose text NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_code (
  id text PRIMARY KEY,
  cellphone text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE TABLE IF NOT EXISTS phone_change (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES person (id),
  new_cellphone text NOT NULL,
  requested_by text NOT NULL REFERENCES membership (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS device (
  id text PRIMARY KEY,
  school_id text REFERENCES school (id),
  last_check_in_at timestamptz,
  marked_used boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS device_pin (
  user_id text NOT NULL REFERENCES person (id),
  device_id text NOT NULL REFERENCES device (id),
  pin_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES person (id),
  membership_id text NOT NULL REFERENCES membership (id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_school_idx ON membership (school_id);
CREATE INDEX IF NOT EXISTS membership_user_idx ON membership (user_id);
CREATE INDEX IF NOT EXISTS daily_stat_school_day_idx ON daily_feeding_stat (school_id, feeding_date);
CREATE INDEX IF NOT EXISTS issue_school_idx ON issue_report (school_id, status);

CREATE OR REPLACE FUNCTION keep_best_progress() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.passed THEN
    NEW.passed := true;
  END IF;
  IF OLD.visited THEN
    NEW.visited := true;
  END IF;
  IF OLD.correct > NEW.correct THEN
    NEW.correct := OLD.correct;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS module_progress_keep_best ON module_progress;
CREATE TRIGGER module_progress_keep_best
  BEFORE UPDATE ON module_progress
  FOR EACH ROW EXECUTE FUNCTION keep_best_progress();

CREATE OR REPLACE FUNCTION assignment_same_district() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM membership AS official
    JOIN school ON school.id = NEW.school_id
    WHERE official.id = NEW.membership_id
      AND official.role = 'district_official'
      AND official.scope = 'district'
      AND official.district_id = school.district_id
  ) THEN
    RAISE EXCEPTION 'assignment school must be in the official district';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS official_assignment_same_district ON official_assignment;
CREATE TRIGGER official_assignment_same_district
  BEFORE INSERT OR UPDATE ON official_assignment
  FOR EACH ROW EXECUTE FUNCTION assignment_same_district();

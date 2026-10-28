-- Fixes from the Supabase advisor: a fixed search_path, an index on each
-- foreign key that had none, and one SELECT policy on staff_code.

ALTER FUNCTION public.assignment_same_district() SET search_path = public;
ALTER FUNCTION public.keep_best_progress() SET search_path = public;
ALTER FUNCTION nsnp.user_id() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.membership_id() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.role() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.scope() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.school_id() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.district_id() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.province_id() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.has_support_reason() SET search_path = public, nsnp;
ALTER FUNCTION nsnp.phones_match(text, text) SET search_path = public, nsnp;

CREATE INDEX IF NOT EXISTS audit_event_actor_membership_id_idx ON audit_event (actor_membership_id);
CREATE INDEX IF NOT EXISTS certificate_content_release_id_idx ON certificate (content_release_id);
CREATE INDEX IF NOT EXISTS certificate_school_id_idx ON certificate (school_id);
CREATE INDEX IF NOT EXISTS checklist_snapshot_content_release_id_idx ON checklist_snapshot (content_release_id);
CREATE INDEX IF NOT EXISTS checklist_snapshot_school_id_idx ON checklist_snapshot (school_id);
CREATE INDEX IF NOT EXISTS checklist_snapshot_submitted_by_idx ON checklist_snapshot (submitted_by);
CREATE INDEX IF NOT EXISTS consent_record_user_id_idx ON consent_record (user_id);
CREATE INDEX IF NOT EXISTS daily_feeding_stat_replaces_id_idx ON daily_feeding_stat (replaces_id);
CREATE INDEX IF NOT EXISTS daily_feeding_stat_submitted_by_idx ON daily_feeding_stat (submitted_by);
CREATE INDEX IF NOT EXISTS device_school_id_idx ON device (school_id);
CREATE INDEX IF NOT EXISTS device_pin_device_id_idx ON device_pin (device_id);
CREATE INDEX IF NOT EXISTS district_province_id_idx ON district (province_id);
CREATE INDEX IF NOT EXISTS issue_report_closed_by_idx ON issue_report (closed_by);
CREATE INDEX IF NOT EXISTS issue_report_created_by_idx ON issue_report (created_by);
CREATE INDEX IF NOT EXISTS issue_report_seen_by_idx ON issue_report (seen_by);
CREATE INDEX IF NOT EXISTS join_code_issued_by_idx ON join_code (issued_by);
CREATE INDEX IF NOT EXISTS join_code_school_id_idx ON join_code (school_id);
CREATE INDEX IF NOT EXISTS membership_approved_by_idx ON membership (approved_by);
CREATE INDEX IF NOT EXISTS membership_district_id_idx ON membership (district_id);
CREATE INDEX IF NOT EXISTS membership_province_id_idx ON membership (province_id);
CREATE INDEX IF NOT EXISTS module_progress_content_release_id_idx ON module_progress (content_release_id);
CREATE INDEX IF NOT EXISTS monthly_pack_replaces_id_idx ON monthly_pack (replaces_id);
CREATE INDEX IF NOT EXISTS monthly_pack_school_id_idx ON monthly_pack (school_id);
CREATE INDEX IF NOT EXISTS monthly_pack_submitted_by_idx ON monthly_pack (submitted_by);
CREATE INDEX IF NOT EXISTS official_assignment_school_id_idx ON official_assignment (school_id);
CREATE INDEX IF NOT EXISTS phone_change_requested_by_idx ON phone_change (requested_by);
CREATE INDEX IF NOT EXISTS phone_change_user_id_idx ON phone_change (user_id);
CREATE INDEX IF NOT EXISTS quiz_attempt_content_release_id_idx ON quiz_attempt (content_release_id);
CREATE INDEX IF NOT EXISTS quiz_attempt_user_id_idx ON quiz_attempt (user_id);
CREATE INDEX IF NOT EXISTS school_district_id_idx ON school (district_id);
CREATE INDEX IF NOT EXISTS session_membership_id_idx ON session (membership_id);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON session (user_id);

-- staff_code_write was FOR ALL, so it also allowed SELECT and overlapped
-- staff_code_read. SELECT stays on the read policy. Writes are separate.
DROP POLICY IF EXISTS staff_code_write ON staff_code;
DROP POLICY IF EXISTS staff_code_insert ON staff_code;
DROP POLICY IF EXISTS staff_code_update ON staff_code;
DROP POLICY IF EXISTS staff_code_delete ON staff_code;

CREATE POLICY staff_code_insert ON staff_code FOR INSERT TO nsnp_app
  WITH CHECK (nsnp.can_read_school(school_id));

CREATE POLICY staff_code_update ON staff_code FOR UPDATE TO nsnp_app
  USING (nsnp.role() IN ('nsnp_coordinator', 'principal', 'district_official') AND nsnp.can_read_school(school_id))
  WITH CHECK (nsnp.can_read_school(school_id));

CREATE POLICY staff_code_delete ON staff_code FOR DELETE TO nsnp_app
  USING (nsnp.role() IN ('nsnp_coordinator', 'principal', 'district_official') AND nsnp.can_read_school(school_id));

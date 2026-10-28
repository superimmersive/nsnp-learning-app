-- Row-level security for the trial access table.
-- nsnp_migrator owns the tables and bypasses RLS. The API uses nsnp_app.

CREATE SCHEMA IF NOT EXISTS nsnp;

CREATE FUNCTION nsnp.user_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.user_id', true), '') $$;

CREATE FUNCTION nsnp.membership_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.membership_id', true), '') $$;

CREATE FUNCTION nsnp.role() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.role', true), '') $$;

CREATE FUNCTION nsnp.scope() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.scope', true), '') $$;

CREATE FUNCTION nsnp.school_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.school_id', true), '') $$;

CREATE FUNCTION nsnp.district_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.district_id', true), '') $$;

CREATE FUNCTION nsnp.province_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('nsnp.province_id', true), '') $$;

CREATE FUNCTION nsnp.has_support_reason() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT length(btrim(coalesce(current_setting('nsnp.support_reason', true), ''))) > 0
$$;

-- Reads school and official_assignment as the table owner so policies do not recurse.
CREATE FUNCTION nsnp.can_read_school(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, nsnp AS $$
  SELECT CASE nsnp.scope()
    WHEN 'school' THEN target IS NOT NULL AND target = nsnp.school_id()
    WHEN 'district' THEN EXISTS (
      SELECT 1 FROM school
      WHERE school.id = target
        AND school.district_id = nsnp.district_id()
        AND (
          NOT EXISTS (
            SELECT 1 FROM official_assignment
            WHERE official_assignment.membership_id = nsnp.membership_id()
          )
          OR EXISTS (
            SELECT 1 FROM official_assignment
            WHERE official_assignment.membership_id = nsnp.membership_id()
              AND official_assignment.school_id = target
          )
        )
    )
    WHEN 'province' THEN EXISTS (
      SELECT 1
      FROM school
      JOIN district ON district.id = school.district_id
      WHERE school.id = target
        AND district.province_id = nsnp.province_id()
    )
    WHEN 'platform' THEN nsnp.has_support_reason()
    ELSE false
  END
$$;

CREATE FUNCTION nsnp.can_see_person(target text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, nsnp AS $$
  SELECT
    (
      nsnp.role() IS DISTINCT FROM 'food_handler'
      AND EXISTS (
        SELECT 1 FROM membership
        WHERE membership.user_id = target
          AND membership.scope = 'school'
          AND nsnp.can_read_school(membership.school_id)
      )
    )
    OR (
      nsnp.scope() = 'district'
      AND EXISTS (
        SELECT 1 FROM membership
        WHERE membership.user_id = target
          AND membership.scope = 'district'
          AND membership.district_id = nsnp.district_id()
      )
    )
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
$$;

ALTER TABLE province ENABLE ROW LEVEL SECURITY;
ALTER TABLE district ENABLE ROW LEVEL SECURITY;
ALTER TABLE school ENABLE ROW LEVEL SECURITY;
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_release ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempt ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_feeding_stat ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_pack ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_change ENABLE ROW LEVEL SECURITY;
ALTER TABLE device ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_pin ENABLE ROW LEVEL SECURITY;
ALTER TABLE session ENABLE ROW LEVEL SECURITY;

CREATE POLICY province_read ON province FOR SELECT TO nsnp_app
  USING (nsnp.user_id() IS NOT NULL);

CREATE POLICY district_read ON district FOR SELECT TO nsnp_app
  USING (
    (nsnp.scope() = 'district' AND id = nsnp.district_id())
    OR (nsnp.scope() = 'school' AND id = (SELECT school.district_id FROM school WHERE school.id = nsnp.school_id()))
    OR (nsnp.scope() = 'province' AND province_id = nsnp.province_id())
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
  );

CREATE POLICY school_read ON school FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(id));

CREATE POLICY person_read ON person FOR SELECT TO nsnp_app
  USING (id = nsnp.user_id() OR nsnp.can_see_person(id));

CREATE POLICY membership_read ON membership FOR SELECT TO nsnp_app
  USING (
    user_id = nsnp.user_id()
    OR (school_id IS NOT NULL AND nsnp.can_read_school(school_id) AND nsnp.role() IS DISTINCT FROM 'food_handler')
    OR (scope = 'district' AND district_id = nsnp.district_id() AND nsnp.scope() IN ('district', 'platform'))
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
  );

CREATE POLICY membership_update ON membership FOR UPDATE TO nsnp_app
  USING (
    status = 'pending'
    AND school_id IS NOT NULL
    AND nsnp.can_read_school(school_id)
    AND nsnp.role() IN ('nsnp_coordinator', 'principal', 'district_official', 'super_admin')
  )
  WITH CHECK (
    status IN ('active', 'removed')
    AND school_id IS NOT NULL
    AND nsnp.can_read_school(school_id)
  );

CREATE POLICY assignment_read ON official_assignment FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id) AND nsnp.role() IS DISTINCT FROM 'food_handler');

CREATE POLICY join_code_read ON join_code FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id) AND nsnp.role() IN ('district_official', 'province_admin', 'super_admin'));

CREATE POLICY join_code_insert ON join_code FOR INSERT TO nsnp_app
  WITH CHECK (
    nsnp.role() IN ('district_official', 'province_admin', 'super_admin')
    AND nsnp.can_read_school(school_id)
    AND issued_by = nsnp.membership_id()
  );

CREATE POLICY join_code_update ON join_code FOR UPDATE TO nsnp_app
  USING (nsnp.role() IN ('district_official', 'province_admin', 'super_admin') AND nsnp.can_read_school(school_id))
  WITH CHECK (nsnp.can_read_school(school_id));

CREATE POLICY staff_code_read ON staff_code FOR SELECT TO nsnp_app
  USING (
    nsnp.can_read_school(school_id)
    AND nsnp.role() IN ('nsnp_coordinator', 'principal', 'district_official', 'province_admin', 'super_admin')
  );

CREATE POLICY staff_code_write ON staff_code FOR ALL TO nsnp_app
  USING (nsnp.role() IN ('nsnp_coordinator', 'principal', 'district_official') AND nsnp.can_read_school(school_id))
  WITH CHECK (nsnp.can_read_school(school_id));

CREATE POLICY release_read ON content_release FOR SELECT TO nsnp_app
  USING (nsnp.user_id() IS NOT NULL);

CREATE POLICY progress_read ON module_progress FOR SELECT TO nsnp_app
  USING (
    user_id = nsnp.user_id()
    OR (
      nsnp.role() IS DISTINCT FROM 'food_handler'
      AND EXISTS (
        SELECT 1 FROM membership
        WHERE membership.user_id = module_progress.user_id
          AND membership.scope = 'school'
          AND nsnp.can_read_school(membership.school_id)
      )
    )
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
  );

CREATE POLICY progress_insert ON module_progress FOR INSERT TO nsnp_app
  WITH CHECK (user_id = nsnp.user_id());

CREATE POLICY progress_update ON module_progress FOR UPDATE TO nsnp_app
  USING (user_id = nsnp.user_id())
  WITH CHECK (user_id = nsnp.user_id());

-- Quiz answers stay with the person. A platform read still needs a support reason.
CREATE POLICY attempt_read ON quiz_attempt FOR SELECT TO nsnp_app
  USING (user_id = nsnp.user_id() OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason()));

CREATE POLICY attempt_insert ON quiz_attempt FOR INSERT TO nsnp_app
  WITH CHECK (user_id = nsnp.user_id());

CREATE POLICY certificate_read ON certificate FOR SELECT TO nsnp_app
  USING (
    user_id = nsnp.user_id()
    OR (nsnp.role() IS DISTINCT FROM 'food_handler' AND nsnp.can_read_school(school_id))
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
  );

CREATE POLICY checklist_read ON checklist_snapshot FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id) AND nsnp.role() IS DISTINCT FROM 'food_handler');

CREATE POLICY checklist_insert ON checklist_snapshot FOR INSERT TO nsnp_app
  WITH CHECK (
    school_id = nsnp.school_id()
    AND submitted_by = nsnp.membership_id()
    AND nsnp.role() IN ('nsnp_coordinator', 'principal')
  );

CREATE POLICY stat_read ON daily_feeding_stat FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id));

CREATE POLICY stat_insert ON daily_feeding_stat FOR INSERT TO nsnp_app
  WITH CHECK (
    school_id = nsnp.school_id()
    AND submitted_by = nsnp.membership_id()
    AND nsnp.role() IN ('food_handler', 'nsnp_coordinator', 'principal')
  );

CREATE POLICY pack_read ON monthly_pack FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id) AND nsnp.role() IS DISTINCT FROM 'food_handler');

CREATE POLICY pack_insert ON monthly_pack FOR INSERT TO nsnp_app
  WITH CHECK (
    school_id = nsnp.school_id()
    AND submitted_by = nsnp.membership_id()
    AND nsnp.role() IN ('nsnp_coordinator', 'principal')
  );

CREATE POLICY issue_read ON issue_report FOR SELECT TO nsnp_app
  USING (nsnp.can_read_school(school_id));

CREATE POLICY issue_insert ON issue_report FOR INSERT TO nsnp_app
  WITH CHECK (
    school_id = nsnp.school_id()
    AND created_by = nsnp.membership_id()
  );

CREATE POLICY issue_update ON issue_report FOR UPDATE TO nsnp_app
  USING (nsnp.can_read_school(school_id) AND nsnp.role() IN ('district_official', 'province_admin', 'super_admin', 'nsnp_coordinator', 'principal'))
  WITH CHECK (nsnp.can_read_school(school_id));

CREATE POLICY audit_read ON audit_event FOR SELECT TO nsnp_app
  USING (
    actor_membership_id = nsnp.membership_id()
    OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason())
  );

CREATE POLICY audit_insert ON audit_event FOR INSERT TO nsnp_app
  WITH CHECK (actor_membership_id = nsnp.membership_id());

CREATE POLICY consent_read ON consent_record FOR SELECT TO nsnp_app
  USING (user_id = nsnp.user_id() OR (nsnp.scope() = 'platform' AND nsnp.has_support_reason()));

CREATE POLICY phone_change_read ON phone_change FOR SELECT TO nsnp_app
  USING (requested_by = nsnp.membership_id() OR user_id = nsnp.user_id());

CREATE POLICY device_all ON device FOR ALL TO nsnp_app
  USING (nsnp.user_id() IS NOT NULL AND (school_id IS NULL OR nsnp.can_read_school(school_id)))
  WITH CHECK (school_id IS NULL OR school_id = nsnp.school_id() OR nsnp.can_read_school(school_id));

-- No policies on sms_code, device_pin, or session: the app role cannot read hashes or tokens.
-- Unauthenticated steps use the migrator role inside explicit queries.

GRANT USAGE ON SCHEMA public, nsnp TO nsnp_app;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO nsnp_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA nsnp TO nsnp_app;
REVOKE ALL ON sms_code, device_pin, session FROM nsnp_app;
REVOKE UPDATE, DELETE ON daily_feeding_stat, monthly_pack, quiz_attempt, audit_event, consent_record, person FROM nsnp_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM nsnp_app;

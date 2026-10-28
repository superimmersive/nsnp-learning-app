-- API entry used by the Edge Function. The function connects with the service
-- role, which bypasses row-level security, so every read and write goes through
-- this function. It loads the session, sets the same nsnp.* settings the
-- policies use, and refuses rows nsnp.can_read_school would refuse.
-- Direct connections as nsnp_app still hit the policies in the previous file.

CREATE OR REPLACE FUNCTION nsnp.phones_match(a text, b text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT length(regexp_replace(coalesce(a, ''), '\D', '', 'g')) >= 9
    AND right(regexp_replace(a, '\D', '', 'g'), 9) = right(regexp_replace(coalesce(b, ''), '\D', '', 'g'), 9)
$$;

CREATE OR REPLACE FUNCTION nsnp.passed_module_count(target_user text) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, nsnp AS $$
  SELECT count(DISTINCT module_id)::integer
  FROM module_progress
  WHERE user_id = target_user
    AND passed
    AND module_id IN (
      'what-is-nsnp', 'preparation-area', 'volunteer-food-handlers', 'nsnp-committee',
      'monthly-forms', 'menu-and-times', 'feeding-with-dignity', 'food-safety',
      'deliveries-and-storage', 'safety', 'daily-statistics'
    )
$$;

DROP FUNCTION IF EXISTS public.dispatch(text, text, text, jsonb);

CREATE FUNCTION public.dispatch(op text, p_token_hash text, reason text, payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, nsnp
AS $$
  DECLARE
  ctx membership%ROWTYPE;
  row join_code%ROWTYPE;
  member membership%ROWTYPE;
  phone text;
  person_id text;
  result jsonb;
BEGIN
  IF op = 'health' THEN
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('ok', true));
  END IF;

  IF op IN ('join_coordinator', 'join_staff', 'sms_verify', 'recover', 'phone_confirm', 'switch_prepare', 'switch_commit') THEN
    NULL;
  ELSE
    SELECT membership.* INTO ctx
    FROM session
    JOIN membership ON membership.id = session.membership_id
    JOIN person ON person.id = session.user_id
    WHERE session.token_hash = p_token_hash
      AND session.expires_at > now()
      AND person.status = 'active';
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 401, 'error', 'Sign in again');
    END IF;
    PERFORM set_config('nsnp.user_id', ctx.user_id, true);
    PERFORM set_config('nsnp.membership_id', ctx.id, true);
    PERFORM set_config('nsnp.role', ctx.role, true);
    PERFORM set_config('nsnp.scope', ctx.scope, true);
    PERFORM set_config('nsnp.school_id', coalesce(ctx.school_id, ''), true);
    PERFORM set_config('nsnp.district_id', coalesce(ctx.district_id, ''), true);
    PERFORM set_config('nsnp.province_id', coalesce(ctx.province_id, ''), true);
    PERFORM set_config('nsnp.support_reason', coalesce(reason, ''), true);
    IF ctx.scope = 'platform' AND length(btrim(coalesce(reason, ''))) = 0 THEN
      RETURN jsonb_build_object('status', 400, 'error', 'A reason is required');
    END IF;
    IF ctx.scope = 'platform' THEN
      INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary, reason)
      VALUES (payload->>'auditId', ctx.id, 'support.viewed', 'platform', 'trial', 'Opened trial records.', reason);
    END IF;
  END IF;

  IF op = 'join_coordinator' THEN
    IF coalesce(payload->>'consent', '') <> 'true' THEN
      RETURN jsonb_build_object('status', 400, 'error', 'Agree to the trial notice first');
    END IF;
    SELECT * INTO row FROM join_code WHERE upper(code) = upper(payload->>'code') FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 400, 'error', 'That code is not on the trial list', 'problem', 'unknown');
    END IF;
    IF row.withdrawn_at IS NOT NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'This code was withdrawn', 'problem', 'withdrawn');
    END IF;
    IF row.used_at IS NOT NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'This code has already been used', 'problem', 'used');
    END IF;
    IF row.expires_at <= now() THEN
      RETURN jsonb_build_object('status', 400, 'error', 'This code has expired', 'problem', 'expired');
    END IF;
    IF NOT nsnp.phones_match(payload->>'cellphone', row.cellphone) THEN
      RETURN jsonb_build_object('status', 400, 'error', 'This code only works with the cellphone the district official recorded', 'problem', 'wrong_number');
    END IF;
    INSERT INTO person (id, first_name, surname, cellphone)
    VALUES (payload->>'userId', payload->>'firstName', payload->>'surname', payload->>'cellphone')
    ON CONFLICT (cellphone) DO UPDATE SET first_name = EXCLUDED.first_name
    RETURNING id INTO phone;
    INSERT INTO membership (id, user_id, role, scope, school_id, status, approved_by)
    VALUES (payload->>'membershipId', phone, 'nsnp_coordinator', 'school', row.school_id, 'active', row.issued_by);
    UPDATE join_code SET used_at = now() WHERE id = row.id;
    INSERT INTO consent_record (id, user_id, cellphone, notice_version, purpose)
    VALUES (payload->>'consentId', phone, payload->>'cellphone', 'trial-placeholder-1', 'Eden and Central Karoo trial');
    INSERT INTO sms_code (id, cellphone, code_hash, purpose, expires_at)
    VALUES (payload->>'smsId', payload->>'cellphone', payload->>'otpHash', 'join', now() + interval '10 minutes');
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('userId', phone, 'membershipId', payload->>'membershipId', 'schoolId', row.school_id), 'sms', jsonb_build_object('to', payload->>'cellphone'));
  END IF;

  IF op = 'sms_verify' THEN
    UPDATE sms_code SET used_at = now()
    WHERE id = (
      SELECT id FROM sms_code
      WHERE cellphone = payload->>'cellphone'
        AND purpose = coalesce(payload->>'purpose', 'join')
        AND used_at IS NULL
        AND expires_at > now()
        AND code_hash = payload->>'otpHash'
      ORDER BY expires_at DESC
      LIMIT 1
    )
    RETURNING id INTO phone;
    IF phone IS NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'That SMS code does not match');
    END IF;
    SELECT id INTO phone FROM person WHERE cellphone = payload->>'cellphone';
    IF phone IS NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'We do not have this cellphone on the trial');
    END IF;
    SELECT * INTO member FROM membership WHERE user_id = phone AND status IN ('active', 'pending') ORDER BY status, starts_on DESC LIMIT 1;
    IF member.id IS NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'There is no membership for this cellphone');
    END IF;
    INSERT INTO session (id, user_id, membership_id, token_hash, expires_at)
    VALUES (payload->>'sessionId', phone, member.id, payload->>'tokenHash', now() + interval '30 days');
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('token', payload->>'token', 'userId', phone, 'membershipId', member.id));
  END IF;

  IF op = 'recover' THEN
    IF NOT EXISTS (SELECT 1 FROM person WHERE cellphone = payload->>'cellphone' AND status = 'active') THEN
      RETURN jsonb_build_object('status', 400, 'error', 'We do not have this cellphone on the trial');
    END IF;
    INSERT INTO sms_code (id, cellphone, code_hash, purpose, expires_at)
    VALUES (payload->>'smsId', payload->>'cellphone', payload->>'otpHash', 'recover', now() + interval '10 minutes');
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('sent', true), 'sms', jsonb_build_object('to', payload->>'cellphone'));
  END IF;

  IF op = 'set_pin' THEN
    IF ctx.status <> 'active' THEN
      RETURN jsonb_build_object('status', 403, 'error', 'The coordinator still needs to approve you.');
    END IF;
    INSERT INTO device (id, school_id, last_check_in_at, marked_used)
    VALUES (payload->>'deviceId', ctx.school_id, now(), coalesce((payload->>'markUsed')::boolean, false))
    ON CONFLICT (id) DO UPDATE SET last_check_in_at = now();
    INSERT INTO device_pin (user_id, device_id, pin_hash)
    VALUES (ctx.user_id, payload->>'deviceId', payload->>'pinHash')
    ON CONFLICT (user_id, device_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('deviceId', payload->>'deviceId'));
  END IF;

  IF op = 'join_staff' THEN
    IF coalesce(payload->>'consent', '') <> 'true' THEN
      RETURN jsonb_build_object('status', 400, 'error', 'Agree to the trial notice first');
    END IF;
    IF payload->>'role' NOT IN ('food_handler', 'smt_member', 'principal') THEN
      RETURN jsonb_build_object('status', 400, 'error', 'Choose a role');
    END IF;
    PERFORM 1 FROM staff_code WHERE upper(code) = upper(payload->>'code');
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 400, 'error', 'That staff code is not on the trial list', 'problem', 'unknown');
    END IF;
    SELECT school_id INTO phone FROM staff_code WHERE upper(code) = upper(payload->>'code');
    INSERT INTO person (id, first_name, surname, cellphone)
    VALUES (payload->>'userId', payload->>'firstName', payload->>'surname', payload->>'cellphone')
    ON CONFLICT (cellphone) DO UPDATE SET surname = EXCLUDED.surname
    RETURNING id INTO person_id;
    INSERT INTO membership (id, user_id, role, scope, school_id, status)
    VALUES (payload->>'membershipId', person_id, payload->>'role', 'school', phone, 'pending');
    INSERT INTO sms_code (id, cellphone, code_hash, purpose, expires_at)
    VALUES (payload->>'smsId', payload->>'cellphone', payload->>'otpHash', 'join', now() + interval '10 minutes');
    RETURN jsonb_build_object(
      'status', 200,
      'body', jsonb_build_object('userId', person_id, 'membershipId', payload->>'membershipId', 'schoolId', phone, 'status', 'pending'),
      'sms', jsonb_build_object('to', payload->>'cellphone')
    );
  END IF;

  IF op = 'switch_commit' THEN
    SELECT id INTO member FROM membership
    WHERE user_id = payload->>'userId' AND status = 'active'
    ORDER BY starts_on DESC LIMIT 1;
    IF member.id IS NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'That person is not active');
    END IF;
    INSERT INTO session (id, user_id, membership_id, token_hash, expires_at)
    VALUES (payload->>'sessionId', payload->>'userId', member.id, payload->>'tokenHash', now() + interval '30 days');
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('token', payload->>'token', 'userId', payload->>'userId', 'membershipId', member.id));
  END IF;

  IF op = 'snapshot' THEN
    IF ctx.role NOT IN ('district_official', 'province_admin', 'super_admin') THEN
      RETURN jsonb_build_object('status', 403, 'error', 'The trial dashboard is for district officials');
    END IF;
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object(
      'asOf', to_jsonb(now()),
      'province', COALESCE((SELECT jsonb_build_object('id', id, 'name', name) FROM province LIMIT 1), '{}'::jsonb),
      'district', COALESCE((
        SELECT jsonb_build_object('id', id, 'provinceId', province_id, 'name', name, 'active', active)
        FROM district
        WHERE id = nsnp.district_id() OR nsnp.scope() = 'platform'
        ORDER BY name LIMIT 1
      ), '{}'::jsonb),
      'schools', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id, 'districtId', district_id, 'schoolNumber', school_number, 'name', name,
          'phase', phase, 'quintile', quintile, 'enrolment', enrolment, 'active', active
        ) ORDER BY name) FROM school WHERE nsnp.can_read_school(id)
      ), '[]'::jsonb),
      'users', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'firstName', first_name, 'surname', surname, 'cellphone', cellphone,
        'locale', locale, 'status', status, 'createdAt', created_at
      )) FROM person WHERE id = nsnp.user_id() OR nsnp.can_see_person(id)), '[]'::jsonb),
      'memberships', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'userId', user_id, 'role', role, 'scope', scope, 'schoolId', school_id,
        'districtId', district_id, 'provinceId', province_id, 'status', status,
        'approvedBy', approved_by, 'startsOn', starts_on, 'endsOn', ends_on
      )) FROM membership WHERE user_id = nsnp.user_id()
        OR (school_id IS NOT NULL AND nsnp.can_read_school(school_id) AND nsnp.role() IS DISTINCT FROM 'food_handler')
        OR (scope = 'district' AND district_id = nsnp.district_id())), '[]'::jsonb),
      'officialAssignments', COALESCE((SELECT jsonb_agg(jsonb_build_object('membershipId', membership_id, 'schoolId', school_id))
        FROM official_assignment WHERE nsnp.can_read_school(school_id)), '[]'::jsonb),
      'joinCodes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'schoolId', school_id, 'code', code, 'cellphone', cellphone, 'intendedRole', intended_role,
        'expiresAt', expires_at, 'usedAt', used_at, 'withdrawnAt', withdrawn_at, 'issuedBy', issued_by
      )) FROM join_code WHERE nsnp.can_read_school(school_id) AND nsnp.role() IN ('district_official', 'province_admin', 'super_admin')), '[]'::jsonb),
      'staffCodes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'schoolId', school_id, 'code', code, 'refreshedAt', refreshed_at))
        FROM staff_code WHERE nsnp.can_read_school(school_id)), '[]'::jsonb),
      'contentReleases', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'locale', locale, 'contentHash', content_hash, 'publishedAt', published_at, 'note', note
      )) FROM content_release), '[]'::jsonb),
      'moduleProgress', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'userId', user_id, 'moduleId', module_id, 'visited', visited, 'correct', correct, 'total', total,
        'passed', passed, 'contentReleaseId', content_release_id, 'updatedAt', updated_at
      )) FROM module_progress WHERE user_id = nsnp.user_id() OR EXISTS (
        SELECT 1 FROM membership AS learner
        WHERE learner.user_id = module_progress.user_id
          AND learner.scope = 'school'
          AND nsnp.can_read_school(learner.school_id)
          AND nsnp.role() IS DISTINCT FROM 'food_handler'
      )), '[]'::jsonb),
      'certificates', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'userId', user_id, 'schoolId', school_id, 'role', role, 'contentReleaseId', content_release_id,
        'issuedAt', issued_at, 'verificationCode', verification_code
      )) FROM certificate WHERE nsnp.can_read_school(school_id) OR user_id = nsnp.user_id()), '[]'::jsonb),
      'dailyStats', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'schoolId', school_id, 'feedingDate', feeding_date, 'menuNumber', menu_number,
        'breakfastFed', breakfast_fed, 'mainMealFed', main_meal_fed, 'mainMealTime', main_meal_time,
        'submittedBy', submitted_by, 'clientRecordedAt', client_recorded_at, 'serverReceivedAt', server_received_at,
        'clockPlausible', clock_plausible, 'replacesId', replaces_id, 'correctionReason', correction_reason
      )) FROM daily_feeding_stat WHERE nsnp.can_read_school(school_id)), '[]'::jsonb),
      'monthlyPacks', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'schoolId', school_id, 'period', period, 'attendanceRegisterSent', attendance_register_sent,
        'stockFormSent', stock_form_sent, 'proofOfPaymentSent', proof_of_payment_sent, 'submittedBy', submitted_by,
        'clientRecordedAt', client_recorded_at, 'serverReceivedAt', server_received_at,
        'replacesId', replaces_id, 'correctionReason', correction_reason
      )) FROM monthly_pack WHERE nsnp.can_read_school(school_id)), '[]'::jsonb),
      'issues', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'schoolId', school_id, 'createdBy', created_by, 'kind', kind, 'body', body, 'status', status,
        'createdAt', created_at, 'seenBy', seen_by, 'seenAt', seen_at, 'closedBy', closed_by, 'closedAt', closed_at
      )) FROM issue_report WHERE nsnp.can_read_school(school_id)), '[]'::jsonb),
      'auditEvents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'at', at, 'actorMembershipId', actor_membership_id, 'action', action,
        'subjectType', subject_type, 'subjectId', subject_id, 'summary', summary, 'reason', audit_event.reason
      ) ORDER BY at DESC) FROM audit_event WHERE actor_membership_id = nsnp.membership_id() OR nsnp.scope() = 'platform'), '[]'::jsonb)
    ));
  END IF;

  IF op = 'switch_prepare' THEN
    IF NOT EXISTS (
      SELECT 1 FROM device
      WHERE id = payload->>'deviceId'
        AND last_check_in_at IS NOT NULL
        AND last_check_in_at > now() - interval '7 days'
    ) THEN
      RETURN jsonb_build_object('status', 403, 'error', 'This phone needs a signal before it will switch person.');
    END IF;
    SELECT pin_hash INTO phone FROM device_pin WHERE device_id = payload->>'deviceId' AND user_id = payload->>'userId';
    IF phone IS NULL THEN
      RETURN jsonb_build_object('status', 400, 'error', 'That PIN does not match.');
    END IF;
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('pinHash', phone));
  END IF;

  IF op = 'issue_certificate' THEN
    IF ctx.status <> 'active' THEN
      RETURN jsonb_build_object('status', 403, 'error', 'The coordinator still needs to approve you.');
    END IF;
    IF nsnp.passed_module_count(ctx.user_id) < 11 THEN
      RETURN jsonb_build_object('status', 400, 'error', 'Pass all 11 modules before a certificate is issued');
    END IF;
    IF EXISTS (SELECT 1 FROM certificate WHERE user_id = ctx.user_id) THEN
      SELECT jsonb_build_object('id', id, 'verificationCode', verification_code, 'alreadyIssued', true) INTO result
      FROM certificate WHERE user_id = ctx.user_id;
      RETURN jsonb_build_object('status', 200, 'body', result);
    END IF;
    INSERT INTO certificate (id, user_id, school_id, role, content_release_id, issued_at, verification_code, disclaimer)
    VALUES (
      payload->>'id', ctx.user_id, ctx.school_id, ctx.role, 'release-en-2026', now(), payload->>'verificationCode',
      'This is a learning record, not an official WCED certificate.'
    );
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('id', payload->>'id', 'verificationCode', payload->>'verificationCode', 'alreadyIssued', false));
  END IF;

  IF op = 'save_progress' THEN
    IF ctx.status <> 'active' THEN
      RETURN jsonb_build_object('status', 403, 'error', 'The coordinator still needs to approve you.');
    END IF;
    INSERT INTO module_progress (user_id, module_id, visited, correct, total, passed, content_release_id)
    SELECT ctx.user_id, item->>'moduleId', true, coalesce((item->>'correct')::int, 4), coalesce((item->>'total')::int, 5), true, 'release-en-2026'
    FROM jsonb_array_elements(coalesce(payload->'modules', '[]'::jsonb)) AS item
    WHERE coalesce(item->>'passed', '') IN ('true', 't')
    ON CONFLICT (user_id, module_id) DO UPDATE
      SET visited = true, correct = EXCLUDED.correct, total = EXCLUDED.total, passed = true, updated_at = now();
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('ok', true, 'passed', nsnp.passed_module_count(ctx.user_id)));
  END IF;

  IF op = 'daily_stat' THEN
    IF ctx.status <> 'active' OR ctx.role NOT IN ('nsnp_coordinator', 'principal') OR ctx.school_id IS DISTINCT FROM payload->>'schoolId' THEN
      RETURN jsonb_build_object('status', 403, 'error', 'The coordinator or principal sends the count');
    END IF;
    IF NOT nsnp.can_read_school(payload->>'schoolId') THEN
      RETURN jsonb_build_object('status', 403, 'error', 'This count is for another school');
    END IF;
    IF coalesce(payload->>'clientId', '') <> '' AND EXISTS (SELECT 1 FROM daily_feeding_stat WHERE client_id = payload->>'clientId') THEN
      SELECT id INTO person_id FROM daily_feeding_stat WHERE client_id = payload->>'clientId';
      RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('id', person_id, 'duplicate', true));
    END IF;
    INSERT INTO daily_feeding_stat (
      id, school_id, feeding_date, menu_number, breakfast_fed, main_meal_fed, main_meal_time,
      submitted_by, client_recorded_at, clock_plausible, client_id
    ) VALUES (
      payload->>'id', payload->>'schoolId', (payload->>'feedingDate')::date, NULLIF(payload->>'menuNumber', '')::int,
      coalesce((payload->>'breakfastFed')::int, 0), coalesce((payload->>'mainMealFed')::int, 0), coalesce(payload->>'mainMealTime', ''),
      ctx.id, coalesce(payload->>'clientRecordedAt', now()::text)::timestamptz,
      abs(extract(epoch FROM (coalesce(payload->>'clientRecordedAt', now()::text)::timestamptz - now()))) <= 600,
      NULLIF(payload->>'clientId', '')
    );
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('id', payload->>'id', 'duplicate', false));
  END IF;

  IF op = 'membership_decision' THEN
    IF ctx.status <> 'active' OR ctx.role NOT IN ('nsnp_coordinator', 'principal', 'district_official', 'super_admin') THEN
      RETURN jsonb_build_object('status', 403, 'error', 'You cannot approve people');
    END IF;
    UPDATE membership
    SET status = payload->>'decision',
        approved_by = ctx.id,
        ends_on = CASE WHEN payload->>'decision' = 'removed' THEN CURRENT_DATE ELSE NULL END
    WHERE id = payload->>'id'
      AND status = 'pending'
      AND school_id IS NOT NULL
      AND nsnp.can_read_school(school_id);
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 404, 'error', 'That person is not waiting for approval');
    END IF;
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('ok', true));
  END IF;

  IF op = 'issue_create' THEN
    IF ctx.status <> 'active' OR ctx.school_id IS DISTINCT FROM payload->>'schoolId' OR NOT nsnp.can_read_school(payload->>'schoolId') THEN
      RETURN jsonb_build_object('status', 403, 'error', 'This issue is for another school');
    END IF;
    INSERT INTO issue_report (id, school_id, created_by, kind, body, status, client_id)
    VALUES (payload->>'id', payload->>'schoolId', ctx.id, coalesce(payload->>'kind', 'other'), payload->>'body', 'open', NULLIF(payload->>'clientId', ''));
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('id', payload->>'id'));
  END IF;

  IF op = 'issue_code' THEN
    IF ctx.status <> 'active' OR ctx.role NOT IN ('district_official', 'province_admin', 'super_admin') OR NOT nsnp.can_read_school(payload->>'schoolId') THEN
      RETURN jsonb_build_object('status', 403, 'error', 'You cannot issue a code for that school');
    END IF;
    INSERT INTO join_code (id, school_id, code, cellphone, intended_role, expires_at, issued_by)
    VALUES (
      payload->>'id', payload->>'schoolId', upper(payload->>'code'), payload->>'cellphone',
      CASE WHEN payload->>'intendedRole' = 'principal' THEN 'principal' ELSE 'nsnp_coordinator' END,
      now() + interval '14 days', ctx.id
    );
    RETURN jsonb_build_object('status', 200, 'body', jsonb_build_object('id', payload->>'id', 'code', upper(payload->>'code')));
  END IF;

  RETURN jsonb_build_object('status', 404, 'error', 'Not found');
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch(text, text, text, jsonb) FROM PUBLIC;
DO $$ BEGIN
  GRANT EXECUTE ON FUNCTION public.dispatch(text, text, text, jsonb) TO service_role;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

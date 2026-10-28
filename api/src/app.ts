import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { PoolClient } from 'pg'
import type { Config } from './config.ts'
import { withScope, type Database, type MembershipContext } from './db.ts'
import { clockIsPlausible, expectedFeedingDay, feedingPeriod } from './feeding.ts'
import {
  hashPin,
  hashSecret,
  maskPhone,
  oneTimeCode,
  phonesMatch,
  randomId,
  randomToken,
  toE164,
  verifyPin,
} from './hash.ts'
import { pinProblem } from './pin.ts'
import type { SmsProvider } from './sms.ts'
import { HttpError } from './errors.ts'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const NOTICE = 'trial-placeholder-1'
const MODULE_IDS = [
  'what-is-nsnp',
  'preparation-area',
  'volunteer-food-handlers',
  'nsnp-committee',
  'monthly-forms',
  'menu-and-times',
  'feeding-with-dignity',
  'food-safety',
  'deliveries-and-storage',
  'safety',
  'daily-statistics',
]

export { HttpError }

type App = {
  config: Config
  db: Database
  sms: SmsProvider
}

export function createServerApp(app: App): Server {
  return createServer((req, res) => {
    void handle(app, req, res).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500
      const message = error instanceof Error ? error.message : 'Something went wrong'
      if (status === 500) console.error(error)
      send(res, status, { error: message, problem: error instanceof HttpError ? error.problem : undefined })
    })
  })
}

async function handle(app: App, req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders())
    res.end()
    return
  }
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.replace(/\/$/, '') || '/'
  const body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readJson(req)

  if (req.method === 'GET' && path === '/healthz') {
    send(res, 200, { ok: true })
    return
  }
  if (req.method === 'POST' && path === '/v1/join/coordinator') return send(res, 200, await claimCoordinator(app, body))
  if (req.method === 'POST' && path === '/v1/join/staff') return send(res, 200, await claimStaff(app, body))
  if (req.method === 'POST' && path === '/v1/auth/sms/verify') return send(res, 200, await verifySms(app, body))
  if (req.method === 'POST' && path === '/v1/auth/recover') return send(res, 200, await recover(app, body))
  if (req.method === 'POST' && path.startsWith('/v1/devices/') && path.endsWith('/switch')) {
    const deviceId = path.slice('/v1/devices/'.length, -'/switch'.length)
    return send(res, 200, await switchPerson(app, deviceId, body))
  }

  const token = bearer(req)
  if (!token) throw new HttpError(401, 'Sign in first')
  const ctx = await lookup(app, token)
  const reason = header(req, 'x-support-reason')

  if (req.method === 'GET' && path === '/v1/me') return send(res, 200, await me(app, ctx, reason))
  if (req.method === 'GET' && /^\/v1\/schools\/[^/]+\/people$/.test(path)) {
    return send(res, 200, await schoolPeople(app, ctx, reason, path.split('/')[3] ?? ''))
  }
  if (req.method === 'POST' && path === '/v1/me/pin') return send(res, 200, await setPin(app, ctx, body))
  if (req.method === 'POST' && path === '/v1/me/progress') return send(res, 200, await saveProgress(app, ctx, reason, body))
  if (req.method === 'POST' && path === '/v1/me/certificate') return send(res, 200, await issueCertificate(app, ctx, reason))
  if (req.method === 'POST' && path === '/v1/devices/check-in') return send(res, 200, await checkIn(app, ctx, reason, body))
  if (req.method === 'POST' && /^\/v1\/people\/[^/]+\/phone$/.test(path)) {
    return send(res, 200, await startPhoneChange(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/people\/[^/]+\/phone\/confirm$/.test(path)) {
    return send(res, 200, await confirmPhoneChange(app, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/memberships\/[^/]+\/decision$/.test(path)) {
    return send(res, 200, await decideMembership(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/schools\/[^/]+\/daily-stats$/.test(path)) {
    return send(res, 200, await addDailyStat(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/schools\/[^/]+\/daily-stats\/[^/]+\/corrections$/.test(path)) {
    const [, , , schoolId, , statId] = path.split('/')
    return send(res, 200, await correctDailyStat(app, ctx, reason, schoolId ?? '', statId ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/schools\/[^/]+\/monthly-packs$/.test(path)) {
    return send(res, 200, await addMonthlyPack(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/schools\/[^/]+\/issues$/.test(path)) {
    return send(res, 200, await addIssue(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && /^\/v1\/issues\/[^/]+\/seen$/.test(path)) {
    return send(res, 200, await markIssue(app, ctx, reason, path.split('/')[3] ?? '', 'seen'))
  }
  if (req.method === 'POST' && /^\/v1\/issues\/[^/]+\/close$/.test(path)) {
    return send(res, 200, await markIssue(app, ctx, reason, path.split('/')[3] ?? '', 'closed'))
  }
  if (req.method === 'GET' && path === '/v1/officials/snapshot') return send(res, 200, await snapshot(app, ctx, reason))
  if (req.method === 'GET' && path === '/v1/officials/schools') {
    const data = await snapshot(app, ctx, reason)
    const day = expectedFeedingDay(data.asOf)
    const period = feedingPeriod(data.asOf)
    const needs = data.schools.filter((school) => schoolNeedsLook(school.id, data, day, period))
    return send(res, 200, { schools: needs })
  }
  if (req.method === 'GET' && path.startsWith('/v1/officials/schools/')) {
    const schoolId = path.slice('/v1/officials/schools/'.length)
    const data = await snapshot(app, ctx, reason)
    const school = data.schools.find((item) => item.id === schoolId)
    if (!school) throw new HttpError(404, 'School not on the trial list')
    return send(res, 200, {
      school,
      people: data.memberships.filter((item) => item.schoolId === schoolId),
      users: data.users,
      dailyStats: data.dailyStats.filter((item) => item.schoolId === schoolId),
      monthlyPacks: data.monthlyPacks.filter((item) => item.schoolId === schoolId),
      issues: data.issues.filter((item) => item.schoolId === schoolId),
      moduleProgress: data.moduleProgress,
    })
  }
  if (req.method === 'GET' && path === '/v1/officials/export') {
    const data = await snapshot(app, ctx, reason)
    const csv = exportCsv(data)
    res.writeHead(200, { ...corsHeaders(), 'content-type': 'text/csv; charset=utf-8' })
    res.end(csv)
    return
  }
  if (req.method === 'POST' && path === '/v1/join-codes') return send(res, 200, await issueCode(app, ctx, reason, body))
  if (req.method === 'POST' && /^\/v1\/join-codes\/[^/]+\/withdraw$/.test(path)) {
    return send(res, 200, await withdrawCode(app, ctx, reason, path.split('/')[3] ?? ''))
  }
  if (req.method === 'POST' && /^\/v1\/join-codes\/[^/]+\/phone$/.test(path)) {
    return send(res, 200, await updateCodePhone(app, ctx, reason, path.split('/')[3] ?? '', body))
  }
  if (req.method === 'POST' && path === '/v1/officials/support-view') {
    return send(res, 200, await supportView(app, ctx, reason, body))
  }
  throw new HttpError(404, 'Not found')
}

async function claimCoordinator(app: App, body: Record<string, unknown>) {
  requireConsent(body)
  const phone = phoneOrThrow(body.cellphone)
  const code = String(body.code ?? '').trim().toUpperCase()
  const firstName = text(body.firstName, 'Enter your first name')
  const surname = text(body.surname, 'Enter your surname')
  const client = await app.db.owner.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query('SELECT * FROM join_code WHERE upper(code) = $1 FOR UPDATE', [code])
    const row = found.rows[0]
    if (!row) throw new HttpError(400, 'That code is not on the trial list', 'unknown')
    if (row.withdrawn_at) throw new HttpError(400, 'This code was withdrawn', 'withdrawn')
    if (row.used_at) throw new HttpError(400, 'This code has already been used', 'used')
    if (new Date(row.expires_at).getTime() <= Date.now()) throw new HttpError(400, 'This code has expired', 'expired')
    if (!phonesMatch(phone, row.cellphone)) {
      throw new HttpError(400, 'This code only works with the cellphone the district official recorded', 'wrong_number')
    }
    const userId = await upsertPerson(client, firstName, surname, phone)
    const membershipId = randomId('mem')
    await client.query(
      `INSERT INTO membership (id, user_id, role, scope, school_id, status, approved_by)
       VALUES ($1, $2, 'nsnp_coordinator', 'school', $3, 'active', 'mem-official-1')`,
      [membershipId, userId, row.school_id],
    )
    await client.query('UPDATE join_code SET used_at = now() WHERE id = $1', [row.id])
    await client.query('UPDATE consent_record SET user_id = $1 WHERE id = $2', [userId, await recordConsent(client, phone)])
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, 'membership.claimed', 'membership', $3, $4)`,
      [randomId('audit'), row.issued_by, membershipId, `Coordinator joined with code ${row.code}. Phone ${maskPhone(phone)}.`],
    )
    const demoCode = await issueSms(app, client, phone, 'join')
    await client.query('COMMIT')
    return { userId, membershipId, schoolId: row.school_id, demoCode }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function claimStaff(app: App, body: Record<string, unknown>) {
  requireConsent(body)
  const phone = phoneOrThrow(body.cellphone)
  const code = String(body.code ?? '').trim().toUpperCase()
  const role = String(body.role ?? '')
  if (!['food_handler', 'smt_member', 'principal'].includes(role)) throw new HttpError(400, 'Choose a role')
  const client = await app.db.owner.connect()
  try {
    await client.query('BEGIN')
    const found = await client.query('SELECT * FROM staff_code WHERE upper(code) = $1', [code])
    const row = found.rows[0]
    if (!row) throw new HttpError(400, 'That staff code is not on the trial list', 'unknown')
    const userId = await upsertPerson(client, text(body.firstName, 'Enter your first name'), text(body.surname, 'Enter your surname'), phone)
    const membershipId = randomId('mem')
    await client.query(
      `INSERT INTO membership (id, user_id, role, scope, school_id, status)
       VALUES ($1, $2, $3, 'school', $4, 'pending')`,
      [membershipId, userId, role, row.school_id],
    )
    await recordConsent(client, phone, userId)
    const demoCode = await issueSms(app, client, phone, 'join')
    await client.query('COMMIT')
    return { userId, membershipId, schoolId: row.school_id, status: 'pending', demoCode }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function verifySms(app: App, body: Record<string, unknown>) {
  const phone = phoneOrThrow(body.cellphone)
  const code = String(body.code ?? '').trim()
  const client = await app.db.owner.connect()
  try {
    await client.query('BEGIN')
    await consumeSms(app, client, phone, code, String(body.purpose ?? 'join'))
    const person = await client.query('SELECT id FROM person WHERE cellphone = $1', [phone])
    const userId = person.rows[0]?.id as string | undefined
    if (!userId) throw new HttpError(400, 'We do not have this cellphone on the trial')
    const membership = await client.query(
      `SELECT id FROM membership WHERE user_id = $1 AND status IN ('active', 'pending') ORDER BY status, starts_on DESC LIMIT 1`,
      [userId],
    )
    const membershipId = membership.rows[0]?.id as string | undefined
    if (!membershipId) throw new HttpError(400, 'There is no membership for this cellphone')
    const token = await createSession(app, client, userId, membershipId)
    await client.query('COMMIT')
    return { token, userId, membershipId }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function recover(app: App, body: Record<string, unknown>) {
  const phone = phoneOrThrow(body.cellphone)
  const client = await app.db.owner.connect()
  try {
    const person = await client.query(`SELECT id FROM person WHERE cellphone = $1 AND status = 'active'`, [phone])
    if (!person.rows[0]) throw new HttpError(400, 'We do not have this cellphone on the trial')
    const demoCode = await issueSms(app, client, phone, 'recover')
    return { sent: true, demoCode }
  } finally {
    client.release()
  }
}

async function setPin(app: App, ctx: MembershipContext & { status: string }, body: Record<string, unknown>) {
  requireActive(ctx)
  const pin = String(body.pin ?? '')
  const problem = pinProblem(pin)
  if (problem) throw new HttpError(400, problem)
  const deviceId = String(body.deviceId ?? '') || randomId('device')
  await app.db.owner.query(
    `INSERT INTO device (id, school_id, last_check_in_at, marked_used)
     VALUES ($1, $2, now(), $3)
     ON CONFLICT (id) DO UPDATE SET last_check_in_at = now()`,
    [deviceId, ctx.schoolId, Boolean(body.markUsed)],
  )
  await app.db.owner.query(
    `INSERT INTO device_pin (user_id, device_id, pin_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, device_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now()`,
    [ctx.userId, deviceId, hashPin(pin, app.config.pinPepper)],
  )
  return { deviceId }
}

async function checkIn(app: App, ctx: MembershipContext, reason: string | null, body: Record<string, unknown>) {
  const deviceId = String(body.deviceId ?? '')
  if (!deviceId) throw new HttpError(400, 'Missing device')
  await withScope(app.db, ctx, reason, async (client) => {
    const updated = await client.query('UPDATE device SET last_check_in_at = now(), school_id = COALESCE(school_id, $2) WHERE id = $1', [
      deviceId,
      ctx.schoolId,
    ])
    if (updated.rowCount === 0) throw new HttpError(404, 'This phone is not registered')
  })
  return { ok: true }
}

async function switchPerson(app: App, deviceId: string, body: Record<string, unknown>) {
  const pin = String(body.pin ?? '')
  const userId = String(body.userId ?? '')
  const device = await app.db.owner.query('SELECT last_check_in_at FROM device WHERE id = $1', [deviceId])
  const checked = device.rows[0]?.last_check_in_at as Date | undefined
  if (!checked || Date.now() - new Date(checked).getTime() > SEVEN_DAYS_MS) {
    throw new HttpError(403, 'This phone needs a signal before it will switch person.')
  }
  const stored = await app.db.owner.query('SELECT pin_hash FROM device_pin WHERE device_id = $1 AND user_id = $2', [deviceId, userId])
  const hash = stored.rows[0]?.pin_hash as string | undefined
  if (!hash || !verifyPin(pin, hash, app.config.pinPepper)) throw new HttpError(400, 'That PIN does not match.')
  const membership = await app.db.owner.query(
    `SELECT id FROM membership WHERE user_id = $1 AND status = 'active' ORDER BY starts_on DESC LIMIT 1`,
    [userId],
  )
  const membershipId = membership.rows[0]?.id as string | undefined
  if (!membershipId) throw new HttpError(400, 'That person is not active')
  const client = await app.db.owner.connect()
  try {
    await client.query('BEGIN')
    const token = await createSession(app, client, userId, membershipId)
    await client.query('COMMIT')
    return { token, userId, membershipId }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function startPhoneChange(app: App, ctx: MembershipContext, reason: string | null, userId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  if (!['nsnp_coordinator', 'principal', 'district_official'].includes(ctx.role)) {
    throw new HttpError(403, 'Only a coordinator, principal, or district official can change a number')
  }
  const phone = phoneOrThrow(body.cellphone)
  await withScope(app.db, ctx, reason, async (client) => {
    const visible = await client.query('SELECT id FROM person WHERE id = $1', [userId])
    if (!visible.rows[0]) throw new HttpError(404, 'That person is not in your schools')
  })
  const client = await app.db.owner.connect()
  try {
    await client.query(
      `INSERT INTO phone_change (id, user_id, new_cellphone, requested_by) VALUES ($1, $2, $3, $4)`,
      [randomId('phone'), userId, phone, ctx.membershipId],
    )
    const demoCode = await issueSms(app, client, phone, 'phone-change')
    return { sent: true, demoCode }
  } finally {
    client.release()
  }
}

async function confirmPhoneChange(app: App, userId: string, body: Record<string, unknown>) {
  const code = String(body.code ?? '').trim()
  const client = await app.db.owner.connect()
  try {
    await client.query('BEGIN')
    const pending = await client.query(
      `SELECT id, new_cellphone FROM phone_change WHERE user_id = $1 AND confirmed_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [userId],
    )
    const row = pending.rows[0]
    if (!row) throw new HttpError(400, 'There is no number change waiting')
    await consumeSms(app, client, row.new_cellphone, code, 'phone-change')
    await client.query('UPDATE person SET cellphone = $2 WHERE id = $1', [userId, row.new_cellphone])
    await client.query('UPDATE phone_change SET confirmed_at = now() WHERE id = $1', [row.id])
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       SELECT $1, requested_by, 'phone.changed', 'person', $2, $3 FROM phone_change WHERE id = $4`,
      [randomId('audit'), userId, `Updated a cellphone. It now ${maskPhone(row.new_cellphone)}.`, row.id],
    )
    await client.query('COMMIT')
    return { ok: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function decideMembership(app: App, ctx: MembershipContext, reason: string | null, membershipId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  const decision = body.decision === 'removed' ? 'removed' : body.decision === 'active' ? 'active' : ''
  if (!decision) throw new HttpError(400, 'Choose approve or decline')
  await withScope(app.db, ctx, reason, async (client) => {
    const updated = await client.query(
      `UPDATE membership SET status = $2, approved_by = $3, ends_on = CASE WHEN $2 = 'removed' THEN CURRENT_DATE ELSE NULL END
       WHERE id = $1`,
      [membershipId, decision, ctx.membershipId],
    )
    if (updated.rowCount === 0) throw new HttpError(404, 'That person is not waiting for approval')
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, $3, 'membership', $4, $5)`,
      [randomId('audit'), ctx.membershipId, decision === 'active' ? 'membership.approved' : 'membership.declined', membershipId, decision === 'active' ? 'Approved a person.' : 'Declined a person.'],
    )
  })
  return { ok: true }
}

async function addDailyStat(app: App, ctx: MembershipContext, reason: string | null, schoolId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  if (!['nsnp_coordinator', 'principal'].includes(ctx.role)) throw new HttpError(403, 'The coordinator or principal sends the count')
  if (ctx.schoolId !== schoolId) throw new HttpError(403, 'This count is for another school')
  const serverNow = new Date().toISOString()
  const clientAt = String(body.clientRecordedAt ?? serverNow)
  return withScope(app.db, ctx, reason, async (client) => {
    if (body.clientId) {
      const existing = await client.query('SELECT id FROM daily_feeding_stat WHERE client_id = $1', [String(body.clientId)])
      if (existing.rows[0]) return { id: existing.rows[0].id, duplicate: true }
    }
    const id = randomId('stat')
    await client.query(
      `INSERT INTO daily_feeding_stat (
         id, school_id, feeding_date, menu_number, breakfast_fed, main_meal_fed, main_meal_time,
         submitted_by, client_recorded_at, clock_plausible, client_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        schoolId,
        String(body.feedingDate),
        body.menuNumber ?? null,
        Number(body.breakfastFed ?? 0),
        Number(body.mainMealFed ?? 0),
        String(body.mainMealTime ?? ''),
        ctx.membershipId,
        clientAt,
        clockIsPlausible(clientAt, serverNow),
        body.clientId ? String(body.clientId) : null,
      ],
    )
    return { id, duplicate: false }
  })
}

async function correctDailyStat(app: App, ctx: MembershipContext, reason: string | null, schoolId: string, statId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  const reasonText = String(body.correctionReason ?? '').trim()
  if (!reasonText) throw new HttpError(400, 'A correction needs a reason')
  const serverNow = new Date().toISOString()
  const clientAt = String(body.clientRecordedAt ?? serverNow)
  return withScope(app.db, ctx, reason, async (client) => {
    const id = randomId('stat')
    await client.query(
      `INSERT INTO daily_feeding_stat (
         id, school_id, feeding_date, menu_number, breakfast_fed, main_meal_fed, main_meal_time,
         submitted_by, client_recorded_at, clock_plausible, replaces_id, correction_reason, client_id
       )
       SELECT $1, school_id, feeding_date, $2, $3, $4, $5, $6, $7, $8, id, $9, $10
       FROM daily_feeding_stat WHERE id = $11 AND school_id = $12`,
      [
        id,
        body.menuNumber ?? null,
        Number(body.breakfastFed ?? 0),
        Number(body.mainMealFed ?? 0),
        String(body.mainMealTime ?? ''),
        ctx.membershipId,
        clientAt,
        clockIsPlausible(clientAt, serverNow),
        reasonText,
        body.clientId ? String(body.clientId) : null,
        statId,
        schoolId,
      ],
    )
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, 'stat.corrected', 'daily_feeding_stat', $3, 'Corrected a feeding count.')`,
      [randomId('audit'), ctx.membershipId, id],
    )
    return { id }
  })
}

async function addMonthlyPack(app: App, ctx: MembershipContext, reason: string | null, schoolId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  if (!['nsnp_coordinator', 'principal'].includes(ctx.role) || ctx.schoolId !== schoolId) {
    throw new HttpError(403, 'The coordinator or principal confirms the monthly forms')
  }
  return withScope(app.db, ctx, reason, async (client) => {
    const id = randomId('pack')
    await client.query(
      `INSERT INTO monthly_pack (
         id, school_id, period, attendance_register_sent, stock_form_sent, proof_of_payment_sent,
         submitted_by, client_recorded_at, client_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        id,
        schoolId,
        String(body.period),
        Boolean(body.attendanceRegisterSent),
        Boolean(body.stockFormSent),
        Boolean(body.proofOfPaymentSent),
        ctx.membershipId,
        String(body.clientRecordedAt ?? new Date().toISOString()),
        body.clientId ? String(body.clientId) : null,
      ],
    )
    return { id }
  })
}

async function addIssue(app: App, ctx: MembershipContext, reason: string | null, schoolId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  if (ctx.schoolId !== schoolId) throw new HttpError(403, 'This issue is for another school')
  return withScope(app.db, ctx, reason, async (client) => {
    const id = randomId('issue')
    await client.query(
      `INSERT INTO issue_report (id, school_id, created_by, kind, body, status, client_id)
       VALUES ($1,$2,$3,$4,$5,'open',$6)`,
      [id, schoolId, ctx.membershipId, String(body.kind ?? 'other'), String(body.body ?? ''), body.clientId ? String(body.clientId) : null],
    )
    return { id }
  })
}

async function markIssue(app: App, ctx: MembershipContext, reason: string | null, issueId: string, status: 'seen' | 'closed') {
  requireActive(ctx)
  await withScope(app.db, ctx, reason, async (client) => {
    const column = status === 'seen' ? 'seen' : 'closed'
    const updated = await client.query(
      `UPDATE issue_report
       SET status = $2,
           seen_by = COALESCE(seen_by, $3),
           seen_at = COALESCE(seen_at, now()),
           closed_by = CASE WHEN $2 = 'closed' THEN $3 ELSE closed_by END,
           closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE closed_at END
       WHERE id = $1`,
      [issueId, status, ctx.membershipId],
    )
    if (updated.rowCount === 0) throw new HttpError(404, 'Issue not found')
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, $3, 'issue_report', $4, $5)`,
      [randomId('audit'), ctx.membershipId, status === 'seen' ? 'issue.seen' : 'issue.closed', issueId, `${column === 'seen' ? 'Marked' : 'Closed'} an issue.`],
    )
  })
  return { ok: true }
}

async function issueCode(app: App, ctx: MembershipContext, reason: string | null, body: Record<string, unknown>) {
  requireActive(ctx)
  const phone = phoneOrThrow(body.cellphone)
  const role = body.intendedRole === 'principal' ? 'principal' : 'nsnp_coordinator'
  const code = String(body.code ?? '').trim().toUpperCase() || randomToken().slice(0, 6).toUpperCase()
  return withScope(app.db, ctx, reason, async (client) => {
    const id = randomId('code')
    await client.query(
      `INSERT INTO join_code (id, school_id, code, cellphone, intended_role, expires_at, issued_by)
       VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' days')::interval, $7)`,
      [id, String(body.schoolId), code, phone, role, String(app.config.joinCodeDays), ctx.membershipId],
    )
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, 'join_code.issued', 'join_code', $3, $4)`,
      [randomId('audit'), ctx.membershipId, id, `Issued join code ${code}. Phone ${maskPhone(phone)}.`],
    )
    return { id, code }
  })
}

async function withdrawCode(app: App, ctx: MembershipContext, reason: string | null, codeId: string) {
  requireActive(ctx)
  await withScope(app.db, ctx, reason, async (client) => {
    const updated = await client.query(`UPDATE join_code SET withdrawn_at = now() WHERE id = $1 AND used_at IS NULL`, [codeId])
    if (updated.rowCount === 0) throw new HttpError(404, 'That code cannot be withdrawn')
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, 'join_code.withdrawn', 'join_code', $3, 'Withdrew a join code.')`,
      [randomId('audit'), ctx.membershipId, codeId],
    )
  })
  return { ok: true }
}

async function updateCodePhone(app: App, ctx: MembershipContext, reason: string | null, codeId: string, body: Record<string, unknown>) {
  requireActive(ctx)
  const phone = phoneOrThrow(body.cellphone)
  await withScope(app.db, ctx, reason, async (client) => {
    const updated = await client.query(`UPDATE join_code SET cellphone = $2 WHERE id = $1 AND used_at IS NULL AND withdrawn_at IS NULL`, [codeId, phone])
    if (updated.rowCount === 0) throw new HttpError(404, 'That code cannot be changed')
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary)
       VALUES ($1, $2, 'phone.changed', 'join_code', $3, $4)`,
      [randomId('audit'), ctx.membershipId, codeId, `Updated the cellphone on a join code. It now ${maskPhone(phone)}.`],
    )
  })
  return { ok: true }
}

async function supportView(app: App, ctx: MembershipContext, reason: string | null, body: Record<string, unknown>) {
  if (ctx.scope !== 'platform') throw new HttpError(403, 'Support access is for the super-admin')
  const schoolId = String(body.schoolId ?? '')
  const supportReason = String(body.reason ?? reason ?? '').trim()
  if (!supportReason) throw new HttpError(400, 'A reason is required')
  await withScope(app.db, ctx, supportReason, async (client) => {
    const school = await client.query('SELECT name FROM school WHERE id = $1', [schoolId])
    if (!school.rows[0]) throw new HttpError(404, 'School not on the trial list')
    await client.query(
      `INSERT INTO audit_event (id, actor_membership_id, action, subject_type, subject_id, summary, reason)
       VALUES ($1, $2, 'support.viewed', 'school', $3, $4, $5)`,
      [randomId('audit'), ctx.membershipId, schoolId, `Opened ${school.rows[0].name}.`, supportReason],
    )
  })
  return { ok: true }
}

async function saveProgress(app: App, ctx: MembershipContext, reason: string | null, body: Record<string, unknown>) {
  const modules = Array.isArray(body.modules) ? body.modules : []
  await withScope(app.db, ctx, reason, async (client) => {
    for (const item of modules) {
      const row = item as Record<string, unknown>
      if (!row.passed) continue
      await client.query(
        `INSERT INTO module_progress (user_id, module_id, visited, correct, total, passed, content_release_id)
         VALUES ($1, $2, true, $3, $4, true, 'release-en-2026')
         ON CONFLICT (user_id, module_id) DO UPDATE
           SET visited = true, correct = EXCLUDED.correct, total = EXCLUDED.total, passed = true, updated_at = now()`,
        [ctx.userId, String(row.moduleId), Number(row.correct ?? 4), Number(row.total ?? 5)],
      )
    }
  })
  return { ok: true }
}

async function issueCertificate(app: App, ctx: MembershipContext & { status: string }, reason: string | null) {
  requireActive(ctx)
  if (!ctx.schoolId) throw new HttpError(400, 'A certificate needs a school')
  return withScope(app.db, ctx, reason, async (client) => {
    const passed = await client.query(
      `SELECT count(DISTINCT module_id)::int AS n FROM module_progress
       WHERE user_id = $1 AND passed AND module_id = ANY($2)`,
      [ctx.userId, MODULE_IDS],
    )
    if (Number(passed.rows[0]?.n ?? 0) < MODULE_IDS.length) {
      throw new HttpError(400, 'Pass all 11 modules before a certificate is issued')
    }
    const existing = await client.query('SELECT id, verification_code FROM certificate WHERE user_id = $1', [ctx.userId])
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, verificationCode: existing.rows[0].verification_code, alreadyIssued: true }
    }
    const id = randomId('cert')
    const verificationCode = randomToken().slice(0, 8).toUpperCase()
    await client.query(
      `INSERT INTO certificate (id, user_id, school_id, role, content_release_id, issued_at, verification_code, disclaimer)
       VALUES ($1, $2, $3, $4, 'release-en-2026', now(), $5, $6)`,
      [
        id,
        ctx.userId,
        ctx.schoolId,
        ctx.role,
        verificationCode,
        'This is a learning record, not an official WCED certificate.',
      ],
    )
    return { id, verificationCode, alreadyIssued: false }
  })
}

async function schoolPeople(app: App, ctx: MembershipContext, reason: string | null, schoolId: string) {
  return withScope(app.db, ctx, reason, async (client) => {
    const memberships = await client.query(
      'SELECT id, user_id, role, scope, school_id, district_id, province_id, status, approved_by, starts_on, ends_on FROM membership WHERE school_id = $1',
      [schoolId],
    )
    const ids = memberships.rows.map((row) => row.user_id)
    const users = ids.length
      ? await client.query('SELECT id, first_name, surname, cellphone, locale, status, created_at FROM person WHERE id = ANY($1)', [ids])
      : { rows: [] }
    return { memberships: memberships.rows.map(mapMembership), users: users.rows.map(mapUser) }
  })
}

async function me(app: App, ctx: MembershipContext, reason: string | null) {
  return withScope(app.db, ctx, reason, async (client) => {
    const person = await client.query('SELECT id, first_name, surname, cellphone FROM person WHERE id = $1', [ctx.userId])
    const progress = await client.query('SELECT module_id, passed, correct, total FROM module_progress WHERE user_id = $1', [ctx.userId])
    return { person: person.rows[0] ?? null, membership: ctx, progress: progress.rows }
  })
}

async function snapshot(app: App, ctx: MembershipContext, reason: string | null) {
  if (!['district_official', 'province_admin', 'super_admin'].includes(ctx.role)) {
    throw new HttpError(403, 'The trial dashboard is for district officials')
  }
  return withScope(app.db, ctx, reason, async (client) => readSnapshot(client))
}

async function readSnapshot(client: PoolClient) {
  const province = await client.query('SELECT id, name FROM province')
  const district = await client.query('SELECT id, province_id, name, active FROM district')
  const schools = await client.query('SELECT id, district_id, school_number, name, phase, quintile, enrolment, active FROM school ORDER BY name')
  const users = await client.query('SELECT id, first_name, surname, cellphone, locale, status, created_at FROM person')
  const memberships = await client.query('SELECT id, user_id, role, scope, school_id, district_id, province_id, status, approved_by, starts_on, ends_on FROM membership')
  const assignments = await client.query('SELECT membership_id, school_id FROM official_assignment')
  const joinCodes = await client.query('SELECT id, school_id, code, cellphone, intended_role, expires_at, used_at, withdrawn_at, issued_by FROM join_code')
  const staffCodes = await client.query('SELECT id, school_id, code, refreshed_at FROM staff_code')
  const releases = await client.query('SELECT id, locale, content_hash, published_at, note FROM content_release')
  const progress = await client.query('SELECT user_id, module_id, visited, correct, total, passed, content_release_id, updated_at FROM module_progress')
  const certificates = await client.query('SELECT id, user_id, school_id, role, content_release_id, issued_at, verification_code FROM certificate')
  const stats = await client.query(`SELECT id, school_id, feeding_date, menu_number, breakfast_fed, main_meal_fed, main_meal_time, submitted_by,
        client_recorded_at, server_received_at, clock_plausible, replaces_id, correction_reason FROM daily_feeding_stat`)
  const packs = await client.query(`SELECT id, school_id, period, attendance_register_sent, stock_form_sent, proof_of_payment_sent, submitted_by,
        client_recorded_at, server_received_at, replaces_id, correction_reason FROM monthly_pack`)
  const issues = await client.query('SELECT id, school_id, created_by, kind, body, status, created_at, seen_by, seen_at, closed_by, closed_at FROM issue_report')
  const audit = await client.query('SELECT id, at, actor_membership_id, action, subject_type, subject_id, summary, reason FROM audit_event ORDER BY at DESC')
  const districtRow = district.rows[0]
  const provinceRow = province.rows[0]
  return {
    asOf: new Date().toISOString(),
    province: provinceRow ? { id: provinceRow.id, name: provinceRow.name } : { id: '', name: '' },
    district: districtRow
      ? { id: districtRow.id, provinceId: districtRow.province_id, name: districtRow.name, active: districtRow.active }
      : { id: '', provinceId: '', name: '', active: false },
    schools: schools.rows.map(mapSchool),
    users: users.rows.map(mapUser),
    memberships: memberships.rows.map(mapMembership),
    officialAssignments: assignments.rows.map((row) => ({ membershipId: row.membership_id, schoolId: row.school_id })),
    joinCodes: joinCodes.rows.map(mapJoin),
    staffCodes: staffCodes.rows.map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      code: row.code,
      refreshedAt: iso(row.refreshed_at),
    })),
    contentReleases: releases.rows.map((row) => ({
      id: row.id,
      locale: row.locale,
      contentHash: row.content_hash,
      publishedAt: iso(row.published_at),
      note: row.note,
    })),
    moduleProgress: progress.rows.map((row) => ({
      userId: row.user_id,
      moduleId: row.module_id,
      visited: row.visited,
      correct: row.correct,
      total: row.total,
      passed: row.passed,
      contentReleaseId: row.content_release_id,
      updatedAt: iso(row.updated_at),
    })),
    certificates: certificates.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      schoolId: row.school_id,
      role: row.role,
      contentReleaseId: row.content_release_id,
      issuedAt: iso(row.issued_at),
      verificationCode: row.verification_code,
    })),
    dailyStats: stats.rows.map(mapStat),
    monthlyPacks: packs.rows.map(mapPack),
    issues: issues.rows.map(mapIssue),
    auditEvents: audit.rows.map((row) => ({
      id: row.id,
      at: iso(row.at),
      actorMembershipId: row.actor_membership_id,
      action: row.action,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      summary: row.summary,
      reason: row.reason,
    })),
  }
}

function schoolNeedsLook(schoolId: string, data: Awaited<ReturnType<typeof readSnapshot>>, day: string, period: string): boolean {
  const coordinator = data.memberships.some((item) => item.schoolId === schoolId && item.role === 'nsnp_coordinator' && item.status === 'active')
  const open = data.issues.some((item) => item.schoolId === schoolId && item.status === 'open')
  const count = data.dailyStats.some((item) => item.schoolId === schoolId && item.feedingDate === day && !item.replacesId)
  const pack = data.monthlyPacks.find((item) => item.schoolId === schoolId && item.period === period && !item.replacesId)
  const duePassed = feedingPeriodDuePassed(period, data.asOf)
  const monthlyLate = duePassed && (!pack || !pack.attendanceRegisterSent || !pack.stockFormSent || !pack.proofOfPaymentSent)
  return !coordinator || open || !count || monthlyLate
}

function feedingPeriodDuePassed(period: string, asOf: string): boolean {
  const [year, month] = period.split('-').map(Number)
  const dueMonth = month === 12 ? 1 : month + 1
  const dueYear = month === 12 ? year + 1 : year
  const due = `${dueYear}-${String(dueMonth).padStart(2, '0')}-07`
  return asOf.slice(0, 10) >= due
}

function exportCsv(data: Awaited<ReturnType<typeof readSnapshot>>): string {
  const lines = ['school_number,name,phase,active']
  for (const school of data.schools) {
    lines.push([school.schoolNumber, school.name, school.phase ?? '', school.active ? 'Yes' : 'No'].join(','))
  }
  return `${lines.join('\n')}\n`
}

async function issueSms(app: App, client: PoolClient, phone: string, purpose: string): Promise<string | undefined> {
  const code = oneTimeCode()
  await client.query(
    `INSERT INTO sms_code (id, cellphone, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [randomId('sms'), phone, hashSecret(code, app.config.smsPepper), purpose, String(app.config.otpMinutes)],
  )
  await app.sms.send({ to: phone, body: `NSNP trial code ${code}` })
  return app.sms.name === 'console' ? code : undefined
}

async function consumeSms(app: App, client: PoolClient, phone: string, code: string, purpose: string) {
  const found = await client.query(
    `SELECT id, code_hash FROM sms_code
     WHERE cellphone = $1 AND purpose = $2 AND used_at IS NULL AND expires_at > now()
     ORDER BY expires_at DESC LIMIT 1`,
    [phone, purpose],
  )
  const row = found.rows[0]
  if (!row || row.code_hash !== hashSecret(code, app.config.smsPepper)) throw new HttpError(400, 'That SMS code does not match')
  await client.query('UPDATE sms_code SET used_at = now() WHERE id = $1', [row.id])
}

async function createSession(app: App, client: PoolClient, userId: string, membershipId: string) {
  const token = randomToken()
  await client.query(
    `INSERT INTO session (id, user_id, membership_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval)`,
    [randomId('session'), userId, membershipId, hashSecret(token, app.config.tokenPepper), String(app.config.sessionDays)],
  )
  return token
}

async function upsertPerson(client: PoolClient, firstName: string, surname: string, phone: string) {
  const existing = await client.query('SELECT id FROM person WHERE cellphone = $1', [phone])
  if (existing.rows[0]) return existing.rows[0].id as string
  const id = randomId('user')
  await client.query('INSERT INTO person (id, first_name, surname, cellphone) VALUES ($1, $2, $3, $4)', [id, firstName, surname, phone])
  return id
}

async function recordConsent(client: PoolClient, phone: string, userId?: string) {
  const id = randomId('consent')
  await client.query(
    `INSERT INTO consent_record (id, user_id, cellphone, notice_version, purpose)
     VALUES ($1, $2, $3, $4, 'Eden and Central Karoo trial')`,
    [id, userId ?? null, phone, NOTICE],
  )
  return id
}

async function lookup(app: App, token: string): Promise<MembershipContext & { status: string }> {
  const found = await app.db.owner.query(
    `SELECT person.id AS user_id, membership.id AS membership_id, membership.role, membership.scope,
            membership.school_id, membership.district_id, membership.province_id, membership.status
     FROM session
     JOIN membership ON membership.id = session.membership_id
     JOIN person ON person.id = session.user_id
     WHERE session.token_hash = $1 AND session.expires_at > now() AND person.status = 'active'`,
    [hashSecret(token, app.config.tokenPepper)],
  )
  const row = found.rows[0]
  if (!row) throw new HttpError(401, 'Sign in again')
  return {
    userId: row.user_id,
    membershipId: row.membership_id,
    role: row.role,
    scope: row.scope,
    schoolId: row.school_id,
    districtId: row.district_id,
    provinceId: row.province_id,
    status: row.status,
  }
}

function requireActive(ctx: { status?: string }) {
  if (ctx.status !== 'active') throw new HttpError(403, 'The coordinator still needs to approve you.')
}

function requireConsent(body: Record<string, unknown>) {
  if (body.consent !== true) throw new HttpError(400, 'Agree to the trial notice first')
}

function phoneOrThrow(value: unknown): string {
  const phone = toE164(String(value ?? ''))
  if (!phone) throw new HttpError(400, 'Enter a cellphone number with at least 10 digits')
  return phone
}

function text(value: unknown, message: string): string {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) throw new HttpError(400, message)
  return trimmed
}

function bearer(req: IncomingMessage): string | null {
  const headerValue = req.headers.authorization
  if (!headerValue?.startsWith('Bearer ')) return null
  return headerValue.slice(7).trim()
}

function header(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name]
  return typeof value === 'string' ? value : null
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    throw new HttpError(400, 'The request was not valid JSON')
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { ...corsHeaders(), 'content-type': 'application/json; charset=utf-8' })
  res.end(payload)
}

function corsHeaders(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type, x-support-reason',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  }
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function mapSchool(row: Record<string, unknown>) {
  return {
    id: row.id,
    districtId: row.district_id,
    schoolNumber: row.school_number,
    name: row.name,
    phase: row.phase,
    quintile: row.quintile,
    enrolment: row.enrolment,
    active: row.active,
  }
}

function mapUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    firstName: row.first_name,
    surname: row.surname,
    cellphone: row.cellphone,
    locale: row.locale,
    status: row.status,
    createdAt: iso(row.created_at as Date),
  }
}

function mapMembership(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    scope: row.scope,
    schoolId: row.school_id,
    districtId: row.district_id,
    provinceId: row.province_id,
    status: row.status,
    approvedBy: row.approved_by,
    startsOn: String(row.starts_on).slice(0, 10),
    endsOn: row.ends_on ? String(row.ends_on).slice(0, 10) : null,
  }
}

function mapJoin(row: Record<string, unknown>) {
  return {
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    cellphone: row.cellphone,
    intendedRole: row.intended_role,
    expiresAt: iso(row.expires_at as Date),
    usedAt: row.used_at ? iso(row.used_at as Date) : null,
    withdrawnAt: row.withdrawn_at ? iso(row.withdrawn_at as Date) : null,
    issuedBy: row.issued_by,
  }
}

function mapStat(row: Record<string, unknown>) {
  return {
    id: row.id,
    schoolId: row.school_id,
    feedingDate: String(row.feeding_date).slice(0, 10),
    menuNumber: row.menu_number,
    breakfastFed: row.breakfast_fed,
    mainMealFed: row.main_meal_fed,
    mainMealTime: row.main_meal_time,
    submittedBy: row.submitted_by,
    clientRecordedAt: iso(row.client_recorded_at as Date),
    serverReceivedAt: iso(row.server_received_at as Date),
    clockPlausible: row.clock_plausible,
    replacesId: row.replaces_id,
    correctionReason: row.correction_reason,
  }
}

function mapPack(row: Record<string, unknown>) {
  return {
    id: row.id,
    schoolId: row.school_id,
    period: row.period,
    attendanceRegisterSent: row.attendance_register_sent,
    stockFormSent: row.stock_form_sent,
    proofOfPaymentSent: row.proof_of_payment_sent,
    submittedBy: row.submitted_by,
    clientRecordedAt: iso(row.client_recorded_at as Date),
    serverReceivedAt: iso(row.server_received_at as Date),
    replacesId: row.replaces_id,
    correctionReason: row.correction_reason,
  }
}

function mapIssue(row: Record<string, unknown>) {
  return {
    id: row.id,
    schoolId: row.school_id,
    createdBy: row.created_by,
    kind: row.kind,
    body: row.body,
    status: row.status,
    createdAt: iso(row.created_at as Date),
    seenBy: row.seen_by,
    seenAt: row.seen_at ? iso(row.seen_at as Date) : null,
    closedBy: row.closed_by,
    closedAt: row.closed_at ? iso(row.closed_at as Date) : null,
  }
}

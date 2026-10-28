import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "./cors.ts"
import { hashPin, hashSecret, oneTimeCode, pinProblem, randomId, randomToken, toE164, verifyPin } from "./crypto.ts"
import { matchRoute, normalizePath } from "./router.ts"
import { configRows, resolveSessionSecret, resolveSms } from "./runtime.ts"
import { deliverSms, revealCode, smsProviderName } from "./sms.ts"

type DispatchResult = {
  status?: number
  error?: string
  problem?: string
  body?: Record<string, unknown>
  sms?: { to?: string }
}

type Client = ReturnType<typeof createClient>

Deno.serve(async (req) => {
  const origin = req.headers.get("origin")
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) })
  try {
    return await handle(req, origin)
  } catch (error) {
    console.error(error)
    return json(500, { error: error instanceof Error ? error.message : "Something went wrong" }, origin)
  }
})

async function handle(req: Request, origin: string | null): Promise<Response> {
  const route = matchRoute(req.method, normalizePath(req.url))
  if (route.name === "not_found") return json(404, { error: "Not found" }, origin)
  if (route.name === "health") return json(200, { ok: true }, origin)

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required" }, origin)
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const secret = await loadSessionSecret(supabase)
  if (!secret) return json(500, { error: "The session secret is not configured" }, origin)
  const sms = await loadSms(supabase)

  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}))
  const payload: Record<string, unknown> = { ...(body as Record<string, unknown>) }
  if (route.schoolId) payload.schoolId = route.schoolId
  if (route.id) payload.id = route.id
  if (route.deviceId) payload.deviceId = route.deviceId
  if (typeof payload.cellphone === "string") {
    const phone = toE164(payload.cellphone)
    if (!phone) return json(400, { error: "Enter a cellphone number with at least 10 digits" }, origin)
    payload.cellphone = phone
  }

  if (route.name === "switch") {
    const prepared = await call(supabase, "switch_prepare", null, null, payload)
    if (prepared.status !== 200) return json(prepared.status ?? 400, prepared.body ?? { error: prepared.error, problem: prepared.problem }, origin)
    const pinHash = String((prepared.body as { pinHash?: string } | undefined)?.pinHash ?? "")
    if (!verifyPin(String(payload.pin ?? ""), pinHash, secret)) return json(400, { error: "That PIN does not match." }, origin)
    const token = randomToken()
    const committed = await call(supabase, "switch_commit", null, null, {
      userId: payload.userId,
      token,
      tokenHash: hashSecret(token, secret),
      sessionId: randomId("session"),
    })
    return json(committed.status ?? 200, committed.body ?? { error: committed.error }, origin)
  }

  if (route.name === "set_pin") {
    const problem = pinProblem(String(payload.pin ?? ""))
    if (problem) return json(400, { error: problem }, origin)
    payload.pinHash = hashPin(String(payload.pin), secret)
    payload.deviceId = payload.deviceId || randomId("device")
    delete payload.pin
  }

  if (route.name === "issue_certificate" || route.name === "daily_stat" || route.name === "issue_create" || route.name === "issue_code" || route.name === "monthly_pack") {
    const prefix = route.name === "monthly_pack" ? "pack" : route.name === "daily_stat" ? "stat" : route.name === "issue_certificate" ? "cert" : route.name === "issue_code" ? "code" : "issue"
    payload.id = payload.id || randomId(prefix)
    if (route.name === "issue_certificate") payload.verificationCode = randomToken().slice(0, 8).toUpperCase()
  }
  if (route.name === "daily_correction") payload.newId = randomId("stat")
  if (route.name === "phone_start") payload.changeId = randomId("phone")

  if (route.name === "needs_look" || route.name === "export" || route.name === "school_detail") {
    const snap = await call(supabase, "snapshot", sessionToken(req) ? hashSecret(sessionToken(req) ?? "", secret) : null, req.headers.get("x-support-reason"), {})
    if (snap.status !== 200) return json(snap.status ?? 500, snap.body ?? { error: snap.error }, origin)
    const data = (snap.body ?? {}) as {
      schools?: Array<{ id: string; schoolId?: string; schoolNumber?: string; name?: string; phase?: string; active?: boolean }>
      memberships?: Array<{ schoolId?: string }>
      users?: unknown[]
      dailyStats?: Array<{ schoolId?: string }>
      monthlyPacks?: Array<{ schoolId?: string }>
      issues?: Array<{ schoolId?: string }>
      moduleProgress?: unknown[]
    }
    if (route.name === "export") {
      const lines = ["school_number,name,phase,active", ...(data.schools ?? []).map((school) =>
        [school.schoolNumber, school.name, school.phase ?? "", school.active ? "Yes" : "No"].join(","))]
      return new Response(`${lines.join("\n")}\n`, { status: 200, headers: { ...corsHeaders(origin), "content-type": "text/csv; charset=utf-8" } })
    }
    if (route.name === "school_detail") {
      const school = (data.schools ?? []).find((item) => item.id === route.schoolId)
      if (!school) return json(404, { error: "School not on the trial list" }, origin)
      const atSchool = <T extends { schoolId?: string }>(rows: T[] | undefined) => (rows ?? []).filter((item) => item.schoolId === route.schoolId)
      return json(200, {
        school,
        people: atSchool(data.memberships),
        users: data.users ?? [],
        dailyStats: atSchool(data.dailyStats),
        monthlyPacks: atSchool(data.monthlyPacks),
        issues: atSchool(data.issues),
        moduleProgress: data.moduleProgress ?? [],
      }, origin)
    }
    // The website computes school tone from the full snapshot. This list is every visible school.
    return json(200, { schools: data.schools ?? [] }, origin)
  }

  const sendsSms = route.name === "join_coordinator" || route.name === "join_staff" || route.name === "recover" || route.name === "phone_start"
  let plainCode = ""
  if (sendsSms) {
    plainCode = oneTimeCode(sms.otp || undefined)
    payload.otpHash = hashSecret(plainCode, secret)
    payload.smsId = randomId("sms")
    payload.userId = payload.userId || randomId("user")
    payload.membershipId = payload.membershipId || randomId("mem")
    payload.consentId = randomId("consent")
    payload.consent = payload.consent === true ? "true" : "false"
  }
  if (route.name === "sms_verify" || route.name === "phone_confirm") {
    payload.otpHash = hashSecret(String(payload.code ?? ""), secret)
  }
  if (route.name === "sms_verify") {
    const token = randomToken()
    payload.token = token
    payload.tokenHash = hashSecret(token, secret)
    payload.sessionId = randomId("session")
  }

  const token = sessionToken(req)
  const result = await call(supabase, route.name, token ? hashSecret(token, secret) : null, req.headers.get("x-support-reason"), payload)
  if (result.sms?.to && plainCode) {
    const provider = smsProviderName(sms.provider)
    deliverSms(provider, result.sms.to, plainCode)
    if (revealCode(provider, sms.otp || undefined) && result.body) result.body.demoCode = plainCode
  }
  const responseBody = result.body ?? { error: result.error, problem: result.problem }
  return json(result.status ?? 500, responseBody, origin)
}

async function loadSessionSecret(supabase: Client): Promise<string> {
  const fromEnv = resolveSessionSecret(Deno.env.get("SESSION_SECRET"), null)
  if (fromEnv) return fromEnv
  const { data, error } = await supabase.rpc("session_secret")
  if (error) return ""
  return resolveSessionSecret(undefined, data)
}

async function loadSms(supabase: Client): Promise<{ provider: string; otp: string }> {
  const env = { provider: Deno.env.get("SMS_PROVIDER"), otp: Deno.env.get("DEV_FIXED_OTP") }
  if (env.provider?.trim() && env.otp?.trim()) return resolveSms(env, {})
  const { data } = await supabase.from("private_config").select("name, value")
  return resolveSms(env, configRows(data as Array<{ name?: string; value?: string }> | null))
}

async function call(
  supabase: Client,
  op: string,
  tokenHash: string | null,
  reason: string | null,
  payload: Record<string, unknown>,
): Promise<DispatchResult> {
  const { data, error } = await supabase.rpc("dispatch", {
    op,
    p_token_hash: tokenHash,
    reason,
    payload,
  })
  if (error) return { status: 500, error: error.message }
  return (data ?? {}) as DispatchResult
}

function sessionToken(req: Request): string | null {
  const custom = req.headers.get("x-session-token")
  if (custom) return custom
  const header = req.headers.get("authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null
}

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "content-type": "application/json; charset=utf-8" },
  })
}

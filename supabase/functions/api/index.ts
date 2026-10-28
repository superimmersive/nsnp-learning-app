import { createClient } from "@supabase/supabase-js"
import { hashPin, hashSecret, oneTimeCode, pinProblem, randomId, randomToken, toE164, verifyPin } from "./crypto.ts"
import { matchRoute, normalizePath } from "./router.ts"
import { deliverSms, revealCode, smsProviderName } from "./sms.ts"

type DispatchResult = {
  status?: number
  error?: string
  problem?: string
  body?: Record<string, unknown>
  sms?: { to?: string }
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-support-reason, x-session-token",
  "access-control-allow-methods": "GET, POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors })
  try {
    return await handle(req)
  } catch (error) {
    console.error(error)
    return json(500, { error: error instanceof Error ? error.message : "Something went wrong" })
  }
})

async function handle(req: Request): Promise<Response> {
  const route = matchRoute(req.method, normalizePath(req.url))
  if (route.name === "not_found") return json(404, { error: "Not found" })
  if (route.name === "health") return json(200, { ok: true })

  const secret = Deno.env.get("SESSION_SECRET") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!secret || !supabaseUrl || !serviceKey) {
    return json(500, { error: "SESSION_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required" })
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const body = req.method === "GET" ? {} : await req.json().catch(() => ({}))
  const fixed = Deno.env.get("DEV_FIXED_OTP")
  const provider = smsProviderName(Deno.env.get("SMS_PROVIDER"))
  const payload: Record<string, unknown> = { ...(body as Record<string, unknown>) }
  if (route.schoolId) payload.schoolId = route.schoolId
  if (route.id) payload.id = route.id
  if (route.deviceId) payload.deviceId = route.deviceId
  if (typeof payload.cellphone === "string") {
    const phone = toE164(payload.cellphone)
    if (!phone) return json(400, { error: "Enter a cellphone number with at least 10 digits" })
    payload.cellphone = phone
  }

  if (route.name === "switch") {
    const prepared = await call(supabase, "switch_prepare", null, null, payload)
    if (prepared.status !== 200) return json(prepared.status ?? 400, prepared.body ?? { error: prepared.error, problem: prepared.problem })
    const pinHash = String((prepared.body as { pinHash?: string } | undefined)?.pinHash ?? "")
    if (!verifyPin(String(payload.pin ?? ""), pinHash, secret)) return json(400, { error: "That PIN does not match." })
    const token = randomToken()
    const committed = await call(supabase, "switch_commit", null, null, {
      userId: payload.userId,
      token,
      tokenHash: hashSecret(token, secret),
      sessionId: randomId("session"),
    })
    return json(committed.status ?? 200, committed.body ?? { error: committed.error })
  }

  if (route.name === "set_pin") {
    const problem = pinProblem(String(payload.pin ?? ""))
    if (problem) return json(400, { error: problem })
    payload.pinHash = hashPin(String(payload.pin), secret)
    payload.deviceId = payload.deviceId || randomId("device")
    delete payload.pin
  }

  if (route.name === "issue_certificate") {
    payload.id = randomId("cert")
    payload.verificationCode = randomToken().slice(0, 8).toUpperCase()
  }

  const sendsSms = route.name === "join_coordinator" || route.name === "join_staff" || route.name === "recover" || route.name === "phone_start"
  let plainCode = ""
  if (sendsSms) {
    plainCode = oneTimeCode(fixed)
    payload.otpHash = hashSecret(plainCode, secret)
    payload.smsId = randomId("sms")
    payload.userId = payload.userId || randomId("user")
    payload.membershipId = payload.membershipId || randomId("mem")
    payload.consentId = randomId("consent")
    payload.consent = payload.consent === true ? "true" : "false"
  }
  if (route.name === "sms_verify") {
    const token = randomToken()
    payload.otpHash = hashSecret(String(payload.code ?? ""), secret)
    payload.token = token
    payload.tokenHash = hashSecret(token, secret)
    payload.sessionId = randomId("session")
  }

  const token = sessionToken(req)
  const result = await call(supabase, route.name, token ? hashSecret(token, secret) : null, req.headers.get("x-support-reason"), payload)
  if (result.sms?.to && plainCode) {
    deliverSms(provider, result.sms.to, plainCode)
    if (revealCode(provider, fixed) && result.body) result.body.demoCode = plainCode
  }
  const responseBody = result.body ?? { error: result.error, problem: result.problem }
  return json(result.status ?? 500, responseBody)
}

async function call(
  supabase: ReturnType<typeof createClient>,
  op: string,
  tokenHash: string | null,
  reason: string | null,
  payload: Record<string, unknown>,
): Promise<DispatchResult> {
  const { data, error } = await supabase.rpc("dispatch", {
    op,
    token_hash: tokenHash,
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

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  })
}

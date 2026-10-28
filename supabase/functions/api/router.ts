export type RouteMatch = {
  name: string
  id?: string
  schoolId?: string
  deviceId?: string
}

/** Path after the function name, for example `/v1/join/coordinator`. */
export function normalizePath(url: string): string {
  const path = new URL(url).pathname
  const marker = "/functions/v1/api"
  const start = path.indexOf(marker)
  const rest = start >= 0 ? path.slice(start + marker.length) : path
  const trimmed = rest.replace(/\/$/, "")
  return trimmed.length > 0 ? trimmed : "/"
}

export function matchRoute(method: string, path: string): RouteMatch {
  if (method === "GET" && path === "/healthz") return { name: "health" }
  if (method === "POST" && path === "/v1/join/coordinator") return { name: "join_coordinator" }
  if (method === "POST" && path === "/v1/join/staff") return { name: "join_staff" }
  if (method === "POST" && path === "/v1/auth/sms/verify") return { name: "sms_verify" }
  if (method === "POST" && path === "/v1/auth/recover") return { name: "recover" }
  if (method === "GET" && path === "/v1/me") return { name: "me" }
  if (method === "POST" && path === "/v1/me/pin") return { name: "set_pin" }
  if (method === "POST" && path === "/v1/me/progress") return { name: "save_progress" }
  if (method === "POST" && path === "/v1/me/certificate") return { name: "issue_certificate" }
  if (method === "POST" && path === "/v1/devices/check-in") return { name: "check_in" }
  if (method === "GET" && path === "/v1/officials/snapshot") return { name: "snapshot" }
  if (method === "GET" && path === "/v1/officials/schools") return { name: "needs_look" }
  if (method === "GET" && path === "/v1/officials/export") return { name: "export" }
  if (method === "POST" && path === "/v1/join-codes") return { name: "issue_code" }
  if (method === "POST" && path === "/v1/officials/support-view") return { name: "support_view" }

  const schoolPeople = path.match(/^\/v1\/schools\/([^/]+)\/people$/)
  if (method === "GET" && schoolPeople) return { name: "school_people", schoolId: schoolPeople[1] }
  const daily = path.match(/^\/v1\/schools\/([^/]+)\/daily-stats$/)
  if (method === "POST" && daily) return { name: "daily_stat", schoolId: daily[1] }
  const correction = path.match(/^\/v1\/schools\/([^/]+)\/daily-stats\/([^/]+)\/corrections$/)
  if (method === "POST" && correction) return { name: "daily_correction", schoolId: correction[1], id: correction[2] }
  const monthly = path.match(/^\/v1\/schools\/([^/]+)\/monthly-packs$/)
  if (method === "POST" && monthly) return { name: "monthly_pack", schoolId: monthly[1] }
  const issue = path.match(/^\/v1\/schools\/([^/]+)\/issues$/)
  if (method === "POST" && issue) return { name: "issue_create", schoolId: issue[1] }
  const seen = path.match(/^\/v1\/issues\/([^/]+)\/seen$/)
  if (method === "POST" && seen) return { name: "issue_seen", id: seen[1] }
  const closed = path.match(/^\/v1\/issues\/([^/]+)\/close$/)
  if (method === "POST" && closed) return { name: "issue_close", id: closed[1] }
  const decision = path.match(/^\/v1\/memberships\/([^/]+)\/decision$/)
  if (method === "POST" && decision) return { name: "membership_decision", id: decision[1] }
  const phone = path.match(/^\/v1\/people\/([^/]+)\/phone$/)
  if (method === "POST" && phone) return { name: "phone_start", id: phone[1] }
  const confirm = path.match(/^\/v1\/people\/([^/]+)\/phone\/confirm$/)
  if (method === "POST" && confirm) return { name: "phone_confirm", id: confirm[1] }
  const withdraw = path.match(/^\/v1\/join-codes\/([^/]+)\/withdraw$/)
  if (method === "POST" && withdraw) return { name: "withdraw_code", id: withdraw[1] }
  const codePhone = path.match(/^\/v1\/join-codes\/([^/]+)\/phone$/)
  if (method === "POST" && codePhone) return { name: "update_code_phone", id: codePhone[1] }
  const school = path.match(/^\/v1\/officials\/schools\/([^/]+)$/)
  if (method === "GET" && school) return { name: "school_detail", schoolId: school[1] }
  const switched = path.match(/^\/v1\/devices\/([^/]+)\/switch$/)
  if (method === "POST" && switched) return { name: "switch", deviceId: switched[1] }
  return { name: "not_found" }
}

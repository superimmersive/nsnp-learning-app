/** Origins the browser may call the Edge Function from. */
export function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return null
  }
  const host = url.hostname
  const https = url.protocol === "https:"
  const local = host === "localhost" || host === "127.0.0.1"
  if (local && (url.protocol === "http:" || https)) return origin
  if (!https) return null
  if (host === "vercel.app" || host.endsWith(".vercel.app")) return origin
  if (host === "superimmersive.io" || host.endsWith(".superimmersive.io")) return origin
  return null
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-headers": "authorization, apikey, content-type, x-support-reason, x-session-token",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "Origin",
  }
  const allow = allowedOrigin(origin)
  if (allow) headers["access-control-allow-origin"] = allow
  return headers
}

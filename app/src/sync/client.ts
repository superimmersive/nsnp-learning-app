import type { OfficialsSnapshot, ViewerRole } from '@/officials/types'
import type { OfficialsAction } from '@/officials/actions'
import { apiBase, officialToken } from './config'

export class ApiError extends Error {
  status: number
  problem?: string

  constructor(status: number, message: string, problem?: string) {
    super(message)
    this.status = status
    this.problem = problem
  }
}

export async function apiSend(path: string, options: { method?: string; token?: string; reason?: string; body?: unknown } = {}) {
  const base = apiBase()
  if (!base) throw new ApiError(0, 'No API URL is set')
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.token) headers.authorization = `Bearer ${options.token}`
  if (options.reason) headers['x-support-reason'] = options.reason
  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'The phone could not reach the server')
  }
  const type = response.headers.get('content-type') ?? ''
  if (type.includes('text/csv')) {
    if (!response.ok) throw new ApiError(response.status, 'Export failed')
    return { text: await response.text() }
  }
  const json = (await response.json().catch(() => ({}))) as { error?: string; problem?: string }
  if (!response.ok) throw new ApiError(response.status, json.error ?? 'The server rejected that', json.problem)
  return json
}

export async function fetchOfficialSnapshot(role: ViewerRole, reason: string): Promise<OfficialsSnapshot> {
  const json = await apiSend('/v1/officials/snapshot', {
    token: officialToken(role),
    reason: role === 'super_admin' ? reason : undefined,
  })
  return json as OfficialsSnapshot
}

export async function sendOfficialAction(role: ViewerRole, action: OfficialsAction, reason: string) {
  const token = officialToken(role)
  const support = role === 'super_admin' ? reason : undefined
  switch (action.type) {
    case 'mark_seen':
      return apiSend(`/v1/issues/${action.issueId}/seen`, { token, reason: support, body: {} })
    case 'close_issue':
      return apiSend(`/v1/issues/${action.issueId}/close`, { token, reason: support, body: {} })
    case 'issue_code':
      return apiSend('/v1/join-codes', {
        token,
        reason: support,
        body: { schoolId: action.schoolId, cellphone: action.cellphone, intendedRole: action.intendedRole, code: action.code },
      })
    case 'withdraw_code':
      return apiSend(`/v1/join-codes/${action.codeId}/withdraw`, { token, reason: support, body: {} })
    case 'update_code_phone':
      return apiSend(`/v1/join-codes/${action.codeId}/phone`, { token, reason: support, body: { cellphone: action.cellphone } })
    case 'support_view':
      return apiSend('/v1/officials/support-view', {
        token,
        reason: action.reason,
        body: { schoolId: action.schoolId, reason: action.reason },
      })
    default:
      return {}
  }
}

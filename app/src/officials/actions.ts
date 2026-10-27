import type { AuditEvent, IssueReport, JoinCode, OfficialsSnapshot } from './types'
import { addDaysIso } from './time'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeJoinCode(random: () => number = Math.random): string {
  let code = ''
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  }
  return code
}

function nextId(prefix: string, snapshot: OfficialsSnapshot): string {
  return `${prefix}-${snapshot.auditEvents.length + 1}-${Math.random().toString(36).slice(2, 8)}`
}

function audit(
  snapshot: OfficialsSnapshot,
  event: Omit<AuditEvent, 'id'>,
): AuditEvent {
  return { id: nextId('audit', snapshot), ...event }
}

export type OfficialsAction =
  | { type: 'mark_seen'; issueId: string; actorMembershipId: string; at: string }
  | { type: 'close_issue'; issueId: string; actorMembershipId: string; at: string }
  | {
      type: 'issue_code'
      schoolId: string
      cellphone: string
      intendedRole: 'nsnp_coordinator' | 'principal'
      actorMembershipId: string
      at: string
      code?: string
    }
  | { type: 'withdraw_code'; codeId: string; actorMembershipId: string; at: string }
  | { type: 'update_code_phone'; codeId: string; cellphone: string; actorMembershipId: string; at: string }
  | { type: 'support_view'; schoolId: string; reason: string; actorMembershipId: string; at: string }

export function reduceOfficials(snapshot: OfficialsSnapshot, action: OfficialsAction): OfficialsSnapshot {
  switch (action.type) {
    case 'mark_seen':
      return markSeen(snapshot, action)
    case 'close_issue':
      return closeIssue(snapshot, action)
    case 'issue_code':
      return issueCode(snapshot, action)
    case 'withdraw_code':
      return withdrawCode(snapshot, action)
    case 'update_code_phone':
      return updatePhone(snapshot, action)
    case 'support_view':
      return supportView(snapshot, action)
    default:
      return snapshot
  }
}

function schoolName(snapshot: OfficialsSnapshot, schoolId: string): string {
  return snapshot.schools.find((school) => school.id === schoolId)?.name ?? 'the school'
}

function markSeen(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'mark_seen' }>,
): OfficialsSnapshot {
  const issue = snapshot.issues.find((item) => item.id === action.issueId)
  if (!issue || issue.status !== 'open') return snapshot
  const next: IssueReport = {
    ...issue,
    status: 'seen',
    seenBy: action.actorMembershipId,
    seenAt: action.at,
  }
  return {
    ...snapshot,
    issues: snapshot.issues.map((item) => (item.id === issue.id ? next : item)),
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'issue.seen',
        subjectType: 'issue_report',
        subjectId: issue.id,
        summary: `Marked an issue at ${schoolName(snapshot, issue.schoolId)} as seen.`,
        reason: null,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

function closeIssue(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'close_issue' }>,
): OfficialsSnapshot {
  const issue = snapshot.issues.find((item) => item.id === action.issueId)
  if (!issue || issue.status === 'closed') return snapshot
  const next: IssueReport = {
    ...issue,
    status: 'closed',
    seenBy: issue.seenBy ?? action.actorMembershipId,
    seenAt: issue.seenAt ?? action.at,
    closedBy: action.actorMembershipId,
    closedAt: action.at,
  }
  return {
    ...snapshot,
    issues: snapshot.issues.map((item) => (item.id === issue.id ? next : item)),
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'issue.closed',
        subjectType: 'issue_report',
        subjectId: issue.id,
        summary: `Closed an issue at ${schoolName(snapshot, issue.schoolId)}.`,
        reason: null,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

function issueCode(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'issue_code' }>,
): OfficialsSnapshot {
  const code = action.code ?? makeJoinCode()
  const row: JoinCode = {
    id: nextId('code', snapshot),
    schoolId: action.schoolId,
    code,
    cellphone: action.cellphone,
    intendedRole: action.intendedRole,
    expiresAt: addDaysIso(action.at, 14),
    usedAt: null,
    withdrawnAt: null,
    issuedBy: action.actorMembershipId,
  }
  return {
    ...snapshot,
    joinCodes: [row, ...snapshot.joinCodes],
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'join_code.issued',
        subjectType: 'join_code',
        subjectId: row.id,
        summary: `Issued join code ${code} for ${schoolName(snapshot, action.schoolId)}.`,
        reason: null,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

function withdrawCode(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'withdraw_code' }>,
): OfficialsSnapshot {
  const row = snapshot.joinCodes.find((item) => item.id === action.codeId)
  if (!row || row.withdrawnAt || row.usedAt) return snapshot
  return {
    ...snapshot,
    joinCodes: snapshot.joinCodes.map((item) =>
      item.id === row.id ? { ...item, withdrawnAt: action.at } : item,
    ),
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'join_code.withdrawn',
        subjectType: 'join_code',
        subjectId: row.id,
        summary: `Withdrew join code ${row.code} for ${schoolName(snapshot, row.schoolId)}.`,
        reason: null,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

function updatePhone(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'update_code_phone' }>,
): OfficialsSnapshot {
  const row = snapshot.joinCodes.find((item) => item.id === action.codeId)
  if (!row || row.withdrawnAt || row.usedAt) return snapshot
  const digits = action.cellphone.replace(/\D/g, '')
  return {
    ...snapshot,
    joinCodes: snapshot.joinCodes.map((item) =>
      item.id === row.id ? { ...item, cellphone: action.cellphone } : item,
    ),
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'phone.changed',
        subjectType: 'join_code',
        subjectId: row.id,
        summary: `Updated the cellphone on the ${schoolName(snapshot, row.schoolId)} join code. It now ends in ${digits.slice(-4)}.`,
        reason: null,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

function supportView(
  snapshot: OfficialsSnapshot,
  action: Extract<OfficialsAction, { type: 'support_view' }>,
): OfficialsSnapshot {
  const reason = action.reason.trim()
  if (!reason) return snapshot
  return {
    ...snapshot,
    auditEvents: [
      audit(snapshot, {
        at: action.at,
        actorMembershipId: action.actorMembershipId,
        action: 'support.viewed',
        subjectType: 'school',
        subjectId: action.schoolId,
        summary: `Opened ${schoolName(snapshot, action.schoolId)}.`,
        reason,
      }),
      ...snapshot.auditEvents,
    ],
  }
}

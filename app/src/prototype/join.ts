import type { Membership, OfficialsSnapshot, User } from '@/officials/types'
import { makeJoinCode } from '@/officials/actions'
import type { ProgressState } from '@/lib/progress'
import type { JoinDraft } from './phone'

export function claimFromDraft(snapshot: OfficialsSnapshot, draft: JoinDraft, at: string): OfficialsSnapshot {
  if (draft.path === 'coordinator') return claimCoordinator(snapshot, draft, at)
  return claimStaff(snapshot, draft, at)
}

export function claimCoordinator(snapshot: OfficialsSnapshot, draft: JoinDraft, at: string): OfficialsSnapshot {
  const joinCode = snapshot.joinCodes.find((item) => item.id === draft.joinCodeId)
  if (!joinCode || joinCode.usedAt || joinCode.withdrawnAt) return snapshot
  const userId = `user-${joinCode.id}`
  const membershipId = `mem-${joinCode.id}`
  const user = person(userId, draft, at)
  const membership: Membership = {
    id: membershipId,
    userId,
    role: 'nsnp_coordinator',
    scope: 'school',
    schoolId: draft.schoolId,
    districtId: null,
    provinceId: null,
    status: 'active',
    approvedBy: 'mem-official-1',
    startsOn: at.slice(0, 10),
    endsOn: null,
  }
  return {
    ...snapshot,
    users: [...snapshot.users, user],
    memberships: [...snapshot.memberships, membership],
    joinCodes: snapshot.joinCodes.map((item) => (item.id === joinCode.id ? { ...item, usedAt: at } : item)),
    auditEvents: [
      audit(snapshot, at, 'mem-official-1', 'membership.claimed', membershipId, `Coordinator joined ${schoolName(snapshot, draft.schoolId)} with code ${joinCode.code}.`),
      ...snapshot.auditEvents,
    ],
  }
}

export function claimStaff(snapshot: OfficialsSnapshot, draft: JoinDraft, at: string): OfficialsSnapshot {
  const userId = `user-joined-${snapshot.users.length + 1}`
  const membershipId = `mem-joined-${snapshot.memberships.length + 1}`
  const user = person(userId, draft, at)
  const membership: Membership = {
    id: membershipId,
    userId,
    role: draft.role === 'nsnp_coordinator' ? 'food_handler' : draft.role,
    scope: 'school',
    schoolId: draft.schoolId,
    districtId: null,
    provinceId: null,
    status: 'pending',
    approvedBy: null,
    startsOn: at.slice(0, 10),
    endsOn: null,
  }
  return {
    ...snapshot,
    users: [...snapshot.users, user],
    memberships: [...snapshot.memberships, membership],
    auditEvents: [
      audit(snapshot, at, membershipId, 'membership.requested', membershipId, `${user.firstName} ${user.surname} is waiting for approval at ${schoolName(snapshot, draft.schoolId)}.`),
      ...snapshot.auditEvents,
    ],
  }
}

export function decideMembership(
  snapshot: OfficialsSnapshot,
  membershipId: string,
  decision: 'active' | 'removed',
  actorMembershipId: string,
  at: string,
): OfficialsSnapshot {
  const membership = snapshot.memberships.find((item) => item.id === membershipId)
  if (!membership || membership.status !== 'pending') return snapshot
  const next: Membership = {
    ...membership,
    status: decision,
    approvedBy: decision === 'active' ? actorMembershipId : membership.approvedBy,
    endsOn: decision === 'removed' ? at.slice(0, 10) : null,
  }
  const user = snapshot.users.find((item) => item.id === membership.userId)
  const name = user ? `${user.firstName} ${user.surname}` : 'A person'
  return {
    ...snapshot,
    memberships: snapshot.memberships.map((item) => (item.id === membershipId ? next : item)),
    auditEvents: [
      audit(
        snapshot,
        at,
        actorMembershipId,
        decision === 'active' ? 'membership.approved' : 'membership.declined',
        membershipId,
        decision === 'active'
          ? `Approved ${name} at ${schoolName(snapshot, membership.schoolId ?? '')}.`
          : `Declined ${name} at ${schoolName(snapshot, membership.schoolId ?? '')}.`,
      ),
      ...snapshot.auditEvents,
    ],
  }
}

export function refreshStaffCode(
  snapshot: OfficialsSnapshot,
  schoolId: string,
  at: string,
  code = makeJoinCode(),
): OfficialsSnapshot {
  return {
    ...snapshot,
    staffCodes: snapshot.staffCodes.map((item) =>
      item.schoolId === schoolId ? { ...item, code, refreshedAt: at } : item,
    ),
  }
}

export function copyPassedLessons(
  snapshot: OfficialsSnapshot,
  userId: string,
  progress: ProgressState,
  at: string,
): OfficialsSnapshot {
  const existing = new Set(
    snapshot.moduleProgress.filter((item) => item.userId === userId && item.passed).map((item) => item.moduleId),
  )
  const added = Object.entries(progress.modules).flatMap(([moduleId, module]) => {
    if (!module?.passed || existing.has(moduleId)) return []
    return [
      {
        userId,
        moduleId,
        visited: true,
        correct: module.correct,
        total: module.total,
        passed: true,
        contentReleaseId: 'release-en-2026',
        updatedAt: at,
      },
    ]
  })
  if (added.length === 0) return snapshot
  return { ...snapshot, moduleProgress: [...snapshot.moduleProgress, ...added] }
}

export function approverFor(snapshot: OfficialsSnapshot, schoolId: string): string {
  const coordinator = snapshot.memberships.find(
    (item) => item.schoolId === schoolId && item.role === 'nsnp_coordinator' && item.status === 'active',
  )
  return coordinator?.id ?? 'mem-official-1'
}

export function hasStoredLessons(progress: ProgressState): boolean {
  if (progress.name.trim() || progress.school.trim()) return true
  return Object.values(progress.modules).some((module) => Boolean(module?.passed || module?.visited))
}

function person(id: string, draft: JoinDraft, at: string): User {
  return {
    id,
    firstName: draft.firstName.trim(),
    surname: draft.surname.trim(),
    cellphone: draft.cellphone.trim(),
    locale: 'en',
    status: 'active',
    createdAt: at,
  }
}

function schoolName(snapshot: OfficialsSnapshot, schoolId: string): string {
  return snapshot.schools.find((school) => school.id === schoolId)?.name ?? 'the school'
}

function audit(
  snapshot: OfficialsSnapshot,
  at: string,
  actorMembershipId: string,
  action: string,
  subjectId: string,
  summary: string,
) {
  return {
    id: `audit-join-${snapshot.auditEvents.length + 1}`,
    at,
    actorMembershipId,
    action,
    subjectType: 'membership',
    subjectId,
    summary,
    reason: null,
  }
}

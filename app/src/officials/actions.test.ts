import { describe, expect, it } from 'vitest'
import { makeJoinCode, reduceOfficials } from './actions'
import { createExampleSnapshot } from './mockData'
import { trialMetrics } from './metrics'

describe('official actions', () => {
  it('builds a join code without ambiguous characters', () => {
    const code = makeJoinCode(() => 0)
    expect(code).toBe('AAAAAA')
    expect(makeJoinCode(() => 0.99)).toMatch(/^[A-Z2-9]{6}$/)
    expect(makeJoinCode()).toHaveLength(6)
  })

  it('marks an issue seen and writes an audit line without changing feeding counts', () => {
    const snapshot = createExampleSnapshot()
    const before = trialMetrics(snapshot).onTimePercent
    const next = reduceOfficials(snapshot, {
      type: 'mark_seen',
      issueId: 'issue-soutrivier',
      actorMembershipId: 'mem-official-1',
      at: '2026-10-27T15:05:00+02:00',
    })
    expect(next.issues.find((issue) => issue.id === 'issue-soutrivier')?.status).toBe('seen')
    expect(next.auditEvents[0]?.summary).toContain('Soutrivier')
    expect(trialMetrics(next).onTimePercent).toBe(before)
    expect(trialMetrics(next).openIssues).toBe(0)
  })

  it('records a reason when a super-admin opens a school', () => {
    const snapshot = createExampleSnapshot()
    const next = reduceOfficials(snapshot, {
      type: 'support_view',
      schoolId: 'school-90000001',
      reason: 'School asked about a missing count',
      actorMembershipId: 'mem-admin',
      at: '2026-10-27T15:10:00+02:00',
    })
    expect(next.auditEvents[0]).toMatchObject({
      action: 'support.viewed',
      reason: 'School asked about a missing count',
      subjectId: 'school-90000001',
    })
    expect(next.dailyStats).toEqual(snapshot.dailyStats)
  })

  it('refuses a support view with a blank reason', () => {
    const snapshot = createExampleSnapshot()
    const next = reduceOfficials(snapshot, {
      type: 'support_view',
      schoolId: 'school-90000001',
      reason: '   ',
      actorMembershipId: 'mem-admin',
      at: '2026-10-27T15:10:00+02:00',
    })
    expect(next.auditEvents).toHaveLength(snapshot.auditEvents.length)
  })
})

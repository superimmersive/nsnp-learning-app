import { describe, expect, it } from 'vitest'
import { createExampleSnapshot } from './mockData'
import {
  isOnTimeStat,
  lessonCompletion,
  monthlyMark,
  onTimePercent,
  schoolTone,
  trialMetrics,
} from './metrics'
import type { DailyFeedingStat } from './types'
import { expectedFeedingDay, feedingPeriod, formatMonth, recentFeedingDays } from './time'

function stat(partial: Partial<DailyFeedingStat> & Pick<DailyFeedingStat, 'id' | 'feedingDate' | 'clientRecordedAt'>): DailyFeedingStat {
  return {
    schoolId: 'school-1',
    menuNumber: 1,
    breakfastFed: 10,
    mainMealFed: 20,
    mainMealTime: '12:00',
    submittedBy: 'mem-1',
    serverReceivedAt: partial.clientRecordedAt,
    clockPlausible: true,
    replacesId: null,
    correctionReason: null,
    ...partial,
  }
}

describe('feeding clock', () => {
  it('treats 27 October 2026 at 15:00 as a day the count is already due', () => {
    expect(expectedFeedingDay('2026-10-27T15:00:00+02:00')).toBe('2026-10-27')
    expect(expectedFeedingDay('2026-10-27T10:00:00+02:00')).toBe('2026-10-26')
    expect(expectedFeedingDay('2026-10-25T12:00:00+02:00')).toBe('2026-10-23')
    expect(recentFeedingDays('2026-10-27T15:00:00+02:00')).toEqual([
      '2026-10-27',
      '2026-10-26',
      '2026-10-23',
      '2026-10-22',
      '2026-10-21',
    ])
  })

  it('keeps October in view until the end of 7 November', () => {
    expect(feedingPeriod('2026-10-27T15:00:00+02:00')).toEqual({ period: '2026-10', due: '2026-11-07' })
    expect(feedingPeriod('2026-11-07T08:00:00+02:00')).toEqual({ period: '2026-10', due: '2026-11-07' })
    expect(feedingPeriod('2026-11-08T08:00:00+02:00')).toEqual({ period: '2026-11', due: '2026-12-07' })
  })
})

describe('on-time daily stats', () => {
  it('counts a count recorded before 13:30 on the feeding day', () => {
    expect(
      isOnTimeStat(stat({ id: 'a', feedingDate: '2026-10-27', clientRecordedAt: '2026-10-27T12:40:00+02:00' })),
    ).toBe(true)
    expect(
      isOnTimeStat(stat({ id: 'b', feedingDate: '2026-10-27', clientRecordedAt: '2026-10-27T13:30:00+02:00' })),
    ).toBe(false)
    expect(
      isOnTimeStat(stat({ id: 'c', feedingDate: '2026-10-27', clientRecordedAt: '2026-10-27T14:20:00+02:00' })),
    ).toBe(false)
  })

  it('does not treat an implausible phone clock as on time', () => {
    expect(
      isOnTimeStat(
        stat({
          id: 'd',
          feedingDate: '2026-10-27',
          clientRecordedAt: '2026-10-27T12:10:00+02:00',
          clockPlausible: false,
        }),
      ),
    ).toBe(false)
  })

  it('ignores a count that was replaced by a correction', () => {
    const late = stat({ id: 'late', feedingDate: '2026-10-27', clientRecordedAt: '2026-10-27T14:20:00+02:00' })
    const fixed = stat({
      id: 'fixed',
      feedingDate: '2026-10-27',
      clientRecordedAt: '2026-10-27T12:10:00+02:00',
      replacesId: 'late',
    })
    expect(onTimePercent([late, fixed])).toBe(100)
  })

  it('returns null when no counts were submitted', () => {
    expect(onTimePercent([])).toBeNull()
  })
})

describe('monthly forms and school status', () => {
  it('marks a full pack recorded before the 7th as confirmed', () => {
    const pack = {
      id: 'p',
      schoolId: 's',
      period: '2026-10',
      attendanceRegisterSent: true,
      stockFormSent: true,
      proofOfPaymentSent: true,
      submittedBy: 'm',
      clientRecordedAt: '2026-10-20T11:00:00+02:00',
      serverReceivedAt: '2026-10-20T11:02:00+02:00',
      replacesId: null,
      correctionReason: null,
    }
    expect(monthlyMark(pack, '2026-11-07', '2026-10-27T15:00:00+02:00')).toBe('confirmed')
    expect(
      monthlyMark(
        { ...pack, clientRecordedAt: '2026-11-08T09:00:00+02:00' },
        '2026-11-07',
        '2026-11-08T15:00:00+02:00',
      ),
    ).toBe('late')
    expect(monthlyMark(undefined, '2026-11-07', '2026-10-27T15:00:00+02:00')).toBe('not_yet')
    expect(monthlyMark(undefined, '2026-11-07', '2026-11-07T15:00:00+02:00')).toBe('late')
  })

  it('uses red when nobody has joined, a count is missing, or an issue is still open', () => {
    const base = {
      hasApprovedCoordinator: true,
      openIssues: 0,
      seenIssues: 0,
      latestMark: 'on_time' as const,
      monthly: 'confirmed' as const,
      syncedRecently: true,
    }
    expect(schoolTone(base)).toBe('green')
    expect(schoolTone({ ...base, hasApprovedCoordinator: false })).toBe('red')
    expect(schoolTone({ ...base, latestMark: 'missing' })).toBe('red')
    expect(schoolTone({ ...base, openIssues: 1 })).toBe('red')
    expect(schoolTone({ ...base, latestMark: 'late' })).toBe('amber')
    expect(schoolTone({ ...base, monthly: 'not_yet' })).toBe('amber')
    expect(schoolTone({ ...base, seenIssues: 1 })).toBe('amber')
  })

  it('turns passed modules into a completion percentage', () => {
    expect(lessonCompletion(84, 19)).toEqual({ passed: 84, possible: 209, percent: 40 })
    expect(lessonCompletion(0, 0)).toEqual({ passed: 0, possible: 0, percent: 0 })
  })
})

describe('month names', () => {
  it('writes a feeding month as a word', () => {
    expect(formatMonth('2026-10')).toBe('October 2026')
    expect(formatMonth('2026-01')).toBe('January 2026')
    expect(formatMonth('2026-12')).toBe('December 2026')
  })
})

describe('example trial', () => {
  it('matches the proof metrics for the 12 example schools', () => {
    const metrics = trialMetrics(createExampleSnapshot())
    expect(metrics.schoolCount).toBe(12)
    expect(metrics.activeSchools).toBe(9)
    expect(metrics.lessonsPassed).toBe(84)
    expect(metrics.lessonsPossible).toBe(209)
    expect(metrics.lessonsPercent).toBe(40)
    expect(metrics.certificates).toBe(2)
    expect(metrics.submittedCounts).toBe(42)
    expect(metrics.onTimeCount).toBe(37)
    expect(metrics.onTimePercent).toBe(88)
    expect(metrics.monthlyConfirmed).toBe(5)
    expect(metrics.openIssues).toBe(1)
    expect(metrics.period).toBe('2026-10')
    expect(metrics.expectedFeedingDay).toBe('2026-10-27')
  })
})

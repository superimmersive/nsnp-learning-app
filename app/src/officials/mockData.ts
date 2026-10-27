import { MODULES, MODULE_COUNT } from './metrics'
import type {
  AuditEvent,
  Certificate,
  DailyFeedingStat,
  IssueReport,
  JoinCode,
  Membership,
  ModuleProgress,
  MonthlyPack,
  OfficialsSnapshot,
  School,
  SchoolPhase,
  SchoolRole,
  User,
} from './types'
import { EXAMPLE_AS_OF } from './time'

/**
 * Example trial snapshot. Replace `createExampleSnapshot` with an API call
 * that returns `OfficialsSnapshot`. Nothing here is a real school or person.
 * EMIS numbers are in the 90000000 range so they cannot be confused with a live extract.
 */

const DISTRICT_ID = 'district-eden'
const RELEASE_ID = 'release-en-2026'
const OFFICIAL_MEMBERSHIP = 'mem-official-1'
const ADMIN_MEMBERSHIP = 'mem-admin'

type Day = {
  date: string
  time: string
  serverTime?: string
  plausible?: boolean
  main: number
  breakfast: number
}

type Staff = {
  key: string
  first: string
  last: string
  role: SchoolRole
  passed: number
  status?: 'active' | 'pending'
  synced?: string
}

type SchoolSeed = {
  number: string
  name: string
  phase: SchoolPhase
  quintile: number
  enrolment: number
  staff: Staff[]
  days?: Day[]
  october?: { attendance: boolean; stock: boolean; proof: boolean; at?: string }
  septemberLate?: boolean
}

const SCHOOLS: SchoolSeed[] = [
  {
    number: '90000001',
    name: 'Riverbend Example Primary',
    phase: 'primary',
    quintile: 1,
    enrolment: 180,
    staff: [
      { key: 'coord', first: 'Thandi', last: 'Maseko', role: 'nsnp_coordinator', passed: 8 },
      { key: 'fh', first: 'Lindi', last: 'Ndlovu', role: 'food_handler', passed: 2 },
      { key: 'prin', first: 'Peter', last: 'Daniels', role: 'principal', passed: 0 },
    ],
    days: week(150, 40),
    october: { attendance: true, stock: true, proof: true, at: '2026-10-20T11:00:00+02:00' },
  },
  {
    number: '90000002',
    name: 'Harbour View Example Secondary',
    phase: 'secondary',
    quintile: 2,
    enrolment: 640,
    staff: [
      { key: 'coord', first: 'Lena', last: 'September', role: 'nsnp_coordinator', passed: 11 },
      { key: 'prin', first: 'Mark', last: 'Adams', role: 'principal', passed: 4 },
      { key: 'smt', first: 'Fatima', last: 'Isaacs', role: 'smt_member', passed: 1 },
    ],
    days: week(580, 120),
    october: { attendance: true, stock: true, proof: true, at: '2026-10-22T09:30:00+02:00' },
  },
  {
    number: '90000003',
    name: 'Gannabos Example Primary',
    phase: 'primary',
    quintile: 1,
    enrolment: 220,
    staff: [
      { key: 'coord', first: 'Piet', last: 'Januarie', role: 'nsnp_coordinator', passed: 6 },
      { key: 'fh', first: 'Elsabe', last: 'Koopman', role: 'food_handler', passed: 3 },
    ],
    days: week(200, 50).map((day) =>
      day.date === '2026-10-27' ? { ...day, serverTime: '16:05' } : day,
    ),
    october: { attendance: true, stock: true, proof: true, at: '2026-10-18T14:00:00+02:00' },
  },
  {
    number: '90000004',
    name: 'Keurfontein Example Secondary',
    phase: 'secondary',
    quintile: 3,
    enrolment: 410,
    staff: [
      { key: 'coord', first: 'Ayesha', last: 'Daniels', role: 'nsnp_coordinator', passed: 11 },
      { key: 'fh', first: 'Sipho', last: 'Dlamini', role: 'food_handler', passed: 5 },
      { key: 'smt', first: 'Helen', last: 'Marais', role: 'smt_member', passed: 2 },
    ],
    days: week(390, 80),
    october: { attendance: true, stock: true, proof: true, at: '2026-10-21T10:15:00+02:00' },
  },
  {
    number: '90000005',
    name: 'Stonekraal Example Primary',
    phase: 'primary',
    quintile: 2,
    enrolment: 100,
    staff: [{ key: 'coord', first: 'Johan', last: 'Botha', role: 'nsnp_coordinator', passed: 5 }],
    days: [
      day('2026-10-21', '12:20', 90, 20),
      day('2026-10-22', '12:35', 92, 18),
      day('2026-10-23', '14:10', 130, 25),
      day('2026-10-26', '14:40', 128, 22),
      day('2026-10-27', '14:20', 130, 24),
    ],
    october: { attendance: true, stock: false, proof: false, at: '2026-10-25T16:00:00+02:00' },
    septemberLate: true,
  },
  {
    number: '90000006',
    name: 'Bergsig Example Secondary',
    phase: 'secondary',
    quintile: 1,
    enrolment: 500,
    staff: [
      { key: 'coord', first: 'Sara', last: 'Williams', role: 'nsnp_coordinator', passed: 3 },
      { key: 'fh', first: 'Andre', last: 'Fortuin', role: 'food_handler', passed: 0 },
    ],
    days: [
      day('2026-10-21', '12:10', 420, 60),
      day('2026-10-22', '12:25', 418, 55),
      day('2026-10-23', '12:50', 430, 62),
      day('2026-10-26', '14:05', 410, 50),
      { ...day('2026-10-27', '12:10', 400, 48), plausible: false, serverTime: '15:40' },
    ],
  },
  {
    number: '90000007',
    name: 'Melkhout Example Special School',
    phase: 'special',
    quintile: 1,
    enrolment: 80,
    staff: [{ key: 'coord', first: 'Nomsa', last: 'Khumalo', role: 'nsnp_coordinator', passed: 9 }],
    days: week(70, 15),
  },
  {
    number: '90000008',
    name: 'Platdoring Example Primary',
    phase: 'primary',
    quintile: 3,
    enrolment: 260,
    staff: [
      {
        key: 'coord',
        first: 'Elmarie',
        last: 'Venter',
        role: 'nsnp_coordinator',
        passed: 2,
        synced: '2026-10-18T09:00:00+02:00',
      },
    ],
    days: [
      day('2026-10-16', '12:30', 200, 40),
      day('2026-10-19', '12:15', 198, 36),
      day('2026-10-20', '12:40', 205, 41),
    ],
  },
  {
    number: '90000009',
    name: 'Dryveld Example Primary',
    phase: 'primary',
    quintile: 1,
    enrolment: 140,
    staff: [],
  },
  {
    number: '90000010',
    name: 'Langbos Example Combined',
    phase: 'combined',
    quintile: 2,
    enrolment: 450,
    staff: [
      {
        key: 'coord',
        first: 'Yusuf',
        last: 'Abrahams',
        role: 'nsnp_coordinator',
        passed: 0,
        status: 'pending',
      },
    ],
  },
  {
    number: '90000011',
    name: 'Soutrivier Example Primary',
    phase: 'primary',
    quintile: 1,
    enrolment: 190,
    staff: [
      { key: 'coord', first: 'Karen', last: 'Pietersen', role: 'nsnp_coordinator', passed: 7 },
      { key: 'prin', first: 'David', last: 'Meyer', role: 'principal', passed: 1 },
    ],
    days: week(175, 45),
    october: { attendance: true, stock: true, proof: true, at: '2026-10-19T08:45:00+02:00' },
  },
  {
    number: '90000012',
    name: 'Witklip Example Primary',
    phase: 'primary',
    quintile: 2,
    enrolment: 210,
    staff: [
      {
        key: 'coord',
        first: 'Irene',
        last: 'Meyer',
        role: 'nsnp_coordinator',
        passed: 4,
        synced: '2026-10-22T12:00:00+02:00',
      },
    ],
    days: [day('2026-10-21', '12:05', 160, 30), day('2026-10-22', '12:18', 158, 28)],
  },
]

function day(date: string, time: string, main: number, breakfast: number): Day {
  return { date, time, main, breakfast }
}

function week(main: number, breakfast: number): Day[] {
  return ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-26', '2026-10-27'].map((date, index) =>
    day(date, index === 4 ? '12:40' : '12:15', main, breakfast),
  )
}

function at(date: string, time: string): string {
  return `${date}T${time}:00+02:00`
}

export function createExampleSnapshot(): OfficialsSnapshot {
  const schools: School[] = []
  let phone = 2000
  const users: User[] = [
    user('user-official-1', 'Renee', 'Pillay', '+27820001001', '2026-10-01T08:00:00+02:00'),
    user('user-official-2', 'Thomas', 'Abrahams', '+27820001002', '2026-10-01T08:05:00+02:00'),
    user('user-admin', 'Superimmersive', 'Admin', '+27820001999', '2026-10-01T08:10:00+02:00'),
  ]
  const memberships: Membership[] = [
    {
      id: OFFICIAL_MEMBERSHIP,
      userId: 'user-official-1',
      role: 'district_official',
      scope: 'district',
      schoolId: null,
      districtId: DISTRICT_ID,
      provinceId: null,
      status: 'active',
      approvedBy: ADMIN_MEMBERSHIP,
      startsOn: '2026-10-01',
      endsOn: null,
    },
    {
      id: 'mem-official-2',
      userId: 'user-official-2',
      role: 'district_official',
      scope: 'district',
      schoolId: null,
      districtId: DISTRICT_ID,
      provinceId: null,
      status: 'active',
      approvedBy: ADMIN_MEMBERSHIP,
      startsOn: '2026-10-01',
      endsOn: null,
    },
    {
      id: ADMIN_MEMBERSHIP,
      userId: 'user-admin',
      role: 'super_admin',
      scope: 'platform',
      schoolId: null,
      districtId: null,
      provinceId: null,
      status: 'active',
      approvedBy: null,
      startsOn: '2026-10-01',
      endsOn: null,
    },
  ]
  const moduleProgress: ModuleProgress[] = []
  const certificates: Certificate[] = []
  const dailyStats: DailyFeedingStat[] = []
  const monthlyPacks: MonthlyPack[] = []
  const issues: IssueReport[] = []
  const joinCodes: JoinCode[] = []

  for (const seed of SCHOOLS) {
    const schoolId = `school-${seed.number}`
    schools.push({
      id: schoolId,
      districtId: DISTRICT_ID,
      schoolNumber: seed.number,
      name: seed.name,
      phase: seed.phase,
      quintile: seed.quintile,
      enrolment: seed.enrolment,
      active: true,
    })
    for (const staff of seed.staff) {
      const userId = `user-${seed.number}-${staff.key}`
      const membershipId = `mem-${seed.number}-${staff.key}`
      users.push(
        user(userId, staff.first, staff.last, `+2782000${String(phone).padStart(4, '0')}`, '2026-10-06T09:00:00+02:00'),
      )
      phone += 1
      memberships.push({
        id: membershipId,
        userId,
        role: staff.role,
        scope: 'school',
        schoolId,
        districtId: null,
        provinceId: null,
        status: staff.status ?? 'active',
        approvedBy: staff.status === 'pending' ? null : OFFICIAL_MEMBERSHIP,
        startsOn: '2026-10-06',
        endsOn: null,
      })
      const synced = staff.synced ?? '2026-10-27T08:00:00+02:00'
      for (let index = 0; index < staff.passed && index < MODULE_COUNT; index += 1) {
        const module = MODULES[index]
        moduleProgress.push({
          userId,
          moduleId: module.id,
          visited: true,
          correct: 4,
          total: 5,
          passed: true,
          contentReleaseId: RELEASE_ID,
          updatedAt: synced,
        })
      }
      if ((staff.status ?? 'active') === 'active' && staff.passed >= MODULE_COUNT) {
        certificates.push({
          id: `cert-${userId}`,
          userId,
          schoolId,
          role: staff.role,
          contentReleaseId: RELEASE_ID,
          issuedAt: synced,
          verificationCode: `EX${seed.number.slice(-4)}`,
        })
      }
    }
    const submitter = `mem-${seed.number}-coord`
    for (const [index, entry] of (seed.days ?? []).entries()) {
      dailyStats.push({
        id: `stat-${seed.number}-${entry.date}`,
        schoolId,
        feedingDate: entry.date,
        menuNumber: ((index % 5) + 1),
        breakfastFed: entry.breakfast,
        mainMealFed: entry.main,
        mainMealTime: '12:10',
        submittedBy: submitter,
        clientRecordedAt: at(entry.date, entry.time),
        serverReceivedAt: at(entry.date, entry.serverTime ?? addMinutes(entry.time, 2)),
        clockPlausible: entry.plausible ?? true,
        replacesId: null,
        correctionReason: null,
      })
    }
    if (seed.october) {
      monthlyPacks.push(pack(schoolId, '2026-10', seed.october, submitter))
    }
    if (seed.septemberLate) {
      monthlyPacks.push(
        pack(
          schoolId,
          '2026-09',
          { attendance: true, stock: true, proof: true, at: '2026-10-08T09:00:00+02:00' },
          submitter,
        ),
      )
    }
  }

  issues.push(
    issue('issue-soutrivier', 'school-90000011', 'mem-90000011-coord', 'delivery', 'open', 'The second delivery was short two bags of rice. The note was not signed.', '2026-10-26T13:10:00+02:00'),
    issue('issue-bergsig', 'school-90000006', 'mem-90000006-coord', 'safety', 'seen', 'The fire extinguisher service date has passed. A replacement is ordered.', '2026-10-24T10:00:00+02:00', {
      seenBy: OFFICIAL_MEMBERSHIP,
      seenAt: '2026-10-25T09:00:00+02:00',
    }),
    issue('issue-harbour', 'school-90000002', 'mem-90000002-coord', 'app', 'closed', 'The quiz saved on the phone and would not send until the afternoon.', '2026-10-20T15:00:00+02:00', {
      seenBy: ADMIN_MEMBERSHIP,
      seenAt: '2026-10-20T16:00:00+02:00',
      closedBy: ADMIN_MEMBERSHIP,
      closedAt: '2026-10-21T11:00:00+02:00',
    }),
  )

  joinCodes.push(
    code('code-dryveld', 'school-90000009', 'DRY4K2', '+27820000091', null, null),
    code('code-langbos', 'school-90000010', 'LANG7M3', '+27820000010', '2026-10-20T12:00:00+02:00', null),
    code('code-river', 'school-90000001', 'RIV2P8', '+27820000001', '2026-10-08T10:00:00+02:00', null),
    code('code-witklip-old', 'school-90000012', 'WIT9Q1', '+27820000012', null, '2026-10-12T08:00:00+02:00'),
  )

  const auditEvents: AuditEvent[] = [
    {
      id: 'audit-seed-1',
      at: '2026-10-24T09:00:00+02:00',
      actorMembershipId: OFFICIAL_MEMBERSHIP,
      action: 'join_code.issued',
      subjectType: 'join_code',
      subjectId: 'code-dryveld',
      summary: 'Issued join code DRY4K2 for Dryveld Example Primary.',
      reason: null,
    },
    {
      id: 'audit-seed-2',
      at: '2026-10-12T08:00:00+02:00',
      actorMembershipId: OFFICIAL_MEMBERSHIP,
      action: 'join_code.withdrawn',
      subjectType: 'join_code',
      subjectId: 'code-witklip-old',
      summary: 'Withdrew join code WIT9Q1 for Witklip Example Primary.',
      reason: null,
    },
  ]

  return {
    asOf: EXAMPLE_AS_OF,
    province: { id: 'province-wc', name: 'Western Cape Education Department' },
    district: {
      id: DISTRICT_ID,
      provinceId: 'province-wc',
      name: 'Eden and Central Karoo Education District',
      active: true,
    },
    schools,
    users,
    memberships,
    officialAssignments: [],
    joinCodes,
    contentReleases: [
      {
        id: RELEASE_ID,
        locale: 'en',
        contentHash: 'example-en-2026-10',
        publishedAt: '2026-10-01T08:00:00+02:00',
        note: 'English lessons for the trial. April 2026 honorarium amounts.',
      },
    ],
    moduleProgress,
    certificates,
    dailyStats,
    monthlyPacks,
    issues,
    auditEvents,
  }
}

function user(id: string, firstName: string, surname: string, cellphone: string, createdAt: string): User {
  return { id, firstName, surname, cellphone, locale: 'en', status: 'active', createdAt }
}

function pack(
  schoolId: string,
  period: string,
  flags: { attendance: boolean; stock: boolean; proof: boolean; at?: string },
  submittedBy: string,
): MonthlyPack {
  const when = flags.at ?? '2026-10-20T12:00:00+02:00'
  return {
    id: `pack-${schoolId}-${period}`,
    schoolId,
    period,
    attendanceRegisterSent: flags.attendance,
    stockFormSent: flags.stock,
    proofOfPaymentSent: flags.proof,
    submittedBy,
    clientRecordedAt: when,
    serverReceivedAt: when,
    replacesId: null,
    correctionReason: null,
  }
}

function issue(
  id: string,
  schoolId: string,
  createdBy: string,
  kind: IssueReport['kind'],
  status: IssueReport['status'],
  body: string,
  createdAt: string,
  extra: Partial<Pick<IssueReport, 'seenBy' | 'seenAt' | 'closedBy' | 'closedAt'>> = {},
): IssueReport {
  return {
    id,
    schoolId,
    createdBy,
    kind,
    body,
    status,
    createdAt,
    seenBy: extra.seenBy ?? null,
    seenAt: extra.seenAt ?? null,
    closedBy: extra.closedBy ?? null,
    closedAt: extra.closedAt ?? null,
  }
}

function code(
  id: string,
  schoolId: string,
  value: string,
  cellphone: string,
  usedAt: string | null,
  withdrawnAt: string | null,
): JoinCode {
  return {
    id,
    schoolId,
    code: value,
    cellphone,
    intendedRole: 'nsnp_coordinator',
    expiresAt: '2026-11-10T15:00:00+02:00',
    usedAt,
    withdrawnAt,
    issuedBy: OFFICIAL_MEMBERSHIP,
  }
}

function addMinutes(time: string, minutes: number): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = hour * 60 + minute + minutes
  const nextHour = String(Math.floor(total / 60)).padStart(2, '0')
  const nextMinute = String(total % 60).padStart(2, '0')
  return `${nextHour}:${nextMinute}`
}

/**
 * Trial records for the district dashboard.
 * Field names follow the user and data plan. A later API can return this
 * same shape. Quiz answer options are not included: officials must not see them.
 */

export type SchoolRole = 'food_handler' | 'smt_member' | 'nsnp_coordinator' | 'principal'

export type Role = SchoolRole | 'district_official' | 'province_admin' | 'super_admin'

export type Scope = 'school' | 'district' | 'province' | 'platform'

export type SchoolPhase = 'primary' | 'secondary' | 'combined' | 'special'

export type Province = {
  id: string
  name: string
}

export type District = {
  id: string
  provinceId: string
  name: string
  active: boolean
}

export type School = {
  id: string
  districtId: string
  schoolNumber: string
  name: string
  phase: SchoolPhase | null
  quintile: number | null
  enrolment: number | null
  active: boolean
}

export type User = {
  id: string
  firstName: string
  surname: string
  cellphone: string
  locale: 'en'
  status: 'active' | 'disabled'
  createdAt: string
}

export type Membership = {
  id: string
  userId: string
  role: Role
  scope: Scope
  schoolId: string | null
  districtId: string | null
  provinceId: string | null
  status: 'pending' | 'active' | 'removed'
  approvedBy: string | null
  startsOn: string
  endsOn: string | null
}

export type OfficialAssignment = {
  membershipId: string
  schoolId: string
}

export type JoinCode = {
  id: string
  schoolId: string
  code: string
  cellphone: string
  intendedRole: 'nsnp_coordinator' | 'principal'
  expiresAt: string
  usedAt: string | null
  withdrawnAt: string | null
  issuedBy: string
}

/** Reusable code the coordinator reads to other staff. It is not tied to one cellphone. */
export type StaffCode = {
  id: string
  schoolId: string
  code: string
  refreshedAt: string
}

export type ContentRelease = {
  id: string
  locale: 'en' | 'af' | 'xh'
  contentHash: string
  publishedAt: string
  note: string
}

export type ModuleProgress = {
  userId: string
  moduleId: string
  visited: boolean
  correct: number
  total: number
  passed: boolean
  contentReleaseId: string
  updatedAt: string
}

export type Certificate = {
  id: string
  userId: string
  schoolId: string
  role: SchoolRole
  contentReleaseId: string
  issuedAt: string
  verificationCode: string
}

export type DailyFeedingStat = {
  id: string
  schoolId: string
  feedingDate: string
  menuNumber: number | null
  breakfastFed: number
  mainMealFed: number
  mainMealTime: string
  submittedBy: string
  clientRecordedAt: string
  serverReceivedAt: string
  clockPlausible: boolean
  replacesId: string | null
  correctionReason: string | null
}

export type MonthlyPack = {
  id: string
  schoolId: string
  period: string
  attendanceRegisterSent: boolean
  stockFormSent: boolean
  proofOfPaymentSent: boolean
  submittedBy: string
  clientRecordedAt: string
  serverReceivedAt: string
  replacesId: string | null
  correctionReason: string | null
}

export type IssueKind = 'delivery' | 'safety' | 'forms' | 'app' | 'other'

export type IssueReport = {
  id: string
  schoolId: string
  createdBy: string
  kind: IssueKind
  body: string
  status: 'open' | 'seen' | 'closed'
  createdAt: string
  seenBy: string | null
  seenAt: string | null
  closedBy: string | null
  closedAt: string | null
}

export type AuditEvent = {
  id: string
  at: string
  actorMembershipId: string
  action: string
  subjectType: string
  subjectId: string
  summary: string
  reason: string | null
}

export type OfficialsSnapshot = {
  asOf: string
  province: Province
  district: District
  schools: School[]
  users: User[]
  memberships: Membership[]
  officialAssignments: OfficialAssignment[]
  joinCodes: JoinCode[]
  staffCodes: StaffCode[]
  contentReleases: ContentRelease[]
  moduleProgress: ModuleProgress[]
  certificates: Certificate[]
  dailyStats: DailyFeedingStat[]
  monthlyPacks: MonthlyPack[]
  issues: IssueReport[]
  auditEvents: AuditEvent[]
}

export type ViewerRole = 'district_official' | 'super_admin'

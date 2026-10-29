import { Route, Routes } from 'react-router'
import { lessonRoutes } from '@/lessonRoutes'
import { OfficialsLayout } from '@/officials/OfficialsLayout'
import { AuditPage } from '@/officials/pages/AuditPage'
import { CodesPage } from '@/officials/pages/CodesPage'
import { DistrictHomePage } from '@/officials/pages/DistrictHomePage'
import { ExportPage } from '@/officials/pages/ExportPage'
import { IssuesPage } from '@/officials/pages/IssuesPage'
import { ReleasesPage } from '@/officials/pages/ReleasesPage'
import { SchoolPage } from '@/officials/pages/SchoolPage'
import { JoinLayout } from '@/prototype/JoinLayout'
import { ExistingProgressPage } from '@/prototype/pages/ExistingProgressPage'
import { JoinDetailsPage } from '@/prototype/pages/JoinDetailsPage'
import { NoticePage } from '@/prototype/pages/NoticePage'
import { PeoplePage } from '@/prototype/pages/PeoplePage'
import { PhonePage } from '@/prototype/pages/PhonePage'
import { PinPage } from '@/prototype/pages/PinPage'
import { PrototypePage } from '@/prototype/pages/PrototypePage'
import { RecoverPage } from '@/prototype/pages/RecoverPage'
import { SmsPage } from '@/prototype/pages/SmsPage'
import { WaitingPage } from '@/prototype/pages/WaitingPage'

function trialRoutes() {
  return (
    <>
      <Route path="prototype" element={<PrototypePage />} />
      <Route path="join" element={<JoinLayout />}>
        <Route index element={<JoinDetailsPage path="coordinator" />} />
        <Route path="coordinator" element={<JoinDetailsPage path="coordinator" />} />
        <Route path="staff" element={<JoinDetailsPage path="staff" />} />
        <Route path="notice" element={<NoticePage />} />
        <Route path="sms" element={<SmsPage />} />
        <Route path="existing" element={<ExistingProgressPage />} />
        <Route path="waiting" element={<WaitingPage />} />
        <Route path="pin" element={<PinPage />} />
        <Route path="phone" element={<PhonePage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="recover" element={<RecoverPage />} />
      </Route>
      <Route path="officials" element={<OfficialsLayout />}>
        <Route index element={<DistrictHomePage />} />
        <Route path="schools/:schoolId" element={<SchoolPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="codes" element={<CodesPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="releases" element={<ReleasesPage />} />
      </Route>
    </>
  )
}

/** Website build. The trial stays here. Store builds do not import this module. */
export function WebApp() {
  return (
    <Routes>
      {trialRoutes()}
      {lessonRoutes()}
    </Routes>
  )
}

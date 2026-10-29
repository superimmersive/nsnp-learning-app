import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { ProgressProvider } from '@/context/ProgressContext'
import { OfficialsLayout } from '@/officials/OfficialsLayout'
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
import { AuditPage } from '@/officials/pages/AuditPage'
import { CodesPage } from '@/officials/pages/CodesPage'
import { DistrictHomePage } from '@/officials/pages/DistrictHomePage'
import { ExportPage } from '@/officials/pages/ExportPage'
import { IssuesPage } from '@/officials/pages/IssuesPage'
import { ReleasesPage } from '@/officials/pages/ReleasesPage'
import { SchoolPage } from '@/officials/pages/SchoolPage'
import { CalculatorPage } from '@/pages/CalculatorPage'
import { CertificatePage } from '@/pages/CertificatePage'
import { ChecklistPage } from '@/pages/ChecklistPage'
import { ChecklistsPage } from '@/pages/ChecklistsPage'
import { DeadlinesPage } from '@/pages/DeadlinesPage'
import { HomePage } from '@/pages/HomePage'
import { ModulePage } from '@/pages/ModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// The native lesson build drops this import. Guides stay on the website.
const HelpPage = import.meta.env.MODE === 'native' ? null : lazy(() => import('@/pages/HelpPage'))

function SchoolApp() {
  return (
    <ProgressProvider>
      <AppShell />
    </ProgressProvider>
  )
}

export default function App() {
  return (
    <Routes>
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
      <Route element={<SchoolApp />}>
        <Route index element={<HomePage />} />
        {HelpPage && (
          <Route
            path="help"
            element={
              <Suspense fallback={<p>Loading the guides.</p>}>
                <HelpPage />
              </Suspense>
            }
          />
        )}
        <Route path="module/:moduleId" element={<ModulePage />} />
        <Route path="checklists" element={<ChecklistsPage />} />
        <Route path="checklists/:checklistId" element={<ChecklistPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="certificate" element={<CertificatePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

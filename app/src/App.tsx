import { Route, Routes } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { ProgressProvider } from '@/context/ProgressContext'
import { OfficialsLayout } from '@/officials/OfficialsLayout'
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

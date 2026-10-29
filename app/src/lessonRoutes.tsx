import { Route } from 'react-router'
import { AppShell } from '@/components/AppShell'
import { ProgressProvider } from '@/context/ProgressContext'
import { CalculatorPage } from '@/pages/CalculatorPage'
import { CertificatePage } from '@/pages/CertificatePage'
import { ChecklistPage } from '@/pages/ChecklistPage'
import { ChecklistsPage } from '@/pages/ChecklistsPage'
import { DeadlinesPage } from '@/pages/DeadlinesPage'
import { HomePage } from '@/pages/HomePage'
import { ModulePage } from '@/pages/ModulePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'

/** Lesson routes shared by the store build and the website. Called inside Routes so the Route elements stay visible. */
export function lessonRoutes() {
  return (
    <>
      <Route path="privacy" element={<PrivacyPage />} />
      <Route
        element={
          <ProgressProvider>
            <AppShell />
          </ProgressProvider>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="module/:moduleId" element={<ModulePage />} />
        <Route path="checklists" element={<ChecklistsPage />} />
        <Route path="checklists/:checklistId" element={<ChecklistPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="certificate" element={<CertificatePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </>
  )
}

import { Route, Routes } from 'react-router'
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

export default function App() {
  return (
    <ProgressProvider>
      <Routes>
        <Route element={<AppShell />}>
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
    </ProgressProvider>
  )
}

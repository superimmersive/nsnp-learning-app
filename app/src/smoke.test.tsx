import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

function renderAt(path: string) {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('app smoke', () => {
  it('lists all 11 modules on the home screen', () => {
    const html = renderAt('/')
    expect(html).toContain('NSNP 2026 roadshow')
    expect(html).toContain('What is the NSNP?')
    expect(html).toContain('Daily feeding statistics')
    expect(html).toContain('Preparation area documents')
    expect(html).toContain('Deadlines and times')
  })

  it('renders a lesson, the deadlines, and a checklist', () => {
    expect(renderAt('/module/safety')).toContain('Open the cylinder')
    expect(renderAt('/deadlines')).toContain('13:30')
    expect(renderAt('/checklists/monthly-forms')).toContain('Stock-left column')
    expect(renderAt('/calculator')).toContain('Estimate')
  })
})

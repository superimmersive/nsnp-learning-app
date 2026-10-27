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

  it('keeps the school home separate from the officials dashboard', () => {
    const home = renderAt('/')
    expect(home).toContain('NSNP 2026 roadshow')
    expect(home).not.toContain('/officials')
    expect(home).not.toContain('/prototype')
    expect(home).not.toContain('/join')
    expect(home).not.toContain('Example data - trial prototype')
  })

  it('opens the prototype menu and the join flow away from the lessons', () => {
    const menu = renderAt('/prototype')
    expect(menu).toContain('Example data - trial prototype')
    expect(menu).toContain('Coordinator first claim')
    expect(menu).toContain('Staff join')
    expect(menu).toContain('Shared kitchen phone')
    expect(menu).toContain('Officials dashboard')
    expect(renderAt('/join')).toContain('Join this school')
    expect(renderAt('/join/waiting')).toContain('The coordinator still needs to approve you.')
    expect(renderAt('/join/phone')).toContain('Saved on this phone')
  })

  it('opens the district dashboard on its own route', () => {
    const html = renderAt('/officials')
    expect(html).toContain('Example data - trial prototype')
    expect(html).toContain('Eden and Central Karoo')
    expect(html).toContain('Active schools')
  })
})

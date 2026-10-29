import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HelpPage from './HelpPage'

describe('trial help', () => {
  it('shows the coordinator, official, and quick-start guides', () => {
    const html = renderToString(<HelpPage />)
    expect(html).toContain('School coordinator guide')
    expect(html).toContain('District official guide')
    expect(html).toContain('Coordinator quick start')
    expect(html).toContain('082 000 0000')
    expect(html).not.toContain('123456')
    expect(html).not.toContain('HRB5K2')
  })
})
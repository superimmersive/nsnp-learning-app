import { describe, expect, it } from 'vitest'
import { privacyContact, privacyPolicy, privacySupportUrl, renderPrivacyHtml } from './privacyPolicy.ts'

describe('privacy notice', () => {
  it('states the store answers and the existing website trial wording', () => {
    const html = renderPrivacyHtml({ homeHref: '/nsnp-learning-app/' })

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html).toContain(privacyPolicy.title)
    expect(html).toContain('The store apps are lessons only.')
    expect(html).toContain('The store apps collect no data and share no data. They do not track.')
    expect(html).toContain('There is no analytics and no crash reporter.')
    expect(html).toContain('There are no ads and no tracking.')
    expect(html).toContain('Clear progress on this phone')
    expect(html).toContain('Website trial accounts')
    expect(html).toContain('That trial is not in the App Store or Play build.')
    expect(html).toContain('The trial host is outside South Africa.')
    expect(html).toContain(privacySupportUrl)
    expect(html).toContain(privacyContact.company)
    expect(html).toContain(`mailto:${privacyContact.email}`)
    expect(html).toContain('href="/nsnp-learning-app/"')
    expect(html).toContain('rel="canonical" href="https://superimmersive.io/nsnp-learning-app/privacy"')

    for (const section of privacyPolicy.sections) {
      expect(html).toContain(section.heading)
      for (const parts of section.paragraphs) {
        for (const part of parts) expect(html).toContain(part.text)
      }
    }
  })

  it('escapes the home link', () => {
    const html = renderPrivacyHtml({ homeHref: '/nsnp/?q=1&next=2"onclick' })
    expect(html).toContain('href="/nsnp/?q=1&amp;next=2&quot;onclick"')
    expect(html).not.toContain('"onclick"')
  })
})

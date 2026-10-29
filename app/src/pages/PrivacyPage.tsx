import { Link } from 'react-router'
import { privacyPolicy, type PrivacyText } from '@/privacyPolicy'

function paragraphKey(parts: PrivacyText[]): string {
  return parts.map((part) => `${part.href ?? ''}:${part.text}`).join('|')
}

export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-sm font-semibold">
            NSNP Learning
          </Link>
          <Link to="/" className="text-sm font-semibold text-gold-bright">
            Lessons
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 pb-16 text-base leading-relaxed">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">{privacyPolicy.kicker}</p>
        <h1 className="text-2xl font-semibold text-navy">{privacyPolicy.title}</h1>
        {privacyPolicy.intro.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {privacyPolicy.sections.map((section) => (
          <section key={section.id} className="space-y-2" aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`} className="text-lg font-semibold text-navy">
              {section.heading}
            </h2>
            {section.paragraphs.map((parts) => (
              <p key={paragraphKey(parts)}>
                {parts.map((part) =>
                  part.href ? (
                    <a key={`${part.href}:${part.text}`} className="font-semibold text-blue" href={part.href}>
                      {part.text}
                    </a>
                  ) : (
                    <span key={part.text}>{part.text}</span>
                  ),
                )}
              </p>
            ))}
          </section>
        ))}
        {privacyPolicy.footer.map((paragraph) => (
          <p key={paragraph} className="text-sm text-muted">
            {paragraph}
          </p>
        ))}
      </main>
    </div>
  )
}

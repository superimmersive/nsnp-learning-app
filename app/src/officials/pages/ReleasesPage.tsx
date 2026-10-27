import { useOfficials } from '../store'
import { formatWhen } from '../time'
import { SuperOnly } from '../ui'

const LOCALE: Record<string, string> = {
  en: 'English',
  af: 'Afrikaans',
  xh: 'isiXhosa',
}

export function ReleasesPage() {
  const { snapshot } = useOfficials()
  return (
    <SuperOnly title="Content releases">
      <h1 className="text-2xl font-semibold text-navy">Content releases</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        Lessons the phones are learning from. This prototype only shows the example release. Publishing a new pack is
        not switched on.
      </p>
      <div className="mt-4 grid gap-3">
        {snapshot.contentReleases.map((release) => (
          <article key={release.id} className="rounded-xl border border-line bg-white p-4">
            <h2 className="font-semibold text-navy">{LOCALE[release.locale] ?? release.locale}</h2>
            <p className="mt-2 text-sm">{release.note}</p>
            <p className="mt-2 text-sm text-muted">
              Published {formatWhen(release.publishedAt)}. Reference {release.contentHash}.
            </p>
          </article>
        ))}
      </div>
    </SuperOnly>
  )
}

import coordinator from '../../../docs/guides/coordinator.md?raw'
import official from '../../../docs/guides/official.md?raw'
import quickStart from '../../../docs/guides/quick-start.md?raw'
import { GuideMarkdown } from './guideMarkdown'

const guides = [
  { id: 'quick-start', label: 'Quick start', source: quickStart },
  { id: 'coordinator', label: 'Coordinator', source: coordinator },
  { id: 'official', label: 'District official', source: official },
]

export default function HelpPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Help for the trial</h1>
      <p className="mt-2 text-base leading-relaxed">
        Lessons work with no login. These steps are for joining a school and for the district dashboard.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {guides.map((guide) => (
          <li key={guide.id}>
            <a href={`#${guide.id}`} className="inline-flex h-10 items-center rounded-lg bg-white px-3 text-sm font-semibold text-navy">
              {guide.label}
            </a>
          </li>
        ))}
      </ul>
      {guides.map((guide) => (
        <section key={guide.id} id={guide.id} className="mt-10 border-t border-line pt-6">
          <GuideMarkdown source={guide.source} />
        </section>
      ))}
    </div>
  )
}

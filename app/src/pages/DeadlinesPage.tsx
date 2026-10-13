import { Link } from 'react-router'
import { content } from '@/lib/content'

export function DeadlinesPage() {
  const copy = content.ui.deadlines

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink">{copy.intro}</p>
      <div className="mt-4 grid gap-2">
        <Link to="/calculator" className="rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white">
          {copy.toCalculator}
        </Link>
        <Link
          to="/module/volunteer-food-handlers"
          className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-navy"
        >
          {copy.toHonorarium}
        </Link>
      </div>
      <div className="mt-5 space-y-5">
        {content.deadlines.map((group) => (
          <section key={group.id} aria-labelledby={`deadline-${group.id}`}>
            <h2 id={`deadline-${group.id}`} className="text-sm font-semibold uppercase tracking-wide text-muted">
              {group.title}
            </h2>
            <ul className="mt-2 space-y-2">
              {group.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-white px-4 py-3">
                  <p className="text-xl font-semibold text-navy">{item.when}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useProgress } from '@/context/ProgressContext'
import { content } from '@/lib/content'
import { checklistDone } from '@/lib/progress'

export function ChecklistsPage() {
  const copy = content.ui.checklists
  const { state } = useProgress()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink">{copy.intro}</p>
      <ul className="mt-4 space-y-2">
        {content.checklists.map((list) => {
          const done = checklistDone(
            state,
            list.id,
            list.items.map((item) => item.id),
          )
          return (
            <li key={list.id}>
              <Link
                to={`/checklists/${list.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
              >
                <span>
                  <span className="block text-base font-semibold text-navy">{list.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{list.summary}</span>
                  <span className="mt-1 block text-xs font-semibold text-blue">
                    {done} / {list.items.length} {copy.done}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

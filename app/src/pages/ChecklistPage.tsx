import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useProgress } from '@/context/ProgressContext'
import { content, getChecklist } from '@/lib/content'
import { checklistDone } from '@/lib/progress'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function ChecklistPage() {
  const { checklistId } = useParams()
  const list = getChecklist(checklistId)
  const { state, toggleCheck, clearChecks } = useProgress()
  const copy = content.ui.checklists

  if (!list) return <NotFoundPage />

  const itemIds = list.items.map((item) => item.id)
  const done = checklistDone(state, list.id, itemIds)
  const ticks = state.checks[list.id] ?? {}

  return (
    <div>
      <Link to="/checklists" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {copy.back}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold leading-tight text-navy">{list.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{list.summary}</p>
      <p className="mt-2 text-sm font-semibold text-blue">
        {done} / {list.items.length} {copy.done}
      </p>
      {done === 0 && <p className="mt-1 text-sm text-muted">{copy.none}</p>}
      <ul className="mt-4 space-y-2">
        {list.items.map((item) => {
          const checked = Boolean(ticks[item.id])
          return (
            <li key={item.id}>
              <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3 py-3">
                <Checkbox checked={checked} onCheckedChange={() => toggleCheck(list.id, item.id)} />
                <span>
                  <span className={`block text-base leading-snug ${checked ? 'text-muted line-through' : 'text-ink'}`}>
                    {item.label}
                  </span>
                  {item.hint && <span className="mt-1 block text-sm leading-snug text-muted">{item.hint}</span>}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {done > 0 && (
        <Button variant="outline" className="mt-4 w-full" onClick={() => clearChecks(list.id)}>
          {copy.clear}
        </Button>
      )}
    </div>
  )
}

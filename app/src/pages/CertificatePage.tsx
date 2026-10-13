import { Printer } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProgress } from '@/context/ProgressContext'
import { content } from '@/lib/content'
import { formatLongDate } from '@/lib/format'
import { passedCount } from '@/lib/progress'
import { fill } from '@/lib/utils'

export function CertificatePage() {
  const copy = content.ui.certificate
  const { state, setProfile, reset } = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const moduleIds = content.modules.map((module) => module.id)
  const passed = passedCount(state, moduleIds)
  const ready = passed === content.modules.length
  const remaining = content.modules.filter((module) => !state.modules[module.id]?.passed)
  const latest = content.modules
    .map((module) => state.modules[module.id]?.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  const date = latest ? formatLongDate(latest) : ''
  const name = state.name.trim() || copy.yourName
  const school = state.school.trim() || copy.yourSchool
  const role = state.role.trim() || copy.yourRole

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">{copy.title}</h1>
      <div className="no-print mt-4 grid gap-3">
        <div>
          <Label htmlFor="cert-name">{copy.nameLabel}</Label>
          <Input
            id="cert-name"
            className="mt-1"
            autoComplete="name"
            placeholder={copy.namePlaceholder}
            value={state.name}
            onChange={(event) => setProfile({ name: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cert-school">{copy.schoolLabel}</Label>
          <Input
            id="cert-school"
            className="mt-1"
            placeholder={copy.schoolPlaceholder}
            value={state.school}
            onChange={(event) => setProfile({ school: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="cert-role">{copy.roleLabel}</Label>
          <select
            id="cert-role"
            className="mt-1 flex h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
            value={state.role}
            onChange={(event) => setProfile({ role: event.target.value })}
          >
            <option value="">{copy.roleLabel}</option>
            {copy.roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!ready ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-navy">{copy.lockedTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            {copy.lockedBody} {passed} / {content.modules.length}.
          </p>
          <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">{copy.remaining}</h3>
          <ul className="mt-2 space-y-2">
            {remaining.map((module) => (
              <li key={module.id}>
                <Link
                  to={`/module/${module.id}`}
                  className="block min-h-12 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-navy"
                >
                  {module.number}. {module.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <article className="certificate overflow-hidden rounded-xl border-2 border-navy bg-white">
            <div className="h-2 bg-gold-bright" />
            <div className="px-5 py-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue">{copy.previewKicker}</p>
              <h2 className="mt-2 text-xl font-semibold leading-tight text-navy">{copy.previewTitle}</h2>
              <p className="mt-1 text-sm text-muted">
                {content.meta.programme} · {content.meta.year}
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink">{fill(copy.body, { name, school, role })}</p>
              <dl className="mt-5 grid gap-3 text-sm">
                <div>
                  <dt className="font-semibold text-navy">{copy.dateLabel}</dt>
                  <dd>{date}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">{copy.presentersLabel}</dt>
                  <dd>{content.meta.presenters.join(' · ')}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-navy">{content.meta.district}</dt>
                  <dd>{content.meta.audience}</dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-relaxed text-muted">{copy.disclaimer}</p>
            </div>
          </article>

          <Button className="no-print w-full" onClick={() => window.print()}>
            <Printer className="h-5 w-5" aria-hidden="true" />
            {copy.print}
          </Button>
        </div>
      )}

      <div className="no-print mt-8 border-t border-line pt-4">
        {!confirmReset ? (
          <button type="button" className="text-sm font-semibold text-muted underline" onClick={() => setConfirmReset(true)}>
            {copy.reset}
          </button>
        ) : (
          <div className="rounded-xl border border-bad bg-bad-soft p-3">
            <p className="text-sm leading-relaxed text-ink">{copy.resetWarn}</p>
            <div className="mt-3 grid gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                }}
              >
                {copy.resetYes}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                {copy.resetNo}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

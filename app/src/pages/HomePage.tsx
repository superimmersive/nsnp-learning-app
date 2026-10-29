import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProgress } from '@/context/ProgressContext'
import { content } from '@/lib/content'
import { passedCount } from '@/lib/progress'

function statusFor(visited: boolean, passed: boolean) {
  if (passed) return { label: content.ui.home.passed, className: 'bg-good-soft text-good' }
  if (visited) return { label: content.ui.home.inProgress, className: 'bg-gold-soft text-gold' }
  return { label: content.ui.home.notStarted, className: 'bg-paper text-muted' }
}

export function HomePage() {
  const copy = content.ui.home
  const { state } = useProgress()
  const total = content.modules.length
  const passed = passedCount(
    state,
    content.modules.map((module) => module.id),
  )
  const next = content.modules.find((module) => !state.modules[module.id]?.passed)
  const done = passed === total

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">{copy.kicker}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-navy">{copy.title}</h1>
        <p className="mt-1 text-sm font-medium text-muted">{content.meta.district}</p>
        <p className="mt-3 text-base leading-relaxed text-ink">{copy.intro}</p>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm font-semibold text-navy">{copy.passedLabel}</p>
            <p className="text-sm font-semibold text-ink">
              {passed} / {total}
            </p>
          </div>
          <Progress className="mt-2" value={(passed / total) * 100} aria-label={copy.passedLabel} />
          <p className="mt-2 text-xs text-muted">{copy.passNote}</p>
          <Button asChild className="mt-3 w-full">
            {done ? (
              <Link to="/certificate">{copy.certificateReady}</Link>
            ) : (
              <Link to={next ? `/module/${next.id}` : '/module/what-is-nsnp'}>
                {next && next.number > 1 ? `${copy.continue}: ${next.title}` : copy.start}
              </Link>
            )}
          </Button>
        </CardContent>
      </Card>

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          {copy.toolsTitle}
        </h2>
        <div className="mt-2 grid gap-2">
          {[
            { to: '/deadlines', title: copy.toolDeadlines, hint: copy.toolDeadlinesHint },
            { to: '/calculator', title: copy.toolCalculator, hint: copy.toolCalculatorHint },
            { to: '/checklists', title: copy.toolLists, hint: copy.toolListsHint },
          ].map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span>
                <span className="block text-sm font-semibold text-navy">{tool.title}</span>
                <span className="block text-xs text-muted">{tool.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="text-sm font-semibold uppercase tracking-wide text-muted">
          {copy.modulesTitle}
        </h2>
        <ol className="mt-2 space-y-2">
          {content.modules.map((module) => {
            const record = state.modules[module.id]
            const status = statusFor(Boolean(record?.visited), Boolean(record?.passed))
            return (
              <li key={module.id}>
                <Link
                  to={`/module/${module.id}`}
                  className="flex items-start gap-3 rounded-xl border border-line bg-white px-3 py-3"
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-navy">
                    <img
                      src={`${import.meta.env.BASE_URL}illustrations/${module.image}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-navy/85 px-1 text-[11px] font-semibold leading-4 text-white">
                      {module.number}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold leading-snug text-navy">{module.title}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{module.summary}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={status.className}>{status.label}</Badge>
                      <span className="text-xs text-muted">
                        {module.minutes} {copy.minutes}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      <footer className="pb-2 text-sm leading-relaxed text-muted">
        <p>
          {copy.presenters}: {content.meta.presenters.join(' and ')}. {content.meta.audience}.
        </p>
        {import.meta.env.MODE !== 'native' && <p className="mt-2">{content.ui.installHint}</p>}
        <p className="mt-2">
          <Link to="/privacy" className="font-semibold text-blue">
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  )
}

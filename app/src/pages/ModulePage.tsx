import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { HonorariumScale, HonorariumTool } from '@/components/HonorariumTool'
import { LessonFigure } from '@/components/LessonFigure'
import { MealCalculator } from '@/components/MealCalculator'
import { Quiz } from '@/components/Quiz'
import { Badge } from '@/components/ui/badge'
import { useProgress } from '@/context/ProgressContext'
import { content, getModule } from '@/lib/content'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function ModulePage() {
  const { moduleId } = useParams()
  const module = getModule(moduleId)
  const { markVisited } = useProgress()

  useEffect(() => {
    if (!module) return
    document.title = `${module.title} · NSNP`
    markVisited(module.id)
    return () => {
      document.title = content.meta.documentTitle
    }
  }, [module, markVisited])

  if (!module) return <NotFoundPage />

  return (
    <article>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {content.ui.module.back}
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-blue">
        Module {module.number} of {content.modules.length} · {module.minutes} {content.ui.home.minutes}
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-tight text-navy">{module.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink">{module.summary}</p>
      <LessonFigure className="mt-4" src={module.image} alt={module.imageAlt} />

      <div className="mt-4 space-y-3">
        {module.cards.map((card) => (
          <section key={card.title} className="rounded-xl border border-line bg-white px-4 py-4">
            {card.flag && <Badge className="mb-2 bg-gold-soft text-gold">{card.flag}</Badge>}
            <h2 className="text-base font-semibold text-navy">{card.title}</h2>
            {card.image && card.imageAlt && (
              <LessonFigure className="mt-3" src={card.image} alt={card.imageAlt} />
            )}
            {card.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-sm leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
            {card.bullets && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink">
                {card.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
            {card.steps && (
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm font-medium leading-relaxed text-navy">
                {card.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      {module.tool === 'honorarium' && (
        <>
          <div className="mt-4">
            <HonorariumScale />
          </div>
          <HonorariumTool />
        </>
      )}
      {module.tool === 'meal-estimate' && <MealCalculator />}

      <section className="mt-4 rounded-xl border border-gold bg-gold-soft px-4 py-4" aria-labelledby="key-rules">
        <h2 id="key-rules" className="text-base font-semibold text-navy">
          {content.ui.module.keyRules}
        </h2>
        <ul className="mt-2 space-y-2">
          {module.keyRules.map((rule) => (
            <li key={rule} className="border-l-4 border-gold pl-3 text-sm leading-relaxed text-ink">
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <Quiz moduleId={module.id} questions={module.quiz} />
    </article>
  )
}

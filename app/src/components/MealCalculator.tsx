import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { estimateMeals } from '@/lib/calculator'
import { content } from '@/lib/content'

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function MealCalculator({ asPage = false }: { asPage?: boolean }) {
  const copy = content.ui.calculator
  const Title = asPage ? 'h1' : 'h2'
  const [breakfast, setBreakfast] = useState('')
  const [main, setMain] = useState('')
  const [schoolType, setSchoolType] = useState(copy.schoolTypes[1] ?? copy.schoolTypes[0])
  const breakfastCount = breakfast === '' ? 0 : Number(breakfast)
  const mainCount = main === '' ? 0 : Number(main)
  const lines = estimateMeals(breakfastCount, mainCount)
  const hasLearners = breakfastCount > 0 || mainCount > 0

  return (
    <section className={asPage ? '' : 'mt-4'} aria-labelledby="meal-calculator">
      <div className="flex items-start justify-between gap-3">
        <Title id="meal-calculator" className={`${asPage ? 'text-2xl' : 'text-lg'} font-semibold text-navy`}>
          {copy.title}
        </Title>
        <Badge>{copy.estimateTag}</Badge>
      </div>
      {asPage && <p className="mt-2 text-base leading-relaxed text-ink">{copy.intro}</p>}
      <div className="mt-4 rounded-xl border border-line bg-white p-4">
      <p className="mt-2 rounded-lg border border-gold bg-gold-soft px-3 py-3 text-sm leading-relaxed text-navy">
        {copy.disclaimer}
      </p>
      <div className="mt-3 grid gap-3">
        <div>
          <Label htmlFor="breakfast-count">{copy.breakfastLabel}</Label>
          <Input
            id="breakfast-count"
            className="mt-1"
            inputMode="numeric"
            autoComplete="off"
            value={breakfast}
            onChange={(event) => setBreakfast(digitsOnly(event.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="main-count">{copy.mainLabel}</Label>
          <Input
            id="main-count"
            className="mt-1"
            inputMode="numeric"
            autoComplete="off"
            value={main}
            onChange={(event) => setMain(digitsOnly(event.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="school-type">{copy.schoolTypeLabel}</Label>
          <select
            id="school-type"
            className="mt-1 flex h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30"
            value={schoolType}
            onChange={(event) => setSchoolType(event.target.value)}
          >
            {copy.schoolTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm leading-relaxed text-muted">{copy.official}</p>
        </div>
      </div>
      {!hasLearners ? (
        <p className="mt-3 text-sm text-muted">{copy.empty}</p>
      ) : (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-navy">{copy.resultTitle}</h3>
          <p className="mt-1 text-xs text-muted">
            {content.mealEstimate.exampleLabel}. {schoolType}.
          </p>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {lines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3 px-3 py-3">
                <span>
                  <span className="block text-sm font-semibold text-ink">{line.name}</span>
                  <span className="block text-xs text-muted">{line.when}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-navy">{line.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </section>
  )
}

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { lookupHonorarium, type SchoolSize } from '@/lib/calculator'
import { content } from '@/lib/content'
import { bandLabel, formatRand } from '@/lib/format'

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function HonorariumScale() {
  const copy = content.ui.honorarium
  const groups = [content.honorarium.large, content.honorarium.small]
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted">{copy.scaleNote}</p>
      {groups.map((group) => (
        <div key={group.label} className="overflow-hidden rounded-xl border border-line bg-white">
          <h3 className="bg-navy px-3 py-2 text-sm font-semibold text-white">{group.label}</h3>
          <ul>
            {group.bands.map((band) => (
              <li
                key={`${band.min}-${band.max}`}
                className="grid grid-cols-[1fr_auto] gap-x-3 border-t border-line px-3 py-3 text-sm"
              >
                <span>
                  <span className="block font-semibold text-navy">
                    {bandLabel(band.min, band.max, copy.andAbove)} {copy.learnersFed.toLowerCase()}
                  </span>
                  <span className="text-muted">
                    {band.volunteers} {copy.volunteers.toLowerCase()}
                  </span>
                </span>
                <span className="self-center font-semibold text-ink">{formatRand(band.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-sm leading-relaxed text-muted">
        UIF: {content.honorarium.uifLabel} ({content.honorarium.uifPeriod}).
      </p>
    </div>
  )
}

export function HonorariumTool() {
  const copy = content.ui.honorarium
  const [size, setSize] = useState<SchoolSize>('large')
  const [raw, setRaw] = useState('')
  const learners = raw === '' ? 0 : Number(raw)
  const result = raw === '' ? null : lookupHonorarium(size, learners)

  return (
    <section className="mt-4 rounded-xl border border-line bg-white p-4" aria-labelledby="honorarium-tool">
      <h2 id="honorarium-tool" className="text-lg font-semibold text-navy">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{copy.intro}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(
          [
            ['large', copy.large],
            ['small', copy.small],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={size === value}
            onClick={() => setSize(value)}
            className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
              size === value ? 'border-blue bg-blue-soft text-navy' : 'border-line bg-white text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Label htmlFor="learners-fed">{copy.learnersLabel}</Label>
        <Input
          id="learners-fed"
          className="mt-1"
          inputMode="numeric"
          autoComplete="off"
          value={raw}
          onChange={(event) => setRaw(digitsOnly(event.target.value))}
        />
      </div>
      {result && !result.ok && (
        <p className="mt-3 text-sm leading-relaxed text-bad" role="status">
          {result.reason === 'enter' && copy.enter}
          {result.reason === 'small-too-high' && copy.smallTooHigh}
          {result.reason === 'none' && copy.none}
        </p>
      )}
      {result?.ok && (
        <div className="mt-3 rounded-lg bg-navy px-4 py-3 text-white" role="status">
          <p className="text-xs uppercase tracking-wide text-white/70">
            {bandLabel(result.min, result.max, copy.andAbove)}
          </p>
          <p className="mt-1 text-2xl font-semibold">{formatRand(result.amount)}</p>
          <p className="text-sm text-white/80">
            {result.volunteers} {copy.volunteers.toLowerCase()} · {copy.paidToSchool.toLowerCase()}
          </p>
        </div>
      )}
    </section>
  )
}

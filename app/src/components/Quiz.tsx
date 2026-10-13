import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useProgress } from '@/context/ProgressContext'
import { isPassingScore, requiredCorrect } from '@/lib/calculator'
import { content } from '@/lib/content'
import type { QuizQuestion } from '@/lib/types'

type QuizProps = {
  moduleId: string
  questions: QuizQuestion[]
}

export function Quiz({ moduleId, questions }: QuizProps) {
  const copy = content.ui.module
  const { state, recordQuiz } = useProgress()
  const saved = state.modules[moduleId]
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({})
  const [checked, setChecked] = useState(false)
  const [warning, setWarning] = useState(false)
  const total = questions.length
  const need = requiredCorrect(total)
  const correctNow = questions.filter((question) => answers[question.id] === question.answer).length
  const passedNow = isPassingScore(correctNow, total)

  function check() {
    const complete = questions.every((question) => answers[question.id] !== undefined)
    if (!complete) {
      setWarning(true)
      return
    }
    setWarning(false)
    setChecked(true)
    recordQuiz(moduleId, correctNow, total)
  }

  function retry() {
    setAnswers({})
    setChecked(false)
    setWarning(false)
  }

  return (
    <section className="mt-6" aria-labelledby="quiz-heading">
      <h2 id="quiz-heading" className="text-lg font-semibold text-navy">
        {copy.quizTitle}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{copy.quizIntro}</p>
      <ol className="mt-3 space-y-3">
        {questions.map((question, index) => {
          const selected = answers[question.id]
          const isCorrect = selected === question.answer
          return (
            <li key={question.id}>
              <Card>
                <CardContent className="py-4">
                  <fieldset>
                    <legend className="text-base font-semibold leading-snug text-ink">
                      {index + 1}. {question.prompt}
                    </legend>
                    <div className="mt-3 grid gap-2">
                      {question.options.map((option, optionIndex) => {
                        const chosen = selected === optionIndex
                        const show = checked && chosen
                        return (
                          <label
                            key={option}
                            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm leading-snug ${
                              show && isCorrect
                                ? 'border-good bg-good-soft'
                                : show && !isCorrect
                                  ? 'border-bad bg-bad-soft'
                                  : chosen
                                    ? 'border-blue bg-blue-soft'
                                    : 'border-line bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`${moduleId}-${question.id}`}
                              className="mt-1 h-4 w-4 shrink-0 accent-navy"
                              checked={chosen}
                              disabled={checked}
                              onChange={() =>
                                setAnswers((current) => ({ ...current, [question.id]: optionIndex }))
                              }
                            />
                            <span>{option}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                  {checked && selected !== undefined && (
                    <p className={`mt-3 text-sm leading-relaxed ${isCorrect ? 'text-good' : 'text-bad'}`}>
                      <span className="font-semibold">{isCorrect ? copy.correct : copy.notQuite}. </span>
                      {question.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ol>
      {warning && (
        <p className="mt-3 text-sm font-medium text-bad" role="status">
          {copy.answerAll}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {!checked ? (
          <Button type="button" onClick={check}>
            {copy.checkAnswers}
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={retry}>
            {copy.tryAgain}
          </Button>
        )}
      </div>
      {checked && (
        <p className="mt-3 text-sm leading-relaxed text-navy" role="status">
          {copy.thisTry}: {correctNow} / {total}. {copy.passMark}: {need} / {total}.{' '}
          {passedNow ? copy.passed : copy.notPassed}.
          {saved?.passed && (
            <>
              {' '}
              {copy.best}: {saved.correct} / {saved.total}. {copy.passed}.
            </>
          )}
        </p>
      )}
    </section>
  )
}

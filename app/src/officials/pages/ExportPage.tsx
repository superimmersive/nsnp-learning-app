import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { trialListCsv } from '../csv'
import { schoolRows, toneLabel } from '../metrics'
import { useOfficials } from '../store'
import { ToneBadge } from '../ui'

export function ExportPage() {
  const { snapshot } = useOfficials()
  const rows = schoolRows(snapshot)
  const [saved, setSaved] = useState(false)

  function download() {
    const csv = trialListCsv(snapshot)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'eden-central-karoo-trial-schools.csv'
    link.click()
    URL.revokeObjectURL(url)
    setSaved(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Export the trial list</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed">
        One row per trial school. The file is built in this browser from the example data. It has no cellphone numbers
        and no quiz answers.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={download}>
          Download CSV
        </Button>
        <p className="text-sm text-muted">{rows.length} schools</p>
      </div>
      {saved && <p className="mt-3 text-sm text-navy">The file download has started.</p>}
      <ul className="mt-6 grid gap-2 sm:hidden">
        {rows.map((row) => (
          <li key={row.schoolId} className="rounded-xl border border-line bg-white p-3 text-sm">
            <span className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-semibold text-navy">{row.name}</span>
                <span className="text-muted">EMIS {row.schoolNumber}</span>
              </span>
              <ToneBadge tone={row.tone} />
            </span>
            <p className="mt-2">
              {row.coordinator} · {row.modulesPassed} modules passed
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-line bg-white sm:block">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="bg-paper text-navy">
            <tr>
              <th className="px-3 py-3">EMIS</th>
              <th className="px-3 py-3">School</th>
              <th className="px-3 py-3">Coordinator</th>
              <th className="px-3 py-3">Modules passed</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.schoolId} className="border-t border-line">
                <td className="px-3 py-3">{row.schoolNumber}</td>
                <td className="px-3 py-3">{row.name}</td>
                <td className="px-3 py-3">{row.coordinator}</td>
                <td className="px-3 py-3">{row.modulesPassed}</td>
                <td className="px-3 py-3">{toneLabel(row.tone)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

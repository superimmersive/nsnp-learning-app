import { readFile } from 'node:fs/promises'
import type pg from 'pg'

export type SchoolRow = {
  schoolNumber: string
  name: string
  phase: 'primary' | 'secondary' | 'combined' | 'special' | null
  quintile: number | null
  enrolment: number | null
  district: string | null
}

const PHASES = new Set(['primary', 'secondary', 'combined', 'special'])

export function parseSchoolCsv(text: string): SchoolRow[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const header = splitCsv(lines[0] ?? '').map((cell) => cell.trim().toLowerCase())
  const index = (name: string) => header.indexOf(name)
  if (index('school_number') < 0 || index('name') < 0) {
    throw new Error('The school CSV needs school_number and name columns')
  }
  return lines.slice(1).map((line, lineNumber) => {
    const cells = splitCsv(line)
    const schoolNumber = cells[index('school_number')]?.trim() ?? ''
    const name = cells[index('name')]?.trim() ?? ''
    if (!schoolNumber || !name) throw new Error(`Row ${lineNumber + 2} is missing a school number or name`)
    const phaseRaw = value(cells, index('phase'))
    if (phaseRaw && !PHASES.has(phaseRaw)) throw new Error(`Row ${lineNumber + 2} has an unknown phase`)
    const quintileRaw = value(cells, index('quintile'))
    const enrolmentRaw = value(cells, index('enrolment'))
    return {
      schoolNumber,
      name,
      phase: (phaseRaw || null) as SchoolRow['phase'],
      quintile: quintileRaw ? Number(quintileRaw) : null,
      enrolment: enrolmentRaw ? Number(enrolmentRaw) : null,
      district: value(cells, index('district')),
    }
  })
}

export async function importSchools(
  owner: pg.Pool,
  rows: SchoolRow[],
  trialDistrictName: string,
): Promise<{ imported: number; districtId: string }> {
  const district = await owner.query<{ id: string; name: string }>('SELECT id, name FROM district')
  const trial = district.rows.find((row) => row.name.toLowerCase() === trialDistrictName.toLowerCase())
  if (!trial) throw new Error(`Trial district "${trialDistrictName}" is not in the database`)
  let imported = 0
  for (const row of rows) {
    if (row.district && row.district.toLowerCase() !== trial.name.toLowerCase()) {
      throw new Error(`${row.schoolNumber} is in "${row.district}", not the trial district`)
    }
    await owner.query(
      `INSERT INTO school (id, district_id, school_number, name, phase, quintile, enrolment, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (school_number) DO UPDATE
         SET name = EXCLUDED.name,
             phase = EXCLUDED.phase,
             quintile = EXCLUDED.quintile,
             enrolment = EXCLUDED.enrolment,
             district_id = EXCLUDED.district_id`,
      [`school-${row.schoolNumber}`, trial.id, row.schoolNumber, row.name, row.phase, row.quintile, row.enrolment],
    )
    imported += 1
  }
  return { imported, districtId: trial.id }
}

export async function importSchoolFile(owner: pg.Pool, file: string, trialDistrictName: string) {
  const text = await readFile(file, 'utf8')
  return importSchools(owner, parseSchoolCsv(text), trialDistrictName)
}

function value(cells: string[], index: number): string | null {
  if (index < 0) return null
  const cell = cells[index]?.trim() ?? ''
  return cell.length > 0 ? cell : null
}

function splitCsv(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

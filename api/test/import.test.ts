import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSchoolCsv } from '../src/import-schools.ts'

describe('school CSV', () => {
  it('reads the trial columns', () => {
    const rows = parseSchoolCsv(
      'school_number,name,phase,quintile,enrolment,district\n90000001,Riverbend Example Primary,primary,1,180,Eden and Central Karoo Education District\n',
    )
    assert.equal(rows[0]?.schoolNumber, '90000001')
    assert.equal(rows[0]?.enrolment, 180)
    assert.equal(rows[0]?.district, 'Eden and Central Karoo Education District')
  })

  it('rejects an unknown phase before it touches the database', () => {
    assert.throws(
      () => parseSchoolCsv('school_number,name,phase\n1,Other High,high\n'),
      /unknown phase/,
    )
  })
})

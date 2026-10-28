import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { matchRoute, normalizePath } from '../../supabase/functions/api/router.ts'

describe('edge function routes', () => {
  it('strips the Supabase function prefix', () => {
    assert.equal(
      normalizePath('https://ickpnerjcfpgxspvgdzo.supabase.co/functions/v1/api/v1/join/coordinator'),
      '/v1/join/coordinator',
    )
    assert.equal(normalizePath('http://localhost/healthz'), '/healthz')
  })

  it('maps the trial routes the website calls', () => {
    assert.equal(matchRoute('POST', '/v1/join/coordinator').name, 'join_coordinator')
    assert.equal(matchRoute('POST', '/v1/join/staff').name, 'join_staff')
    assert.equal(matchRoute('POST', '/v1/auth/sms/verify').name, 'sms_verify')
    assert.equal(matchRoute('GET', '/v1/officials/snapshot').name, 'snapshot')
    assert.equal(matchRoute('POST', '/v1/me/certificate').name, 'issue_certificate')
    assert.equal(matchRoute('POST', '/v1/devices/device-plat/switch').deviceId, 'device-plat')
    assert.equal(matchRoute('POST', '/v1/schools/school-90000001/daily-stats').schoolId, 'school-90000001')
    assert.equal(matchRoute('GET', '/nope').name, 'not_found')
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { allowedOrigin } from '../../supabase/functions/api/cors.ts'
import { resolveSessionSecret, resolveSms } from '../../supabase/functions/api/runtime.ts'

describe('edge function browser access', () => {
  it('allows Vercel previews and the department site', () => {
    assert.equal(allowedOrigin('https://nsnp-learning.vercel.app'), 'https://nsnp-learning.vercel.app')
    assert.equal(allowedOrigin('https://superimmersive.io'), 'https://superimmersive.io')
    assert.equal(allowedOrigin('https://www.superimmersive.io'), 'https://www.superimmersive.io')
    assert.equal(allowedOrigin('http://localhost:43123'), 'http://localhost:43123')
    assert.equal(allowedOrigin('https://evil.example'), null)
    assert.equal(allowedOrigin('https://vercel.app.evil.example'), null)
    assert.equal(allowedOrigin('http://nsnp-learning.vercel.app'), null)
  })

  it('uses the environment secret first and fails closed when both are empty', () => {
    assert.equal(resolveSessionSecret('from-env', 'from-vault'), 'from-env')
    assert.equal(resolveSessionSecret('  ', 'from-vault'), 'from-vault')
    assert.equal(resolveSessionSecret(undefined, null), '')
    assert.equal(resolveSessionSecret(undefined, 12), '')
  })

  it('lets a blank SMS setting fall back to the private table', () => {
    assert.deepEqual(resolveSms({ provider: '', otp: '' }, { provider: 'console', otp: '123456' }), {
      provider: 'console',
      otp: '123456',
    })
    assert.deepEqual(resolveSms({ provider: 'console', otp: '999999' }, { provider: 'console', otp: '123456' }), {
      provider: 'console',
      otp: '999999',
    })
    assert.deepEqual(resolveSms({}, { otp: '' }), { provider: '', otp: '' })
  })
})

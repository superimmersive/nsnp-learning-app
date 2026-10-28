import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { ApiError, apiSend } from '@/sync/client'
import { apiBase } from '@/sync/config'
import { usePrototype } from '../store'

export function NoticePage() {
  const { phone, replacePhone } = usePrototype()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const draft = phone.draft

  if (!draft) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-navy">Privacy notice</h1>
        <p className="mt-3 text-base leading-relaxed">Start from Join this school so we know which code you are using.</p>
        <Link to="/join/coordinator" className="mt-4 inline-flex h-14 items-center font-semibold text-blue">
          Join this school
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">Before you continue</h1>
      <div className="mt-4 space-y-3 text-base leading-relaxed">
        <p>
          This is a trial in the Eden and Central Karoo education district. The app keeps your name, cellphone number,
          role, and which lessons you passed.
        </p>
        <p>Your school’s coordinator and principal can see the school’s work. The two district officials can see it too.</p>
        <p>Superimmersive support looks only if the district asks, and that look is written in the audit log.</p>
        <p>There is no marketing, and the information is not sold.</p>
        <p>
          When the trial ends, the department will either keep these records or delete names and cellphone numbers
          within 30 days. That choice is not made yet. This notice is a placeholder until WCED names an information
          officer.
        </p>
      </div>
      {error && (
        <p className="mt-4 text-sm text-bad" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        className="mt-6 h-14 w-full text-lg"
        onClick={() => {
          void (async () => {
            if (apiBase()) {
              try {
                const json = (await apiSend(draft.path === 'coordinator' ? '/v1/join/coordinator' : '/v1/join/staff', {
                  body: {
                    code: draft.code,
                    firstName: draft.firstName,
                    surname: draft.surname,
                    cellphone: draft.cellphone,
                    role: draft.role,
                    consent: true,
                  },
                })) as { demoCode?: string; userId?: string; membershipId?: string; schoolId?: string }
                replacePhone({
                  ...phone,
                  draft: {
                    ...draft,
                    agreed: true,
                    schoolId: json.schoolId ?? draft.schoolId,
                    demoCode: json.demoCode,
                    remoteUserId: json.userId,
                    remoteMembershipId: json.membershipId,
                  },
                })
              } catch (caught) {
                setError(caught instanceof ApiError ? caught.message : 'The code was not accepted')
                return
              }
            } else {
              replacePhone({ ...phone, draft: { ...draft, agreed: true } })
            }
            navigate('/join/sms')
          })()
        }}
      >
        I agree
      </Button>
    </div>
  )
}

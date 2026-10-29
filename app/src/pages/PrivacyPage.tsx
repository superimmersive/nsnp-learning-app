import { Link } from 'react-router'

const supportUrl = 'https://superimmersive.io/nsnp-learning-app/'

export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="bg-navy pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-sm font-semibold">
            NSNP Learning
          </Link>
          <Link to="/" className="text-sm font-semibold text-gold-bright">
            Lessons
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 pb-16 text-base leading-relaxed">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue">Privacy notice</p>
        <h1 className="text-2xl font-semibold text-navy">What this app keeps</h1>
        <p>
          NSNP Learning is a lesson aid for school staff on the National School Nutrition Programme roadshow. It is not
          an official Western Cape Education Department service, and it is not a medical or payment app.
        </p>

        <section className="space-y-2" aria-labelledby="store-heading">
          <h2 id="store-heading" className="text-lg font-semibold text-navy">
            App Store and Play builds
          </h2>
          <p>The store apps are lessons only. There is no login, no trial account, and no officials section.</p>
          <p>
            If you type a name, school, or role for the learning record, and if you answer quizzes or tick checklists,
            that stays in storage on the phone. The store build does not send it to Superimmersive or to a server. There
            are no ads and no tracking.
          </p>
          <p>
            Android may include that on-device storage in your own phone backup if backup is switched on. Superimmersive
            cannot open that backup.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="delete-heading">
          <h2 id="delete-heading" className="text-lg font-semibold text-navy">
            Delete what is on the phone
          </h2>
          <p>The store apps do not create an account, so there is no account to delete.</p>
          <p>
            On the Certificate screen, choose “Clear progress on this phone”, then “Yes, clear everything”. That removes
            the name, school, role, quiz scores, and checklist ticks on that phone. Uninstalling the app removes them
            as well.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="web-heading">
          <h2 id="web-heading" className="text-lg font-semibold text-navy">
            Lessons website
          </h2>
          <p>
            The public lesson site works the same way as the store apps: progress stays in the browser on that device.
            Clearing the site data, or using the same clear-progress control, removes it.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="trial-heading">
          <h2 id="trial-heading" className="text-lg font-semibold text-navy">
            Website trial accounts
          </h2>
          <p>
            A separate trial on the website can ask for a name, a cellphone number, a role, and a school, then keep
            lesson progress for district officials. That trial is not in the App Store or Play build. The trial host is
            outside South Africa. Real names and cellphone numbers should not be stored there until the department has
            agreed in writing.
          </p>
          <p>
            There is no delete button in the trial yet. To ask for a trial record to be deleted, contact the school
            coordinator or the district official who issued the join code, or use the contact on{' '}
            <a className="font-semibold text-blue" href={supportUrl}>
              {supportUrl}
            </a>
            . Ask them to delete the name and cellphone number. The department has not yet named an information officer
            on this page.
          </p>
        </section>

        <p className="text-sm text-muted">
          This notice describes how the app behaves. It is not a legal opinion. Questions about the lessons go to the
          support page above.
        </p>
      </main>
    </div>
  )
}

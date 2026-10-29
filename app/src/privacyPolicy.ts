/**
 * Privacy notice shared by the in-app page and the static Pages file.
 * Store builds are lessons only: no data collected, no data shared, no tracking.
 * The website trial section is the separate trial, which is not in those builds.
 */

export const privacySupportUrl = 'https://superimmersive.io/nsnp-learning-app/'

export const privacyPublicUrl = 'https://superimmersive.io/nsnp-learning-app/privacy'

export const privacyContact = {
  company: 'SUPERIMMERSIVE ART (PTY) LTD',
  email: 'devon@superimmersive.io',
} as const

export type PrivacyText = {
  text: string
  href?: string
}

export type PrivacySection = {
  id: string
  heading: string
  paragraphs: PrivacyText[][]
}

export const privacyPolicy: {
  kicker: string
  title: string
  intro: string[]
  sections: PrivacySection[]
  footer: string[]
} = {
  kicker: 'Privacy notice',
  title: 'What this app keeps',
  intro: [
    'NSNP Learning is a lesson aid for school staff on the National School Nutrition Programme roadshow. It is not an official Western Cape Education Department service, and it is not a medical or payment app.',
  ],
  sections: [
    {
      id: 'store',
      heading: 'App Store and Play builds',
      paragraphs: [
        [
          {
            text: 'The store apps are lessons only. There is no login, no trial account, and no officials section.',
          },
        ],
        [
          {
            text: 'The store apps collect no data and share no data. They do not track. There is no analytics and no crash reporter.',
          },
        ],
        [
          {
            text: 'If you type a name, school, or role for the learning record, and if you answer quizzes or tick checklists, that stays in storage on the phone. The store build does not send it to Superimmersive or to a server. There are no ads and no tracking.',
          },
        ],
        [
          {
            text: 'Android may include that on-device storage in your own phone backup if backup is switched on. Superimmersive cannot open that backup.',
          },
        ],
      ],
    },
    {
      id: 'delete',
      heading: 'Delete what is on the phone',
      paragraphs: [
        [{ text: 'The store apps do not create an account, so there is no account to delete.' }],
        [
          {
            text: 'On the Certificate screen, choose “Clear progress on this phone”, then “Yes, clear everything”. That removes the name, school, role, quiz scores, and checklist ticks on that phone. Uninstalling the app removes them as well.',
          },
        ],
      ],
    },
    {
      id: 'web',
      heading: 'Lessons website',
      paragraphs: [
        [
          {
            text: 'The public lesson site works the same way as the store apps: progress stays in the browser on that device. Clearing the site data, or using the same clear-progress control, removes it.',
          },
        ],
      ],
    },
    {
      id: 'trial',
      heading: 'Website trial accounts',
      paragraphs: [
        [
          {
            text: 'A separate trial on the website can ask for a name, a cellphone number, a role, and a school, then keep lesson progress for district officials. That trial is not in the App Store or Play build. The trial host is outside South Africa. Real names and cellphone numbers should not be stored there until the department has agreed in writing.',
          },
        ],
        [
          {
            text: 'There is no delete button in the trial yet. To ask for a trial record to be deleted, contact the school coordinator or the district official who issued the join code, or use the contact on ',
          },
          { text: privacySupportUrl, href: privacySupportUrl },
          {
            text: '. Ask them to delete the name and cellphone number. The department has not yet named an information officer on this page.',
          },
        ],
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      paragraphs: [
        [{ text: privacyContact.company }],
        [{ text: privacyContact.email, href: `mailto:${privacyContact.email}` }],
      ],
    },
  ],
  footer: [
    'This notice describes how the app behaves. It is not a legal opinion. Questions about the lessons go to the support page above.',
  ],
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderParts(parts: PrivacyText[]): string {
  return parts
    .map((part) => {
      const text = escapeHtml(part.text)
      if (!part.href) return text
      return `<a href="${escapeHtml(part.href)}">${text}</a>`
    })
    .join('')
}

/** Script-free document. GitHub Pages must return this file with HTTP 200. */
export function renderPrivacyHtml(options: { homeHref: string }): string {
  const home = escapeHtml(options.homeHref)
  const sections = privacyPolicy.sections
    .map((section) => {
      const id = escapeHtml(section.id)
      const paragraphs = section.paragraphs.map((parts) => `<p>${renderParts(parts)}</p>`).join('\n')
      return `<section aria-labelledby="${id}-heading">
<h2 id="${id}-heading">${escapeHtml(section.heading)}</h2>
${paragraphs}
</section>`
    })
    .join('\n')
  const intro = privacyPolicy.intro.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n')
  const footer = privacyPolicy.footer
    .map((paragraph) => `<p class="muted">${escapeHtml(paragraph)}</p>`)
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy notice · NSNP Learning</title>
<meta name="description" content="Privacy notice for NSNP Learning. The App Store and Play builds are lessons only: they collect no data, share no data, and do not track.">
<link rel="canonical" href="${escapeHtml(privacyPublicUrl)}">
<style>
:root { color-scheme: light; }
body { margin: 0; font-family: "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif; background: #f4f7fb; color: #14233b; font-size: 1rem; line-height: 1.65; }
header { background: #0b2545; color: #fff; padding-top: env(safe-area-inset-top); }
header a { color: inherit; font-weight: 600; text-decoration: none; }
.bar, main { max-width: 36rem; margin: 0 auto; padding: 0.75rem 1rem; }
.bar { display: flex; justify-content: space-between; gap: 1rem; }
main { padding-top: 1.5rem; padding-bottom: 4rem; }
h1, h2 { color: #0b2545; line-height: 1.3; }
h1 { font-size: 1.5rem; margin: 0.25rem 0 0; }
h2 { font-size: 1.125rem; margin: 1.5rem 0 0.5rem; }
p { margin: 0.75rem 0; }
.kicker { margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #0e5aa7; }
a { color: #0e5aa7; }
.muted { color: #4a5d72; font-size: 0.875rem; }
</style>
</head>
<body>
<header>
<div class="bar">
<a href="${home}">NSNP Learning</a>
<a href="${home}">Lessons</a>
</div>
</header>
<main>
<p class="kicker">${escapeHtml(privacyPolicy.kicker)}</p>
<h1>${escapeHtml(privacyPolicy.title)}</h1>
${intro}
${sections}
${footer}
</main>
</body>
</html>
`
}

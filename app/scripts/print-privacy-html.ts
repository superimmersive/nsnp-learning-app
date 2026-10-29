import { renderPrivacyHtml } from '../src/privacyPolicy.ts'

const homeHref = process.argv[2]
if (!homeHref) {
  process.stderr.write('home href required\n')
  process.exit(1)
}

process.stdout.write(renderPrivacyHtml({ homeHref }))

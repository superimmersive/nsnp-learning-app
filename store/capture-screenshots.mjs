/**
 * Regenerates store screenshots from the running lesson app.
 * From the repo root, with `npm run dev` already running in app/:
 *   npx --yes playwright install chromium
 *   node store/capture-screenshots.mjs
 *
 * Does not replace the icons or splash screens inside app/ios or app/android.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const base = process.env.SHOT_BASE ?? 'http://127.0.0.1:43123'
const root = path.resolve(import.meta.dirname)

const sets = [
  { dir: 'screenshots/ios-6.7', width: 430, height: 932, scale: 3 },
  { dir: 'screenshots/ios-6.5', width: 414, height: 896, scale: 3 },
  { dir: 'screenshots/ipad-13', width: 1032, height: 1376, scale: 2 },
  { dir: 'screenshots/play-phone', width: 360, height: 720, scale: 3 },
]

const shots = [
  { name: '01-home.png', path: '/' },
  { name: '02-lesson.png', path: '/module/what-is-nsnp' },
  { name: '03-quiz.png', path: '/module/what-is-nsnp', quiz: true },
  { name: '04-checklists.png', path: '/checklists' },
  { name: '05-deadlines.png', path: '/deadlines' },
]

const browser = await chromium.launch()
for (const set of sets) {
  const dir = path.join(root, set.dir)
  await mkdir(dir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: set.width, height: set.height },
    deviceScaleFactor: set.scale,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  for (const shot of shots) {
    await page.goto(base + shot.path, { waitUntil: 'networkidle' })
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    if (shot.quiz) {
      const heading = page.getByRole('heading', { name: 'Check yourself' })
      await heading.scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, -72))
    }
    const file = path.join(dir, shot.name)
    await page.screenshot({ path: file, type: 'png' })
    const box = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio }))
    console.log(`${shot.name} ${set.dir} css ${box.w}x${box.h} @${box.dpr}`)
  }
  await context.close()
}
await browser.close()

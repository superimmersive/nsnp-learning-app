import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const result = spawnSync(
  'npx',
  [
    'capacitor-assets',
    'generate',
    '--android',
    '--ios',
    '--iconBackgroundColor',
    '#0b2545',
    '--iconBackgroundColorDark',
    '#0b2545',
    '--splashBackgroundColor',
    '#0b2545',
    '--splashBackgroundColorDark',
    '#0b2545',
  ],
  { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' },
)
if (result.error) throw result.error
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1)

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`
const dir = path.join(root, 'android/app/src/main/res/mipmap-anydpi-v26')
writeFileSync(path.join(dir, 'ic_launcher.xml'), adaptive)
writeFileSync(path.join(dir, 'ic_launcher_round.xml'), adaptive)

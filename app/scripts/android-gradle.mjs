import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const task = process.argv[2]
if (!task) {
  console.error('Usage: node ./scripts/android-gradle.mjs <gradle-task>')
  process.exit(1)
}

const android = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'android')
const gradlew = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
const result = spawnSync(gradlew, [task], {
  cwd: android,
  stdio: 'inherit',
  env: process.env,
})
if (result.error) throw result.error
process.exit(result.status ?? 1)

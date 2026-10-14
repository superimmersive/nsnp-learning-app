import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (!sdk) {
  console.error('Set ANDROID_HOME to your Android SDK (API 36) before building an APK or AAB.')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const sdkDir = sdk.replace(/\\/g, '\\\\')
writeFileSync(path.join(root, 'android', 'local.properties'), `sdk.dir=${sdkDir}\n`)

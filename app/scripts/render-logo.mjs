import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const appDir = dirname(dirname(fileURLToPath(import.meta.url)))
const svg = readFileSync(join(appDir, 'assets/logo.svg'))
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: 'Inter',
    sansSerifFamily: 'Inter',
  },
})
  .render()
  .asPng()

writeFileSync(join(appDir, 'assets/logo.png'), png)

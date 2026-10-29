import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { build } from 'vite'

const topLevelRoutes = ['checklists', 'deadlines', 'calculator', 'certificate', 'prototype', 'join', 'officials']

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('static server did not bind'))
        return
      }
      resolve(address.port)
    })
  })
}

async function withStaticServer(root: string, run: (baseUrl: string) => Promise<void>) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const resolved = path.resolve(root, relative)
    const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`
    if (resolved !== root && !resolved.startsWith(rootPrefix)) {
      response.writeHead(400)
      response.end()
      return
    }

    let file = resolved
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!existsSync(file)) file = `${resolved}.html`
    if (!existsSync(file) || statSync(file).isDirectory()) {
      response.writeHead(404)
      response.end('missing')
      return
    }

    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    createReadStream(file).pipe(response)
  })

  const port = await listen(server)
  try {
    await run(`http://127.0.0.1:${port}`)
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

describe('pages build', () => {
  it(
    'emits a script-free privacy page under the Pages base path',
    async () => {
      const parent = await mkdtemp(path.join(tmpdir(), 'nsnp-pages-'))
      const outDir = path.join(parent, 'nsnp-learning-app')
      const previousBase = process.env.BASE_PATH
      process.env.BASE_PATH = '/nsnp-learning-app'
      try {
        await build({
          configFile: path.resolve('vite.config.ts'),
          mode: 'production',
          logLevel: 'warn',
          build: { outDir, emptyOutDir: true },
        })

        const privacy = await readFile(path.join(outDir, 'privacy/index.html'), 'utf8')
        const alias = await readFile(path.join(outDir, 'privacy.html'), 'utf8')
        expect(alias).toBe(privacy)
        expect(privacy.toLowerCase()).not.toContain('<script')
        expect(privacy).toContain('The store apps collect no data and share no data. They do not track.')
        expect(privacy).toContain('SUPERIMMERSIVE ART (PTY) LTD')
        expect(privacy).toContain('devon@superimmersive.io')
        expect(privacy).toContain('That trial is not in the App Store or Play build.')

        const notFound = await readFile(path.join(outDir, '404.html'), 'utf8')
        expect(notFound).toContain('id="root"')
        expect(notFound).not.toContain('What this app keeps')

        const worker = await readFile(path.join(outDir, 'sw.js'), 'utf8')
        expect(worker).toContain('/nsnp-learning-app/privacy/index.html')
        expect(worker).toContain('/nsnp-learning-app/privacy.html')

        for (const route of topLevelRoutes) {
          const shell = await readFile(path.join(outDir, route, 'index.html'), 'utf8')
          expect(shell).toContain('id="root"')
          expect(shell).not.toContain('What this app keeps')
        }

        await withStaticServer(parent, async (baseUrl) => {
          const page = await fetch(`${baseUrl}/nsnp-learning-app/privacy/`)
          expect(page.status).toBe(200)
          const body = await page.text()
          expect(body).toContain('What this app keeps')
          expect(body).toContain('collect no data and share no data')
          expect(body.toLowerCase()).not.toContain('<script')

          const file = await fetch(`${baseUrl}/nsnp-learning-app/privacy.html`)
          expect(file.status).toBe(200)
          expect(await file.text()).toBe(body)

          const bare = await fetch(`${baseUrl}/nsnp-learning-app/privacy`)
          expect(bare.status).toBe(200)
          expect(await bare.text()).toContain('What this app keeps')

          const missing = await fetch(`${baseUrl}/nsnp-learning-app/not-a-page`)
          expect(missing.status).toBe(404)

          const checklist = await fetch(`${baseUrl}/nsnp-learning-app/checklists/`)
          expect(checklist.status).toBe(200)
          expect(await checklist.text()).toContain('id="root"')
        })
      } finally {
        if (previousBase === undefined) delete process.env.BASE_PATH
        else process.env.BASE_PATH = previousBase
        await rm(parent, { recursive: true, force: true })
      }
    },
    120_000,
  )
})

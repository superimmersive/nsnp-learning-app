import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { siteBase } from './src/lib/site-base.ts'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function walkFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...walkFiles(full))
    } else {
      found.push(full)
    }
  }
  return found
}

function precacheServiceWorker(): Plugin {
  let base = '/'
  return {
    name: 'nsnp-precache-sw',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    closeBundle() {
      const dist = path.resolve(rootDir, 'dist')
      const prefix = base === '/' ? '' : base.replace(/\/$/, '')
      const files = walkFiles(dist)
        .map((file) => `${prefix}/${path.relative(dist, file).split(path.sep).join('/')}`)
        .filter((file) => file !== `${prefix}/sw.js`)
      const cacheName = `nsnp-${Date.now().toString(36)}`
      const source = `const CACHE = ${JSON.stringify(cacheName)}
const ASSETS = ${JSON.stringify(files)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => (request.mode === 'navigate' ? caches.match(${JSON.stringify(`${prefix}/index.html`)}) : undefined))
    }),
  )
})
`
      writeFileSync(path.join(dist, 'sw.js'), source)
      copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
      writeFileSync(path.join(dist, '.nojekyll'), '')
    },
  }
}

export default defineConfig({
  base: siteBase(process.env.BASE_PATH),
  plugins: [react(), tailwindcss(), precacheServiceWorker()],
  resolve: {
    alias: {
      '@': path.join(rootDir, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 43123,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})

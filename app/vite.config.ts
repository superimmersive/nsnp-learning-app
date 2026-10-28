import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

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

function siteBase(): string {
  const raw = process.env.BASE_PATH?.trim()
  if (!raw || raw === '/') return '/'
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

/**
 * GitHub Pages publishes under a repository subpath (`BASE_PATH`).
 * The native shells serve the same build from the WebView root, so that
 * mode always uses `/` even if `BASE_PATH` is set in the environment.
 */
function baseForMode(mode: string): string {
  return mode === 'native' ? '/' : siteBase()
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
      const cacheName = `nsnp-v2-${Date.now().toString(36)}`
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
  if (url.pathname.endsWith('/sw.js')) return

  const page = ${JSON.stringify(`${prefix}/index.html`)}
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          if (!response || !response.ok) return caches.match(page).then((cached) => cached || response)
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(page))),
    )
    return
  }

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
        .catch(() => undefined)
    }),
  )
})
`
      writeFileSync(path.join(dist, 'sw.js'), source)
      copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
      copyFileSync(path.join(dist, 'index.html'), path.join(dist, '200.html'))
      writeFileSync(path.join(dist, '.nojekyll'), '')
      writeFileSync(path.join(dist, '_redirects'), '/* /index.html 200\n')
    },
  }
}

export default defineConfig(({ mode }) => ({
  base: baseForMode(mode),
  plugins:
    mode === 'native'
      ? [react(), tailwindcss()]
      : [react(), tailwindcss(), precacheServiceWorker()],
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
    // Example-data tests stay in mock mode even if the machine has an API URL.
    env: {
      VITE_API_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}))

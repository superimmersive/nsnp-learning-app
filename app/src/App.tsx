import { LessonApp } from '@/LessonApp'
import { WebApp } from '@/WebApp'

export default function App() {
  // Keep this comparison literal so the native bundle can drop WebApp.
  // Same string as NATIVE_MODE in src/lib/platform.ts.
  if (import.meta.env.MODE === 'native') return <LessonApp />
  return <WebApp />
}

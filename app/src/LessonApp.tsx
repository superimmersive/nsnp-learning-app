import { Routes } from 'react-router'
import { lessonRoutes } from '@/lessonRoutes'

export function LessonApp() {
  return <Routes>{lessonRoutes()}</Routes>
}

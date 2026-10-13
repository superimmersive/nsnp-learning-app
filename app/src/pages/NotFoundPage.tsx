import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { content } from '@/lib/content'

export function NotFoundPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy">{content.ui.notFound.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink">{content.ui.notFound.body}</p>
      <Button asChild className="mt-4">
        <Link to="/">{content.ui.notFound.home}</Link>
      </Button>
    </div>
  )
}

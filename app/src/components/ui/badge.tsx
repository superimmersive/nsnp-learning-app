import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-blue-soft px-2.5 py-1 text-xs font-semibold text-navy',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }

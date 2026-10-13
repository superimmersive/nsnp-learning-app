import * as ProgressPrimitive from '@radix-ui/react-progress'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Progress({ className, value, ...props }: ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-blue-soft', className)}
      value={value}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full bg-blue transition-[width]"
        style={{ width: `${value ?? 0}%` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

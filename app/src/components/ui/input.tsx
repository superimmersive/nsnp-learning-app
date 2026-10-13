import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-lg border border-line bg-white px-3 text-base text-ink outline-none placeholder:text-muted focus-visible:border-blue focus-visible:ring-2 focus-visible:ring-blue/30',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-navy text-white hover:bg-navy-deep',
        secondary: 'bg-blue-soft text-navy hover:bg-blue/15',
        outline: 'border border-line bg-white text-navy hover:bg-paper',
        ghost: 'text-navy hover:bg-blue-soft',
      },
      size: {
        default: 'h-12 px-4',
        sm: 'h-10 px-3 text-sm',
        lg: 'h-14 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (asChild) {
    return <Slot className={classes} {...props} />
  }
  return <button className={classes} type={type} {...props} />
}

export { Button }

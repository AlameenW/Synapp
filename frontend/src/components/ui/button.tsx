import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Project-owned control following the shadcn/ui composition and theme conventions.
export function Button({ className, variant = 'default', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
}) {
  return <button type="button" className={cn('ui-button', 'ui-button-' + variant, className)} {...props} />
}


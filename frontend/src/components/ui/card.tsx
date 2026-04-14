import * as React from 'react'
import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Default: light cards for the public site; use `dark` for the admin dashboard. */
  variant?: 'light' | 'dark'
}

function Card({ className, variant = 'light', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm',
        variant === 'dark'
          ? 'border-gold/25 bg-black/45 shadow-[0_0_40px_rgba(205,163,73,0.06)]'
          : 'border-parchment bg-white',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-3 p-5', className)} {...props} />
}

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  variant?: 'light' | 'dark'
}

function CardTitle({ className, variant = 'light', ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        'font-heading text-2xl',
        variant === 'dark' ? 'text-gold' : 'text-charcoal',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export { Card, CardContent, CardHeader, CardTitle }

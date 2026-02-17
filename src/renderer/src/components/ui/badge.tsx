import type { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  default: 'ui-badge--default',
  secondary: 'ui-badge--secondary',
  info: 'ui-badge--info',
  success: 'ui-badge--success',
  warning: 'ui-badge--warning',
  danger: 'ui-badge--danger'
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  const classes = `ui-badge ${VARIANT_CLASS[variant]} ${className}`.trim()
  return <span className={classes} {...props} />
}

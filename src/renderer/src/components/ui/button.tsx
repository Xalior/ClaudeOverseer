import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'link'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = `ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()
  return <button type={type} className={classes} {...props} />
}

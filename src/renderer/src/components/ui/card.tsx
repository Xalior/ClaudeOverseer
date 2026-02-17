import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export function Card({ className = '', ...props }: CardProps) {
  return <div className={`ui-card ${className}`.trim()} {...props} />
}

export function CardContent({ className = '', ...props }: CardContentProps) {
  return <div className={`ui-card__content ${className}`.trim()} {...props} />
}

export function CardTitle({ className = '', ...props }: CardTitleProps) {
  return <h4 className={`ui-card__title ${className}`.trim()} {...props} />
}

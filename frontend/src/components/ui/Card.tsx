import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & { title?: ReactNode; aside?: ReactNode }

export function Card({ title, aside, className = '', children, ...rest }: Props) {
  return (
    <div className={`card ${className}`.trim()} {...rest}>
      {title !== undefined && (
        <div className="card-title">
          {title}
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

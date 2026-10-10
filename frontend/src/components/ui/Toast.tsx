import type { ReactNode } from 'react'

type Props = { variant: 'ok' | 'warn'; avatar?: ReactNode; children: ReactNode }

export function Toast({ variant, avatar, children }: Props) {
  return (
    <div className={`toast ${variant}`} role="status">
      {avatar}
      {children}
    </div>
  )
}

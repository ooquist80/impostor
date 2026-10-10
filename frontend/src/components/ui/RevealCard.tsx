import type { ReactNode } from 'react'

export function RevealCard({ variant, children }: { variant?: 'word' | 'imp'; children: ReactNode }) {
  return (
    <div className={`reveal-card ${variant ?? ''}`.trim()}>
      <div>{children}</div>
    </div>
  )
}

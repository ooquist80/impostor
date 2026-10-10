import type { ReactNode } from 'react'

export function Badge({ variant, children }: { variant: 'green' | 'red' | 'zero'; children: ReactNode }) {
  return <span className={`badge ${variant}`}>{children}</span>
}

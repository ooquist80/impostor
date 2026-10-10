import type { ReactNode } from 'react'

export function Logo() {
  return (
    <div className="logo">
      Impostor<span>.</span>
    </div>
  )
}

type Props = {
  /** Replaces the logo on the left of the top bar. */
  left?: ReactNode
  right?: ReactNode
  /** Background tint: green after a caught impostor, red for the impostor. */
  tone?: 'win' | 'danger'
  center?: boolean
  footer?: ReactNode
  children: ReactNode
}

export function Screen({ left, right, tone, center, footer, children }: Props) {
  return (
    <div className={`app ${tone ?? ''}`.trim()}>
      <div className="topbar">
        {left ?? <Logo />}
        {right}
      </div>
      <main className={`screen ${center ? 'center' : ''}`.trim()}>{children}</main>
      {footer && <div className="footer">{footer}</div>}
    </div>
  )
}

export function RoundTag({ children }: { children: ReactNode }) {
  return <div className="round">{children}</div>
}

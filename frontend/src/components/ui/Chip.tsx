import type { ButtonHTMLAttributes } from 'react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & { on?: boolean; onToggle?: () => void }

export function Chip({ on, onToggle, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      className={`chip ${on ? 'on' : ''} ${className}`.trim()}
      aria-pressed={on ?? false}
      onClick={onToggle}
      {...rest}
    />
  )
}

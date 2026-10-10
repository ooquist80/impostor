import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'scan'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  small?: boolean
  dashed?: boolean
}

export function Button({ variant = 'primary', small, dashed, className = '', type = 'button', ...rest }: Props) {
  const cls = ['btn', `btn-${variant}`, small && 'btn-small', dashed && 'btn-dashed', className].filter(Boolean).join(' ')
  return <button type={type} className={cls} {...rest} />
}

/** Small amber text button ("Ändra", "Välj alla", "Försök igen"). */
export function LinkButton({ className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`link ${className}`.trim()} {...rest} />
}

export function IconButton({ className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`icon-btn ${className}`.trim()} {...rest} />
}

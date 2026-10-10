import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`.trim()} {...rest} />
}

/** A password input with a "Visa"/"Dölj" toggle inside it. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [shown, setShown] = useState(false)
  return (
    <div className="pw-field">
      <Input {...props} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        className="pw-toggle"
        aria-label={shown ? 'Dölj lösenordet' : 'Visa lösenordet'}
        aria-pressed={shown}
        // Keep the focus (and the phone keyboard) in the field.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? 'Dölj' : 'Visa'}
      </button>
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <small>{hint}</small>}
    </div>
  )
}

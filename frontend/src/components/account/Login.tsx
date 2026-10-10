import { useState, type FormEvent } from 'react'
import { ApiError, login, register } from '../../api'
import { useAuth } from '../../auth'
import { Screen, Logo } from '../ui/Screen'
import { Button, LinkButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { Field, Input } from '../ui/Input'

type Mode = 'login' | 'register'

function messageFor(err: unknown, mode: Mode): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return 'Kunde inte nå servern. Försök igen.'
    if (err.status === 401) return 'Fel e-post eller lösenord.'
    if (err.status === 409) return 'Det finns redan ett konto med den e-postadressen.'
    if (err.status === 422) return mode === 'register' ? 'Kontrollera e-post, namn och lösenord.' : 'Fel e-post eller lösenord.'
  }
  return 'Något gick fel. Försök igen.'
}

// A quick check before sending; the server does the real validation.
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

export function Login({ onBack }: { onBack: () => void }) {
  const auth = useAuth()
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mail = email.trim()
  const name = displayName.trim()
  const isRegister = mode === 'register'
  const valid = isRegister
    ? looksLikeEmail(mail) && name.length >= 2 && name.length <= 30 && password.length >= 6
    : mail.length > 0 && password.length > 0

  const switchMode = (m: Mode) => {
    setMode(m)
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await (isRegister ? register(mail, name, password) : login(mail, password))
      auth.login(res.token)
    } catch (err) {
      setError(messageFor(err, mode))
      setBusy(false)
    }
  }

  return (
    <Screen
      left={<button type="button" className="back" onClick={onBack}>← Till spelet</button>}
      right={<Logo />}
      footer={
        <>
          <Button type="submit" form="auth-form" disabled={!valid || busy}>
            {busy ? 'Vänta…' : isRegister ? 'Skapa konto' : 'Logga in'}
          </Button>
          <p className="hint">
            {isRegister ? 'Har du redan ett konto? ' : 'Inget konto än? '}
            <LinkButton onClick={() => switchMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Logga in' : 'Skapa konto'}
            </LinkButton>
          </p>
        </>
      }
    >
      <div style={{ margin: '18px 0 6px' }}>
        <div className="display d-l">{isRegister ? 'Skapa konto' : 'Logga in'}</div>
        <p className="muted small mt-8">
          {isRegister
            ? 'Spara din statistik och gå med i spel genom att visa en QR-kod.'
            : 'Logga in för att se din statistik och visa din QR-kod.'}
        </p>
      </div>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? 'on' : ''} onClick={() => switchMode('login')}>Logga in</button>
        <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? 'on' : ''} onClick={() => switchMode('register')}>Skapa konto</button>
      </div>
      <Card>
        <form id="auth-form" className="stack" style={{ gap: 14 }} onSubmit={submit}>
          <Field label="E-post" hint={isRegister ? 'Används för att logga in. Visas bara för dig.' : undefined}>
            {(id) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                value={email}
                maxLength={254}
                autoComplete={isRegister ? 'email' : 'username'}
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          {isRegister && (
            <Field label="Namn" hint="2–30 tecken. Visas för andra spelare i spelet.">
              {(id) => (
                <Input id={id} value={displayName} maxLength={30} autoComplete="nickname" onChange={(e) => setDisplayName(e.target.value)} />
              )}
            </Field>
          )}
          <Field label="Lösenord" hint={isRegister ? 'Minst 6 tecken.' : undefined}>
            {(id) => (
              <Input id={id} type="password" value={password} autoComplete={isRegister ? 'new-password' : 'current-password'} onChange={(e) => setPassword(e.target.value)} />
            )}
          </Field>
        </form>
      </Card>
      {error && <p className="form-error" role="alert">{error}</p>}
    </Screen>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { createJoinToken } from '../../api'
import type { ApiPlayer } from '../../types'
import { Screen, Logo } from '../ui/Screen'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'

/** A join token lives 2 minutes. Fetch a fresh one this often. */
const REFRESH_SECONDS = 90

export function MyQr({ player, onBack }: { player: ApiPlayer; onBack: () => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [left, setLeft] = useState(REFRESH_SECONDS)
  const loading = useRef(false)

  const refresh = useCallback(() => {
    if (loading.current) return
    loading.current = true
    createJoinToken()
      .then((res) => {
        setToken(res.token)
        setFailed(false)
        setLeft(REFRESH_SECONDS)
      })
      .catch(() => {
        setFailed(true)
        setLeft(10) // retry automatically after 10 s
      })
      .finally(() => {
        loading.current = false
      })
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (left <= 0) refresh()
  }, [left, refresh])

  const shown = Math.max(left, 0)
  const clock = `${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, '0')}`

  return (
    <Screen
      left={<button type="button" className="back" onClick={onBack}>← Profil</button>}
      right={<Logo />}
      center
      footer={<Button variant="secondary" onClick={onBack}>Stäng</Button>}
    >
      <Avatar name={player.name} avatar={{ emoji: player.avatar_emoji, color: player.avatar_color }} size={56} />
      <div className="display d-l" style={{ marginTop: -6 }}>{player.name}</div>
      <div className={`qr-card ${token ? '' : 'loading'}`.trim()}>
        {token && <QRCodeSVG value={token} size={220} level="M" bgColor="transparent" fgColor="currentColor" />}
      </div>
      {failed ? (
        <>
          <p className="muted small">Kunde inte hämta QR-koden.</p>
          <Button variant="secondary" onClick={refresh}>Försök igen</Button>
        </>
      ) : (
        <>
          <p className="muted small">
            Låt spelledaren skanna koden
            <br />
            för att lägga till dig i spelet.
          </p>
          <div className="timer">
            <div className="bar"><i style={{ width: `${(shown / REFRESH_SECONDS) * 100}%` }} /></div>
            <p className="hint mt-8">Ny kod om {clock}</p>
          </div>
        </>
      )}
    </Screen>
  )
}

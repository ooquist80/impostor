import { useCallback, useEffect, useState } from 'react'
import { ApiError, getMe, patchMe } from '../../api'
import { useAuth } from '../../auth'
import type { ApiPlayer, Stats } from '../../types'
import { Screen } from '../ui/Screen'
import { Button, LinkButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { Avatar, avatarPalette } from '../ui/Avatar'
import { MyQr } from './MyQr'

const EMOJIS = ['🦊', '🐸', '🐙', '🦄', '🐼', '👽', '🎃']

type Props = { onBack: () => void }

export function Profile({ onBack }: Props) {
  const auth = useAuth()
  const [data, setData] = useState<{ player: ApiPlayer; stats: Stats } | null>(null)
  const [failed, setFailed] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const palette = avatarPalette()

  const load = useCallback(() => {
    getMe().then(setData, (err) => {
      // A 401 already cleared the token, which sends the user back to the login form.
      if (!(err instanceof ApiError && err.status === 401)) setFailed(true)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setFailed(false)
    load()
  }

  const change = async (changes: { avatar_emoji?: string; avatar_color?: string }) => {
    if (!data) return
    setSaveError(false)
    const before = data
    setData({ ...data, player: { ...data.player, ...changes } })
    try {
      const player = await patchMe(changes)
      setData((d) => (d ? { ...d, player } : d))
    } catch {
      setData(before)
      setSaveError(true)
    }
  }

  if (showQr && data) return <MyQr player={data.player} onBack={() => setShowQr(false)} />

  const back = <button type="button" className="back" onClick={onBack}>← Till spelet</button>
  const logout = <LinkButton onClick={auth.logout}>Logga ut</LinkButton>

  if (!data) {
    return (
      <Screen left={back} right={logout} center>
        {failed ? (
          <>
            <p className="muted">Kunde inte hämta din profil.</p>
            <Button variant="secondary" onClick={retry}>Försök igen</Button>
          </>
        ) : (
          <p className="muted">Hämtar profil…</p>
        )}
      </Screen>
    )
  }

  const { player, stats } = data
  const avatar = { emoji: player.avatar_emoji, color: player.avatar_color }

  return (
    <Screen left={back} right={logout} footer={<Button onClick={() => setShowQr(true)}>▣ Visa min QR-kod</Button>}>
      <div className="profile-head">
        <Avatar name={player.username} avatar={avatar} size={72} />
        <div className="display d-l">{player.username}</div>
      </div>
      <Card title="Avatar">
        <div className="emoji-row">
          {EMOJIS.map((e) => (
            <button key={e} type="button" className={e === player.avatar_emoji ? 'on' : ''} aria-label={`Välj ${e}`} onClick={() => change({ avatar_emoji: e })}>
              {e}
            </button>
          ))}
        </div>
        <div className="color-row">
          {palette.map((c, i) => (
            <button
              key={c}
              type="button"
              className={c.toLowerCase() === player.avatar_color.toLowerCase() ? 'on' : ''}
              style={{ background: c }}
              aria-label={`Välj färg ${i + 1}`}
              onClick={() => change({ avatar_color: c })}
            />
          ))}
        </div>
        {saveError && <p className="form-error mt-12">Kunde inte spara avataren.</p>}
      </Card>
      <div className="stats">
        <Card><b>{stats.games}</b><span>Spel</span></Card>
        <Card><b className="amber">{stats.wins}</b><span>Vinster</span></Card>
        <Card><b>{stats.total_points}</b><span>Poäng totalt</span></Card>
        <Card><b className="red">{stats.impostor_rounds}</b><span>Rundor som bedragare</span></Card>
      </div>
    </Screen>
  )
}

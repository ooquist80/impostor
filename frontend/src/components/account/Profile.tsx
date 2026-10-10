import { useCallback, useEffect, useState } from 'react'
import { ApiError, getMe, patchMe } from '../../api'
import { useAuth } from '../../auth'
import type { ApiPlayer, Avatar as AvatarData, Stats } from '../../types'
import { Screen } from '../ui/Screen'
import { Button, LinkButton } from '../ui/Button'
import { Card } from '../ui/Card'
import { Avatar } from '../ui/Avatar'
import { BottomSheet } from '../ui/BottomSheet'
import { AvatarEditor } from './AvatarEditor'
import { MyQr } from './MyQr'

type Props = {
  onBack: () => void
  /** Called with the player as loaded or saved here, so the game screens show the current avatar. */
  onPlayer: (player: ApiPlayer) => void
}

export function Profile({ onBack, onPlayer }: Props) {
  const auth = useAuth()
  const [data, setData] = useState<{ player: ApiPlayer; email: string; stats: Stats } | null>(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const load = useCallback(() => {
    getMe().then((d) => {
      setData(d)
      onPlayer(d.player)
    }, (err) => {
      // A 401 already cleared the token, which sends the user back to the login form.
      if (!(err instanceof ApiError && err.status === 401)) setFailed(true)
    })
  }, [onPlayer])

  useEffect(() => {
    load()
  }, [load])

  const retry = () => {
    setFailed(false)
    load()
  }

  const saveAvatar = async (avatar: AvatarData) => {
    const player = await patchMe({ avatar })
    setData((d) => (d ? { ...d, player } : d))
    onPlayer(player)
    setEditing(false)
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

  return (
    <Screen left={back} right={logout} footer={<Button onClick={() => setShowQr(true)}>▣ Visa min QR-kod</Button>}>
      <div className="profile-head">
        <Avatar name={player.name} avatar={player.avatar} size={72} />
        <div>
          <div className="display d-l">{player.name}</div>
          <p className="muted small">{data.email}</p>
        </div>
      </div>
      <Card title="Avatar">
        <p className="muted small">Så ser du ut för de andra i spelet.</p>
        <Button variant="secondary" small className="mt-12" onClick={() => setEditing(true)}>Ändra avatar</Button>
      </Card>
      <div className="stats">
        <Card><b>{stats.games}</b><span>Spel</span></Card>
        <Card><b className="amber">{stats.wins}</b><span>Vinster</span></Card>
        <Card><b>{stats.total_points}</b><span>Poäng totalt</span></Card>
        <Card><b className="red">{stats.impostor_rounds}</b><span>Rundor som bedragare</span></Card>
      </div>
      <BottomSheet open={editing} onClose={() => setEditing(false)} label="Ändra avatar">
        {editing && <AvatarEditor name={player.name} avatar={player.avatar} onSave={saveAvatar} onCancel={() => setEditing(false)} />}
      </BottomSheet>
    </Screen>
  )
}

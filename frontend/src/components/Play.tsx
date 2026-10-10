import type { Player } from '../types'
import { Screen, RoundTag } from './ui/Screen'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Avatar } from './ui/Avatar'

type Props = { players: Player[]; starter: string; roundNumber: number; onVote: () => void }

export function Play({ players, starter, roundNumber, onVote }: Props) {
  const player = players.find((p) => p.name === starter) ?? players[0]
  return (
    <Screen
      right={<RoundTag>Runda {roundNumber}</RoundTag>}
      center
      footer={<Button variant="danger" onClick={onVote}>Avslöja bedragaren</Button>}
    >
      <Avatar name={player.name} avatar={player.avatar} size={88} />
      <div className="display d-l mt-8">
        <span className="amber">{player.name}</span> börjar!
      </div>
      <Card className="mt-12" style={{ textAlign: 'left' }}>
        <p className="muted small">
          Lägg ner enheten. Säg ett ord var, i tur och ordning, som hör ihop med ordet. Diskutera sedan vem som är
          bedragaren. När de flesta vill rösta trycker ni på knappen.
        </p>
      </Card>
    </Screen>
  )
}

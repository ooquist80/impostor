import type { Player } from '../types'
import { rankScores } from '../game'
import { Screen, RoundTag } from './ui/Screen'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Avatar } from './ui/Avatar'
import { Standings } from './ui/ScoreRow'

type Props = {
  players: Player[]
  /** Total points before this round. */
  scores: Record<string, number>
  starter: string
  roundNumber: number
  onVote: () => void
}

export function Play({ players, scores, starter, roundNumber, onVote }: Props) {
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
      <div className="standings-block mt-12">
        <div className="tally-head">
          <span className="eyebrow">Ställning</span>
          <span className="hint">{roundNumber === 1 ? 'Inga poäng än' : `Efter runda ${roundNumber - 1}`}</span>
        </div>
        <Standings rows={rankScores(players, scores)} />
      </div>
    </Screen>
  )
}

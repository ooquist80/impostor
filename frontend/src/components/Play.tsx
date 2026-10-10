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
      footer={<Button variant="danger" onClick={onVote}>Avslöja bedragaren</Button>}
    >
      {/* Kept compact so the standings for at least 4 players fit without scrolling. */}
      <div className="starter">
        <Avatar name={player.name} avatar={player.avatar} size={56} />
        <div className="display d-l">
          <span className="amber">{player.name}</span> börjar!
        </div>
      </div>
      <Card className="compact-note">
        <p className="muted">
          Lägg ner enheten. Säg ett ord var, i tur och ordning, som hör ihop med ordet. Diskutera sedan vem som är
          bedragaren. När de flesta vill rösta trycker ni på knappen.
        </p>
      </Card>
      <div className="standings-block">
        <div className="tally-head">
          <span className="eyebrow">Ställning</span>
          <span className="hint">{roundNumber === 1 ? 'Inga poäng än' : `Efter runda ${roundNumber - 1}`}</span>
        </div>
        <Standings rows={rankScores(players, scores)} compact />
      </div>
    </Screen>
  )
}

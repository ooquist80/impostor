import { Avatar } from './Avatar'
import type { Player } from '../../types'
import type { Standing } from '../../game'

type Props = {
  rank: number
  player: Player
  points: number
  /** 0..1 share of the leader's points. */
  share: number
  lead?: boolean
  /** Smaller rows, for the round screen. */
  compact?: boolean
}

export function ScoreRow({ rank, player, points, share, lead, compact }: Props) {
  return (
    <div className={['card score', lead && 'lead', compact && 'compact'].filter(Boolean).join(' ')}>
      <span className="rank">{rank}</span>
      <Avatar name={player.name} avatar={player.avatar} size={compact ? 32 : 40} />
      <div>
        <div className="name">{player.name}</div>
        <div className="bar">
          <i style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
      </div>
      <span className={`pts ${lead ? 'amber' : ''}`.trim()}>{points}</span>
    </div>
  )
}

/** The game's score list, as ranked by `rankScores`. */
export function Standings({ rows, compact }: { rows: Standing[]; compact?: boolean }) {
  return (
    <div className={compact ? 'stack compact' : 'stack'}>
      {rows.map((r) => (
        <ScoreRow key={r.player.name} rank={r.rank} player={r.player} points={r.points} share={r.share} lead={r.lead} compact={compact} />
      ))}
    </div>
  )
}

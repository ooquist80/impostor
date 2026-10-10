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
}

export function ScoreRow({ rank, player, points, share, lead }: Props) {
  return (
    <div className={`card score ${lead ? 'lead' : ''}`.trim()}>
      <span className="rank">{rank}</span>
      <Avatar name={player.name} avatar={player.avatar} />
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
export function Standings({ rows }: { rows: Standing[] }) {
  return (
    <div className="stack">
      {rows.map((r) => (
        <ScoreRow key={r.player.name} rank={r.rank} player={r.player} points={r.points} share={r.share} lead={r.lead} />
      ))}
    </div>
  )
}

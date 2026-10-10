import { Avatar } from './Avatar'
import type { Player } from '../../types'

type Props = {
  rank: number
  player: Player
  index: number
  points: number
  /** 0..1 share of the leader's points. */
  share: number
  lead?: boolean
}

export function ScoreRow({ rank, player, index, points, share, lead }: Props) {
  return (
    <div className={`card score ${lead ? 'lead' : ''}`.trim()}>
      <span className="rank">{rank}</span>
      <Avatar name={player.name} avatar={player.avatar} index={index} />
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

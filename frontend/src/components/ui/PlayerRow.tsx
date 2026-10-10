import type { ReactNode } from 'react'
import { Avatar } from './Avatar'
import type { Player } from '../../types'

type Props = {
  player: Player
  avatarSize?: number
  /** Marks the row as a radio option (voting). */
  selectable?: boolean
  selected?: boolean
  /** Appended to the name, e.g. 🕵️ on the round result. */
  mark?: string
  onSelect?: () => void
  children?: ReactNode
}

export function PlayerRow({ player, avatarSize = 40, selectable, selected, onSelect, mark, children }: Props) {
  const inner = (
    <>
      <Avatar name={player.name} avatar={player.avatar} size={avatarSize} />
      <span className="name">{mark ? `${player.name} ${mark}` : player.name}</span>
      {children}
      {selectable && <span className="radio" />}
    </>
  )
  if (selectable) {
    return (
      <button type="button" role="radio" aria-checked={!!selected} className={`player ${selected ? 'sel' : ''}`.trim()} onClick={onSelect}>
        {inner}
      </button>
    )
  }
  return <div className="player">{inner}</div>
}

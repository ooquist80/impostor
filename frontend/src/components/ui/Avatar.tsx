import type { Avatar as AvatarData } from '../../types'

type Props = {
  name: string
  /** Registered players have an emoji and a colour; guests get a letter. */
  avatar?: AvatarData
  /** Position in the player list, picks the guest colour from the palette. */
  index?: number
  size?: number
}

export const AVATAR_COUNT = 5

/** The avatar colours as the hex strings the backend stores, read from the tokens. */
export function avatarPalette(): string[] {
  const style = getComputedStyle(document.documentElement)
  return Array.from({ length: AVATAR_COUNT }, (_, i) => style.getPropertyValue(`--avatar-${i + 1}`).trim())
}

export function Avatar({ name, avatar, index = 0, size = 40 }: Props) {
  const colorClass = `a${(index % AVATAR_COUNT) + 1}`
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * (avatar ? 0.5 : 0.4)),
    ...(avatar ? { background: avatar.color } : {}),
  }
  return (
    <div className={`avatar ${avatar ? '' : colorClass}`.trim()} style={style} aria-hidden="true">
      {avatar ? avatar.emoji : (name.trim().charAt(0) || '?').toUpperCase()}
    </div>
  )
}

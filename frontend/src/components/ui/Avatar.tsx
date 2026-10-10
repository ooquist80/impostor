import type { Avatar as AvatarData } from '../../types'
import { avatarUri, guestAvatar } from '../../avatar'

type Props = {
  name: string
  /** A registered player's avatar. Guests get one seeded from their name. */
  avatar?: AvatarData
  size?: number
}

export function Avatar({ name, avatar, size = 40 }: Props) {
  return <img className="avatar" src={avatarUri(avatar ?? guestAvatar(name))} width={size} height={size} alt="" aria-hidden="true" />
}

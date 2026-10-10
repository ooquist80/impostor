import { createAvatar } from '@dicebear/core'
import * as thumbs from '@dicebear/thumbs'
import type { Avatar } from './types'

// DiceBear "Thumbs" (artwork CC0, code MIT), rendered on the device: no network, works offline.

type Eyes = NonNullable<thumbs.Options['eyes']>[number]
type Mouth = NonNullable<thumbs.Options['mouth']>[number]

/** The choices offered in the avatar editor. Eye widths barely differ, so one width per style. */
export const EYES: Eyes[] = Array.from({ length: 9 }, (_, i) => `variant${i + 1}W14` as Eyes)
export const MOUTHS: Mouth[] = Array.from({ length: 5 }, (_, i) => `variant${i + 1}` as Mouth)

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Body colours: the avatar palette from tokens.css. */
export const shapeColors = () => Array.from({ length: 5 }, (_, i) => token(`--avatar-${i + 1}`))
/** Backgrounds: the dark surface (default) plus the avatar palette. */
export const backgroundColors = () => [token('--surface-2'), ...shapeColors()]

/** Guests have no account: their name is the seed. */
export const guestAvatar = (name: string): Avatar => ({ seed: name.trim() || '?' })

export function randomSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const hex = (color: string) => color.replace('#', '')
const cache = new Map<string, string>()

/** A data: URI for the avatar. Unset picks are chosen from the seed. */
export function avatarUri(avatar: Avatar): string {
  const key = JSON.stringify(avatar)
  let uri = cache.get(key)
  if (!uri) {
    uri = createAvatar(thumbs, {
      seed: avatar.seed,
      shapeColor: (avatar.shapeColor ? [avatar.shapeColor] : shapeColors()).map(hex),
      backgroundColor: [hex(avatar.backgroundColor ?? token('--surface-2'))],
      ...(avatar.eyes ? { eyes: [avatar.eyes as Eyes] } : {}),
      ...(avatar.mouth ? { mouth: [avatar.mouth as Mouth] } : {}),
    }).toDataUri()
    cache.set(key, uri)
  }
  return uri
}

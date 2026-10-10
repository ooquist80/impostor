import { Avatar as DiceBearAvatar, Style, type StyleOptions } from '@dicebear/core'
import clay from '@dicebear/styles/clay.json'
import type { Avatar } from './types'

// DiceBear "Clay" (artwork CC0, code MIT), rendered on the device: no network, works offline.

// Typed loosely: picks are stored as plain strings and checked by the backend.
const style = new Style<unknown>(clay)
const variants = (component: keyof typeof clay.components) => Object.keys(clay.components[component].variants)

/** The choices offered in the avatar editor, in the style's order. "none" leaves the part out. */
export const BODIES = variants('body')
export const EYES = variants('eyes')
export const MOUTHS = variants('mouth')
export const TOPS = ['none', ...variants('top')]
export const PATTERNS = ['none', ...variants('pattern')]

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Body colours: the avatar palette from tokens.css. Patterns and tops use another colour from it. */
export const bodyColors = () => Array.from({ length: 5 }, (_, i) => token(`--avatar-${i + 1}`))
/** Backgrounds: the dark surface (default) plus the avatar palette. */
export const backgroundColors = () => [token('--surface-2'), ...bodyColors()]

/** Guests have no account: their name is the seed. */
export const guestAvatar = (name: string): Avatar => ({ seed: name.trim() || '?' })

export function randomSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** A part that can be left out: "none" turns it off, a variant forces it on, unset is up to the seed. */
const optional = (part: 'top' | 'pattern', pick?: string) =>
  pick === 'none' ? { [`${part}Probability`]: 0 } : pick ? { [`${part}Variant`]: pick, [`${part}Probability`]: 100 } : {}

const cache = new Map<string, string>()

/** A data: URI for the avatar. Unset picks are chosen from the seed. */
export function avatarUri(avatar: Avatar): string {
  const key = JSON.stringify(avatar)
  let uri = cache.get(key)
  if (!uri) {
    const palette = bodyColors()
    const options: StyleOptions = {
      seed: avatar.seed,
      bodyColor: avatar.bodyColor ? [avatar.bodyColor] : palette,
      accentColor: palette,
      backgroundColor: [avatar.backgroundColor ?? token('--surface-2')],
      ...(avatar.body ? { bodyVariant: avatar.body } : {}),
      ...(avatar.eyes ? { eyesVariant: avatar.eyes } : {}),
      ...(avatar.mouth ? { mouthVariant: avatar.mouth } : {}),
      ...optional('top', avatar.top),
      ...optional('pattern', avatar.pattern),
    }
    uri = new DiceBearAvatar(style, options).toDataUri()
    cache.set(key, uri)
  }
  return uri
}

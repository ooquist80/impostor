import type { ApiPlayer, Entry, Player, Votes } from './types'

export const MIN_PLAYERS = 3

type Rng = () => number

export function pickImpostor(names: string[], rng: Rng = Math.random): string {
  return names[Math.floor(rng() * names.length)]
}

export function pickStartingPlayer(names: string[], rng: Rng = Math.random): string {
  return names[Math.floor(rng() * names.length)]
}

export type SetupError = 'empty' | 'tooFew' | 'duplicate' | 'noCategory'

export type SetupCheck = { valid: boolean; error: SetupError | null; message: string }

const MESSAGES: Record<SetupError, string> = {
  empty: 'Fyll i namn för alla spelare',
  tooFew: `Ni behöver minst ${MIN_PLAYERS} spelare`,
  duplicate: 'Alla namn måste vara olika',
  noCategory: 'Välj minst en kategori',
}

/** `names` holds every entry (guests and registered), as typed. */
export function validateSetup(names: string[], categoryCount: number): SetupCheck {
  const trimmed = names.map((n) => n.trim())
  let error: SetupError | null = null
  if (trimmed.some((n) => n === '')) error = 'empty'
  else if (trimmed.length < MIN_PLAYERS) error = 'tooFew'
  else if (new Set(trimmed.map((n) => n.toLowerCase())).size !== trimmed.length) error = 'duplicate'
  else if (categoryCount < 1) error = 'noCategory'
  return { valid: error === null, error, message: error ? MESSAGES[error] : '' }
}

export type AddResult = { ok: true; entries: Entry[] } | { ok: false; reason: 'already' | 'nameTaken' }

/**
 * Adds a registered player to the setup list: fills the first empty guest field, otherwise appends a row.
 * Fails with 'already' if this account is in the list, or 'nameTaken' if someone else there has the same
 * name (names are not unique between accounts, but must be within a game).
 */
export function addRegisteredEntry(
  entries: Entry[],
  player: ApiPlayer,
  participantToken: string,
  makeEntry: () => Entry,
): AddResult {
  if (entries.some((e) => e.registered?.playerId === player.id)) return { ok: false, reason: 'already' }
  if (entries.some((e) => e.name.trim().toLowerCase() === player.name.toLowerCase())) return { ok: false, reason: 'nameTaken' }
  const registered = { playerId: player.id, participantToken, avatar: player.avatar }
  const empty = entries.find((e) => !e.registered && e.name.trim() === '')
  return {
    ok: true,
    entries: empty
      ? entries.map((e) => (e.id === empty.id ? { ...e, name: player.name, registered } : e))
      : [...entries, { ...makeEntry(), name: player.name, registered }],
  }
}

/** Votes each player got. The impostor's own vote is ignored. */
export function tallyVotes(votes: Votes, impostor: string): Record<string, number> {
  const tally: Record<string, number> = {}
  for (const [voter, accused] of Object.entries(votes)) {
    if (voter === impostor) continue
    tally[accused] = (tally[accused] ?? 0) + 1
  }
  return tally
}

/** 'caught' only if the impostor has strictly more votes than every other player. */
export function roundVerdict(tally: Record<string, number>, impostor: string): 'caught' | 'escaped' {
  const own = tally[impostor] ?? 0
  if (own === 0) return 'escaped'
  const others = Object.entries(tally).filter(([name]) => name !== impostor)
  return others.every(([, n]) => own > n) ? 'caught' : 'escaped'
}

/** 1 p to each voter who picked the impostor, 1 p to the impostor per wrong vote. */
export function scoreRound(players: string[], impostor: string, votes: Votes): Record<string, number> {
  const points: Record<string, number> = Object.fromEntries(players.map((p) => [p, 0]))
  for (const [voter, accused] of Object.entries(votes)) {
    if (voter === impostor || voter === accused) continue
    if (accused === impostor) points[voter] = (points[voter] ?? 0) + 1
    else points[impostor] = (points[impostor] ?? 0) + 1
  }
  return points
}

export type GameSummary = {
  rounds: number
  players: { participant_token: string; points: number; impostor_rounds: number; won: boolean }[]
}

/** The POST /api/games payload. Only registered players are included. */
export function gameSummary(
  players: Player[],
  scores: Record<string, number>,
  impostorRounds: Record<string, number>,
  round: number,
): GameSummary {
  const best = Math.max(0, ...players.map((p) => scores[p.name] ?? 0))
  return {
    rounds: round,
    players: players
      .filter((p) => p.kind === 'registered' && p.participantToken)
      .map((p) => ({
        participant_token: p.participantToken as string,
        points: scores[p.name] ?? 0,
        impostor_rounds: impostorRounds[p.name] ?? 0,
        won: (scores[p.name] ?? 0) === best,
      })),
  }
}

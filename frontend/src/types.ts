export type Avatar = { emoji: string; color: string }

export type Player = {
  name: string
  kind: 'guest' | 'registered'
  participantToken?: string
  avatar?: Avatar
}

export type Category = { id: number; name: string }

export type WordResult = { word: string; clue: string; category: string }

export type ApiPlayer = {
  id: number
  username: string
  avatar_emoji: string
  avatar_color: string
}

export type Stats = {
  games: number
  wins: number
  total_points: number
  impostor_rounds: number
}

export type Round = WordResult & {
  impostor: string
  starter: string
}

export type Votes = Record<string, string>

/** A row in the setup player list: a guest typed by name, or a registered player added by QR. */
export type Entry = {
  id: number
  name: string
  registered?: { participantToken: string; avatar: Avatar }
}

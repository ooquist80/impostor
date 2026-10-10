/** DiceBear "Thumbs" options. Unset picks are chosen from the seed. Colours are "#RRGGBB". */
export type Avatar = { seed: string; eyes?: string; mouth?: string; shapeColor?: string; backgroundColor?: string }

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
  name: string
  avatar: Avatar
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
  registered?: { playerId: number; participantToken: string; avatar: Avatar }
}

import { describe, expect, it } from 'vitest'
import { addRegisteredEntry, gameSummary, pickImpostor, pickStartingPlayer, roundVerdict, scoreRound, tallyVotes, validateSetup } from './game'
import type { Player } from './types'

const names = ['Anna', 'Erik', 'Sara', 'Johan']

describe('picking', () => {
  it('picks exactly one impostor from the players', () => {
    for (let i = 0; i < 200; i++) {
      const impostor = pickImpostor(names)
      expect(names.filter((n) => n === impostor)).toHaveLength(1)
    }
  })
  it('picks a starting player from the players, and can be the impostor', () => {
    for (let i = 0; i < 200; i++) expect(names).toContain(pickStartingPlayer(names))
    expect(pickStartingPlayer(names, () => 0)).toBe('Anna')
    expect(pickStartingPlayer(names, () => 0.999)).toBe('Johan')
  })
  it('can pick every player', () => {
    const seen = new Set(Array.from({ length: 500 }, () => pickImpostor(names)))
    expect(seen.size).toBe(names.length)
  })
})

describe('validateSetup', () => {
  it('accepts 3 unique names and a category', () => {
    expect(validateSetup(['A', 'B', 'C'], 1).valid).toBe(true)
  })
  it('needs at least 3 players', () => {
    expect(validateSetup(['A', 'B'], 1).error).toBe('tooFew')
  })
  it('rejects empty names', () => {
    expect(validateSetup(['A', 'B', ' '], 1).error).toBe('empty')
    expect(validateSetup(['A', 'B', 'C', ''], 1).valid).toBe(false)
  })
  it('rejects duplicate names case-insensitively, guests and registered together', () => {
    expect(validateSetup(['Anna', 'anna', 'C'], 1).error).toBe('duplicate')
    expect(validateSetup(['Anna', ' ANNA ', 'C'], 1).error).toBe('duplicate')
  })
  it('needs at least 1 category', () => {
    expect(validateSetup(['A', 'B', 'C'], 0).error).toBe('noCategory')
  })
  it('has a Swedish message for each error', () => {
    expect(validateSetup(['A', 'B', 'C'], 0).message).toBe('Välj minst en kategori')
  })
})

describe('scoreRound', () => {
  it('gives 1 p to correct voters and 1 p to the impostor per wrong vote', () => {
    // Sara is the impostor. Anna and Erik vote correctly, Johan wrongly.
    const votes = { Anna: 'Sara', Erik: 'Sara', Johan: 'Anna', Sara: 'Erik' }
    expect(scoreRound(names, 'Sara', votes)).toEqual({ Anna: 1, Erik: 1, Johan: 0, Sara: 1 })
  })
  it('gives nothing for the impostor’s own vote', () => {
    const votes = { Anna: 'Sara', Erik: 'Sara', Johan: 'Sara', Sara: 'Anna' }
    expect(scoreRound(names, 'Sara', votes)).toEqual({ Anna: 1, Erik: 1, Johan: 1, Sara: 0 })
  })
  it('gives the impostor up to players-1 points', () => {
    const votes = { Anna: 'Erik', Erik: 'Johan', Johan: 'Anna', Sara: 'Anna' }
    expect(scoreRound(names, 'Sara', votes)).toEqual({ Anna: 0, Erik: 0, Johan: 0, Sara: 3 })
  })
})

describe('tallyVotes', () => {
  it('ignores the impostor’s vote', () => {
    const votes = { Anna: 'Sara', Erik: 'Sara', Johan: 'Anna', Sara: 'Anna' }
    expect(tallyVotes(votes, 'Sara')).toEqual({ Sara: 2, Anna: 1 })
  })
})

describe('roundVerdict', () => {
  it('is caught when the impostor alone has the most votes', () => {
    expect(roundVerdict({ Sara: 2, Erik: 1 }, 'Sara')).toBe('caught')
    expect(roundVerdict({ Sara: 1 }, 'Sara')).toBe('caught')
  })
  it('is escaped on a tie for most votes', () => {
    expect(roundVerdict({ Sara: 2, Erik: 2 }, 'Sara')).toBe('escaped')
  })
  it('is escaped when the impostor has 0 votes', () => {
    expect(roundVerdict({ Erik: 2, Anna: 1 }, 'Sara')).toBe('escaped')
    expect(roundVerdict({}, 'Sara')).toBe('escaped')
  })
  it('is escaped when someone else has more', () => {
    expect(roundVerdict({ Sara: 1, Erik: 2 }, 'Sara')).toBe('escaped')
  })
})

describe('gameSummary', () => {
  const players: Player[] = [
    { name: 'Anna', kind: 'registered', participantToken: 'tok-anna', avatar: { emoji: '🦊', color: 'x' } },
    { name: 'Erik', kind: 'guest' },
    { name: 'Sara', kind: 'registered', participantToken: 'tok-sara' },
    { name: 'Johan', kind: 'guest' },
  ]
  it('includes only registered players', () => {
    const s = gameSummary(players, { Anna: 1, Erik: 5, Sara: 2, Johan: 0 }, { Sara: 1 }, 3)
    expect(s.rounds).toBe(3)
    expect(s.players.map((p) => p.participant_token)).toEqual(['tok-anna', 'tok-sara'])
    expect(s.players[1]).toEqual({ participant_token: 'tok-sara', points: 2, impostor_rounds: 1, won: false })
  })
  it('marks every tied leader as won', () => {
    const s = gameSummary(players, { Anna: 3, Erik: 3, Sara: 3, Johan: 0 }, {}, 2)
    expect(s.players.map((p) => p.won)).toEqual([true, true])
  })
  it('a guest leader means no registered player won', () => {
    const s = gameSummary(players, { Anna: 1, Erik: 4, Sara: 2, Johan: 0 }, {}, 2)
    expect(s.players.every((p) => !p.won)).toBe(true)
  })
})

describe('addRegisteredEntry', () => {
  const anna = { id: 1, username: 'Anna', avatar_emoji: '🦊', avatar_color: '#000000' }
  let id = 100
  const make = () => ({ id: id++, name: '' })

  it('fills the first empty guest field', () => {
    const next = addRegisteredEntry([{ id: 1, name: 'Erik' }, { id: 2, name: '' }, { id: 3, name: '' }], anna, 'pt', make)
    expect(next?.map((e) => e.name)).toEqual(['Erik', 'Anna', ''])
    expect(next?.[1].registered).toEqual({ participantToken: 'pt', avatar: { emoji: '🦊', color: '#000000' } })
  })

  it('appends a row when no field is empty', () => {
    const next = addRegisteredEntry([{ id: 1, name: 'Erik' }], anna, 'pt', make)
    expect(next?.map((e) => e.name)).toEqual(['Erik', 'Anna'])
  })

  it('returns null when the name is already in the list', () => {
    expect(addRegisteredEntry([{ id: 1, name: ' anna ' }], anna, 'pt', make)).toBeNull()
  })
})

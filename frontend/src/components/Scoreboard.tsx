import { useEffect, useRef, useState } from 'react'
import type { Player } from '../types'
import { gameSummary, rankScores } from '../game'
import { saveGame } from '../api'
import { Screen, RoundTag } from './ui/Screen'
import { Button, LinkButton } from './ui/Button'
import { Standings } from './ui/ScoreRow'

type Props = {
  players: Player[]
  scores: Record<string, number>
  impostorRounds: Record<string, number>
  rounds: number
  onNewGame: () => void
}

type SaveStatus = 'none' | 'saving' | 'saved' | 'failed'

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`
}

export function Scoreboard({ players, scores, impostorRounds, rounds, onNewGame }: Props) {
  const registered = players.filter((p) => p.kind === 'registered')
  const [status, setStatus] = useState<SaveStatus>(registered.length ? 'saving' : 'none')
  const started = useRef(false)

  const save = () => {
    setStatus('saving')
    saveGame(gameSummary(players, scores, impostorRounds, rounds)).then(
      () => setStatus('saved'),
      () => setStatus('failed'),
    )
  }

  // The ref keeps StrictMode's double mount from saving the game twice. "Försök igen" bypasses it.
  useEffect(() => {
    if (started.current || registered.length === 0) return
    started.current = true
    save()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rows = rankScores(players, scores)
  const winners = rows.filter((r) => r.rank === 1).map((r) => r.player.name)
  const everyoneTied = winners.length === players.length

  return (
    <Screen
      right={<RoundTag>{rounds} {rounds === 1 ? 'runda' : 'rundor'}</RoundTag>}
      footer={
        <>
          {status === 'saving' && <p className="hint">Sparar statistik…</p>}
          {status === 'saved' && <p className="saved">✓ Statistik sparad för {joinNames(registered.map((p) => p.name))}</p>}
          {status === 'failed' && (
            <p className="hint">
              Kunde inte spara statistik – <LinkButton onClick={save}>Försök igen</LinkButton>
            </p>
          )}
          <Button onClick={onNewGame}>Nytt spel</Button>
        </>
      }
    >
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <div className="crown">👑</div>
        <div className="display d-l">
          {everyoneTied ? (
            'Oavgjort!'
          ) : (
            <>
              <span className="amber">{joinNames(winners)}</span> vinner!
            </>
          )}
        </div>
      </div>
      <Standings rows={rows} />
    </Screen>
  )
}

import { useState } from 'react'
import type { Player, Votes } from '../types'
import { Screen, RoundTag } from './ui/Screen'
import { Button } from './ui/Button'
import { RevealCard } from './ui/RevealCard'
import { PlayerRow } from './ui/PlayerRow'

type Props = { players: Player[]; roundNumber: number; onDone: (votes: Votes) => void }

type Stage = 'pass' | 'pick' | 'cast'

/**
 * Anonymous vote in turns. Every player, the impostor included, sees exactly the same screens.
 * Nothing about earlier votes is shown, and the impostor is not known to this component.
 */
export function Vote({ players, roundNumber, onDone }: Props) {
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<Stage>('pass')
  const [pick, setPick] = useState<string | null>(null)
  const [votes, setVotes] = useState<Votes>({})
  const voter = players[index]
  const isLast = index + 1 === players.length
  const top = <RoundTag>Runda {roundNumber}</RoundTag>

  if (stage === 'pass') {
    return (
      <Screen right={top} center footer={<Button onClick={() => setStage('pick')}>Rösta</Button>}>
        <div className="eyebrow">Röstning · {index + 1} av {players.length}</div>
        <div className="display d-l">
          Ge enheten till
          <br />
          <span className="amber">{voter.name}</span>
        </div>
        <RevealCard>
          <div className="tap">🗳️</div>
          <p className="muted mt-12">
            Din röst är hemlig.
            <br />
            Se till att ingen annan tittar!
          </p>
        </RevealCard>
      </Screen>
    )
  }

  if (stage === 'pick') {
    const confirm = () => {
      if (!pick) return
      setVotes({ ...votes, [voter.name]: pick })
      setStage('cast')
    }
    return (
      <Screen right={top} footer={<Button disabled={!pick} onClick={confirm}>Bekräfta</Button>}>
        <div>
          <div className="eyebrow">{voter.name} röstar</div>
          <div className="display d-m mt-4">Vem är bedragaren?</div>
          <p className="muted small mt-4">Ingen får veta vad du röstar på. Du kan ändra dig tills du bekräftar.</p>
        </div>
        <div className="stack" role="radiogroup" aria-label="Vem är bedragaren?">
          {players.map((p) =>
            p.name === voter.name ? null : (
              <PlayerRow
                key={p.name}
                player={p}
                selectable
                selected={pick === p.name}
                onSelect={() => setPick(p.name)}
              />
            ),
          )}
        </div>
      </Screen>
    )
  }

  const next = () => {
    if (isLast) {
      onDone(votes)
    } else {
      setIndex(index + 1)
      setPick(null)
      setStage('pass')
    }
  }
  return (
    <Screen
      right={top}
      center
      footer={
        isLast ? (
          <Button onClick={next}>Visa resultatet</Button>
        ) : (
          <Button variant="secondary" onClick={next}>Dölj och skicka vidare</Button>
        )
      }
    >
      <div className="done">✓</div>
      <div className="display d-l mt-8">Rösten är lagd</div>
      {isLast ? (
        <p className="muted small">Alla har röstat. Nu får ni se resultatet.</p>
      ) : (
        <p className="muted small">
          Dölj skärmen och ge enheten till <b className="strong">{players[index + 1].name}</b>.
        </p>
      )}
    </Screen>
  )
}

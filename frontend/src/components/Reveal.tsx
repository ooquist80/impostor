import { useState } from 'react'
import type { Player, Round } from '../types'
import { Screen, RoundTag } from './ui/Screen'
import { Button } from './ui/Button'
import { RevealCard } from './ui/RevealCard'
import { Avatar } from './ui/Avatar'

type Props = { players: Player[]; round: Round; roundNumber: number; onDone: () => void }

export function Reveal({ players, round, roundNumber, onDone }: Props) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const player = players[index]
  const isImpostor = player.name === round.impostor
  const top = <RoundTag>Runda {roundNumber}</RoundTag>

  if (!shown) {
    return (
      <Screen right={top} center footer={<Button onClick={() => setShown(true)}>Visa mitt ord</Button>}>
        <div className="eyebrow">Spelare {index + 1} av {players.length}</div>
        <Avatar name={player.name} avatar={player.avatar} size={56} />
        <div className="display d-l">
          Ge enheten till
          <br />
          <span className="amber">{player.name}</span>
        </div>
        <RevealCard>
          <div className="tap">👆</div>
          <p className="muted mt-12">
            Tryck för att se ditt ord.
            <br />
            Se till att ingen annan tittar!
          </p>
        </RevealCard>
      </Screen>
    )
  }

  const hide = () => {
    setShown(false)
    if (index + 1 < players.length) setIndex(index + 1)
    else onDone()
  }
  const footer = <Button variant="secondary" onClick={hide}>Dölj och skicka vidare</Button>

  if (isImpostor) {
    return (
      <Screen right={top} center tone="danger" footer={footer}>
        <div className="eyebrow">{player.name}</div>
        <RevealCard variant="imp">
          <div className="imp-emoji">🕵️</div>
          <div className="display d-l red" style={{ margin: '8px 0 18px' }}>Du är bedragaren!</div>
          <div className="eyebrow">Ledtråd</div>
          <div className="display d-m mt-4">{round.clue}</div>
        </RevealCard>
        <p className="muted small">Smält in. Låt ingen märka något.</p>
      </Screen>
    )
  }

  return (
    <Screen right={top} center footer={footer}>
      <div className="eyebrow">{player.name}</div>
      <RevealCard variant="word">
        <div className="eyebrow">Ordet är</div>
        <div className={`display d-xl amber ${round.word.length > 9 ? 'long' : ''}`} style={{ margin: '10px 0' }}>{round.word}</div>
        <p className="muted">Kategori: {round.category}</p>
      </RevealCard>
      <p className="muted small">Kom ihåg ordet och avslöja det inte.</p>
    </Screen>
  )
}

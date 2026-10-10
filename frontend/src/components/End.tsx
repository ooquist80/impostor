import { useState } from 'react'
import type { Category, Player, Round, Votes } from '../types'
import { roundVerdict, scoreRound, tallyVotes } from '../game'
import { Screen, RoundTag } from './ui/Screen'
import { Button, LinkButton } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { PlayerRow } from './ui/PlayerRow'
import { BottomSheet } from './ui/BottomSheet'
import { CategoryPicker } from './CategoryPicker'

type Props = {
  players: Player[]
  round: Round
  votes: Votes
  scores: Record<string, number>
  roundNumber: number
  categories: Category[]
  categoryIds: number[]
  onSaveCategories: (ids: number[]) => void
  onNext: () => void
  onFinish: () => void
  loading: boolean
  error: string | null
}

const votesText = (n: number) => `${n} ${n === 1 ? 'röst' : 'röster'}`

export function End({ players, round, votes, scores, roundNumber, categories, categoryIds, onSaveCategories, onNext, onFinish, loading, error }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<number[]>(categoryIds)

  const names = players.map((p) => p.name)
  const tally = tallyVotes(votes, round.impostor)
  const caught = roundVerdict(tally, round.impostor) === 'caught'
  const points = scoreRound(names, round.impostor, votes)

  const rows = players
    .map((p, i) => ({ p, i, n: tally[p.name] ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)

  const top = Math.max(...rows.map((r) => r.n))
  const leaders = rows.filter((r) => r.n === top)
  const who = <b className="strong">{round.impostor}</b>
  let lead
  if (caught) lead = <>{who} var bedragaren och fick flest röster.</>
  else if (leaders.length === 1) lead = <>{leaders[0].p.name} fick flest röster, men {who} var bedragaren.</>
  else lead = <>Det blev lika om flest röster, men {who} var bedragaren.</>

  const selectedNames = categories.filter((c) => categoryIds.includes(c.id)).map((c) => c.name).join(' · ')

  const openSheet = () => {
    setDraft(categoryIds)
    setSheetOpen(true)
  }
  const close = () => setSheetOpen(false)
  const save = () => {
    onSaveCategories(draft)
    close()
  }

  return (
    <Screen
      right={<RoundTag>Runda {roundNumber}</RoundTag>}
      tone={caught ? 'win' : 'danger'}
      center
      footer={
        <>
          <div className="cat-row">
            <span className="muted label">Kategorier</span>
            <span className="cats">{selectedNames}</span>
            <LinkButton onClick={openSheet}>Ändra</LinkButton>
          </div>
          <Button disabled={loading} onClick={onNext}>{loading ? 'Hämtar ord…' : 'Nästa runda'}</Button>
          <Button variant="secondary" disabled={loading} onClick={onFinish}>Avsluta</Button>
          {error && <p className="hint">{error}</p>}
        </>
      }
    >
      <div className={`display d-xl ${caught ? 'green' : 'red'}`}>{caught ? 'Rätt!' : 'Fel!'}</div>
      <p className="muted">{lead}</p>
      <div className="facts">
        <Card><span className="eyebrow">Ordet</span><b className="amber">{round.word}</b></Card>
        <Card><span className="eyebrow">Ledtråd</span><b>{round.clue}</b></Card>
      </div>
      <div className="tally">
        <div className="tally-head">
          <span className="eyebrow">Röster</span>
          <span className="hint">Poäng · totalt</span>
        </div>
        {rows.map(({ p, n }) => {
          const isImpostor = p.name === round.impostor
          const pts = points[p.name] ?? 0
          return (
            <PlayerRow key={p.name} player={p} avatarSize={32} mark={isImpostor ? '🕵️' : undefined}>
              <span className="votes">{votesText(n)}</span>
              <Badge variant={isImpostor ? 'red' : pts > 0 ? 'green' : 'zero'}>+{pts} p</Badge>
              <span className="total">{scores[p.name] ?? 0}</span>
            </PlayerRow>
          )
        })}
      </div>

      <BottomSheet open={sheetOpen} onClose={close} label="Kategorier för nästa runda">
        <div>
          <CategoryPicker
            title="Kategorier för nästa runda"
            note="Samma som förra rundan om du inte ändrar något."
            categories={categories}
            selected={draft}
            onChange={setDraft}
          />
        </div>
        <Button disabled={draft.length === 0} onClick={save}>Spara</Button>
        <Button variant="secondary" onClick={close}>Avbryt</Button>
      </BottomSheet>
    </Screen>
  )
}

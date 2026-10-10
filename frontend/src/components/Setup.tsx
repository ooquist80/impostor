import { useEffect, useRef, useState } from 'react'
import type { ApiPlayer, Category, Entry } from '../types'
import { validateSetup } from '../game'
import { Screen } from './ui/Screen'
import { Card } from './ui/Card'
import { Button, IconButton, LinkButton } from './ui/Button'
import { Avatar } from './ui/Avatar'
import { Input } from './ui/Input'
import { CategoryPicker } from './CategoryPicker'
import { Rules } from './Rules'
import { QrScanner } from './QrScanner'

let nextId = 1
export const newEntry = (): Entry => ({ id: nextId++, name: '' })

export const MIN_ENTRIES = 3

type Props = {
  entries: Entry[]
  setEntries: (updater: (prev: Entry[]) => Entry[]) => void
  categories: Category[] | null
  categoryIds: number[]
  setCategoryIds: (ids: number[]) => void
  categoriesFailed: boolean
  reloadCategories: () => void
  onStart: () => void
  starting: boolean
  startError: string | null
  onOpenAccount: () => void
}

export function Setup(p: Props) {
  const { entries, setEntries } = p
  const [rulesOpen, setRulesOpen] = useState(false)
  const [scanning, setScanning] = useState(false)

  const entriesRef = useRef(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const check = validateSetup(entries.map((e) => e.name), p.categoryIds.length)
  const canRemove = entries.length > MIN_ENTRIES

  const rename = (id: number, name: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)))
  const remove = (id: number) => setEntries((prev) => prev.filter((e) => e.id !== id))
  const add = () => setEntries((prev) => [...prev, newEntry()])

  /** Called by the scanner. Returns false if the player is already in the list. */
  const addRegistered = (player: ApiPlayer, participantToken: string): boolean => {
    const current = entriesRef.current
    const taken = current.some((e) => e.name.trim().toLowerCase() === player.username.toLowerCase())
    if (taken) return false
    const registered = {
      participantToken,
      avatar: { emoji: player.avatar_emoji, color: player.avatar_color },
    }
    const empty = current.find((e) => !e.registered && e.name.trim() === '')
    const next: Entry[] = empty
      ? current.map((e) => (e.id === empty.id ? { ...e, name: player.username, registered } : e))
      : [...current, { ...newEntry(), name: player.username, registered }]
    entriesRef.current = next
    setEntries(() => next)
    return true
  }

  return (
    <Screen
      right={
        <div className="topbar-actions">
          <button type="button" className="rules-btn" onClick={() => setRulesOpen(true)}>Regler</button>
          <button type="button" className="profile-btn" aria-label="Konto" onClick={p.onOpenAccount}>👤</button>
        </div>
      }
      footer={
        <>
          <Button disabled={!check.valid || p.starting} onClick={p.onStart}>
            {p.starting ? 'Hämtar ord…' : 'Starta spelet'}
          </Button>
          <p className="hint">{p.startError ?? check.message}</p>
        </>
      }
    >
      <Card title="Spelare" aside={<span className="count">{entries.length} st</span>}>
        <div className="stack">
          {entries.map((e, i) => (
            <div className="input-row" key={e.id}>
              {e.registered ? (
                <div className="reg-row">
                  <Avatar name={e.name} avatar={e.registered.avatar} size={32} />
                  <span className="name">{e.name}</span>
                  <span className="tag">✓ Konto</span>
                </div>
              ) : (
                <Input
                  value={e.name}
                  placeholder={`Spelare ${i + 1}`}
                  maxLength={30}
                  autoComplete="off"
                  aria-label={`Spelare ${i + 1}`}
                  onChange={(ev) => rename(e.id, ev.target.value)}
                />
              )}
              {canRemove ? (
                <IconButton aria-label={`Ta bort ${e.name || `spelare ${i + 1}`}`} onClick={() => remove(e.id)}>×</IconButton>
              ) : (
                <span className="icon-spacer" />
              )}
            </div>
          ))}
          <div className="add-grid">
            <Button variant="secondary" small dashed aria-label="Lägg till spelare" onClick={add}>+ Lägg till</Button>
            <Button variant="scan" small onClick={() => setScanning(true)}>▣ Skanna QR</Button>
          </div>
        </div>
      </Card>

      <Card>
        {p.categories ? (
          p.categories.length > 0 ? (
            <CategoryPicker title="Kategorier" categories={p.categories} selected={p.categoryIds} onChange={p.setCategoryIds} />
          ) : (
            <>
              <div className="card-title">Kategorier</div>
              <p className="muted small">Det finns inga kategorier än.</p>
            </>
          )
        ) : (
          <>
            <div className="card-title">
              Kategorier
              {p.categoriesFailed && <LinkButton onClick={p.reloadCategories}>Försök igen</LinkButton>}
            </div>
            <p className="muted small">{p.categoriesFailed ? 'Kunde inte hämta kategorierna.' : 'Hämtar kategorier…'}</p>
          </>
        )}
      </Card>

      <Rules open={rulesOpen} onClose={() => setRulesOpen(false)} />
      {scanning && <QrScanner onAdd={addRegistered} onClose={() => setScanning(false)} />}
    </Screen>
  )
}

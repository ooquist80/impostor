import { useEffect, useRef, useState } from 'react'
import type { ApiPlayer, Category, Entry } from '../types'
import { addRegisteredEntry, validateSetup, type AddResult } from '../game'
import { Screen } from './ui/Screen'
import { Card } from './ui/Card'
import { Button, IconButton, LinkButton } from './ui/Button'
import { Avatar } from './ui/Avatar'
import { Input } from './ui/Input'
import { CategoryPicker } from './CategoryPicker'
import { Rules } from './Rules'
import { QrScanner } from './QrScanner'
import { Toast } from './ui/Toast'
import { applyUpdate, useUpdateAvailable } from '../pwa'

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
  loggedIn: boolean
  /** The player logged in on this device, once known (after the first add). */
  me: ApiPlayer | null
  /** Adds the logged-in player to the list. */
  onAddMe: () => Promise<AddResult>
}

export function Setup(p: Props) {
  const { entries, setEntries } = p
  const [rulesOpen, setRulesOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [addingMe, setAddingMe] = useState(false)
  const [addMeError, setAddMeError] = useState<string | null>(null)

  const entriesRef = useRef(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const check = validateSetup(entries.map((e) => e.name), p.categoryIds.length)
  const canRemove = entries.length > MIN_ENTRIES

  const rename = (id: number, name: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)))
  // A registered row can always be removed. At the minimum it turns back into an empty guest field.
  const remove = (id: number) =>
    setEntries((prev) =>
      prev.length > MIN_ENTRIES ? prev.filter((e) => e.id !== id) : prev.map((e) => (e.id === id ? newEntry() : e)),
    )
  const add = () => setEntries((prev) => [...prev, newEntry()])

  /** Called by the scanner. */
  const addRegistered = (player: ApiPlayer, participantToken: string): AddResult => {
    const result = addRegisteredEntry(entriesRef.current, player, participantToken, newEntry)
    if (result.ok) {
      const next = result.entries
      entriesRef.current = next
      setEntries(() => next)
    }
    return result
  }

  const updateAvailable = useUpdateAvailable()

  const me = p.me
  const meInList = !!me && entries.some((e) => e.registered?.playerId === me.id)
  const addMe = async () => {
    setAddingMe(true)
    setAddMeError(null)
    try {
      const result = await p.onAddMe()
      if (!result.ok) {
        setAddMeError(result.reason === 'already' ? 'Du finns redan i listan' : 'Någon annan i listan har samma namn som du')
      }
    } catch {
      setAddMeError('Kunde inte lägga till dig. Försök igen.')
    } finally {
      setAddingMe(false)
    }
  }

  return (
    <Screen
      right={
        <div className="topbar-actions">
          <button type="button" className="rules-btn" onClick={() => setRulesOpen(true)}>Regler</button>
          <button type="button" className="profile-btn" aria-label="Konto" onClick={p.onOpenAccount}>
            {p.loggedIn && me ? <Avatar name={me.name} avatar={me.avatar} size={36} /> : '👤'}
          </button>
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
      {updateAvailable && (
        <div className="toast-area">
          <Toast variant="warn">
            Ny version finns · <LinkButton onClick={applyUpdate}>Uppdatera</LinkButton>
          </Toast>
        </div>
      )}
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
                <div className="guest-field">
                  {/* A guest's avatar is seeded with their name, so it follows what is typed. */}
                  {e.name.trim() ? <Avatar name={e.name} size={32} /> : <span className="avatar-slot" />}
                  <Input
                    value={e.name}
                    placeholder={`Spelare ${i + 1}`}
                    maxLength={30}
                    autoComplete="off"
                    aria-label={`Spelare ${i + 1}`}
                    onChange={(ev) => rename(e.id, ev.target.value)}
                  />
                </div>
              )}
              {canRemove || e.registered ? (
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
          {p.loggedIn && !meInList && (
            <Button variant="secondary" small disabled={addingMe} onClick={addMe}>
              {addingMe ? 'Lägger till…' : `+ Lägg till ${me ? me.name : 'mig'}`}
            </Button>
          )}
          {addMeError && <p className="hint">{addMeError}</p>}
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

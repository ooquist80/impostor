import { useState } from 'react'
import type { Avatar as AvatarData } from '../../types'
import { BODIES, EYES, MOUTHS, PATTERNS, TOPS, backgroundColors, bodyColors, randomSeed } from '../../avatar'
import { Avatar } from '../ui/Avatar'
import { Button, LinkButton } from '../ui/Button'

type Props = {
  name: string
  avatar: AvatarData
  onSave: (avatar: AvatarData) => Promise<void>
  onCancel: () => void
}

type Part = 'body' | 'eyes' | 'mouth' | 'top' | 'pattern'

/** One row per part, previewed on the player's own avatar. */
const PARTS: [Part, string, string[]][] = [
  ['body', 'Kropp', BODIES],
  ['eyes', 'Ögon', EYES],
  ['mouth', 'Mun', MOUTHS],
  ['top', 'Topp', TOPS],
  ['pattern', 'Mönster', PATTERNS],
]

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

/** Content of the "Ändra avatar" sheet. Changes are only saved with "Spara". */
export function AvatarEditor({ name, avatar, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<AvatarData>(avatar)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const set = (changes: Partial<AvatarData>) => setDraft((d) => ({ ...d, ...changes }))

  const save = async () => {
    setSaving(true)
    setError(false)
    try {
      await onSave(draft)
    } catch {
      setError(true)
      setSaving(false)
    }
  }

  return (
    <>
      <div className="avatar-editor-head">
        <Avatar name={name} avatar={draft} size={96} />
        {/* A new seed and no picks: a whole new random avatar. */}
        <LinkButton onClick={() => setDraft({ seed: randomSeed() })}>🎲 Slumpa</LinkButton>
      </div>
      {PARTS.map(([part, label, choices]) => (
        <div key={part} className="picker">
          <div className="eyebrow">{label}</div>
          <div className="picker-row">
            {choices.map((v, i) => (
              <button key={v} type="button" className={draft[part] === v ? 'on' : ''} aria-label={v === 'none' ? `${label}: ingen` : `${label} ${i + 1}`} onClick={() => set({ [part]: v })}>
                <Avatar name={name} avatar={{ ...draft, [part]: v }} size={40} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="picker">
        <div className="eyebrow">Färg</div>
        <div className="color-row">
          {bodyColors().map((c, i) => (
            <button key={c} type="button" className={same(c, draft.bodyColor) ? 'on' : ''} style={{ background: c }} aria-label={`Färg ${i + 1}`} onClick={() => set({ bodyColor: c })} />
          ))}
        </div>
      </div>
      <div className="picker">
        <div className="eyebrow">Bakgrund</div>
        <div className="color-row">
          {backgroundColors().map((c, i) => (
            <button key={c} type="button" className={same(c, draft.backgroundColor) ? 'on' : ''} style={{ background: c }} aria-label={`Bakgrund ${i + 1}`} onClick={() => set({ backgroundColor: c })} />
          ))}
        </div>
      </div>
      {error && <p className="form-error">Kunde inte spara avataren.</p>}
      <Button disabled={saving} onClick={save}>{saving ? 'Sparar…' : 'Spara'}</Button>
      <Button variant="secondary" onClick={onCancel}>Avbryt</Button>
    </>
  )
}

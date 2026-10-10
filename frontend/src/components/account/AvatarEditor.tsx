import { useState } from 'react'
import type { Avatar as AvatarData } from '../../types'
import { EYES, MOUTHS, backgroundColors, randomSeed, shapeColors } from '../../avatar'
import { Avatar } from '../ui/Avatar'
import { Button, LinkButton } from '../ui/Button'

type Props = {
  name: string
  avatar: AvatarData
  onSave: (avatar: AvatarData) => Promise<void>
  onCancel: () => void
}

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
      <div className="picker">
        <div className="eyebrow">Ögon</div>
        <div className="picker-row">
          {EYES.map((eyes, i) => (
            <button key={eyes} type="button" className={draft.eyes === eyes ? 'on' : ''} aria-label={`Ögon ${i + 1}`} onClick={() => set({ eyes })}>
              <Avatar name={name} avatar={{ ...draft, eyes }} size={40} />
            </button>
          ))}
        </div>
      </div>
      <div className="picker">
        <div className="eyebrow">Mun</div>
        <div className="picker-row">
          {MOUTHS.map((mouth, i) => (
            <button key={mouth} type="button" className={draft.mouth === mouth ? 'on' : ''} aria-label={`Mun ${i + 1}`} onClick={() => set({ mouth })}>
              <Avatar name={name} avatar={{ ...draft, mouth }} size={40} />
            </button>
          ))}
        </div>
      </div>
      <div className="picker">
        <div className="eyebrow">Färg</div>
        <div className="color-row">
          {shapeColors().map((c, i) => (
            <button key={c} type="button" className={same(c, draft.shapeColor) ? 'on' : ''} style={{ background: c }} aria-label={`Färg ${i + 1}`} onClick={() => set({ shapeColor: c })} />
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

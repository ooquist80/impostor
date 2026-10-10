import type { Category } from '../types'
import { Chip } from './ui/Chip'
import { LinkButton } from './ui/Button'

type Props = {
  title: string
  note?: string
  categories: Category[]
  selected: number[]
  onChange: (ids: number[]) => void
}

/** Title row with the "Välj alla" / "Avmarkera alla" toggle, and one chip per category. */
export function CategoryPicker({ title, note, categories, selected, onChange }: Props) {
  const allOn = categories.length > 0 && categories.every((c) => selected.includes(c.id))
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  return (
    <>
      <div className="card-title">
        {title}
        <LinkButton onClick={() => onChange(allOn ? [] : categories.map((c) => c.id))}>
          {allOn ? 'Avmarkera alla' : 'Välj alla'}
        </LinkButton>
      </div>
      {note && <p className="sheet-note">{note}</p>}
      <div className="chips">
        {categories.map((c) => (
          <Chip key={c.id} on={selected.includes(c.id)} onToggle={() => toggle(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>
    </>
  )
}

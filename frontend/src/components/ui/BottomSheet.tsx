import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  /** Called for the backdrop, Escape and the sheet's own cancel button. Never applies anything. */
  onClose: () => void
  label: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, label, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div className="bsheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="grip" />
        {children}
      </div>
    </>,
    document.body,
  )
}

import { useEffect, useRef, useState } from 'react'
import QrScannerLib from 'qr-scanner'
import { ApiError, redeemJoinToken } from '../api'
import type { ApiPlayer } from '../types'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { Toast } from './ui/Toast'

type Props = {
  /** Returns false if the player is already in the list. */
  onAdd: (player: ApiPlayer, participantToken: string) => boolean
  onClose: () => void
}

type ToastState = { variant: 'ok' | 'warn'; text: string; player?: ApiPlayer } | null

// The camera sees the same QR code many times a second; look at one token at most this often.
const COOLDOWN_MS = 2500

export function QrScanner({ onAdd, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onAddRef = useRef(onAdd)
  const [toast, setToast] = useState<ToastState>(null)
  const [added, setAdded] = useState(0)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    onAddRef.current = onAdd
  }, [onAdd])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let busy = false
    const lastSeen = new Map<string, number>()
    const redeemed = new Map<string, ApiPlayer>()

    const show = (t: ToastState) => {
      setToast(t)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setToast(null), 3000)
    }

    const handle = async (token: string) => {
      const now = Date.now()
      if (busy || now - (lastSeen.get(token) ?? 0) < COOLDOWN_MS) return
      lastSeen.set(token, now)
      const known = redeemed.get(token)
      if (known) {
        show({ variant: 'warn', text: 'Redan med' })
        return
      }
      busy = true
      try {
        const res = await redeemJoinToken(token)
        redeemed.set(token, res.player)
        if (onAddRef.current(res.player, res.participant_token)) {
          setAdded((n) => n + 1)
          show({ variant: 'ok', text: `${res.player.username} tillagd`, player: res.player })
        } else {
          show({ variant: 'warn', text: 'Redan med' })
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 400) {
          show({ variant: 'warn', text: 'QR-koden har gått ut, be spelaren visa en ny' })
        } else if (err instanceof ApiError && err.status === 0) {
          show({ variant: 'warn', text: 'Kunde inte nå servern' })
        } else {
          show({ variant: 'warn', text: 'Det gick inte att läsa QR-koden, försök igen' })
        }
      } finally {
        busy = false
      }
    }

    const scanner = new QrScannerLib(video, (result) => void handle(result.data), {
      returnDetailedScanResult: true,
      preferredCamera: 'environment',
      maxScansPerSecond: 5,
      highlightScanRegion: false,
      highlightCodeOutline: false,
    })
    scanner.start().catch(() => {
      if (!cancelled) {
        setCameraError(
          window.isSecureContext
            ? 'Kameran går inte att använda. Tillåt kameran i webbläsaren och försök igen.'
            : 'Kameran kräver en säker anslutning (https).',
        )
      }
    })

    return () => {
      cancelled = true
      window.clearTimeout(timer.current)
      scanner.stop()
      scanner.destroy()
    }
  }, [])

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Skanna QR">
      <div className="scanner-inner">
        <video ref={videoRef} playsInline muted />
        <div className="camera-shade" />
        <div className="scan-ui">
          <div className="scan-head">
            <span className="display d-m">Skanna QR</span>
            <button type="button" className="close" aria-label="Stäng kameran" onClick={onClose}>×</button>
          </div>
          <p className="muted small" style={{ textAlign: 'center' }}>
            Rikta kameran mot spelarens QR-kod.
            <br />
            Du kan skanna flera i rad.
          </p>
          <div className="viewfinder">
            <i /><i /><i /><i />
            <div className="scanline" />
          </div>
          <div className="toast-area">
            {cameraError ? (
              <Toast variant="warn">{cameraError}</Toast>
            ) : (
              toast && (
                <Toast
                  variant={toast.variant}
                  avatar={
                    toast.player && (
                      <Avatar
                        name={toast.player.username}
                        avatar={{ emoji: toast.player.avatar_emoji, color: toast.player.avatar_color }}
                        size={28}
                      />
                    )
                  }
                >
                  {toast.variant === 'warn' && toast.text.startsWith('QR-koden') ? `⏱ ${toast.text}` : toast.text}
                </Toast>
              )
            )}
          </div>
          <div className="footer">
            <Button onClick={onClose}>{added > 0 ? `Klar (${added} tillagd${added > 1 ? 'a' : ''})` : 'Klar'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

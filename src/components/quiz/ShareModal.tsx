/**
 * Share modal (F5) — renders the 1080×1920 Instagram Story card from a
 * hidden/scaled DOM node via html-to-image, then either hands it to the
 * native share sheet (mobile, when supported) or downloads it (desktop).
 * "Copy share text" is a fallback that always works.
 *
 * The same node backs both the on-screen preview (CSS `transform: scale`)
 * and the full-resolution capture (html-to-image's `style` override resets
 * the transform for the clone it rasterizes) — one node, not two.
 */

import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useToast } from '@/components/ui'
import { rankLine } from './rank'

const SHARE_URL = 'forever-dolly.app.space'
const GOLD = '#C9922A'
const BORDER = '#EDD9C8'
const MUTED = '#8A6F73'

interface ShareModalProps {
  score: number
  total: number
  onClose: () => void
}

export function ShareModal({ score, total, onClose }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [onClose])

  const shareText = `I scored ${score}/${total} on the Forever Dolly quiz ✦ ${SHARE_URL}`
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function renderPng(): Promise<string> {
    if (!cardRef.current) throw new Error('Share card not ready')
    // Fonts load async off the Google Fonts <link> — without this, a fast
    // click can snapshot the fallback serif before Playfair swaps in.
    await document.fonts.ready
    return toPng(cardRef.current, {
      width: 1080,
      height: 1920,
      pixelRatio: 1,
      style: { transform: 'none' },
    })
  }

  async function handlePrimary() {
    setBusy(true)
    try {
      const dataUrl = await renderPng()
      const blob = await (await fetch(dataUrl)).blob()

      if (canNativeShare) {
        const file = new File([blob], 'forever-dolly-quiz.png', { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Forever Dolly Quiz', text: shareText })
          return
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'forever-dolly-quiz.png'
      a.click()
      URL.revokeObjectURL(url)
      success('Image downloaded')
    } catch (e) {
      // AbortError = the user dismissed the native share sheet — not a failure.
      if (e instanceof Error && e.name === 'AbortError') return
      error('Could not share your score', e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      error('Could not copy', e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(61,43,46,0.45)' }} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share your score"
        data-testid="share-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-[360px] flex-col items-center gap-4 p-6"
        style={{
          background: 'linear-gradient(170deg, #FDF6F0, #FFF9E8)',
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
        }}
      >
        <div
          style={{
            width: 281,
            height: 499,
            overflow: 'hidden',
            borderRadius: 14,
            boxShadow: '0 20px 50px -12px rgba(61,43,46,0.45)',
          }}
        >
          <div
            ref={cardRef}
            style={{
              width: 1080,
              height: 1920,
              transform: 'scale(0.26)',
              transformOrigin: 'top left',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 30,
              padding: '100px 80px',
              textAlign: 'center',
              background: 'linear-gradient(160deg, #FBEAEE 0%, #FDF6F0 55%, #FFF9E8 100%)',
              border: '4px solid #C9922A',
            }}
          >
            <div style={{ color: GOLD, fontSize: 44, letterSpacing: '0.5em' }}>✦ ✦ ✦</div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 72,
                letterSpacing: '0.14em',
                color: '#3D2B2E',
              }}
            >
              FOREVER DOLLY
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 300,
                lineHeight: 1,
                color: '#D4497A',
              }}
            >
              {score}/{total}
            </div>
            <div style={{ fontSize: 46, fontWeight: 600, color: '#3D2B2E' }}>{rankLine(score, total)}</div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontStyle: 'italic',
                fontSize: 52,
                color: MUTED,
              }}
            >
              The Forever Dolly Quiz
            </div>
            <div style={{ color: GOLD, fontSize: 44, letterSpacing: '0.5em' }}>✦ ✦ ✦</div>
            <div style={{ fontSize: 40, fontWeight: 600, color: GOLD }}>{SHARE_URL}</div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            data-testid="share-primary-button"
            onClick={handlePrimary}
            disabled={busy}
            className="min-h-[44px] cursor-pointer rounded-full text-sm font-semibold disabled:opacity-60"
            style={{
              border: '1px solid #C9922A',
              background: 'linear-gradient(180deg,#E0AE4E,#C9922A)',
              color: '#FFF9E8',
              boxShadow: '0 2px 8px rgba(201,146,42,0.25)',
            }}
          >
            {busy ? 'Preparing…' : canNativeShare ? 'Share my score ✦' : 'Download image ✦'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={busy}
            className="min-h-[40px] cursor-pointer rounded-full text-sm font-medium disabled:opacity-60"
            style={{ border: `1px solid ${BORDER}`, background: 'rgba(253,246,240,0.6)', color: MUTED }}
          >
            {copied ? 'Copied ✦' : 'Copy share text'}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-[40px] cursor-pointer rounded-full text-sm font-medium"
            style={{ border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

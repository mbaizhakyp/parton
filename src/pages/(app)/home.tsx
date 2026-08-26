/**
 * The tribute wall (F1) — the app's main surface, at the default `/home`
 * route. Lives in the `(app)/` tier (dynamic, signed-out capable): the
 * tributes schema grants the `'*'` wildcard role `read: 'published'`, so
 * signed-out visitors see the wall too. Posting, sparkling, editing/deleting
 * your own tribute, and moderator hide/pin all require sign-in — see
 * references/design/forever-dolly-app-notes.md for the visual spec and
 * docs/requirements.md F1 for the acceptance criteria.
 *
 * Real-time: `useQuery` streams every create/update/delete over the tributes
 * WebSocket subscription, so new tributes and sparkle counts appear on every
 * open client without a refresh.
 *
 * Deviation from the design's rail (leaderboard / ask-Dolly teaser / motto
 * card, ≥1024px): omitted. That rail surfaces live quiz data owned by a
 * parallel build (quiz.tsx, scores schema) — out of scope here.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  useAuthProfileReady,
  useMutations,
  useQuery,
  AuthOverlay,
  formatMessageTime,
  type RecordData,
} from 'deepspace'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  cn,
  ConfirmModal,
  Input,
  Modal,
  Textarea,
  useToast,
} from '@/components/ui'
import { callAction } from '../../lib/callAction'

const BODY_MAX_LENGTH = 500

const INK = '#3D2B2E'
const MUTED = '#8A6F73'
const GOLD = '#C9922A'
const PINK = '#D4497A'
const BORDER = '#EDD9C8'
const BLUSH = '#FBEAEE'
const CREAM_GOLD = '#FFF9E8'

const GOLD_BUTTON_STYLE: CSSProperties = {
  backgroundImage: 'linear-gradient(180deg,#E0AE4E,#C9922A)',
  color: CREAM_GOLD,
  borderColor: GOLD,
  boxShadow: '0 2px 8px rgba(201,146,42,0.25)',
}
const FIELD_STYLE: CSSProperties = { background: CREAM_GOLD, borderColor: BORDER }

interface Tribute {
  /** Stamped server-side from the JWT (userBound) — never sent by the client. */
  authorId?: string
  authorName: string
  body: string
  place?: string
  year?: string
  sparkles?: number
  hidden?: boolean
  pinned?: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** "Place, Year" -> { place, year }, split on the LAST comma (so "Fort
 * Worth, TX, 1995" gives place="Fort Worth, TX", year="1995"). No comma at
 * all -> the whole string is treated as the place. */
function parsePlaceYear(raw: string): { place?: string; year?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return {}
  const idx = trimmed.lastIndexOf(',')
  if (idx === -1) return { place: trimmed }
  const place = trimmed.slice(0, idx).trim()
  const year = trimmed.slice(idx + 1).trim()
  return { place: place || undefined, year: year || undefined }
}

export default function WallPage() {
  const { isLoaded, isSignedIn, userId, user, userLoading } = useAuthProfileReady({
    requireUser: true,
  })
  const { records: tributes, status } = useQuery<Tribute>('tributes', {
    orderBy: 'createdAt',
    orderDir: 'desc',
  })
  const { create, put, remove, ready } = useMutations<Tribute>('tributes')
  const { success, error } = useToast()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  // recordId -> sparkle count the UI should show at least, until the real
  // (server-broadcast) value catches up. See addSparkle in src/actions.
  const [pendingSparkles, setPendingSparkles] = useState<Record<string, number>>({})
  // Client-side only "sparkled by me" flag for the pill's sparkled style —
  // the schema has no per-user sparkle record (just a running count), so
  // this doesn't survive a reload. Cosmetic, not a correctness concern.
  const [sparkledIds, setSparkledIds] = useState<Set<string>>(new Set())

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const isModerator = profileReady && (user?.role === 'moderator' || user?.role === 'admin')
  // The wall is publicly readable (signed-out visitors included) — never
  // fall back to email here. A display name, or a neutral placeholder.
  const authorName = user?.name || 'A Dolly Fan'

  useEffect(() => {
    setPendingSparkles((prev) => {
      if (Object.keys(prev).length === 0) return prev
      let changed = false
      const next = { ...prev }
      for (const t of tributes) {
        const floor = next[t.recordId]
        if (floor !== undefined && (t.data.sparkles ?? 0) >= floor) {
          delete next[t.recordId]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tributes])

  // Hidden tributes only render for moderators (dimmed, tagged) — see design
  // notes. The server already withholds them from everyone else's
  // subscription except the author's own (owner-or-published read rule);
  // this filter keeps a hidden tribute out of its own author's wall view too.
  const visible = tributes
    .filter((t) => isModerator || !t.data.hidden)
    .sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))

  function openComposer() {
    if (!isSignedIn) {
      setShowAuthModal(true)
      return
    }
    setShowComposer(true)
  }

  async function handleSparkle(t: RecordData<Tribute>) {
    if (!isSignedIn) {
      setShowAuthModal(true)
      return
    }
    setSparkledIds((prev) => (prev.has(t.recordId) ? prev : new Set(prev).add(t.recordId)))
    if (pendingSparkles[t.recordId] !== undefined) return
    const target = (t.data.sparkles ?? 0) + 1
    setPendingSparkles((prev) => ({ ...prev, [t.recordId]: target }))
    const res = await callAction('addSparkle', { tributeId: t.recordId })
    if (!res.success) {
      setPendingSparkles((prev) => {
        const next = { ...prev }
        delete next[t.recordId]
        return next
      })
      error('Could not send sparkle', res.error)
    }
  }

  return (
    <div className="min-h-full" style={{ color: INK }}>
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-10">
        <header className="animate-fade-up text-center">
          <h1 className="font-serif text-[32px] font-bold sm:text-[40px]">
            <span style={{ color: GOLD, fontSize: '0.6em' }} aria-hidden>
              ✦
            </span>{' '}
            Tribute <span style={{ color: PINK }}>Wall</span>{' '}
            <span style={{ color: GOLD, fontSize: '0.6em' }} aria-hidden>
              ✦
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-[520px] text-[15px]" style={{ color: MUTED }}>
            Real memories, from real hearts — honoring the woman who showed us kindness,
            strength, and sparkle.
          </p>

          <div className="mx-auto mt-6 flex max-w-[420px] items-center gap-3">
            <span className="h-0 flex-1 border-t-2 border-dotted" style={{ borderColor: BORDER }} />
            <span style={{ color: PINK }} aria-hidden>
              ♥
            </span>
            <span className="h-0 flex-1 border-t-2 border-dotted" style={{ borderColor: BORDER }} />
          </div>

          <div className="mt-6">
            <Button
              onClick={openComposer}
              className="min-h-11 rounded-full border px-6 font-semibold"
              style={GOLD_BUTTON_STYLE}
            >
              ✦ Leave a tribute
            </Button>
          </div>

          {isLoaded && !isSignedIn && (
            <p className="mt-3 text-sm" style={{ color: MUTED }}>
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="font-medium underline underline-offset-2"
                style={{ color: INK }}
              >
                Sign in to leave a tribute
              </button>{' '}
              — The wall stays kind — every note has a name.
            </p>
          )}
        </header>

        {status === 'loading' ? (
          <p className="py-12 text-center text-sm" style={{ color: MUTED }}>
            Loading tributes…
          </p>
        ) : visible.length === 0 ? (
          <EmptyWallCard onWrite={openComposer} />
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {visible.map((t, i) => (
              <TributeCard
                key={t.recordId}
                tribute={t}
                index={i}
                isOwner={isSignedIn && userId === t.createdBy}
                isModerator={isModerator}
                pendingFloor={pendingSparkles[t.recordId]}
                sparkledByMe={sparkledIds.has(t.recordId)}
                onSparkle={() => handleSparkle(t)}
                onSave={(patch) => put(t.recordId, patch)}
                onDelete={() => remove(t.recordId)}
                onToggleHidden={() => put(t.recordId, { hidden: !t.data.hidden })}
                onTogglePinned={() => put(t.recordId, { pinned: !t.data.pinned })}
              />
            ))}
          </div>
        )}
      </div>

      {showComposer && (
        <ComposerModal
          open={showComposer}
          onClose={() => setShowComposer(false)}
          authorName={authorName}
          ready={ready}
          onSubmit={async ({ body, place, year }) => {
            // authorId is userBound: the worker stamps it from the JWT on
            // create — sending it trips the writableFields check (B2).
            await create({ authorName, body, place, year })
            success('Tribute posted')
          }}
        />
      )}

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

function EmptyWallCard({ onWrite }: { onWrite: () => void }) {
  return (
    <div
      className="mx-auto mt-10 max-w-md animate-fade-up rounded-2xl border p-10 text-center"
      style={{ background: CREAM_GOLD, borderColor: BORDER }}
    >
      <div className="text-[34px]" aria-hidden>
        🦋
      </div>
      <h3 className="mt-3 font-serif text-xl font-bold" style={{ color: INK }}>
        The wall is waiting for its first note
      </h3>
      <p className="mt-1 text-sm" style={{ color: MUTED }}>
        Be the one who starts the guest book.
      </p>
      <Button
        onClick={onWrite}
        variant="outline"
        className="mt-5 rounded-full bg-transparent font-semibold"
        style={{ borderColor: GOLD, color: GOLD }}
      >
        Write the first tribute
      </Button>
    </div>
  )
}

function ComposerModal({
  open,
  onClose,
  authorName,
  ready,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  authorName: string
  ready: boolean
  onSubmit: (fields: { body: string; place?: string; year?: string }) => Promise<void>
}) {
  const [placeYear, setPlaceYear] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Synchronous re-entrancy guard (B4): two native clicks in the same JS
  // tick both fire before React commits setSubmitting(true), so the
  // disabled prop alone can't stop a double post. A ref flips instantly.
  const submittingRef = useRef(false)
  const { error } = useToast()

  async function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed) return
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const { place, year } = parsePlaceYear(placeYear)
      await onSubmit({ body: trimmed, place, year })
      onClose()
    } catch (e) {
      error('Could not post tribute', String(e))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      className="rounded-[18px] p-6"
      style={{ backgroundImage: 'linear-gradient(170deg,#FDF6F0,#FFF9E8)', borderColor: BORDER }}
    >
      <Modal.Header>
        <Modal.Title className="font-serif text-[22px] font-bold text-[#3D2B2E]">
          Leave a tribute
        </Modal.Title>
        <Modal.Description className="text-[#8A6F73]">Signing as {authorName}</Modal.Description>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-3">
          <Input
            value={placeYear}
            onChange={(e) => setPlaceYear(e.target.value)}
            placeholder="e.g. Knoxville, 2003"
            className="min-h-11 rounded-[10px]"
            style={FIELD_STYLE}
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={BODY_MAX_LENGTH}
            rows={4}
            placeholder="What she means to you…"
            className="rounded-[10px]"
            style={FIELD_STYLE}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="rounded-full bg-transparent"
          style={{ borderColor: MUTED, color: MUTED }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={!ready || !body.trim()}
          className="rounded-full border font-semibold"
          style={GOLD_BUTTON_STYLE}
        >
          Post to the Wall ✦
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

function SparkleButton({
  count,
  sparkled,
  onClick,
}: {
  count: number
  sparkled: boolean
  onClick: () => void
}) {
  const [popping, setPopping] = useState(false)

  function handleClick() {
    setPopping(true)
    onClick()
    window.setTimeout(() => setPopping(false), 350)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors',
        popping && 'animate-sparkle-pop',
      )}
      style={
        sparkled
          ? { borderColor: PINK, color: PINK, background: BLUSH }
          : { borderColor: BORDER, color: MUTED, background: 'rgba(253,246,240,0.6)' }
      }
    >
      ✦ {count}
    </button>
  )
}

function TributeCard({
  tribute,
  index,
  isOwner,
  isModerator,
  pendingFloor,
  sparkledByMe,
  onSparkle,
  onSave,
  onDelete,
  onToggleHidden,
  onTogglePinned,
}: {
  tribute: RecordData<Tribute>
  index: number
  isOwner: boolean
  isModerator: boolean
  pendingFloor?: number
  sparkledByMe: boolean
  onSparkle: () => void
  onSave: (patch: Partial<Tribute>) => Promise<void>
  onDelete: () => Promise<void>
  onToggleHidden: () => void
  onTogglePinned: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [body, setBody] = useState(tribute.data.body)
  const [place, setPlace] = useState(tribute.data.place ?? '')
  const [year, setYear] = useState(tribute.data.year ?? '')
  const [saving, setSaving] = useState(false)

  const sparkleCount = Math.max(tribute.data.sparkles ?? 0, pendingFloor ?? 0)
  const hidden = Boolean(tribute.data.hidden)
  const pinned = Boolean(tribute.data.pinned)

  async function handleSave() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onSave({ body: trimmed, place: place.trim() || undefined, year: year.trim() || undefined })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const cardStyle: CSSProperties = pinned
    ? { backgroundImage: 'linear-gradient(160deg,#FFF9E8,#FBEAEE)', borderColor: GOLD }
    : { background: index % 2 === 0 ? BLUSH : CREAM_GOLD, borderColor: BORDER }

  return (
    <div
      className={cn(
        'animate-fade-up rounded-2xl border p-4 sm:p-[18px]',
        pinned && 'md:col-span-2',
        hidden && 'opacity-50',
      )}
      style={cardStyle}
    >
      <div className="flex items-start gap-3">
        <Avatar
          className="h-10 w-10 border"
          style={{ backgroundImage: 'linear-gradient(135deg,#FBEAEE,#EDD9C8)', borderColor: BORDER }}
        >
          <AvatarFallback className="bg-transparent font-serif text-[15px] font-bold" style={{ color: GOLD }}>
            {initials(tribute.data.authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold" style={{ color: INK }}>
              {tribute.data.authorName}
            </span>
            {(tribute.data.place || tribute.data.year) && (
              <span className="text-[13px]" style={{ color: MUTED }}>
                <span style={{ color: PINK }} aria-hidden>
                  ⚲
                </span>{' '}
                {[tribute.data.place, tribute.data.year].filter(Boolean).join(', ')}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {pinned && (
                <Badge
                  variant="outline"
                  className="rounded-full border font-semibold"
                  style={{ borderColor: GOLD, color: GOLD, background: CREAM_GOLD }}
                >
                  ✦ Pinned
                </Badge>
              )}
              {hidden && (
                <Badge
                  variant="outline"
                  className="rounded-full border border-dashed"
                  style={{ borderColor: MUTED, color: MUTED, background: 'transparent' }}
                >
                  hidden
                </Badge>
              )}
            </div>
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX_LENGTH}
                rows={3}
                className="rounded-[10px]"
                style={FIELD_STYLE}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Place (optional)"
                  className="max-w-[160px] rounded-[10px]"
                  style={FIELD_STYLE}
                />
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Year (optional)"
                  className="max-w-[100px] rounded-[10px]"
                  style={FIELD_STYLE}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  loading={saving}
                  className="rounded-full border font-semibold"
                  style={GOLD_BUTTON_STYLE}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  style={{ color: MUTED }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-[1.55]" style={{ color: INK }}>
              {tribute.data.body}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-[13px]" style={{ color: MUTED }}>
              {formatMessageTime(tribute.createdAt)}
            </span>
            <div className="flex-1" />
            <SparkleButton count={sparkleCount} sparkled={sparkledByMe} onClick={onSparkle} />
          </div>

          {!editing && (isOwner || isModerator) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: MUTED }}>
              {isOwner && (
                <>
                  <button type="button" onClick={() => setEditing(true)} className="hover:underline" style={{ color: MUTED }}>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="hover:underline"
                    style={{ color: MUTED }}
                  >
                    Delete
                  </button>
                </>
              )}
              {isModerator && (
                <>
                  <button type="button" onClick={onToggleHidden} className="hover:underline" style={{ color: MUTED }}>
                    {hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button type="button" onClick={onTogglePinned} className="hover:underline" style={{ color: MUTED }}>
                    {pinned ? 'Unpin' : 'Pin'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={async () => {
          await onDelete()
          setConfirmingDelete(false)
        }}
        title="Delete this tribute?"
        description="This can't be undone."
        confirmText="Delete"
      />
    </div>
  )
}

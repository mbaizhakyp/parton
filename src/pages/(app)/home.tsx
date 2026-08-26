/**
 * The tribute wall (F1) — the app's main surface, at the default `/home`
 * route. Lives in the `(app)/` tier (dynamic, signed-out capable): the
 * tributes schema grants the `'*'` wildcard role `read: 'published'`, so
 * signed-out visitors see the wall too. Posting, sparkling, editing/deleting
 * your own tribute, and moderator hide/pin all require sign-in — see
 * docs/design.md for the card spec and docs/requirements.md F1 for the
 * acceptance criteria.
 *
 * Real-time: `useQuery` streams every create/update/delete over the tributes
 * WebSocket subscription, so new tributes and sparkle counts appear on every
 * open client without a refresh.
 */

import { useEffect, useState } from 'react'
import {
  useAuthProfileReady,
  useMutations,
  useQuery,
  getAuthToken,
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
  EmptyState,
  Input,
  Textarea,
  useToast,
} from '@/components/ui'

const BODY_MAX_LENGTH = 500

interface Tribute {
  authorId: string
  authorName: string
  body: string
  place?: string
  year?: string
  sparkles?: number
  hidden?: boolean
  pinned?: boolean
}

/** Same shape as the docs' `callAction` example (server-actions guide). */
async function callAction(
  name: string,
  params: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = await getAuthToken()
  const res = await fetch(`/api/actions/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  })
  return res.json()
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
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
  // recordId -> sparkle count the UI should show at least, until the real
  // (server-broadcast) value catches up. See addSparkle in src/actions.
  const [pendingSparkles, setPendingSparkles] = useState<Record<string, number>>({})

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const isModerator = profileReady && (user?.role === 'moderator' || user?.role === 'admin')
  const authorName = user?.name || user?.email || 'A fan'

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

  // Hidden tributes only render for moderators (dimmed, tagged) — see
  // docs/design.md. The server already withholds them from everyone else's
  // subscription except the author's own (owner-or-published read rule); this
  // filter keeps a hidden tribute out of its own author's wall view too.
  const visible = tributes
    .filter((t) => isModerator || !t.data.hidden)
    .sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned))

  async function handleSparkle(t: RecordData<Tribute>) {
    if (!isSignedIn) {
      setShowAuthModal(true)
      return
    }
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
    <div className="mx-auto min-h-full max-w-2xl px-4 py-8 text-foreground">
      <header className="mb-6 text-center">
        <h1 className="font-serif text-3xl font-bold">Forever Dolly</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tributes from fans, for Dolly.</p>
      </header>

      {isLoaded && isSignedIn && profileReady && (
        <PostForm
          ready={ready}
          onSubmit={async ({ body, place, year }) => {
            await create({ authorId: userId ?? '', authorName, body, place, year })
            success('Tribute posted')
          }}
        />
      )}

      {isLoaded && !isSignedIn && (
        <div className="mb-6 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <button
            type="button"
            className="font-medium text-foreground underline"
            onClick={() => setShowAuthModal(true)}
          >
            Sign in
          </button>{' '}
          to leave your own tribute.
        </div>
      )}

      {status === 'loading' ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading tributes…</p>
      ) : visible.length === 0 ? (
        <EmptyState title="No tributes yet" description="Be the first to share a memory of Dolly." />
      ) : (
        <div className="space-y-4">
          {visible.map((t) => (
            <TributeCard
              key={t.recordId}
              tribute={t}
              isOwner={isSignedIn && userId === t.createdBy}
              isModerator={isModerator}
              pendingFloor={pendingSparkles[t.recordId]}
              onSparkle={() => handleSparkle(t)}
              onSave={(patch) => put(t.recordId, patch)}
              onDelete={() => remove(t.recordId)}
              onToggleHidden={() => put(t.recordId, { hidden: !t.data.hidden })}
              onTogglePinned={() => put(t.recordId, { pinned: !t.data.pinned })}
            />
          ))}
        </div>
      )}

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        <p>An unofficial fan project. Made with ♥ for Dolly.</p>
        <p className="mt-1">Not affiliated with or endorsed by Dolly Parton or her estate.</p>
      </footer>
    </div>
  )
}

function PostForm({
  ready,
  onSubmit,
}: {
  ready: boolean
  onSubmit: (fields: { body: string; place?: string; year?: string }) => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [place, setPlace] = useState('')
  const [year, setYear] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { error } = useToast()

  async function handleSubmit() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await onSubmit({
        body: trimmed,
        place: place.trim() || undefined,
        year: year.trim() || undefined,
      })
      setBody('')
      setPlace('')
      setYear('')
    } catch (e) {
      error('Could not post tribute', String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={BODY_MAX_LENGTH}
        rows={3}
        placeholder="Share a memory of Dolly…"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Place (optional)"
          className="max-w-[160px]"
        />
        <Input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year (optional)"
          className="max-w-[100px]"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {body.length}/{BODY_MAX_LENGTH}
        </span>
        <Button onClick={handleSubmit} disabled={!ready || !body.trim()} loading={submitting}>
          Post tribute
        </Button>
      </div>
    </div>
  )
}

function TributeCard({
  tribute,
  isOwner,
  isModerator,
  pendingFloor,
  onSparkle,
  onSave,
  onDelete,
  onToggleHidden,
  onTogglePinned,
}: {
  tribute: RecordData<Tribute>
  isOwner: boolean
  isModerator: boolean
  pendingFloor?: number
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

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 shadow-sm',
        pinned ? 'border-2 border-accent' : 'border-border',
        hidden && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarFallback>{initials(tribute.data.authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{tribute.data.authorName}</span>
            {(tribute.data.place || tribute.data.year) && (
              <span className="text-xs text-muted-foreground">
                {[tribute.data.place, tribute.data.year].filter(Boolean).join(', ')}
              </span>
            )}
            {pinned && (
              <Badge variant="outline" className="border-accent text-accent">
                ✦ Pinned
              </Badge>
            )}
            {hidden && <Badge variant="secondary">hidden</Badge>}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX_LENGTH}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Input
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Place (optional)"
                  className="max-w-[160px]"
                />
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Year (optional)"
                  className="max-w-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} loading={saving}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{tribute.data.body}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{formatMessageTime(tribute.createdAt)}</span>
            <button
              type="button"
              onClick={onSparkle}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 hover:bg-accent/10 hover:text-foreground"
            >
              ✦ {sparkleCount}
            </button>
            {!editing && isOwner && (
              <>
                <button type="button" onClick={() => setEditing(true)} className="hover:text-foreground">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="hover:text-destructive"
                >
                  Delete
                </button>
              </>
            )}
            {isModerator && (
              <>
                <button type="button" onClick={onToggleHidden} className="hover:text-foreground">
                  {hidden ? 'Unhide' : 'Hide'}
                </button>
                <button type="button" onClick={onTogglePinned} className="hover:text-foreground">
                  {pinned ? 'Unpin' : 'Pin'}
                </button>
              </>
            )}
          </div>
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

/**
 * /admin — the owner's dashboard (admin role only; see ensureAdmin in
 * src/actions). One page, four stacked sections: overview tiles, signups,
 * every post (hidden included) with hide/pin/DELETE, and the reviewable
 * client-error log. Same product language as the rest of the site, denser.
 *
 * All moderation goes through the admin's own RBAC (admin has full access on
 * tributes/users/client_errors) via useMutations — no bespoke endpoints.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useAuthProfileReady,
  useMutations,
  usePresenceRoom,
  useQuery,
  formatMessageTime,
  type RecordData,
} from 'deepspace'
import { Badge, Button, ConfirmModal, useToast } from '@/components/ui'
import { SCOPE_ID } from '../../../constants'

const INK = '#3D2B2E'
const MUTED = '#8A6F73'
const GOLD = '#C9922A'
const PINK = '#D4497A'
const BORDER = '#EDD9C8'
const CREAM_GOLD = '#FFF9E8'

interface Tribute {
  authorId?: string
  authorName: string
  body: string
  place?: string
  year?: string
  sparkles?: number
  hidden?: boolean
  pinned?: boolean
}

interface AppUser {
  email?: string
  name?: string
  role?: string
  createdAt?: string
}

interface ClientError {
  userId?: string
  userName?: string
  message: string
  stack?: string
  context?: string
  userAgent?: string
  status?: string
}

interface AiChat {
  userId: string
  title?: string
}

interface AiMessagePart {
  type: string
  text?: string
}

interface AiMessage {
  chatId: string
  userId: string
  role: string
  content?: string
  parts?: AiMessagePart[]
}

export default function AdminPage() {
  const { user, userLoading } = useAuthProfileReady({ requireUser: true })
  const isAdmin = !userLoading && user?.role === 'admin'

  // Hooks above any conditional return (rules of hooks). Non-admins get
  // permission-scoped results anyway (own rows / nothing) — the guard below
  // is UX, the server is the boundary.
  const { records: users } = useQuery<AppUser>('users', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: tributes } = useQuery<Tribute>('tributes', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: scores } = useQuery<{ score: number }>('scores', {})
  const { records: errors } = useQuery<ClientError>('client_errors', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: chats } = useQuery<AiChat>('ai-chats', { orderBy: 'createdAt', orderDir: 'desc' })
  const { records: chatMessages } = useQuery<AiMessage>('ai-messages', { orderBy: 'createdAt', orderDir: 'asc' })
  const { peers } = usePresenceRoom(`${SCOPE_ID}:presence`)

  if (userLoading) return null
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center" style={{ color: INK }}>
        <div className="text-3xl" aria-hidden>🦋</div>
        <h1 className="mt-3 font-serif text-2xl font-bold">Nothing to see here</h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          This page is for the site owner.
        </p>
        <Link to="/home" className="mt-4 inline-block underline" style={{ color: GOLD }}>
          Back to the Wall
        </Link>
      </div>
    )
  }

  const newErrors = errors.filter((e) => (e.data.status ?? 'new') === 'new')
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-10" style={{ color: INK }} data-testid="admin-page">
      <h1 className="font-serif text-3xl font-bold">
        <span style={{ color: GOLD }} aria-hidden>✦</span> Admin
      </h1>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="admin-tiles">
        {[
          ['Fans', users.length],
          ['Tributes', tributes.length],
          ['Quiz plays', scores.length],
          ['Here now', peers.length + 1],
          ['New errors', newErrors.length],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border p-4 text-center"
            style={{ borderColor: BORDER, background: CREAM_GOLD }}
          >
            <div className="font-serif text-2xl font-bold">{value}</div>
            <div className="text-xs" style={{ color: MUTED }}>{label}</div>
          </div>
        ))}
      </section>

      <SignupsSection users={users} />
      <PostsSection tributes={tributes} />
      <ErrorsSection errors={errors} newCount={newErrors.length} />
      <ChatsSection chats={chats} messages={chatMessages} users={users} />
    </div>
  )
}

function SectionHeader({ title, badge }: { title: string; badge?: number }) {
  return (
    <h2 className="mt-10 flex items-center gap-2 font-serif text-xl font-bold">
      <span style={{ color: GOLD }} aria-hidden>✦</span> {title}
      {badge !== undefined && badge > 0 && (
        <Badge style={{ background: PINK, color: CREAM_GOLD }}>{badge}</Badge>
      )}
    </h2>
  )
}

function SignupsSection({ users }: { users: RecordData<AppUser>[] }) {
  return (
    <section data-testid="admin-signups">
      <SectionHeader title="Signups" />
      <div className="mt-3 overflow-x-auto rounded-2xl border" style={{ borderColor: BORDER }}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ color: MUTED, background: CREAM_GOLD }}>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.recordId} className="border-t" style={{ borderColor: BORDER }}>
                <td className="px-4 py-2">{u.data.name || '—'}</td>
                <td className="px-4 py-2">{u.data.email || '—'}</td>
                <td className="px-4 py-2">{u.data.role || 'member'}</td>
                <td className="px-4 py-2" style={{ color: MUTED }}>
                  {u.data.createdAt ? formatMessageTime(u.data.createdAt) : '—'}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td className="px-4 py-3" colSpan={4} style={{ color: MUTED }}>No signups yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PostsSection({ tributes }: { tributes: RecordData<Tribute>[] }) {
  const { put, remove } = useMutations<Tribute>('tributes')
  const { success, error } = useToast()
  const [confirmDelete, setConfirmDelete] = useState<RecordData<Tribute> | null>(null)

  return (
    <section data-testid="admin-posts">
      <SectionHeader title="Posts" />
      <div className="mt-3 space-y-2">
        {tributes.map((t) => (
          <div
            key={t.recordId}
            className="rounded-2xl border p-3"
            style={{ borderColor: BORDER, background: t.data.hidden ? '#FDF6F0' : CREAM_GOLD, opacity: t.data.hidden ? 0.7 : 1 }}
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{t.data.authorName}</strong>
              {t.data.pinned && <Badge style={{ borderColor: GOLD, color: GOLD, background: 'transparent' }}>✦ Pinned</Badge>}
              {t.data.hidden && <Badge style={{ borderColor: MUTED, color: MUTED, background: 'transparent' }}>hidden</Badge>}
              <span style={{ color: MUTED }}>✦ {t.data.sparkles ?? 0}</span>
              <span className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={() => put(t.recordId, { hidden: !t.data.hidden })}>
                  {t.data.hidden ? 'Unhide' : 'Hide'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => put(t.recordId, { pinned: !t.data.pinned })}>
                  {t.data.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ color: PINK, borderColor: PINK }}
                  onClick={() => setConfirmDelete(t)}
                >
                  Delete
                </Button>
              </span>
            </div>
            <p className="mt-1 text-sm">{t.data.body}</p>
          </div>
        ))}
        {tributes.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No posts yet.</p>}
      </div>

      {confirmDelete && (
        <ConfirmModal
          open
          title="Delete this tribute?"
          description={`"${confirmDelete.data.body.slice(0, 80)}" — this removes it for everyone, forever.`}
          confirmText="Delete"
          variant="destructive"
          onConfirm={async () => {
            try {
              await remove(confirmDelete.recordId)
              success('Tribute deleted')
            } catch (e) {
              error('Could not delete', String(e))
            }
            setConfirmDelete(null)
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </section>
  )
}

function ErrorsSection({ errors, newCount }: { errors: RecordData<ClientError>[]; newCount: number }) {
  const { put } = useMutations<ClientError>('client_errors')
  const [expanded, setExpanded] = useState<string | null>(null)
  // new first, then reviewed, then fixed; each group newest-first (input order)
  const ordered = useMemo(() => {
    const rank: Record<string, number> = { new: 0, reviewed: 1, fixed: 2 }
    return [...errors].sort(
      (a, b) => (rank[a.data.status ?? 'new'] ?? 0) - (rank[b.data.status ?? 'new'] ?? 0),
    )
  }, [errors])

  return (
    <section data-testid="admin-errors">
      <SectionHeader title="Error log" badge={newCount} />
      <div className="mt-3 space-y-2">
        {ordered.map((e) => {
          const status = e.data.status ?? 'new'
          const hasDetails = Boolean(e.data.stack || e.data.userAgent)
          return (
            <div key={e.recordId} className="rounded-2xl border p-3 text-sm" style={{ borderColor: BORDER }}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  style={
                    status === 'new'
                      ? { background: PINK, color: CREAM_GOLD }
                      : status === 'reviewed'
                        ? { background: GOLD, color: CREAM_GOLD }
                        : { background: 'transparent', color: MUTED, borderColor: BORDER }
                  }
                >
                  {status}
                </Badge>
                <strong>{e.data.userName || 'Unknown fan'}</strong>
                <span style={{ color: MUTED }}>{e.data.context}</span>
                <span className="ml-auto" style={{ color: MUTED }}>
                  {formatMessageTime(e.createdAt)}
                </span>
              </div>
              <p className="mt-1 break-words">{e.data.message}</p>
              <div className="mt-2 flex gap-2">
                {hasDetails && (
                  <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === e.recordId ? null : e.recordId)}>
                    {expanded === e.recordId ? 'Hide details' : 'Details'}
                  </Button>
                )}
                {status !== 'reviewed' && status !== 'fixed' && (
                  <Button size="sm" variant="outline" onClick={() => put(e.recordId, { status: 'reviewed' })}>
                    Mark reviewed
                  </Button>
                )}
                {status !== 'fixed' && (
                  <Button size="sm" variant="outline" onClick={() => put(e.recordId, { status: 'fixed' })}>
                    Mark fixed
                  </Button>
                )}
              </div>
              {expanded === e.recordId && hasDetails && (
                <div className="mt-2 space-y-2">
                  {e.data.stack && (
                    <pre className="overflow-x-auto rounded-lg p-2 text-xs" style={{ background: '#FDF6F0', color: MUTED }}>
                      {e.data.stack}
                    </pre>
                  )}
                  {e.data.userAgent && (
                    <p className="break-words text-xs" style={{ color: MUTED }}>
                      {e.data.userAgent}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {errors.length === 0 && (
          <p className="text-sm" style={{ color: MUTED }}>No errors logged — long may it last. ✦</p>
        )}
      </div>
    </section>
  )
}

function ChatsSection({
  chats,
  messages,
  users,
}: {
  chats: RecordData<AiChat>[]
  messages: RecordData<AiMessage>[]
  users: RecordData<AppUser>[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const nameFor = (userId: string) => users.find((u) => u.recordId === userId)?.data.name || 'A Dolly Fan'
  const ordered = useMemo(
    () => [...chats].sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()),
    [chats],
  )

  return (
    <section data-testid="admin-chats">
      <SectionHeader title="Ask Dolly transcripts" />
      <div className="mt-3 space-y-2">
        {ordered.map((c) => {
          const chatMessages = messages
            .filter((m) => m.data.chatId === c.recordId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          return (
            <div key={c.recordId} className="rounded-2xl border p-3 text-sm" style={{ borderColor: BORDER }}>
              <button
                type="button"
                onClick={() => setExpanded(expanded === c.recordId ? null : c.recordId)}
                className="flex w-full flex-wrap items-center gap-2 text-left"
              >
                <strong>{c.data.title || 'Untitled chat'}</strong>
                <span style={{ color: MUTED }}>{nameFor(c.data.userId)}</span>
                <span style={{ color: MUTED }}>{chatMessages.length} messages</span>
                <span className="ml-auto" style={{ color: MUTED }}>
                  {formatMessageTime(c.updatedAt ?? c.createdAt)}
                </span>
              </button>
              {expanded === c.recordId && (
                <div className="mt-2 space-y-2 border-t pt-2" style={{ borderColor: BORDER }}>
                  {chatMessages
                    .filter((m) => m.data.role === 'user' || m.data.role === 'assistant')
                    .map((m) => {
                      const text =
                        m.data.content || (m.data.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('')
                      return (
                        <p key={m.recordId} className="whitespace-pre-wrap break-words">
                          <strong>{m.data.role === 'user' ? 'Fan' : 'Dolly assistant'}:</strong> {text}
                        </p>
                      )
                    })}
                  {chatMessages.length === 0 && <p style={{ color: MUTED }}>No messages.</p>}
                </div>
              )}
            </div>
          )
        })}
        {chats.length === 0 && <p className="text-sm" style={{ color: MUTED }}>No conversations yet.</p>}
      </div>
    </section>
  )
}

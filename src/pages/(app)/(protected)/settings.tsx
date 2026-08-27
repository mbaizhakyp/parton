/**
 * /settings — account page. No auth logic here; (protected)/_layout.tsx
 * wraps the subtree in <AuthGate>. The display name is the one field a user
 * can change — it's what the wall bylines and the quiz leaderboard show, so
 * it doubles as the privacy control: set a nickname and your real name
 * appears nowhere public. The rename goes through the setDisplayName action
 * (users.name is system-assigned; direct client writes are refused).
 */

import { useState } from 'react'
import { signOut, useAuthProfileReady, useQuery } from 'deepspace'
import { Button, Input, useToast } from '@/components/ui'
import { callAction } from '../../../lib/callAction'

export default function SettingsPage() {
  const { userId, user } = useAuthProfileReady({ requireUser: true })
  // Own profiles row (read: 'own'); admins see every row, so find by id.
  const { records: profileRows } = useQuery<{ displayName?: string }>('profiles', {})
  const { success, error } = useToast()
  const [name, setName] = useState<string | null>(null) // null = untouched
  const [saving, setSaving] = useState(false)

  const current = profileRows.find((r) => r.recordId === userId)?.data.displayName || user?.name || ''
  const draft = name ?? current
  // Touched + non-empty is enough (re-saving the same name is allowed — it
  // re-propagates to the leaderboard and past posts, which is harmless).
  const dirty = name !== null && name.trim() !== ''

  async function save() {
    if (!dirty) return
    setSaving(true)
    try {
      const res = await callAction('setDisplayName', { name: draft.trim() })
      if (!res.success) throw new Error(res.error || 'Save failed')
      setName(null)
      success('Name updated', 'Your posts and leaderboard entry now use it everywhere.')
    } catch (e) {
      error('Could not save', e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="mb-12 font-serif text-4xl font-bold tracking-tight">Settings</h1>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Your account</h2>

          <dl className="space-y-4 text-sm">
            <div>
              <dt className="mb-1 text-muted-foreground">
                Display name <span className="text-xs">— shown on the wall and leaderboard</span>
              </dt>
              <dd className="flex items-center gap-2">
                <Input
                  value={draft}
                  maxLength={60}
                  placeholder="A Dolly Fan"
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-xs"
                />
                <Button size="sm" disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email <span className="text-xs">— never shown publicly</span></dt>
              <dd className="text-foreground">{user?.email ?? '—'}</dd>
            </div>
          </dl>

          <Button variant="secondary" className="mt-6" onClick={() => signOut()}>
            Sign out
          </Button>
        </section>
      </div>
    </div>
  )
}

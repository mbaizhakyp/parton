/**
 * Ask Dolly — the "Ask Dolly" page from the Forever Dolly design spec
 * (references/design/forever-dolly-app-notes.md, "Ask Dolly" section).
 *
 * Deliberately simple: a centered heading + one chat card, not the platform
 * scaffold's app-shell/history/model-picker layout. (protected)/_layout.tsx
 * already gates sign-in, so there's no auth branch here.
 *
 * F3 asks for "persistent history" but the design shows a single chat card
 * with no history browser — so instead of the scaffold's multi-chat sidebar,
 * this page just remembers ONE ongoing conversation per user (its id, in
 * localStorage) and keeps reopening it. `chatId={null}` on first-ever visit
 * lets ChatPanel auto-create that chat; `onChatCreated` captures its id.
 */

import { useState } from 'react'
import { useAuth } from 'deepspace'
import { ChatPanel } from '../../../components/ChatPanel'

const TRY_PROMPTS = [
  'What inspired Jolene?',
  'Tell me about the Imagination Library',
  'What was her childhood like?',
]

function chatIdStorageKey(userId: string): string {
  return `ask-dolly-chat-id:${userId}`
}

function loadChatId(userId: string): string | null {
  try {
    return localStorage.getItem(chatIdStorageKey(userId))
  } catch {
    return null
  }
}

export default function AskDollyPage() {
  const { userId } = useAuth()
  // ProtectedLayout only renders this subtree once signed in — userId should
  // always be set by the time we get here.
  if (!userId) return null

  return <AskDollyChatCard userId={userId} />
}

function AskDollyChatCard({ userId }: { userId: string }) {
  const [chatId, setChatId] = useState<string | null>(() => loadChatId(userId))

  function handleChatCreated(id: string) {
    setChatId(id)
    try {
      localStorage.setItem(chatIdStorageKey(userId), id)
    } catch {
      // Storage can be unavailable in privacy modes; the chat still works,
      // it just won't survive a reload.
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[680px] flex-col items-center gap-3 px-6 py-16 text-center">
      <h1 className="font-serif text-[34px] font-bold" style={{ color: '#D4497A' }}>
        <span style={{ color: '#C9922A' }}>✦</span> Ask about Dolly{' '}
        <span style={{ color: '#C9922A' }}>✦</span>
      </h1>
      <p className="max-w-md text-[15px]" style={{ color: '#8A6F73' }}>
        Curious about her songs, life, or legacy? Ask anything — it speaks about Dolly, never as her.
      </p>

      <div
        className="mt-4 h-[520px] w-full overflow-hidden rounded-[18px] border"
        style={{ background: 'linear-gradient(170deg, #FBEAEE, #FFF9E8 30%)', borderColor: '#EDD9C8' }}
      >
        <ChatPanel
          chatId={chatId}
          userId={userId}
          onChatCreated={handleChatCreated}
          emptyStatePrompts={TRY_PROMPTS}
          className="!bg-transparent"
          compact
        />
      </div>
    </div>
  )
}

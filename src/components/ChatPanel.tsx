/**
 * DO-backed AI chat surface.
 *
 * Pass `chatId={null}` to create a chat on first send. The panel keeps the
 * created id itself; `onChatCreated` merely notifies, and a parent-passed
 * `chatId` — including a change back to null for "new chat" — always wins.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { AlertCircle } from 'lucide-react'
import { useQuery } from 'deepspace'
import { EmptyState, MessageTurn, ThinkingIndicator } from './ChatPanel.messages'
import { useStreamingChat } from './ChatPanel.stream'

type AiMessageData = {
  chatId: string
  userId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: unknown[]
}

type RenderMessage = {
  id: string
  role: AiMessageData['role']
  content: string
  parts?: unknown[]
}

export type ChatPanelProps = {
  /** Active chat. `null` creates one on first send and the panel keeps it — a never-passed `chatId` means one chat per mount; remount with `key` for a new one. */
  chatId: string | null
  /** Current user id; scopes the messages query as defense in depth. */
  userId: string
  /** Notified with the id when the panel creates a chat on first send. */
  onChatCreated?: (chatId: string) => void
  /** Clickable prompts shown when the conversation is empty; sent immediately on click. */
  emptyStatePrompts?: string[]
  /** Applied to the outer container. */
  className?: string
  /** Optional content rendered above the messages. */
  header?: ReactNode
  /** Tighter spacing for narrow containers. */
  compact?: boolean
  /** Suspends send while a parent-owned create is in flight. */
  disabled?: boolean
}

// No model picker — this app always sends with the worker's default model.
const DEFAULT_PROMPTS = [
  'What inspired Jolene?',
  'Tell me about the Imagination Library',
  'What was her childhood like?',
]

export function ChatPanel({
  chatId,
  userId,
  onChatCreated,
  emptyStatePrompts = DEFAULT_PROMPTS,
  className,
  header,
  compact = false,
  disabled = false,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stickToBottomRef = useRef(true)
  const [input, setInput] = useState('')

  // Uncontrolled fallback: with `chatId={null}` the panel keeps the chat it
  // auto-creates on first send, so the overlay, the messages query, and later
  // sends all target that chat. Any prop change — including back to null,
  // which means "new chat" — takes precedence and clears it.
  const [ownChatId, setOwnChatId] = useState<string | null>(null)
  const [seenChatId, setSeenChatId] = useState(chatId)
  if (seenChatId !== chatId) {
    setSeenChatId(chatId)
    setOwnChatId(null)
  }
  const activeChatId = chatId ?? ownChatId

  const handleChatCreated = useCallback(
    (id: string) => {
      setOwnChatId(id)
      onChatCreated?.(id)
    },
    [onChatCreated],
  )

  const { send, stop, retry, isLoading, error, inFlight } = useStreamingChat({
    chatId: activeChatId,
    onChatCreated: handleChatCreated,
  })

  const queryWhere = useMemo(
    () => ({ chatId: activeChatId ?? '__none__', userId }),
    [activeChatId, userId],
  )
  const { records } = useQuery<AiMessageData>('ai-messages', {
    where: queryWhere,
    orderBy: 'createdAt',
    orderDir: 'asc',
  })
  const persisted = useMemo<RenderMessage[]>(
    () => records.map((record) => ({
      id: record.recordId,
      role: record.data.role,
      content: record.data.content ?? '',
      parts: record.data.parts,
    })),
    [records],
  )
  const persistedIds = useMemo(
    () => new Set(persisted.map((message) => message.id)),
    [persisted],
  )
  const messages = useMemo<RenderMessage[]>(() => {
    const overlay = inFlight.filter((message) => {
      if (message.forChatId !== activeChatId) return false
      if (persistedIds.has(message.id)) return false
      return !message.serverId || !persistedIds.has(message.serverId)
    })
    return [...persisted, ...overlay]
  }, [activeChatId, inFlight, persisted, persistedIds])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return
    const trackPosition = () => {
      const bottomGap = element.scrollHeight - element.scrollTop - element.clientHeight
      stickToBottomRef.current = bottomGap < 80
    }
    element.addEventListener('scroll', trackPosition, { passive: true })
    return () => element.removeEventListener('scroll', trackPosition)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element || !stickToBottomRef.current) return
    element.scrollTo({
      top: element.scrollHeight,
      behavior: isLoading ? 'auto' : 'smooth',
    })
  }, [isLoading, messages])

  const canSend = input.trim().length > 0 && !isLoading && !disabled

  function submit() {
    if (!canSend) return
    const content = input.trim()
    setInput('')
    void send(content)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter commits an active IME composition; it must not also send it.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
    }
  }

  // Chips send immediately — they're a shortcut to a full turn, not a draft.
  function selectPrompt(prompt: string) {
    if (isLoading || disabled) return
    void send(prompt)
  }

  const lastMessage = messages[messages.length - 1]
  const streamingAssistantId =
    isLoading && lastMessage?.role === 'assistant' ? lastMessage.id : null
  const waitingForAssistant = isLoading && lastMessage?.role === 'user'
  const horizontalPadding = compact ? 'px-4' : 'px-6'
  const textSize = compact ? 'text-[13px]' : 'text-[14px]'
  const turnGap = compact ? 'gap-6' : 'gap-8'

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col bg-background ${textSize} ${className ?? ''}`}
      style={{ color: '#3D2B2E' }}
    >
      {header && <div className="shrink-0">{header}</div>}

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Assistant conversation"
        className={`min-h-0 flex-1 overflow-y-auto ${horizontalPadding} py-8`}
      >
        {messages.length === 0 ? (
          <EmptyState prompts={emptyStatePrompts} onPick={selectPrompt} />
        ) : (
          <div className={`mx-auto flex max-w-[44rem] flex-col ${turnGap}`}>
            {messages.map((message) => (
              <MessageTurn
                key={message.id}
                role={message.role}
                content={message.content}
                parts={message.parts}
                isStreaming={message.id === streamingAssistantId}
              />
            ))}
            {waitingForAssistant && <ThinkingIndicator />}
          </div>
        )}
      </div>

      {error && (
        <div className={`mx-auto mb-2 w-full max-w-[44rem] ${horizontalPadding}`} role="alert">
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="flex-1 text-[13px] leading-relaxed">{error.message}</div>
            <button
              type="button"
              onClick={retry}
              className="rounded-md border border-destructive/30 px-2 py-0.5 text-[12px] font-medium transition-colors hover:bg-destructive/10"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className={`shrink-0 ${horizontalPadding} pb-4 pt-3`} style={{ borderTop: '1px solid #EDD9C8' }}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="mx-auto flex w-full max-w-[44rem] items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            placeholder={disabled ? 'Creating chat…' : 'Ask me anything about Dolly…'}
            aria-label="Ask a question"
            className="h-11 min-w-0 flex-1 rounded-full border px-4 leading-[1.5] outline-none disabled:cursor-not-allowed"
            style={{ background: '#FDF6F0', borderColor: '#EDD9C8', color: '#3D2B2E' }}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop generating"
              className="h-11 shrink-0 rounded-full border px-4 font-semibold transition-opacity hover:opacity-90"
              style={{ borderColor: '#C9922A', color: '#C9922A', background: '#FFF9E8' }}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="h-11 shrink-0 rounded-full border px-5 font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: '#C9922A',
                background: 'linear-gradient(180deg, #E0AE4E, #C9922A)',
                color: '#FFF9E8',
              }}
            >
              Send ✦
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

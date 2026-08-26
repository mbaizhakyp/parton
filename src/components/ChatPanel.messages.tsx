import {
  memo,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'
import 'highlight.js/styles/atom-one-dark.css'
import type {
  MessagePart,
  ToolInvocation,
} from './ChatPanel.stream'

type MessageTurnProps = {
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: unknown[]
  isStreaming: boolean
}

/** Finished turns remain memoized while the active turn streams token-by-token. */
export const MessageTurn = memo(function MessageTurn({
  role,
  content,
  parts,
  isStreaming,
}: MessageTurnProps) {
  const orderedParts = useMemo(
    () => normalizeMessageParts(parts, content),
    [parts, content],
  )

  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] rounded-[14px] border px-4 py-2.5 text-[14px] leading-[1.5] whitespace-pre-wrap break-words"
          style={{ background: '#D4497A', borderColor: '#D4497A', color: '#FFF9E8' }}
        >
          {content}
        </div>
      </div>
    )
  }

  if (role === 'system') {
    const summary = content.replace(/^Earlier conversation summary:\n?/, '')
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
        <div className="mb-1 font-medium tracking-tight text-foreground/80">
          Earlier conversation summary
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">{summary}</div>
      </div>
    )
  }

  return (
    <AssistantBubble>
      {orderedParts.map((part, index) => {
        if (part.type === 'text') {
          if (!part.text) return null
          return <MarkdownText key={index}>{part.text}</MarkdownText>
        }
        return <ToolRow key={index} invocation={part.toolInvocation} />
      })}
      {isStreaming && <LiveIndicator />}
    </AssistantBubble>
  )
})

/**
 * Shared "🦋 avatar + bubble" shell for both a real assistant turn and the
 * static greeting shown in the empty state — one place for the Ask Dolly
 * bubble styling instead of duplicating it.
 */
function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[13px]"
        style={{ background: '#FBEAEE', borderColor: '#EDD9C8' }}
        aria-hidden="true"
      >
        🦋
      </div>
      <div
        className="flex max-w-[82%] flex-col gap-3 rounded-[14px] border px-4 py-2.5 text-[14px] leading-[1.5]"
        style={{ background: 'rgba(253,246,240,0.85)', borderColor: '#EDD9C8', color: '#3D2B2E' }}
      >
        {children}
      </div>
    </div>
  )
}

const GREETING =
  "Hi! I'm here to answer questions about Dolly — her songs, her story, her " +
  'library that mails kids free books. What are you curious about? ✦'

export function EmptyState({
  prompts,
  onPick,
}: {
  prompts: string[]
  onPick: (prompt: string) => void
}) {
  return (
    <div className="mx-auto flex max-w-[44rem] flex-col gap-4">
      <AssistantBubble>
        <p className="m-0">{GREETING}</p>
      </AssistantBubble>

      <div className="flex flex-col gap-2 pl-9">
        <div className="text-[12px]" style={{ color: '#8A6F73' }}>
          Try asking…
        </div>
        <div className="flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPick(prompt)}
              className="rounded-xl border px-3 py-1.5 text-left text-[13px] transition-colors hover:opacity-80"
              style={{ background: '#FFF9E8', borderColor: '#EDD9C8', color: '#3D2B2E' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 pl-9 text-[13px]" style={{ color: '#8A6F73' }}>
      <span>✦ thinking…</span>
    </div>
  )
}

function normalizeMessageParts(parts: unknown[] | undefined, content: string): MessagePart[] {
  const validParts = Array.isArray(parts) ? parts.filter(isMessagePart) : []
  if (validParts.length === 0) {
    return content ? [{ type: 'text', text: content }] : []
  }
  if (validParts.some((part) => part.type === 'text') || !content) return validParts
  return [...validParts, { type: 'text', text: content }]
}

function isMessagePart(value: unknown): value is MessagePart {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (candidate.type === 'text') return typeof candidate.text === 'string'
  if (candidate.type !== 'tool-invocation') return false
  return (
    typeof candidate.toolCallId === 'string' &&
    isToolInvocation(candidate.toolInvocation)
  )
}

function isToolInvocation(value: unknown): value is ToolInvocation {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.toolName === 'string' &&
    (candidate.state === 'call' || candidate.state === 'result')
  )
}

function MarkdownText({ children }: { children: string }) {
  return (
    <div
      className="leading-relaxed
                 [&_p]:my-2 [&_p]:[overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:my-3
                 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-3
                 [&_h3]:font-semibold [&_h3]:my-2
                 [&_strong]:font-semibold [&_em]:italic
                 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
                 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
                 [&_li]:my-0.5
                 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground
                 [&_hr]:my-3 [&_hr]:border-border
                 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.9em]
                 [&_pre]:bg-zinc-900 [&_pre]:text-zinc-100 [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto
                 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:text-inherit
                 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse
                 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_th]:text-left
                 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1"
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={MARKDOWN_COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-2 text-[12px] text-muted-foreground" aria-live="polite">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
      <span className="tracking-wide">Working</span>
    </div>
  )
}

function ToolRow({ invocation }: { invocation: ToolInvocation }) {
  const done = invocation.state === 'result'
  const failed = done && isFailedResult(invocation.result)
  const { label, path } = describeTool(invocation.toolName, invocation.args)

  return (
    <div className={`flex items-center gap-2 text-[13px] leading-tight ${done ? '' : 'animate-[pulse_2s_ease-in-out_infinite]'}`}>
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        {!done
          ? <Spinner />
          : failed
            ? <FailDot />
            : <Check className="h-3 w-3 shrink-0 text-foreground/60" aria-hidden="true" />}
      </span>
      <span className={done ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      {path && (
        <code className="truncate font-mono text-[12.5px] text-foreground/70">{path}</code>
      )}
      {failed && <span className="text-destructive">Failed</span>}
      {!done && <EllipsisDots />}
    </div>
  )
}

function isFailedResult(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    'success' in result &&
    result.success === false
  )
}

function describeTool(
  name: string,
  args: unknown,
): { label: string; path?: string } {
  const values = args && typeof args === 'object'
    ? args as Record<string, unknown>
    : undefined
  const collection = typeof values?.collection === 'string'
    ? values.collection
    : undefined
  const recordId = typeof values?.recordId === 'string'
    ? values.recordId
    : undefined
  const recordPath = collection && recordId
    ? `${collection}/${recordId}`
    : collection

  switch (name) {
    case 'schema_list':
      return { label: 'Listing collections' }
    case 'schema_describe':
      return { label: 'Describing', path: collection }
    case 'records_query':
      return { label: 'Reading', path: collection }
    case 'records_get':
      return { label: 'Fetching', path: recordPath }
    case 'records_create':
      return { label: 'Creating record in', path: collection }
    case 'records_update':
      return { label: 'Updating', path: recordPath }
    case 'records_delete':
      return { label: 'Deleting', path: recordPath }
    case 'user_current':
      return { label: 'Checking current user' }
    default:
      return { label: 'Running', path: name }
  }
}

function EllipsisDots() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-[pulse_1.4s_ease-in-out_0ms_infinite]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-[pulse_1.4s_ease-in-out_180ms_infinite]" />
      <span className="h-1 w-1 rounded-full bg-muted-foreground animate-[pulse_1.4s_ease-in-out_360ms_infinite]" />
    </span>
  )
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className="animate-spin text-foreground/70"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M10.5 6 A 4.5 4.5 0 0 1 6 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FailDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
}

type MarkdownElementProps<Tag extends 'a' | 'pre'> =
  ComponentPropsWithoutRef<Tag> & { node?: unknown }

const CodeBlock = ({ children, node: _node, ...props }: MarkdownElementProps<'pre'>) => {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  function copy() {
    const text = ref.current?.textContent
    if (!text) return
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1_500)
    }).catch(() => {
      // Clipboard access can be denied outside a secure context.
    })
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2 top-2 inline-flex h-6 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 text-[11px] font-medium text-zinc-200 opacity-0 transition-opacity hover:bg-zinc-700 focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied
          ? <Check className="h-3 w-3" aria-hidden="true" />
          : <Copy className="h-3 w-3" aria-hidden="true" />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <pre ref={ref} {...props}>{children}</pre>
    </div>
  )
}

const ExternalLink = ({
  children,
  href,
  node: _node,
  ...props
}: MarkdownElementProps<'a'>) => (
  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
    {children}
  </a>
)

const REMARK_PLUGINS = [remarkGfm, remarkBreaks]
const REHYPE_PLUGINS = [rehypeHighlight]
const MARKDOWN_COMPONENTS = { pre: CodeBlock, a: ExternalLink } satisfies Components

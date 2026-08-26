/**
 * Live quiz leaderboard — lives on the quiz page only (F2). Top scores,
 * name, recency, updating in real time via useQuery's WebSocket subscription.
 * Rail on desktop (≥1024px, handled by the parent's layout), a plain section
 * on smaller screens — this component just renders the card either way.
 */

import { useMemo, type CSSProperties } from 'react'
import { useQuery, formatMessageTime, type RecordData } from 'deepspace'

interface ScoreRow {
  playerName: string
  score: number
  total: number
  takenAt: string
}

const GOLD = '#C9922A'
const PINK = '#D4497A'
const BORDER = '#EDD9C8'
const MUTED = '#8A6F73'
const CREAM = '#FFF9E8'

function rankCircleStyle(rank: number): CSSProperties {
  if (rank === 0) {
    return {
      background: 'linear-gradient(135deg, #E0AE4E, #C9922A)',
      color: CREAM,
      border: '1px solid transparent',
    }
  }
  if (rank === 1) return { background: BORDER, color: '#3D2B2E', border: '1px solid transparent' }
  if (rank === 2) return { background: '#E0B08A', color: '#3D2B2E', border: '1px solid transparent' }
  return { background: 'transparent', color: MUTED, border: `1px solid ${BORDER}` }
}

export function Leaderboard() {
  const { records, status } = useQuery<ScoreRow>('scores', {
    orderBy: 'score',
    orderDir: 'desc',
    limit: 50,
  })

  // Tie-break client-side: score desc, then takenAt asc (earliest to reach
  // that score ranks higher) — useQuery only sorts by one column server-side.
  const rows = useMemo(() => {
    return [...records]
      .sort((a, b) => {
        const scoreDiff = (b.data.score ?? 0) - (a.data.score ?? 0)
        if (scoreDiff !== 0) return scoreDiff
        return Date.parse(a.data.takenAt ?? '') - Date.parse(b.data.takenAt ?? '')
      })
      .slice(0, 8)
  }, [records])

  return (
    <div
      data-testid="quiz-leaderboard"
      style={{ background: CREAM, border: `1px solid ${BORDER}`, borderRadius: 16 }}
      className="p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2
          style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#3D2B2E' }}
        >
          ✦ Live Quiz Leaderboard
        </h2>
        <span style={{ fontSize: 11, color: PINK, fontWeight: 600 }}>● LIVE</span>
      </div>

      {status === 'loading' ? (
        <p style={{ fontSize: 13, color: MUTED }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ fontSize: 13, color: MUTED }}>No scores yet — be the first fan on the board.</p>
      ) : (
        <div>
          {rows.map((row: RecordData<ScoreRow>, i) => (
            <div
              key={row.recordId}
              data-testid="leaderboard-row"
              className="flex items-center gap-2 py-2"
              style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER}` }}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                style={rankCircleStyle(i)}
              >
                {i + 1}
              </span>
              <span
                data-testid="leaderboard-name"
                className="min-w-0 flex-1 truncate"
                style={{ fontSize: 13, fontWeight: 600, color: '#3D2B2E' }}
              >
                {row.data.playerName}
              </span>
              <span style={{ fontSize: 12, color: MUTED }}>{formatMessageTime(row.data.takenAt)}</span>
              <span data-testid="leaderboard-score" style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>
                {row.data.score}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MUTED }}>
        ↻ Updating live · new scores in real time
      </div>
    </div>
  )
}

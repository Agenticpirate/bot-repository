'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'

interface StarRatingProps {
  slug: string
}

export default function StarRating({ slug }: StarRatingProps) {
  const { t } = useI18n()
  const { data: session } = useSession()
  const [total, setTotal] = useState<number | null>(null)
  const [count, setCount] = useState<number>(0)
  const [userVote, setUserVote] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/stars/${slug}`)
      .then(r => r.json())
      .then(d => {
        setTotal(d.total)
        setCount(d.count ?? 0)
        setUserVote(d.userVote ?? 0)
      })
  }, [slug])

  const avg = count > 0 && total !== null ? total / count : 0

  const handleVote = async (stars: number) => {
    if (!session || loading) return
    setLoading(true)
    const res = await fetch(`/api/stars/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stars }),
    })
    const data = await res.json()
    if (res.ok) {
      setTotal(data.total)
      setCount(data.count)
      setUserVote(data.userVote)
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 2000)
    }
    setLoading(false)
  }

  const displayStars = hovered || userVote

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        {t.rateAgent}
      </h3>

      {/* Star display */}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            disabled={!session || loading}
            onClick={() => handleVote(star)}
            onMouseEnter={() => session && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-all duration-100 disabled:cursor-default"
            style={{
              transform: hovered >= star ? 'scale(1.2)' : 'scale(1)',
              opacity: !session ? 0.5 : 1,
              filter: displayStars >= star ? 'none' : 'grayscale(1)',
            }}
            title={!session ? t.signInToVote : t.rateStar(star)}
          >
            {displayStars >= star ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {total === null ? (
          <span>{t.loading}</span>
        ) : count === 0 ? (
          <span>{t.noVotes}</span>
        ) : (
          <span>
            <span style={{ color: '#e3b341', fontWeight: 600 }}>
              {avg.toFixed(1)}
            </span>
            {' '}/ 5 · {count} {t.voteCount(count)}
          </span>
        )}
      </div>

      {/* Feedback */}
      {submitted && (
        <p className="text-xs mt-2" style={{ color: 'var(--cyan-bright)' }}>
          {t.thanksVote}
        </p>
      )}
      {!session && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          {t.signInToRate}
        </p>
      )}
    </div>
  )
}

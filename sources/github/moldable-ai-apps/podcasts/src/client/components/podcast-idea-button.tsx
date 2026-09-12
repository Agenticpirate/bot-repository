import { Lightbulb } from 'lucide-react'
import { useEffect, useState } from 'react'
import { shuffledPodcastIdeas } from '../data/podcast-ideas'

export function PodcastIdeaButton({
  active,
  onChoose,
}: {
  active: boolean
  onChoose: (topic: string) => void
}) {
  const [ideas] = useState(shuffledPodcastIdeas)
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(() => document.hidden)
  const paused = hovered || focused || hidden || !active
  const idea = ideas[index]!
  useEffect(() => {
    const update = () => {
      setHidden(document.hidden)
      setFading(false)
    }
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  useEffect(() => {
    if (paused) return
    setFading(false)
    let transition: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(() => {
      setFading(true)
      transition = setTimeout(() => {
        setIndex((current) => (current + 1) % ideas.length)
        setFading(false)
      }, 180)
    }, 5000)
    return () => {
      clearTimeout(timer)
      clearTimeout(transition)
    }
  }, [index, ideas.length, paused])
  return (
    <button
      type="button"
      className="podcast-idea-button"
      disabled={!active}
      onMouseEnter={() => {
        setHovered(true)
        setFading(false)
      }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => {
        setFocused(true)
        setFading(false)
      }}
      onBlur={() => setFocused(false)}
      onClick={() => onChoose(idea)}
      title={`Use this idea: ${idea}`}
    >
      <Lightbulb className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="podcast-idea-label">Idea:</span>
      <span className="podcast-idea-text" data-fading={fading && !paused}>
        {idea}
      </span>
    </button>
  )
}

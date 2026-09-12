import { ExternalLink } from 'lucide-react'
import type { EpisodeView } from '../../shared/podcast'

export function EpisodeNotes({ episode }: { episode: EpisodeView }) {
  return (
    <article className="episode-notes">
      <section>
        <h2>{episode.title}</h2>
        {episode.description && (
          <p className="episode-description">{episode.description}</p>
        )}
      </section>
      {episode.sources.length > 0 && (
        <section>
          <h3>Sources & further reading</h3>
          <div className="source-list">
            {episode.sources.map((source, index) => (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.title}
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Transcript</h3>
        <div className="transcript">
          {episode.parts.map((part) => (
            <div key={part.index} className="transcript-turn">
              <p>{part.text}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}

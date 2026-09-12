import { AudioLines } from 'lucide-react'
import { useState } from 'react'
import type { EpisodeSummary } from '../../shared/podcast'

export function EpisodeCover({
  accent = 'blue',
  small = false,
  imagePath,
}: {
  accent?: EpisodeSummary['accent']
  small?: boolean
  imagePath?: string | null
}) {
  const [failedImage, setFailedImage] = useState<string>()
  return (
    <div
      className={`episode-cover ${small ? 'episode-cover-small' : ''}`}
      data-accent={accent}
      aria-hidden="true"
    >
      {imagePath && imagePath !== failedImage ? (
        <img
          src={imagePath}
          alt=""
          className="size-full object-cover"
          onError={() => setFailedImage(imagePath)}
        />
      ) : (
        <>
          <div className="cover-orbit cover-orbit-one" />
          <div className="cover-orbit cover-orbit-two" />
          <AudioLines strokeWidth={1.5} />
        </>
      )}
    </div>
  )
}

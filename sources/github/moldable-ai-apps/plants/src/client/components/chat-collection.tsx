import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Markdown } from '@moldable-ai/ui'
import type { Plant } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { CareView } from './care-view'
import { PlantCard, fallbackGradient } from './plant-card'
import { waterStatusLabel } from './water-button'

export function ChatCollection() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [plants, setPlants] = useState<Plant[]>()
  const [selectedId, setSelectedId] = useState<string>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const readSequence = useRef(0)
  const refresh = useCallback(async () => {
    const sequence = ++readSequence.current
    const result = await callCardApp<{ plants: Plant[] }>(
      'plants',
      'plants.cards.read',
    )
    if (sequence === readSequence.current) setPlants(result.plants)
  }, [])
  useEffect(() => {
    const reload = () => {
      if (!pending.current)
        void refresh().catch((error) => setError(String(error)))
    }
    reload()
    window.addEventListener('focus', reload)
    window.addEventListener('online', reload)
    const timer = window.setInterval(reload, 30_000)
    return () => {
      readSequence.current += 1
      window.removeEventListener('focus', reload)
      window.removeEventListener('online', reload)
      window.clearInterval(timer)
    }
  }, [refresh])
  const selected = plants?.find((plant) => plant.id === selectedId)
  const water = async (plant: Plant) => {
    if (pending.current) return
    pending.current = true
    readSequence.current += 1
    setBusy(true)
    setError(undefined)
    try {
      await callCardApp('plants', 'plants.cards.water', {
        plantId: plant.id,
        expectedUpdatedAt: plant.updatedAt,
      })
      await refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not mark this plant watered.',
      )
      await refresh().catch(() => {})
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  const workspace = new URLSearchParams(location.search).get('workspace') ?? ''
  const mediaUrl = (path?: string) =>
    path &&
    new URLSearchParams(location.search).get('cardFixture') === '1' &&
    /^\/card-fixtures\/[a-z0-9-]+\.png$/.test(path)
      ? path
      : path
        ? `/api/plants/media?${new URLSearchParams({ path, workspace })}`
        : undefined
  return (
    <div ref={contentRef} className="bg-background">
      {error && (
        <p role="alert" className="text-destructive p-3 text-sm">
          {error}
        </p>
      )}
      <div hidden={expanded}>
        {!plants ? (
          <p role="status" className="text-muted-foreground p-4 text-sm">
            Loading plants…
          </p>
        ) : plants.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            These plants are no longer available.
          </p>
        ) : (
          <div
            role="region"
            aria-label="Plants. Scroll for more."
            tabIndex={0}
            className="flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain p-1 pb-2"
          >
            {plants.map((plant, index) => (
              <div key={plant.id} className="w-44 shrink-0 snap-start sm:w-48">
                <PlantCard
                  plant={plant}
                  index={index}
                  mediaUrl={mediaUrl}
                  onOpen={() => {
                    setSelectedId(plant.id)
                    setError(undefined)
                    void openQuickLook(plant.id).catch((error) =>
                      setError(String(error)),
                    )
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {expanded &&
        (selected ? (
          <article className="space-y-5 p-5">
            <div
              className="bg-muted overflow-hidden rounded-2xl"
              style={{ background: fallbackGradient(selected.commonName) }}
            >
              {selected.heroImageUrl && (
                <img
                  alt={selected.commonName}
                  src={mediaUrl(selected.heroImageUrl)}
                  className="max-h-80 w-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {selected.nickname || selected.commonName}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {[selected.scientificName, selected.room, selected.location]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{waterStatusLabel(selected)}</p>
              {selected.ownershipStatus !== 'wishlist' &&
                selected.lifeStatus !== 'deceased' && (
                  <Button
                    className="cursor-pointer"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      void water(selected)
                    }}
                  >
                    {busy ? 'Saving…' : 'Mark watered'}
                  </Button>
                )}
            </div>
            <CareView plant={selected} generating={false} />
            {selected.notes && <Markdown markdown={selected.notes} />}
          </article>
        ) : (
          <p className="text-muted-foreground p-5 text-sm">
            This plant is no longer available.
          </p>
        ))}
    </div>
  )
}

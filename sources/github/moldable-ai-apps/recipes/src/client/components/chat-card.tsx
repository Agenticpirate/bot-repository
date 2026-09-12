import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Markdown } from '@moldable-ai/ui'
import type { Recipe } from '../../lib/types'
import { callCardApp } from '../lib/chat-card-rpc'
import { useCardSurface } from '../lib/chat-card-surface'
import { RecipeCard } from '../../components/recipe-card'
import { useRecipeMedia, useResolvedMarkdown } from '../use-recipe-media'

type RecipePreview = Pick<
  Recipe,
  'id' | 'title' | 'imageUrl' | 'plannedForWeek' | 'cookingTime'
>
interface CardData {
  items: RecipePreview[]
  detail: (Recipe & { truncated: boolean }) | null
  missingCount: number
}
function RecipeQuickLook({
  recipe,
}: {
  recipe: Recipe & { truncated: boolean }
}) {
  const { resolveMediaUrl } = useRecipeMedia()
  const instructions = useResolvedMarkdown(recipe.instructions)
  return (
    <article className="space-y-5 p-5">
      {recipe.imageUrl && (
        <img
          src={resolveMediaUrl(recipe.imageUrl)}
          alt={recipe.title}
          className="max-h-64 w-full rounded-xl object-cover"
        />
      )}
      <div>
        <h1 className="text-xl font-semibold">{recipe.title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {[recipe.cookingTime, recipe.servings, recipe.difficulty]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      {recipe.description && <p className="text-sm">{recipe.description}</p>}
      <section>
        <h2 className="mb-3 text-sm font-semibold">Ingredients</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {recipe.ingredients.map((ingredient, index) => (
            <li key={index}>{ingredient}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Instructions</h2>
        <Markdown markdown={instructions} />
      </section>
      {recipe.truncated && (
        <p className="text-muted-foreground text-xs">
          This long recipe continues in Recipes.
        </p>
      )}
    </article>
  )
}
export function ChatCard() {
  const { contentRef, expanded, openQuickLook } = useCardSurface()
  const [selectedId, setSelectedId] = useState<string>()
  const [error, setError] = useState<string>()
  const input = new URLSearchParams(location.search).get('cardInput') ?? ''
  const preview = useQuery({
    queryKey: ['chat-recipes', input],
    queryFn: () => callCardApp<CardData>('recipes', 'recipes.cards.read'),
    refetchInterval: 30_000,
  })
  const detail = useQuery({
    queryKey: ['chat-recipe-detail', input, selectedId],
    queryFn: () =>
      callCardApp<CardData>('recipes', 'recipes.cards.read', {
        detailId: selectedId,
      }),
    enabled: expanded && Boolean(selectedId),
    refetchInterval: 30_000,
  })
  const open = (id: string) => {
    setError(undefined)
    setSelectedId(id)
    void openQuickLook(id).catch((error) => setError(String(error)))
  }
  return (
    <div ref={contentRef} className="bg-background">
      {(error || preview.error || detail.error) && (
        <p role="alert" className="text-destructive p-4 text-sm">
          {error || preview.error?.message || detail.error?.message}
        </p>
      )}
      {preview.isPending && (
        <p role="status" className="text-muted-foreground p-4 text-sm">
          Loading recipes…
        </p>
      )}
      <div hidden={expanded}>
        <div className="flex snap-x snap-proximity gap-3 overflow-x-auto p-2">
          {preview.data?.items.map((recipe) => (
            <div key={recipe.id} className="w-60 shrink-0 snap-start">
              <RecipeCard recipe={recipe} onClick={() => open(recipe.id)} />
              {recipe.cookingTime && (
                <p className="text-muted-foreground mt-2 px-1 text-xs">
                  {recipe.cookingTime}
                </p>
              )}
            </div>
          ))}
        </div>
        {preview.data?.items.length === 0 && (
          <p className="text-muted-foreground p-4 text-sm">
            These recipes are no longer available.
          </p>
        )}
      </div>
      {expanded &&
        (detail.isPending ? (
          <p role="status" className="text-muted-foreground p-5 text-sm">
            Loading recipe…
          </p>
        ) : detail.data?.detail ? (
          <RecipeQuickLook recipe={detail.data.detail} />
        ) : (
          !detail.error && (
            <p className="text-muted-foreground p-5 text-sm">
              This recipe is no longer available.
            </p>
          )
        ))}
    </div>
  )
}

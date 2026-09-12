'use client'

import { CalendarCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Badge } from '@moldable-ai/ui'
import { isPlannedThisWeek } from '@/lib/cooking'
import type { Recipe } from '@/lib/types'
import { useRecipeMedia } from '@/client/use-recipe-media'

interface RecipeCardProps {
  recipe: Pick<Recipe, 'id' | 'title' | 'imageUrl' | 'plannedForWeek'>
  index?: number
  onClick: () => void
}

export function RecipeCard({ recipe, index = 0, onClick }: RecipeCardProps) {
  const { resolveMediaUrl } = useRecipeMedia()
  const image = resolveMediaUrl(recipe.imageUrl)
  const style = {
    animationDelay: `${Math.min(index, 12) * 35}ms`,
  } as CSSProperties

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${recipe.title}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      style={style}
      className="recipe-card border-border/50 bg-muted focus-visible:ring-primary/40 animate-recipe-card-in group relative isolate flex aspect-[4/3] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
    >
      {image ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          className="recipe-card__image absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="recipe-card__scrim absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="recipe-card__content relative z-10 p-5">
        {isPlannedThisWeek(recipe.plannedForWeek) ? (
          <Badge className="mb-2 border-white/25 bg-black/35 text-white backdrop-blur-sm">
            <CalendarCheck />
            This week
          </Badge>
        ) : null}
        <h3 className="recipe-card__title line-clamp-2 text-xl font-semibold leading-tight text-white drop-shadow-sm">
          {recipe.title}
        </h3>
      </div>
    </div>
  )
}

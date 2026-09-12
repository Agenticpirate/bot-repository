import {
  categories,
  getAffirmations,
  getDailyAffirmation,
  getDayKey,
} from '../lib/affirmations'
import { z } from 'zod'

const MAX_NATIVE_ITEMS = 16

const nativeRouteSchema = z.enum([
  'home',
  'daily',
  'theme',
  'affirmation',
  'favorites',
  'random',
])

export const nativeReadParamsSchema = z
  .object({
    route: nativeRouteSchema,
    categoryId: z.string().trim().min(1).max(80).optional(),
    text: z.string().trim().min(1).max(500).optional(),
    limit: z.number().int().min(1).max(MAX_NATIVE_ITEMS).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.route === 'theme' && !value.categoryId) {
      context.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'categoryId is required for the theme route.',
      })
    }
    if (value.route === 'affirmation' && !value.text) {
      context.addIssue({
        code: 'custom',
        path: ['text'],
        message: 'text is required for the affirmation route.',
      })
    }
  })

export const nativeMutateParamsSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('favorite'),
      text: z.string().trim().min(1).max(500),
      favorite: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal('shuffle') }).strict(),
])

export type NativeReadParams = z.infer<typeof nativeReadParamsSchema>

type NativeReadContext = {
  favorites: string[]
  streakCount: number
  now?: Date
  random?: () => number
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function categoryForText(text: string) {
  return categories.find((category) =>
    getAffirmations(category.id).includes(text),
  )
}

function knownAffirmation(text: string): boolean {
  return categoryForText(text) !== undefined
}

function boundedQuoteExcerpt(text: string, maximumLength = 88): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return 'Saved affirmation'
  return compact.length <= maximumLength
    ? compact
    : `${compact.slice(0, maximumLength - 1).trimEnd()}…`
}

function favoriteAction(text: string, favorites: Set<string>) {
  const isFavorite = favorites.has(text)
  return {
    text,
    favorite: !isFavorite,
    label: isFavorite ? 'Remove from favorites' : 'Save to favorites',
  }
}

function favoriteState(text: string, favorites: Set<string>) {
  return favorites.has(text)
    ? [
        {
          title: 'Saved to your favorites',
          message: 'This affirmation is ready whenever you need it.',
        },
      ]
    : []
}

function boundedThemeAffirmations(
  categoryId: string,
  dayKey: string,
  limit: number,
) {
  const all = getAffirmations(categoryId)
  if (all.length <= limit) return all

  const dayNumber = Number(dayKey.replaceAll('-', ''))
  const categoryOffset = [...categoryId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  )
  const start = (dayNumber + categoryOffset) % all.length
  return Array.from(
    { length: limit },
    (_, index) => all[(start + index) % all.length],
  )
}

function projectAffirmation(
  text: string,
  favorites: Set<string>,
  random: () => number,
  fallbackTitle = 'Affirmation',
) {
  const category = categoryForText(text)
  const alternatives = category
    ? getAffirmations(category.id).filter((candidate) => candidate !== text)
    : []
  const anotherIndex = Math.min(
    alternatives.length - 1,
    Math.max(0, Math.floor(random() * alternatives.length)),
  )
  return {
    text,
    title: category?.name ?? fallbackTitle,
    canSaveFavorite: !favorites.has(text),
    canRemoveFavorite: favorites.has(text),
    favoriteStates: favoriteState(text, favorites),
    categoryId: category?.id ?? '',
    canBrowseTheme: category !== undefined,
    browseThemeDisplayLabel: category
      ? `Browse ${category.name} affirmations`
      : 'Browse affirmation theme',
    canShowAnother: category !== undefined && alternatives.length > 0,
    anotherText:
      category && alternatives.length > 0 ? alternatives[anotherIndex] : text,
  }
}

export function isKnownAffirmation(text: string): boolean {
  return knownAffirmation(text)
}

export function projectNativeAffirmations(
  params: NativeReadParams,
  context: NativeReadContext,
) {
  const now = context.now ?? new Date()
  const favorites = new Set(context.favorites)
  const limit = params.limit ?? MAX_NATIVE_ITEMS

  if (params.route === 'home') {
    const dailyText = getDailyAffirmation(now)
    return {
      dailyText,
      dailyFavoriteActions: [favoriteAction(dailyText, favorites)],
      dailyFavoriteStates: favoriteState(dailyText, favorites),
      streakCaptions:
        context.streakCount > 0 ? [{ text: `Day ${context.streakCount}` }] : [],
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        blurb: category.blurb,
        displayLabel: `Open ${category.name} affirmations`,
      })),
    }
  }

  if (params.route === 'daily') {
    const text = getDailyAffirmation(now)
    return {
      text,
      favoriteActions: [favoriteAction(text, favorites)],
      favoriteStates: favoriteState(text, favorites),
      dateLabel: dateLabel(now),
      streakLabel: `${context.streakCount} ${context.streakCount === 1 ? 'day' : 'days'}`,
    }
  }

  if (params.route === 'theme') {
    const category = categories.find((item) => item.id === params.categoryId)
    if (!category) return null
    const all = getAffirmations(category.id)
    const texts = boundedThemeAffirmations(category.id, getDayKey(now), limit)
    const random = context.random ?? Math.random
    const randomIndex = Math.min(
      all.length - 1,
      Math.max(0, Math.floor(random() * all.length)),
    )
    return {
      category: {
        name: category.name,
        blurb: category.blurb,
      },
      countLabel: `${all.length} affirmations`,
      selectionLabel:
        all.length > texts.length
          ? `${texts.length} for today`
          : `${texts.length} affirmations`,
      affirmations: texts.map((text) => ({
        text,
        categoryId: category.id,
      })),
      shuffleActions:
        all.length > 0
          ? [{ text: all[randomIndex], label: `Shuffle ${category.name}` }]
          : [],
      truncationNotices:
        all.length > texts.length
          ? [
              {
                message: `Showing a calm ${texts.length}-card daily selection. Open the desktop app to browse all ${all.length}.`,
              },
            ]
          : [],
    }
  }

  if (params.route === 'affirmation') {
    const text = params.text ?? ''
    if (!knownAffirmation(text) && !favorites.has(text)) return null
    return projectAffirmation(text, favorites, context.random ?? Math.random)
  }

  if (params.route === 'favorites') {
    const visible = context.favorites.slice(0, limit)
    return {
      countLabel: `${context.favorites.length} saved`,
      favorites: visible.map((text) => {
        const category = categoryForText(text)
        return {
          text,
          quoteExcerpt: boundedQuoteExcerpt(text),
          categoryName: category?.name ?? 'Affirmation',
          displayLabel: `Open saved affirmation: ${boundedQuoteExcerpt(text, 48)}`,
          removeDisplayLabel: `Remove favorite: ${boundedQuoteExcerpt(text, 48)}`,
        }
      }),
      emptyStates:
        context.favorites.length === 0
          ? [
              {
                title: 'No saved affirmations yet',
                description:
                  'Use the heart on an affirmation to keep the words that resonate.',
              },
            ]
          : [],
      truncationNotices:
        context.favorites.length > visible.length
          ? [
              {
                message: `Showing ${visible.length} of ${context.favorites.length} saved affirmations. The full list remains available on desktop.`,
              },
            ]
          : [],
    }
  }

  const all = categories.flatMap((category) =>
    getAffirmations(category.id).map((text) => ({
      text,
      categoryName: category.name,
    })),
  )
  const random = context.random ?? Math.random
  const index = Math.min(
    all.length - 1,
    Math.max(0, Math.floor(random() * all.length)),
  )
  return all[index]
}

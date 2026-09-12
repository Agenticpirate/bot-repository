import { categories, getAffirmations } from '../lib/affirmations'
import {
  nativeReadParamsSchema,
  projectNativeAffirmations,
} from './native-ui-api'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const now = new Date('2026-08-02T10:30:00-04:00')

describe('Affirmations NativeUI projection', () => {
  it('projects the restrained home hierarchy without embedding records in the package', () => {
    const favorite = getAffirmations(categories[0]!.id)[0]!
    const result = projectNativeAffirmations(
      { route: 'home' },
      { favorites: [favorite], streakCount: 7, now },
    )

    expect(result).toMatchObject({
      streakCaptions: [{ text: 'Day 7' }],
    })
    expect(result).not.toBeNull()
    if (!result || !('categories' in result)) {
      throw new Error('Expected the native home projection')
    }
    expect(result.categories).toHaveLength(categories.length)
  })

  it('bounds each theme to a stable 16-card daily selection', () => {
    const params = nativeReadParamsSchema.parse({
      route: 'theme',
      categoryId: categories[0]!.id,
      limit: 16,
    })
    const first = projectNativeAffirmations(params, {
      favorites: [],
      streakCount: 0,
      now,
      random: () => 0.25,
    })
    const second = projectNativeAffirmations(params, {
      favorites: [],
      streakCount: 0,
      now,
      random: () => 0.25,
    })

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      selectionLabel: '16 for today',
    })
    expect(first && 'affirmations' in first && first.affirmations).toHaveLength(
      16,
    )
    expect(first).toMatchObject({
      shuffleActions: [{ label: expect.stringContaining('Shuffle') }],
    })
  })

  it('projects in-theme shuffle navigation and removable favorite controls', () => {
    const category = categories[0]!
    const texts = getAffirmations(category.id)
    const focused = projectNativeAffirmations(
      { route: 'affirmation', text: texts[0] },
      { favorites: [texts[0]!], streakCount: 0, now, random: () => 0 },
    )
    expect(focused).toMatchObject({
      text: texts[0],
      canSaveFavorite: false,
      canRemoveFavorite: true,
      canShowAnother: true,
      anotherText: texts[1],
      categoryId: category.id,
    })

    const favorites = projectNativeAffirmations(
      { route: 'favorites', limit: 16 },
      { favorites: [texts[0]!], streakCount: 0, now },
    )
    expect(favorites).toMatchObject({
      favorites: [
        {
          text: texts[0],
          quoteExcerpt: texts[0],
          categoryName: category.name,
          removeDisplayLabel: expect.stringContaining('Remove favorite:'),
        },
      ],
    })
  })

  it('keeps empty, legacy favorite, missing, and random states honest', () => {
    const empty = projectNativeAffirmations(
      { route: 'favorites', limit: 16 },
      { favorites: [], streakCount: 0, now },
    )
    expect(empty).toMatchObject({
      countLabel: '0 saved',
      favorites: [],
      emptyStates: [{ title: 'No saved affirmations yet' }],
    })

    const legacyText = 'A personal affirmation saved by an older build.'
    const legacy = projectNativeAffirmations(
      { route: 'affirmation', text: legacyText },
      { favorites: [legacyText], streakCount: 0, now },
    )
    expect(legacy).toMatchObject({
      text: legacyText,
      title: 'Affirmation',
      canBrowseTheme: false,
      canShowAnother: false,
    })

    expect(
      projectNativeAffirmations(
        { route: 'affirmation', text: 'Not part of the library' },
        { favorites: [], streakCount: 0, now },
      ),
    ).toBeNull()

    const random = projectNativeAffirmations(
      { route: 'random' },
      { favorites: [], streakCount: 0, now, random: () => 0 },
    )
    expect(random).toMatchObject({
      categoryName: categories[0]!.name,
      text: getAffirmations(categories[0]!.id)[0],
    })
  })
})

describe('Affirmations presentation contract', () => {
  it('uses mobile web without a per-app NativeUI package', async () => {
    const { readFile, access } = await import('node:fs/promises')
    const manifest = JSON.parse(
      await readFile(resolve(process.cwd(), 'moldable.json'), 'utf8'),
    ) as {
      nativeUI?: string
      mobile?: { type: string }
    }
    expect(manifest.nativeUI).toBeUndefined()
    expect(manifest.mobile?.type).toBe('mobile-web')
    await expect(
      access(resolve(process.cwd(), 'native-ui.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' })
  })
})

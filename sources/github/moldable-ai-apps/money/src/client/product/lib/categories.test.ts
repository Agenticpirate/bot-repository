import {
  CATEGORY_OPTIONS,
  DETAILED_CATEGORY_OPTIONS,
  categoryEmojiForKey,
  categoryLabel,
  friendlyCategory,
  providerCategoryLabel,
} from './categories'
import { describe, expect, it } from 'vitest'

describe('transaction category labels', () => {
  it('shows warm Plaid detailed categories instead of broad primary defaults', () => {
    expect(friendlyCategory('FOOD_AND_DRINK')).toBe('Food & drink')
    expect(friendlyCategory('FOOD_AND_DRINK_RESTAURANT')).toBe('Eating out')
    expect(friendlyCategory('FOOD_AND_DRINK_COFFEE')).toBe('Coffee')
    // Warmer group + subcategory naming.
    expect(friendlyCategory('TRANSPORTATION')).toBe('Getting around')
    expect(friendlyCategory('INCOME_WAGES')).toBe('Paycheck')

    expect(
      providerCategoryLabel({
        providerCategoryPrimary: 'FOOD_AND_DRINK',
        providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
        category: ['FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT'],
      }),
    ).toBe('Eating out')
  })

  it('keeps user category overrides above provider categories', () => {
    expect(
      categoryLabel({
        userCategory: 'Date night',
        providerCategoryPrimary: 'FOOD_AND_DRINK',
        providerCategoryDetailed: 'FOOD_AND_DRINK_RESTAURANT',
      }),
    ).toBe('Date night')
  })

  it('includes Plaid detailed categories for picker groups', () => {
    expect(DETAILED_CATEGORY_OPTIONS).toHaveLength(104)
    expect(
      DETAILED_CATEGORY_OPTIONS.find(
        (option) => option.key === 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
      ),
    ).toEqual(
      expect.objectContaining({
        label: 'Online shopping',
        emoji: '📦',
        groupLabel: 'Shopping',
      }),
    )
  })

  it('gives every group and subcategory a unique emoji', () => {
    const emoji = [
      ...CATEGORY_OPTIONS.map((o) => categoryEmojiForKey(o.key)),
      ...DETAILED_CATEGORY_OPTIONS.map((o) => categoryEmojiForKey(o.key)),
    ]
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const e of emoji) {
      if (seen.has(e)) dupes.push(e)
      else seen.set(e, e)
    }
    expect(dupes).toEqual([])
    expect(new Set(emoji).size).toBe(emoji.length)
  })
})

/**
 * Friendly transaction categories.
 *
 * Plaid returns `personal_finance_category.primary` and
 * `personal_finance_category.detailed` enum values. The detailed value is the
 * useful default for a user-facing category chip; the primary value is the
 * group. This taxonomy mirrors Plaid's PFC v1 keys
 * (https://plaid.com/documents/transactions-personal-finance-category-taxonomy.csv)
 * but gives every group and subcategory a warm, human label and a unique emoji
 * so the app's category language feels like the user's, not the provider's.
 */

export interface CategoryOption {
  /** Plaid enum key for provider categories, or a stable id for custom labels. */
  key: string
  /** Friendly label shown in the UI and written as `userCategory` on override. */
  label: string
  /** Emoji shown beside this category. Provider defaults can be overridden. */
  emoji?: string
  /** Primary Plaid category group, when this is a detailed provider category. */
  groupKey?: PlaidPrimaryCategory
  /** Friendly primary group label for nested pickers. */
  groupLabel?: string
  kind?: 'primary' | 'detailed' | 'custom'
}

export interface CategoryPreferenceLike {
  key: string
  label?: string
  emoji?: string
  hidden?: boolean
  mappedTo?: string
}

export interface CustomCategoryLike {
  id: string
  label: string
  emoji?: string
}

export interface CategoryCatalogLike {
  categories?: CustomCategoryLike[]
  preferences?: CategoryPreferenceLike[]
}

export const UNCATEGORIZED_CATEGORY: CategoryOption = {
  key: 'UNCATEGORIZED',
  label: 'Uncategorized',
  emoji: '❔',
  groupLabel: 'Custom',
  kind: 'custom',
}

/**
 * The full Plaid PFC taxonomy with warm labels + a unique emoji per
 * subcategory. Keys are immutable (they map to Plaid's enums); labels and emoji
 * are ours. Every emoji across the whole tree is distinct so a glance reads as
 * the category, not just the group.
 */
export const PLAID_CATEGORY_GROUPS = [
  {
    key: 'INCOME',
    label: 'Income',
    emoji: '💰',
    details: [
      { key: 'INCOME_DIVIDENDS', label: 'Dividends', emoji: '📈' },
      { key: 'INCOME_INTEREST_EARNED', label: 'Interest earned', emoji: '🪙' },
      { key: 'INCOME_RETIREMENT_PENSION', label: 'Pension', emoji: '🏖️' },
      { key: 'INCOME_TAX_REFUND', label: 'Tax refund', emoji: '🧧' },
      { key: 'INCOME_UNEMPLOYMENT', label: 'Unemployment', emoji: '📭' },
      { key: 'INCOME_WAGES', label: 'Paycheck', emoji: '💵' },
      { key: 'INCOME_OTHER_INCOME', label: 'Other income', emoji: '✨' },
    ],
  },
  {
    key: 'TRANSFER_IN',
    label: 'Money in',
    emoji: '📥',
    details: [
      {
        key: 'TRANSFER_IN_CASH_ADVANCES_AND_LOANS',
        label: 'Loans & advances',
        emoji: '🤝',
      },
      { key: 'TRANSFER_IN_DEPOSIT', label: 'Deposits', emoji: '🏦' },
      {
        key: 'TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS',
        label: 'From investments',
        emoji: '📊',
      },
      { key: 'TRANSFER_IN_SAVINGS', label: 'From savings', emoji: '🐷' },
      {
        key: 'TRANSFER_IN_ACCOUNT_TRANSFER',
        label: 'Account transfer in',
        emoji: '↘️',
      },
      {
        key: 'TRANSFER_IN_OTHER_TRANSFER_IN',
        label: 'Other money in',
        emoji: '➕',
      },
    ],
  },
  {
    key: 'TRANSFER_OUT',
    label: 'Money out',
    emoji: '📤',
    details: [
      {
        key: 'TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS',
        label: 'To investments',
        emoji: '🌱',
      },
      { key: 'TRANSFER_OUT_SAVINGS', label: 'To savings', emoji: '🪺' },
      { key: 'TRANSFER_OUT_WITHDRAWAL', label: 'Withdrawals', emoji: '🏧' },
      {
        key: 'TRANSFER_OUT_ACCOUNT_TRANSFER',
        label: 'Account transfer out',
        emoji: '↗️',
      },
      {
        key: 'TRANSFER_OUT_OTHER_TRANSFER_OUT',
        label: 'Other money out',
        emoji: '➖',
      },
    ],
  },
  {
    key: 'LOAN_PAYMENTS',
    label: 'Loan payments',
    emoji: '💳',
    details: [
      { key: 'LOAN_PAYMENTS_CAR_PAYMENT', label: 'Car payment', emoji: '🚗' },
      {
        key: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
        label: 'Credit card',
        emoji: '💴',
      },
      {
        key: 'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT',
        label: 'Personal loan',
        emoji: '📝',
      },
      { key: 'LOAN_PAYMENTS_MORTGAGE_PAYMENT', label: 'Mortgage', emoji: '🏠' },
      {
        key: 'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT',
        label: 'Student loan',
        emoji: '🎓',
      },
      { key: 'LOAN_PAYMENTS_OTHER_PAYMENT', label: 'Other loans', emoji: '📋' },
    ],
  },
  {
    key: 'BANK_FEES',
    label: 'Bank fees',
    emoji: '💱',
    details: [
      { key: 'BANK_FEES_ATM_FEES', label: 'ATM fees', emoji: '💸' },
      {
        key: 'BANK_FEES_FOREIGN_TRANSACTION_FEES',
        label: 'Foreign fees',
        emoji: '🌍',
      },
      {
        key: 'BANK_FEES_INSUFFICIENT_FUNDS',
        label: 'Insufficient funds',
        emoji: '🚫',
      },
      {
        key: 'BANK_FEES_INTEREST_CHARGE',
        label: 'Interest charge',
        emoji: '📉',
      },
      { key: 'BANK_FEES_OVERDRAFT_FEES', label: 'Overdraft', emoji: '🌊' },
      { key: 'BANK_FEES_OTHER_BANK_FEES', label: 'Other fees', emoji: '🧮' },
    ],
  },
  {
    key: 'FOOD_AND_DRINK',
    label: 'Food & drink',
    emoji: '🍽️',
    details: [
      {
        key: 'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR',
        label: 'Beer, wine & liquor',
        emoji: '🍷',
      },
      { key: 'FOOD_AND_DRINK_COFFEE', label: 'Coffee', emoji: '☕' },
      { key: 'FOOD_AND_DRINK_FAST_FOOD', label: 'Fast food', emoji: '🍔' },
      { key: 'FOOD_AND_DRINK_GROCERIES', label: 'Groceries', emoji: '🥬' },
      { key: 'FOOD_AND_DRINK_RESTAURANT', label: 'Eating out', emoji: '🍝' },
      {
        key: 'FOOD_AND_DRINK_VENDING_MACHINES',
        label: 'Vending machines',
        emoji: '🥤',
      },
      {
        key: 'FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK',
        label: 'More food & drink',
        emoji: '🍩',
      },
    ],
  },
  {
    key: 'GENERAL_MERCHANDISE',
    label: 'Shopping',
    emoji: '🛍️',
    details: [
      {
        key: 'GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS',
        label: 'Books & news',
        emoji: '📚',
      },
      {
        key: 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES',
        label: 'Clothing',
        emoji: '👕',
      },
      {
        key: 'GENERAL_MERCHANDISE_CONVENIENCE_STORES',
        label: 'Convenience stores',
        emoji: '🏪',
      },
      {
        key: 'GENERAL_MERCHANDISE_DEPARTMENT_STORES',
        label: 'Department stores',
        emoji: '🏬',
      },
      {
        key: 'GENERAL_MERCHANDISE_DISCOUNT_STORES',
        label: 'Discount stores',
        emoji: '🏷️',
      },
      {
        key: 'GENERAL_MERCHANDISE_ELECTRONICS',
        label: 'Electronics',
        emoji: '💻',
      },
      {
        key: 'GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES',
        label: 'Gifts',
        emoji: '🎁',
      },
      {
        key: 'GENERAL_MERCHANDISE_OFFICE_SUPPLIES',
        label: 'Office supplies',
        emoji: '📎',
      },
      {
        key: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
        label: 'Online shopping',
        emoji: '📦',
      },
      {
        key: 'GENERAL_MERCHANDISE_PET_SUPPLIES',
        label: 'Pet supplies',
        emoji: '🦴',
      },
      {
        key: 'GENERAL_MERCHANDISE_SPORTING_GOODS',
        label: 'Sporting goods',
        emoji: '⚽',
      },
      {
        key: 'GENERAL_MERCHANDISE_SUPERSTORES',
        label: 'Superstores',
        emoji: '🛒',
      },
      {
        key: 'GENERAL_MERCHANDISE_TOBACCO_AND_VAPE',
        label: 'Tobacco & vape',
        emoji: '🚬',
      },
      {
        key: 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE',
        label: 'Other shopping',
        emoji: '🧺',
      },
    ],
  },
  {
    key: 'TRANSPORTATION',
    label: 'Getting around',
    emoji: '🚦',
    details: [
      {
        key: 'TRANSPORTATION_BIKES_AND_SCOOTERS',
        label: 'Bikes & scooters',
        emoji: '🛴',
      },
      { key: 'TRANSPORTATION_GAS', label: 'Gas', emoji: '⛽' },
      { key: 'TRANSPORTATION_PARKING', label: 'Parking', emoji: '🅿️' },
      {
        key: 'TRANSPORTATION_PUBLIC_TRANSIT',
        label: 'Public transit',
        emoji: '🚇',
      },
      {
        key: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
        label: 'Rides',
        emoji: '🚕',
      },
      { key: 'TRANSPORTATION_TOLLS', label: 'Tolls', emoji: '🛣️' },
      {
        key: 'TRANSPORTATION_OTHER_TRANSPORTATION',
        label: 'Other transport',
        emoji: '🚏',
      },
    ],
  },
  {
    key: 'TRAVEL',
    label: 'Travel',
    emoji: '✈️',
    details: [
      { key: 'TRAVEL_FLIGHTS', label: 'Flights', emoji: '🛫' },
      { key: 'TRAVEL_LODGING', label: 'Hotels', emoji: '🏨' },
      { key: 'TRAVEL_RENTAL_CARS', label: 'Rental cars', emoji: '🚙' },
      { key: 'TRAVEL_OTHER_TRAVEL', label: 'Other travel', emoji: '🧳' },
    ],
  },
  {
    key: 'RENT_AND_UTILITIES',
    label: 'Bills & utilities',
    emoji: '🧾',
    details: [
      {
        key: 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',
        label: 'Gas & electric',
        emoji: '💡',
      },
      {
        key: 'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
        label: 'Internet & cable',
        emoji: '📶',
      },
      { key: 'RENT_AND_UTILITIES_RENT', label: 'Rent', emoji: '🔑' },
      {
        key: 'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT',
        label: 'Trash & sewer',
        emoji: '🗑️',
      },
      { key: 'RENT_AND_UTILITIES_TELEPHONE', label: 'Phone', emoji: '📱' },
      { key: 'RENT_AND_UTILITIES_WATER', label: 'Water', emoji: '🚰' },
      {
        key: 'RENT_AND_UTILITIES_OTHER_UTILITIES',
        label: 'Other utilities',
        emoji: '🔌',
      },
    ],
  },
  {
    key: 'HOME_IMPROVEMENT',
    label: 'Home',
    emoji: '🏡',
    details: [
      { key: 'HOME_IMPROVEMENT_FURNITURE', label: 'Furniture', emoji: '🛋️' },
      { key: 'HOME_IMPROVEMENT_HARDWARE', label: 'Hardware', emoji: '🔩' },
      {
        key: 'HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE',
        label: 'Repairs',
        emoji: '🔧',
      },
      { key: 'HOME_IMPROVEMENT_SECURITY', label: 'Home security', emoji: '🔒' },
      {
        key: 'HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT',
        label: 'Other home',
        emoji: '🪛',
      },
    ],
  },
  {
    key: 'ENTERTAINMENT',
    label: 'Fun',
    emoji: '🎉',
    details: [
      {
        key: 'ENTERTAINMENT_CASINOS_AND_GAMBLING',
        label: 'Gambling',
        emoji: '🎰',
      },
      { key: 'ENTERTAINMENT_MUSIC_AND_AUDIO', label: 'Music', emoji: '🎧' },
      {
        key: 'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS',
        label: 'Events & attractions',
        emoji: '🎢',
      },
      { key: 'ENTERTAINMENT_TV_AND_MOVIES', label: 'TV & movies', emoji: '🎬' },
      { key: 'ENTERTAINMENT_VIDEO_GAMES', label: 'Video games', emoji: '🎮' },
      {
        key: 'ENTERTAINMENT_OTHER_ENTERTAINMENT',
        label: 'Other fun',
        emoji: '🎭',
      },
    ],
  },
  {
    key: 'PERSONAL_CARE',
    label: 'Personal care',
    emoji: '🧖',
    details: [
      {
        key: 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',
        label: 'Fitness',
        emoji: '🏋️',
      },
      {
        key: 'PERSONAL_CARE_HAIR_AND_BEAUTY',
        label: 'Hair & beauty',
        emoji: '💇',
      },
      {
        key: 'PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING',
        label: 'Laundry',
        emoji: '🧼',
      },
      {
        key: 'PERSONAL_CARE_OTHER_PERSONAL_CARE',
        label: 'Other personal care',
        emoji: '🧴',
      },
    ],
  },
  {
    key: 'MEDICAL',
    label: 'Health',
    emoji: '🩺',
    details: [
      { key: 'MEDICAL_DENTAL_CARE', label: 'Dental', emoji: '🦷' },
      { key: 'MEDICAL_EYE_CARE', label: 'Eye care', emoji: '👓' },
      { key: 'MEDICAL_NURSING_CARE', label: 'Nursing care', emoji: '🛏️' },
      {
        key: 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS',
        label: 'Pharmacy',
        emoji: '💊',
      },
      { key: 'MEDICAL_PRIMARY_CARE', label: 'Doctor', emoji: '🏥' },
      { key: 'MEDICAL_VETERINARY_SERVICES', label: 'Vet', emoji: '🐾' },
      { key: 'MEDICAL_OTHER_MEDICAL', label: 'Other health', emoji: '🩹' },
    ],
  },
  {
    key: 'GENERAL_SERVICES',
    label: 'Services',
    emoji: '🛎️',
    details: [
      {
        key: 'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING',
        label: 'Accounting',
        emoji: '💼',
      },
      { key: 'GENERAL_SERVICES_AUTOMOTIVE', label: 'Auto care', emoji: '🛠️' },
      { key: 'GENERAL_SERVICES_CHILDCARE', label: 'Childcare', emoji: '🧸' },
      {
        key: 'GENERAL_SERVICES_CONSULTING_AND_LEGAL',
        label: 'Legal',
        emoji: '⚖️',
      },
      { key: 'GENERAL_SERVICES_EDUCATION', label: 'Education', emoji: '✏️' },
      { key: 'GENERAL_SERVICES_INSURANCE', label: 'Insurance', emoji: '🛡️' },
      {
        key: 'GENERAL_SERVICES_POSTAGE_AND_SHIPPING',
        label: 'Shipping',
        emoji: '📮',
      },
      { key: 'GENERAL_SERVICES_STORAGE', label: 'Storage', emoji: '🗄️' },
      {
        key: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES',
        label: 'Other services',
        emoji: '🧰',
      },
    ],
  },
  {
    key: 'GOVERNMENT_AND_NON_PROFIT',
    label: 'Government & giving',
    emoji: '🏛️',
    details: [
      {
        key: 'GOVERNMENT_AND_NON_PROFIT_DONATIONS',
        label: 'Donations',
        emoji: '💝',
      },
      {
        key: 'GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES',
        label: 'Government',
        emoji: '🏤',
      },
      {
        key: 'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT',
        label: 'Taxes',
        emoji: '💲',
      },
      {
        key: 'GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT',
        label: 'Other government',
        emoji: '🗳️',
      },
    ],
  },
] as const

export type PlaidPrimaryCategory = (typeof PLAID_CATEGORY_GROUPS)[number]['key']
export type PlaidDetailedCategory =
  (typeof PLAID_CATEGORY_GROUPS)[number]['details'][number]['key']

export const CATEGORY_OPTIONS: CategoryOption[] = PLAID_CATEGORY_GROUPS.map(
  ({ key, label, emoji }) => ({ key, label, emoji, kind: 'primary' }),
)

export const DETAILED_CATEGORY_OPTIONS: CategoryOption[] =
  PLAID_CATEGORY_GROUPS.flatMap((group) =>
    group.details.map((detail) => ({
      key: detail.key,
      label: detail.label,
      emoji: detail.emoji,
      groupKey: group.key,
      groupLabel: group.label,
      kind: 'detailed' as const,
    })),
  )

export const CATEGORY_PICKER_OPTIONS: CategoryOption[] =
  DETAILED_CATEGORY_OPTIONS

/**
 * Common personal-finance categories used to warm up a new user's Recents so
 * the dropdown is useful with zero setup. Real usage replaces these over time.
 * Ordered most-common first.
 */
export const DEFAULT_RECENTS: ReadonlyArray<{
  label: string
  categoryKey: PlaidDetailedCategory
  emoji: string
}> = [
  { label: 'Groceries', categoryKey: 'FOOD_AND_DRINK_GROCERIES', emoji: '🥬' },
  {
    label: 'Eating out',
    categoryKey: 'FOOD_AND_DRINK_RESTAURANT',
    emoji: '🍝',
  },
  { label: 'Coffee', categoryKey: 'FOOD_AND_DRINK_COFFEE', emoji: '☕' },
  { label: 'Gas', categoryKey: 'TRANSPORTATION_GAS', emoji: '⛽' },
  {
    label: 'Rides',
    categoryKey: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
    emoji: '🚕',
  },
  { label: 'Rent', categoryKey: 'RENT_AND_UTILITIES_RENT', emoji: '🔑' },
  {
    label: 'Online shopping',
    categoryKey: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
    emoji: '📦',
  },
  { label: 'Paycheck', categoryKey: 'INCOME_WAGES', emoji: '💵' },
]

const LABEL_BY_KEY = new Map(
  [...CATEGORY_OPTIONS, ...DETAILED_CATEGORY_OPTIONS].map((o) => [
    o.key,
    o.label,
  ]),
)
const OPTION_BY_KEY = new Map(
  [
    ...CATEGORY_OPTIONS,
    ...DETAILED_CATEGORY_OPTIONS,
    UNCATEGORIZED_CATEGORY,
  ].map((o) => [o.key, o]),
)
const PRIMARY_KEYS = new Set<string>(CATEGORY_OPTIONS.map((o) => o.key))
const DETAILED_KEYS = new Set<string>(
  DETAILED_CATEGORY_OPTIONS.map((o) => o.key),
)
const EMOJI_BY_LABEL = new Map<string, string>(
  [...CATEGORY_OPTIONS, ...DETAILED_CATEGORY_OPTIONS]
    .filter((o) => o.emoji)
    .map((o) => [o.label.toLowerCase(), o.emoji as string]),
)

/**
 * Emoji for a friendly category *label* (e.g. "Groceries" → 🥬). Used where a
 * grouping surfaces the display label rather than the Plaid key (e.g. breakdown
 * cards grouped by an overridden `userCategory`). Returns '' when unknown.
 */
export function categoryEmojiForLabel(label?: string | null): string {
  if (!label) return ''
  return EMOJI_BY_LABEL.get(label.trim().toLowerCase()) ?? ''
}

export function isPlaidPrimaryCategory(
  value?: string | null,
): value is PlaidPrimaryCategory {
  return Boolean(value && PRIMARY_KEYS.has(value))
}

export function isPlaidDetailedCategory(
  value?: string | null,
): value is PlaidDetailedCategory {
  return Boolean(value && DETAILED_KEYS.has(value))
}

export function friendlyCategory(
  raw?: string | null,
  preferences?: CategoryPreferenceLike[],
): string {
  if (!raw) return 'Uncategorized'
  const preference = preferenceFor(raw, preferences)
  if (preference?.hidden) return UNCATEGORIZED_CATEGORY.label
  if (preference?.mappedTo?.trim()) return preference.mappedTo.trim()
  if (preference?.label?.trim()) return preference.label.trim()
  return LABEL_BY_KEY.get(raw) ?? rawCategoryLabel(raw)
}

export function categoryLabel(
  tx: {
    userCategory?: string
    category?: string[]
    providerCategoryPrimary?: string
    providerCategoryDetailed?: string
  },
  catalog?: CategoryCatalogLike,
): string {
  const override = tx.userCategory?.trim()
  if (override) return override
  return providerCategoryLabel(tx, catalog?.preferences)
}

export function providerCategoryLabel(
  tx: {
    category?: string[]
    providerCategoryPrimary?: string
    providerCategoryDetailed?: string
  },
  preferences?: CategoryPreferenceLike[],
): string {
  const detailed =
    tx.providerCategoryDetailed ??
    tx.category?.find((entry) => isPlaidDetailedCategory(entry))
  if (detailed) return friendlyCategory(detailed, preferences)
  const primary =
    tx.providerCategoryPrimary ??
    tx.category?.find((entry) => isPlaidPrimaryCategory(entry)) ??
    tx.category?.[0]
  return friendlyCategory(primary, preferences)
}

export function categoryEmoji(
  tx: {
    userCategory?: string
    category?: string[]
    providerCategoryPrimary?: string
    providerCategoryDetailed?: string
  },
  catalog?: CategoryCatalogLike,
): string {
  const override = tx.userCategory?.trim()
  if (override) {
    const custom = catalog?.categories?.find(
      (category) =>
        category.label.trim().toLowerCase() === override.toLowerCase(),
    )
    if (custom?.emoji) return custom.emoji
  }

  const detailed =
    tx.providerCategoryDetailed ??
    tx.category?.find((entry) => isPlaidDetailedCategory(entry))
  if (detailed) return categoryEmojiForKey(detailed, catalog?.preferences)

  const primary =
    tx.providerCategoryPrimary ??
    tx.category?.find((entry) => isPlaidPrimaryCategory(entry)) ??
    tx.category?.[0]
  return categoryEmojiForKey(primary, catalog?.preferences)
}

export function categoryEmojiForKey(
  raw?: string | null,
  preferences?: CategoryPreferenceLike[],
): string {
  if (!raw) return UNCATEGORIZED_CATEGORY.emoji ?? '❔'
  const preference = preferenceFor(raw, preferences)
  if (preference?.hidden) return UNCATEGORIZED_CATEGORY.emoji ?? '❔'
  if (preference?.emoji) return preference.emoji
  return OPTION_BY_KEY.get(raw)?.emoji ?? UNCATEGORIZED_CATEGORY.emoji ?? '❔'
}

export function applyCategoryPreferences(
  option: CategoryOption,
  preferences?: CategoryPreferenceLike[],
): CategoryOption | null {
  const preference = preferenceFor(option.key, preferences)
  if (preference?.hidden) return null
  if (preference?.mappedTo?.trim()) return null
  return {
    ...option,
    label: preference?.label?.trim() || option.label,
    emoji: preference?.emoji || option.emoji,
  }
}

export function categoryPreferenceFor(
  key: string,
  preferences?: CategoryPreferenceLike[],
): CategoryPreferenceLike | undefined {
  return preferenceFor(key, preferences)
}

function preferenceFor(
  key: string,
  preferences?: CategoryPreferenceLike[],
): CategoryPreferenceLike | undefined {
  if (!preferences?.length) return undefined
  return preferences.find((preference) => preference.key === key)
}

function rawCategoryLabel(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .map((word) => {
      if (word === 'and') return '&'
      if (word === 'atm') return 'ATM'
      if (word === 'tv') return 'TV'
      if (word === 'ev') return 'EV'
      return word ? word.charAt(0).toUpperCase() + word.slice(1) : word
    })
    .join(' ')
}

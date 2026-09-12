import type { Folder, Recipe } from '../lib/types'
import { z } from 'zod'

const MAX_NATIVE_ASSETS = 16

export const nativeReadParamsSchema = z
  .object({
    route: z.enum([
      'library',
      'collection',
      'recipe',
      'ingredients',
      'cook-step',
      'edit',
      'new',
    ]),
    id: z.string().trim().optional(),
    view: z.enum(['favorites', 'folder']).optional(),
    stepIndex: z.number().int().min(0).max(99).optional(),
    limit: z.number().int().min(1).max(MAX_NATIVE_ASSETS).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ['recipe', 'ingredients', 'cook-step', 'edit'].includes(value.route) &&
      !value.id
    ) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'id is required for this recipe route.',
      })
    }
    if (value.route === 'collection' && !value.view) {
      context.addIssue({
        code: 'custom',
        path: ['view'],
        message: 'view is required for recipe collections.',
      })
    }
    if (value.view === 'folder' && !value.id) {
      context.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'id is required for a recipe folder.',
      })
    }
  })

export type NativeReadParams = z.infer<typeof nativeReadParamsSchema>

export const nativeMutateParamsSchema = z
  .object({
    action: z.literal('favorite'),
    id: z.string().trim().min(1),
    favorite: z.boolean(),
  })
  .strict()

export const nativeSearchParamsSchema = z
  .object({ query: z.string().trim().min(1).max(100) })
  .strict()
export const nativeManageParamsSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('create-folder'),
      name: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({
      action: z.literal('rename-folder'),
      folderId: z.string().min(1),
      name: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({
      action: z.literal('move-recipe'),
      id: z.string().min(1),
      folderId: z.string().nullable(),
    })
    .strict(),
])
const nativeRecipeFieldsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  category: z.string().max(120),
  servings: z.string().max(120),
  prepTime: z.string().max(120),
  cookingTime: z.string().max(120),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  ingredientsText: z.string().max(10000),
  instructions: z.string().max(30000),
  tagsText: z.string().max(2000),
  sourceUrl: z.string().max(2000),
})
export const nativeUpdateParamsSchema = nativeRecipeFieldsSchema
  .extend({ id: z.string().min(1) })
  .strict()
export const nativeCreateParamsSchema = nativeRecipeFieldsSchema.strict()
export const nativeDeleteParamsSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('delete-recipe'), id: z.string().min(1) })
    .strict(),
  z
    .object({ action: z.literal('delete-folder'), folderId: z.string().min(1) })
    .strict(),
])

function plainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function imagePath(imageUrl: string | undefined): string | null {
  if (!imageUrl) return null
  const normalized = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl
  const candidate = normalized.startsWith('recipes/')
    ? `public/${normalized}`
    : normalized
  if (!candidate.startsWith('assets/') && !candidate.startsWith('public/')) {
    return null
  }
  if (
    candidate.includes('\\') ||
    candidate.includes(':') ||
    candidate
      .split('/')
      .some((segment) => !segment || segment === '.' || segment === '..') ||
    !/\.(?:png|jpe?g|gif|webp)$/i.test(candidate)
  ) {
    return null
  }
  return candidate
}

function splitSteps(markdown: string): string[] {
  const text = markdown.trim()
  if (!text) return []
  const ordered = text.match(/^\s*\d+[.)]\s+.+(?:\n(?!\s*\d+[.)]).*)*/gm)
  const chunks =
    ordered && ordered.length > 1
      ? ordered.map((step) => step.replace(/^\s*\d+[.)]\s+/, '').trim())
      : text
          .split(/\n{2,}/)
          .map((step) => step.trim())
          .filter(Boolean)
  return chunks.map(plainText).filter(Boolean)
}

function imagePresentation(
  path: string | null,
  title: string,
  placeholder: string,
) {
  return {
    images: path ? [{ url: path, title }] : [],
    imagePlaceholders: path ? [] : [{ title: placeholder }],
  }
}

function recipeCard(recipe: Recipe) {
  const path = imagePath(recipe.imageUrl)
  return {
    id: recipe.id,
    title: recipe.title,
    subtitle:
      [recipe.category, recipe.cookingTime].filter(Boolean).join(' · ') ||
      'Saved recipe',
    imageURL: path ?? '',
    favoriteLabel: recipe.isFavorite ? 'Remove favorite' : 'Add to favorites',
    favoriteValue: !recipe.isFavorite,
    recipeName: recipe.title,
  }
}

function findFolderCover(folder: Folder, recipesById: Map<string, Recipe>) {
  for (const recipeId of folder.recipeIds) {
    const recipe = recipesById.get(recipeId)
    const path = imagePath(recipe?.imageUrl)
    if (path) return { path, title: recipe?.title ?? folder.name }
  }
  return null
}

export function projectNativeLibrary(
  recipes: Recipe[],
  folders: Folder[],
  limit = MAX_NATIVE_ASSETS,
) {
  const live = recipes
    .filter((recipe) => !recipe.isDeleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const recipesById = new Map(live.map((recipe) => [recipe.id, recipe]))
  const visibleFolders = folders.slice(0, 8).map((folder) => {
    const cover = findFolderCover(folder, recipesById)
    return {
      id: folder.id,
      name: folder.name,
      countLabel: `${folder.recipeIds.filter((id) => recipesById.has(id)).length} recipes`,
      imageURL: cover?.path ?? '',
    }
  })
  const folderAssetCount = visibleFolders.filter(
    (folder) => folder.imageURL.length > 0,
  ).length
  const recent = live.slice(
    0,
    Math.max(0, Math.min(limit, MAX_NATIVE_ASSETS - folderAssetCount)),
  )
  const favoritesCount = live.filter((recipe) => recipe.isFavorite).length
  const filedRecipeIds = new Set(folders.flatMap((folder) => folder.recipeIds))
  const libraryRecipes = live.filter((recipe) => !filedRecipeIds.has(recipe.id))
  const visibleLibraryRecipes = libraryRecipes.slice(0, limit)
  return {
    summary: `${live.length} ${live.length === 1 ? 'recipe' : 'recipes'} · ${folders.length} ${folders.length === 1 ? 'collection' : 'collections'}`,
    draftQuery: '',
    scope: 'all',
    recipes: visibleLibraryRecipes.map(recipeCard),
    collectionDestinations: [
      {
        title: 'Collections',
        subtitle: `${folders.length} ${folders.length === 1 ? 'collection' : 'collections'}`,
      },
    ],
    collectionRows: [
      ...(favoritesCount > 0
        ? [
            {
              title: 'Favorites',
              subtitle: `${favoritesCount} saved`,
              view: 'favorites',
              folderId: '',
              icon: 'heart.fill',
            },
          ]
        : []),
      ...visibleFolders.map((folder) => ({
        title: folder.name,
        subtitle: folder.countLabel,
        view: 'folder',
        folderId: folder.id,
        icon: 'folder',
      })),
    ],
    folderDrafts: [{ name: '' }],
    folderSections:
      visibleFolders.length > 0
        ? [
            {
              title: 'Collections',
              subtitle: `${folders.length} organized spaces`,
              items: visibleFolders,
            },
          ]
        : [],
    folderNotice:
      folders.length > visibleFolders.length
        ? `Showing ${visibleFolders.length} of ${folders.length} collections.`
        : '',
    recipeSections:
      recent.length > 0
        ? [
            {
              title: 'Recently updated',
              subtitle: `${recent.length} ${recent.length === 1 ? 'recipe' : 'recipes'}`,
              items: recent.map(recipeCard),
            },
          ]
        : [],
    favoritesDestinations:
      favoritesCount > 0
        ? [{ label: `Favorites · ${favoritesCount}`, route: 'favorites' }]
        : [],
    emptyStates:
      live.length === 0
        ? [
            {
              title: 'Your cookbook is empty',
              description:
                'Add recipes and organize collections from the desktop app.',
            },
          ]
        : [],
  }
}

export function projectNativeCollection(
  recipes: Recipe[],
  folders: Folder[],
  params: NativeReadParams,
) {
  const live = recipes
    .filter((recipe) => !recipe.isDeleted)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const limit = params.limit ?? MAX_NATIVE_ASSETS
  let title = 'Favorite recipes'
  let subtitle = 'Saved for quick access'
  let selected = live.filter((recipe) => recipe.isFavorite)
  let emptyTitle = 'No favorites yet'
  let emptyDescription =
    'Favorite recipes from the desktop app to keep them here.'
  let selectedFolder: Folder | undefined

  if (params.view === 'folder') {
    const folder = folders.find((item) => item.id === params.id)
    if (!folder) return null
    selectedFolder = folder
    const byId = new Map(live.map((recipe) => [recipe.id, recipe]))
    title = folder.name
    subtitle = `${folder.recipeIds.filter((id) => byId.has(id)).length} recipes`
    selected = folder.recipeIds
      .map((id) => byId.get(id))
      .filter((recipe): recipe is Recipe => Boolean(recipe))
    emptyTitle = 'This collection is empty'
    emptyDescription = 'Move recipes into this collection from the desktop app.'
  }

  const visible = selected.slice(0, limit)
  return {
    title,
    subtitle,
    recipes: visible.map(recipeCard),
    truncationNotice:
      selected.length > visible.length
        ? `Showing ${visible.length} of ${selected.length} recipes.`
        : '',
    emptyStates:
      selected.length === 0
        ? [{ title: emptyTitle, description: emptyDescription }]
        : [],
    folderEdits: selectedFolder
      ? [{ folderId: selectedFolder.id, name: selectedFolder.name }]
      : [],
    folderDeleteActions: selectedFolder
      ? [{ folderId: selectedFolder.id, label: 'Delete collection' }]
      : [],
    folderName: selectedFolder?.name ?? '',
  }
}

function recipeMeta(recipe: Recipe) {
  return [
    recipe.prepTime ? { label: 'Prep', value: recipe.prepTime } : null,
    recipe.cookingTime ? { label: 'Cook', value: recipe.cookingTime } : null,
    recipe.servings ? { label: 'Serves', value: recipe.servings } : null,
    recipe.difficulty
      ? { label: 'Difficulty', value: recipe.difficulty }
      : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item))
}

export function projectNativeRecipe(
  recipe: Recipe,
  route: 'recipe' | 'ingredients' | 'cook-step',
  stepIndex = 0,
  folders: Folder[] = [],
) {
  if (route === 'ingredients') {
    return {
      id: recipe.id,
      title: recipe.title,
      ingredientCountLabel: `${recipe.ingredients.length} ${recipe.ingredients.length === 1 ? 'ingredient' : 'ingredients'}`,
      ingredients: recipe.ingredients.map((value) => ({
        title: plainText(value),
        checked: false,
      })),
      emptyStates:
        recipe.ingredients.length === 0
          ? [
              {
                title: 'No ingredients saved',
                description: 'Add ingredients from the desktop recipe editor.',
              },
            ]
          : [],
      cookDestinations:
        splitSteps(recipe.instructions).length > 0
          ? [{ label: 'Start cooking', stepIndex: 0 }]
          : [],
    }
  }

  if (route === 'cook-step') {
    const steps = splitSteps(recipe.instructions)
    if (steps.length === 0 || stepIndex >= steps.length) return null
    const isFirst = stepIndex === 0
    const isLast = stepIndex === steps.length - 1
    return {
      id: recipe.id,
      title: recipe.title,
      stepLabel: `Step ${stepIndex + 1} of ${steps.length}`,
      progress: (stepIndex + 1) / steps.length,
      stepCards: [{ text: steps[stepIndex] }],
      previousDestinations: isFirst
        ? []
        : [{ label: 'Previous', stepIndex: stepIndex - 1 }],
      nextDestinations: isLast
        ? []
        : [
            {
              label: `Continue to step ${stepIndex + 2}`,
              stepIndex: stepIndex + 1,
            },
          ],
      completionPanels: isLast
        ? [
            {
              title: 'Ready to serve',
              message: 'That was the final saved step. Enjoy your meal.',
            },
          ]
        : [],
    }
  }

  const path = imagePath(recipe.imageUrl)
  const hasCookSteps = splitSteps(recipe.instructions).length > 0
  return {
    id: recipe.id,
    title: recipe.title,
    description: plainText(recipe.description),
    ...imagePresentation(path, recipe.title, 'No recipe photo'),
    categoryTags: recipe.category ? [recipe.category] : [],
    hasCookSteps,
    hasIngredients: recipe.ingredients.length > 0,
    favoriteLabel: recipe.isFavorite ? 'Remove favorite' : 'Add to favorites',
    favoriteValue: !recipe.isFavorite,
    meta: recipeMeta(recipe),
    favoriteBadges: recipe.isFavorite
      ? [{ text: 'Favorite', icon: 'heart.fill' }]
      : [],
    favoriteActions: [
      {
        label: recipe.isFavorite ? 'Remove favorite' : 'Add to favorites',
        recipeId: recipe.id,
        favorite: !recipe.isFavorite,
      },
    ],
    editDestinations: [{ label: 'Edit recipe' }],
    moveActions: [
      { label: 'Move to Library', recipeId: recipe.id, folderId: null },
      ...folders.map((folder) => ({
        label: `Move to ${folder.name}`,
        recipeId: recipe.id,
        folderId: folder.id,
      })),
    ],
    deleteActions: [{ label: 'Delete recipe', recipeId: recipe.id }],
    ingredientDestinations: [{ label: 'Check ingredients' }],
    cookDestinations: hasCookSteps
      ? [{ label: 'Start cook mode', stepIndex: 0 }]
      : [],
    noStepsNotices:
      splitSteps(recipe.instructions).length === 0
        ? [
            {
              message:
                'No cooking steps are saved yet. Add them from the desktop app.',
            },
          ]
        : [],
  }
}

export function projectNativeRecipeEditor(recipe: Recipe) {
  return {
    id: recipe.id,
    draft: [
      {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? '',
        category: recipe.category ?? '',
        servings: recipe.servings ?? '',
        prepTime: recipe.prepTime ?? '',
        cookingTime: recipe.cookingTime ?? '',
        difficulty: recipe.difficulty ?? 'Medium',
        ingredientsText: recipe.ingredients.join('\n'),
        instructions: recipe.instructions ?? '',
        tagsText: (recipe.tags ?? []).join(', '),
        sourceUrl: recipe.sourceUrl ?? '',
      },
    ],
    notices: recipe.imageUrl
      ? [
          {
            title: 'Photo preserved',
            message: 'Editing text will keep the current recipe photo.',
          },
        ]
      : [],
  }
}

export function projectNativeNewRecipeEditor() {
  return {
    draft: [
      {
        title: '',
        description: '',
        category: '',
        servings: '',
        prepTime: '',
        cookingTime: '',
        difficulty: 'Medium',
        ingredientsText: '',
        instructions: '',
        tagsText: '',
        sourceUrl: '',
      },
    ],
    notices: [
      {
        title: 'Add the photo later',
        message:
          'The text recipe is available immediately. Photo upload still uses the verified desktop picker.',
      },
    ],
  }
}

export function projectNativeRecipeSearch(recipes: Recipe[], query: string) {
  const normalized = plainText(query).toLowerCase()
  const results = recipes
    .filter((recipe) => !recipe.isDeleted)
    .filter((recipe) =>
      [
        recipe.title,
        recipe.description,
        recipe.category,
        ...(recipe.tags ?? []),
        ...recipe.ingredients,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    )
    .slice(0, MAX_NATIVE_ASSETS)
    .map(recipeCard)
  return {
    results,
    notices:
      results.length === 0
        ? [
            {
              title: 'No recipes found',
              message: 'Try another title, ingredient, category, or tag.',
            },
          ]
        : [],
  }
}

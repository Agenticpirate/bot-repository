import type { Plant } from '../lib/types'
import { z } from 'zod'

export const collectionInputSchema = z
  .object({ plantIds: z.array(z.string().min(1).max(128)).min(1).max(8) })
  .strict()
export const collectionWaterSchema = collectionInputSchema
  .extend({
    plantId: z.string().min(1).max(128),
    expectedUpdatedAt: z.string().min(1).max(128),
  })
  .strict()

export async function handlePlantCard(
  method: string,
  value: unknown,
  options: {
    load: () => Promise<Plant[]>
    water: (id: string, revision: string) => Promise<Plant | null>
  },
) {
  if (method === 'plants.cards.water') {
    const input = collectionWaterSchema.parse(value)
    if (!input.plantIds.includes(input.plantId))
      throw new Error('This plant is not part of the card.')
    const plant = await options.water(input.plantId, input.expectedUpdatedAt)
    if (!plant)
      throw new Error('This plant is no longer available for watering.')
    return { watered: true, plantId: plant.id }
  }
  const input = collectionInputSchema.parse(value)
  const plants = (await options.load()).filter(
    (plant) => input.plantIds.includes(plant.id) && !plant.isDeleted,
  )
  if (method === 'plants.cards.present') {
    if (!plants.length)
      throw new Error('None of the selected plants are available.')
    return {
      appCard: {
        version: 1,
        title:
          plants.length === 1
            ? plants[0]!.commonName
            : `${plants.length} plants to check`,
        resourcePath: '/index.html?card=collection',
        input: { plantIds: plants.map((plant) => plant.id) },
        readMethod: 'plants.cards.read',
        actions: [
          {
            id: 'water',
            label: 'Mark plant watered',
            method: 'plants.cards.water',
          },
        ],
        height: 460,
      },
    }
  }
  if (method !== 'plants.cards.read')
    throw new Error('Unknown Plants card operation.')
  return {
    plants: plants.map((plant) => ({
      id: plant.id,
      commonName: plant.commonName,
      nickname: plant.nickname,
      heroImageUrl: plant.heroImageUrl,
      scientificName: plant.scientificName,
      room: plant.room,
      location: plant.location,
      waterIntervalDays: plant.waterIntervalDays,
      lastWateredAt: plant.lastWateredAt,
      snoozeUntil: plant.snoozeUntil,
      ownershipStatus: plant.ownershipStatus,
      lifeStatus: plant.lifeStatus,
      createdAt: plant.createdAt,
      updatedAt: plant.updatedAt,
      care: plant.care,
      notes: plant.notes,
    })),
  }
}

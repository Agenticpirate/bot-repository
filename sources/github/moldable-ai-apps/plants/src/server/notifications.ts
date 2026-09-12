import type { Plant } from '../lib/types'

export interface PlantNotificationSchedule {
  id: string
  revision: string
  deliverAt: string
  title: string
  body: string
  deepLink: string
  imagePath?: string
}

export function plantNotificationSchedules(
  plants: Plant[],
): PlantNotificationSchedule[] {
  return plants
    .filter(
      (plant) =>
        !plant.isDeleted &&
        plant.ownershipStatus !== 'wishlist' &&
        plant.lifeStatus !== 'deceased' &&
        Number.isInteger(plant.waterIntervalDays) &&
        (plant.waterIntervalDays ?? 0) > 0,
    )
    .map((plant) => {
      const anchor = plant.lastWateredAt ?? plant.createdAt
      const intervalDays = plant.waterIntervalDays!
      const deliverAt = new Date(
        new Date(anchor).getTime() + intervalDays * 24 * 60 * 60 * 1_000,
      ).toISOString()
      const nickname = plant.nickname?.trim()
      const title = nickname || plant.commonName
      const context = [plant.room, plant.location]
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
      const identity =
        nickname &&
        nickname.toLocaleLowerCase() !== plant.commonName.toLocaleLowerCase()
          ? plant.commonName
          : null
      const body = [identity, ...context, 'Time to water.']
        .filter((part): part is string => Boolean(part))
        .join(' · ')
      const imagePath =
        plant.heroImageUrl &&
        !plant.heroImageUrl.startsWith('/') &&
        !plant.heroImageUrl.includes('..')
          ? plant.heroImageUrl
          : undefined
      return {
        id: `plant:${plant.id}`,
        revision: `water:${anchor}:${intervalDays}`,
        deliverAt,
        title,
        body,
        deepLink: `plant:${plant.id}`,
        ...(imagePath ? { imagePath } : {}),
      }
    })
}

export async function syncPlantNotificationSchedules(
  plants: Plant[],
  workspaceId: string | undefined,
  options: {
    aiServerUrl?: string
    appToken?: string
    fetchImplementation?: typeof fetch
  } = {},
): Promise<void> {
  if (!workspaceId) return
  const aiServerUrl = options.aiServerUrl ?? process.env.MOLDABLE_AI_SERVER_URL
  const appToken = options.appToken ?? process.env.MOLDABLE_APP_TOKEN
  if (!aiServerUrl || !appToken) return
  const fetchImplementation = options.fetchImplementation ?? fetch
  const response = await fetchImplementation(
    `${aiServerUrl.replace(/\/+$/, '')}/api/notifications/schedules`,
    {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-moldable-app-id': 'plants',
        'x-moldable-app-token': appToken,
      },
      body: JSON.stringify({
        appId: 'plants',
        workspaceId,
        schedules: plantNotificationSchedules(plants),
      }),
    },
  )
  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 500)
    throw new Error(
      `Moldable notification scheduling failed (${response.status})${
        detail ? `: ${detail}` : ''
      }`,
    )
  }
}

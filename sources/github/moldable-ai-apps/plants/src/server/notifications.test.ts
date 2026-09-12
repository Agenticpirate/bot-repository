import type { Plant } from '../lib/types'
import {
  plantNotificationSchedules,
  syncPlantNotificationSchedules,
} from './notifications'
import { describe, expect, it, vi } from 'vitest'

const plant: Plant = {
  id: 'plant-one',
  commonName: 'Echeveria',
  nickname: 'Rosie',
  room: 'Ella',
  heroImageUrl: 'assets/rosie.jpg',
  waterIntervalDays: 14,
  lastWateredAt: '2026-07-25T12:00:00.000Z',
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-25T12:00:00.000Z',
  isFavorite: false,
  isDeleted: false,
  waterHistory: [],
}

describe('watering notification schedules', () => {
  it('uses a stable plant identity, nickname, due date, and photo', () => {
    expect(plantNotificationSchedules([plant])).toEqual([
      {
        id: 'plant:plant-one',
        revision: 'water:2026-07-25T12:00:00.000Z:14',
        deliverAt: '2026-08-08T12:00:00.000Z',
        title: 'Rosie',
        body: 'Echeveria · Ella · Time to water.',
        deepLink: 'plant:plant-one',
        imagePath: 'assets/rosie.jpg',
      },
    ])
  })

  it('does not schedule wishlist plants', () => {
    expect(
      plantNotificationSchedules([
        { ...plant, ownershipStatus: 'wishlist', waterIntervalDays: 14 },
      ]),
    ).toEqual([])
  })

  it('does not schedule memorial plants', () => {
    expect(
      plantNotificationSchedules([
        {
          ...plant,
          lifeStatus: 'deceased',
          deceasedAt: '2026-08-04T12:00:00.000Z',
        },
      ]),
    ).toEqual([])
  })

  it('reconciles through the app-authenticated host API', async () => {
    const fetchImplementation = vi.fn(async () => Response.json({ ok: true }))
    await syncPlantNotificationSchedules([plant], 'personal', {
      aiServerUrl: 'http://127.0.0.1:39200',
      appToken: 'app-capability',
      fetchImplementation,
    })
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:39200/api/notifications/schedules',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'x-moldable-app-id': 'plants',
          'x-moldable-app-token': 'app-capability',
        }),
      }),
    )
  })
})

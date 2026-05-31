import { describe, it, expect } from 'vitest'
import { serialize, deserialize } from '../../src/core/serializer'
import type { BuildingMap } from '../../src/core/types'

const sample: BuildingMap = {
  id: 'test',
  name: 'Test Building',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  defaultFloor: 0,
  floors: [
    {
      floorIndex: 0,
      label: 'Ground',
      order: 0,
      width: 2,
      height: 2,
      base: [
        ['floor', 'wall'],
        ['floor', 'floor'],
      ],
      overlay: [
        [null, null],
        ['door', 'room'],
      ],
      meta: { '1,0': { label: 'Hall', weight: 1 } },
    },
  ],
}

describe('serializer', () => {
  it('serializes and deserializes back to the same data', () => {
    const json = serialize(sample)
    const parsed = deserialize(json)
    expect(parsed.id).toBe(sample.id)
    expect(parsed.name).toBe(sample.name)
    expect(parsed.floors.length).toBe(1)
    expect(parsed.floors[0].base[0][0]).toBe('floor')
    expect(parsed.floors[0].overlay[0][0]).toBe(null)
    expect(parsed.floors[0].overlay[1][0]).toBe('door')
    expect(parsed.floors[0].meta['1,0']?.label).toBe('Hall')
  })

  it('produces valid JSON', () => {
    const json = serialize(sample)
    expect(() => JSON.parse(json)).not.toThrow()
  })
})

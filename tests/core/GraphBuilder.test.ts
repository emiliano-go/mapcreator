import { describe, it, expect } from 'vitest'
import { buildGraph } from '../../src/core/GraphBuilder'
import type { BuildingMap } from '../../src/core/types'

function makeMap(overrides?: Partial<BuildingMap>): BuildingMap {
  return {
    id: 'test',
    name: 'Test',
    version: '1.0.0',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    defaultFloor: 0,
    floors: [
      {
        floorIndex: 0,
        label: 'Piso 0',
        order: 0,
        width: 3,
        height: 3,
        base: [
          ['floor', 'floor', 'floor'],
          ['floor', 'wall', 'floor'],
          ['floor', 'floor', 'floor'],
        ],
        overlay: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        meta: {},
      },
    ],
    ...overrides,
  }
}

describe('GraphBuilder', () => {
  it('creates adjacency graph from a simple map', () => {
    const data = buildGraph(makeMap())
    expect(data.adjacency.size).toBe(8)
  })

  it('skips wall tiles', () => {
    const data = buildGraph(makeMap())
    const wallPos = '0:1:1'
    expect(data.adjacency.has(wallPos)).toBe(false)
  })

  it('creates correct edges for a center-free grid', () => {
    const data = buildGraph(makeMap())
    const corner = data.adjacency.get('0:0:0')
    expect(corner).toBeDefined()
    expect(corner!.length).toBe(2)
  })

  it('handles stairs cross-floor connections with toFloorSuperior/toFloorInferior', () => {
    const map: BuildingMap = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      defaultFloor: 0,
      floors: [
        {
          floorIndex: 0,
          label: 'Piso 0',
          order: 0,
          width: 2,
          height: 2,
          base: [
            ['stairs', 'floor'],
            ['floor', 'floor'],
          ],
          overlay: [
            [null, null],
            [null, null],
          ],
          meta: { '0,0': { toFloorSuperior: 1 } },
        },
        {
          floorIndex: 1,
          label: 'Piso 1',
          order: 1,
          width: 2,
          height: 2,
          base: [
            ['stairs', 'floor'],
            ['floor', 'floor'],
          ],
          overlay: [
            [null, null],
            [null, null],
          ],
          meta: { '0,0': { toFloorInferior: 0 } },
        },
      ],
    }
    const data = buildGraph(map)
    const stair0 = data.adjacency.get('0:0:0')
    expect(stair0).toBeDefined()
    expect(stair0!.some((e) => e.crossFloor && e.to === '1:0:0')).toBe(true)
  })

  it('applies door weight', () => {
    const map: BuildingMap = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      defaultFloor: 0,
      floors: [
        {
          floorIndex: 0,
          label: 'Piso 0',
          order: 0,
          width: 2,
          height: 1,
          base: [['floor', 'wall']],
          overlay: [[null, 'door']],
          meta: { '0,1': { weight: 3 } },
        },
      ],
    }
    const data = buildGraph(map)
    const edges = data.adjacency.get('0:0:0')
    expect(edges).toBeDefined()
    const doorEdge = edges!.find((e) => e.to === '0:0:1')
    expect(doorEdge).toBeDefined()
    expect(doorEdge!.weight).toBe(4)
  })
})

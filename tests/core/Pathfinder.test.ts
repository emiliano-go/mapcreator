import { describe, it, expect } from 'vitest'
import { buildGraph } from '../../src/core/GraphBuilder'
import { findPath } from '../../src/core/Pathfinder'
import type { BuildingMap, GraphData } from '../../src/core/types'

function g(map: BuildingMap): GraphData {
  return buildGraph(map)
}

function simpleMap(): BuildingMap {
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
        height: 1,
        base: [['floor', 'floor', 'floor']],
        overlay: [[null, null, null]],
        meta: {},
      },
    ],
  }
}

function blockedMap(): BuildingMap {
  return {
    id: 'blocked',
    name: 'Blocked',
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
        height: 1,
        base: [['floor', 'wall', 'floor']],
        overlay: [[null, null, null]],
        meta: {},
      },
    ],
  }
}

describe('Pathfinder', () => {
  it('finds a straight path in a line', () => {
    const result = findPath(g(simpleMap()), '0:0:0', '0:0:2')
    expect(result.found).toBe(true)
    expect(result.path.length).toBeGreaterThanOrEqual(2)
    expect(result.path[0].id).toBe('0:0:0')
    expect(result.path[result.path.length - 1].id).toBe('0:0:2')
  })

  it('returns not found for unreachable targets', () => {
    const result = findPath(g(blockedMap()), '0:0:0', '0:0:2')
    expect(result.found).toBe(false)
  })

  it('returns not found for invalid node ids', () => {
    const result = findPath(g(simpleMap()), '0:0:0', 'invalid')
    expect(result.found).toBe(false)
  })

  it('counts floor changes', () => {
    const map: BuildingMap = {
      id: 'multi',
      name: 'Multi',
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
    const result = findPath(g(map), '0:0:1', '1:0:1')
    expect(result.found).toBe(true)
    expect(result.floorChanges).toBeGreaterThanOrEqual(1)
  })

  it('respects maxFloorChanges option', () => {
    const map: BuildingMap = {
      id: 'multi',
      name: 'Multi',
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
    const result = findPath(g(map), '0:0:1', '1:0:1', { maxFloorChanges: 0 })
    expect(result.found).toBe(false)
  })
})

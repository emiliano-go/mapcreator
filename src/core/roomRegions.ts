import type {
  BuildingMap,
  MapFloor,
  OverlayType,
  PathfinderOptions,
  PathResult,
  RoomRegion,
} from './types'
import { buildGraph } from './GraphBuilder'
import { findPath } from './Pathfinder'

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]]

export function findRoomRegions(floor: MapFloor): RoomRegion[] {
  const visited = new Set<string>()
  const regions: RoomRegion[] = []

  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const key = `${row},${col}`
      if (visited.has(key)) continue
      if (floor.overlay[row]?.[col] !== 'room') continue

      const tiles: Array<{ row: number; col: number }> = []
      const queue = [{ row, col }]
      visited.add(key)

      while (queue.length > 0) {
        const cur = queue.pop()!
        tiles.push(cur)

        for (const [dr, dc] of DIRS) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
          if (floor.overlay[nr]?.[nc] !== 'room') continue
          visited.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      const anchorRow = Math.min(...tiles.map((t) => t.row))
      const anchorCol = Math.min(...tiles.filter((t) => t.row === anchorRow).map((t) => t.col))

      const anchorMeta = floor.meta[`${anchorRow},${anchorCol}`]

      const label = anchorMeta?.label ?? null
      regions.push({
        id: `${floor.floorIndex}:${anchorRow}:${anchorCol}`,
        floorIndex: floor.floorIndex,
        tiles,
        anchor: { row: anchorRow, col: anchorCol },
        label,
        doorCount: 0,
        type: label ? 'room' : 'hallway',
      })
    }
  }

  return regions
}

export function getAllRoomRegions(map: BuildingMap): RoomRegion[] {
  const regions: RoomRegion[] = []
  for (const floor of map.floors) {
    regions.push(...findRoomRegions(floor))
  }
  return regions
}

export function getRoomDoors(
  map: BuildingMap,
  region: RoomRegion,
  maxSearchDist: number = 0,
): Array<{ floorIndex: number; row: number; col: number; type: OverlayType }> {
  const result: Array<{ floorIndex: number; row: number; col: number; type: OverlayType }> = []

  const floor = map.floors.find((f) => f.floorIndex === region.floorIndex)
  if (!floor) return result

  const visited = new Set<string>()
  for (const t of region.tiles) visited.add(`${t.row},${t.col}`)

  for (const tile of region.tiles) {
    for (const [dr, dc] of DIRS) {
      const nr = tile.row + dr
      const nc = tile.col + dc
      const dk = `${nr},${nc}`
      if (visited.has(dk)) continue
      if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue

      const overlay = floor.overlay[nr]?.[nc]
      if (overlay === 'door' || overlay === 'exit_door') {
        visited.add(dk)
        result.push({ floorIndex: region.floorIndex, row: nr, col: nc, type: overlay })
      }
    }
  }

  if (result.length > 0 || maxSearchDist <= 0) return result

  const queue: Array<{ row: number; col: number; dist: number }> = []
  for (const tile of region.tiles) {
    for (const [dr, dc] of DIRS) {
      const nr = tile.row + dr
      const nc = tile.col + dc
      const key = `${nr},${nc}`
      if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
      if (visited.has(key)) continue
      const bt = floor.base[nr]?.[nc]
      if (bt == null) continue
      visited.add(key)
      queue.push({ row: nr, col: nc, dist: 1 })
    }
  }

  let head = 0
  while (head < queue.length) {
    const cur = queue[head++]!
    if (cur.dist > maxSearchDist) continue

    const overlay = floor.overlay[cur.row]?.[cur.col]
    if (overlay === 'door' || overlay === 'exit_door') {
      result.push({ floorIndex: region.floorIndex, row: cur.row, col: cur.col, type: overlay })
      continue
    }

    if (cur.dist >= maxSearchDist) continue

    const bt = floor.base[cur.row]?.[cur.col]
    if (bt !== 'floor' && bt !== 'stairs' && bt !== 'elevator' && bt !== 'dirt_path' && !(bt === 'wall' && (overlay === 'door' || overlay === 'exit_door'))) continue

    for (const [dr, dc] of DIRS) {
      const nr = cur.row + dr
      const nc = cur.col + dc
      const key = `${nr},${nc}`
      if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ row: nr, col: nc, dist: cur.dist + 1 })
    }
  }

  return result
}

export function getRoomDoorCount(map: BuildingMap, region: RoomRegion): number {
  return getRoomDoors(map, region).length
}

export function findPathBetweenRooms(
  map: BuildingMap,
  roomAId: string,
  roomBId: string,
  options?: PathfinderOptions,
): PathResult | null {
  const allRegions = getAllRoomRegions(map)
  const roomA = allRegions.find((r) => r.id === roomAId)
  const roomB = allRegions.find((r) => r.id === roomBId)
  if (!roomA || !roomB) return null

  const doorsA = getRoomDoors(map, roomA, 8)
  const doorsB = getRoomDoors(map, roomB, 8)

  if (doorsA.length === 0 || doorsB.length === 0) return null

  const graphData = buildGraph(map, { noOutside: options?.noOutside })

  let best: PathResult | null = null

  for (const doorA of doorsA) {
    const fromId = `${doorA.floorIndex}:${doorA.row}:${doorA.col}`

    if (!graphData.adjacency.has(fromId)) continue

    for (const doorB of doorsB) {
      const toId = `${doorB.floorIndex}:${doorB.row}:${doorB.col}`

      if (!graphData.adjacency.has(toId)) continue

      const result = findPath(graphData, fromId, toId, options)

      if (result.found && (!best || result.totalWeight < best.totalWeight)) {
        best = result
      }
    }
  }

  return best
}

export interface OverlayGroup {
  id: string
  type: 'exit' | 'door'
  floorIndex: number
  tiles: Array<{ row: number; col: number }>
  anchor: { row: number; col: number }
  label?: string
  tileCount: number
}

export function findOverlayGroups(floor: MapFloor, ovType: 'exit_door' | 'door'): OverlayGroup[] {
  const visited = new Set<string>()
  const groups: OverlayGroup[] = []
  const typeLabel = ovType === 'exit_door' ? 'exit' as const : 'door' as const

  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const key = `${row},${col}`
      if (visited.has(key)) continue
      if (floor.overlay[row]?.[col] !== ovType) continue
      visited.add(key)

      const tiles: Array<{ row: number; col: number }> = []
      const queue = [{ row, col }]
      while (queue.length > 0) {
        const cur = queue.pop()!
        tiles.push(cur)
        for (const [dr, dc] of DIRS) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
          if (floor.overlay[nr]?.[nc] !== ovType) continue
          visited.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      const anchorRow = Math.min(...tiles.map((t) => t.row))
      const anchorCol = Math.min(...tiles.filter((t) => t.row === anchorRow).map((t) => t.col))
      const anchorMeta = floor.meta[`${anchorRow},${anchorCol}`]

      groups.push({
        id: `group:${typeLabel}:${floor.floorIndex}:${anchorRow}:${anchorCol}`,
        type: typeLabel,
        floorIndex: floor.floorIndex,
        tiles,
        anchor: { row: anchorRow, col: anchorCol },
        label: anchorMeta?.label ?? undefined,
        tileCount: tiles.length,
      })
    }
  }

  return groups
}

export interface NavDestination {
  id: string
  label: string
  floorIndex: number
  floorLabel: string
  type: 'room' | 'exit' | 'door' | 'stairs' | 'elevator'
  doorCount?: number
  tileCount?: number
}

export function getAllDestinations(map: BuildingMap): NavDestination[] {
  const dests: NavDestination[] = []

  for (const floor of map.floors) {
    const flLabel = floor.label

    const regions = findRoomRegions(floor)
    for (const r of regions) {
      dests.push({
        id: r.id,
        label: r.label ?? 'Unnamed Room',
        floorIndex: floor.floorIndex,
        floorLabel: flLabel,
        type: 'room',
        doorCount: 0,
        tileCount: r.tiles.length,
      })
    }

    const exitGroups = findOverlayGroups(floor, 'exit_door')
    for (const g of exitGroups) {
      dests.push({
        id: g.id,
        label: g.label ?? `Exit${g.tiles.length > 1 ? ` (${g.tiles.length}x)` : ''}`,
        floorIndex: floor.floorIndex,
        floorLabel: flLabel,
        type: 'exit',
        tileCount: g.tiles.length,
      })
    }

    const doorGroups = findOverlayGroups(floor, 'door')
    for (const g of doorGroups) {
      dests.push({
        id: g.id,
        label: g.label ?? `Door${g.tiles.length > 1 ? ` (${g.tiles.length}x)` : ''}`,
        floorIndex: floor.floorIndex,
        floorLabel: flLabel,
        type: 'door',
        tileCount: g.tiles.length,
      })
    }

    const visited = new Set<string>()
    for (let row = 0; row < floor.height; row++) {
      for (let col = 0; col < floor.width; col++) {
        const key = `${row},${col}`
        if (visited.has(key)) continue
        const bt = floor.base[row]?.[col]
        if (bt !== 'stairs' && bt !== 'elevator') continue
        visited.add(key)

        const tiles: Array<{ row: number; col: number }> = []
        const queue = [{ row, col }]
        while (queue.length > 0) {
          const cur = queue.pop()!
          tiles.push(cur)
          for (const [dr, dc] of DIRS) {
            const nr = cur.row + dr
            const nc = cur.col + dc
            const nk = `${nr},${nc}`
            if (visited.has(nk)) continue
            if (floor.base[nr]?.[nc] !== bt) continue
            visited.add(nk)
            queue.push({ row: nr, col: nc })
          }
        }

        const anchorRow = Math.min(...tiles.map((t) => t.row))
        const anchorCol = Math.min(...tiles.filter((t) => t.row === anchorRow).map((t) => t.col))
        const meta = floor.meta[`${anchorRow},${anchorCol}`]

        let label = bt === 'stairs' ? 'Stairs' : 'Elevator'
        if (tiles.length > 1) label += ` (${tiles.length}x)`
        let extras: string[] = []
        if (bt === 'stairs') {
          if (meta?.toFloorSuperior != null) extras.push(`\u2191f${meta.toFloorSuperior}`)
          if (meta?.toFloorInferior != null) extras.push(`\u2193f${meta.toFloorInferior}`)
        } else {
          const conn = meta?.connectedFloors ?? []
          if (conn.length > 0) extras.push(`f${conn.join(',f')}`)
        }
        if (extras.length > 0) label += ` (${extras.join(', ')})`

        dests.push({
          id: `${bt}:${floor.floorIndex}:${anchorRow}:${anchorCol}`,
          label,
          floorIndex: floor.floorIndex,
          floorLabel: flLabel,
          type: bt === 'stairs' ? 'stairs' : 'elevator',
          tileCount: tiles.length,
        })
      }
    }
  }

  return dests
}

export interface ResolvedDest {
  floorIndex: number
  row: number
  col: number
}

export function resolveDestination(map: BuildingMap, destId: string): ResolvedDest[] {
  const parts = destId.split(':')

  if (parts[0] === 'group') {
    const type = parts[1]
    const fi = Number(parts[2])
    const ar = Number(parts[3])
    const ac = Number(parts[4])
    const floor = map.floors.find((f) => f.floorIndex === fi)
    if (!floor) return []
    const ovType = type === 'exit' ? 'exit_door' as const : 'door' as const
    const groups = findOverlayGroups(floor, ovType)
    const group = groups.find((g) => g.anchor.row === ar && g.anchor.col === ac)
    if (!group) return []
    return group.tiles.map((t) => ({ floorIndex: fi, row: t.row, col: t.col }))
  }

  if (parts[0] === 'stairs' || parts[0] === 'elevator') {
    const fi = Number(parts[1])
    const r = Number(parts[2])
    const c = Number(parts[3])
    return [{ floorIndex: fi, row: r, col: c }]
  }

  const region = getAllRoomRegions(map).find((r) => r.id === destId)
  if (!region) return []
  const doors = getRoomDoors(map, region, 8)
  if (doors.length > 0) return doors

  const floor = map.floors.find((f) => f.floorIndex === region.floorIndex)
  if (floor) {
    const tiles: ResolvedDest[] = []
    for (const t of region.tiles) {
      const bt = floor.base[t.row]?.[t.col]
      if (bt === 'stairs' || bt === 'elevator') {
        tiles.push({ floorIndex: region.floorIndex, row: t.row, col: t.col })
      }
    }
    if (tiles.length > 0) return tiles
    return [{ floorIndex: region.floorIndex, row: region.anchor.row, col: region.anchor.col }]
  }
  return [{ floorIndex: region.floorIndex, row: region.anchor.row, col: region.anchor.col }]
}

export function getAnchorKey(tile: { row: number; col: number }): string {
  return `${tile.row},${tile.col}`
}

export function cleanupRoomMeta(floor: MapFloor): MapFloor {
  const regions = findRoomRegions(floor)
  const anchorKeys = new Set(regions.map((r) => getAnchorKey(r.anchor)))
  const newMeta: Record<string, import('./types').TileMeta> = {}

  for (const [key, meta] of Object.entries(floor.meta)) {
    if (floor.overlay[Number(key.split(',')[0])]?.[Number(key.split(',')[1])] === 'room') {
      if (anchorKeys.has(key)) {
        newMeta[key] = meta
      }
    } else {
      newMeta[key] = meta
    }
  }

  return { ...floor, meta: newMeta }
}

export function cleanupStairsElevatorMeta(floor: MapFloor): MapFloor {
  const visited = new Set<string>()
  const newMeta = { ...floor.meta }

  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const key = `${row},${col}`
      if (visited.has(key)) continue
      const bt = floor.base[row]?.[col]
      if (bt !== 'stairs' && bt !== 'elevator') continue
      visited.add(key)

      const tiles: Array<{ row: number; col: number }> = []
      const queue = [{ row, col }]
      while (queue.length > 0) {
        const cur = queue.pop()!
        tiles.push(cur)
        for (const [dr, dc] of DIRS) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          if (floor.base[nr]?.[nc] !== bt) continue
          visited.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      const anchorRow = Math.min(...tiles.map((t) => t.row))
      const anchorCol = Math.min(...tiles.filter((t) => t.row === anchorRow).map((t) => t.col))
      const anchorMeta = newMeta[`${anchorRow},${anchorCol}`] ?? {}
      const connKeys = ['toFloorSuperior', 'toFloorInferior', 'connectedFloors', 'accessible', 'weight', 'label'] as const

      for (const t of tiles) {
        const tk = `${t.row},${t.col}`
        const existing = newMeta[tk] ?? {}
        const merged = { ...existing }
        for (const ck of connKeys) {
          if (ck in anchorMeta) {
            (merged as Record<string, unknown>)[ck] = anchorMeta[ck]
          }
        }
        if (Object.keys(merged).length > 0) {
          newMeta[tk] = merged
        }
      }
    }
  }

  return { ...floor, meta: newMeta }
}

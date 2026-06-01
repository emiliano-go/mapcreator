import type {
  AdjacencyGraph,
  BuildingMap,
  GraphData,
  GraphEdge,
  GraphNode,
  TileMeta,
  TileType,
  OverlayType,
  TileGroup,
} from './types'

const FLOOR_CHANGE_WEIGHT = 10

const DIRECTIONS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
]

function nodeId(floor: number, row: number, col: number): string {
  return `${floor}:${row}:${col}`
}

export interface BuildGraphOptions {
  allowDiagonal?: boolean
  noOutside?: boolean
}

function isTraversable(base: TileType | undefined, overlay: OverlayType, noOutside?: boolean): boolean {
  if (!base) return false
  if (base === 'stairs' || base === 'elevator') return true
  if (base === 'floor') return true
  if (base === 'outside' || base === 'dirt_path') return !noOutside
  if (base === 'wall' && (overlay === 'door' || overlay === 'exit_door')) return true
  return false
}

function getWeight(base: TileType, overlay: OverlayType, meta: TileMeta): number {
  const doorSurcharge = (overlay === 'door' || overlay === 'exit_door') ? (meta.weight ?? 0.5) : 0
  return 1 + doorSurcharge
}

function addCrossFloorEdge(
  fromId: string,
  toFloorIndex: number,
  row: number,
  col: number,
  edges: GraphEdge[],
  floorMap: Map<number, { base: TileType[][]; overlay: OverlayType[][]; meta: Record<string, TileMeta> }>,
  weight: number,
  noOutside: boolean,
) {
  const target = floorMap.get(toFloorIndex)
  if (!target) return
  const targetBase = target.base[row]?.[col]
  const targetOverlay = target.overlay[row]?.[col]
  if (!targetBase || !isTraversable(targetBase, targetOverlay, noOutside)) return

  edges.push({
    from: fromId,
    to: nodeId(toFloorIndex, row, col),
    weight: FLOOR_CHANGE_WEIGHT + weight,
    crossFloor: true,
  })
}

function findTileGroups(
  floor: { base: TileType[][]; floorIndex: number },
): TileGroup[] {
  const groups: TileGroup[] = []
  const visited = new Set<string>()

  for (let row = 0; row < floor.base.length; row++) {
    for (let col = 0; col < (floor.base[0]?.length ?? 0); col++) {
      const key = `${row},${col}`
      if (visited.has(key)) continue
      const type = floor.base[row]?.[col]
      if (type !== 'stairs' && type !== 'elevator') continue

      const groupTiles: Array<{ row: number; col: number }> = []
      const queue = [{ row, col }]
      visited.add(key)

      while (queue.length > 0) {
        const cur = queue.pop()!
        groupTiles.push(cur)

        for (const [dr, dc] of DIRECTIONS) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          const nt = floor.base[nr]?.[nc]
          if (nt !== type) continue
          visited.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      if (groupTiles.length > 0) {
        const anchorRow = Math.min(...groupTiles.map((t) => t.row))
        const anchorCol = Math.min(...groupTiles.filter((t) => t.row === anchorRow).map((t) => t.col))
        groups.push({
          id: `${floor.floorIndex}:${type}:${anchorRow}:${anchorCol}`,
          type: type as 'stairs' | 'elevator',
          floorIndex: floor.floorIndex,
          tiles: groupTiles,
          anchor: { row: anchorRow, col: anchorCol },
        })
      }
    }
  }

  return groups
}

export function buildGraph(
  map: BuildingMap,
  options?: BuildGraphOptions,
): GraphData {
  const graph: AdjacencyGraph = new Map()
  const floorMap = new Map<number, { base: TileType[][]; overlay: OverlayType[][]; meta: Record<string, TileMeta> }>()

  for (const floor of map.floors) {
    floorMap.set(floor.floorIndex, {
      base: floor.base,
      overlay: floor.overlay,
      meta: floor.meta,
    })
  }

  const allDirections = options?.allowDiagonal
    ? [...DIRECTIONS, [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : DIRECTIONS
  const noOutside = options?.noOutside ?? false

  const nodeMeta = new Map<string, TileMeta>()
  const nodeTypes = new Map<string, { base: TileType; overlay: OverlayType }>()

  for (const floor of map.floors) {
    const { base, overlay, meta } = floor
    const groups = findTileGroups(floor)

    for (let row = 0; row < floor.height; row++) {
      for (let col = 0; col < floor.width; col++) {
        const baseType = base[row]?.[col]
        const overlayType = overlay[row]?.[col] ?? null
        if (!baseType || !isTraversable(baseType, overlayType, noOutside)) continue

        const id = nodeId(floor.floorIndex, row, col)
        const edges: GraphEdge[] = []
        const tileMeta = meta[`${row},${col}`] ?? {}

        for (const [dr, dc] of allDirections) {
          const nr = row + dr
          const nc = col + dc
          if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue

          const nBase = base[nr]?.[nc]
          const nOverlay = overlay[nr]?.[nc] ?? null
          if (!nBase || !isTraversable(nBase, nOverlay, noOutside)) continue

          const nMeta = meta[`${nr},${nc}`] ?? {}
          let weight = getWeight(nBase, nOverlay, nMeta)

          if (options?.allowDiagonal && dr !== 0 && dc !== 0) {
            weight = Math.SQRT2
          }

          edges.push({
            from: id,
            to: nodeId(floor.floorIndex, nr, nc),
            weight,
            crossFloor: false,
          })
        }

        if (baseType === 'stairs') {
          const group = groups.find((g) => g.tiles.some((t) => t.row === row && t.col === col))
          const anchorKey = group ? `${group.anchor.row},${group.anchor.col}` : `${row},${col}`
          const gMeta = meta[anchorKey] ?? tileMeta

          if (gMeta.toFloorSuperior != null) {
            addCrossFloorEdge(id, gMeta.toFloorSuperior, row, col, edges, floorMap, 2, noOutside)
          }
          if (gMeta.toFloorInferior != null) {
            addCrossFloorEdge(id, gMeta.toFloorInferior, row, col, edges, floorMap, 2, noOutside)
          }
        }

        if (baseType === 'elevator') {
          const group = groups.find((g) => g.tiles.some((t) => t.row === row && t.col === col))
          const anchorKey = group ? `${group.anchor.row},${group.anchor.col}` : `${row},${col}`
          const gMeta = meta[anchorKey] ?? tileMeta
          const connected = gMeta.connectedFloors ?? []

          for (const targetFloor of connected) {
            if (targetFloor === floor.floorIndex) continue
            addCrossFloorEdge(id, targetFloor, row, col, edges, floorMap, 1, noOutside)
          }
        }

        graph.set(id, edges)
        nodeMeta.set(id, tileMeta)
        nodeTypes.set(id, { base: baseType, overlay: overlayType })
      }
    }
  }

  return { adjacency: graph, nodeMeta, nodeTypes }
}

export function getNode(
  map: BuildingMap,
  floorIdx: number,
  row: number,
  col: number,
): GraphNode | null {
  const floor = map.floors.find((f) => f.floorIndex === floorIdx)
  if (!floor) return null

  const baseType = floor.base[row]?.[col]
  const overlayType = floor.overlay[row]?.[col] ?? null
  if (!baseType || !isTraversable(baseType, overlayType)) return null

  return {
    id: nodeId(floorIdx, row, col),
    floorIndex: floorIdx,
    row,
    col,
    base: baseType,
    overlay: overlayType,
    meta: floor.meta[`${row},${col}`] ?? {},
  }
}

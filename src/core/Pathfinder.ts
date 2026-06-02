import type {
  GraphData,
  GraphNode,
  PathfinderOptions,
  PathResult,
  TileMeta,
  TileType,
  OverlayType,
} from './types'

class MinHeap {
  private heap: { key: string; priority: number }[] = []

  push(key: string, priority: number) {
    this.heap.push({ key, priority })
    let i = this.heap.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.heap[p].priority <= this.heap[i].priority) break
      ;[this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]]
      i = p
    }
  }

  pop(): string | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      let i = 0
      const n = this.heap.length
      while (true) {
        let smallest = i
        const left = 2 * i + 1
        const right = 2 * i + 2
        if (left < n && this.heap[left].priority < this.heap[smallest].priority) smallest = left
        if (right < n && this.heap[right].priority < this.heap[smallest].priority) smallest = right
        if (smallest === i) break
        ;[this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]]
        i = smallest
      }
    }
    return top.key
  }

  get size() {
    return this.heap.length
  }
}

function heuristic(a: string, b: string): number {
  const [, ar, ac] = a.split(':').map(Number)
  const [, br, bc] = b.split(':').map(Number)
  return Math.abs(ar - br) + Math.abs(ac - bc)
}

export function findPath(
  graphData: GraphData,
  fromId: string,
  toId: string,
  options?: PathfinderOptions,
): PathResult {
  const { adjacency: graph, nodeMeta, nodeTypes } = graphData

  if (!graph.has(fromId) || !graph.has(toId)) {
    return { found: false, path: [], totalWeight: 0, floorChanges: 0 }
  }

  function runAStar(skipStairs: boolean): PathResult {
    const openSet = new MinHeap()
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()
    const cameFrom = new Map<string, string>()
    const visited = new Set<string>()

    gScore.set(fromId, 0)
    fScore.set(fromId, heuristic(fromId, toId))
    openSet.push(fromId, fScore.get(fromId)!)

    while (openSet.size > 0) {
      const current = openSet.pop()!
      if (visited.has(current)) continue
      visited.add(current)

      if (current === toId) {
        return reconstructPath(cameFrom, current, graph, nodeMeta, nodeTypes, fromId)
      }

      const edges = graph.get(current)
      if (!edges) continue

      for (const edge of edges) {
        if (skipStairs && edge.crossFloor && nodeTypes?.get(current)?.base === 'stairs') continue

        const neighbor = edge.to

        if (options?.accessibleOnly) {
          const neighborMeta = nodeMeta.get(neighbor)
          if (neighborMeta && neighborMeta.accessible === false) continue
        }

        if (options?.maxFloorChanges !== undefined) {
          const currentFloor = Number(current.split(':')[0])
          const neighborFloor = Number(neighbor.split(':')[0])
          if (currentFloor !== neighborFloor) {
            const changesSoFar = countFloorChanges(cameFrom, current)
            if (changesSoFar >= options.maxFloorChanges) continue
          }
        }

        const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight
        if (tentativeG >= (gScore.get(neighbor) ?? Infinity)) continue

        cameFrom.set(neighbor, current)
        gScore.set(neighbor, tentativeG)
        const f = tentativeG + heuristic(neighbor, toId)
        fScore.set(neighbor, f)
        openSet.push(neighbor, f)
      }
    }

    return { found: false, path: [], totalWeight: 0, floorChanges: 0 }
  }

  if (options?.preferElevator) {
    const result = runAStar(true)
    if (result.found) return result
  }

  return runAStar(false)
}

function reconstructPath(
  cameFrom: Map<string, string>,
  current: string,
  graph: Map<string, { from: string; to: string; weight: number; crossFloor: boolean }[]>,
  nodeMeta: Map<string, TileMeta>,
  nodeTypes: Map<string, { base: TileType; overlay: OverlayType }> | undefined,
  fromId: string,
): PathResult {
  const pathIds: string[] = []
  let node = current
  while (node !== fromId) {
    pathIds.unshift(node)
    node = cameFrom.get(node) ?? fromId
  }
  pathIds.unshift(fromId)

  const floorChanges = countFloorChanges(cameFrom, current)

  const path: GraphNode[] = []
  let totalWeight = 0
  for (let i = 0; i < pathIds.length; i++) {
    const id = pathIds[i]
    const [floorIdx, row, col] = id.split(':').map(Number)
    const edges = graph.get(id)
    if (i > 0 && edges) {
      const prev = pathIds[i - 1]
      const edge = edges.find((e) => e.to === prev)
      if (edge) totalWeight += edge.weight
    }

    const nt = nodeTypes?.get(id)
    path.push({
      id,
      floorIndex: floorIdx,
      row,
      col,
      base: nt?.base ?? 'floor',
      overlay: nt?.overlay ?? null,
      meta: nodeMeta.get(id) ?? {},
    })
  }

  return { found: true, path, totalWeight, floorChanges }
}

function countFloorChanges(cameFrom: Map<string, string>, nodeId: string): number {
  let count = 0
  let current = nodeId
  const visited = new Set<string>()

  while (cameFrom.has(current) && !visited.has(current)) {
    visited.add(current)
    const prev = cameFrom.get(current)!
    const prevFloor = Number(prev.split(':')[0])
    const curFloor = Number(current.split(':')[0])
    if (prevFloor !== curFloor) count++
    current = prev
  }
  return count
}

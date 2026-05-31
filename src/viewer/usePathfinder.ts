import { useMemo, useState } from 'react'
import type { BuildingMap, PathResult, PathfinderOptions } from '../core/types'
import { buildGraph, findPath, getNode } from '../core'

interface UsePathfinderReturn {
  result: PathResult | null
  fromId: string | null
  toId: string | null
  setFrom: (floor: number, row: number, col: number) => void
  setTo: (floor: number, row: number, col: number) => void
  find: (options?: PathfinderOptions) => void
  clear: () => void
  options: PathfinderOptions
  setOptions: (opts: PathfinderOptions) => void
}

export function usePathfinder(map: BuildingMap): UsePathfinderReturn {
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [result, setResult] = useState<PathResult | null>(null)
  const [options, setOptions] = useState<PathfinderOptions>({})

  const graphData = useMemo(() => buildGraph(map), [map])

  const setFrom = (floor: number, row: number, col: number) => {
    const node = getNode(map, floor, row, col)
    if (node) {
      setFromId(node.id)
      setResult(null)
    }
  }

  const setTo = (floor: number, row: number, col: number) => {
    const node = getNode(map, floor, row, col)
    if (node) {
      setToId(node.id)
      setResult(null)
    }
  }

  const find = (opts?: PathfinderOptions) => {
    if (!fromId || !toId) return
    const merged = { ...options, ...opts }
    const res = findPath(graphData, fromId, toId, merged)
    setResult(res)
  }

  const clear = () => {
    setFromId(null)
    setToId(null)
    setResult(null)
  }

  return {
    result,
    fromId,
    toId,
    setFrom,
    setTo,
    find,
    clear,
    options,
    setOptions,
  }
}

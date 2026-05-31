import React, { useState, useCallback } from 'react'
import type { BuildingMap } from '../core/types'
import ViewerCanvas from './ViewerCanvas'
import PathPanel from './PathPanel'
import FloorSelector from './FloorSelector'
import { buildGraph } from '../core/GraphBuilder'
import { findPath } from '../core/Pathfinder'

interface ViewerShellProps {
  map: BuildingMap
}

export default function ViewerShell({ map }: ViewerShellProps) {
  const [activeFloor, setActiveFloor] = useState(map.defaultFloor)
  const [pointA, setPointA] = useState<{ floor: number; row: number; col: number } | null>(null)
  const [pointB, setPointB] = useState<{ floor: number; row: number; col: number } | null>(null)
  const [pathIds, setPathIds] = useState<string[] | null>(null)

  const handleSetA = useCallback((floor: number, row: number, col: number) => {
    setPointA({ floor, row, col })
  }, [])

  const handleSetB = useCallback((floor: number, row: number, col: number) => {
    setPointB({ floor, row, col })
  }, [])

  const handleRun = useCallback((ids: string[]) => {
    setPathIds(ids)
  }, [])

  const handleClear = useCallback(() => {
    setPathIds(null)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700">
        <h1 className="text-sm font-semibold text-gray-200">{map.name}</h1>
        <FloorSelector floors={map.floors} activeFloor={activeFloor} onChange={setActiveFloor} />
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ViewerCanvas map={map} activeFloor={activeFloor} pathIds={pathIds} />
        </div>
        <PathPanel
          map={map}
          onSetA={handleSetA}
          onSetB={handleSetB}
          onRun={handleRun}
          onClear={handleClear}
          pointA={pointA}
          pointB={pointB}
          pathIds={pathIds}
        />
      </div>
    </div>
  )
}

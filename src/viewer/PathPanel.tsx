import { useCallback, useMemo, useState } from 'react'
import type { BuildingMap } from '../core/types'
import { buildGraph } from '../core/GraphBuilder'
import { findPath } from '../core/Pathfinder'
import { getAllDestinations, resolveDestination } from '../core/roomRegions'
import type { NavDestination, ResolvedDest } from '../core/roomRegions'

const DEST_EMOJI: Record<NavDestination['type'], string> = {
  room: '\u{1F3E0}',
  exit: '\u{1F6A8}',
  stairs: '\u{1F7E5}',
  elevator: '\u{1F7EA}',
}

function resolveFirstDest(map: BuildingMap, destId: string): ResolvedDest | null {
  const dests = resolveDestination(map, destId)
  return dests.length > 0 ? dests[0] : null
}

interface PathPanelProps {
  map: BuildingMap
  onSetA: (floor: number, row: number, col: number) => void
  onSetB: (floor: number, row: number, col: number) => void
  onRun: (pathIds: string[]) => void
  onClear: () => void
  pointA: { floor: number; row: number; col: number } | null
  pointB: { floor: number; row: number; col: number } | null
  pathIds: string[] | null
}

export default function PathPanel({ map, onSetA, onSetB, onRun, onClear, pathIds }: PathPanelProps) {
  const allDests = useMemo(() => getAllDestinations(map), [map])

  const [aRoomId, setARoomId] = useState<string | null>(null)
  const [bRoomId, setBRoomId] = useState<string | null>(null)

  const [accessibleOnly, setAccessibleOnly] = useState(false)
  const [preferElevator, setPreferElevator] = useState(false)
  const [maxFloorChanges, setMaxFloorChanges] = useState(10)
  const [noOutside, setNoOutside] = useState(false)

  const pathOptions = { accessibleOnly, preferElevator, maxFloorChanges, noOutside }

  const handleFindPath = useCallback(() => {
    const fromDests = aRoomId ? resolveDestination(map, aRoomId) : []
    const toDests = bRoomId ? resolveDestination(map, bRoomId) : []
    if (fromDests.length === 0 || toDests.length === 0) return

    const graphData = buildGraph(map, { noOutside })
    let bestPath: string[] | null = null

    for (const a of fromDests) {
      for (const b of toDests) {
        const fromId = `${a.floorIndex}:${a.row}:${a.col}`
        const toId = `${b.floorIndex}:${b.row}:${b.col}`
        const result = findPath(graphData, fromId, toId, pathOptions)
        if (result.found && (!bestPath || result.path.length < bestPath.length)) {
          bestPath = result.path.map((n) => n.id)
        }
      }
    }

    if (bestPath) onRun(bestPath)
  }, [map, aRoomId, bRoomId, accessibleOnly, preferElevator, maxFloorChanges, noOutside, onRun])

  const handleSelectA = useCallback((val: string) => {
    if (!val) { setARoomId(null); return }
    setARoomId(val)
    const dest = resolveFirstDest(map, val)
    if (dest) onSetA(dest.floorIndex, dest.row, dest.col)
  }, [map, onSetA])

  const handleSelectB = useCallback((val: string) => {
    if (!val) { setBRoomId(null); return }
    setBRoomId(val)
    const dest = resolveFirstDest(map, val)
    if (dest) onSetB(dest.floorIndex, dest.row, dest.col)
  }, [map, onSetB])

  return (
    <div className="w-72 bg-gray-800 border-l border-gray-700 p-3 text-sm overflow-y-auto">
      <h3 className="text-gray-200 font-semibold mb-3">Navigation</h3>

      <div className="mb-3">
        <label className="text-xs text-gray-400 block mb-1">From</label>
        <select
          value={aRoomId ?? ''}
          onChange={(e) => handleSelectA(e.target.value)}
          className="w-full bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs border border-gray-600 outline-none"
        >
          <option value="">-- Select destination --</option>
          {allDests.map((d) => (
            <option key={d.id} value={d.id}>
              {DEST_EMOJI[d.type]} {d.label} ({d.floorLabel})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-xs text-gray-400 block mb-1">To</label>
        <select
          value={bRoomId ?? ''}
          onChange={(e) => handleSelectB(e.target.value)}
          className="w-full bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs border border-gray-600 outline-none"
        >
          <option value="">-- Select destination --</option>
          {allDests.map((d) => (
            <option key={d.id} value={d.id}>
              {DEST_EMOJI[d.type]} {d.label} ({d.floorLabel})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <h4 className="text-xs text-gray-400 mb-1">Options</h4>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
          Accessible only
        </label>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input type="checkbox" checked={preferElevator} onChange={(e) => setPreferElevator(e.target.checked)} />
          Prefer elevator
        </label>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input type="checkbox" checked={noOutside} onChange={(e) => setNoOutside(e.target.checked)} />
          No outside
        </label>
        <div className="flex items-center gap-2 text-gray-300">
          <span className="text-xs">Max floor changes:</span>
          <input type="number" min={1} max={50} value={maxFloorChanges} onChange={(e) => setMaxFloorChanges(Number(e.target.value))} className="w-14 bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs border border-gray-600 outline-none" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleFindPath} disabled={!aRoomId || !bRoomId} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm transition-colors">
          Find Path
        </button>
        <button onClick={onClear} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors">
          Clear
        </button>
      </div>

      {pathIds && (
        <div className="mt-3 bg-gray-900 rounded p-2 text-xs">
          <div className="text-green-400 font-semibold mb-1">Path found!</div>
          <div className="text-gray-400">Steps: {pathIds.length}</div>
        </div>
      )}
    </div>
  )
}

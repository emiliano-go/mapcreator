import { useCallback, useMemo, useState } from 'react'
import type { BuildingMap } from '../core/types'
import { buildGraph } from '../core/GraphBuilder'
import { findPath } from '../core/Pathfinder'
import { getAllDestinations, resolveDestination } from '../core/roomRegions'
import type { NavDestination, ResolvedDest } from '../core/roomRegions'

const DEST_EMOJI: Record<NavDestination['type'], string> = {
  room: '\u{1F3E0}',
  exit: '\u{1F6A8}',
  door: '\u{1F6AA}',
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
    <div className="w-72 bg-surface border-l border-border p-3 text-sm overflow-y-auto">
      <h3 className="text-text-primary font-semibold mb-3 tracking-tight">Navigation</h3>

      <div className="mb-3">
        <label className="text-xs text-text-tertiary block mb-1">From</label>
        <select
          value={aRoomId ?? ''}
          onChange={(e) => handleSelectA(e.target.value)}
          className="w-full bg-deep-700 text-text-primary px-2 py-1.5 rounded-lg text-xs border border-border outline-none transition-all duration-150 focus:border-accent cursor-pointer"
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
        <label className="text-xs text-text-tertiary block mb-1">To</label>
        <select
          value={bRoomId ?? ''}
          onChange={(e) => handleSelectB(e.target.value)}
          className="w-full bg-deep-700 text-text-primary px-2 py-1.5 rounded-lg text-xs border border-border outline-none transition-all duration-150 focus:border-accent cursor-pointer"
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
        <h4 className="text-xs text-text-tertiary mb-1">Options</h4>
        <label className="flex items-center gap-2 text-text-secondary mb-1 cursor-pointer">
          <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} className="accent-accent" />
          Accessible only
        </label>
        <label className="flex items-center gap-2 text-text-secondary mb-1 cursor-pointer">
          <input type="checkbox" checked={preferElevator} onChange={(e) => setPreferElevator(e.target.checked)} className="accent-accent" />
          Prefer elevator
        </label>
        <label className="flex items-center gap-2 text-text-secondary mb-1 cursor-pointer">
          <input type="checkbox" checked={noOutside} onChange={(e) => setNoOutside(e.target.checked)} className="accent-accent" />
          No outside
        </label>
        <div className="flex items-center gap-2 text-text-secondary">
          <span className="text-xs">Max floor changes:</span>
          <input type="number" min={1} max={50} value={maxFloorChanges} onChange={(e) => setMaxFloorChanges(Number(e.target.value))} className="w-14 bg-deep-700 text-text-primary px-1.5 py-1 rounded-lg text-xs border border-border outline-none focus:border-accent transition-all duration-150" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleFindPath} disabled={!aRoomId || !bRoomId} className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-deep-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer font-medium shadow-sm shadow-accent/20 disabled:shadow-none">
          Find Path
        </button>
        <button onClick={onClear} className="bg-deep-700 hover:bg-deep-600 text-text-secondary px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer">
          Clear
        </button>
      </div>

      {pathIds && (
        <div className="mt-3 bg-success/10 rounded-xl p-2.5 text-xs border border-success/20">
          <div className="text-success font-semibold mb-1">Path found!</div>
          <div className="text-text-secondary">Steps: {pathIds.length}</div>
        </div>
      )}
    </div>
  )
}

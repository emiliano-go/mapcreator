import { useCallback, useMemo } from 'react'
import { useStore } from './store'
import { getAllDestinations, resolveDestination } from '../core/roomRegions'
import type { NavDestination } from '../core/roomRegions'

const DEST_EMOJI: Record<NavDestination['type'], string> = {
  room: '\u{1F3E0}',
  exit: '\u{1F6A8}',
  door: '\u{1F6AA}',
  stairs: '\u{1F7E5}',
  elevator: '\u{1F7EA}',
}

export default function SimulatePanel() {
  const map = useStore((s) => s.map)
  const simulationRoomA = useStore((s) => s.simulationRoomA)
  const simulationRoomB = useStore((s) => s.simulationRoomB)
  const simulationStatus = useStore((s) => s.simulationStatus)
  const simulationOptions = useStore((s) => s.simulationOptions)
  const simulationSpeed = useStore((s) => s.simulationSpeed)
  const simulationPath = useStore((s) => s.simulationPath)
  const setSimulationOption = useStore((s) => s.setSimulationOption)
  const setSimulationSpeed = useStore((s) => s.setSimulationSpeed)
  const clearSimulation = useStore((s) => s.clearSimulation)
  const runSimulation = useStore((s) => s.runSimulation)

  const allDests = useMemo(() => getAllDestinations(map), [map])

  const setDest = useCallback((which: 'A' | 'B', destId: string | null) => {
    const patch: Record<string, unknown> = {
      simulationPath: null,
      simulationStatus: 'idle' as const,
    }
    if (!destId) {
      patch[which === 'A' ? 'simulationRoomA' : 'simulationRoomB'] = null
      useStore.setState(patch)
      return
    }
    const state = useStore.getState()
    const dests = resolveDestination(state.map, destId)
    patch[which === 'A' ? 'simulationRoomA' : 'simulationRoomB'] = destId
    if (dests.length > 0) {
      if (which === 'A') {
        patch.simulationFloorA = dests[0].floorIndex
        patch.simulationRowA = dests[0].row
        patch.simulationColA = dests[0].col
      } else {
        patch.simulationFloorB = dests[0].floorIndex
        patch.simulationRowB = dests[0].row
        patch.simulationColB = dests[0].col
      }
    }
    useStore.setState(patch)
  }, [])

  return (
    <div className="w-72 bg-surface border-l border-border p-3 text-sm overflow-y-auto flex flex-col gap-3">
      <h3 className="text-text-primary font-semibold text-base tracking-tight">Simulation</h3>

      <div>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium block mb-1">From</label>
        <select
          value={simulationRoomA ?? ''}
          onChange={(e) => setDest('A', e.target.value || null)}
          className="w-full bg-deep-700 text-text-primary px-2 py-1.5 rounded-lg text-sm border border-border outline-none transition-all duration-150 focus:border-accent cursor-pointer"
        >
          <option value="">-- Select destination --</option>
          {allDests.map((d) => (
            <option key={d.id} value={d.id}>
              {DEST_EMOJI[d.type]} {d.label} ({d.floorLabel})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium block mb-1">To</label>
        <select
          value={simulationRoomB ?? ''}
          onChange={(e) => setDest('B', e.target.value || null)}
          className="w-full bg-deep-700 text-text-primary px-2 py-1.5 rounded-lg text-sm border border-border outline-none transition-all duration-150 focus:border-accent cursor-pointer"
        >
          <option value="">-- Select destination --</option>
          {allDests.map((d) => (
            <option key={d.id} value={d.id}>
              {DEST_EMOJI[d.type]} {d.label} ({d.floorLabel})
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium mb-2">Options</h4>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={simulationOptions.accessibleOnly}
              onChange={(e) => setSimulationOption('accessibleOnly', e.target.checked)}
              className="rounded accent-accent"
            />
            Accessible only
          </label>
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={simulationOptions.preferElevator}
              onChange={(e) => setSimulationOption('preferElevator', e.target.checked)}
              className="rounded accent-accent"
            />
            Prefer elevator
          </label>
          <label className="flex items-center gap-2 text-text-secondary text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={simulationOptions.noOutside}
              onChange={(e) => setSimulationOption('noOutside', e.target.checked)}
              className="rounded accent-accent"
            />
            No outside
          </label>
          <div className="flex items-center gap-2 text-text-secondary pt-1">
            <span className="text-xs text-text-tertiary">Max floor changes:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={simulationOptions.maxFloorChanges}
              onChange={(e) => setSimulationOption('maxFloorChanges', Number(e.target.value))}
              className="w-14 bg-deep-700 text-text-primary px-1.5 py-1 rounded-lg text-xs border border-border outline-none focus:border-accent transition-all duration-150"
            />
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="text-xs text-text-tertiary">Speed (cells/s):</span>
            <input
              type="number"
              min={1}
              max={100}
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Math.max(1, Number(e.target.value)))}
              className="w-14 bg-deep-700 text-text-primary px-1.5 py-1 rounded-lg text-xs border border-border outline-none focus:border-accent transition-all duration-150"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={runSimulation}
          disabled={!simulationRoomA && !simulationRoomB}
          className="flex-1 bg-accent hover:bg-accent-hover disabled:bg-deep-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer font-medium shadow-sm shadow-accent/20 disabled:shadow-none"
        >
          {simulationStatus === 'running' ? 'Running...' : 'Find Path'}
        </button>
        <button
          onClick={clearSimulation}
          className="bg-deep-700 hover:bg-deep-600 text-text-secondary px-3 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer"
        >
          Clear
        </button>
      </div>

      {simulationPath !== null && (
        <div className="bg-success/10 rounded-xl p-3 border border-success/20">
          <div className="text-success font-semibold text-sm mb-1">✓ Path found!</div>
          <div className="text-text-secondary text-xs font-mono">Steps: {simulationPath.length}</div>
        </div>
      )}

      {simulationStatus === 'complete' && simulationPath === null && (
        <div className="bg-danger/10 rounded-xl p-3 border border-danger/20">
          <div className="text-danger font-semibold text-sm mb-1">✗ No path found</div>
          <div className="text-text-secondary text-xs">Points may be disconnected</div>
        </div>
      )}
    </div>
  )
}

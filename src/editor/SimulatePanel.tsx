import { useCallback, useMemo } from 'react'
import { useStore } from './store'
import { getAllDestinations, resolveDestination } from '../core/roomRegions'
import type { NavDestination } from '../core/roomRegions'

const DEST_EMOJI: Record<NavDestination['type'], string> = {
  room: '\u{1F3E0}',
  exit: '\u{1F6A8}',
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
    <div className="w-72 bg-gray-800 border-l border-gray-700 p-3 text-sm overflow-y-auto">
      <h3 className="text-gray-200 font-semibold mb-3">Simulation</h3>

      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">From</label>
        <select
          value={simulationRoomA ?? ''}
          onChange={(e) => setDest('A', e.target.value || null)}
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

      <div className="mb-4">
        <label className="text-xs text-gray-400 block mb-1">To</label>
        <select
          value={simulationRoomB ?? ''}
          onChange={(e) => setDest('B', e.target.value || null)}
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

      <div className="mb-4">
        <h4 className="text-xs text-gray-400 mb-1">Options</h4>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input
            type="checkbox"
            checked={simulationOptions.accessibleOnly}
            onChange={(e) => setSimulationOption('accessibleOnly', e.target.checked)}
          />
          Accessible only
        </label>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input
            type="checkbox"
            checked={simulationOptions.preferElevator}
            onChange={(e) => setSimulationOption('preferElevator', e.target.checked)}
          />
          Prefer elevator
        </label>
        <label className="flex items-center gap-2 text-gray-300 mb-1">
          <input
            type="checkbox"
            checked={simulationOptions.noOutside}
            onChange={(e) => setSimulationOption('noOutside', e.target.checked)}
          />
          No outside
        </label>
        <div className="flex items-center gap-2 text-gray-300">
          <span className="text-xs">Max floor changes:</span>
          <input
            type="number"
            min={1}
            max={50}
            value={simulationOptions.maxFloorChanges}
            onChange={(e) => setSimulationOption('maxFloorChanges', Number(e.target.value))}
            className="w-14 bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs border border-gray-600 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-gray-300 mt-2">
          <span className="text-xs">Speed (cells/s):</span>
          <input
            type="number"
            min={1}
            max={100}
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Math.max(1, Number(e.target.value)))}
            className="w-14 bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-xs border border-gray-600 outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={runSimulation}
          disabled={!simulationRoomA && !simulationRoomB}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm transition-colors"
        >
          {simulationStatus === 'running' ? 'Running...' : 'Find Path'}
        </button>
        <button
          onClick={clearSimulation}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded text-sm transition-colors"
        >
          Clear
        </button>
      </div>

      {simulationPath !== null && (
        <div className="bg-gray-900 rounded p-2 text-xs">
          <div className="text-green-400 font-semibold mb-1">Path found!</div>
          <div className="text-gray-400">Steps: {simulationPath.length}</div>
        </div>
      )}

      {simulationStatus === 'complete' && simulationPath === null && (
        <div className="bg-gray-900 rounded p-2 text-xs">
          <div className="text-red-400 font-semibold">No path found</div>
          <div className="text-gray-400">Points may be disconnected</div>
        </div>
      )}
    </div>
  )
}

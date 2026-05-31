import { useCallback } from 'react'
import { useStore } from './store'
import { buildGraph } from '../core/GraphBuilder'
import { findPath } from '../core/Pathfinder'
import type { PathfinderOptions } from '../core/types'

export function useSimulation() {
  const simulationOptions = useStore((s) => s.simulationOptions)
  const simulationStatus = useStore((s) => s.simulationStatus)
  const simulationPath = useStore((s) => s.simulationPath)
  const setSimulationA = useStore((s) => s.setSimulationA)
  const setSimulationB = useStore((s) => s.setSimulationB)
  const runSimulation = useStore((s) => s.runSimulation)
  const clearSimulation = useStore((s) => s.clearSimulation)

  return {
    options: simulationOptions,
    status: simulationStatus,
    path: simulationPath,
    setPointA: setSimulationA,
    setPointB: setSimulationB,
    run: runSimulation,
    clear: clearSimulation,
  }
}

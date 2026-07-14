import { create } from 'zustand'
import { type BuildingMap, type MapFloor, type TileType, type OverlayType, type TileMeta } from '../core/types'
import { validate, validateFloorConnectivity } from '../core/validator'
import { buildGraph } from '../core/GraphBuilder'
import { findPath } from '../core/Pathfinder'
import { cleanupRoomMeta, cleanupStairsElevatorMeta, resolveDestination, getAllRoomRegions } from '../core/roomRegions'

export type EditorTool =
  | TileType
  | OverlayType
  | 'select'
  | 'eraser'
  | 'fill'
  | 'eyedrop'
  | 'fillRoom'

export type EditorMode = 'edit' | 'simulate' | 'preview'
export type SimulationStatus = 'idle' | 'running' | 'complete'

interface HistoryEntry {
  floors: MapFloor[]
}

function createDefaultFloor(
  floorIndex: number,
  label: string,
  order: number,
  width: number = 150,
  height: number = 150,
): MapFloor {
  const base: TileType[][] = Array.from({ length: height }, () =>
    Array(width).fill('floor') as TileType[],
  )
  const overlay: OverlayType[][] = Array.from({ length: height }, () =>
    Array(width).fill(null) as OverlayType[],
  )
  return { floorIndex, buildingId: 'building_0', label, order, width, height, base, overlay, meta: {} }
}

function cloneMapFloor(floor: MapFloor): MapFloor {
  return {
    ...floor,
    base: floor.base.map((r) => [...r]),
    overlay: floor.overlay.map((r) => [...r]),
    meta: { ...floor.meta },
  }
}

export interface EditorStore {
  map: BuildingMap
  activeFloor: number
  activeTool: EditorTool
  lastTileTool: EditorTool
  activeTab: 'base' | 'overlay'
  selection: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  mode: EditorMode
  straightMode: boolean

  simulationFloorA: number
  simulationRowA: number
  simulationColA: number
  simulationRoomA: string | null
  simulationFloorB: number
  simulationRowB: number
  simulationColB: number
  simulationRoomB: string | null
  simulationStatus: SimulationStatus
  simulationOptions: { accessibleOnly: boolean; preferElevator: boolean; maxFloorChanges: number; noOutside: boolean }
  simulationPath: string[] | null
  simulationSpeed: number
  simulationPaused: boolean
  pendingFloor: number | null

  history: HistoryEntry[]
  historyIndex: number

  validationErrors: Array<{ floorIndex: number; label: string; message: string }>
  isDark: boolean

  setActiveFloor: (floorIndex: number) => void
  setActiveTool: (tool: EditorTool) => void
  setActiveTab: (tab: 'base' | 'overlay') => void
  paint: (row: number, col: number, skipHistory?: boolean) => void
  paintOverlay: (row: number, col: number, skipHistory?: boolean) => void
  erase: (row: number, col: number, skipHistory?: boolean) => void
  setSelection: (sel: { startRow: number; startCol: number; endRow: number; endCol: number } | null) => void
  pasteRegion: (sourceStartRow: number, sourceStartCol: number, sourceEndRow: number, sourceEndCol: number, offsetRow: number, offsetCol: number) => void
  flipSelectionHorizontal: () => void
  flipSelectionVertical: () => void
  setTileMeta: (row: number, col: number, meta: Partial<TileMeta>) => void
  setMode: (mode: EditorMode) => void
  setStraightMode: (v: boolean) => void

  setSimulationA: (floor: number, row: number, col: number) => void
  setSimulationB: (floor: number, row: number, col: number) => void
  setSimulationRoomA: (roomId: string | null) => void
  setSimulationRoomB: (roomId: string | null) => void
  setSimulationOption: (key: string, value: boolean | number) => void
  setSimulationSpeed: (speed: number) => void
  setSimulationPaused: (paused: boolean, pendingFloor?: number | null) => void
  resumeSimulation: () => void
  runSimulation: () => void
  clearSimulation: () => void

  addFloor: (label?: string) => void
  duplicateFloor: (floorIndex: number, mode: 'full' | 'size') => void
  removeFloor: (floorIndex: number) => void
  renameFloor: (floorIndex: number, label: string) => void
  reorderFloor: (floorIndex: number, direction: 'up' | 'down') => void
  setFloorSize: (floorIndex: number, width: number, height: number) => void
  setFloorBuilding: (floorIndex: number, buildingId: string) => void
  addBuilding: (name?: string) => void
  removeBuilding: (buildingId: string) => void
  renameBuilding: (buildingId: string, name: string) => void

  exportMap: () => BuildingMap
  exportFull: () => {
    map: BuildingMap
    simulation: {
      roomA: string | null
      roomB: string | null
      options: EditorStore['simulationOptions']
      path: Array<{ id: string; floorIndex: number; row: number; col: number; base: TileType; overlay: OverlayType }> | null
      paused: boolean
      pendingFloor: number | null
    }
    tileClasses: Record<string, string>
    overlayClasses: Record<string, string>
    regions: Record<string, { label: string | null; tiles: Array<{ row: number; col: number }>; anchor: { row: number; col: number }; floorIndex: number; doorCount: number; type: 'room' | 'hallway' }>
  }
  importMap: (map: BuildingMap) => void
  canUndo: () => boolean
  canRedo: () => boolean
  undo: () => void
  redo: () => void
  pushHistory: () => void
  runValidation: () => void
  toggleTheme: () => void
}

function getInitialMap(): BuildingMap {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
    name: 'Untitled Map',
    version: '3.0.0',
    createdAt: now,
    updatedAt: now,
    floors: [createDefaultFloor(0, 'Ground Floor', 0)],
    defaultFloor: 0,
    buildings: [{ id: 'building_0', name: 'Building A' }],
  }
}

const _initialMap = getInitialMap()

export const useStore = create<EditorStore>((set, get) => ({
  map: _initialMap,
  activeFloor: 0,
  activeTool: 'select',
  lastTileTool: 'wall',
  activeTab: 'base',
  selection: null,
  mode: 'edit',
  straightMode: false,

  simulationFloorA: 0,
  simulationRowA: 0,
  simulationColA: 0,
  simulationRoomA: null,
  simulationFloorB: 0,
  simulationRowB: 0,
  simulationColB: 0,
  simulationRoomB: null,
  simulationStatus: 'idle',
  simulationOptions: { accessibleOnly: false, preferElevator: false, maxFloorChanges: 10, noOutside: false },
  simulationPath: null,
  simulationSpeed: 3,
  simulationPaused: false,
  pendingFloor: null,

  history: [{ floors: _initialMap.floors.map(cloneMapFloor) }],
  historyIndex: 0,

  validationErrors: [],
  isDark: document.documentElement.classList.contains('dark'),

  toggleTheme: () => {
    const next = !get().isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('mapcreator-theme', next ? 'dark' : 'light')
    set({ isDark: next })
  },

  setActiveFloor: (floorIndex) => {
    set({ activeFloor: floorIndex, selection: null })
    get().runValidation()
  },

  setActiveTool: (tool) => {
    if (tool === 'door' || tool === 'exit_door' || tool === 'room') {
      set({ activeTool: tool, activeTab: 'overlay', lastTileTool: tool })
    } else if (
      tool === 'wall' ||
      tool === 'floor' ||
      tool === 'stairs' ||
      tool === 'elevator' ||
      tool === 'outside' ||
      tool === 'void' ||
      tool === 'dirt_path'
    ) {
      set({ activeTool: tool, activeTab: 'base', lastTileTool: tool })
    } else if (tool === 'fillRoom') {
      set({ activeTool: tool, lastTileTool: tool })
    } else {
      set({ activeTool: tool })
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab })
  },

  paint: (row, col, skipHistory) => {
    const { map, activeFloor, activeTool } = get()
    if (activeTool === 'select' || activeTool === 'eraser' || activeTool === 'fill' || activeTool === 'eyedrop') return

    const tile = activeTool as TileType
    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return

    if (row < 0 || row >= floor.height || col < 0 || col >= floor.width) return

    const isStairsOrElevator = tile === 'stairs' || tile === 'elevator'
    const oldTile = floor.base[row]?.[col]
    const wasStairsOrElevator = oldTile === 'stairs' || oldTile === 'elevator'
    const needsStairsCleanup = isStairsOrElevator || wasStairsOrElevator || tile === 'void'

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newBase = f.base.map((r) => [...r])
      newBase[row][col] = tile

      if (tile === 'void') {
        const newOverlay = f.overlay.map((r) => [...r])
        newOverlay[row][col] = null
        const newMeta = { ...f.meta }
        delete newMeta[`${row},${col}`]
        let result = cleanupRoomMeta({ ...f, base: newBase, overlay: newOverlay, meta: newMeta })
        if (needsStairsCleanup) result = cleanupStairsElevatorMeta(result)
        return result
      }

      const existingOverlay = f.overlay[row][col]
      if (existingOverlay === 'room' && tile !== 'floor') {
        const newOverlay = f.overlay.map((r) => [...r])
        newOverlay[row][col] = null
        const newMeta = { ...f.meta }
        delete newMeta[`${row},${col}`]
        let result = cleanupRoomMeta({ ...f, base: newBase, overlay: newOverlay, meta: newMeta })
        if (needsStairsCleanup) result = cleanupStairsElevatorMeta(result)
        return result
      }
      if ((existingOverlay === 'door' || existingOverlay === 'exit_door') && tile !== 'wall') {
        const newOverlay = f.overlay.map((r) => [...r])
        newOverlay[row][col] = null
        let result = { ...f, base: newBase, overlay: newOverlay }
        if (needsStairsCleanup) result = cleanupStairsElevatorMeta(result)
        return result
      }

      let result = { ...f, base: newBase }
      if (needsStairsCleanup) result = cleanupStairsElevatorMeta(result)
      return result
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }

    if (isStairsOrElevator) {
      const key = `${row},${col}`
      const activeFloorObj = newFloors.find((f) => f.floorIndex === activeFloor)
      if (activeFloorObj) {
        const autoMeta: Record<string, unknown> = {}
        const curBid = activeFloorObj.buildingId
        for (const otherFloor of map.floors) {
          if (otherFloor.floorIndex === activeFloor) continue
          const otherBid = otherFloor.buildingId
          if (curBid && otherBid && curBid !== otherBid) continue
          if (otherFloor.base[row]?.[col] !== tile) continue
          const otherMeta = otherFloor.meta[key]
          if (!otherMeta) continue
          if (tile === 'stairs') {
            if (otherMeta.toFloorSuperior === activeFloor && autoMeta['toFloorInferior'] == null) {
              autoMeta['toFloorInferior'] = otherFloor.floorIndex
            }
            if (otherMeta.toFloorInferior === activeFloor && autoMeta['toFloorSuperior'] == null) {
              autoMeta['toFloorSuperior'] = otherFloor.floorIndex
            }
          } else if (tile === 'elevator') {
            const conn = otherMeta.connectedFloors
            if (Array.isArray(conn) && conn.includes(activeFloor)) {
              const existing: number[] = activeFloorObj.meta[key]?.connectedFloors ?? []
              autoMeta['connectedFloors'] = [...new Set([...existing, otherFloor.floorIndex])].sort((a, b) => a - b)
            }
          }
        }
        if (Object.keys(autoMeta).length > 0) {
          const groupTiles: Array<{ row: number; col: number }> = []
          const visited = new Set<string>()
          const queue = [{ row, col }]
          visited.add(key)
          while (queue.length > 0) {
            const cur = queue.pop()!
            groupTiles.push(cur)
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nr = cur.row + dr
              const nc = cur.col + dc
              const nk = `${nr},${nc}`
              if (visited.has(nk)) continue
              if (activeFloorObj.base[nr]?.[nc] !== tile) continue
              visited.add(nk)
              queue.push({ row: nr, col: nc })
            }
          }
          const anchorRow = Math.min(...groupTiles.map((t) => t.row))
          const anchorCol = Math.min(...groupTiles.filter((t) => t.row === anchorRow).map((t) => t.col))
          const idx = newFloors.findIndex((f) => f.floorIndex === activeFloor)
          if (idx !== -1) {
            const aKey = `${anchorRow},${anchorCol}`
            newFloors[idx] = cleanupStairsElevatorMeta({
              ...activeFloorObj,
              meta: { ...activeFloorObj.meta, [aKey]: { ...(activeFloorObj.meta[aKey] ?? {}), ...autoMeta } },
            })
          }
        }
      }
    }

    set({ map: newMap })
    if (!skipHistory) get().pushHistory()
    get().runValidation()
  },

  paintOverlay: (row, col, skipHistory) => {
    const { map, activeFloor, activeTool } = get()
    if (activeTool === 'select' || activeTool === 'eraser' || activeTool === 'fill' || activeTool === 'eyedrop') return

    const overlay = activeTool as OverlayType
    if (!overlay) return

    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return

    if (row < 0 || row >= floor.height || col < 0 || col >= floor.width) return

    const baseType = floor.base[row][col]
    if (overlay === 'door' || overlay === 'exit_door') {
      if (baseType !== 'wall') return
    }
    if (overlay === 'room') {
      if (baseType !== 'floor') return
    }

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newOverlay = f.overlay.map((r) => [...r])
      newOverlay[row][col] = overlay
      if (overlay === 'room') {
        if (!f.meta[`${row},${col}`]) {
          const newMeta = { ...f.meta, [`${row},${col}`]: { label: '' } }
          return cleanupRoomMeta({ ...f, overlay: newOverlay, meta: newMeta })
        }
        return cleanupRoomMeta({ ...f, overlay: newOverlay })
      }
      return { ...f, overlay: newOverlay }
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    if (!skipHistory) get().pushHistory()
    get().runValidation()
  },

  erase: (row, col, skipHistory) => {
    const { map, activeFloor } = get()
    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return
    if (row < 0 || row >= floor.height || col < 0 || col >= floor.width) return

    const oldTile = floor.base[row]?.[col]
    const wasStairsOrElevator = oldTile === 'stairs' || oldTile === 'elevator'

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newBase = f.base.map((r) => [...r])
      const newOverlay = f.overlay.map((r) => [...r])
      const newMeta = { ...f.meta }
      newBase[row][col] = 'void'
      newOverlay[row][col] = null
      delete newMeta[`${row},${col}`]
      let cleaned = { ...f, base: newBase, overlay: newOverlay, meta: newMeta }
      cleaned = cleanupRoomMeta(cleaned)
      if (wasStairsOrElevator) cleaned = cleanupStairsElevatorMeta(cleaned)
      return cleaned
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    if (!skipHistory) get().pushHistory()
    get().runValidation()
  },

  setSelection: (sel) => {
    set({ selection: sel })
  },

  pasteRegion: (sourceStartRow, sourceStartCol, sourceEndRow, sourceEndCol, offsetRow, offsetCol) => {
    const { map, activeFloor } = get()
    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return
    if (offsetRow === 0 && offsetCol === 0) return

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newBase = f.base.map((r) => [...r])
      const newOverlay = f.overlay.map((r) => [...r])
      const newMeta = { ...f.meta }
      let hasRoom = false

      for (let r = sourceStartRow; r <= sourceEndRow; r++) {
        for (let c = sourceStartCol; c <= sourceEndCol; c++) {
          const tr = r + offsetRow
          const tc = c + offsetCol
          if (tr < 0 || tr >= f.height || tc < 0 || tc >= f.width) continue

          const srcBase = f.base[r][c]
          if (srcBase) {
            newBase[tr][tc] = srcBase
          }
          const srcOverlay = f.overlay[r][c]
          if (srcOverlay) {
            newOverlay[tr][tc] = srcOverlay
            if (srcOverlay === 'room') {
              hasRoom = true
              if (!newMeta[`${tr},${tc}`]) {
                newMeta[`${tr},${tc}`] = { label: '' }
              }
            }
          }
        }
      }

      let result = { ...f, base: newBase, overlay: newOverlay, meta: newMeta }
      if (hasRoom) result = cleanupRoomMeta(result)
      return result
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    get().pushHistory()
    get().runValidation()
  },

  flipSelectionHorizontal: () => {
    const { map, activeFloor, selection } = get()
    if (!selection) return
    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return

    const { startRow, startCol, endRow, endCol } = selection
    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newBase = f.base.map((r) => [...r])
      const newOverlay = f.overlay.map((r) => [...r])
      let hasRoom = false

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= Math.floor((startCol + endCol) / 2); c++) {
          const mirrorC = endCol - (c - startCol)
          if (mirrorC === c) continue

          const tmpBase = newBase[r][c]
          newBase[r][c] = newBase[r][mirrorC]
          newBase[r][mirrorC] = tmpBase

          const tmpOverlay = newOverlay[r][c]
          newOverlay[r][c] = newOverlay[r][mirrorC]
          newOverlay[r][mirrorC] = tmpOverlay

          if (newOverlay[r][c] === 'room') hasRoom = true
          if (newOverlay[r][mirrorC] === 'room') hasRoom = true
        }
      }

      let result = { ...f, base: newBase, overlay: newOverlay }
      if (hasRoom) result = cleanupRoomMeta(result)
      return result
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    get().pushHistory()
    get().runValidation()
  },

  flipSelectionVertical: () => {
    const { map, activeFloor, selection } = get()
    if (!selection) return
    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor) return

    const { startRow, startCol, endRow, endCol } = selection
    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f
      const newBase = f.base.map((r) => [...r])
      const newOverlay = f.overlay.map((r) => [...r])
      let hasRoom = false

      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= Math.floor((startRow + endRow) / 2); r++) {
          const mirrorR = endRow - (r - startRow)
          if (mirrorR === r) continue

          const tmpBase = newBase[r][c]
          newBase[r][c] = newBase[mirrorR][c]
          newBase[mirrorR][c] = tmpBase

          const tmpOverlay = newOverlay[r][c]
          newOverlay[r][c] = newOverlay[mirrorR][c]
          newOverlay[mirrorR][c] = tmpOverlay

          if (newOverlay[r][c] === 'room') hasRoom = true
          if (newOverlay[mirrorR][c] === 'room') hasRoom = true
        }
      }

      let result = { ...f, base: newBase, overlay: newOverlay }
      if (hasRoom) result = cleanupRoomMeta(result)
      return result
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    get().pushHistory()
    get().runValidation()
  },

  setTileMeta: (row, col, meta) => {
    const { map, activeFloor } = get()

    const isConnMeta = 'toFloorSuperior' in meta || 'toFloorInferior' in meta || 'connectedFloors' in meta

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== activeFloor) return f

      if (isConnMeta) {
        const bt = f.base[row]?.[col]
        if (bt === 'stairs' || bt === 'elevator') {
          const groupTiles: Array<{ row: number; col: number }> = []
          const visited = new Set<string>()
          const queue = [{ row, col }]
          visited.add(`${row},${col}`)
          while (queue.length > 0) {
            const cur = queue.pop()!
            groupTiles.push(cur)
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nr = cur.row + dr
              const nc = cur.col + dc
              const nk = `${nr},${nc}`
              if (visited.has(nk)) continue
              if (f.base[nr]?.[nc] !== bt) continue
              visited.add(nk)
              queue.push({ row: nr, col: nc })
            }
          }
          const anchorRow = Math.min(...groupTiles.map((t) => t.row))
          const anchorCol = Math.min(...groupTiles.filter((t) => t.row === anchorRow).map((t) => t.col))
          return cleanupStairsElevatorMeta({
            ...f,
            meta: { ...f.meta, [`${anchorRow},${anchorCol}`]: { ...(f.meta[`${anchorRow},${anchorCol}`] ?? {}), ...meta } },
          })
        }
      }

      const key = `${row},${col}`
      return {
        ...f,
        meta: { ...f.meta, [key]: { ...(f.meta[key] ?? {}), ...meta } },
      }
    })

    const newMap = { ...map, floors: newFloors, updatedAt: new Date().toISOString() }
    set({ map: newMap })
    get().runValidation()
  },

  setMode: (mode) => {
    set({ mode })
  },

  setStraightMode: (v) => {
    set({ straightMode: v })
  },

  setSimulationA: (floor, row, col) => {
    set({ simulationFloorA: floor, simulationRowA: row, simulationColA: col, simulationRoomA: null, simulationPath: null, simulationStatus: 'idle' })
  },

  setSimulationB: (floor, row, col) => {
    set({ simulationFloorB: floor, simulationRowB: row, simulationColB: col, simulationRoomB: null, simulationPath: null, simulationStatus: 'idle' })
  },

  setSimulationRoomA: (roomId) => {
    set({ simulationRoomA: roomId, simulationPath: null, simulationStatus: 'idle' })
  },

  setSimulationRoomB: (roomId) => {
    set({ simulationRoomB: roomId, simulationPath: null, simulationStatus: 'idle' })
  },

  setSimulationOption: (key, value) => {
    set((s) => ({
      simulationOptions: { ...s.simulationOptions, [key]: value },
      simulationPath: null,
      simulationStatus: 'idle',
    }))
  },

  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed })
  },

  runSimulation: () => {
    const { map, simulationRoomA, simulationRoomB, simulationFloorA, simulationRowA, simulationColA, simulationFloorB, simulationRowB, simulationColB, simulationOptions } = get()
    set({ simulationStatus: 'running' })

    const fromDests: Array<{ floorIndex: number; row: number; col: number }> = simulationRoomA
      ? resolveDestination(map, simulationRoomA)
      : [{ floorIndex: simulationFloorA, row: simulationRowA, col: simulationColA }]

    const toDests: Array<{ floorIndex: number; row: number; col: number }> = simulationRoomB
      ? resolveDestination(map, simulationRoomB)
      : [{ floorIndex: simulationFloorB, row: simulationRowB, col: simulationColB }]

    if (fromDests.length === 0 || toDests.length === 0) {
      set({ simulationPath: null, simulationStatus: 'complete' })
      return
    }

    const graphData = buildGraph(map, { noOutside: simulationOptions.noOutside })
    let bestPath: string[] | null = null

    for (const a of fromDests) {
      for (const b of toDests) {
        const fromId = `${a.floorIndex}:${a.row}:${a.col}`
        const toId = `${b.floorIndex}:${b.row}:${b.col}`
        const result = findPath(graphData, fromId, toId, simulationOptions)
        if (result.found && (!bestPath || result.path.length < bestPath.length)) {
          bestPath = result.path.map((n) => n.id)
        }
      }
    }

    if (bestPath) {
      set({ simulationPath: bestPath, simulationStatus: 'complete' })
    } else {
      set({ simulationPath: null, simulationStatus: 'complete' })
    }
  },

  setSimulationPaused: (paused, pendingFloor) => {
    set({ simulationPaused: paused, pendingFloor: pendingFloor ?? null })
  },

  resumeSimulation: () => {
    const { pendingFloor } = get()
    if (pendingFloor != null) {
      get().setActiveFloor(pendingFloor)
    }
    set({ simulationPaused: false, pendingFloor: null })
  },

  clearSimulation: () => {
    set({ simulationPath: null, simulationStatus: 'idle', simulationRoomA: null, simulationRoomB: null, simulationPaused: false, pendingFloor: null })
  },

  addFloor: (label) => {
    const { map } = get()
    const maxIndex = Math.max(...map.floors.map((f) => f.floorIndex), -1)
    const newIndex = maxIndex + 1
    const order = map.floors.length

    const floor = createDefaultFloor(newIndex, label ?? `Floor ${newIndex + 1}`, order)
    set({
      map: {
        ...map,
        floors: [...map.floors, floor],
        updatedAt: new Date().toISOString(),
      },
      activeFloor: newIndex,
    })
    get().pushHistory()
    get().runValidation()
  },

  duplicateFloor: (floorIndex, mode) => {
    const { map } = get()
    const source = map.floors.find((f) => f.floorIndex === floorIndex)
    if (!source) return

    const maxIndex = Math.max(...map.floors.map((f) => f.floorIndex), -1)
    const newIndex = maxIndex + 1

    let newFloor: MapFloor
    if (mode === 'full') {
      newFloor = {
        ...source,
        floorIndex: newIndex,
        order: map.floors.length,
        label: source.label + ' (copy)',
        base: source.base.map((r) => [...r]),
        overlay: source.overlay.map((r) => [...r]),
        meta: { ...source.meta },
      }
    } else {
      newFloor = {
        ...source,
        floorIndex: newIndex,
        order: map.floors.length,
        label: `Floor ${newIndex + 1}`,
        base: Array.from({ length: source.height }, () =>
          Array(source.width).fill('floor') as TileType[],
        ),
        overlay: Array.from({ length: source.height }, () =>
          Array(source.width).fill(null) as OverlayType[],
        ),
        meta: {},
      }
    }

    set({
      map: {
        ...map,
        floors: [...map.floors, newFloor],
        updatedAt: new Date().toISOString(),
      },
      activeFloor: newIndex,
    })
    get().pushHistory()
    get().runValidation()
  },

  removeFloor: (floorIndex) => {
    const { map } = get()
    if (map.floors.length <= 1) return

    const newFloors = map.floors.filter((f) => f.floorIndex !== floorIndex)
    const newMap = {
      ...map,
      floors: newFloors,
      defaultFloor: map.defaultFloor === floorIndex ? newFloors[0]!.floorIndex : map.defaultFloor,
      updatedAt: new Date().toISOString(),
    }
    set({ map: newMap, activeFloor: Math.min(get().activeFloor, newFloors.length - 1) })
    get().pushHistory()
    get().runValidation()
  },

  renameFloor: (floorIndex, label) => {
    const { map } = get()

    const newFloors = map.floors.map((f) =>
      f.floorIndex === floorIndex ? { ...f, label } : f,
    )

    set({ map: { ...map, floors: newFloors, updatedAt: new Date().toISOString() } })
    get().pushHistory()
  },

  setFloorBuilding: (floorIndex, buildingId) => {
    const { map } = get()

    const newFloors = map.floors.map((f) =>
      f.floorIndex === floorIndex ? { ...f, buildingId } : f,
    )

    set({ map: { ...map, floors: newFloors, updatedAt: new Date().toISOString() } })
    get().pushHistory()
  },

  addBuilding: (name) => {
    const { map } = get()
    const id = `building_${map.buildings.length}_${Date.now()}`
    const newBuilding = { id, name: name ?? `Building ${map.buildings.length + 1}` }
    set({
      map: {
        ...map,
        buildings: [...map.buildings, newBuilding],
        updatedAt: new Date().toISOString(),
      },
    })
  },

  removeBuilding: (buildingId) => {
    const { map } = get()
    if (map.buildings.length <= 1) return
    const remaining = map.buildings.filter((b) => b.id !== buildingId)
    const fallbackId = remaining[0]!.id
    const newFloors = map.floors.map((f) =>
      f.buildingId === buildingId ? { ...f, buildingId: fallbackId } : f,
    )
    set({
      map: {
        ...map,
        buildings: remaining,
        floors: newFloors,
        updatedAt: new Date().toISOString(),
      },
    })
  },

  renameBuilding: (buildingId, name) => {
    const { map } = get()
    const newBuildings = map.buildings.map((b) =>
      b.id === buildingId ? { ...b, name } : b,
    )
    set({ map: { ...map, buildings: newBuildings, updatedAt: new Date().toISOString() } })
  },

  reorderFloor: (floorIndex, direction) => {
    const { map } = get()
    const floors = [...map.floors]
    const idx = floors.findIndex((f) => f.floorIndex === floorIndex)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= floors.length) return

    const temp = floors[idx]!
    floors[idx] = floors[swapIdx]!
    floors[swapIdx] = { ...temp, order: floors[swapIdx]!.order }
    floors[idx] = { ...floors[idx]!, order: temp.order }

    set({ map: { ...map, floors, updatedAt: new Date().toISOString() } })
    get().pushHistory()
  },

  setFloorSize: (floorIndex, width, height) => {
    const { map } = get()

    const newFloors = map.floors.map((f) => {
      if (f.floorIndex !== floorIndex) return f
      const clampedWidth = Math.max(5, Math.min(500, Math.round(width)))
      const clampedHeight = Math.max(5, Math.min(500, Math.round(height)))

      const newBase: TileType[][] = Array.from({ length: clampedHeight }, (_, r) => {
        const row = f.base[r] ?? []
        return Array.from({ length: clampedWidth }, (_, c) => row[c] ?? 'void') as TileType[]
      })

      const newOverlay: OverlayType[][] = Array.from({ length: clampedHeight }, (_, r) => {
        const row = f.overlay[r] ?? []
        return Array.from({ length: clampedWidth }, (_, c) => row[c] ?? null) as OverlayType[]
      })

      const newMeta: Record<string, TileMeta> = {}
      for (const key of Object.keys(f.meta)) {
        const [mr, mc] = key.split(',').map(Number)
        if (mr != null && mc != null && mr < clampedHeight && mc < clampedWidth) {
          newMeta[key] = f.meta[key]!
        }
      }

      return { ...f, width: clampedWidth, height: clampedHeight, base: newBase, overlay: newOverlay, meta: newMeta }
    })

    set({ map: { ...map, floors: newFloors, updatedAt: new Date().toISOString() } })
    get().pushHistory()
    get().runValidation()
  },

  exportMap: () => {
    return get().map
  },

  exportFull: () => {
    const s = get()
    const roomRegions = getAllRoomRegions(s.map)
    const regions: Record<string, { label: string | null; tiles: Array<{ row: number; col: number }>; anchor: { row: number; col: number }; floorIndex: number; doorCount: number; type: 'room' | 'hallway' }> = {}
    for (const r of roomRegions) {
      regions[r.id] = {
        label: r.label,
        tiles: r.tiles,
        anchor: r.anchor,
        floorIndex: r.floorIndex,
        doorCount: r.doorCount,
        type: r.type,
      }
    }

    const path: Array<{ id: string; floorIndex: number; row: number; col: number; base: TileType; overlay: OverlayType }> | null = s.simulationPath
      ? s.simulationPath.map((id) => {
          const parts = id.split(':')
          const fi = Number(parts[0]), r = Number(parts[1]), c = Number(parts[2])
          const floor = s.map.floors.find((f) => f.floorIndex === fi)
          return {
            id,
            floorIndex: fi, row: r, col: c,
            base: (floor?.base[r]?.[c] ?? 'void') as TileType,
            overlay: (floor?.overlay[r]?.[c] ?? null) as OverlayType,
          }
        })
      : null

    return {
      map: s.map,
      simulation: {
        roomA: s.simulationRoomA,
        roomB: s.simulationRoomB,
        options: s.simulationOptions,
        path,
        paused: s.simulationPaused,
        pendingFloor: s.pendingFloor,
      },
      tileClasses: {
        wall: 'tile-wall',
        floor: 'tile-floor',
        stairs: 'tile-stairs',
        elevator: 'tile-elevator',
        outside: 'tile-outside',
        dirt_path: 'tile-dirt-path',
        void: 'tile-void',
      },
      overlayClasses: {
        door: 'tile-door',
        exit_door: 'tile-exit-door',
        room: 'tile-room',
      },
      regions,
    }
  },

  importMap: (map) => {
    const validation = validate(map)
    if (validation.success) {
      const data = validation.data as BuildingMap
      if (!data.buildings || data.buildings.length === 0) {
        data.buildings = [{ id: 'building_default', name: 'Default Building' }]
      }
      for (const floor of data.floors) {
        if (!floor.buildingId) {
          floor.buildingId = data.buildings[0].id
        }
      }
      set({ map: data, history: [], historyIndex: -1, selection: null })
      get().runValidation()
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex <= 0) return

    const entry = history[historyIndex - 1]
    if (!entry) return

    const { map } = get()
    const restoredMap = {
      ...map,
      floors: entry.floors,
      updatedAt: new Date().toISOString(),
    }

    set({
      map: restoredMap,
      historyIndex: historyIndex - 1,
      selection: null,
    })
    get().runValidation()
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return

    const entry = history[historyIndex + 1]
    if (!entry) return

    const { map } = get()
    const restoredMap = {
      ...map,
      floors: entry.floors,
      updatedAt: new Date().toISOString(),
    }

    set({
      map: restoredMap,
      historyIndex: historyIndex + 1,
      selection: null,
    })
    get().runValidation()
  },

  pushHistory: () => {
    const { map, history, historyIndex } = get()
    const entry: HistoryEntry = { floors: map.floors.map(cloneMapFloor) }

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(entry)

    if (newHistory.length > 50) {
      newHistory.shift()
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  runValidation: () => {
    const { map } = get()
    try {
      const errors = validateFloorConnectivity(map)
      set({ validationErrors: errors })
    } catch {
      set({ validationErrors: [] })
    }
  },
}))

import React, { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { renderFrame, type RenderState, type GhostGroupInfo } from './renderer'
import { getAllDestinations, findRoomRegions, findOverlayGroups } from '../../core/roomRegions'
import type { RoomRegion, OverlayGroup, BuildingMap, MapFloor } from '../../core/types'
import { setupInteraction, getStraightGhost, getFillGhost } from './interaction'
import { getTileStyles } from '../../theme/tileStyles'

function findStairElevatorGroups(floor: MapFloor): GhostGroupInfo[] {
  const visited = new Set<string>()
  const groups: GhostGroupInfo[] = []
  const DIRS4 = [[0, 1], [0, -1], [1, 0], [-1, 0]]

  for (let r = 0; r < floor.height; r++) {
    for (let c = 0; c < floor.width; c++) {
      const key = `${r},${c}`
      if (visited.has(key)) continue
      const bt = floor.base[r]?.[c]
      if (bt !== 'stairs' && bt !== 'elevator') continue
      visited.add(key)

      const tiles: Array<{ row: number; col: number }> = []
      const queue = [{ row: r, col: c }]
      while (queue.length > 0) {
        const cur = queue.pop()!
        tiles.push(cur)
        for (const [dr, dc] of DIRS4) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visited.has(nk)) continue
          if (floor.base[nr]?.[nc] !== bt) continue
          visited.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      const anchorRow = Math.min(...tiles.map((t) => t.row))
      const anchorCol = Math.min(...tiles.filter((t) => t.row === anchorRow).map((t) => t.col))
      groups.push({
        type: bt as 'stairs' | 'elevator',
        tiles,
        anchor: { row: anchorRow, col: anchorCol },
      })
    }
  }

  return groups
}

export default function EditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileSizeRef = useRef(24)
  const offsetRef = useRef({ offsetX: 0, offsetY: 0 })
  const rafRef = useRef<number>(0)
  const animRef = useRef<number>(0)

  const map = useStore((s) => s.map)
  const activeFloor = useStore((s) => s.activeFloor)
  const setSimulationA = useStore((s) => s.setSimulationA)
  const setSimulationB = useStore((s) => s.setSimulationB)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const cleanup = setupInteraction(
      canvas,
      () => tileSizeRef.current,
      () => offsetRef.current,
      (ox, oy) => { offsetRef.current = { offsetX: ox, offsetY: oy } },
      (ts) => { tileSizeRef.current = ts },
    )

    return cleanup
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastW = -1, lastH = -1
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      if (pw !== lastW || ph !== lastH) {
        canvas.width = pw
        canvas.height = ph
        lastW = pw
        lastH = ph
      }
    }
    resize()
    window.addEventListener('resize', resize)

    let head = 0
    let lastTime = performance.now()

    let cachedFloorRegions: { floorIdx: number; regions: RoomRegion[] } | null = null
    let cachedGroupsByFloor: Map<number, GhostGroupInfo[]> | null = null
    let lastGroupsMap: BuildingMap | null = null
    let cachedDests: ReturnType<typeof getAllDestinations> = []
    let lastDestsMap: BuildingMap | null = null
    let cachedExitGroups: { floorIdx: number; groups: OverlayGroup[] } | null = null
    let cachedDoorGroups: { floorIdx: number; groups: OverlayGroup[] } | null = null

    function computeGhostGroups(
      s: ReturnType<typeof useStore.getState>,
      curFloor: MapFloor,
    ): GhostGroupInfo[] {
      if (cachedGroupsByFloor === null || s.map !== lastGroupsMap) {
        cachedGroupsByFloor = new Map()
        for (const f of s.map.floors) {
          cachedGroupsByFloor.set(f.floorIndex, findStairElevatorGroups(f))
        }
        lastGroupsMap = s.map
      }

      const result: GhostGroupInfo[] = []
      const curBid = curFloor.buildingId

      for (const f of s.map.floors) {
        if (f.floorIndex === s.activeFloor) continue
        const otherBid = f.buildingId
        if (curBid && otherBid && curBid !== otherBid) continue

        const groups = cachedGroupsByFloor.get(f.floorIndex) ?? []
        for (const g of groups) {
          const meta = f.meta[`${g.anchor.row},${g.anchor.col}`]
          let connects = false
          if (g.type === 'stairs') {
            if (meta?.toFloorSuperior === s.activeFloor || meta?.toFloorInferior === s.activeFloor) connects = true
          } else if (g.type === 'elevator') {
            if (meta?.connectedFloors?.includes(s.activeFloor)) connects = true
          }
          if (connects) result.push(g)
        }
      }

      return result
    }

    const loop = (now: number) => {
      const s = useStore.getState()
      const path = s.simulationPath

      if (s.simulationStatus === 'complete' && path) {
        if (!s.simulationPaused) {
          const delta = (now - lastTime) / 1000
          lastTime = now
          head = Math.min(head + s.simulationSpeed * delta, path.length - 1)
          const headIdx = Math.floor(head)
          animRef.current = headIdx

          const parts = path[headIdx]?.split(':')
          if (parts) {
            const curFloor = Number(parts[0])
            if (curFloor !== s.activeFloor) {
              s.setActiveFloor(curFloor)
            }
          }

          const nextIdx = headIdx + 1
          if (nextIdx < path.length) {
            const nextParts = path[nextIdx]?.split(':')
            if (nextParts) {
              const nextFloor = Number(nextParts[0])
              if (nextFloor !== s.activeFloor) {
                head = headIdx
                animRef.current = headIdx
                s.setSimulationPaused(true, nextFloor)
              }
            }
          }
        } else {
          lastTime = now
        }
      } else {
        head = 0
        lastTime = performance.now()
        animRef.current = 0
      }

      const curFloor = s.map.floors.find((f) => f.floorIndex === s.activeFloor)

      let regions: RoomRegion[] | undefined
      if (curFloor) {
        if (cachedFloorRegions?.floorIdx === s.activeFloor) {
          regions = cachedFloorRegions.regions
        } else {
          regions = findRoomRegions(curFloor)
          cachedFloorRegions = { floorIdx: s.activeFloor, regions }
        }
      }

      let ghostGroups: GhostGroupInfo[] | undefined
      let stairBorders: GhostGroupInfo[] | undefined
      let exitGroups: OverlayGroup[] | undefined
      let doorGroups: OverlayGroup[] | undefined
      if (curFloor) {
        ghostGroups = computeGhostGroups(s, curFloor)
        stairBorders = cachedGroupsByFloor?.get(s.activeFloor) ?? findStairElevatorGroups(curFloor)
        if (cachedExitGroups?.floorIdx === s.activeFloor) {
          exitGroups = cachedExitGroups.groups
        } else {
          exitGroups = findOverlayGroups(curFloor, 'exit_door')
          cachedExitGroups = { floorIdx: s.activeFloor, groups: exitGroups }
        }
        if (cachedDoorGroups?.floorIdx === s.activeFloor) {
          doorGroups = cachedDoorGroups.groups
        } else {
          doorGroups = findOverlayGroups(curFloor, 'door')
          cachedDoorGroups = { floorIdx: s.activeFloor, groups: doorGroups }
        }
      }

      let allDests: ReturnType<typeof getAllDestinations> = []
      if (s.mode === 'simulate') {
        if (s.map !== lastDestsMap) {
          allDests = getAllDestinations(s.map)
          lastDestsMap = s.map
          cachedDests = allDests
        } else {
          allDests = cachedDests
        }
      }

      const findLabel = (id: string | null) => {
        if (!id) return undefined
        const d = allDests.find((d) => d.id === id)
        return d?.label
      }

      const state: RenderState = {
        map: s.map,
        activeFloor: s.activeFloor,
        mode: s.mode,
        isDark: s.isDark,
        tileSize: tileSizeRef.current,
        offsetX: offsetRef.current.offsetX,
        offsetY: offsetRef.current.offsetY,
        selection: s.selection,
        simulationPath: path,
        simulationFloorA: s.simulationFloorA,
        simulationRowA: s.simulationRowA,
        simulationColA: s.simulationColA,
        simulationFloorB: s.simulationFloorB,
        simulationRowB: s.simulationRowB,
        simulationColB: s.simulationColB,
        animHead: animRef.current,
        showGrid: true,
        straightGhost: getStraightGhost(),
        fillGhost: getFillGhost(),
        fillGhostFill: (() => {
          const lt = s.lastTileTool
          if (lt && lt !== 'fill' && lt !== 'eraser' && lt !== 'select' && lt !== 'eyedrop' && lt !== 'fillRoom') {
            const ts = getTileStyles(s.isDark)
            const fill = (ts as any)[lt]?.fill
            if (fill) return fill
          }
          return 'rgba(255,255,255,0.3)'
        })(),
        destALabel: findLabel(s.simulationRoomA),
        destBLabel: findLabel(s.simulationRoomB),
        cachedRegions: regions,
        cachedGhostGroups: ghostGroups,
        cachedStairBorders: stairBorders,
        cachedExitGroups: exitGroups,
        cachedDoorGroups: doorGroups,
      }

      renderFrame(ctx, state)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (useStore.getState().mode !== 'simulate') return
    const tileSize = tileSizeRef.current
    const { offsetX, offsetY } = offsetRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor((x - offsetX) / tileSize)
    const row = Math.floor((y - offsetY) / tileSize)

    const floor = map.floors.find((f) => f.floorIndex === activeFloor)
    if (!floor || row < 0 || row >= floor.height || col < 0 || col >= floor.width) return
    const base = floor.base[row]?.[col]
    if (!base || base === 'void' || base === 'outside') return

    if (e.shiftKey) {
      setSimulationB(activeFloor, row, col)
    } else {
      setSimulationA(activeFloor, row, col)
    }
  }, [map, activeFloor, setSimulationA, setSimulationB])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onClick={handleClick}
    />
  )
}

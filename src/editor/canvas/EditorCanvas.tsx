import React, { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store'
import { renderFrame, type RenderState } from './renderer'
import { getAllDestinations } from '../../core/roomRegions'
import { setupInteraction, getStraightGhost } from './interaction'

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

    const resize = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }
    resize()
    window.addEventListener('resize', resize)

    let head = 0
    let lastTime = performance.now()
    const loop = (now: number) => {
      resize()

      const s = useStore.getState()
      const path = s.simulationPath

      if (s.simulationStatus === 'complete' && path) {
        const delta = (now - lastTime) / 1000
        lastTime = now
        head = Math.min(head + s.simulationSpeed * delta, path.length - 1)
        const headIdx = Math.floor(head)
        animRef.current = headIdx

        const parts = path[headIdx]?.split(':')
        if (parts && Number(parts[0]) !== s.activeFloor) {
          s.setActiveFloor(Number(parts[0]))
        }
      } else {
        head = 0
        lastTime = performance.now()
        animRef.current = 0
      }

      const allDests = getAllDestinations(s.map)

      const findLabel = (id: string | null) => {
        if (!id) return undefined
        const d = allDests.find((d) => d.id === id)
        return d?.label
      }

      const state: RenderState = {
        map: s.map,
        activeFloor: s.activeFloor,
        mode: s.mode,
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
        destALabel: findLabel(s.simulationRoomA),
        destBLabel: findLabel(s.simulationRoomB),
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

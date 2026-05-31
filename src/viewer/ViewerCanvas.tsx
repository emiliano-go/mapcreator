import { useCallback, useEffect, useRef } from 'react'
import type { BuildingMap } from '../core/types'
import { renderFrame, type RenderState } from '../editor/canvas/renderer'

interface ViewerCanvasProps {
  map: BuildingMap
  activeFloor: number
  pathIds?: string[] | null
  animHead?: number
  onTileClick?: (floor: number, row: number, col: number) => void
}

export default function ViewerCanvas({ map, activeFloor, pathIds, animHead = 0, onTileClick }: ViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileSizeRef = useRef(24)
  const offsetRef = useRef({ offsetX: 40, offsetY: 40 })

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

    let raf = 0
    const loop = () => {
      resize()
      const state: RenderState = {
        map,
        activeFloor,
        mode: 'simulate',
        tileSize: tileSizeRef.current,
        offsetX: offsetRef.current.offsetX,
        offsetY: offsetRef.current.offsetY,
        selection: null,
        simulationPath: pathIds ?? null,
        simulationFloorA: -1,
        simulationRowA: -1,
        simulationColA: -1,
        simulationFloorB: -1,
        simulationRowB: -1,
        simulationColB: -1,
        animHead,
        showGrid: true,
        straightGhost: null,
      }
      renderFrame(ctx, state)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [map, activeFloor, pathIds, animHead])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onTileClick) return
    const tileSize = tileSizeRef.current
    const { offsetX, offsetY } = offsetRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor((x - offsetX) / tileSize)
    const row = Math.floor((y - offsetY) / tileSize)
    onTileClick(activeFloor, row, col)
  }, [activeFloor, onTileClick])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-pointer"
      onClick={handleClick}
    />
  )
}

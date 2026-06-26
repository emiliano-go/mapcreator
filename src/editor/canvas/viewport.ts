import { useRef, useCallback } from 'react'

interface ViewportState {
  offsetX: number
  offsetY: number
  scale: number
}

const MIN_SCALE = 0.1
const MAX_SCALE = 4.0

export function useViewport() {
  const stateRef = useRef<ViewportState>({ offsetX: 0, offsetY: 0, scale: 1 })
  const dirtyRef = useRef(false)
  const listenersRef = useRef<Set<() => void>>(new Set())

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener()
  }, [])

  const getState = useCallback(() => stateRef.current, [])

  const panBy = useCallback((dx: number, dy: number) => {
    stateRef.current = {
      ...stateRef.current,
      offsetX: stateRef.current.offsetX + dx,
      offsetY: stateRef.current.offsetY + dy,
    }
    dirtyRef.current = true
    notify()
  }, [notify])

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const s = stateRef.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s.scale * factor))
      const ratio = newScale / s.scale
      stateRef.current = {
        scale: newScale,
        offsetX: cx - (cx - s.offsetX) * ratio,
        offsetY: cy - (cy - s.offsetY) * ratio,
      }
      dirtyRef.current = true
      notify()
    },
    [notify],
  )

  const setScale = useCallback(
    (scale: number, cx: number, cy: number) => {
      const s = stateRef.current
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
      const ratio = newScale / s.scale
      stateRef.current = {
        scale: newScale,
        offsetX: cx - (cx - s.offsetX) * ratio,
        offsetY: cy - (cy - s.offsetY) * ratio,
      }
      dirtyRef.current = true
      notify()
    },
    [notify],
  )

  const resetView = useCallback(() => {
    stateRef.current = { offsetX: 0, offsetY: 0, scale: 1 }
    dirtyRef.current = true
    notify()
  }, [notify])

  const screenToGrid = useCallback(
    (screenX: number, screenY: number, tileSize: number, canvasRect: DOMRect) => {
      const s = stateRef.current
      const x = (screenX - canvasRect.left - s.offsetX) / s.scale
      const y = (screenY - canvasRect.top - s.offsetY) / s.scale
      return { col: Math.floor(x / tileSize), row: Math.floor(y / tileSize) }
    },
    [],
  )

  return {
    getState,
    panBy,
    zoomAt,
    setScale,
    resetView,
    screenToGrid,
    dirtyRef,
    subscribe,
  }
}



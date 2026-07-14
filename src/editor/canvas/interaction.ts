import { useStore } from '../store'
import type { TileType, OverlayType } from '../../core/types'
import { cleanupRoomMeta } from '../../core/roomRegions'
import { matchKeybind } from '../../core/keybinds'

interface InteractionState {
  isPanning: boolean
  lastPanX: number
  lastPanY: number
  isDrawing: boolean
  isRightErase: boolean
  straightGhost: {
    startRow: number; startCol: number
    endRow: number; endCol: number
  } | null
  rectGhost: {
    startRow: number; startCol: number
    endRow: number; endCol: number
  } | null
  fillGhost: Array<{ row: number; col: number }> | null
}

const state: InteractionState = {
  isPanning: false,
  lastPanX: 0,
  lastPanY: 0,
  isDrawing: false,
  isRightErase: false,
  straightGhost: null,
  rectGhost: null,
  fillGhost: null,
}

export function getStraightGhost() {
  return state.straightGhost
}

export function getFillGhost() {
  return state.fillGhost
}

export function getRectGhost() {
  return state.rectGhost
}

function getGridPos(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  tileSize: number,
  offsetX: number,
  offsetY: number,
) {
  const rect = canvas.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  const col = Math.floor((x - offsetX) / tileSize)
  const row = Math.floor((y - offsetY) / tileSize)
  return { row, col }
}

export function setupInteraction(
  canvas: HTMLCanvasElement,
  getTileSize: () => number,
  getOffset: () => { offsetX: number; offsetY: number },
  setOffset: (ox: number, oy: number) => void,
  setTileSize: (ts: number) => void,
) {
  const tooltip = document.createElement('div')
  tooltip.className = 'fixed pointer-events-none bg-gray-900 text-white text-xs px-2 py-1 rounded z-50 hidden'
  document.body.appendChild(tooltip)

  function handleMouseDown(e: MouseEvent) {
    const store = useStore.getState()
    const { offsetX, offsetY } = getOffset()
    const tileSize = getTileSize()

    if (e.button === 1) {
      state.isPanning = true
      state.lastPanX = e.clientX - offsetX
      state.lastPanY = e.clientY - offsetY
      canvas.style.cursor = 'grabbing'
      return
    }

    if (store.mode !== 'edit' && e.button !== 2) return

    if (e.button === 2) {
      const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
      const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
      if (!floor) return
      if (pos.row < 0 || pos.row >= floor.height || pos.col < 0 || pos.col >= floor.width) return

      if (store.activeTab === 'overlay' && floor.overlay[pos.row]?.[pos.col]) {
        store.pushHistory()
        const newFloors = store.map.floors.map((f) => {
          if (f.floorIndex !== store.activeFloor) return f
          const newOverlay = f.overlay.map((r) => [...r])
          newOverlay[pos.row][pos.col] = null
          return cleanupRoomMeta({ ...f, overlay: newOverlay })
        })
        useStore.setState({
          map: { ...store.map, floors: newFloors, updatedAt: new Date().toISOString() },
        })
        store.runValidation()
      } else {
        store.erase(pos.row, pos.col)
      }
      state.isDrawing = true
      state.isRightErase = true
      return
    }

    const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
    if (!pos || pos.row < 0 || pos.col < 0) {
      store.setSelection(null)
      return
    }

    const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
    if (!floor) return
    if (pos.row >= floor.height || pos.col >= floor.width) {
      store.setSelection(null)
      return
    }

    const tool = store.activeTool

    if (e.shiftKey && tool !== 'select' && tool !== 'eyedrop' && tool !== 'fill' && tool !== 'fillRoom') {
      state.rectGhost = { startRow: pos.row, startCol: pos.col, endRow: pos.row, endCol: pos.col }
      state.isDrawing = true
      return
    }

    if (tool === 'select') {
      store.setSelection(pos)
      return
    }

    if (tool === 'eyedrop') {
      const base = floor.base[pos.row]?.[pos.col]
      const overlay = floor.overlay[pos.row]?.[pos.col]
      if (overlay && store.activeTab === 'overlay') {
        store.setActiveTool(overlay)
      } else if (base) {
        store.setActiveTool(base)
      }
      return
    }

    if (tool === 'fill') {
      const posBase = floor.base[pos.row]?.[pos.col]
      if (!posBase) return
      const { map, activeFloor, lastTileTool } = store

      if (lastTileTool === 'select' || lastTileTool === 'eraser' || lastTileTool === 'fill' || lastTileTool === 'eyedrop' || lastTileTool === 'fillRoom') return

      const targetBase = posBase
      const targetOverlay = floor.overlay[pos.row]?.[pos.col] ?? null

      const fillType = lastTileTool as TileType | undefined
      const fillOverlay = lastTileTool as OverlayType | undefined
      const isBaseFill = lastTileTool === 'wall' || lastTileTool === 'floor' || lastTileTool === 'stairs' || lastTileTool === 'elevator' || lastTileTool === 'outside' || lastTileTool === 'void'

      const newBase = floor.base.map((r) => [...r])
      const newOverlay = floor.overlay.map((r) => [...r])

      const visited = new Set<string>()
      const queue = [{ row: pos.row, col: pos.col }]
      visited.add(`${pos.row},${pos.col}`)

      while (queue.length > 0) {
        const cur = queue.pop()!

        if (isBaseFill && fillType) {
          newBase[cur.row][cur.col] = fillType
          if (fillType === 'void') {
            newOverlay[cur.row][cur.col] = null
          }
        } else if (!isBaseFill && fillOverlay) {
          const bt = newBase[cur.row]?.[cur.col]
          if (fillOverlay === 'door' || fillOverlay === 'exit_door') {
            if (bt === 'wall') {
              newOverlay[cur.row][cur.col] = fillOverlay
            }
          } else if (fillOverlay === 'room') {
            if (bt === 'floor') {
              newOverlay[cur.row][cur.col] = fillOverlay
            }
          }
        }

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
        for (const [dr, dc] of dirs) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const key = `${nr},${nc}`
          if (visited.has(key)) continue
          if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
          if (floor.base[nr]?.[nc] !== targetBase) continue
          if (floor.overlay[nr]?.[nc] !== targetOverlay) continue
          visited.add(key)
          queue.push({ row: nr, col: nc })
        }
      }

      store.pushHistory()
      const newFloors = map.floors.map((f) =>
        f.floorIndex === activeFloor ? { ...f, base: newBase, overlay: newOverlay } : f,
      )
      useStore.setState({ map: { ...map, floors: newFloors, updatedAt: new Date().toISOString() } })
      store.runValidation()
      return
    }

      if (tool === 'fillRoom') {
      const f = floor
      const bt = f.base[pos.row]?.[pos.col]
      if (bt !== 'floor') return

      const newOverlay = f.overlay.map((r) => [...r])
      const visited = new Set<string>()
      const queue = [{ row: pos.row, col: pos.col }]
      visited.add(`${pos.row},${pos.col}`)
      let enclosed = true

      while (queue.length > 0) {
        const cur = queue.pop()!

        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const key = `${nr},${nc}`
          if (visited.has(key)) continue

          if (nr < 0 || nr >= f.height || nc < 0 || nc >= f.width) continue

          const nbt = f.base[nr]?.[nc]
          if (nbt === 'void' || nbt === 'outside') {
            enclosed = false
            continue
          }

          if (nbt !== 'floor') continue
          visited.add(key)
          queue.push({ row: nr, col: nc })
        }
      }

      if (enclosed && visited.size > 0) {
        store.pushHistory()
        for (const key of visited) {
          const [r, c] = key.split(',').map(Number)
          newOverlay[r!][c!] = 'room'
        }
        const { map, activeFloor } = store
        const newFloors = map.floors.map((fl) =>
          fl.floorIndex === activeFloor
            ? cleanupRoomMeta({ ...fl, overlay: newOverlay })
            : fl,
        )
        useStore.setState({
          map: { ...map, floors: newFloors, updatedAt: new Date().toISOString() },
        })
        store.runValidation()
      }
      return
    }

    if (store.straightMode) {
      state.straightGhost = { startRow: pos.row, startCol: pos.col, endRow: pos.row, endCol: pos.col }
      return
    }

    state.isDrawing = true

    if (tool === 'eraser') {
      store.erase(pos.row, pos.col)
    } else if (store.activeTab === 'base') {
      store.paint(pos.row, pos.col)
    } else {
      store.paintOverlay(pos.row, pos.col)
    }
  }

  function handleMouseMove(e: MouseEvent) {
    const store = useStore.getState()
    const { offsetX, offsetY } = getOffset()
    const tileSize = getTileSize()

    if (state.isPanning) {
      const newOffsetX = e.clientX - state.lastPanX
      const newOffsetY = e.clientY - state.lastPanY
      setOffset(newOffsetX, newOffsetY)
      return
    }

    if (store.activeTool === 'fill') {
      const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
      if (!pos || pos.row < 0 || pos.col < 0) { state.fillGhost = null; return }
      const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
      if (!floor || pos.row >= floor.height || pos.col >= floor.width) { state.fillGhost = null; return }
      const posBase = floor.base[pos.row]?.[pos.col]
      if (!posBase || store.lastTileTool === 'select' || store.lastTileTool === 'eraser' || store.lastTileTool === 'fill' || store.lastTileTool === 'eyedrop' || store.lastTileTool === 'fillRoom') {
        state.fillGhost = null; return
      }
      const targetBase = posBase
      const targetOverlay = floor.overlay[pos.row]?.[pos.col] ?? null
      const visited = new Set<string>()
      const queue = [{ row: pos.row, col: pos.col }]
      visited.add(`${pos.row},${pos.col}`)
      while (queue.length > 0) {
        const cur = queue.pop()!
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const key = `${nr},${nc}`
          if (visited.has(key)) continue
          if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) continue
          if (floor.base[nr]?.[nc] !== targetBase) continue
          if (floor.overlay[nr]?.[nc] !== targetOverlay) continue
          visited.add(key)
          queue.push({ row: nr, col: nc })
        }
      }
      const tiles: Array<{ row: number; col: number }> = []
      for (const key of visited) {
        const [r, c] = key.split(',').map(Number)
        tiles.push({ row: r!, col: c! })
      }
      state.fillGhost = tiles
      return
    }
    state.fillGhost = null

    if (state.straightGhost) {
      const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
      if (!pos) return
      const dr = Math.abs(pos.row - state.straightGhost.startRow)
      const dc = Math.abs(pos.col - state.straightGhost.startCol)
      if (dr >= dc) {
        state.straightGhost = { ...state.straightGhost, endRow: pos.row, endCol: state.straightGhost.startCol }
      } else {
        state.straightGhost = { ...state.straightGhost, endRow: state.straightGhost.startRow, endCol: pos.col }
      }
      return
    }

    if (state.rectGhost) {
      const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
      if (!pos) return
      state.rectGhost = { ...state.rectGhost, endRow: pos.row, endCol: pos.col }
      return
    }

    if (state.isDrawing) {
      const held = (e.buttons & 1) || (e.buttons & 2)
      if (!held) {
        state.isDrawing = false
        state.isRightErase = false
        return
      }
      const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
      if (!pos || pos.row < 0 || pos.col < 0) return
      const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
      if (!floor) return
      if (pos.row >= floor.height || pos.col >= floor.width) return

      if (state.isRightErase || store.activeTool === 'eraser') {
        if (state.isRightErase && store.activeTab === 'overlay' && floor.overlay[pos.row]?.[pos.col]) {
          store.pushHistory()
          const newFloors = store.map.floors.map((f) => {
            if (f.floorIndex !== store.activeFloor) return f
            const newOverlay = f.overlay.map((r) => [...r])
            newOverlay[pos.row][pos.col] = null
            return cleanupRoomMeta({ ...f, overlay: newOverlay })
          })
          useStore.setState({
            map: { ...store.map, floors: newFloors, updatedAt: new Date().toISOString() },
          })
          store.runValidation()
        } else {
          store.erase(pos.row, pos.col)
        }
      } else if (store.activeTab === 'base') {
        store.paint(pos.row, pos.col)
      } else {
        store.paintOverlay(pos.row, pos.col)
      }
      return
    }

    const pos = getGridPos(e.clientX, e.clientY, canvas, tileSize, offsetX, offsetY)
    if (!pos || pos.row < 0 || pos.col < 0) {
      tooltip.classList.add('hidden')
      return
    }
    const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
    if (!floor || pos.row >= floor.height || pos.col >= floor.width) {
      tooltip.classList.add('hidden')
      return
    }

    const base = floor.base[pos.row]?.[pos.col]
    const overlay = floor.overlay[pos.row]?.[pos.col]
    const meta = floor.meta[`${pos.row},${pos.col}`]
    if (base) {
      tooltip.textContent = `${pos.row},${pos.col}  ${overlay ? `${overlay} / ` : ''}${base}${meta?.label ? `  "${meta.label}"` : ''}`
      tooltip.classList.remove('hidden')
      tooltip.style.left = `${e.clientX + 12}px`
      tooltip.style.top = `${e.clientY + 12}px`
    }
  }

  function paintStraightLine(
    store: ReturnType<typeof useStore.getState>,
    startRow: number, startCol: number,
    endRow: number, endCol: number,
  ) {
    const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
    if (!floor) return

    const dr = Math.sign(endRow - startRow)
    const dc = Math.sign(endCol - startCol)
    const steps = Math.max(Math.abs(endRow - startRow), Math.abs(endCol - startCol))

    store.pushHistory()
    for (let i = 0; i <= steps; i++) {
      const r = startRow + dr * i
      const c = startCol + dc * i
      if (r < 0 || r >= floor.height || c < 0 || c >= floor.width) continue
      const tool = store.activeTool
      if (tool === 'eraser') {
        store.erase(r, c, true)
      } else if (store.activeTab === 'base') {
        store.paint(r, c, true)
      } else {
        store.paintOverlay(r, c, true)
      }
    }
  }

  function paintRectFill(
    store: ReturnType<typeof useStore.getState>,
    startRow: number, startCol: number,
    endRow: number, endCol: number,
  ) {
    const floor = store.map.floors.find((f) => f.floorIndex === store.activeFloor)
    if (!floor) return

    const minRow = Math.max(0, Math.min(startRow, endRow))
    const maxRow = Math.min(floor.height - 1, Math.max(startRow, endRow))
    const minCol = Math.max(0, Math.min(startCol, endCol))
    const maxCol = Math.min(floor.width - 1, Math.max(startCol, endCol))

    if (minRow === maxRow && minCol === maxCol) return

    store.pushHistory()

    const tool = store.activeTool
    const isOverlay = tool === 'door' || tool === 'exit_door' || tool === 'room'

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (tool === 'eraser') {
          store.erase(r, c, true)
        } else if (isOverlay) {
          store.paintOverlay(r, c, true)
        } else {
          store.paint(r, c, true)
        }
      }
    }
  }

  function handleMouseUp() {
    if (state.rectGhost) {
      const store = useStore.getState()
      const { startRow, startCol, endRow, endCol } = state.rectGhost
      state.rectGhost = null
      state.isDrawing = false
      paintRectFill(store, startRow, startCol, endRow, endCol)
      return
    }

    state.isPanning = false
    state.isDrawing = false
    state.isRightErase = false

    if (state.straightGhost) {
      const store = useStore.getState()
      const { startRow, startCol, endRow, endCol } = state.straightGhost
      state.straightGhost = null
      paintStraightLine(store, startRow, startCol, endRow, endCol)
    }

    canvas.style.cursor = useStore.getState().activeTool === 'select' ? 'crosshair' : 'default'
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    const { offsetX, offsetY } = getOffset()
    const tileSize = getTileSize()

    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const gridX = (mx - offsetX) / tileSize
    const gridY = (my - offsetY) / tileSize

    const zoomIn = e.deltaY < 0
    const newTileSize = Math.max(1, Math.min(160, zoomIn ? Math.ceil(tileSize * 1.15) : Math.floor(tileSize * 0.85)))
    if (newTileSize === tileSize) return

    const newOffsetX = mx - gridX * newTileSize
    const newOffsetY = my - gridY * newTileSize

    setOffset(newOffsetX, newOffsetY)
    setTileSize(newTileSize)
  }

  function saveToFile(data: ReturnType<ReturnType<typeof useStore.getState>['exportFull']>) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.map.name}.json`
    a.click()
    URL.revokeObjectURL(url)

    fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `${data.map.name}.json`,
        data,
      }),
    }).catch(() => {})
  }

  function handleKeyDown(e: KeyboardEvent) {
    const store = useStore.getState()

    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.tagName === 'SELECT')
    ) {
      return
    }

    const id = matchKeybind(e)
    if (!id) return
    e.preventDefault()

    switch (id) {
      case 'tool-select': store.setActiveTool('select'); break
      case 'tool-wall': store.setActiveTool('wall'); break
      case 'tool-floor': store.setActiveTool('floor'); break
      case 'tool-stairs': store.setActiveTool('stairs'); break
      case 'tool-elevator': store.setActiveTool('elevator'); break
      case 'tool-door': store.setActiveTool('door'); break
      case 'tool-exit_door': store.setActiveTool('exit_door'); break
      case 'tool-room': store.setActiveTool('room'); break
      case 'tool-eraser': store.setActiveTool('eraser'); break
      case 'tool-outside': store.setActiveTool('outside'); break
      case 'tool-fill': store.setActiveTool('fill'); break
      case 'tool-eyedrop': store.setActiveTool('eyedrop'); break
      case 'tool-fillRoom': store.setActiveTool('fillRoom'); break
      case 'straight-mode': store.setStraightMode(!store.straightMode); break
      case 'undo': store.undo(); break
      case 'redo': store.redo(); break
      case 'save': saveToFile(store.exportFull()); break
      case 'import': document.querySelector<HTMLInputElement>('input[type="file"][accept=".json"]')?.click(); break
      case 'mode-edit': store.setMode('edit'); break
      case 'mode-simulate': store.setMode('simulate'); break
      case 'mode-preview': store.setMode('preview'); break
      case 'add-floor': store.addFloor(); break
    }
  }

  function handleContextMenu(e: Event) {
    e.preventDefault()
  }

  function handleMouseLeave() {
    state.isPanning = false
    state.isDrawing = false
    state.isRightErase = false
    state.straightGhost = null
    state.rectGhost = null
    state.fillGhost = null
    tooltip.classList.add('hidden')
  }

  canvas.addEventListener('mousedown', handleMouseDown)
  canvas.addEventListener('mousemove', handleMouseMove)
  canvas.addEventListener('mouseup', handleMouseUp)
  canvas.addEventListener('wheel', handleWheel, { passive: false })
  canvas.addEventListener('contextmenu', handleContextMenu)
  canvas.addEventListener('mouseleave', handleMouseLeave)
  document.addEventListener('keydown', handleKeyDown)

  return () => {
    canvas.removeEventListener('mousedown', handleMouseDown)
    canvas.removeEventListener('mousemove', handleMouseMove)
    canvas.removeEventListener('mouseup', handleMouseUp)
    canvas.removeEventListener('wheel', handleWheel)
    canvas.removeEventListener('contextmenu', handleContextMenu)
    canvas.removeEventListener('mouseleave', handleMouseLeave)
    document.removeEventListener('keydown', handleKeyDown)
    tooltip.remove()
  }
}

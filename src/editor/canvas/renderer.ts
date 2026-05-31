import type { BuildingMap, TileType, OverlayType } from '../../core/types'
import { tileStyles, overlayStyles, editorStyles } from '../../theme/tileStyles'
import { findRoomRegions } from '../../core/roomRegions'

export interface RenderState {
  map: BuildingMap
  activeFloor: number
  tileSize: number
  offsetX: number
  offsetY: number
  mode: 'edit' | 'simulate' | 'preview'
  selection: { row: number; col: number } | null
  simulationPath: string[] | null
  simulationFloorA: number
  simulationRowA: number
  simulationColA: number
  simulationFloorB: number
  simulationRowB: number
  simulationColB: number
  animHead: number
  showGrid: boolean
  straightGhost: { startRow: number; startCol: number; endRow: number; endCol: number } | null
  destALabel?: string
  destBLabel?: string
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  row: number,
  col: number,
  overlay: Exclude<OverlayType, null>,
  tileSize: number,
) {
  const style = overlayStyles[overlay]
  if (!style) return

  ctx.fillStyle = style.fill
  ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize)

  if (style.label) {
    ctx.fillStyle = '#fff'
    const fontSize = overlay === 'exit_door' ? Math.floor(tileSize * 0.4) : Math.floor(tileSize * 0.7)
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      style.label,
      col * tileSize + tileSize / 2,
      row * tileSize + tileSize / 2,
    )
  }
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: RenderState) {
  const { map, activeFloor, tileSize, offsetX, offsetY, selection, simulationPath, animHead, showGrid, straightGhost } = state

  const floor = map.floors.find((f) => f.floorIndex === activeFloor)
  if (!floor) return

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.save()
  ctx.translate(offsetX, offsetY)

  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const base = floor.base[row]?.[col] as TileType
      const baseStyle = tileStyles[base]
      const x = col * tileSize
      const y = row * tileSize

      if (baseStyle) {
        ctx.fillStyle = baseStyle.fill
        ctx.fillRect(x, y, tileSize, tileSize)
        ctx.strokeStyle = baseStyle.stroke
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, tileSize, tileSize)

        if (baseStyle.label) {
          ctx.fillStyle = '#000'
          ctx.font = `${Math.floor(tileSize * 0.6)}px monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(baseStyle.label, x + tileSize / 2, y + tileSize / 2)
        }
      }
    }
  }

  for (let row = 0; row < floor.height; row++) {
    for (let col = 0; col < floor.width; col++) {
      const overlay = floor.overlay[row]?.[col]
      if (overlay) {
        drawOverlay(ctx, row, col, overlay, tileSize)
      }
    }
  }

  for (const otherFloor of map.floors) {
    if (otherFloor.floorIndex === activeFloor) continue
    const curBid = floor.buildingId
    const otherBid = otherFloor.buildingId
    if (curBid && otherBid && curBid !== otherBid) continue

    const visited = new Set<string>()
    for (let r = 0; r < otherFloor.height; r++) {
      for (let c = 0; c < otherFloor.width; c++) {
        const key = `${r},${c}`
        if (visited.has(key)) continue
        const bt = otherFloor.base[r]?.[c]
        if (bt !== 'stairs' && bt !== 'elevator') continue

        const groupTiles: Array<{ row: number; col: number }> = []
        const queue = [{ row: r, col: c }]
        visited.add(key)
        while (queue.length > 0) {
          const cur = queue.pop()!
          groupTiles.push(cur)
          for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = cur.row + dr
            const nc = cur.col + dc
            const nk = `${nr},${nc}`
            if (visited.has(nk)) continue
            if (otherFloor.base[nr]?.[nc] !== bt) continue
            visited.add(nk)
            queue.push({ row: nr, col: nc })
          }
        }

        if (groupTiles.length === 0) continue
        const anchorRow = Math.min(...groupTiles.map((t) => t.row))
        const anchorCol = Math.min(...groupTiles.filter((t) => t.row === anchorRow).map((t) => t.col))
        const meta = otherFloor.meta[`${anchorRow},${anchorCol}`]

        let connects = false
        if (bt === 'stairs') {
          if (meta?.toFloorSuperior === activeFloor || meta?.toFloorInferior === activeFloor) connects = true
        } else if (bt === 'elevator') {
          if (meta?.connectedFloors?.includes(activeFloor)) connects = true
        }
        if (!connects) continue

        if (bt === 'stairs') {
          ctx.fillStyle = 'rgba(80, 150, 255, 0.35)'
          ctx.strokeStyle = 'rgba(80, 150, 255, 0.7)'
        } else {
          ctx.fillStyle = 'rgba(255, 180, 50, 0.35)'
          ctx.strokeStyle = 'rgba(255, 180, 50, 0.7)'
        }
        ctx.lineWidth = 1.5
        for (const gt of groupTiles) {
          ctx.fillRect(gt.col * tileSize, gt.row * tileSize, tileSize, tileSize)
          ctx.strokeRect(gt.col * tileSize, gt.row * tileSize, tileSize, tileSize)
        }
      }
    }
  }

  const regions = findRoomRegions(floor)
  for (const region of regions) {
    if (!region.label) {
      ctx.strokeStyle = 'rgba(255,200,100,0.5)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      for (const tile of region.tiles) {
        ctx.strokeRect(tile.col * tileSize, tile.row * tileSize, tileSize, tileSize)
      }
      ctx.setLineDash([])
    } else {
      ctx.strokeStyle = 'rgba(255,200,100,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      for (const tile of region.tiles) {
        ctx.strokeRect(tile.col * tileSize, tile.row * tileSize, tileSize, tileSize)
      }
    }
  }

  const visitedGroups = new Set<string>()
  for (let r = 0; r < floor.height; r++) {
    for (let c = 0; c < floor.width; c++) {
      const gk = `${r},${c}`
      if (visitedGroups.has(gk)) continue
      const bt = floor.base[r]?.[c]
      if (bt !== 'stairs' && bt !== 'elevator') continue
      visitedGroups.add(gk)

      const groupTiles: Array<{ row: number; col: number }> = []
      const queue = [{ row: r, col: c }]
      while (queue.length > 0) {
        const cur = queue.pop()!
        groupTiles.push(cur)
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = cur.row + dr
          const nc = cur.col + dc
          const nk = `${nr},${nc}`
          if (visitedGroups.has(nk)) continue
          if (floor.base[nr]?.[nc] !== bt) continue
          visitedGroups.add(nk)
          queue.push({ row: nr, col: nc })
        }
      }

      ctx.strokeStyle = bt === 'stairs' ? 'rgba(100,200,255,0.5)' : 'rgba(255,200,100,0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([])
      for (const gt of groupTiles) {
        ctx.strokeRect(gt.col * tileSize, gt.row * tileSize, tileSize, tileSize)
      }
    }
  }

  if (selection) {
    const sx = selection.col * tileSize
    const sy = selection.row * tileSize
    ctx.fillStyle = editorStyles.selectionFill
    ctx.fillRect(sx, sy, tileSize, tileSize)
    ctx.strokeStyle = editorStyles.selectionStroke
    ctx.lineWidth = 2
    ctx.strokeRect(sx, sy, tileSize, tileSize)
  }

  if (showGrid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    for (let row = 0; row <= floor.height; row++) {
      ctx.beginPath()
      ctx.moveTo(0, row * tileSize)
      ctx.lineTo(floor.width * tileSize, row * tileSize)
      ctx.stroke()
    }
    for (let col = 0; col <= floor.width; col++) {
      ctx.beginPath()
      ctx.moveTo(col * tileSize, 0)
      ctx.lineTo(col * tileSize, floor.height * tileSize)
      ctx.stroke()
    }
  }

  if (straightGhost) {
    const { startRow, startCol, endRow, endCol } = straightGhost
    const minRow = Math.min(startRow, endRow)
    const maxRow = Math.max(startRow, endRow)
    const minCol = Math.min(startCol, endCol)
    const maxCol = Math.max(startCol, endCol)

    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
      }
    }

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'
    ctx.lineWidth = 2
    const x = minCol * tileSize
    const y = minRow * tileSize
    const w = (maxCol - minCol + 1) * tileSize
    const h = (maxRow - minRow + 1) * tileSize
    ctx.strokeRect(x, y, w, h)
  }

  if (state.mode === 'simulate') {
    if (simulationPath && simulationPath.length > 0) {
    const pathNodesOnFloor = simulationPath
      .map((id) => {
        const parts = id.split(':')
        return { floor: Number(parts[0]), row: Number(parts[1]), col: Number(parts[2]) }
      })
      .filter((n) => n.floor === activeFloor)

    for (let i = 0; i < pathNodesOnFloor.length; i++) {
      const n = pathNodesOnFloor[i]!
      const x = n.col * tileSize
      const y = n.row * tileSize
      ctx.fillStyle = i <= animHead ? editorStyles.pathHighlight : 'rgba(200,200,200,0.2)'
      ctx.fillRect(x, y, tileSize, tileSize)
    }

    if (animHead >= 0 && animHead < pathNodesOnFloor.length) {
      const head = pathNodesOnFloor[animHead]!
      ctx.fillStyle = editorStyles.pathHead
      ctx.beginPath()
      ctx.arc(head.col * tileSize + tileSize / 2, head.row * tileSize + tileSize / 2, tileSize / 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const hasMarkers = state.destALabel || state.destBLabel
  if (hasMarkers) {
    const floorA = map.floors.find((f) => f.floorIndex === state.simulationFloorA)
    if (floorA && state.simulationFloorA === activeFloor) {
      const x = state.simulationColA * tileSize
      const y = state.simulationRowA * tileSize
      ctx.fillStyle = editorStyles.markerA
      ctx.font = `bold ${tileSize * 0.6}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('A', x + tileSize / 2, y + tileSize / 2)
    }

    const floorB = map.floors.find((f) => f.floorIndex === state.simulationFloorB)
    if (floorB && state.simulationFloorB === activeFloor) {
      const x = state.simulationColB * tileSize
      const y = state.simulationRowB * tileSize
      ctx.fillStyle = editorStyles.markerB
      ctx.font = `bold ${tileSize * 0.6}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('B', x + tileSize / 2, y + tileSize / 2)
    }
  }

  function drawDestLabel(label: string, col: number, row: number) {
    const x = col * tileSize
    const y = row * tileSize
    const labelFontSize = Math.max(9, tileSize * 0.4)
    ctx.font = `${labelFontSize}px monospace`
    const textW = ctx.measureText(label).width
    const pad = 4
    const boxW = textW + pad * 2
    const boxH = labelFontSize + pad * 2
    const boxX = Math.max(0, x + tileSize / 2 - boxW / 2)
    const boxY = y - boxH - 2

    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(boxX, boxY, boxW, boxH)
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(boxX, boxY, boxW, boxH)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2)
  }

  if (state.destALabel && state.simulationFloorA === activeFloor) {
    drawDestLabel(state.destALabel, state.simulationColA, state.simulationRowA)
  }
  if (state.destBLabel && state.simulationFloorB === activeFloor) {
    drawDestLabel(state.destBLabel, state.simulationColB, state.simulationRowB)
  }
  } // end mode === 'simulate'

  ctx.restore()
}

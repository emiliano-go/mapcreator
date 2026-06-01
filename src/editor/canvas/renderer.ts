import type { BuildingMap, TileType, OverlayType, MapFloor, RoomRegion } from '../../core/types'
import { tileStyles, overlayStyles, editorStyles } from '../../theme/tileStyles'
import { findRoomRegions } from '../../core/roomRegions'

export interface GhostGroupInfo {
  type: 'stairs' | 'elevator'
  tiles: Array<{ row: number; col: number }>
  anchor: { row: number; col: number }
}

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
  cachedRegions?: RoomRegion[]
  cachedGhostGroups?: GhostGroupInfo[]
  cachedStairBorders?: GhostGroupInfo[]
}

const STROKE_THRESHOLD = 4
const GRID_THRESHOLD = 6
const DETAIL_THRESHOLD = 4

const DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]]

function findStairElevatorGroups(floor: MapFloor): GhostGroupInfo[] {
  const visited = new Set<string>()
  const groups: GhostGroupInfo[] = []
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
        for (const [dr, dc] of DIRS) {
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
      groups.push({ type: bt as 'stairs' | 'elevator', tiles, anchor: { row: anchorRow, col: anchorCol } })
    }
  }
  return groups
}

function getGhostGroups(
  map: BuildingMap,
  activeFloor: number,
  floor: MapFloor,
): GhostGroupInfo[] {
  const result: GhostGroupInfo[] = []
  const curBid = floor.buildingId
  for (const otherFloor of map.floors) {
    if (otherFloor.floorIndex === activeFloor) continue
    const otherBid = otherFloor.buildingId
    if (curBid && otherBid && curBid !== otherBid) continue
    const groups = findStairElevatorGroups(otherFloor)
    for (const g of groups) {
      const meta = otherFloor.meta[`${g.anchor.row},${g.anchor.col}`]
      let connects = false
      if (g.type === 'stairs') {
        if (meta?.toFloorSuperior === activeFloor || meta?.toFloorInferior === activeFloor) connects = true
      } else if (g.type === 'elevator') {
        if (meta?.connectedFloors?.includes(activeFloor)) connects = true
      }
      if (connects) result.push(g)
    }
  }
  return result
}

function inBounds(row: number, col: number, vb: { rowStart: number; rowEnd: number; colStart: number; colEnd: number }) {
  return row >= vb.rowStart && row < vb.rowEnd && col >= vb.colStart && col < vb.colEnd
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

function getVisibleBounds(
  offsetX: number, offsetY: number,
  tileSize: number,
  canvasW: number, canvasH: number,
  floorW: number, floorH: number,
) {
  const colStart = Math.max(0, Math.floor(-offsetX / tileSize))
  const colEnd = Math.min(floorW, Math.ceil((canvasW - offsetX) / tileSize))
  const rowStart = Math.max(0, Math.floor(-offsetY / tileSize))
  const rowEnd = Math.min(floorH, Math.ceil((canvasH - offsetY) / tileSize))
  return { colStart, colEnd, rowStart, rowEnd }
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: RenderState) {
  const {
    map, activeFloor, tileSize, offsetX, offsetY, selection,
    simulationPath, animHead, showGrid, straightGhost,
  } = state

  const floor = map.floors.find((f) => f.floorIndex === activeFloor)
  if (!floor) return

  const W = ctx.canvas.width
  const H = ctx.canvas.height

  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.translate(offsetX, offsetY)

  const vb = getVisibleBounds(offsetX, offsetY, tileSize, W, H, floor.width, floor.height)
  if (vb.rowStart >= vb.rowEnd || vb.colStart >= vb.colEnd) {
    ctx.restore()
    return
  }

  const drawStroke = tileSize >= STROKE_THRESHOLD
  const drawDetail = tileSize >= DETAIL_THRESHOLD

  const regions = state.cachedRegions ?? (drawStroke ? findRoomRegions(floor) : [])
  const ghostGroups = state.cachedGhostGroups ?? (drawStroke ? getGhostGroups(map, activeFloor, floor) : [])
  const stairBorders = state.cachedStairBorders ?? (drawStroke ? findStairElevatorGroups(floor) : [])

  for (let row = vb.rowStart; row < vb.rowEnd; row++) {
    for (let col = vb.colStart; col < vb.colEnd; col++) {
      const base = floor.base[row]?.[col] as TileType
      const baseStyle = tileStyles[base]
      const x = col * tileSize
      const y = row * tileSize
      if (baseStyle) {
        ctx.fillStyle = baseStyle.fill
        ctx.fillRect(x, y, tileSize, tileSize)
        if (drawStroke) {
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
  }

  if (drawDetail) {
    for (let row = vb.rowStart; row < vb.rowEnd; row++) {
      for (let col = vb.colStart; col < vb.colEnd; col++) {
        const overlay = floor.overlay[row]?.[col]
        if (overlay) drawOverlay(ctx, row, col, overlay, tileSize)
      }
    }
  }

  if (ghostGroups.length > 0) {
    for (const group of ghostGroups) {
      if (group.type === 'stairs') {
        ctx.fillStyle = 'rgba(255, 200, 50, 0.35)'
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.7)'
      } else {
        ctx.fillStyle = 'rgba(160, 80, 255, 0.35)'
        ctx.strokeStyle = 'rgba(160, 80, 255, 0.7)'
      }
      ctx.lineWidth = 1.5
      for (const { row: r, col: c } of group.tiles) {
        if (inBounds(r, c, vb)) {
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
          ctx.strokeRect(c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }
    }
  }

  if (regions.length > 0) {
    for (const region of regions) {
      const isNamed = !!region.label
      ctx.strokeStyle = 'rgba(255,200,100,0.5)'
      ctx.lineWidth = isNamed ? 1 : 1.5
      ctx.setLineDash(isNamed ? [] : [4, 3])
      for (const tile of region.tiles) {
        if (inBounds(tile.row, tile.col, vb)) {
          ctx.strokeRect(tile.col * tileSize, tile.row * tileSize, tileSize, tileSize)
        }
      }
      ctx.setLineDash([])
    }
  }

  if (stairBorders.length > 0) {
    ctx.setLineDash([])
    for (const group of stairBorders) {
      ctx.strokeStyle = group.type === 'stairs' ? 'rgba(100,200,255,0.5)' : 'rgba(255,200,100,0.5)'
      ctx.lineWidth = 1
      for (const { row: r, col: c } of group.tiles) {
        if (inBounds(r, c, vb)) {
          ctx.strokeRect(c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }
    }
  }

  if (selection && inBounds(selection.row, selection.col, vb)) {
    const sx = selection.col * tileSize
    const sy = selection.row * tileSize
    ctx.fillStyle = editorStyles.selectionFill
    ctx.fillRect(sx, sy, tileSize, tileSize)
    ctx.strokeStyle = editorStyles.selectionStroke
    ctx.lineWidth = 2
    ctx.strokeRect(sx, sy, tileSize, tileSize)
  }

  if (showGrid && tileSize >= GRID_THRESHOLD) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let row = vb.rowStart; row <= vb.rowEnd; row++) {
      ctx.moveTo(vb.colStart * tileSize, row * tileSize)
      ctx.lineTo(vb.colEnd * tileSize, row * tileSize)
    }
    for (let col = vb.colStart; col <= vb.colEnd; col++) {
      ctx.moveTo(col * tileSize, vb.rowStart * tileSize)
      ctx.lineTo(col * tileSize, vb.rowEnd * tileSize)
    }
    ctx.stroke()
  }

  if (straightGhost) {
    const { startRow, endRow, startCol, endCol } = straightGhost
    const minRow = Math.max(vb.rowStart, Math.min(startRow, endRow))
    const maxRow = Math.min(vb.rowEnd - 1, Math.max(startRow, endRow))
    const minCol = Math.max(vb.colStart, Math.min(startCol, endCol))
    const maxCol = Math.min(vb.colEnd - 1, Math.max(startCol, endCol))

    if (minRow <= maxRow && minCol <= maxCol) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)'
      ctx.lineWidth = 2
      const x = Math.min(startCol, endCol) * tileSize
      const y = Math.min(startRow, endRow) * tileSize
      const w = (Math.max(startCol, endCol) - Math.min(startCol, endCol) + 1) * tileSize
      const h = (Math.max(startRow, endRow) - Math.min(startRow, endRow) + 1) * tileSize
      ctx.strokeRect(x, y, w, h)
    }
  }

  if (state.mode === 'simulate') {
    if (simulationPath && simulationPath.length > 0) {
      const pathNodesOnFloor = simulationPath
        .map((id) => {
          const parts = id.split(':')
          return { floor: Number(parts[0]), row: Number(parts[1]), col: Number(parts[2]) }
        })
        .filter((n) => n.floor === activeFloor &&
          n.row >= vb.rowStart && n.row < vb.rowEnd &&
          n.col >= vb.colStart && n.col < vb.colEnd)

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
    if (hasMarkers && drawStroke) {
      const floorA = map.floors.find((f) => f.floorIndex === state.simulationFloorA)
      if (floorA && state.simulationFloorA === activeFloor && inBounds(state.simulationRowA, state.simulationColA, vb)) {
        const x = state.simulationColA * tileSize
        const y = state.simulationRowA * tileSize
        ctx.fillStyle = editorStyles.markerA
        ctx.font = `bold ${tileSize * 0.6}px monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('A', x + tileSize / 2, y + tileSize / 2)
      }

      const floorB = map.floors.find((f) => f.floorIndex === state.simulationFloorB)
      if (floorB && state.simulationFloorB === activeFloor && inBounds(state.simulationRowB, state.simulationColB, vb)) {
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

    if (state.destALabel && state.simulationFloorA === activeFloor && drawDetail) {
      if (inBounds(state.simulationRowA, state.simulationColA, vb)) {
        drawDestLabel(state.destALabel, state.simulationColA, state.simulationRowA)
      }
    }
    if (state.destBLabel && state.simulationFloorB === activeFloor && drawDetail) {
      if (inBounds(state.simulationRowB, state.simulationColB, vb)) {
        drawDestLabel(state.destBLabel, state.simulationColB, state.simulationRowB)
      }
    }
  }

  ctx.restore()
}

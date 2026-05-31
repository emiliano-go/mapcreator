import React, { useMemo } from 'react'
import { useStore } from './store'
import type { TileType, OverlayType } from '../core/types'
import { tileStyles, overlayStyles } from '../theme/tileStyles'
import { findRoomRegions, getRoomDoors } from '../core/roomRegions'

export default function PropertyPanel() {
  const map = useStore((s) => s.map)
  const activeFloor = useStore((s) => s.activeFloor)
  const selection = useStore((s) => s.selection)
  const setTileMeta = useStore((s) => s.setTileMeta)
  const setFloorSize = useStore((s) => s.setFloorSize)
  const setFloorBuilding = useStore((s) => s.setFloorBuilding)
  const addBuilding = useStore((s) => s.addBuilding)
  const removeBuilding = useStore((s) => s.removeBuilding)
  const renameBuilding = useStore((s) => s.renameBuilding)
  const renameFloor = useStore((s) => s.renameFloor)
  const mode = useStore((s) => s.mode)

  const currentFloor = map.floors.find((f) => f.floorIndex === activeFloor)

  const noSelection = !selection || !currentFloor

  const roomInfo = useMemo(() => {
    if (!selection || !currentFloor) return null
    const overlayType = currentFloor.overlay[selection.row]?.[selection.col] as OverlayType | undefined
    if (overlayType !== 'room') return null
    const regions = findRoomRegions(currentFloor)
    const region = regions.find((r) => r.tiles.some((t) => t.row === selection.row && t.col === selection.col)) ?? null
    if (!region) return null
    return {
      region,
      isAnchor: region.anchor.row === selection.row && region.anchor.col === selection.col,
      doorCount: getRoomDoors(map, region).length,
    }
  }, [map, activeFloor, selection])

  if (noSelection || !currentFloor) {
    return (
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 text-sm overflow-y-auto">
        <h3 className="text-gray-200 font-semibold mb-3">Floor Settings</h3>

        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Name</div>
          <input
            type="text"
            value={currentFloor?.label ?? ''}
            onChange={(e) => {
              if (currentFloor) {
                renameFloor(activeFloor, e.target.value)
              }
            }}
            className="w-full bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>

        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Width × Height</div>
          <div className="flex gap-2">
            <input
              type="number"
              min={5}
              max={500}
              value={currentFloor?.width ?? 150}
              onChange={(e) => {
                const w = Number(e.target.value)
                if (currentFloor && w >= 5 && w <= 500) {
                  setFloorSize(activeFloor, w, currentFloor.height)
                }
              }}
              className="flex-1 bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
            />
            <span className="text-gray-500 self-center">×</span>
            <input
              type="number"
              min={5}
              max={500}
              value={currentFloor?.height ?? 150}
              onChange={(e) => {
                const h = Number(e.target.value)
                if (currentFloor && h >= 5 && h <= 500) {
                  setFloorSize(activeFloor, currentFloor.width, h)
                }
              }}
              className="flex-1 bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Building</div>
          <div className="flex gap-1 mb-2">
            <select
              value={currentFloor?.buildingId ?? map.buildings[0]?.id}
              onChange={(e) => setFloorBuilding(activeFloor, e.target.value)}
              className="flex-1 bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 outline-none"
            >
              {map.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => addBuilding()}
              className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs"
              title="Add building"
            >
              +Add
            </button>
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto">
            {map.buildings.map((b) => (
              <div key={b.id} className="flex items-center gap-1">
                <input
                  type="text"
                  value={b.name}
                  onChange={(e) => renameBuilding(b.id, e.target.value)}
                  className="flex-1 bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-xs border border-gray-600 outline-none"
                />
                {map.buildings.length > 1 && (
                  <button
                    onClick={() => removeBuilding(b.id)}
                    className="text-red-400 hover:text-red-300 text-xs px-1"
                    title="Remove building"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-500">Select a tile to inspect its properties</div>
      </div>
    )
  }

  const { row, col } = selection!
  const floor = currentFloor
  const baseType = floor.base[row]?.[col] as TileType | undefined
  const overlayType = floor.overlay[row]?.[col] as OverlayType | undefined
  const meta = floor.meta[`${row},${col}`]

  if (!baseType) {
    return (
      <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 text-sm text-gray-400">
        Tile ({row}, {col}) has no base type
      </div>
    )
  }

  const baseStyle = tileStyles[baseType]
  const overlayStyle = overlayType ? overlayStyles[overlayType] : null

  return (
    <div className="w-64 bg-gray-800 border-l border-gray-700 p-3 text-sm overflow-y-auto">
      <h3 className="text-gray-200 font-semibold mb-2">Tile Properties</h3>

      <div className="mb-3">
        <div className="text-xs text-gray-400">Position</div>
        <div className="text-gray-200 font-mono">({row}, {col})</div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-400">Base</div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded"
            style={{ backgroundColor: baseStyle.fill, border: `1px solid ${baseStyle.stroke}` }}
          />
          <span className="text-gray-200 capitalize">{baseType}</span>
        </div>
      </div>

      {overlayType && overlayStyle && (
        <div className="mb-3">
          <div className="text-xs text-gray-400">Overlay</div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ backgroundColor: overlayStyle.fill, border: `1px solid ${overlayStyle.stroke}` }}
            />
            <span className="text-gray-200 capitalize">{overlayType.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {roomInfo && (
        <div className="mb-3 p-2 bg-gray-900 rounded">
          <div className="text-xs text-gray-400">Room Region</div>
          <div className="text-gray-200 text-xs">
            {roomInfo.region.tiles.length} tile{roomInfo.region.tiles.length !== 1 && 's'}
            {roomInfo.isAnchor ? ' (anchor)' : ''}
          </div>
          <div className="text-gray-200 text-xs">
            {roomInfo.doorCount} door{roomInfo.doorCount !== 1 && 's'} on boundary
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <>
          <div className="border-t border-gray-700 my-2" />

          {roomInfo ? (
            <div className="mb-2">
              <label className="text-xs text-gray-400 block mb-1">Room Label</label>
              <input
                type="text"
                value={roomInfo.region.label ?? ''}
                onChange={(e) => setTileMeta(roomInfo.region.anchor.row, roomInfo.region.anchor.col, { label: e.target.value })}
                className="w-full bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
                placeholder="e.g. Conference Room"
              />
            </div>
          ) : (
            <>
              <div className="mb-2">
                <label className="text-xs text-gray-400 block mb-1">
                  Weight <span className="text-gray-500">(path cost)</span>
                </label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={meta?.weight ?? 1}
                  onChange={(e) => setTileMeta(row, col, { weight: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="mb-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={meta?.accessible ?? true}
                  onChange={(e) => setTileMeta(row, col, { accessible: e.target.checked })}
                  className="rounded"
                />
                <label className="text-xs text-gray-400">Accessible (wheelchair)</label>
              </div>
            </>
          )}

          {(baseType === 'stairs' || baseType === 'elevator') && (
            <div className="border-t border-gray-700 my-2" />
          )}

          {baseType === 'stairs' && (
            <>
              <div className="mb-2">
                <label className="text-xs text-gray-400 block mb-1">To Floor Superior</label>
                <select
                  value={meta?.toFloorSuperior ?? ''}
                  onChange={(e) => setTileMeta(row, col, { toFloorSuperior: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 outline-none"
                >
                  <option value="">-- none --</option>
                  {map.floors
                    .filter((f) => f.floorIndex > activeFloor)
                    .map((f) => (
                      <option key={f.floorIndex} value={f.floorIndex}>
                        {f.label} (f{f.floorIndex})
                      </option>
                    ))}
                </select>
              </div>
              <div className="mb-2">
                <label className="text-xs text-gray-400 block mb-1">To Floor Inferior</label>
                <select
                  value={meta?.toFloorInferior ?? ''}
                  onChange={(e) => setTileMeta(row, col, { toFloorInferior: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm border border-gray-600 outline-none"
                >
                  <option value="">-- none --</option>
                  {map.floors
                    .filter((f) => f.floorIndex < activeFloor)
                    .map((f) => (
                      <option key={f.floorIndex} value={f.floorIndex}>
                        {f.label} (f{f.floorIndex})
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {baseType === 'elevator' && (
            <div className="mb-2">
              <label className="text-xs text-gray-400 block mb-1">Connected Floors</label>
              {map.floors
                .filter((f) => f.floorIndex !== activeFloor)
                .map((f) => {
                  const isChecked = (meta?.connectedFloors ?? []).includes(f.floorIndex)
                  return (
                    <label key={f.floorIndex} className="flex items-center gap-2 text-gray-300 text-sm py-0.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const current = meta?.connectedFloors ?? []
                          const updated = e.target.checked
                            ? [...current, f.floorIndex].sort((a, b) => a - b)
                            : current.filter((fi) => fi !== f.floorIndex)
                          setTileMeta(row, col, { connectedFloors: updated })
                        }}
                      />
                      {f.label} (f{f.floorIndex})
                    </label>
                  )
                })}
            </div>
          )}

          {meta && Object.keys(meta).length > 0 && (
            <div className="border-t border-gray-700 my-2" />
          )}

          {meta?.tags && meta.tags.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">Tags</div>
              <div className="flex flex-wrap gap-1">
                {meta.tags.map((tag, i) => (
                  <span key={i} className="bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

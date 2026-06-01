import React, { useRef, useState, useEffect } from 'react'
import { useStore } from './store'
import { validateFloorConnectivity } from '../core/validator'

export default function FloorTabs() {
  const map = useStore((s) => s.map)
  const activeFloor = useStore((s) => s.activeFloor)
  const validationErrors = useStore((s) => s.validationErrors)
  const setActiveFloor = useStore((s) => s.setActiveFloor)
  const addFloor = useStore((s) => s.addFloor)
  const removeFloor = useStore((s) => s.removeFloor)
  const renameFloor = useStore((s) => s.renameFloor)
  const duplicateFloor = useStore((s) => s.duplicateFloor)

  const [dupPos, setDupPos] = useState<{ top: number; left: number; floorIndex: number } | null>(null)
  const dupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dupPos) return
    const handler = (e: MouseEvent) => {
      if (dupRef.current && !dupRef.current.contains(e.target as Node)) {
        setDupPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dupPos])

  const errors = validationErrors.length > 0 ? validationErrors : (() => {
    try {
      return validateFloorConnectivity(map)
    } catch { return [] }
  })()

  const getErrorCount = (floorIndex: number) =>
    errors.filter((e) => e.floorIndex === floorIndex).length

  return (
    <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 border-b border-gray-700 overflow-x-auto">
      {map.floors
        .sort((a, b) => a.order - b.order)
        .map((floor) => {
          const errCount = getErrorCount(floor.floorIndex)
          const isActive = floor.floorIndex === activeFloor
          return (
            <div key={floor.floorIndex} className="flex items-center gap-1">
              <button
                onClick={() => setActiveFloor(floor.floorIndex)}
                className={`px-3 py-1.5 text-sm rounded-t transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-gray-700 text-white border-t border-l border-r border-gray-600'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                }`}
              >
                {floor.label}
                {errCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    !
                  </span>
                )}
              </button>
              {isActive && (
                <div className="flex gap-0.5">
                  <button
                    onClick={(e) => {
                      if (dupPos && dupPos.floorIndex === floor.floorIndex) {
                        setDupPos(null)
                      } else {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setDupPos({ top: rect.bottom + 4, left: rect.left, floorIndex: floor.floorIndex })
                      }
                    }}
                    className="text-gray-500 hover:text-gray-300 text-xs px-1"
                    title="Duplicate floor"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={() => {
                      const label = prompt('Floor name:', floor.label)
                      if (label?.trim()) renameFloor(floor.floorIndex, label.trim())
                    }}
                    className="text-gray-500 hover:text-gray-300 text-xs px-1"
                    title="Rename"
                  >
                    ✎
                  </button>
                  {map.floors.length > 1 && (
                    <button
                      onClick={() => removeFloor(floor.floorIndex)}
                      className="text-red-400 hover:text-red-300 text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      <button
        onClick={() => addFloor()}
        className="px-2 py-1.5 text-gray-400 hover:text-gray-200 text-sm"
        title="Add floor"
      >
        +
      </button>

      {dupPos && (
        <div
          ref={dupRef}
          style={{ position: 'fixed', zIndex: 9999, top: dupPos.top, left: dupPos.left }}
          className="bg-gray-700 border border-gray-600 rounded shadow-lg text-xs whitespace-nowrap"
        >
          <button
            onClick={() => { duplicateFloor(dupPos.floorIndex, 'full'); setDupPos(null) }}
            className="block w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-600"
          >
            Full content
          </button>
          <button
            onClick={() => { duplicateFloor(dupPos.floorIndex, 'size'); setDupPos(null) }}
            className="block w-full text-left px-3 py-1.5 text-gray-200 hover:bg-gray-600"
          >
            Size only
          </button>
        </div>
      )}
    </div>
  )
}

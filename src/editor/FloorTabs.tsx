import { useRef, useState, useEffect } from 'react'
import { useStore } from './store'
import { validateFloorConnectivity } from '../core/validator'
import { formatKeys, getKeys } from '../core/keybinds'

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
    <div className="flex items-center gap-1 bg-deep-800 px-2 py-1.5 border-b border-border overflow-x-auto">
      {map.floors
        .sort((a, b) => a.order - b.order)
        .map((floor) => {
          const errCount = getErrorCount(floor.floorIndex)
          const isActive = floor.floorIndex === activeFloor
          return (
            <div key={floor.floorIndex} className="flex items-center gap-0.5">
              <button
                onClick={() => setActiveFloor(floor.floorIndex)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {floor.label}
                {errCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold">
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
                    className="text-text-tertiary hover:text-text-primary text-xs px-1 rounded-md hover:bg-surface-hover transition-all duration-150"
                    title="Duplicate floor"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={() => {
                      const label = prompt('Floor name:', floor.label)
                      if (label?.trim()) renameFloor(floor.floorIndex, label.trim())
                    }}
                    className="text-text-tertiary hover:text-text-primary text-xs px-1 rounded-md hover:bg-surface-hover transition-all duration-150"
                    title="Rename"
                  >
                    ✎
                  </button>
                  {map.floors.length > 1 && (
                    <button
                      onClick={() => removeFloor(floor.floorIndex)}
                      className="text-danger hover:text-danger/80 text-xs px-1 rounded-md hover:bg-surface-hover transition-all duration-150"
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
        className="px-2 py-1.5 text-text-tertiary hover:text-text-primary text-sm cursor-pointer transition-all duration-150 rounded-lg hover:bg-surface-hover"
        title={`Add floor (${formatKeys(getKeys('add-floor'))})`}
      >
        +
      </button>

      {dupPos && (
        <div
          ref={dupRef}
          style={{ position: 'fixed', zIndex: 9999, top: dupPos.top, left: dupPos.left }}
          className="bg-surface-elevated border border-border rounded-xl shadow-2xl text-xs whitespace-nowrap overflow-hidden"
        >
          <button
            onClick={() => { duplicateFloor(dupPos.floorIndex, 'full'); setDupPos(null) }}
            className="block w-full text-left px-3 py-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-150"
          >
            Full content
          </button>
          <button
            onClick={() => { duplicateFloor(dupPos.floorIndex, 'size'); setDupPos(null) }}
            className="block w-full text-left px-3 py-2 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-all duration-150"
          >
            Size only
          </button>
        </div>
      )}
    </div>
  )
}

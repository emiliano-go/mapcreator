import React from 'react'
import type { MapFloor } from '../core/types'

interface FloorSelectorProps {
  floors: MapFloor[]
  activeFloor: number
  onChange: (floorIndex: number) => void
}

export default function FloorSelector({ floors, activeFloor, onChange }: FloorSelectorProps) {
  const sorted = [...floors].sort((a, b) => a.order - b.order)

  return (
    <div className="flex items-center gap-1">
      {sorted.map((floor) => (
        <button
          key={floor.floorIndex}
          onClick={() => onChange(floor.floorIndex)}
          className={`px-3 py-1 text-xs rounded-lg transition-all duration-150 cursor-pointer ${
            floor.floorIndex === activeFloor
              ? 'bg-accent text-white shadow-sm shadow-accent/20'
              : 'text-text-tertiary hover:text-text-primary hover:bg-surface-hover'
          }`}
        >
          {floor.label}
        </button>
      ))}
    </div>
  )
}

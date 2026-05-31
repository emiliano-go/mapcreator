import React, { useCallback, useRef } from 'react'
import { useStore } from './store'
import type { BuildingMap } from '../core/types'
import { validate } from '../core/validator'

export default function MenuBar() {
  const map = useStore((s) => s.map)
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const importMap = useStore((s) => s.importMap)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.canUndo)
  const canRedo = useStore((s) => s.canRedo)
  const validationErrors = useStore((s) => s.validationErrors)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(() => {
    const data = useStore.getState().exportMap()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        const result = validate(data)
        if (result.success) {
          importMap(data as BuildingMap)
        } else {
          alert('Invalid map file: ' + JSON.stringify(result.error))
        }
      } catch {
        alert('Failed to parse file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [importMap])

  const hasErrors = validationErrors.length > 0

  return (
    <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 border-b border-gray-700 text-sm">
      <span className="text-gray-400 font-semibold mr-2">{map.name}</span>

      <button onClick={() => fileInputRef.current?.click()} className="text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700">
        Import
      </button>
      <button onClick={handleExport} className="text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700">
        Export
      </button>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      <div className="border-l border-gray-700 h-4 mx-1" />

      <button
        onClick={undo}
        disabled={!canUndo()}
        className="text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Shift+Z)"
      >
        ↪
      </button>

      <div className="border-l border-gray-700 h-4 mx-1" />

      <div className="flex rounded overflow-hidden border border-gray-600">
        {(['edit', 'simulate', 'preview'] as const).map((m) => {
          const isActive = mode === m
          const isDisabled = m !== 'edit' && hasErrors
          return (
            <button
              key={m}
              onClick={() => !isDisabled && setMode(m)}
              disabled={isDisabled}
              className={`px-3 py-0.5 text-xs uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : isDisabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-gray-200 bg-gray-800'
              }`}
            >
              {m}
              {isDisabled && <span className="ml-1 text-red-400" title="Fix validation errors first">!</span>}
            </button>
          )
        })}
      </div>

      {hasErrors && (
        <span className="text-red-400 text-xs ml-2">
          {validationErrors.length} floor{validationErrors.length > 1 ? 's' : ''} not connected
        </span>
      )}
    </div>
  )
}

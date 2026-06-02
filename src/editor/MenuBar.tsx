import React, { useCallback, useRef, useState } from 'react'
import { useStore } from './store'
import type { BuildingMap } from '../core/types'
import { validate } from '../core/validator'
import { formatKeys, getKeys } from '../core/keybinds'
import KeybindsPanel from './KeybindsPanel'

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
  const [showKeybinds, setShowKeybinds] = useState(false)

  const handleExport = useCallback(() => {
    const data = useStore.getState().exportFull()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.map.name.replace(/\s+/g, '_')}.json`
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

  const isDark = useStore((s) => s.isDark)
  const toggleTheme = useStore((s) => s.toggleTheme)
  const hasErrors = validationErrors.length > 0

  return (
    <>
      <div className="flex items-center gap-1.5 bg-surface px-3 py-2 border-b border-border text-sm select-none">
        <span className="text-text-secondary font-semibold mr-2 tracking-wide text-[13px]">{map.name}</span>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 cursor-pointer text-[13px]"
          title={`Import map (${formatKeys(getKeys('import'))})`}
        >
          Import
        </button>
        <button
          onClick={handleExport}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 cursor-pointer text-[13px]"
          title={`Export map (${formatKeys(getKeys('save'))})`}
        >
          Export
        </button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

        <div className="border-l border-border h-4 mx-1" />

        <button
          onClick={undo}
          disabled={!canUndo()}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-[13px]"
          title={`Undo (${formatKeys(getKeys('undo'))})`}
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed text-[13px]"
          title={`Redo (${formatKeys(getKeys('redo'))})`}
        >
          ↪
        </button>

        <div className="border-l border-border h-4 mx-1" />

        <div className="flex rounded-lg overflow-hidden border border-border bg-deep-800">
          {(['edit', 'simulate', 'preview'] as const).map((m) => {
            const isActive = mode === m
            const isDisabled = m !== 'edit' && hasErrors
            const modeKeys: Record<string, string> = {
              edit: formatKeys(getKeys('mode-edit')),
              simulate: formatKeys(getKeys('mode-simulate')),
              preview: formatKeys(getKeys('mode-preview')),
            }
            return (
              <button
                key={m}
                onClick={() => !isDisabled && setMode(m)}
                disabled={isDisabled}
                className={`px-3 py-1 text-xs font-medium uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : isDisabled
                    ? 'text-deep-500 cursor-not-allowed'
                    : 'text-text-tertiary hover:text-text-primary bg-deep-900'
                }`}
                title={modeKeys[m]}
              >
                {m}
                {isDisabled && <span className="ml-1 text-danger" title="Fix validation errors first">!</span>}
              </button>
            )
          })}
        </div>

        {hasErrors && (
          <span className="text-danger text-xs ml-1">
            {validationErrors.length} floor{validationErrors.length > 1 ? 's' : ''} not connected
          </span>
        )}

        <div className="ml-auto" />

        <button
          onClick={toggleTheme}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 text-xs cursor-pointer"
          title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        >
          {isDark ? '\u2600' : '\u263E'}
        </button>

        <button
          onClick={() => setShowKeybinds(true)}
          className="text-text-tertiary hover:text-text-primary px-2 py-1 rounded-md hover:bg-surface-hover transition-all duration-150 text-xs cursor-pointer"
          title={`Keybinds (${formatKeys(getKeys('keybinds'))})`}
        >
          ⌨ Keybinds
        </button>
      </div>

      {showKeybinds && <KeybindsPanel onClose={() => setShowKeybinds(false)} />}
    </>
  )
}

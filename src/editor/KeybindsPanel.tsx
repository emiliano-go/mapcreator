import { useState, useEffect, useRef, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { getEntries, setKeybind, resetKeybinds, exportKeybinds, importKeybinds, formatKeys, type KeybindEntry } from '../core/keybinds'

interface Props {
  onClose: () => void
}

export default function KeybindsPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<KeybindEntry[]>(getEntries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  const refresh = useCallback(() => {
    setEntries(getEntries())
    setEditingId(null)
  }, [])

  const handleKeyCapture = useCallback((e: ReactKeyboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editingId) return

    const key = e.key.toLowerCase()
    if (['control', 'shift', 'alt', 'meta'].includes(key)) return

    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('ctrl')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    parts.push(key)

    const combo = parts.join('+')
    setKeybind(editingId, combo)
    refresh()
  }, [editingId, refresh])

  const handleReset = useCallback(() => {
    resetKeybinds()
    refresh()
    setMessage('Keybinds reset to defaults')
    setTimeout(() => setMessage(''), 2000)
  }, [refresh])

  const handleExport = useCallback(() => {
    const blob = new Blob([exportKeybinds()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'keybinds.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleImport = useCallback(() => {
    try {
      importKeybinds(importText)
      refresh()
      setShowImport(false)
      setImportText('')
      setMessage('Keybinds imported successfully')
      setTimeout(() => setMessage(''), 2000)
    } catch {
      setMessage('Invalid format')
      setTimeout(() => setMessage(''), 2000)
    }
  }, [importText, refresh])

  const grouped = entries.reduce<Record<string, KeybindEntry[]>>((acc, e) => {
    ;(acc[e.category] ??= []).push(e)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-text-primary font-semibold text-[15px]">Keybinds</h2>
          <div className="flex items-center gap-2">
            {message && <span className="text-success text-xs">{message}</span>}
            <button
              onClick={() => setShowImport(!showImport)}
              className="text-xs text-text-tertiary hover:text-text-primary transition-all duration-150 px-2 py-1 rounded-lg hover:bg-surface-hover"
            >
              Import
            </button>
            <button
              onClick={handleExport}
              className="text-xs text-text-tertiary hover:text-text-primary transition-all duration-150 px-2 py-1 rounded-lg hover:bg-surface-hover"
            >
              Export
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-danger hover:text-danger/80 transition-all duration-150 px-2 py-1 rounded-lg hover:bg-surface-hover"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-all duration-150 ml-1 rounded-lg p-1 hover:bg-surface-hover"
            >
              ✕
            </button>
          </div>
        </div>

        {showImport && (
          <div className="px-5 py-2.5 border-b border-border bg-deep-800">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste exported keybinds JSON here..."
              className="w-full h-20 bg-deep-700 text-text-primary text-xs p-2.5 rounded-lg border border-border outline-none resize-none transition-all duration-150 focus:border-accent"
            />
            <button
              onClick={handleImport}
              className="mt-1.5 text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg transition-all duration-150 shadow-sm shadow-accent/20"
            >
              Apply
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs text-text-tertiary uppercase tracking-wider font-medium mb-1.5">{category}</h3>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-surface-hover group transition-all duration-150">
                    <span className="text-sm text-text-primary">{item.label}</span>
                    {editingId === item.id ? (
                      <input
                        ref={inputRef}
                        onKeyDown={handleKeyCapture}
                        onBlur={() => setEditingId(null)}
                        className="w-28 bg-deep-700 text-warning text-xs px-2 py-1 rounded-lg border border-warning/50 outline-none text-center font-mono"
                        placeholder="Press keys..."
                        readOnly
                      />
                    ) : (
                      <button
                        onClick={() => setEditingId(item.id)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-deep-700 text-text-tertiary hover:text-warning hover:bg-deep-600 transition-all duration-150 border border-border hover:border-warning/30 font-mono"
                        title="Click to rebind"
                      >
                        {formatKeys(item.keys)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-t border-border text-xs text-text-tertiary">
          Click a keybind to change it. Press the desired key combination.
        </div>
      </div>
    </div>
  )
}

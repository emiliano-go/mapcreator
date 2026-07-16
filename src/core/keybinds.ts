export interface KeybindEntry {
  id: string
  label: string
  keys: string
  category: string
}

const STORAGE_KEY = 'mapcreator_keybinds'

export const DEFAULT_KEYBINDS: KeybindEntry[] = [
  { id: 'tool-select', label: 'Select Tool', keys: 'ctrl+1', category: 'Tools' },
  { id: 'tool-wall', label: 'Wall Brush', keys: 'ctrl+2', category: 'Tools' },
  { id: 'tool-floor', label: 'Floor Brush', keys: 'ctrl+3', category: 'Tools' },
  { id: 'tool-stairs', label: 'Stairs', keys: 'ctrl+4', category: 'Tools' },
  { id: 'tool-elevator', label: 'Elevator', keys: 'ctrl+5', category: 'Tools' },
  { id: 'tool-door', label: 'Door Overlay', keys: 'ctrl+6', category: 'Tools' },
  { id: 'tool-exit_door', label: 'Exit Door Overlay', keys: 'ctrl+7', category: 'Tools' },
  { id: 'tool-room', label: 'Room Overlay', keys: 'ctrl+8', category: 'Tools' },
  { id: 'tool-eraser', label: 'Eraser', keys: 'ctrl+9', category: 'Tools' },
  { id: 'tool-outside', label: 'Outside Brush', keys: 'ctrl+0', category: 'Tools' },
  { id: 'tool-fill', label: 'Fill', keys: 'ctrl+f', category: 'Tools' },
  { id: 'tool-eyedrop', label: 'Eyedrop', keys: 'ctrl+i', category: 'Tools' },
  { id: 'tool-fillRoom', label: 'Fill Room', keys: 'ctrl+shift+f', category: 'Tools' },
  { id: 'straight-mode', label: 'Toggle Straight Mode', keys: 'ctrl+l', category: 'Tools' },
  { id: 'cut', label: 'Cut', keys: 'ctrl+x', category: 'Edit' },
  { id: 'copy', label: 'Copy', keys: 'ctrl+c', category: 'Edit' },
  { id: 'paste', label: 'Paste', keys: 'ctrl+v', category: 'Edit' },
  { id: 'undo', label: 'Undo', keys: 'ctrl+z', category: 'Edit' },
  { id: 'redo', label: 'Redo', keys: 'ctrl+shift+z', category: 'Edit' },
  { id: 'save', label: 'Save / Export', keys: 'ctrl+s', category: 'File' },
  { id: 'import', label: 'Open / Import', keys: 'ctrl+o', category: 'File' },
  { id: 'mode-edit', label: 'Edit Mode', keys: 'ctrl+e', category: 'Mode' },
  { id: 'mode-simulate', label: 'Simulate Mode', keys: 'ctrl+r', category: 'Mode' },
  { id: 'mode-preview', label: 'Preview Mode', keys: 'ctrl+p', category: 'Mode' },
  { id: 'toggle-grid', label: 'Toggle Grid', keys: 'ctrl+g', category: 'View' },
  { id: 'zoom-in', label: 'Zoom In', keys: 'ctrl+=', category: 'View' },
  { id: 'zoom-out', label: 'Zoom Out', keys: 'ctrl+-', category: 'View' },
  { id: 'add-floor', label: 'Add Floor', keys: 'ctrl+shift+a', category: 'Floors' },
  { id: 'keybinds', label: 'Show Keybinds', keys: 'ctrl+k', category: 'Help' },
]

const defaults = DEFAULT_KEYBINDS
let keybinds: Record<string, string> = {}

export function initKeybinds(overrides?: KeybindEntry[]) {
  const src = overrides ?? defaults
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Record<string, string>
      keybinds = { ...mapDefaults(src), ...parsed }
      return
    } catch {
      // stored data is corrupted, fall through to defaults
    }
  }
  keybinds = mapDefaults(src)
}

export function getKeys(id: string): string {
  return keybinds[id] ?? ''
}

export function getEntries(): KeybindEntry[] {
  return defaults.map((e) => ({ ...e, keys: keybinds[e.id] ?? e.keys }))
}

export function setKeybind(id: string, keys: string) {
  keybinds[id] = keys
  persist()
}

export function resetKeybinds() {
  localStorage.removeItem(STORAGE_KEY)
  keybinds = mapDefaults(defaults)
}

export function exportKeybinds(): string {
  return JSON.stringify(getEntries(), null, 2)
}

export function importKeybinds(json: string) {
  const data = JSON.parse(json) as KeybindEntry[]
  const merged = mapDefaults(defaults)
  for (const e of data) {
    if (e.id && e.keys) merged[e.id] = e.keys
  }
  keybinds = merged
  persist()
}

function mapDefaults(src: KeybindEntry[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const e of src) m[e.id] = e.keys
  return m
}

function persist() {
  const overrides: Record<string, string> = {}
  const defs = mapDefaults(defaults)
  for (const [id, keys] of Object.entries(keybinds)) {
    if (!defs[id] || defs[id] !== keys) overrides[id] = keys
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function matchKeybind(e: KeyboardEvent): string | null {
  const key = e.key.toLowerCase()
  if (['control', 'shift', 'alt', 'meta'].includes(key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(key)

  const combo = parts.join('+')

  for (const [id, ks] of Object.entries(keybinds)) {
    if (normalize(ks) === combo) return id
  }
  return null
}

function normalize(keys: string): string {
  return keys.toLowerCase().replace(/\s+/g, '')
}

export function formatKeys(keys: string): string {
  if (!keys) return ''
  return keys
    .split('+')
    .map((p) => {
      const s = p.trim().toLowerCase()
      if (s === 'ctrl') return 'Ctrl'
      if (s === 'shift') return 'Shift'
      if (s === 'alt') return 'Alt'
      if (s === 'meta') return '⌘'
      if (s === '=') return '='
      if (s === '-') return '-'
      return s.charAt(0).toUpperCase() + s.slice(1)
    })
    .join('+')
}

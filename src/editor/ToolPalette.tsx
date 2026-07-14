import { useStore, type EditorTool } from './store'
import { getTileStyles, overlayStyles } from '../theme/tileStyles'
import type { TileType, OverlayType } from '../core/types'
import { getKeys, formatKeys } from '../core/keybinds'

function toolKeys(id: string): string {
  const k = getKeys(`tool-${id}`)
  return k ? formatKeys(k) : ''
}

function shortcut(id: string): string {
  const k = getKeys(id)
  return k ? formatKeys(k) : ''
}

const baseTools: Array<{ tool: TileType; label: string; id: string }> = [
  { tool: 'wall', label: 'Wall', id: 'wall' },
  { tool: 'floor', label: 'Floor', id: 'floor' },
  { tool: 'stairs', label: 'Stairs', id: 'stairs' },
  { tool: 'elevator', label: 'Elevator', id: 'elevator' },
  { tool: 'outside', label: 'Outside', id: 'outside' },
  { tool: 'void', label: 'Void', id: 'void' },
  { tool: 'dirt_path', label: 'Dirt Path', id: 'dirt_path' },
]

const overlayTools: Array<{ tool: OverlayType; label: string; id: string }> = [
  { tool: 'door', label: 'Door', id: 'door' },
  { tool: 'exit_door', label: 'Exit', id: 'exit_door' },
  { tool: 'room', label: 'Room', id: 'room' },
]

const actionTools: Array<{ tool: EditorTool; label: string; id: string }> = [
  { tool: 'select', label: 'Select', id: 'select' },
  { tool: 'eraser', label: 'Eraser', id: 'eraser' },
  { tool: 'fill', label: 'Fill', id: 'fill' },
  { tool: 'eyedrop', label: 'Eyedrop', id: 'eyedrop' },
  { tool: 'fillRoom', label: 'Fill Room', id: 'fillRoom' },
]

export default function ToolPalette() {
  const activeTool = useStore((s) => s.activeTool)
  const straightMode = useStore((s) => s.straightMode)
  const selection = useStore((s) => s.selection)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const setStraightMode = useStore((s) => s.setStraightMode)
  const flipSelectionHorizontal = useStore((s) => s.flipSelectionHorizontal)
  const flipSelectionVertical = useStore((s) => s.flipSelectionVertical)
  const tileStyles = getTileStyles(useStore((s) => s.isDark))

  const selectionSize = {
    horizontal: selection && Math.abs(selection?.startRow - selection?.endRow) || 0,
    vertical: selection && Math.abs(selection?.startCol - selection?.endCol) || 0,
  }

  return (
    <div className="flex flex-col gap-0.5 p-2 bg-surface border-r border-border w-44 overflow-y-auto">
      <button
        onClick={() => setStraightMode(!straightMode)}
        className={`text-left px-2.5 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
          straightMode ? 'bg-success/15 text-success ring-1 ring-success/30' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
        }`}
        title={`Toggle straight mode (${shortcut('straight-mode')})`}
      >
        <span className="mr-1.5">↦</span> Straight
      </button>

      <div className="border-t border-border my-1.5" />

      <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-1 px-1">Actions</div>
      {actionTools.map(({ tool, label, id }) => {
        const keys = toolKeys(id)
        return (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              activeTool === tool ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            title={keys || label}
          >
            {label}
            {keys && <span className="float-right text-text-tertiary text-[10px] mt-0.5">{keys}</span>}
          </button>
        )
      })}

      {(selection && (selectionSize.horizontal >= 1 || selectionSize.vertical >= 1)) && (
        <>
          <div className="border-t border-border my-1.5" />
          <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-1 px-1">Selection</div>
          <button
            onClick={flipSelectionHorizontal}
            className="text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            title="Flip selection horizontally"
          >
            ↔ Flip Horizontal
          </button>
          <button
            onClick={flipSelectionVertical}
            className="text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-hover"
            title="Flip selection vertically"
          >
            ↕ Flip Vertical
          </button>
        </>
      )}

      <div className="border-t border-border my-1.5" />

      <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-1 px-1">Base</div>
      {baseTools.map(({ tool, label, id }) => {
        const style = tileStyles[tool as TileType]
        const keys = toolKeys(id)

        return (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              activeTool === tool ? 'bg-surface-hover text-text-primary ring-1 ring-accent/40' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            title={keys || label}
          >
            <span
              className="inline-block w-3 h-3 rounded mr-2 align-middle"
              style={{ backgroundColor: style?.fill, border: `1px solid ${style?.stroke}` }}
            />
            {label}
            {keys && <span className="float-right text-text-tertiary text-[10px] mt-0.5">{keys}</span>}
          </button>
        )
      })}

      <div className="border-t border-border my-1.5" />

      <div className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium mb-1 px-1">Overlay</div>
      {overlayTools.map(({ tool, label, id }) => {
        const style = overlayStyles[tool as Exclude<OverlayType, null>]
        const keys = toolKeys(id)

        return (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`text-left px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              activeTool === tool ? 'bg-surface-hover text-text-primary ring-1 ring-accent/40' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
            title={keys || label}
          >
            <span
              className="inline-block w-3 h-3 rounded mr-2 align-middle"
              style={{ backgroundColor: style?.fill, border: `1px solid ${style?.stroke}` }}
            />
            {label}
            {keys && <span className="float-right text-text-tertiary text-[10px] mt-0.5">{keys}</span>}
          </button>
        )
      })}
    </div>
  )
}

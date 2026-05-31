import { useStore, type EditorTool } from './store'
import { tileStyles } from '../theme/tileStyles'
import { overlayStyles } from '../theme/tileStyles'
import type { TileType, OverlayType } from '../core/types'

const baseTools: Array<{ tool: TileType; label: string; key: string }> = [
  { tool: 'wall', label: '🧱 Wall', key: '2' },
  { tool: 'floor', label: '⬜ Floor', key: '3' },
  { tool: 'stairs', label: '🔶 Stairs', key: '4' },
  { tool: 'elevator', label: '🟣 Elevator', key: '5' },
  { tool: 'outside', label: '⬛ Outside', key: '0' },
  { tool: 'void', label: '⊡ Void', key: '-' },
  { tool: 'dirt_path', label: '~ Dirt Path', key: '-' },
]

const overlayTools: Array<{ tool: OverlayType; label: string; key: string }> = [
  { tool: 'door', label: '🚪 Door', key: '6' },
  { tool: 'exit_door', label: '🚨 Exit', key: '7' },
  { tool: 'room', label: '🏠 Room', key: '8' },
]

const actionTools: Array<{ tool: EditorTool; label: string; key: string }> = [
  { tool: 'select', label: '⇱ Select', key: '1' },
  { tool: 'eraser', label: '🧹 Eraser', key: '9' },
  { tool: 'fill', label: '🪣 Fill', key: '-' },
  { tool: 'eyedrop', label: '💉 Eyedrop', key: '-' },
  { tool: 'fillRoom', label: '🏠 Fill Room', key: '-' },
]

export default function ToolPalette() {
  const activeTool = useStore((s) => s.activeTool)
  const activeTab = useStore((s) => s.activeTab)
  const straightMode = useStore((s) => s.straightMode)
  const setActiveTool = useStore((s) => s.setActiveTool)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setStraightMode = useStore((s) => s.setStraightMode)

  return (
    <div className="flex flex-col gap-1 p-2 bg-gray-800 border-r border-gray-700 w-40 overflow-y-auto">
      <button
        onClick={() => setStraightMode(!straightMode)}
        className={`text-left px-2 py-1 rounded text-sm transition-colors ${
          straightMode ? 'bg-green-700 text-white ring-2 ring-green-400' : 'text-gray-300 hover:bg-gray-700'
        }`}
      >
        ↦ Straight
      </button>

      <div className="border-t border-gray-700 my-2" />

      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Actions</div>
      {actionTools.map(({ tool, label, key }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          className={`text-left px-2 py-1 rounded text-sm transition-colors ${
            activeTool === tool ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          {label}
          {key !== '-' && <span className="float-right text-gray-500 text-xs">{key}</span>}
        </button>
      ))}

      <div className="border-t border-gray-700 my-2" />

      <div className="flex gap-1 mb-1">
        <button
          onClick={() => setActiveTab('base')}
          className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
            activeTab === 'base' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Base
        </button>
        <button
          onClick={() => setActiveTab('overlay')}
          className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
            activeTab === 'overlay' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Overlay
        </button>
      </div>

      {(activeTab === 'base' ? baseTools : overlayTools).map(({ tool, label, key }) => {
        const style = activeTab === 'base'
          ? tileStyles[tool as TileType]
          : overlayStyles[tool as Exclude<OverlayType, null>]

        return (
          <button
            key={tool}
            onClick={() => setActiveTool(tool)}
            className={`text-left px-2 py-1 rounded text-sm transition-colors ${
              activeTool === tool ? 'ring-2 ring-blue-400 bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded mr-2 align-middle"
              style={{ backgroundColor: style?.fill, border: `1px solid ${style?.stroke}` }}
            />
            {label}
            {key !== '-' && <span className="float-right text-gray-500 text-xs">{key}</span>}
          </button>
        )
      })}
    </div>
  )
}

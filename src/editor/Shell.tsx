import React from 'react'
import { useStore } from './store'
import MenuBar from './MenuBar'
import ToolPalette from './ToolPalette'
import PropertyPanel from './PropertyPanel'
import SimulatePanel from './SimulatePanel'
import FloorTabs from './FloorTabs'
import EditorCanvas from './canvas/EditorCanvas'

export default function Shell() {
  const mode = useStore((s) => s.mode)

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      <MenuBar />
      <FloorTabs />
      <div className="flex-1 flex overflow-hidden">
        {mode !== 'preview' && <ToolPalette />}
        <div className="flex-1 relative">
          {mode === 'preview' ? (
            <EditorCanvas />
          ) : (
            <EditorCanvas />
          )}
        </div>
        {mode === 'simulate' && <SimulatePanel />}
        {mode === 'edit' && <PropertyPanel />}
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import { initKeybinds } from '../core/keybinds'
import type { KeybindEntry } from '../core/keybinds'
import MenuBar from './MenuBar'
import ToolPalette from './ToolPalette'
import PropertyPanel from './PropertyPanel'
import SimulatePanel from './SimulatePanel'
import FloorTabs from './FloorTabs'
import EditorCanvas from './canvas/EditorCanvas'

export default function Shell() {
  const mode = useStore((s) => s.mode)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initKeybinds()
    setReady(true)

    const stored = localStorage.getItem('mapcreator-theme')
    if (stored === 'dark') {
      document.documentElement.classList.add('dark')
      useStore.setState({ isDark: true })
    } else {
      document.documentElement.classList.remove('dark')
      useStore.setState({ isDark: false })
    }

    fetch('/keybinds.txt')
      .then((r) => r.json().catch(() => null))
      .then((data: KeybindEntry[] | null) => {
        if (data) initKeybinds(data)
      })
      .catch(() => {})
  }, [])

  if (!ready) return null

  return (
    <div className="h-full flex flex-col bg-deep-900 text-text-primary selection:bg-accent/20">
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

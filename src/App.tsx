import { useStore } from './editor/store'
import Shell from './editor/Shell'
import ViewerShell from './viewer/ViewerShell'

export default function App() {
  const map = useStore((s) => s.map)
  const isStandaloneViewer = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('view')

  if (isStandaloneViewer) {
    return <ViewerShell map={map} />
  }

  return <Shell />
}

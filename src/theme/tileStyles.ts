import type { TileType, OverlayType } from '../core/types'

export interface TileStyle {
  fill: string
  stroke: string
  label?: string
  opacity?: number
}

export const tileStyles: Record<TileType, TileStyle> = {
  wall: { fill: '#1e1e2e', stroke: '#313244' },
  floor: { fill: '#e8e8f0', stroke: '#cdd6f4' },
  stairs: { fill: '#fe9f2e', stroke: '#e07a10', label: '\u25B2\u25BC' },
  elevator: { fill: '#8839ef', stroke: '#6c2dcb', label: '\u2B06\u2B07' },
  outside: { fill: '#2a1e1e', stroke: '#3d2828' },
  dirt_path: { fill: '#4a3e2e', stroke: '#5a4e3e', label: '~' },
  void: { fill: '#0d0d14', stroke: '#1a1a2e' },
}

export interface OverlayStyle {
  fill: string
  stroke: string
  label?: string
  opacity: number
}

export const overlayStyles: Record<Exclude<OverlayType, null>, OverlayStyle> = {
  door: { fill: 'rgba(64, 160, 43, 0.6)', stroke: '#2d7a1f', label: '\u25FB', opacity: 0.6 },
  exit_door: { fill: 'rgba(210, 15, 57, 0.7)', stroke: '#a00028', label: 'EXIT', opacity: 0.7 },
  room: { fill: 'rgba(30, 102, 245, 0.3)', stroke: '#1653c7', opacity: 0.3 },
}

export interface EditorStyleExtension {
  pathHighlight: string
  pathHead: string
  selectionFill: string
  selectionStroke: string
  markerA: string
  markerB: string
}

export const editorStyles: EditorStyleExtension = {
  pathHighlight: 'rgba(250, 199, 117, 0.5)',
  pathHead: '#EF9F27',
  selectionFill: 'rgba(55, 138, 221, 0.15)',
  selectionStroke: '#378ADD',
  markerA: '#1D9E75',
  markerB: '#E24B4A',
}

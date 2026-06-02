import type { TileType, OverlayType } from '../core/types'

export interface TileStyle {
  fill: string
  stroke: string
  label?: string
  opacity?: number
  cssClass: string
}

export const tileStylesDark: Record<TileType, TileStyle> = {
  wall: { fill: '#554848', stroke: '#6a5c5c', cssClass: 'tile-wall' },
  floor: { fill: '#262636', stroke: '#36364a', cssClass: 'tile-floor' },
  stairs: { fill: '#fe9f2e', stroke: '#e07a10', label: '\u25B2\u25BC', cssClass: 'tile-stairs' },
  elevator: { fill: '#8839ef', stroke: '#6c2dcb', label: '\u2B06\u2B07', cssClass: 'tile-elevator' },
  outside: { fill: '#2a1e1e', stroke: '#3d2828', cssClass: 'tile-outside' },
  dirt_path: { fill: '#4a3e2e', stroke: '#5a4e3e', label: '~', cssClass: 'tile-dirt-path' },
  void: { fill: '#0a0a0f', stroke: '#16161e', cssClass: 'tile-void' },
}

export const tileStylesLight: Record<TileType, TileStyle> = {
  wall: { fill: '#b0a8a0', stroke: '#948c84', cssClass: 'tile-wall' },
  floor: { fill: '#ffffff', stroke: '#e4e4e7', cssClass: 'tile-floor' },
  stairs: { fill: '#f59e0b', stroke: '#d97706', label: '\u25B2\u25BC', cssClass: 'tile-stairs' },
  elevator: { fill: '#8b5cf6', stroke: '#7c3aed', label: '\u2B06\u2B07', cssClass: 'tile-elevator' },
  outside: { fill: '#d4ccc4', stroke: '#b8b0a8', cssClass: 'tile-outside' },
  dirt_path: { fill: '#e8d5b7', stroke: '#c4a97d', label: '~', cssClass: 'tile-dirt-path' },
  void: { fill: '#f2f2f0', stroke: '#d8d8d4', cssClass: 'tile-void' },
}

export function getTileStyles(isDark: boolean): Record<TileType, TileStyle> {
  return isDark ? tileStylesDark : tileStylesLight
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
  pathHighlight: 'rgba(99, 102, 241, 0.35)',
  pathHead: '#818CF8',
  selectionFill: 'rgba(99, 102, 241, 0.12)',
  selectionStroke: '#6366F1',
  markerA: '#22C55E',
  markerB: '#EF4444',
}

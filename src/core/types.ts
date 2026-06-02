export type TileType =
  | 'wall'
  | 'floor'
  | 'stairs'
  | 'elevator'
  | 'outside'
  | 'dirt_path'
  | 'void'

export type OverlayType =
  | 'door'
  | 'exit_door'
  | 'room'
  | null

export interface TileMeta {
  label?: string
  accessible?: boolean
  weight?: number
  toFloorSuperior?: number
  toFloorInferior?: number
  connectedFloors?: number[]
  tags?: string[]
}

export interface BuildingInfo {
  id: string
  name: string
}

export interface MapFloor {
  floorIndex: number
  buildingId: string
  label: string
  order: number
  width: number
  height: number
  base: TileType[][]
  overlay: OverlayType[][]
  meta: Record<string, TileMeta>
}

export interface BuildingMap {
  id: string
  name: string
  version: string
  createdAt: string
  updatedAt: string
  floors: MapFloor[]
  defaultFloor: number
  buildings: BuildingInfo[]
}

export interface GraphNode {
  id: string
  floorIndex: number
  row: number
  col: number
  base: TileType
  overlay: OverlayType
  meta: TileMeta
}

export interface GraphEdge {
  from: string
  to: string
  weight: number
  crossFloor: boolean
}

export type AdjacencyGraph = Map<string, GraphEdge[]>

export interface GraphData {
  adjacency: AdjacencyGraph
  nodeMeta: Map<string, TileMeta>
  nodeTypes: Map<string, { base: TileType; overlay: OverlayType }>
}

export interface PathfinderOptions {
  accessibleOnly?: boolean
  preferElevator?: boolean
  maxFloorChanges?: number
  noOutside?: boolean
}

export interface PathResult {
  found: boolean
  path: GraphNode[]
  totalWeight: number
  floorChanges: number
}

export interface FloorValidationError {
  floorIndex: number
  label: string
  message: string
}

export interface TileGroup {
  id: string
  type: 'stairs' | 'elevator'
  floorIndex: number
  tiles: Array<{ row: number; col: number }>
  anchor: { row: number; col: number }
}

export interface RoomRegion {
  id: string
  floorIndex: number
  tiles: Array<{ row: number; col: number }>
  anchor: { row: number; col: number }
  label: string | null
  doorCount: number
  type: 'room' | 'hallway'
}

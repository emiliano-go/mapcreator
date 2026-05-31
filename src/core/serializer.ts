import type { BuildingMap } from './types'

export function serialize(map: BuildingMap): string {
  return JSON.stringify(map, null, 2)
}

export function deserialize(json: string): BuildingMap {
  return JSON.parse(json) as BuildingMap
}

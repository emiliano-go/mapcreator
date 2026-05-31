import type { BuildingMap, TileMeta, OverlayType, TileType } from '../types'

type MigrationFn = (map: BuildingMap) => BuildingMap

const migrations = new Map<string, MigrationFn>()

export function registerMigration(fromVersion: string, fn: MigrationFn) {
  migrations.set(fromVersion, fn)
}

export function migrate(map: BuildingMap, targetVersion: string): BuildingMap {
  let current = { ...map }
  const seen = new Set<string>()

  while (current.version !== targetVersion && !seen.has(current.version)) {
    seen.add(current.version)
    const fn = migrations.get(current.version)
    if (!fn) break
    current = fn(current)
  }

  return current
}

registerMigration('1.0.0', (map) => {
  const migrated: BuildingMap = {
    ...map,
    version: '2.0.0',
    floors: map.floors.map((floor, idx) => ({
      ...floor,
      order: (floor as Record<string, unknown>).order as number ?? idx,
      meta: Object.fromEntries(
        Object.entries(floor.meta as Record<string, TileMeta>).map(([key, tm]) => {
          const meta = tm as TileMeta & { connectedFloors?: number[] }
          const { connectedFloors, ...rest } = meta
          if (connectedFloors && connectedFloors.length > 0) {
            const floorIndex = floor.floorIndex
            const superior = connectedFloors.find((f) => f > floorIndex)
            const inferior = connectedFloors.find((f) => f < floorIndex)
            return [
              key,
              {
                ...rest,
                ...(superior != null ? { toFloorSuperior: superior } : {}),
                ...(inferior != null ? { toFloorInferior: inferior } : {}),
              },
            ]
          }
          return [key, rest]
        }),
      ) as Record<string, TileMeta>,
    })),
  }
  return migrated
})

registerMigration('2.0.0', (map) => {
  const migrated: BuildingMap = {
    ...map,
    version: '3.0.0',
    floors: map.floors.map((floor) => {
      const oldTiles = (floor as Record<string, unknown>).tiles as string[][] | undefined
      const height = floor.height
      const width = floor.width

      const base: TileType[][] = Array.from({ length: height }, () =>
        Array(width).fill('floor') as TileType[],
      )
      const overlay: OverlayType[][] = Array.from({ length: height }, () =>
        Array(width).fill(null) as OverlayType[],
      )

      if (oldTiles) {
        for (let r = 0; r < height && r < oldTiles.length; r++) {
          for (let c = 0; c < width && c < (oldTiles[r]?.length ?? 0); c++) {
            const old = oldTiles[r]?.[c]
            switch (old) {
              case 'wall':
              case 'floor':
              case 'stairs':
              case 'elevator':
              case 'outside':
              case 'void':
                base[r][c] = old as TileType
                break
              case 'door':
                base[r][c] = 'wall'
                overlay[r][c] = 'door'
                break
              case 'exit_door':
                base[r][c] = 'wall'
                overlay[r][c] = 'exit_door'
                break
              case 'room':
                base[r][c] = 'floor'
                overlay[r][c] = 'room'
                break
              default:
                base[r][c] = 'void'
            }
          }
        }
      }

      return {
        ...floor,
        base,
        overlay,
      } as typeof floor & { base: TileType[][]; overlay: OverlayType[][] }
    }),
  }
  return migrated
})

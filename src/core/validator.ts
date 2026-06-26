import { z } from 'zod/v4'
import type { BuildingMap, FloorValidationError } from './types'

const BaseTypeSchema = z.enum([
  'wall',
  'floor',
  'stairs',
  'elevator',
  'outside',
  'void',
  'dirt_path',
])

const OverlayTypeSchema = z.enum(['door', 'exit_door', 'room']).nullable()

const TileMetaSchema = z.object({
  label: z.string().optional(),
  accessible: z.boolean().optional(),
  weight: z.number().optional(),
  toFloorSuperior: z.number().optional(),
  toFloorInferior: z.number().optional(),
  connectedFloors: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
})

const BuildingInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const MapFloorSchema = z.object({
  floorIndex: z.number(),
  buildingId: z.string().optional(),
  label: z.string(),
  order: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  base: z.array(z.array(BaseTypeSchema)),
  overlay: z.array(z.array(OverlayTypeSchema)),
  meta: z.record(z.string(), TileMetaSchema),
})

export const BuildingMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  floors: z.array(MapFloorSchema),
  defaultFloor: z.number(),
  buildings: z.array(BuildingInfoSchema).optional(),
})

export function validate(data: unknown) {
  return BuildingMapSchema.safeParse(data)
}

export function validateFloorConnectivity(map: BuildingMap): FloorValidationError[] {
  const errors: FloorValidationError[] = []

  for (const floor of map.floors) {
    let hasExitDoor = false
    let hasConnectedStairs = false

    for (let row = 0; row < floor.height; row++) {
      for (let col = 0; col < floor.width; col++) {
        const overlay = floor.overlay[row]?.[col]
        if (overlay === 'exit_door') {
          hasExitDoor = true
        }
        const base = floor.base[row]?.[col]
        if (base === 'stairs' || base === 'elevator') {
          const meta = floor.meta[`${row},${col}`]
          if (base === 'elevator') {
            const cf = meta?.connectedFloors
            if (cf && cf.length > 0) hasConnectedStairs = true
          } else {
            if (meta?.toFloorSuperior != null || meta?.toFloorInferior != null) {
              hasConnectedStairs = true
            }
          }
        }
      }
    }

    if (!hasExitDoor && !hasConnectedStairs) {
      errors.push({
        floorIndex: floor.floorIndex,
        label: floor.label,
        message: 'floor has no exit door and no stairs/elevator with connections',
      })
    }
  }

  return errors
}

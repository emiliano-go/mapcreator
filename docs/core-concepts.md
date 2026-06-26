# Core concepts

## Data model

A map is a `BuildingMap` object with a list of floors and building metadata.

```ts
{
  id: string,
  name: string,
  version: string,
  createdAt: string,
  updatedAt: string,
  floors: MapFloor[],
  defaultFloor: number,
  buildings: BuildingInfo[],
}
```

Each `MapFloor` has a 2D grid of base tiles and a parallel 2D grid of overlays.

```ts
{
  floorIndex: number,
  buildingId: string,
  label: string,
  order: number,
  width: number,
  height: number,
  base: TileType[][],
  overlay: OverlayType[][],
  meta: Record<string, TileMeta>,
}
```

## Tiles and overlays

Base tiles define the physical structure of the floor.
Overlays define semantic labels on top of base tiles.

A single cell can have one base type and one overlay type.
Overlays are only valid on certain base types. Doors and exit doors must be placed on walls. Rooms must be placed on floor tiles.

## Graph

The `GraphBuilder` converts a `BuildingMap` into an `AdjacencyGraph` for pathfinding. It scans every traversable tile on every floor and creates edges to adjacent traversable tiles. Stairs add edges to superior or inferior floors. Elevators add edges to all connected floors.

```ts
GraphData {
  adjacency: Map<string, GraphEdge[]>,
  nodeMeta: Record<string, TileMeta>,
  nodeTypes: Record<string, string>,
}
```

## Pathfinding

A* with Manhattan heuristic. The `Pathfinder` takes a graph, a start node ID, and a goal node ID. It returns a path as an ordered list of nodes with total weight and floor change count.

Options include accessibleOnly, preferElevator, maxFloorChanges, and noOutside.

## Room regions

Room detection uses BFS flood-fill to find contiguous tiles with a room overlay. Each region gets an anchor point and is linked to its doors. Navigation destinations are derived from these regions plus exits, stairs, and elevators.

## Validation

Zod schemas validate the entire BuildingMap structure on import and export. An additional `validateFloorConnectivity` check ensures every floor has at least one exit or vertical connection.

## Migrations

The schema version is tracked in the map JSON. Built-in migrations convert data from older versions to the current format. Register new migrations with `registerMigration(fromVersion, fn)`.

## Next steps

Read the [Editor Guide](editor-guide.md) for the painting tools.
Read the [Viewer Guide](viewer-guide.md) for navigation setup.
Read the [Configuration](configuration.md) reference.

# Pathfinding

## Algorithm

The pathfinder uses A* (A-star) with the Manhattan distance heuristic.

```ts
heuristic(a, b) = |a.row - b.row| + |a.col - b.col|
```

A binary heap priority queue is used for the open set.
The algorithm guarantees the shortest path when all edge weights are non-negative.

## Graph construction

Before pathfinding, the `GraphBuilder` constructs a navigable graph from the map data.

1. Every traversable tile becomes a node
2. Edges connect to adjacent traversable tiles in four cardinal directions (or eight if diagonal is enabled)
3. Stairs tiles gain edges to their connected floor's stairs tiles
4. Elevator tiles gain edges to all tiles on their connected floors
5. Wall tiles with a door or exit_door overlay become traversable with a door weight surcharge

Stairs and elevator tiles on the same floor are grouped into contiguous clusters.
Cross-floor edges connect from any tile in one group to any tile in the other group.

## Weights

| Element | Weight |
|---|---|
| floor, dirt_path | 1 |
| door overlay | 3 (surcharge added to base weight) |
| stairs | 1 |
| elevator | 1 |
| cross-floor edge | 10 (FLOOR_CHANGE_WEIGHT) |
| custom weight | As set in tile metadata |

## Options

```ts
PathfinderOptions {
  accessibleOnly?: boolean,    // Skip non-accessible tiles
  preferElevator?: boolean,    // Try elevator routes first
  maxFloorChanges?: number,    // Limit floor transitions
  noOutside?: boolean,         // Exclude outside tiles
}
```

When `preferElevator` is enabled, the pathfinder runs A* twice.
First it tries with stairs cross-floor edges removed.
If no elevator route exists, it falls back to standard A* with all edges.

## Destination resolution

Destinations are derived from the map data by `getAllDestinations`.

- Rooms: each room region produces a destination at its anchor point
- Exit doors: each exit door produces a destination
- Stairs and elevators: each vertical connection produces a destination

The viewer populates its From and To dropdowns from these destinations.
When a destination is selected, `resolveDestination` maps it to a specific tile coordinate.

## Room-to-room pathfinding

The `findPathBetweenRooms` function finds the shortest path between any door of room A to any door of room B. It considers all door combinations and returns the shortest result.

## Floor changes

When a path crosses floors, the viewer pauses at the transition point.
The active floor view switches to the destination floor.
Animation resumes after a brief pause.

## Validation

Each path result includes:

- `found`: boolean indicating success
- `path`: ordered array of GraphNode objects
- `totalWeight`: summed cost of all edges
- `floorChanges`: count of floor transitions

If no path exists, the pathfinder returns `found: false` with an empty path.

## Next steps

Read the [Viewer Guide](viewer-guide.md) for using pathfinding in the UI.
Read the [Editor Guide](editor-guide.md) for setting up tile weights and connections.
